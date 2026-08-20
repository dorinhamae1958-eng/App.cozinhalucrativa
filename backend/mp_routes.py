"""
Mercado Pago — Checkout Pro (PIX + cartão), gateway principal.

Fluxo (mesmo padrão do Stripe, coexistindo com ele):
- POST /api/payments/mercadopago/preference  → cria preferência e devolve init_point
- GET  /api/payments/mercadopago/status/{id} → reconcilia direto na API MP (poll do front)
- POST /api/mercadopago/webhook              → recebe eventos oficiais (payment)

Acesso é liberado (access_grants, 12 meses) somente após pagamento "approved",
confirmado por consulta autenticada na API do Mercado Pago (nunca pelo redirect).
A venda é atribuída ao afiliado do `ref` (se houver).
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import re
import time
import unicodedata
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlparse

import mercadopago
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from commissions import assemble_sale_record

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(tags=["mercadopago"])

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
MP_ACCESS_TOKEN = os.environ.get("MP_ACCESS_TOKEN", "").strip()
MP_WEBHOOK_SECRET = os.environ.get("MP_WEBHOOK_SECRET", "").strip()
APP_URL = os.environ.get("APP_URL", "").rstrip("/")

# Preço server-side (nunca confiar em valor vindo do cliente).
PRICE_BRL = float(os.environ.get("MP_PRICE_BRL", "57") or 57)
PRODUCT_TITLE = "Cozinha Lucrativa — Acesso Completo (12 meses)"

_client: Optional[AsyncIOMotorClient] = None
_sdk = None


def _db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    return _client[DB_NAME]


def _sdk_or_500():
    global _sdk
    if not MP_ACCESS_TOKEN:
        raise HTTPException(503, "Mercado Pago ainda não configurado (falta MP_ACCESS_TOKEN).")
    if _sdk is None:
        _sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
    return _sdk


def _now():
    return datetime.now(timezone.utc)


def _slug_code(raw: str) -> str:
    t = unicodedata.normalize("NFD", raw or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^A-Za-z0-9]+", "", t).upper()[:24]


def _resolve_origin(request: Request) -> str:
    def _norm(u: str) -> str:
        p = urlparse(u or "")
        return f"{p.scheme}://{p.netloc}".rstrip("/") if p.scheme in {"http", "https"} and p.netloc else ""
    return (
        _norm(request.headers.get("origin", ""))
        or _norm(request.headers.get("referer", ""))
        or _norm(APP_URL)
        or _norm(str(request.base_url))
    )


async def _grant_access(email: str, ref_id: str) -> None:
    em = (email or "").strip().lower()
    if not em:
        logger.warning("Pagamento MP %s sem e-mail — acesso não concedido.", ref_id)
        return
    now = _now()
    await _db().access_grants.update_one(
        {"email": em},
        {
            "$set": {"email": em, "expires_at": now + timedelta(days=365),
                     "updated_at": now, "last_mp_ref": ref_id},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


async def _mark_and_grant(order: dict, payment: dict) -> str:
    """Atualiza o pedido MP com o status do pagamento e libera acesso se approved."""
    db = _db()
    status = payment.get("status") or "pending"
    email = (
        (payment.get("payer") or {}).get("email")
        or order.get("email")
        or ""
    )
    patch = {
        "status": status,
        "mp_payment_id": str(payment.get("id") or ""),
        "payment_method": payment.get("payment_method_id"),
        "updated_at": _now(),
    }
    if status == "approved":
        patch["access_granted_at"] = _now()

    # Registro de comissão A/B (definitivo só quando approved).
    seller_code = order.get("affiliate_code")
    seller_gen = parent_code = parent_gen = None
    if seller_code:
        seller = await db.affiliates.find_one({"code": seller_code}, projection={"_id": 0})
        if seller:
            seller_gen = (seller.get("generation") or "A").upper()
            parent_code = seller.get("parent_affiliate_id")
            if parent_code:
                parent = await db.affiliates.find_one({"code": parent_code}, projection={"_id": 0})
                parent_gen = (parent.get("generation") or "A").upper() if parent else None
    patch["commission"] = assemble_sale_record(
        order.get("amount", 0), seller_code, seller_gen, parent_code, parent_gen, status
    )

    await db.mp_orders.update_one({"order_id": order["order_id"]}, {"$set": patch})
    if status == "approved":
        await _grant_access(email, order["order_id"])
    return status


class PreferenceBody(BaseModel):
    email: EmailStr
    ref: Optional[str] = Field(None, max_length=24)


@router.get("/api/payments/mercadopago/config")
async def mp_config():
    return {"enabled": bool(MP_ACCESS_TOKEN), "price": PRICE_BRL, "currency": "BRL"}


@router.post("/api/payments/mercadopago/preference")
async def create_preference(body: PreferenceBody, request: Request):
    sdk = _sdk_or_500()
    # Guarda: pagamento de R$0 (ou negativo) nunca chama o Mercado Pago.
    if PRICE_BRL <= 0:
        raise HTTPException(400, "Valor inválido: pagamento de R$ 0,00 não é processado.")
    origin = _resolve_origin(request)
    order_id = f"cl_{uuid.uuid4().hex[:20]}"
    email = str(body.email).strip().lower()
    ref = _slug_code(body.ref) if body.ref else None

    await _db().mp_orders.insert_one({
        "order_id": order_id,
        "provider": "mercadopago",
        "email": email,
        "affiliate_code": ref,
        "amount": PRICE_BRL,
        "currency": "BRL",
        "status": "pending",
        "mp_payment_id": None,
        "created_at": _now(),
        "updated_at": _now(),
    })

    preference = {
        "items": [{
            "title": PRODUCT_TITLE,
            "quantity": 1,
            "unit_price": PRICE_BRL,
            "currency_id": "BRL",
        }],
        "payer": {"email": email},
        "external_reference": order_id,
        "notification_url": f"{origin}/api/mercadopago/webhook",
        "back_urls": {
            "success": f"{origin}/payment/success?mp_order={order_id}",
            "pending": f"{origin}/payment/success?mp_order={order_id}",
            "failure": f"{origin}/planos?payment=failed",
        },
        "auto_return": "approved",
        "statement_descriptor": "COZINHALUCRATIVA",
        "metadata": {"order_id": order_id, "affiliate_code": ref or ""},
    }

    try:
        result = sdk.preference().create(preference)
    except Exception as e:
        logger.exception("Falha criando preferência MP.")
        raise HTTPException(502, f"Mercado Pago indisponível: {e}")

    resp = result.get("response", {}) if isinstance(result, dict) else {}
    if result.get("status", 500) >= 400 or not resp.get("id"):
        logger.error("MP preference error: %s", resp)
        raise HTTPException(502, "Não foi possível iniciar o pagamento no Mercado Pago.")

    await _db().mp_orders.update_one(
        {"order_id": order_id}, {"$set": {"mp_preference_id": resp["id"]}}
    )
    init_point = resp.get("init_point") or resp.get("sandbox_init_point")
    return {"order_id": order_id, "init_point": init_point, "preference_id": resp["id"]}


@router.get("/api/payments/mercadopago/status/{order_id}")
async def mp_status(order_id: str):
    db = _db()
    order = await db.mp_orders.find_one({"order_id": order_id}, projection={"_id": 0})
    if not order:
        raise HTTPException(404, "Pedido não encontrado.")

    if order.get("status") != "approved" and MP_ACCESS_TOKEN:
        sdk = _sdk_or_500()
        try:
            search = sdk.payment().search({"external_reference": order_id})
            results = (search.get("response", {}) or {}).get("results", []) if isinstance(search, dict) else []
            payment = None
            for r in results:
                if r.get("status") == "approved":
                    payment = r
                    break
            if payment is None and results:
                # pega o mais recente para refletir pending/rejected
                payment = sorted(results, key=lambda x: x.get("date_created", ""))[-1]
            if payment:
                await _mark_and_grant(order, payment)
                order = await db.mp_orders.find_one({"order_id": order_id}, projection={"_id": 0})
        except Exception:
            logger.exception("Falha reconciliando pagamento MP %s.", order_id)

    return {
        "order_id": order_id,
        "status": order.get("status", "pending"),
        "email": order.get("email"),
    }


def _valid_signature(request: Request, data_id: str) -> bool:
    """Valida x-signature do Mercado Pago. Se não há secret configurado, não bloqueia."""
    if not MP_WEBHOOK_SECRET:
        return True
    signature = request.headers.get("x-signature", "")
    request_id = request.headers.get("x-request-id", "")
    parts = dict(item.split("=", 1) for item in signature.split(",") if "=" in item)
    ts, received = parts.get("ts"), parts.get("v1")
    if not ts or not received:
        return False
    manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{ts};"
    expected = hmac.new(MP_WEBHOOK_SECRET.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    try:
        if abs(int(time.time()) - int(ts)) > 600:
            return False
    except ValueError:
        return False
    return hmac.compare_digest(expected, received)


@router.post("/api/mercadopago/webhook", status_code=200)
async def mp_webhook(request: Request):
    payload = {}
    try:
        payload = await request.json()
    except Exception:
        pass
    data_id = str((payload.get("data") or {}).get("id") or request.query_params.get("data.id") or "")
    topic = payload.get("type") or payload.get("topic") or request.query_params.get("type")

    if topic not in ("payment", "payment.updated") or not data_id:
        return {"received": True}
    if not _valid_signature(request, data_id):
        raise HTTPException(401, "Assinatura inválida.")
    if not MP_ACCESS_TOKEN:
        return {"received": True}

    sdk = _sdk_or_500()
    try:
        result = sdk.payment().get(data_id)
        payment = result.get("response", {}) if isinstance(result, dict) else {}
    except Exception:
        logger.exception("Falha buscando pagamento MP %s.", data_id)
        raise HTTPException(502, "Falha ao consultar pagamento.")

    ext_ref = payment.get("external_reference")
    if not ext_ref:
        return {"received": True}
    order = await _db().mp_orders.find_one({"order_id": ext_ref}, projection={"_id": 0})
    if not order:
        return {"received": True}
    await _mark_and_grant(order, payment)
    return {"received": True}
