import os

base_dir = r"d:\sld_chat_system\ai-case-chatbot"

directories = [
    "app",
    "app/api",
    "app/core",
    "app/db",
    "app/models",
    "app/schemas",
    "app/services",
    "app/utils",
    "tests",
    "scripts",
]

files = {
    "requirements.txt": """fastapi>=0.110.0
uvicorn>=0.29.0
pydantic-settings>=2.2.1
motor>=3.4.0

# Dev dependencies
pytest>=8.1.1
pytest-asyncio>=0.23.6
ruff>=0.3.5
mypy>=1.9.0
httpx>=0.27.0
""",
    "pyproject.toml": """[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
ignore = []

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
""",
    "app/core/config.py": """from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Legal Case Chatbot API"
    API_V1_STR: str = "/api/v1"
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "ai_legal_chatbot"
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
""",
    "app/db/mongodb.py": """from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from typing import Optional

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    
    @classmethod
    def connect_to_database(cls) -> None:
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
        
    @classmethod
    def close_database_connection(cls) -> None:
        if cls.client:
            cls.client.close()

db = MongoDB()
""",
    "app/main.py": """from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db.mongodb import db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.connect_to_database()
    yield
    # Shutdown
    db.close_database_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
""",
    ".env.example": """PROJECT_NAME="AI Legal Case Chatbot API"
API_V1_STR="/api/v1"
MONGODB_URL="mongodb://localhost:27017"
MONGODB_DB_NAME="ai_legal_chatbot"
""",
    ".env": """PROJECT_NAME="AI Legal Case Chatbot API"
API_V1_STR="/api/v1"
MONGODB_URL="mongodb://localhost:27017"
MONGODB_DB_NAME="ai_legal_chatbot"
""",
    "Dockerfile": """FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
""",
    "docker-compose.yml": """version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - MONGODB_URL=mongodb://mongodb:27017
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
""",
    ".gitignore": """__pycache__/
*.py[cod]
*$py.class
.env
.venv
env/
venv/
ENV/
.pytest_cache/
.mypy_cache/
.ruff_cache/
""",
    "README.md": """# AI Legal Case Chatbot

This is the initial project setup for an AI Legal Case Chatbot API.

## Stack
- Python 3.12+
- FastAPI + Uvicorn
- Pydantic Settings
- MongoDB (Motor)
- Pytest, Ruff, Mypy
- Docker

## Setup
1. Clone the repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the environment: `venv\\Scripts\\activate` (Windows) or `source venv/bin/activate` (Linux/Mac)
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env`
6. Run the server: `uvicorn app.main:app --reload`

## Docker
Run `docker-compose up --build` to start the API and MongoDB containers.
""",
    "tests/test_main.py": """from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
""",
}

init_files = [
    "app/__init__.py",
    "app/api/__init__.py",
    "app/core/__init__.py",
    "app/db/__init__.py",
    "app/models/__init__.py",
    "app/schemas/__init__.py",
    "app/services/__init__.py",
    "app/utils/__init__.py",
    "tests/__init__.py",
]

for d in directories:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

for f, content in files.items():
    with open(os.path.join(base_dir, f), "w", encoding="utf-8") as out:
        out.write(content)

for init_f in init_files:
    with open(os.path.join(base_dir, init_f), "w", encoding="utf-8") as out:
        out.write("")

print("Project files generated successfully!")
