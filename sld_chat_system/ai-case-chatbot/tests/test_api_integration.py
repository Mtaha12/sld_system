import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app.core.config import settings
from app.db.mongodb import get_database
from app.main import app


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
    with TestClient(app, headers={"X-API-Key": "testkey123"}) as test_client:
        yield test_client
    app.dependency_overrides.clear()


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
            "attachments": [{"document_id": "DOC-1", "title": "Judgment"}],
        }
    )


def test_case_api_uses_single_cases_prefix(client, seed_case):
    valid_response = client.get("/api/v1/cases/1629482")
    stale_response = client.get("/api/v1/cases/cases/1629482")

    assert valid_response.status_code == 200
    assert valid_response.json()["sldNumber"] == 1629482
    assert stale_response.status_code == 404


def test_chat_session_api_serializes_id_and_persists_messages(client):
    create_response = client.post(
        "/api/v1/chat/sessions",
        json={"sld_number": "1629482"},
    )

    assert create_response.status_code == 201
    session = create_response.json()
    assert session["id"]
    assert "_id" not in session
    assert session["sld_number"] == "1629482"
    assert session["messages"] == []

    message_response = client.post(
        f"/api/v1/chat/sessions/{session['id']}/messages",
        json={"message": "What did the court say?"},
    )

    assert message_response.status_code == 200
    assert message_response.json()["session_id"] == session["id"]

    get_response = client.get(f"/api/v1/chat/sessions/{session['id']}")

    assert get_response.status_code == 200
    updated_session = get_response.json()
    assert updated_session["id"] == session["id"]
    assert [message["role"] for message in updated_session["messages"]] == [
        "user",
        "assistant",
    ]
