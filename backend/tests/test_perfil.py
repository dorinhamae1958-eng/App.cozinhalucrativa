"""Tests for /api/profile/* endpoints (Perfil feature).

Uses seeded test user (user_test_perfil_01) with pre-created session token.
"""
import os
import time
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")

USER_ID = "user_test_perfil_01"
TOKEN = "tk_test_perfil_c0f302152988406c"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "cozinha_lucrativa"


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module", autouse=True)
def reset_profile(db):
    """Reset profile before/after tests to a clean empty state."""
    db.pi_profiles.delete_many({"user_id": USER_ID})
    yield
    db.pi_profiles.delete_many({"user_id": USER_ID})


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestProfileAuth:
    def test_profile_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/profile/me")
        assert r.status_code == 401, r.text

    def test_profile_stats_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/profile/stats")
        assert r.status_code == 401, r.text


# ---------- Profile CRUD ----------
class TestProfileMe:
    def test_get_empty_profile_creates_and_returns_incomplete(self, auth_headers, db):
        db.pi_profiles.delete_many({"user_id": USER_ID})
        r = requests.get(f"{BASE_URL}/api/profile/me", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["profile_complete"] is False
        assert data["user"]["email"] == "carine.teste@cozinha.local"
        assert data["profile"]["user_id"] == USER_ID
        assert data["profile"]["city"] == ""
        assert data["profile"]["monthly_goal"] == 0
        # Verify persisted
        assert db.pi_profiles.find_one({"user_id": USER_ID}) is not None

    def test_put_profile_updates_fields_and_user_name(self, auth_headers, db):
        payload = {
            "name": "Carine Teste",
            "city": "São Paulo",
            "specialty": "brigadeiro-gourmet",
            "monthly_goal": 3000,
            "favorite_dish": "Bolo de cenoura",
            "motto": "Doces com amor",
        }
        r = requests.put(f"{BASE_URL}/api/profile/me", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["profile"]["city"] == "São Paulo"
        assert data["profile"]["specialty"] == "brigadeiro-gourmet"
        assert data["profile"]["monthly_goal"] == 3000
        assert data["profile"]["favorite_dish"] == "Bolo de cenoura"
        assert data["profile"]["motto"] == "Doces com amor"
        assert data["user"]["name"] == "Carine Teste"
        # Verify user name persisted
        u = db.users.find_one({"user_id": USER_ID})
        assert u["name"] == "Carine Teste"

    def test_get_profile_after_put_complete_true(self, auth_headers):
        # Set known state first
        requests.put(
            f"{BASE_URL}/api/profile/me",
            json={"city": "São Paulo", "specialty": "brigadeiro-gourmet", "monthly_goal": 3000},
            headers=auth_headers,
        )
        r = requests.get(f"{BASE_URL}/api/profile/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["profile_complete"] is True
        assert data["profile"]["city"] == "São Paulo"

    def test_put_partial_update_preserves_fields(self, auth_headers):
        # Set known state first
        requests.put(
            f"{BASE_URL}/api/profile/me",
            json={"city": "São Paulo", "specialty": "brigadeiro-gourmet", "monthly_goal": 3000},
            headers=auth_headers,
        )
        r = requests.put(
            f"{BASE_URL}/api/profile/me",
            json={"motto": "Nova frase"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["profile"]["motto"] == "Nova frase"
        assert r.json()["profile"]["city"] == "São Paulo"  # preserved


# ---------- Stats ----------
class TestProfileStats:
    def test_stats_structure_and_kpis(self, auth_headers):
        # Ensure profile has monthly goal for meta_mensal
        requests.put(
            f"{BASE_URL}/api/profile/me",
            json={"monthly_goal": 3000, "city": "SP", "specialty": "brigadeiro-gourmet", "name": "Carine"},
            headers=auth_headers,
        )
        r = requests.get(f"{BASE_URL}/api/profile/stats", headers=auth_headers)
        assert r.status_code == 200, r.text
        s = r.json()

        # Top-level keys
        for k in ["kpis", "faturamento_mes", "meta_mensal", "chart_30d",
                  "missoes_concluidas", "missoes_total", "current_course"]:
            assert k in s, f"missing {k}"

        # KPI shape
        kpis = s["kpis"]
        for k in ["cursos_concluidos", "cursos_matriculados", "aulas_assistidas",
                  "clientes_atendidos", "pedidos_entregues", "streak_dias"]:
            assert k in kpis

        # Business values from seeded data:
        # 1 completed course (brigadeiro-gourmet, progress=100)
        assert kpis["cursos_concluidos"] == 1
        assert kpis["cursos_matriculados"] == 2
        # lessons: 3 + 5 = 8
        assert kpis["aulas_assistidas"] == 8
        # 2 unique clients (Ana Silva x2, Bruna Costa x1)
        assert kpis["clientes_atendidos"] == 2
        assert kpis["pedidos_entregues"] == 3

        # meta_mensal reflects profile
        assert s["meta_mensal"] == 3000
        assert s["missoes_total"] == 8

        # chart_30d must be 30 items with required keys
        assert len(s["chart_30d"]) == 30
        for item in s["chart_30d"]:
            assert set(["date", "entregues", "faturamento"]).issubset(item.keys())

        # current_course should be bolos-caseiros (in-progress)
        assert s["current_course"] is not None
        assert s["current_course"]["slug"] == "bolos-caseiros"
        assert s["current_course"]["progress"] == 45
