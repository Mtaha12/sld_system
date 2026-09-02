import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.repository import ChunkRepository
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client.get_database(settings.MONGODB_DB_NAME)
    chunk_repo = ChunkRepository(database)
    
    await chunk_repo.setup_indexes()
    print("Ensured text-search indexes exist.")

if __name__ == "__main__":
    asyncio.run(main())
