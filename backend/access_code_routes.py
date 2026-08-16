"""
Códigos de acesso social (cupom VIP) — 100% de desconto.

Quando um código válido zera o valor (final R$ 0,00), NÃO criamos checkout
nem chamamos Mercado Pago/Stripe: o acesso é concedido direto no sistema
(access_grants, 12 meses) e a liberação acontece no login com o mesmo e-mail.

Controles (definidos pela administradora):
- max_uses: limite de utilizações (null = ilimitado)
- expires_at: validade (ISO date, opcional)
- plan: produto/plano autorizado (metadado; o acesso libera o app completo)
- discount_pct: desconto (100 = grátis). Só o caminho 100% concede acesso direto.

Registro (painel): código usado, e-mail beneficiado, data — via access_code_redemptions.
"""
from __future__ import annotations

import os
import re
import unicodedata
from datetime import datetime, timezone, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

load_dotenv()

router = APIRouter(prefix="/api/access-codes", tags=["access-codes"])

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
TEACHER_EMAIL = os.environ.get("TEACHER_EMAIL", "").strip().lower()
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
if TEACHER_EMAIL:
    ADMIN_EMAILS.add(TEACHER_EMAIL)

DEFAULT_PLAN = "full"

_client: Optional[AsyncIOMotorClient] = None


def _db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    return _client[DB_NAME]


def _now():
    return datetime.now(timezone.utc)


def _slug(raw: str) -> str:
    t = unicodedata.normalize("NFD", raw or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^A-Za-z0-9]+", "", t).upper()[:32]


# --- Auth ---
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


async def _grant_access(email: str, code: str) -> None:
    em = (email or "").strip().lower()
    if not em:
        return
    now = _now()
    await _db().access_grants.update_one(
        {"email": em},
        {
            "$set": {"email": em, "expires_at": now + timedelta(days=365),
                     "updated_at": now, "last_access_code": code},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


def _parse_expires(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    s = str(raw).strip()
    try:
        # aceita YYYY-MM-DD ou ISO completo
        if len(s) == 10:
            dt = datetime.fromisoformat(s).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        else:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        raise HTTPException(400, "Data de validade inválida (use AAAA-MM-DD).")


def _code_state(doc: dict) -> dict:
    max_uses = doc.get("max_uses")
    used = int(doc.get("used_count", 0) or 0)
    remaining = None if max_uses in (None, 0) else max(0, int(max_uses) - used)
    expires_at = doc.get("expires_at")
    expired = False
    if expires_at:
        try:
            expired = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00")) < _now()
        except Exception:
            expired = False
    exhausted = remaining is not None and remaining <= 0
    active = doc.get("active", True) and not expired and not exhausted
    return {"remaining": remaining, "expired": expired, "exhausted": exhausted, "usable": active}


# --- Models ---
class CodeCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=32)
    discount_pct: float = Field(100, ge=0, le=100)
    max_uses: Optional[int] = Field(None, ge=1, le=1000000)
    expires_at: Optional[str] = None
    plan: Optional[str] = Field(None, max_length=40)
    note: Optional[str] = Field(None, max_length=300)


class CodeUpdate(BaseModel):
    discount_pct: Optional[float] = Field(None, ge=0, le=100)
    max_uses: Optional[int] = Field(None, ge=0, le=1000000)
    expires_at: Optional[str] = None
    plan: Optional[str] = Field(None, max_length=40)
    note: Optional[str] = Field(None, max_length=300)
    active: Optional[bool] = None


class ValidateBody(BaseModel):
    code: str = Field(..., max_length=32)
    base_price: float = Field(57.0, ge=0)


class RedeemBody(BaseModel):
    code: str = Field(..., max_length=32)
    email: EmailStr


# --- Público: validar código (não consome) ---
@router.post("/validate")
async def validate_code(body: ValidateBody):
    code = _slug(body.code)
    if not code:
        return {"valid": False, "reason": "empty"}
    doc = await _db().access_codes.find_one({"code": code}, projection={"_id": 0})
    if not doc:
        return {"valid": False, "reason": "not_found"}
    st = _code_state(doc)
    if not st["usable"]:
        reason = "expired" if st["expired"] else ("exhausted" if st["exhausted"] else "inactive")
        return {"valid": False, "reason": reason}
    pct = float(doc.get("discount_pct", 100))
    final_price = round(max(0.0, body.base_price * (1 - pct / 100.0)), 2)
    return {
        "valid": True,
        "code": code,
        "discount_pct": pct,
        "final_price": final_price,
        "free": final_price <= 0,
        "plan": doc.get("plan", DEFAULT_PLAN),
        "remaining": st["remaining"],
    }


# --- Público: resgatar código grátis (concede acesso direto, sem checkout) ---
@router.post("/redeem")
async def redeem_code(body: RedeemBody, request: Request):
    code = _slug(body.code)
    email = str(body.email).strip().lower()
    db = _db()
    doc = await db.access_codes.find_one({"code": code}, projection={"_id": 0})
    if not doc:
        raise HTTPException(404, "Código não encontrado.")
    st = _code_state(doc)
    if not st["usable"]:
        if st["expired"]:
            raise HTTPException(400, "Este código expirou.")
        if st["exhausted"]:
            raise HTTPException(400, "Este código atingiu o limite de usos.")
        raise HTTPException(400, "Código inativo.")

    pct = float(doc.get("discount_pct", 100))
    if pct < 100:
        raise HTTPException(400, "Este código é de desconto parcial — finalize o pagamento pelo checkout.")

    # Se o mesmo e-mail já resgatou este código, não consome de novo (idempotente).
    already = await db.access_code_redemptions.find_one({"code": code, "email": email})
    if already:
        await _grant_access(email, code)
        return {"granted": True, "email": email, "already_redeemed": True}

    # Consumo atômico respeitando o limite de usos.
    max_uses = doc.get("max_uses")
    query = {"code": code, "active": {"$ne": False}}
    if max_uses not in (None, 0):
        query["used_count"] = {"$lt": int(max_uses)}
    updated = await db.access_codes.find_one_and_update(
        query, {"$inc": {"used_count": 1}, "$set": {"updated_at": _now()}}
    )
    if not updated:
        raise HTTPException(400, "Este código atingiu o limite de usos.")

    user = await _get_current_user(request)
    await db.access_code_redemptions.insert_one({
        "code": code,
        "email": email,
        "user_id": (user or {}).get("user_id"),
        "plan": doc.get("plan", DEFAULT_PLAN),
        "ts": _now(),
    })
    await _grant_access(email, code)
    return {"granted": True, "email": email}


# --- Admin: criar ---
@router.post("")
async def create_code(body: CodeCreate, request: Request):
    await _require_admin(request)
    db = _db()
    code = _slug(body.code)
    if not code:
        raise HTTPException(400, "Código inválido.")
    if await db.access_codes.find_one({"code": code}):
        raise HTTPException(409, f"Já existe um código {code}.")
    doc = {
        "code": code,
        "discount_pct": float(body.discount_pct),
        "max_uses": int(body.max_uses) if body.max_uses else None,
        "used_count": 0,
        "expires_at": _parse_expires(body.expires_at),
        "plan": (body.plan or DEFAULT_PLAN).strip(),
        "note": (body.note or "").strip(),
        "active": True,
        "created_at": _now(),
    }
    await db.access_codes.insert_one(dict(doc))
    return {"ok": True, "code": code}


# --- Admin: listar com estado + resgates recentes ---
@router.get("")
async def list_codes(request: Request):
    await _require_admin(request)
    db = _db()
    codes = await db.access_codes.find({}, projection={"_id": 0}).sort("created_at", -1).to_list(500)
    items = []
    for c in codes:
        st = _code_state(c)
        ca = c.get("created_at")
        ex = c.get("expires_at")
        reds = await db.access_code_redemptions.find(
            {"code": c["code"]}, projection={"_id": 0}
        ).sort("ts", -1).limit(50).to_list(50)
        items.append({
            "code": c["code"],
            "discount_pct": float(c.get("discount_pct", 100)),
            "max_uses": c.get("max_uses"),
            "used_count": int(c.get("used_count", 0) or 0),
            "remaining": st["remaining"],
            "expires_at": ex.isoformat() if hasattr(ex, "isoformat") else ex,
            "plan": c.get("plan", DEFAULT_PLAN),
            "note": c.get("note", ""),
            "active": c.get("active", True),
            "usable": st["usable"],
            "created_at": ca.isoformat() if hasattr(ca, "isoformat") else ca,
            "redemptions": [
                {"email": r.get("email"),
                 "user_id": r.get("user_id"),
                 "ts": r["ts"].isoformat() if hasattr(r.get("ts"), "isoformat") else r.get("ts")}
                for r in reds
            ],
        })
    return {"items": items}


# --- Admin: atualizar ---
@router.patch("/{code}")
async def update_code(code: str, body: CodeUpdate, request: Request):
    await _require_admin(request)
    db = _db()
    code = _slug(code)
    patch = {}
    if body.discount_pct is not None:
        patch["discount_pct"] = float(body.discount_pct)
    if body.max_uses is not None:
        patch["max_uses"] = int(body.max_uses) or None
    if body.expires_at is not None:
        patch["expires_at"] = _parse_expires(body.expires_at) if body.expires_at else None
    if body.plan is not None:
        patch["plan"] = body.plan.strip()
    if body.note is not None:
        patch["note"] = body.note.strip()
    if body.active is not None:
        patch["active"] = bool(body.active)
    if not patch:
        raise HTTPException(400, "Nada para atualizar.")
    patch["updated_at"] = _now()
    res = await db.access_codes.update_one({"code": code}, {"$set": patch})
    if not res.matched_count:
        raise HTTPException(404, "Código não encontrado.")
    return {"ok": True}


# --- Admin: remover ---
@router.delete("/{code}")
async def delete_code(code: str, request: Request):
    await _require_admin(request)
    db = _db()
    code = _slug(code)
    res = await db.access_codes.delete_one({"code": code})
    if not res.deleted_count:
        raise HTTPException(404, "Código não encontrado.")
    return {"ok": True}
