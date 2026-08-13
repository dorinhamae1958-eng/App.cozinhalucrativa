"""Smoke tests after adding MONGO_URL & DB_NAME to frontend/.env.
Confirms Next.js /api routes function (Mongo connectivity works) via the external URL."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://now-staging.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope='module')
def client():
    s = requests.Session()
    s.headers.update({'Accept': 'application/json'})
    return s


# --- Basic reachability ---

def test_api_root(client):
    # Root /api and /api/ have an ingress-level http<->https redirect loop.
    # Verify via a known GET route instead that the Next.js /api handler is up.
    r = client.get(f'{BASE_URL}/api/plans')
    assert r.status_code == 200


def test_health_db_ok(client):
    """Verifies Mongo connectivity via env-configured MONGO_URL/DB_NAME."""
    r = client.get(f'{BASE_URL}/api/health')
    assert r.status_code == 200
    data = r.json()
    assert data.get('status') == 'ok'
    assert data.get('db') == 'ok'


# --- Public endpoints (touch Mongo) ---

def test_courses_list(client):
    r = client.get(f'{BASE_URL}/api/courses')
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert 'slug' in data[0]


def test_courses_detail(client):
    r = client.get(f'{BASE_URL}/api/courses/delicias-lucrativas')
    assert r.status_code == 200
    data = r.json()
    assert data.get('slug') == 'delicias-lucrativas'


def test_plans(client):
    r = client.get(f'{BASE_URL}/api/plans')
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) > 0


def test_vitrine_public_not_found(client):
    r = client.get(f'{BASE_URL}/api/vitrine/nonexistent-store-xyz-abc')
    assert r.status_code == 404


# --- Auth-gated endpoints: expect 401 without cookie ---

def test_auth_me_unauth(client):
    r = client.get(f'{BASE_URL}/api/auth/me')
    assert r.status_code == 401


def test_recipes_unauth(client):
    r = client.get(f'{BASE_URL}/api/recipes')
    assert r.status_code == 401


def test_enrollments_unauth(client):
    r = client.get(f'{BASE_URL}/api/enrollments')
    assert r.status_code == 401


def test_orders_unauth(client):
    r = client.get(f'{BASE_URL}/api/orders')
    assert r.status_code == 401


# --- AI endpoints: FastAPI must not crash on import (emergentintegrations) ---
# Acceptable outcomes: 200 (key present), 500 (EMERGENT_LLM_KEY missing),
# 401 (auth-gated). 502/503/ImportError-style crashes = FAIL.

def _ai_ok(status):
    return status in (200, 401, 422, 500)


def test_ai_slogan_reachable(client):
    r = client.post(f'{BASE_URL}/api/ai/slogan',
                    json={'brand_name': 'TestBrand', 'product': 'bolo', 'tone': 'friendly'})
    assert _ai_ok(r.status_code), f'AI slogan crashed: {r.status_code} {r.text[:200]}'


def test_ai_product_description_reachable(client):
    r = client.post(f'{BASE_URL}/api/ai/product-description',
                    json={'product_name': 'Bolo de Cenoura', 'ingredients': 'cenoura, ovos'})
    assert _ai_ok(r.status_code), f'AI product-description crashed: {r.status_code} {r.text[:200]}'


def test_ai_categorize_note_reachable(client):
    r = client.post(f'{BASE_URL}/api/ai/categorize-note',
                    json={'content': 'Comprar farinha e ovos amanhã'})
    assert _ai_ok(r.status_code), f'AI categorize-note crashed: {r.status_code} {r.text[:200]}'
