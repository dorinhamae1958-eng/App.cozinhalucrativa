# Tests for A/B affiliate commission rules + Marmitas Fitness course standardization
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

fe = dotenv_values("/app/frontend/.env")
be = dotenv_values("/app/backend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL")).rstrip("/")
MONGO_URL = be.get("MONGO_URL") or os.environ.get("MONGO_URL")
DB_NAME = be.get("DB_NAME") or os.environ.get("DB_NAME")

TOKEN = "qa-admin"
HDRS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope="module", autouse=True)
def seed(db):
    now = datetime.now(timezone.utc)
    db.users.update_one({"user_id": "admin-uid"},
                        {"$set": {"user_id": "admin-uid", "email": "aplicativos.carine@gmail.com", "name": "Admin QA"}},
                        upsert=True)
    db.user_sessions.update_one({"session_token": TOKEN},
                                {"$set": {"session_token": TOKEN, "user_id": "admin-uid",
                                          "expires_at": (now + timedelta(days=7)).isoformat()}},
                                upsert=True)
    # clean previous test data
    db.affiliates.delete_many({"code": {"$in": ["A01", "B01"]}})
    db.mp_orders.delete_many({"order_id": {"$regex": "^qa_"}})
    yield
    db.affiliates.delete_many({"code": {"$in": ["A01", "B01"]}})
    db.mp_orders.delete_many({"order_id": {"$regex": "^qa_"}})
    db.user_sessions.delete_many({"session_token": TOKEN})
    db.users.delete_many({"user_id": "admin-uid"})


def _list():
    r = requests.get(f"{BASE_URL}/api/affiliates", headers=HDRS, timeout=30)
    assert r.status_code == 200, r.text[:400]
    data = r.json()
    return {i["code"]: i for i in data["items"]}, data


def _order(db, oid, code, amount, status):
    db.mp_orders.insert_one({"order_id": oid, "provider": "mercadopago", "affiliate_code": code,
                             "amount": amount, "status": status, "created_at": datetime.now(timezone.utc)})


class TestAffiliateAB:
    def test_00_admin_session(self):
        r = requests.get(f"{BASE_URL}/api/affiliates/me", headers=HDRS, timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.json() == {"authenticated": True, "is_admin": True}

    def test_01_unauthenticated_list_401(self):
        r = requests.get(f"{BASE_URL}/api/affiliates", timeout=30)
        assert r.status_code == 401, f"{r.status_code} {r.text[:200]}"

    def test_02_scenario1_direct_A(self, db):
        r = requests.post(f"{BASE_URL}/api/affiliates", headers=HDRS,
                          json={"name": "Cirlene", "code": "A01", "generation": "A"}, timeout=30)
        assert r.status_code == 200, r.text[:400]
        assert r.json()["generation"] == "A"
        _order(db, "qa_a1", "A01", 57, "approved")
        items, data = _list()
        a = items["A01"]
        assert a["sales"] == 1, a
        assert a["revenue"] == 57, a
        assert a["commission"] == 28.50, a
        assert a["override_commission"] == 0.0, a
        assert data["rules"] == {"direct_a_seller_pct": 50, "b_seller_pct": 30, "b_parent_pct": 30}

    def test_03_scenario2_B_sale_with_parent_override(self, db):
        r = requests.post(f"{BASE_URL}/api/affiliates", headers=HDRS,
                          json={"name": "Luiza", "code": "B01", "generation": "B", "parent_code": "A01"}, timeout=30)
        assert r.status_code == 200, r.text[:400]
        assert r.json()["parent_affiliate_id"] == "A01"
        _order(db, "qa_b1", "B01", 57, "approved")
        items, _ = _list()
        b, a = items["B01"], items["A01"]
        assert b["revenue"] == 57 and b["sales"] == 1, b
        assert b["commission"] == 17.10, b
        assert b["override_commission"] == 0.0, b
        assert a["override_commission"] == 17.10, a
        assert a["commission"] == 45.60, a

    def test_04_scenario3_pending_no_commission(self, db):
        _order(db, "qa_b2", "B01", 57, "pending")
        items, _ = _list()
        b, a = items["B01"], items["A01"]
        assert b["sales"] == 1 and b["revenue"] == 57 and b["commission"] == 17.10, b
        assert a["commission"] == 45.60, a

    def test_05_scenario4_refunded_no_commission(self, db):
        _order(db, "qa_b3", "B01", 57, "refunded")
        items, _ = _list()
        b, a = items["B01"], items["A01"]
        assert b["sales"] == 1 and b["revenue"] == 57 and b["commission"] == 17.10, b
        assert a["commission"] == 45.60, a

    def test_06_validation_B_without_parent_400(self):
        r = requests.post(f"{BASE_URL}/api/affiliates", headers=HDRS,
                          json={"name": "SemPai", "code": "QAZZ1", "generation": "B"}, timeout=30)
        assert r.status_code == 400, f"{r.status_code} {r.text[:300]}"

    def test_07_validation_self_parent_400(self):
        r = requests.patch(f"{BASE_URL}/api/affiliates/B01", headers=HDRS,
                           json={"generation": "B", "parent_code": "B01"}, timeout=30)
        assert r.status_code == 400, f"{r.status_code} {r.text[:300]}"

    def test_08_patch_commission_rate_ok(self):
        r = requests.patch(f"{BASE_URL}/api/affiliates/A01", headers=HDRS,
                           json={"commission_rate": 30}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        # fixed rules must be unaffected by per-affiliate rate
        items, _ = _list()
        assert items["A01"]["commission"] == 45.60, items["A01"]
        assert items["A01"]["commission_rate_pct"] == 50, items["A01"]

    def test_09_duplicate_code_409(self):
        r = requests.post(f"{BASE_URL}/api/affiliates", headers=HDRS,
                          json={"name": "Cirlene 2", "code": "A01", "generation": "A"}, timeout=30)
        assert r.status_code == 409, f"{r.status_code} {r.text[:200]}"

    def test_10_parent_must_be_A(self):
        r = requests.post(f"{BASE_URL}/api/affiliates", headers=HDRS,
                          json={"name": "Neta C", "code": "QAC1", "generation": "B", "parent_code": "B01"}, timeout=30)
        assert r.status_code == 400, f"{r.status_code} {r.text[:300]}"


