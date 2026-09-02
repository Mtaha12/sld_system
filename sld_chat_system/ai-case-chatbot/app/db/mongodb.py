import logging
from collections.abc import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ReadPreference

from app.core.config import settings
from app.core.logging import sanitize_for_log

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient | None = None
    
    @classmethod
    async def connect_to_database(cls) -> None:
        logger.info("Connecting to MongoDB...")
        try:
            cls.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=settings.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
                connectTimeoutMS=settings.MONGODB_CONNECT_TIMEOUT_MS,
                maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
                minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
                maxIdleTimeMS=settings.MONGODB_MAX_IDLE_TIME_MS,
            )
            # Verify the connection
            await cls.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB.")
        except Exception as e:
            logger.error("Could not connect to MongoDB: %s", sanitize_for_log(e))
            # We log the error but don't crash the app, allowing it to start.
            # The /health endpoint will reflect the disconnected state.
            
    @classmethod
    async def close_database_connection(cls) -> None:
        if cls.client:
            logger.info("Closing MongoDB connection...")
            cls.client.close()
            logger.info("MongoDB connection closed.")

db = MongoDB()

async def get_database() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """Dependency to get the database instance."""
    if db.client is None:
        raise RuntimeError("Database connection is not initialized.")
    
    # We apply read-only preference for the application layer
    database = db.client.get_database(
        settings.MONGODB_DB_NAME, 
        read_preference=ReadPreference.SECONDARY_PREFERRED
    )
    yield database
