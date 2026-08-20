"""
Rotas de pagamento — Stripe Checkout (one-time R$57 BRL).

Flow A (claimable sandbox) do playbook Emergent:
- POST /api/payments/checkout          → cria sessão e retorna checkout_url
- GET  /api/payments/status/{sess_id}  → status (poll pelo front)
- POST /api/stripe/webhook             → recebe eventos oficiais Stripe

Sandbox está em BR (fora da lista SMP) → tax_mode = "diy":
o objetivo aqui é apenas processar o pagamento; a professora pode ativar
Stripe Tax depois pelo dashboard e migramos para "calc_only".
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlparse

import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from pymongo import MongoClient

from commissions import assemble_sale_record

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(tags=["payments"])

# --- Stripe config ---
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# Modo de imposto (BR não é SMP-supported); calc_only exige Stripe Tax ativo.
# Sandbox começa em "diy" para não bloquear o checkout; a professora liga
# Stripe Tax no dashboard depois se quiser recolher tributos automaticamente.
TAX_MODE = os.environ.get("STRIPE_TAX_MODE", "diy")

# --- Mongo ---
_mongo = MongoClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ.get("DB_NAME", "cozinha_lucrativa")]
payment_transactions = _db["payment_transactions"]
# Concessões de acesso (assinatura ativa por e-mail). Lida pelo Next.js no login.
access_grants = _db["access_grants"]

# Preços expostos pelo checkout — evita clientes forjando IDs desconhecidos.
ALLOWED_LOOKUP_KEYS = {"cozinha_lucrativa_57"}

# Allowlist de origens aceitas para success_url/cancel_url. Cliente pode até
# mandar um origin_url arbitrário, mas se não bater com um destes rejeitamos.
_APP_URL = os.environ.get("APP_URL", "").rstrip("/")
_CORS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
_ALLOWED_ORIGINS = {
    o.rstrip("/")
    for o in ([_APP_URL] + _CORS)
    if o and o != "*"
}


def _resolve_origin(candidate: Optional[str], request: Request) -> str:
    """Determina a URL base segura para success/cancel.

    Ordem de prioridade (agnóstica a ambiente preview/produção):
      1) Origin header do request (domínio real que o usuário está acessando).
      2) Referer header do request.
      3) APP_URL do env (fallback configurado).
      4) request.base_url (fallback interno).
    O `candidate` (origin_url do body) é aceito só se bater com a base
    resolvida — nunca é usado como fonte única para evitar open-redirect.
    """
    def _norm(u: str) -> str:
        p = urlparse(u or "")
        if p.scheme in {"http", "https"} and p.netloc:
            return f"{p.scheme}://{p.netloc}".rstrip("/")
        return ""

    resolved = (
        _norm(request.headers.get("origin", ""))
        or _norm(request.headers.get("referer", ""))
        or _norm(_APP_URL)
        or _norm(str(request.base_url))
    )
    if not resolved:
        raise HTTPException(400, "Origem da requisição não pôde ser determinada.")

    # candidate opcional: se veio, precisa bater com a resolvida
    cand = _norm(candidate) if candidate else ""
    if cand and cand != resolved:
        logger.info("origin mismatch: candidate=%s resolved=%s", cand, resolved)
        # Não bloqueia (dev/preview), só usa a resolvida (mais confiável).
    return resolved


class CheckoutRequest(BaseModel):
    lookup_key: str = Field(..., description="Identificador lógico do preço.")
    quantity: int = Field(1, ge=1, le=10)
    origin_url: str = Field(..., description="URL de origem do cliente (usada para success/cancel).")
    user_id: Optional[str] = None
    ref: Optional[str] = Field(None, max_length=24, description="Código do afiliado (?ref=).")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _extract_email(session) -> str:
    """Extrai o e-mail do comprador de uma Checkout Session (objeto Stripe ou dict)."""
    if session is None:
        return ""

    def _get(obj, key):
        if isinstance(obj, dict):
            return obj.get(key)
        return getattr(obj, key, None)

    email = _get(session, "customer_email")
    if not email:
        details = _get(session, "customer_details")
        if details:
            email = _get(details, "email")
    if not email:
        meta = _get(session, "metadata") or {}
        if isinstance(meta, dict):
            email = meta.get("email")
    return (email or "").strip().lower()


def _grant_access(email: str, session_id: str) -> None:
    """Concede acesso de 12 meses ao e-mail (idempotente). Lido pelo Next.js no login."""
    em = (email or "").strip().lower()
    if not em:
        logger.warning("Pagamento %s sem e-mail — acesso não concedido.", session_id)
        return
    now = _now()
    access_grants.update_one(
        {"email": em},
        {
            "$set": {
                "email": em,
                "expires_at": now + timedelta(days=365),
                "updated_at": now,
                "last_session_id": session_id,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


def _store_commission(session_id: str, status: str) -> None:
    """Grava/atualiza o registro de comissão A/B da transação Stripe."""
    tx = payment_transactions.find_one({"session_id": session_id})
    if not tx:
        return
    seller_code = tx.get("affiliate_code")
    seller_gen = parent_code = parent_gen = None
    if seller_code:
        seller = _db["affiliates"].find_one({"code": seller_code}, {"_id": 0})
        if seller:
            seller_gen = (seller.get("generation") or "A").upper()
            parent_code = seller.get("parent_affiliate_id")
            if parent_code:
                parent = _db["affiliates"].find_one({"code": parent_code}, {"_id": 0})
                parent_gen = (parent.get("generation") or "A").upper() if parent else None
    record = assemble_sale_record(
        tx.get("amount", 0), seller_code, seller_gen, parent_code, parent_gen, status
    )
    payment_transactions.update_one(
        {"session_id": session_id}, {"$set": {"commission": record}}
    )


@router.post("/api/payments/checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    if req.lookup_key not in ALLOWED_LOOKUP_KEYS:
        raise HTTPException(400, f"Preço não autorizado: {req.lookup_key}")

    origin = _resolve_origin(req.origin_url, request)

    prices = stripe.Price.list(
        lookup_keys=[req.lookup_key], active=True, limit=1
    ).data
    if not prices:
        raise HTTPException(500, f"Preço {req.lookup_key} não encontrado no Stripe.")
    price = prices[0]

    kwargs = dict(
        line_items=[{"price": price.id, "quantity": req.quantity}],
        mode="subscription" if price.recurring else "payment",
        success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/?payment=cancelled",
        metadata={
            "user_id": req.user_id or "",
            "lookup_key": req.lookup_key,
        },
        allow_promotion_codes=True,
    )

    try:
        if TAX_MODE == "full":
            try:
                session = stripe.checkout.Session.create(
                    **kwargs, managed_payments={"enabled": True}
                )
            except stripe.error.InvalidRequestError as e:
                msg = (e.user_message or "").lower()
                if "managed payments" in msg or "ineligible" in msg:
                    session = stripe.checkout.Session.create(
                        **kwargs,
                        automatic_tax={"enabled": True},
                        billing_address_collection="required",
                    )
                else:
                    raise
        elif TAX_MODE == "calc_only":
            session = stripe.checkout.Session.create(
                **kwargs,
                automatic_tax={"enabled": True},
                billing_address_collection="required",
            )
        else:  # "diy"
            session = stripe.checkout.Session.create(**kwargs)
    except stripe.error.StripeError as e:
        logger.exception("Falha criando sessão Stripe.")
        raise HTTPException(502, f"Stripe: {e.user_message or str(e)}")

    payment_transactions.insert_one(
        {
            "session_id": session.id,
            "user_id": req.user_id,
            "lookup_key": req.lookup_key,
            "affiliate_code": (re.sub(r"[^A-Za-z0-9]+", "", req.ref).upper()[:24] if req.ref else None),
            "amount": float((price.unit_amount or 0) * req.quantity),
            "currency": price.currency,
            "status": "initiated",
            "payment_status": "pending",
            "created_at": _now(),
            "updated_at": _now(),
        }
    )
    return {"checkout_url": session.url, "session_id": session.id}


@router.get("/api/payments/status/{session_id}")
async def get_status(session_id: str):
    record = payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(404, "Transação não encontrada.")

    # Webhook pode atrasar — tenta reconciliar direto pelo Stripe.
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {
                        "$set": {
                            "status": "completed",
                            "payment_status": "paid",
                            "stripe_subscription_id": s.subscription,
                            "stripe_payment_intent_id": s.payment_intent,
                            "updated_at": _now(),
                        }
                    },
                )
                record = payment_transactions.find_one({"session_id": session_id})
                _grant_access(_extract_email(s), session_id)
                _store_commission(session_id, "paid")
        except stripe.error.StripeError:
            pass  # fica com o que está no banco

    return {
        "session_id": record["session_id"],
        "status": record["status"],
        "payment_status": record["payment_status"],
    }


@router.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Assinatura inválida.")

    obj = event["data"]["object"]
    t = event["type"]

    if t == "checkout.session.completed":
        payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {
                "$set": {
                    "status": "completed",
                    "payment_status": obj.get("payment_status", "paid"),
                    "stripe_subscription_id": obj.get("subscription"),
                    "stripe_payment_intent_id": obj.get("payment_intent"),
                    "updated_at": _now(),
                }
            },
        )
        _grant_access(_extract_email(obj), obj["id"])
        _store_commission(obj["id"], "paid")
    elif t == "checkout.session.async_payment_succeeded":
        payment_transactions.update_one(
            {"session_id": obj["id"]},
            {"$set": {"payment_status": "paid", "updated_at": _now()}},
        )
        _grant_access(_extract_email(obj), obj["id"])
        _store_commission(obj["id"], "paid")
    elif t == "checkout.session.async_payment_failed":
        payment_transactions.update_one(
            {"session_id": obj["id"]},
            {
                "$set": {
                    "status": "failed",
                    "payment_status": "failed",
                    "updated_at": _now(),
                }
            },
        )
    elif t == "checkout.session.expired":
        payment_transactions.update_one(
            {"session_id": obj["id"]},
            {
                "$set": {
                    "status": "expired",
                    "payment_status": "expired",
                    "updated_at": _now(),
                }
            },
        )
    elif t == "charge.refunded":
        payment_transactions.update_one(
            {"stripe_payment_intent_id": obj.get("payment_intent")},
            {
                "$set": {
                    "status": "refunded",
                    "payment_status": "refunded",
                    "updated_at": _now(),
                }
            },
        )
        _tx = payment_transactions.find_one({"stripe_payment_intent_id": obj.get("payment_intent")})
        if _tx:
            _store_commission(_tx["session_id"], "refunded")

    return {"status": "ok"}


# Endpoint público de config para o frontend (chave publicável, se precisar Elements).
@router.get("/api/payments/config")
async def payments_config():
    return {
        "publishable_key": os.environ.get("STRIPE_PUBLISHABLE_KEY", ""),
        "currency": "brl",
        "mode": os.environ.get("STRIPE_MODE", "test"),
    }
