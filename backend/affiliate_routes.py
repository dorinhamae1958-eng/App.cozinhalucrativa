"""
Sistema de afiliados (gerenciado só pelo admin).

- Links `?ref=CODIGO` → registram clique em `affiliate_events`.
- Vendas são atribuídas ao código gravado em cada pagamento:
    * Stripe: `payment_transactions.affiliate_code` (pago = payment_status "paid")
    * Mercado Pago: `mp_orders.affiliate_code` (pago = status "approved")
- Painel admin mostra cliques, vendas, receita e comissão (percentual por afiliado).
- Comissão é paga manualmente pela professora; aqui só calculamos o valor.

Auth: mesma sessão do app (cookie `session_token` → user_sessions → users).
Admin: email em ADMIN_EMAILS (CSV) ou TEACHER_EMAIL.
"""
from __future__ import annotations

import os
import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from commissions import DIRECT_A_SELLER_RATE, B_SELLER_RATE, B_PARENT_RATE

load_dotenv()

router = APIRouter(prefix="/api/affiliates", tags=["affiliates"])

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
TEACHER_EMAIL = os.environ.get("TEACHER_EMAIL", "").strip().lower()
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
if TEACHER_EMAIL:
    ADMIN_EMAILS.add(TEACHER_EMAIL)

DEFAULT_COMMISSION_PCT = float(os.environ.get("AFFILIATE_COMMISSION_PCT", "40") or 40)

_client: Optional[AsyncIOMotorClient] = None


def _db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    return _client[DB_NAME]


def _now():
    return datetime.now(timezone.utc)


# --- Auth helpers (mesmo padrão do plantao_routes) ---
async def _get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return None
    db = _db()
    session = await db.user_sessions.find_one({"session_token": token}, projection={"_id": 0})
    if not session:
        return None
    exp = session.get("expires_at")
    if exp:
        try:
            if datetime.fromisoformat(str(exp).replace("Z", "+00:00")) < _now():
                return None
        except Exception:
            pass
    return await db.users.find_one({"user_id": session["user_id"]}, projection={"_id": 0})


def _is_admin(user: dict) -> bool:
    return bool(user) and (user.get("email") or "").strip().lower() in ADMIN_EMAILS


async def _require_admin(request: Request) -> dict:
    user = await _get_current_user(request)
    if not user:
        raise HTTPException(401, "Faça login para continuar.")
    if not _is_admin(user):
        raise HTTPException(403, "Área restrita à administradora.")
    return user


def _slugify_code(raw: str) -> str:
    t = unicodedata.normalize("NFD", raw or "").encode("ascii", "ignore").decode("ascii")
    t = re.sub(r"[^A-Za-z0-9]+", "", t).upper()
    return t[:24]


# --- Models ---
class AffiliateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    code: Optional[str] = Field(None, max_length=24)
    commission_pct: Optional[float] = Field(None, ge=0, le=100)
    commission_rate: Optional[float] = Field(None, ge=0, le=100)
    note: Optional[str] = Field(None, max_length=300)
    generation: Optional[str] = Field(None, max_length=1)
    parent_code: Optional[str] = Field(None, max_length=24)


class AffiliateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    commission_pct: Optional[float] = Field(None, ge=0, le=100)
    commission_rate: Optional[float] = Field(None, ge=0, le=100)
    note: Optional[str] = Field(None, max_length=300)
    active: Optional[bool] = None
    generation: Optional[str] = Field(None, max_length=1)
    parent_code: Optional[str] = Field(None, max_length=24)


# --- Stats aggregation ---
async def _stats_for_codes(codes: list[str]) -> dict:
    """Retorna {code: {clicks, sales, revenue}} agregando cliques + pagamentos pagos."""
    db = _db()
    out = {c: {"clicks": 0, "sales": 0, "revenue": 0.0} for c in codes}
    if not codes:
        return out

    # Cliques
    async for row in db.affiliate_events.aggregate([
        {"$match": {"type": "click", "code": {"$in": codes}}},
        {"$group": {"_id": "$code", "n": {"$sum": 1}}},
    ]):
        if row["_id"] in out:
            out[row["_id"]]["clicks"] = row["n"]

    # Vendas Stripe (amount em centavos)
    async for row in db.payment_transactions.aggregate([
        {"$match": {"affiliate_code": {"$in": codes}, "payment_status": "paid"}},
        {"$group": {"_id": "$affiliate_code", "n": {"$sum": 1}, "amt": {"$sum": "$amount"}}},
    ]):
        if row["_id"] in out:
            out[row["_id"]]["sales"] += row["n"]
            out[row["_id"]]["revenue"] += (row["amt"] or 0) / 100.0

    # Vendas Mercado Pago (amount em reais)
    async for row in db.mp_orders.aggregate([
        {"$match": {"affiliate_code": {"$in": codes}, "status": "approved"}},
        {"$group": {"_id": "$affiliate_code", "n": {"$sum": 1}, "amt": {"$sum": "$amount"}}},
    ]):
        if row["_id"] in out:
            out[row["_id"]]["sales"] += row["n"]
            out[row["_id"]]["revenue"] += (row["amt"] or 0.0)

    return out


# --- Público: rastrear clique no link do afiliado ---
@router.get("/track")
async def track_click(request: Request, code: str):
    code = _slugify_code(code)
    if not code:
        return {"ok": False}
    db = _db()
    aff = await db.affiliates.find_one({"code": code, "active": {"$ne": False}}, projection={"_id": 0})
    if not aff:
        return {"ok": False, "reason": "unknown_code"}
    await db.affiliate_events.insert_one({
        "type": "click",
        "code": code,
        "ts": _now(),
        "ip": (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip()[:64],
        "ua": (request.headers.get("user-agent") or "")[:200],
    })
    return {"ok": True}


# --- Público: validar código (para exibir "indicado por X") ---
@router.get("/validate")
async def validate_code(code: str):
    code = _slugify_code(code)
    db = _db()
    aff = await db.affiliates.find_one({"code": code, "active": {"$ne": False}}, projection={"_id": 0})
    if not aff:
        return {"valid": False}
    return {"valid": True, "code": code, "name": aff.get("name")}


# --- Sessão: o usuário atual é admin? (para liberar o painel no front) ---
@router.get("/me")
async def me(request: Request):
    user = await _get_current_user(request)
    return {"authenticated": bool(user), "is_admin": _is_admin(user or {})}


# --- Admin: criar afiliado ---
@router.post("")
async def create_affiliate(body: AffiliateCreate, request: Request):
    await _require_admin(request)
    db = _db()
    code = _slugify_code(body.code) if body.code else _slugify_code(body.name)
    if not code:
        raise HTTPException(400, "Código inválido.")
    if await db.affiliates.find_one({"code": code}):
        raise HTTPException(409, f"Já existe um afiliado com o código {code}.")

    rate = body.commission_rate if body.commission_rate is not None else body.commission_pct
    pct = rate if rate is not None else DEFAULT_COMMISSION_PCT

    generation = (body.generation or "A").upper()
    if generation not in ("A", "B"):
        raise HTTPException(400, "Geração inválida (use A ou B).")

    parent_code = None
    if generation == "B":
        parent_code = _slugify_code(body.parent_code) if body.parent_code else ""
        if not parent_code:
            raise HTTPException(400, "Afiliado B precisa de um indicador A (parent_code).")
        if parent_code == code:
            raise HTTPException(400, "Um afiliado não pode indicar a si mesmo.")
        parent = await db.affiliates.find_one({"code": parent_code}, projection={"_id": 0})
        if not parent:
            raise HTTPException(404, f"Indicador {parent_code} não encontrado.")
        if (parent.get("generation") or "A").upper() != "A":
            raise HTTPException(400, "O indicador de um afiliado B deve ser da geração A.")

    doc = {
        "code": code,
        "name": body.name.strip(),
        "note": (body.note or "").strip(),
        "commission_pct": float(pct),
        "commission_rate": float(pct),
        "generation": generation,
        "parent_affiliate_id": parent_code,
        "active": True,
        "created_at": _now(),
    }
    await db.affiliates.insert_one(dict(doc))
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    doc.update({"clicks": 0, "sales": 0, "revenue": 0.0, "commission": 0.0})
    return doc


# --- Admin: listar afiliados com estatísticas ---
@router.get("")
async def list_affiliates(request: Request):
    await _require_admin(request)
    db = _db()
    affs = await db.affiliates.find({}, projection={"_id": 0}).sort("created_at", -1).to_list(500)
    codes = [a["code"] for a in affs]
    stats = await _stats_for_codes(codes)

    gen_by_code = {a["code"]: (a.get("generation") or "A").upper() for a in affs}
    parent_by_code = {a["code"]: a.get("parent_affiliate_id") for a in affs}
    revenue_by_code = {c: float(stats.get(c, {}).get("revenue", 0.0)) for c in codes}
    # Filhos de cada A (para o override automático de 30% sobre vendas dos B).
    children = {}
    for c in codes:
        p = parent_by_code.get(c)
        if p:
            children.setdefault(p, []).append(c)

    items = []
    totals = {"clicks": 0, "sales": 0, "revenue": 0.0, "commission": 0.0}
    for a in affs:
        code = a["code"]
        gen = gen_by_code[code]
        s = stats.get(code, {"clicks": 0, "sales": 0, "revenue": 0.0})
        own_rev = float(s["revenue"])
        if gen == "B":
            own_commission = own_rev * B_SELLER_RATE
            override_commission = 0.0
            effective_rate = round(B_SELLER_RATE * 100)
        else:  # A
            own_commission = own_rev * DIRECT_A_SELLER_RATE
            override_rev = sum(revenue_by_code.get(ch, 0.0) for ch in children.get(code, []))
            override_commission = override_rev * B_PARENT_RATE
            effective_rate = round(DIRECT_A_SELLER_RATE * 100)
        commission = round(own_commission + override_commission, 2)
        ca = a.get("created_at")
        items.append({
            "code": code,
            "name": a.get("name"),
            "note": a.get("note", ""),
            "generation": gen,
            "parent_affiliate_id": parent_by_code.get(code),
            "commission_rate_pct": effective_rate,
            "override_commission": round(override_commission, 2),
            "active": a.get("active", True),
            "created_at": ca.isoformat() if hasattr(ca, "isoformat") else ca,
            "clicks": s["clicks"],
            "sales": s["sales"],
            "revenue": round(own_rev, 2),
            "commission": commission,
            "conversion": round((s["sales"] / s["clicks"]) * 100, 1) if s["clicks"] else 0.0,
        })
        totals["clicks"] += s["clicks"]
        totals["sales"] += s["sales"]
        totals["revenue"] += own_rev
        totals["commission"] += commission
    totals["revenue"] = round(totals["revenue"], 2)
    totals["commission"] = round(totals["commission"], 2)
    return {
        "items": items,
        "totals": totals,
        "rules": {
            "direct_a_seller_pct": round(DIRECT_A_SELLER_RATE * 100),
            "b_seller_pct": round(B_SELLER_RATE * 100),
            "b_parent_pct": round(B_PARENT_RATE * 100),
        },
    }


# --- Admin: atualizar afiliado ---
@router.patch("/{code}")
async def update_affiliate(code: str, body: AffiliateUpdate, request: Request):
    await _require_admin(request)
    db = _db()
    code = _slugify_code(code)
    current = await db.affiliates.find_one({"code": code}, projection={"_id": 0})
    if not current:
        raise HTTPException(404, "Afiliado não encontrado.")
    patch = {}
    if body.name is not None:
        patch["name"] = body.name.strip()
    rate = body.commission_rate if body.commission_rate is not None else body.commission_pct
    if rate is not None:
        patch["commission_rate"] = float(rate)
        patch["commission_pct"] = float(rate)
    if body.note is not None:
        patch["note"] = body.note.strip()
    if body.active is not None:
        patch["active"] = bool(body.active)

    new_gen = (body.generation or current.get("generation") or "A").upper()
    if body.generation is not None:
        if new_gen not in ("A", "B"):
            raise HTTPException(400, "Geração inválida (use A ou B).")
        patch["generation"] = new_gen
    if body.parent_code is not None or body.generation is not None:
        if new_gen == "B":
            parent_code = _slugify_code(body.parent_code) if body.parent_code else (current.get("parent_affiliate_id") or "")
            if not parent_code:
                raise HTTPException(400, "Afiliado B precisa de um indicador A (parent_code).")
            if parent_code == code:
                raise HTTPException(400, "Um afiliado não pode indicar a si mesmo.")
            parent = await db.affiliates.find_one({"code": parent_code}, projection={"_id": 0})
            if not parent:
                raise HTTPException(404, f"Indicador {parent_code} não encontrado.")
            if (parent.get("generation") or "A").upper() != "A":
                raise HTTPException(400, "O indicador de um afiliado B deve ser da geração A.")
            patch["parent_affiliate_id"] = parent_code
        else:
            patch["parent_affiliate_id"] = None

    if not patch:
        raise HTTPException(400, "Nada para atualizar.")
    res = await db.affiliates.update_one({"code": code}, {"$set": patch})
    if not res.matched_count:
        raise HTTPException(404, "Afiliado não encontrado.")
    return {"ok": True}


# --- Admin: remover afiliado ---
@router.delete("/{code}")
async def delete_affiliate(code: str, request: Request):
    await _require_admin(request)
    db = _db()
    code = _slugify_code(code)
    res = await db.affiliates.delete_one({"code": code})
    if not res.deleted_count:
        raise HTTPException(404, "Afiliado não encontrado.")
    return {"ok": True}
