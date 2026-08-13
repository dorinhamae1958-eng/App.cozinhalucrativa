"""Backend tests for Plantão de Dúvidas module."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://knowledge-hub-988.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/plantao"

ALUNA_COOKIE = {"session_token": "dev-session-aluna-01"}
PROF_COOKIE = {"session_token": "dev-session-prof-01"}


PRIVATE_FIELDS = ("user_id", "user_email", "user_name")


def _no_private(obj):
    if isinstance(obj, dict):
        for k in PRIVATE_FIELDS:
            assert k not in obj, f"campo privado {k} exposto em {obj}"
        for v in obj.values():
            _no_private(v)
    elif isinstance(obj, list):
        for v in obj:
            _no_private(v)


# --- Meta ---
def test_meta_categories():
    r = requests.get(f"{API}/meta", timeout=15)
    assert r.status_code == 200
    cats = r.json()["categories"]
    ids = [c["id"] for c in cats]
    assert ids == ["receitas", "tecnicas", "ingredientes", "equipamentos", "precificacao", "vendas", "outros"]


# --- /me ---
def test_me_anonymous():
    r = requests.get(f"{API}/me", timeout=15)
    assert r.status_code == 200
    assert r.json() == {"authenticated": False, "is_admin": False}


def test_me_aluna():
    r = requests.get(f"{API}/me", cookies=ALUNA_COOKIE, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["authenticated"] is True
    assert data["is_admin"] is False


def test_me_prof():
    r = requests.get(f"{API}/me", cookies=PROF_COOKIE, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["authenticated"] is True
    assert data["is_admin"] is True


# --- Create/list dúvidas ---
def test_create_duvida_requires_auth():
    payload = {"subject": "Teste sem auth", "question": "Pergunta longa o suficiente aqui.", "category": "outros"}
    r = requests.post(f"{API}/duvidas", json=payload, timeout=15)
    assert r.status_code == 401


def test_mine_requires_auth():
    r = requests.get(f"{API}/duvidas/mine", timeout=15)
    assert r.status_code == 401


@pytest.fixture(scope="module")
def created_duvida():
    payload = {
        "subject": "TEST_Brigadeiro gourmet queima no fundo",
        "question": "Sempre que faço brigadeiro gourmet ele queima no fundo da panela. Como evitar?",
        "category": "receitas",
    }
    r = requests.post(f"{API}/duvidas", json=payload, cookies=ALUNA_COOKIE, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "aguardando"
    assert d["is_public"] is False
    assert d["read_by_student"] is True
    assert "id" in d
    return d


def test_create_and_list_mine(created_duvida):
    r = requests.get(f"{API}/duvidas/mine", cookies=ALUNA_COOKIE, timeout=15)
    assert r.status_code == 200
    ids = [i["id"] for i in r.json()["items"]]
    assert created_duvida["id"] in ids


# --- Admin queue ---
def test_admin_queue_requires_admin():
    r = requests.get(f"{API}/admin/queue", timeout=15)
    assert r.status_code == 401
    r2 = requests.get(f"{API}/admin/queue", cookies=ALUNA_COOKIE, timeout=15)
    assert r2.status_code == 403


def test_admin_queue_ok(created_duvida):
    r = requests.get(f"{API}/admin/queue", cookies=PROF_COOKIE, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "pending" in data and "answered" in data and "categories" in data
    pending_ids = [d["id"] for d in data["pending"]]
    assert created_duvida["id"] in pending_ids


# --- Admin answers ---
def test_publish_before_answer_fails(created_duvida):
    r = requests.post(
        f"{API}/duvidas/{created_duvida['id']}/publish",
        json={"is_public": True},
        cookies=ALUNA_COOKIE,
        timeout=15,
    )
    assert r.status_code == 400


def test_answer_requires_admin(created_duvida):
    r = requests.post(
        f"{API}/admin/duvidas/{created_duvida['id']}/answer",
        json={"answer": "Use fogo baixo e panela de fundo grosso."},
        cookies=ALUNA_COOKIE,
        timeout=15,
    )
    assert r.status_code == 403


def test_admin_answer_ok(created_duvida):
    r = requests.post(
        f"{API}/admin/duvidas/{created_duvida['id']}/answer",
        json={"answer": "Use fogo baixo, panela de fundo grosso e mexa sem parar."},
        cookies=PROF_COOKIE,
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True


# --- Notifications ---
def test_notifications_after_answer(created_duvida):
    time.sleep(0.5)
    r = requests.get(f"{API}/notifications", cookies=ALUNA_COOKIE, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["unread_count"] >= 1
    related = [n for n in data["items"] if n.get("duvida_id") == created_duvida["id"]]
    assert related, "notificação da dúvida respondida não encontrada"


def test_mark_all_read():
    r = requests.post(f"{API}/notifications/mark-all-read", cookies=ALUNA_COOKIE, timeout=15)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/notifications", cookies=ALUNA_COOKIE, timeout=15)
    assert r2.json()["unread_count"] == 0


# --- Publish + mark-read ---
def test_mark_read(created_duvida):
    r = requests.post(f"{API}/duvidas/{created_duvida['id']}/mark-read", cookies=ALUNA_COOKIE, timeout=15)
    assert r.status_code == 200
    mine = requests.get(f"{API}/duvidas/mine", cookies=ALUNA_COOKIE, timeout=15).json()["items"]
    row = [d for d in mine if d["id"] == created_duvida["id"]][0]
    assert row["read_by_student"] is True
    assert row["status"] == "respondida"


def test_publish_toggle(created_duvida):
    r = requests.post(
        f"{API}/duvidas/{created_duvida['id']}/publish",
        json={"is_public": True},
        cookies=ALUNA_COOKIE,
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["is_public"] is True

    r2 = requests.post(
        f"{API}/duvidas/{created_duvida['id']}/publish",
        json={"is_public": False},
        cookies=ALUNA_COOKIE,
        timeout=15,
    )
    assert r2.json()["is_public"] is False

    # Deixa público para testes de library/suggest a seguir
    requests.post(
        f"{API}/duvidas/{created_duvida['id']}/publish",
        json={"is_public": True},
        cookies=ALUNA_COOKIE,
        timeout=15,
    )


# --- Library privacy + filtering ---
def test_library_privacy_and_shape():
    r = requests.get(f"{API}/library", timeout=15)
    assert r.status_code == 200
    data = r.json()
    for key in ("items", "top_viewed", "recent", "counts_by_category", "categories"):
        assert key in data
    _no_private(data)


def test_library_filters(created_duvida):
    r = requests.get(f"{API}/library", params={"q": "brigadeiro", "category": "receitas", "sort": "popular"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    _no_private(data)
    ids = [i["id"] for i in data["items"]]
    assert created_duvida["id"] in ids


def test_library_detail_increments_views(created_duvida):
    before = requests.get(f"{API}/library/{created_duvida['id']}", timeout=15)
    assert before.status_code == 200
    v1 = before.json()["views"]
    after = requests.get(f"{API}/library/{created_duvida['id']}", timeout=15).json()
    assert after["views"] == v1 + 1
    _no_private(after)


def test_library_like_increments(created_duvida):
    before = requests.get(f"{API}/library/{created_duvida['id']}", timeout=15).json()
    l1 = before.get("likes", 0)
    r = requests.post(f"{API}/library/{created_duvida['id']}/like", timeout=15)
    assert r.status_code == 200
    after = requests.get(f"{API}/library/{created_duvida['id']}", timeout=15).json()
    assert after["likes"] >= l1 + 1


# --- Suggest ---
def test_suggest_short_query_422_or_empty():
    r = requests.get(f"{API}/suggest", params={"q": "br"}, timeout=15)
    # min_length=3 → FastAPI valida com 422
    assert r.status_code in (200, 422)
    if r.status_code == 200:
        assert r.json()["items"] == []


def test_suggest_relevant(created_duvida):
    r = requests.get(f"{API}/suggest", params={"q": "brigadeiro gourmet queima"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    _no_private(data)
    assert isinstance(data["items"], list)
    assert len(data["items"]) >= 1
