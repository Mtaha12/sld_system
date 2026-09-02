# AI Legal Case Chatbot

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
3. Activate the environment: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux/Mac)
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env`
6. Run the server: `uvicorn app.main:app --reload`

## Docker
Run `docker-compose up --build` to start the API and MongoDB containers.
