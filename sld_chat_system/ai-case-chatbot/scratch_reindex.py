import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.repository import CaseRepository, ChunkRepository
from app.services.document_processor import DocumentProcessor
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client.get_database(settings.MONGODB_DB_NAME)
    
    case_repo = CaseRepository(database)
    chunk_repo = ChunkRepository(database)
    
    judgments = await case_repo.get_case_judgments("1629482")
    if not judgments or "judgment" not in judgments[0]:
        print("No judgment found.")
        return
        
    judgment_text = judgments[0]["judgment"]
    processor = DocumentProcessor()
    
    metadata = {
        "case_id": "CASE-000032",
        "sld_number": 1629482,
        "document_id": "judgment_1",
        "document_type": "judgment"
    }
    
    chunks = await processor.process_document(
        content=judgment_text,
        mime_type="text/html",
        metadata=metadata
    )
    
    print(f"Generated {len(chunks)} text-search chunks.")
    
    # Delete and save again to prevent duplicates
    await chunk_repo.delete_chunks_by_document("judgment_1")
    await chunk_repo.save_chunks(chunks)
    
    reindexed_chunks = await chunk_repo.get_chunks_by_case("CASE-000032")
    print(f"Chunks stored successfully: {len(reindexed_chunks)}")
    if reindexed_chunks:
        print(f"Embedding field present: {'embedding' in reindexed_chunks[0]}")
    
if __name__ == "__main__":
    asyncio.run(main())
