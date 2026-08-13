"""
Plantão de Dúvidas — v2 (Base de Conhecimento Viva da Plataforma Elevare)

Reformulado a partir de instruções pedagógicas: cada dúvida respondida vira,
opcionalmente, um ativo permanente da biblioteca pública. Nenhum dado pessoal
da aluna é exposto.

Coleções (MongoDB):
  plantao_duvidas
    id, user_id (privado), subject, question, answer,
    status ("aguardando" | "respondida"),
    category, created_at, answered_at,
    is_public (bool), views, likes,
    read_by_student (bool)  // se a aluna já viu a resposta
  plantao_notifications
    id, user_id, duvida_id, kind ("answered"), message, read (bool), created_at

Autorização:
  - Estudante autenticada via cookie `session_token` (compatível com o Next.js
    app: /api/auth/session). Nós lemos `user_sessions` no MongoDB.
  - Admin: qualquer email listado em ADMIN_EMAILS (CSV) OU igual a TEACHER_EMAIL.
"""
from __future__ import annotations

import logging
import os
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/plantao", tags=["plantao"])

# --- Config ---
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
TEACHER_EMAIL = os.environ.get("TEACHER_EMAIL", "").strip().lower()
ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "").split(",")
    if e.strip()
}
if TEACHER_EMAIL:
    ADMIN_EMAILS.add(TEACHER_EMAIL)

# Categorias fixas — combinadas com o front (Portuguese labels)
CATEGORIES = [
    {"id": "receitas", "label": "Receitas"},
    {"id": "tecnicas", "label": "Técnicas"},
    {"id": "ingredientes", "label": "Ingredientes"},
    {"id": "equipamentos", "label": "Equipamentos"},
    {"id": "precificacao", "label": "Precificação"},
    {"id": "vendas", "label": "Vendas & Divulgação"},
    {"id": "outros", "label": "Outros"},
]
CATEGORY_IDS = {c["id"] for c in CATEGORIES}

# --- Async Mongo (lazy singleton) ---
_mongo_client: Optional[AsyncIOMotorClient] = None


def _db():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    return _mongo_client[DB_NAME]


# --- Auth helpers ---
async def _get_current_user(request: Request) -> Optional[dict]:
    """Reads session_token cookie and returns the user doc, or None."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return None
    db = _db()
    session = await db.user_sessions.find_one(
        {"session_token": token}, projection={"_id": 0}
    )
    if not session:
        return None
    expires_at = session.get("expires_at")
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                return None
        except Exception:
            pass
    user = await db.users.find_one(
        {"user_id": session["user_id"]}, projection={"_id": 0}
    )
    return user


def _is_admin(user: dict) -> bool:
    if not user:
        return False
    email = (user.get("email") or "").strip().lower()
    return email in ADMIN_EMAILS


async def _require_user(request: Request) -> dict:
    user = await _get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Faça login para continuar.")
    return user


async def _require_admin(request: Request) -> dict:
    user = await _require_user(request)
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Área restrita à professora.")
    return user


# --- Utils ---
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _norm(text: str) -> str:
    """Normalize for keyword search (lower, no accents)."""
    if not text:
        return ""
    t = unicodedata.normalize("NFD", text)
    t = t.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"\s+", " ", t).strip()


def _public_projection(doc: dict) -> dict:
    """Return only fields safe for public display. NEVER include user info."""
    return {
        "id": doc["id"],
        "subject": doc.get("subject"),
        "question": doc.get("question"),
        "answer": doc.get("answer"),
        "category": doc.get("category"),
        "views": doc.get("views", 0),
        "likes": doc.get("likes", 0),
        "created_at": doc.get("created_at"),
        "answered_at": doc.get("answered_at"),
    }


def _mine_projection(doc: dict) -> dict:
    """Fields shown to the owner (includes status/is_public/read_by_student)."""
    return {
        "id": doc["id"],
        "subject": doc.get("subject"),
        "question": doc.get("question"),
        "answer": doc.get("answer"),
        "category": doc.get("category"),
        "status": doc.get("status"),
        "is_public": doc.get("is_public"),
        "read_by_student": doc.get("read_by_student", False),
        "views": doc.get("views", 0),
        "likes": doc.get("likes", 0),
        "created_at": doc.get("created_at"),
        "answered_at": doc.get("answered_at"),
    }


# --- Models ---
class DuvidaCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=140)
    question: str = Field(..., min_length=10, max_length=4000)
    category: str = Field(default="outros")


class DuvidaPublishBody(BaseModel):
    is_public: bool


class DuvidaAnswerBody(BaseModel):
    answer: str = Field(..., min_length=5, max_length=8000)
    category: Optional[str] = None  # admin pode ajustar a categoria


# --- Meta ---
@router.get("/meta")
async def get_meta():
    return {"categories": CATEGORIES}


# --- Eligibility / current user snapshot ---
@router.get("/me")
async def me_snapshot(request: Request):
    user = await _get_current_user(request)
    if not user:
        return {"authenticated": False, "is_admin": False}
    return {
        "authenticated": True,
        "is_admin": _is_admin(user),
        "user_name": user.get("name"),
    }


# --- Student: create a new dúvida ---
@router.post("/duvidas")
async def create_duvida(body: DuvidaCreate, request: Request):
    user = await _require_user(request)
    category = body.category if body.category in CATEGORY_IDS else "outros"
    duvida_id = f"duv_{uuid.uuid4().hex[:14]}"
    doc = {
        "id": duvida_id,
        "user_id": user["user_id"],
        "subject": body.subject.strip(),
        "question": body.question.strip(),
        "answer": None,
        "status": "aguardando",
        "category": category,
        "is_public": False,
        "views": 0,
        "likes": 0,
        "read_by_student": True,  # own question is auto-read
        "created_at": _now_iso(),
        "answered_at": None,
    }
    db = _db()
    await db.plantao_duvidas.insert_one(dict(doc))
    return _mine_projection(doc)


# --- Student: list my dúvidas ---
@router.get("/duvidas/mine")
async def list_my_duvidas(request: Request):
    user = await _require_user(request)
    db = _db()
    cursor = db.plantao_duvidas.find(
        {"user_id": user["user_id"]}, projection={"_id": 0}
    ).sort("created_at", -1).limit(200)
    items = [_mine_projection(d) async for d in cursor]
    return {"items": items}


# --- Student: publish / unpublish own dúvida ---
@router.post("/duvidas/{duvida_id}/publish")
async def toggle_publish(duvida_id: str, body: DuvidaPublishBody, request: Request):
    user = await _require_user(request)
    db = _db()
    doc = await db.plantao_duvidas.find_one({"id": duvida_id}, projection={"_id": 0})
    if not doc or doc.get("user_id") != user["user_id"]:
        raise HTTPException(status_code=404, detail="Dúvida não encontrada.")
    if doc.get("status") != "respondida":
        raise HTTPException(status_code=400, detail="Só é possível compartilhar depois que a professora responder.")
    await db.plantao_duvidas.update_one(
        {"id": duvida_id}, {"$set": {"is_public": bool(body.is_public)}}
    )
    doc["is_public"] = bool(body.is_public)
    return _mine_projection(doc)


# --- Student: mark answer as read ---
@router.post("/duvidas/{duvida_id}/mark-read")
async def mark_read(duvida_id: str, request: Request):
    user = await _require_user(request)
    db = _db()
    result = await db.plantao_duvidas.update_one(
        {"id": duvida_id, "user_id": user["user_id"]},
        {"$set": {"read_by_student": True}},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Dúvida não encontrada.")
    # Marcar notificações relacionadas como lidas
    await db.plantao_notifications.update_many(
        {"user_id": user["user_id"], "duvida_id": duvida_id},
        {"$set": {"read": True}},
    )
    return {"ok": True}


# --- Notifications ---
@router.get("/notifications")
async def list_notifications(request: Request):
    user = await _require_user(request)
    db = _db()
    cursor = db.plantao_notifications.find(
        {"user_id": user["user_id"]}, projection={"_id": 0}
    ).sort("created_at", -1).limit(30)
    items = [n async for n in cursor]
    unread = sum(1 for n in items if not n.get("read"))
    return {"items": items, "unread_count": unread}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(request: Request):
    user = await _require_user(request)
    db = _db()
    await db.plantao_notifications.update_many(
        {"user_id": user["user_id"], "read": False}, {"$set": {"read": True}}
    )
    return {"ok": True}


# --- Public library ---
@router.get("/library")
async def public_library(
    request: Request,
    q: Optional[str] = None,
    category: Optional[str] = None,
    sort: str = "recent",  # recent | popular | liked
    limit: int = 30,
):
    db = _db()
    query: dict = {"is_public": True, "status": "respondida"}
    if category and category in CATEGORY_IDS:
        query["category"] = category
    if q and q.strip():
        rx = re.escape(q.strip())
        query["$or"] = [
            {"subject": {"$regex": rx, "$options": "i"}},
            {"question": {"$regex": rx, "$options": "i"}},
            {"answer": {"$regex": rx, "$options": "i"}},
        ]

    sort_field = "created_at"
    sort_dir = -1
    if sort == "popular":
        sort_field = "views"
    elif sort == "liked":
        sort_field = "likes"

    cursor = db.plantao_duvidas.find(query, projection={"_id": 0}).sort(sort_field, sort_dir).limit(max(1, min(limit, 100)))
    items = [_public_projection(d) async for d in cursor]

    # Também trazemos: perguntas mais acessadas + mais recentes para a home da biblioteca
    top_cursor = db.plantao_duvidas.find(
        {"is_public": True, "status": "respondida"}, projection={"_id": 0}
    ).sort("views", -1).limit(6)
    top_items = [_public_projection(d) async for d in top_cursor]

    recent_cursor = db.plantao_duvidas.find(
        {"is_public": True, "status": "respondida"}, projection={"_id": 0}
    ).sort("answered_at", -1).limit(6)
    recent_items = [_public_projection(d) async for d in recent_cursor]

    # Contagem por categoria
    pipeline = [
        {"$match": {"is_public": True, "status": "respondida"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
    ]
    counts = {}
    async for row in db.plantao_duvidas.aggregate(pipeline):
        counts[row["_id"] or "outros"] = row["count"]

    return {
        "items": items,
        "top_viewed": top_items,
        "recent": recent_items,
        "counts_by_category": counts,
        "categories": CATEGORIES,
    }


@router.get("/library/{duvida_id}")
async def library_detail(duvida_id: str):
    db = _db()
    doc = await db.plantao_duvidas.find_one(
        {"id": duvida_id, "is_public": True, "status": "respondida"},
        projection={"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Dúvida não encontrada.")
    # Increment views atomically
    await db.plantao_duvidas.update_one({"id": duvida_id}, {"$inc": {"views": 1}})
    doc["views"] = (doc.get("views", 0) or 0) + 1
    return _public_projection(doc)


@router.post("/library/{duvida_id}/like")
async def library_like(duvida_id: str, request: Request):
    # Curtidas são anônimas (não persistimos autoria da curtida no MVP).
    db = _db()
    result = await db.plantao_duvidas.update_one(
        {"id": duvida_id, "is_public": True}, {"$inc": {"likes": 1}}
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Dúvida não encontrada.")
    return {"ok": True}


# --- Live suggestions while typing ---
@router.get("/suggest")
async def suggest(q: str = Query(..., min_length=3, max_length=200)):
    """Sugere dúvidas semelhantes já respondidas na biblioteca pública.
    Estratégia MVP: extrai tokens significativos (>=4 letras), busca por regex
    em subject/question/answer e ranqueia por número de tokens encontrados.
    Estrutura preparada para futura substituição por busca semântica com IA.
    """
    db = _db()
    q_norm = _norm(q)
    tokens = [t for t in re.split(r"[^a-z0-9]+", q_norm) if len(t) >= 4]
    tokens = list(dict.fromkeys(tokens))[:6]
    if not tokens:
        return {"items": []}

    or_clauses = []
    for t in tokens:
        rx = re.escape(t)
        or_clauses.extend([
            {"subject": {"$regex": rx, "$options": "i"}},
            {"question": {"$regex": rx, "$options": "i"}},
        ])
    query = {"is_public": True, "status": "respondida", "$or": or_clauses}
    cursor = db.plantao_duvidas.find(query, projection={"_id": 0}).sort("views", -1).limit(20)
    docs = [d async for d in cursor]

    def score(doc):
        text = _norm(f"{doc.get('subject','')} {doc.get('question','')} {doc.get('answer','')}")
        return sum(1 for t in tokens if t in text)

    docs.sort(key=score, reverse=True)
    return {"items": [_public_projection(d) for d in docs[:5]]}


# --- Admin endpoints ---
@router.get("/admin/queue")
async def admin_queue(request: Request):
    await _require_admin(request)
    db = _db()
    pending = await db.plantao_duvidas.find(
        {"status": "aguardando"}, projection={"_id": 0}
    ).sort("created_at", 1).limit(200).to_list(200)
    answered = await db.plantao_duvidas.find(
        {"status": "respondida"}, projection={"_id": 0}
    ).sort("answered_at", -1).limit(50).to_list(50)

    def admin_view(d):
        return {
            "id": d["id"],
            "subject": d.get("subject"),
            "question": d.get("question"),
            "answer": d.get("answer"),
            "category": d.get("category"),
            "status": d.get("status"),
            "is_public": d.get("is_public", False),
            "created_at": d.get("created_at"),
            "answered_at": d.get("answered_at"),
            # Admin também vê identidade da aluna
            "student_id": d.get("user_id"),
        }

    return {
        "pending": [admin_view(d) for d in pending],
        "answered": [admin_view(d) for d in answered],
        "categories": CATEGORIES,
    }


@router.post("/admin/duvidas/{duvida_id}/answer")
async def admin_answer(duvida_id: str, body: DuvidaAnswerBody, request: Request):
    await _require_admin(request)
    db = _db()
    doc = await db.plantao_duvidas.find_one({"id": duvida_id}, projection={"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Dúvida não encontrada.")

    now = _now_iso()
    patch = {
        "answer": body.answer.strip(),
        "status": "respondida",
        "answered_at": now,
        "read_by_student": False,  # aluna precisa ver a nova resposta
    }
    if body.category and body.category in CATEGORY_IDS:
        patch["category"] = body.category

    await db.plantao_duvidas.update_one({"id": duvida_id}, {"$set": patch})

    # Cria notificação in-app
    notif = {
        "id": f"ntf_{uuid.uuid4().hex[:14]}",
        "user_id": doc["user_id"],
        "duvida_id": duvida_id,
        "kind": "answered",
        "message": f"Sua dúvida “{doc.get('subject','')}” foi respondida.",
        "read": False,
        "created_at": now,
    }
    await db.plantao_notifications.insert_one(dict(notif))

    return {"ok": True, "answered_at": now}
