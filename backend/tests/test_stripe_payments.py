"""
Backend tests for Stripe payment flow (TEST mode) — Cozinha Lucrativa.

Covers:
- GET /api/payments/config (publishable pk_test_, mode=test)
- GET /api/courses (public, 200)
- GET /api/auth/me (unauthenticated → 401)
- POST /api/payments/checkout → checkout_url + session_id, persists tx
- GET /api/payments/status/{sid} (initial pending)

E2E (hosted checkout via browser + card 4242) is validated separately;
this file also has an OPTIONAL check that reads a paid session from Mongo
to ensure access_grants was written.
"""
import os
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kitchen-revenue.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cozinha_lucrativa")


@pytest.fixture(scope="module")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


def test_payments_config():
    r = requests.get(f"{BASE_URL}/api/payments/config", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j.get("publishable_key", "").startswith("pk_test_"), j
    assert j.get("mode") == "test"
    assert j.get("currency") == "brl"


def test_courses_public():
    r = requests.get(f"{BASE_URL}/api/courses", timeout=20)
    assert r.status_code == 200


def test_auth_me_unauth_returns_401():
    r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code == 401


def test_checkout_creates_session_and_persists_tx(db):
    payload = {
        "lookup_key": "cozinha_lucrativa_57",
        "origin_url": BASE_URL,
    }
    r = requests.post(f"{BASE_URL}/api/payments/checkout", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "checkout.stripe.com" in j["checkout_url"]
    sid = j["session_id"]
    assert sid.startswith("cs_test_")

    tx = db.payment_transactions.find_one({"session_id": sid})
    assert tx is not None
    assert tx["status"] == "initiated"
    assert tx["payment_status"] == "pending"
    assert tx["amount"] == 5700.0
    assert tx["currency"] == "brl"
    assert tx["lookup_key"] == "cozinha_lucrativa_57"

    # status endpoint returns pending initially
    r2 = requests.get(f"{BASE_URL}/api/payments/status/{sid}", timeout=15)
    assert r2.status_code == 200
    s = r2.json()
    assert s["session_id"] == sid
    assert s["payment_status"] in ("pending", "paid")


def test_checkout_rejects_unknown_lookup_key():
    r = requests.post(
        f"{BASE_URL}/api/payments/checkout",
        json={"lookup_key": "nope", "origin_url": BASE_URL},
        timeout=15,
    )
    assert r.status_code == 400


def test_status_404_for_unknown_session():
    r = requests.get(f"{BASE_URL}/api/payments/status/cs_test_doesnotexist", timeout=15)
    assert r.status_code == 404


def test_access_grant_exists_for_paid_test_email(db):
    """E2E was driven separately with test card 4242; confirm grant is present."""
    ag = db.access_grants.find_one({"email": "compradora.teste@example.com"})
    if not ag:
        pytest.skip("No prior e2e paid session recorded")
    assert ag["expires_at"] > ag["created_at"]
    # ~ 365 days
    delta_days = (ag["expires_at"] - ag["created_at"]).days
    assert 360 <= delta_days <= 370
