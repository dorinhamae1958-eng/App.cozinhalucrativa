"""
Bring-up + PWA smoke tests for Cozinha Lucrativa 2026.
Validates:
- FastAPI proxy -> Next: /api/courses
- Auth gate: /api/auth/me
- Payments config: /api/payments/config
- PWA assets: manifest.json, icons, sw.js
- PWA head tags on landing HTML
"""
import os
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lucrativa-staging.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Accept": "application/json,text/html,*/*"})
    return sess


# ---------- Backend proxy / API ----------
class TestBackendApi:
    def test_courses_list(self, s):
        r = s.get(f"{BASE_URL}/api/courses", timeout=30)
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        assert isinstance(data, list), f"expected list, got {type(data)}"
        assert len(data) > 0, "courses list is empty"

    def test_auth_me_unauthenticated(self, s):
        r = s.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code == 401, f"expected 401 when logged out, got {r.status_code}: {r.text[:200]}"

    def test_payments_config(self, s):
        r = s.get(f"{BASE_URL}/api/payments/config", timeout=30)
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        assert "publishable_key" in data
        assert data.get("currency") == "brl"
        assert data.get("mode") == "test"


# ---------- PWA assets ----------
class TestPwaAssets:
    def test_manifest(self, s):
        r = s.get(f"{BASE_URL}/manifest.json", timeout=30)
        assert r.status_code == 200, r.text[:400]
        m = r.json()
        assert m.get("name") == "Cozinha Lucrativa" or "Cozinha Lucrativa" in m.get("name", "")
        assert m.get("display") == "standalone"
        icons = m.get("icons", [])
        sizes = {i.get("sizes") for i in icons}
        assert "192x192" in sizes
        assert "512x512" in sizes
        purposes = " ".join(i.get("purpose", "") for i in icons)
        assert "maskable" in purposes, f"no maskable icon: {icons}"

    @pytest.mark.parametrize("path", ["/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/sw.js"])
    def test_asset_available(self, s, path):
        r = s.get(f"{BASE_URL}{path}", timeout=30)
        assert r.status_code == 200, f"{path} -> {r.status_code}"


# ---------- PWA head tags on landing ----------
class TestPwaHead:
    def test_head_contains_pwa_tags(self, s):
        r = s.get(f"{BASE_URL}/", timeout=30)
        assert r.status_code == 200
        html = r.text
        assert 'rel="manifest"' in html or "rel='manifest'" in html, "manifest link missing"
        assert "/manifest.json" in html
        assert "theme-color" in html and "#8A3F21" in html
        assert "apple-touch-icon" in html
        assert "mobile-web-app-capable" in html
