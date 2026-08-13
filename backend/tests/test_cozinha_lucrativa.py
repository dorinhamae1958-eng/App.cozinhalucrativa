"""Backend tests for Cozinha Lucrativa (FastAPI proxy + Next.js API)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://order-flow-255.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# --- Health / proxy basics ---
class TestHealth:
    def test_health(self, s):
        r = s.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("status") == "ok"
        assert j.get("db") == "ok"

    def test_frontend_root(self, s):
        r = s.get(f"{BASE_URL}/", timeout=20)
        assert r.status_code == 200
        assert "Cozinha Lucrativa" in r.text or "cozinha" in r.text.lower()


# --- Next.js proxied API ---
class TestCoursesAndPlans:
    def test_courses_list(self, s):
        r = s.get(f"{BASE_URL}/api/courses", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "slug" in data[0]

    def test_courses_detail_valid(self, s):
        # get first slug and fetch detail
        listing = s.get(f"{BASE_URL}/api/courses", timeout=20).json()
        slug = listing[0]["slug"]
        r = s.get(f"{BASE_URL}/api/courses/{slug}", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["slug"] == slug
        # course should have modules or combined content
        assert "modules" in data or "combined_from" in data

    def test_courses_detail_missing_returns_404(self, s):
        r = s.get(f"{BASE_URL}/api/courses/does-not-exist-xyz", timeout=15)
        assert r.status_code == 404

    def test_all_cover_images_local(self, s):
        r = s.get(f"{BASE_URL}/api/courses", timeout=20)
        assert r.status_code == 200
        data = r.json()
        for c in data:
            cover = c.get("cover_image", "")
            assert not str(cover).startswith("http"), f"Course {c.get('slug')} has external cover: {cover}"

    def test_receitas_kids_local_cover(self, s):
        r = s.get(f"{BASE_URL}/api/courses", timeout=20)
        data = r.json()
        kids = [c for c in data if c.get("slug") == "receitas-kids"]
        assert kids, "receitas-kids course not in listing"
        assert kids[0].get("cover_image") == "/images/alimento-saudavel.png", kids[0].get("cover_image")

    def test_plans(self, s):
        r = s.get(f"{BASE_URL}/api/plans", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        assert "price" in data[0]


# --- AI native routes (Emergent LLM key) ---
class TestAI:
    def test_slogan(self, s):
        r = s.post(f"{BASE_URL}/api/ai/slogan", json={"brand_name": "Doces da Ana"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "slogan" in data
        assert isinstance(data["slogan"], str) and len(data["slogan"]) > 0

    def test_categorize_note(self, s):
        r = s.post(f"{BASE_URL}/api/ai/categorize-note", json={"text": "comprar farinha amanha"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "category" in data
        assert isinstance(data["category"], str) and len(data["category"]) > 0


# --- Plantao ---
class TestPlantao:
    def test_meta(self, s):
        r = s.get(f"{BASE_URL}/api/plantao/meta", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "categories" in data
        assert isinstance(data["categories"], list) and len(data["categories"]) > 0

    def test_library_public(self, s):
        r = s.get(f"{BASE_URL}/api/plantao/library", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "categories" in data

    def test_me_unauthed(self, s):
        r = s.get(f"{BASE_URL}/api/plantao/me", timeout=15)
        assert r.status_code == 200
        assert r.json().get("authenticated") is False


# --- Vitrine ---
class TestVitrine:
    def test_missing_slug_returns_404(self, s):
        r = s.get(f"{BASE_URL}/api/vitrine/order-flow-255", timeout=15)
        assert r.status_code == 404


# --- Auth ---
class TestAuth:
    def test_me_unauthenticated(self, s):
        r = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401
