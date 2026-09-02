import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app.main import app
from app.db.mongodb import get_database

@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()
    db = client.get_database("sld_system")
    return db

@pytest.fixture
def client(mock_db):
    async def override_get_database():
        yield mock_db
        
    app.dependency_overrides[get_database] = override_get_database
    with TestClient(app, headers={"X-API-Key": "testkey123"}) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
async def seed_data(mock_db):
    cases = [
        {
            "sldNumber": 1629482,
            "isDeleted": False,
            "caseId": "CASE-000032",
            "dated": "2023-01-15",
            "court": "Supreme Court",
            "judgment": "Test judgment content",
            "attachments": [
                {"document_id": "DOC-1", "title": "Attachment 1"},
                {"document_id": "DOC-2", "title": "Attachment 2"}
            ]
        },
        {
            "sldNumber": "9999999",
            "isDeleted": True,
            "caseId": "DELETED-CASE",
            "dated": "2023-01-15",
            "court": "Supreme Court",
        }
    ]

    await mock_db.cases.insert_many(cases)

@pytest.mark.asyncio
async def test_get_case_valid(client, seed_data):
    response = client.get("/api/v1/cases/1629482")
    assert response.status_code == 200
    data = response.json()
    assert data["sldNumber"] == 1629482
    assert data["court"] == "Supreme Court"
    assert data["isDeleted"] is False

@pytest.mark.asyncio
async def test_get_case_deleted(client, seed_data):
    response = client.get("/api/v1/cases/9999999")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_case_not_found(client, seed_data):
    response = client.get("/api/v1/cases/0000000")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_case_metadata(client, seed_data):
    response = client.get("/api/v1/cases/1629482/metadata")
    assert response.status_code == 200
    data = response.json()
    assert data["court"] == "Supreme Court"

@pytest.mark.asyncio
async def test_get_case_judgments(client, seed_data):
    response = client.get("/api/v1/cases/1629482/judgments")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["judgment"] == "Test judgment content"

@pytest.mark.asyncio
async def test_get_case_documents(client, seed_data):
    response = client.get("/api/v1/cases/1629482/documents")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["document_id"] == "DOC-1"
