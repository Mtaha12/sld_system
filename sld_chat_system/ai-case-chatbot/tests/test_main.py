import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app.db.mongodb import get_database
from app.main import app

@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()
    return client.get_database("test_db")

@pytest.fixture
def client(mock_db):
    async def override_get_database():
        yield mock_db

    app.dependency_overrides[get_database] = override_get_database
    with TestClient(app, headers={"X-API-Key": "testkey123"}) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}
