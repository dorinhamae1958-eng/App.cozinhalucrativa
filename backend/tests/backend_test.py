"""Payment API regression tests for Stripe config, checkout, status, validation, and Mongo persistence."""
import os
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()


@pytest.fixture(scope="module")
def payments_collection():
    mongo_url = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")
    if not mongo_url or not db_name:
        pytest.fail("MONGO_URL or DB_NAME is missing")
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    collection = client[db_name]["payment_transactions"]
    yield collection
    client.close()


# Public Stripe configuration endpoint.
def test_payments_config(api_client):
    response = api_client.get(f"{BASE_URL}/api/payments/config", timeout=20)
    assert response.status_code == 200, response.text
    data = response.json()
    assert isinstance(data.get("publishable_key"), str)
    assert data["publishable_key"].startswith("pk_test_")
    assert data["currency"] == "brl"
    assert data["mode"] == "test"


# Checkout request validation for unauthorized prices.
def test_checkout_rejects_invalid_lookup_key(api_client):
    response = api_client.post(
        f"{BASE_URL}/api/payments/checkout",
        json={"lookup_key": "foo", "origin_url": BASE_URL},
        timeout=20,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert data.get("detail") == "Preço não autorizado: foo"


# Pydantic validation for a missing required origin URL.
def test_checkout_requires_origin_url(api_client):
    response = api_client.post(
        f"{BASE_URL}/api/payments/checkout",
        json={"lookup_key": "cozinha_lucrativa_57"},
        timeout=20,
    )
    assert response.status_code == 422, response.text
    detail = response.json().get("detail")
    assert isinstance(detail, list)
    assert any(item.get("loc", [])[-1:] == ["origin_url"] for item in detail)


# Unknown transaction lookup behavior.
def test_status_unknown_session_returns_404(api_client):
    response = api_client.get(
        f"{BASE_URL}/api/payments/status/cs_test_TEST_nonexistent_session",
        timeout=20,
    )
    assert response.status_code == 404, response.text
    assert response.json().get("detail") == "Transação não encontrada."


# End-to-end session creation, Mongo persistence, and immediate status retrieval.
def test_create_checkout_persists_transaction_and_returns_pending_status(
    api_client, payments_collection
):
    session_id = None
    try:
        response = api_client.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "lookup_key": "cozinha_lucrativa_57",
                "origin_url": BASE_URL,
            },
            timeout=40,
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert isinstance(data.get("session_id"), str)
        assert data["session_id"].startswith("cs_test_")
        assert isinstance(data.get("checkout_url"), str)
        assert data["checkout_url"].startswith("https://checkout.stripe.com/")
        session_id = data["session_id"]

        record = payments_collection.find_one({"session_id": session_id})
        assert record is not None, "Checkout transaction was not persisted"
        assert record["session_id"] == session_id
        assert record["lookup_key"] == "cozinha_lucrativa_57"
        assert record["amount"] == 5700
        assert record["currency"] == "brl"
        assert record["status"] == "initiated"
        assert record["payment_status"] == "pending"

        status_response = api_client.get(
            f"{BASE_URL}/api/payments/status/{session_id}", timeout=30
        )
        assert status_response.status_code == 200, status_response.text
        status_data = status_response.json()
        assert status_data == {
            "session_id": session_id,
            "status": "initiated",
            "payment_status": "pending",
        }
    finally:
        if session_id:
            payments_collection.delete_one({"session_id": session_id})
