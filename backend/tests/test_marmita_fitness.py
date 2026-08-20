"""Tests for marmita-fitness course bug fix.

Verifies:
- /images/cat-marmita.jpg is served (not broken)
- /apostilas/marmita-fitness-apostila.pdf is served
- /api/courses includes marmita-fitness and all 10 dashboard courses
- /api/courses/marmita-fitness returns 7 modules and 29 lessons
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")

EXPECTED_SLUGS = {
    "bolos-caseiros", "iogurtes-gourmet", "brigadeiro-gourmet",
    "geladinhos-gourmet", "plr-pascoa", "receitas-kids",
    "receitas-lactose", "receitas-zero-gluten", "receitas-low-carb",
    "receitas-diabeticos", "marmita-fitness",
}


def test_image_asset_served():
    r = requests.get(f"{BASE_URL}/images/cat-marmita.jpg", timeout=30)
    assert r.status_code == 200, f"got {r.status_code}"
    assert r.headers.get("content-type", "").startswith("image/"), r.headers.get("content-type")
    assert len(r.content) > 100_000, f"size={len(r.content)}"


def test_apostila_served():
    r = requests.get(f"{BASE_URL}/apostilas/marmita-fitness-apostila.pdf", timeout=60)
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    assert "pdf" in ct.lower() or "octet-stream" in ct.lower(), ct
    assert len(r.content) > 500_000, f"size={len(r.content)}"


def test_courses_catalog_contains_all_expected():
    r = requests.get(f"{BASE_URL}/api/courses", timeout=30)
    assert r.status_code == 200
    data = r.json()
    courses = data if isinstance(data, list) else data.get("courses", data.get("items", []))
    slugs = {c.get("slug") for c in courses}
    missing = EXPECTED_SLUGS - slugs
    assert not missing, f"missing slugs: {missing}. present: {slugs}"


def test_marmita_fitness_in_catalog_fields():
    r = requests.get(f"{BASE_URL}/api/courses", timeout=30)
    assert r.status_code == 200
    data = r.json()
    courses = data if isinstance(data, list) else data.get("courses", data.get("items", []))
    m = next((c for c in courses if c.get("slug") == "marmita-fitness"), None)
    assert m is not None
    assert m.get("title") == "Marmitas Fitness Lucrativas", m.get("title")
    assert m.get("cover_image") == "/images/cat-marmita.jpg", m.get("cover_image")


def test_marmita_fitness_detail():
    r = requests.get(f"{BASE_URL}/api/courses/marmita-fitness", timeout=30)
    assert r.status_code == 200
    c = r.json()
    assert c.get("slug") == "marmita-fitness"
    modules = c.get("modules", [])
    assert len(modules) == 7, f"modules={len(modules)}"
    lessons = [l for m in modules for l in m.get("lessons", [])]
    assert len(lessons) == 29, f"lessons={len(lessons)}"
    # Content lessons should be type video (apostila module may differ)
    content_lessons = [l for m in modules[:6] for l in m.get("lessons", [])]
    assert all(l.get("type") == "video" for l in content_lessons), \
        f"non-video types: {[l.get('type') for l in content_lessons if l.get('type') != 'video']}"
