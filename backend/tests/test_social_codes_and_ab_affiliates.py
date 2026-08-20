"""
Tests for:
- Social access codes (VIP 100% off) — no MP/Stripe when free
- Two-tier affiliate system (A/B) with fixed commission rates (50/30/30/40)
- MP guardrail (not configured -> 503)
- Stripe checkout persists affiliate_code
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kitchen-revenue.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "test-admin-token"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cozinha_lucrativa")

HDR_ADMIN = {"Authorization": f"Bearer {ADMIN_TOKEN}"}


@pytest.fixture(scope="module")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="module", autouse=True)
def cleanup(db):
    # Cleanup fresh objects created by this suite before + after
    codes_to_kill = ["LIMIT1", "OLD1"]
    affs_to_kill = ["ANAA", "BRUB", "BRUB2", "SELFB", "ORPHANB"]
    emails = ["novo.aluno@example.com", "a@x.com", "b@x.com"]

    def _wipe():
        db.access_codes.delete_many({"code": {"$in": codes_to_kill}})
        db.access_code_redemptions.delete_many({"code": {"$in": codes_to_kill + ["VIP100"]}, "email": {"$in": emails}})
        db.access_grants.delete_many({"email": {"$in": emails}})
        db.affiliates.delete_many({"code": {"$in": affs_to_kill}})
        db.mp_orders.delete_many({"affiliate_code": {"$in": affs_to_kill}, "order_id": {"$regex": "^TEST_"}})
        db.affiliate_events.delete_many({"code": {"$in": affs_to_kill}})

    _wipe()
    yield
    _wipe()


# ---------- Admin auth guardrails ----------
class TestAdminAuth:
    def test_affiliates_get_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/affiliates")
        assert r.status_code == 401, r.text

    def test_affiliates_post_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/affiliates",
                          json={"name": "NoAuth", "code": "NOAUTHX", "generation": "A"})
        assert r.status_code == 401

    def test_access_codes_get_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/access-codes")
        assert r.status_code == 401

    def test_access_codes_post_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/access-codes",
                          json={"code": "NOAUTHC", "discount_pct": 100})
        assert r.status_code == 401

    def test_admin_token_ok_affiliates(self):
        r = requests.get(f"{BASE_URL}/api/affiliates", headers=HDR_ADMIN)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data and "rules" in data
        assert data["rules"] == {"direct_a_seller_pct": 50, "b_seller_pct": 30, "b_parent_pct": 30}

    def test_admin_token_ok_access_codes(self):
        r = requests.get(f"{BASE_URL}/api/access-codes", headers=HDR_ADMIN)
        assert r.status_code == 200, r.text
        assert "items" in r.json()


# ---------- Access codes: seed + validate ----------
class TestAccessCodesSeed:
    @pytest.mark.parametrize("code,max_uses", [("VIP100", 20), ("PASTOR100", 50), ("CONVIDADO100", 100)])
    def test_seed_validate(self, code, max_uses):
        r = requests.post(f"{BASE_URL}/api/access-codes/validate", json={"code": code, "base_price": 57})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["valid"] is True
        assert d["discount_pct"] == 100
        assert d["final_price"] == 0
        assert d["free"] is True
        # remaining should be <= max_uses (some previous tests may have consumed)
        assert d["remaining"] is not None and d["remaining"] <= max_uses


# ---------- Access codes: redeem free path ----------
class TestAccessCodeRedeem:
    def test_redeem_grants_access_and_is_idempotent(self, db):
        email = "novo.aluno@example.com"
        # Ensure clean state for this email
        db.access_code_redemptions.delete_many({"code": "VIP100", "email": email})
        db.access_grants.delete_many({"email": email})
        before = db.access_codes.find_one({"code": "VIP100"})
        used_before = int((before or {}).get("used_count", 0))

        r1 = requests.post(f"{BASE_URL}/api/access-codes/redeem",
                           json={"code": "VIP100", "email": email})
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["granted"] is True
        assert d1["email"] == email

        # grant created
        g = db.access_grants.find_one({"email": email})
        assert g is not None and g.get("last_access_code") == "VIP100"

        # redemption logged
        red = db.access_code_redemptions.find_one({"code": "VIP100", "email": email})
        assert red is not None

        # used_count incremented by 1
        after = db.access_codes.find_one({"code": "VIP100"})
        assert int(after.get("used_count", 0)) == used_before + 1

        # Idempotent second redeem
        r2 = requests.post(f"{BASE_URL}/api/access-codes/redeem",
                           json={"code": "VIP100", "email": email})
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2.get("already_redeemed") is True

        after2 = db.access_codes.find_one({"code": "VIP100"})
        assert int(after2.get("used_count", 0)) == used_before + 1  # no extra consumption

    def test_max_uses_limit(self, db):
        # Create LIMIT1 code with max_uses=1
        r = requests.post(f"{BASE_URL}/api/access-codes",
                          json={"code": "LIMIT1", "discount_pct": 100, "max_uses": 1},
                          headers=HDR_ADMIN)
        assert r.status_code == 200, r.text

        r1 = requests.post(f"{BASE_URL}/api/access-codes/redeem",
                           json={"code": "LIMIT1", "email": "a@x.com"})
        assert r1.status_code == 200, r1.text

        r2 = requests.post(f"{BASE_URL}/api/access-codes/redeem",
                           json={"code": "LIMIT1", "email": "b@x.com"})
        assert r2.status_code == 400
        body = r2.json()
        assert "limite de usos" in (body.get("detail") or "").lower()

    def test_expired_code(self, db):
        r = requests.post(f"{BASE_URL}/api/access-codes",
                          json={"code": "OLD1", "discount_pct": 100, "expires_at": "2020-01-01"},
                          headers=HDR_ADMIN)
        assert r.status_code == 200, r.text
        v = requests.post(f"{BASE_URL}/api/access-codes/validate",
                          json={"code": "OLD1", "base_price": 57})
        assert v.status_code == 200
        d = v.json()
        assert d["valid"] is False
        assert d["reason"] == "expired"


# ---------- Affiliates A/B create rules ----------
class TestAffiliateCreation:
    def test_create_A(self):
        r = requests.post(f"{BASE_URL}/api/affiliates",
                          json={"name": "Ana A", "code": "ANAA", "generation": "A"},
                          headers=HDR_ADMIN)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] == "ANAA" and d["generation"] == "A"

    def test_create_B_with_parent(self):
        r = requests.post(f"{BASE_URL}/api/affiliates",
                          json={"name": "Bru B", "code": "BRUB", "generation": "B", "parent_code": "ANAA"},
                          headers=HDR_ADMIN)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["generation"] == "B" and d["parent_affiliate_id"] == "ANAA"

    def test_B_without_parent_rejected(self):
        r = requests.post(f"{BASE_URL}/api/affiliates",
                          json={"name": "Orphan", "code": "ORPHANB", "generation": "B"},
                          headers=HDR_ADMIN)
        assert r.status_code == 400

    def test_B_self_parent_rejected(self):
        r = requests.post(f"{BASE_URL}/api/affiliates",
                          json={"name": "Self", "code": "SELFB", "generation": "B", "parent_code": "SELFB"},
                          headers=HDR_ADMIN)
        assert r.status_code == 400

    def test_B_parent_is_another_B_rejected(self):
        r = requests.post(f"{BASE_URL}/api/affiliates",
                          json={"name": "Bru2", "code": "BRUB2", "generation": "B", "parent_code": "BRUB"},
                          headers=HDR_ADMIN)
        assert r.status_code == 400


# ---------- Click tracking ----------
class TestAffiliateTracking:
    def test_track_known(self, db):
        before = db.affiliate_events.count_documents({"code": "ANAA", "type": "click"})
        r = requests.get(f"{BASE_URL}/api/affiliates/track", params={"code": "ANAA"})
        assert r.status_code == 200
        assert r.json() == {"ok": True}
        after = db.affiliate_events.count_documents({"code": "ANAA", "type": "click"})
        assert after == before + 1

    def test_track_unknown(self):
        r = requests.get(f"{BASE_URL}/api/affiliates/track", params={"code": "ZZZUNKNOWN"})
        assert r.status_code == 200
        assert r.json().get("ok") is False


# ---------- Commission math ----------
class TestCommissionMath:
    def test_ab_commission_stats(self, db):
        # Insert approved mp_orders for ANAA and BRUB
        now = time.time()
        db.mp_orders.insert_many([
            {"order_id": f"TEST_ANAA_{uuid.uuid4().hex[:8]}", "affiliate_code": "ANAA",
             "amount": 57.0, "currency": "BRL", "status": "approved",
             "email": "buyer1@example.com", "created_at": now, "updated_at": now},
            {"order_id": f"TEST_BRUB_{uuid.uuid4().hex[:8]}", "affiliate_code": "BRUB",
             "amount": 57.0, "currency": "BRL", "status": "approved",
             "email": "buyer2@example.com", "created_at": now, "updated_at": now},
        ])

        r = requests.get(f"{BASE_URL}/api/affiliates", headers=HDR_ADMIN)
        assert r.status_code == 200
        data = r.json()
        by_code = {a["code"]: a for a in data["items"]}
        assert "ANAA" in by_code and "BRUB" in by_code

        anaa = by_code["ANAA"]
        brub = by_code["BRUB"]

        # ANAA: revenue 57 own; direct 50% + 30% override on BRUB's 57 = 28.50 + 17.10 = 45.60
        assert anaa["revenue"] == 57.0
        assert anaa["override_commission"] == 17.10
        assert anaa["commission"] == 45.60
        assert anaa["commission_rate_pct"] == 50

        # BRUB: 30% of 57 = 17.10
        assert brub["revenue"] == 57.0
        assert brub["commission"] == 17.10
        assert brub["commission_rate_pct"] == 30

        assert data["rules"] == {"direct_a_seller_pct": 50, "b_seller_pct": 30, "b_parent_pct": 30}


# ---------- Stripe checkout persists affiliate_code ----------
class TestStripeAffiliatePersist:
    def test_checkout_persists_affiliate_code(self, db):
        payload = {
            "lookup_key": "cozinha_lucrativa_57",
            "origin_url": BASE_URL,
            "ref": "ANAA",
        }
        r = requests.post(f"{BASE_URL}/api/payments/checkout", json=payload)
        assert r.status_code == 200, r.text
        session_id = r.json()["session_id"]
        tx = db.payment_transactions.find_one({"session_id": session_id})
        assert tx is not None
        assert tx.get("affiliate_code") == "ANAA"


# ---------- Mercado Pago not configured ----------
class TestMercadoPagoGuard:
    def test_config_disabled(self):
        r = requests.get(f"{BASE_URL}/api/payments/mercadopago/config")
        assert r.status_code == 200, r.text
        assert r.json().get("enabled") is False

    def test_preference_503(self):
        r = requests.post(f"{BASE_URL}/api/payments/mercadopago/preference",
                          json={"email": "x@x.com"})
        assert r.status_code == 503, r.text
