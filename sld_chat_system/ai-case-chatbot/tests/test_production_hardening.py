import logging
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app.core.config import settings
from app.core.logging import sanitize_for_log
from app.core.rate_limit import rate_limiter
from app.db.mongodb import get_database
from app.main import app
from app.services.llm import GroqProvider


@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()
    return client.get_database("sld_system")


@pytest.fixture
def client(mock_db, monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "mock")

    async def override_get_database():
        yield mock_db

    app.dependency_overrides[get_database] = override_get_database
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def reset_hardening_settings(monkeypatch):
    rate_limiter.reset()
    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setattr(settings, "AUTH_ENABLED", False)
    monkeypatch.setattr(settings, "API_KEYS", [])
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", False)
    monkeypatch.setattr(settings, "RATE_LIMIT_REQUESTS", 120)
    monkeypatch.setattr(settings, "RATE_LIMIT_WINDOW_SECONDS", 60)
    monkeypatch.setattr(settings, "CHAT_RATE_LIMIT_REQUESTS", 20)
    monkeypatch.setattr(settings, "CHAT_RATE_LIMIT_WINDOW_SECONDS", 60)


@pytest.fixture
async def seed_case(mock_db):
    await mock_db.cases.insert_one(
        {
            "sldNumber": 1629482,
            "isDeleted": False,
            "caseId": "CASE-000032",
            "dated": "2025-04-02",
            "court": "Islamabad High Court",
            "judgment": "The court referred to natural justice.",
            "attachments": [],
        }
    )


def test_authentication_required_for_case_api(client, monkeypatch, seed_case):
    monkeypatch.setattr(settings, "AUTH_ENABLED", True)
    monkeypatch.setattr(settings, "API_KEYS", ["secret-key-a"])

    missing = client.get("/api/v1/cases/1629482")
    invalid = client.get("/api/v1/cases/1629482", headers={"X-API-Key": "bad"})
    valid = client.get(
        "/api/v1/cases/1629482",
        headers={"X-API-Key": "secret-key-a"},
    )

    assert missing.status_code == 401
    assert invalid.status_code == 403
    assert valid.status_code == 200


def test_chat_sessions_are_isolated_by_api_key(client, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_ENABLED", True)
    monkeypatch.setattr(settings, "API_KEYS", ["secret-key-a", "secret-key-b"])

    create_response = client.post(
        "/api/v1/chat/sessions",
        json={"sld_number": "1629482"},
        headers={"X-API-Key": "secret-key-a"},
    )
    session_id = create_response.json()["id"]

    owner_get = client.get(
        f"/api/v1/chat/sessions/{session_id}",
        headers={"X-API-Key": "secret-key-a"},
    )
    other_get = client.get(
        f"/api/v1/chat/sessions/{session_id}",
        headers={"X-API-Key": "secret-key-b"},
    )
    other_message = client.post(
        f"/api/v1/chat/sessions/{session_id}/messages",
        json={"message": "What happened?"},
        headers={"X-API-Key": "secret-key-b"},
    )

    assert owner_get.status_code == 200
    assert other_get.status_code == 404
    assert other_message.status_code == 404


def test_cors_uses_configured_origins(client):
    allowed = client.options(
        "/api/v1/chat/sessions",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    blocked = client.options(
        "/api/v1/chat/sessions",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in blocked.headers


def test_chat_rate_limit_is_enforced(client, monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(settings, "CHAT_RATE_LIMIT_REQUESTS", 1)
    monkeypatch.setattr(settings, "CHAT_RATE_LIMIT_WINDOW_SECONDS", 60)

    first = client.post("/api/v1/chat/sessions", json={"sld_number": "1629482"})
    second = client.post("/api/v1/chat/sessions", json={"sld_number": "1629482"})

    assert first.status_code == 201
    assert second.status_code == 429
    assert second.json() == {"detail": "Rate limit exceeded."}


def test_internal_errors_return_safe_response(monkeypatch):
    async def broken_database():
        raise RuntimeError("mongodb+srv://user:password@example/test")
        yield

    app.dependency_overrides[get_database] = broken_database
    with TestClient(app, raise_server_exceptions=False) as test_client:
        response = test_client.get("/health")
    app.dependency_overrides.clear()

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert "mongodb" not in response.text
    assert "password" not in response.text


def test_secret_redaction_helper_removes_credentials():
    redacted = sanitize_for_log(
        "mongodb+srv://user:password@example/test Authorization: Bearer abc123 "
        "api_key=secret"
    )

    assert "password" not in redacted
    assert "Bearer abc123" not in redacted
    assert "secret" not in redacted
    assert "<REDACTED" in redacted


@pytest.mark.asyncio
async def test_groq_http_errors_do_not_log_response_body(monkeypatch, caplog):
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_testsecret")
    monkeypatch.setattr(settings, "LLM_MODEL", "dummy_model")
    provider = GroqProvider()
    mock_response = httpx.Response(
        401,
        text="secret legal document contents and gsk_testsecret",
        request=httpx.Request(
            "POST",
            "https://api.groq.com/openai/v1/chat/completions",
        ),
    )

    caplog.set_level(logging.ERROR)
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(RuntimeError):
            await provider.generate([{"role": "user", "content": "hello"}])

    log_text = "\n".join(record.getMessage() for record in caplog.records)
    assert "secret legal document contents" not in log_text
    assert "gsk_testsecret" not in log_text
    assert "status=401" in log_text
