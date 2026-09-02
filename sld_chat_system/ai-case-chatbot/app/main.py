import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.cases import router as cases_router
from app.api.chat import router as chat_router
from app.core.config import settings
from app.core.logging import configure_logging, sanitize_for_log
from app.core.rate_limit import RateLimitMiddleware
from app.core.security import require_api_identity
from app.db.mongodb import db, get_database
from app.db.repository import (
    CaseRepository,
    ChunkRepository,
    DocumentRepository,
    SessionRepository,
)

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect_to_database()
    
    # Setup indexes
    if db.client:
        try:
            database = db.client.get_database(settings.MONGODB_DB_NAME)
            await CaseRepository(database).setup_indexes()
            await DocumentRepository(database).setup_indexes()
            await ChunkRepository(database).setup_indexes()
            await SessionRepository(database).setup_indexes()
        except Exception as e:
            logger.error("Error setting up database indexes: %s", sanitize_for_log(e))
            
    yield
    # Shutdown
    await db.close_database_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    debug=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(
    cases_router,
    prefix=f"{settings.API_V1_STR}/cases",
    tags=["cases"],
    dependencies=[Depends(require_api_identity)],
)
app.include_router(chat_router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled API error path=%s error=%s",
        request.url.path,
        sanitize_for_log(exc),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check(
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> dict[str, str]:
    try:
        # Ping the database to verify connectivity
        await database.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.warning("Health check failed: %s", sanitize_for_log(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed.",
        ) from e


@app.get("/ready")
async def readiness_check(
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> dict[str, str]:
    try:
        await database.command("ping")
        await database["document_chunks"].find_one({}, {"_id": 1})
        return {"status": "ready"}
    except Exception as e:
        logger.warning("Readiness check failed: %s", sanitize_for_log(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service is not ready.",
        ) from e
