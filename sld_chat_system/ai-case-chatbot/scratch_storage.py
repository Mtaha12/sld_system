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
    
    print("--- FIRST INDEXING ---")
    await chunk_repo.delete_chunks_by_document("judgment_1")
    await chunk_repo.save_chunks(chunks)
    
    # Verify the chunk was stored
    stored_chunks = await chunk_repo.get_chunks_by_case("CASE-000032")
    print(f"Chunks stored: {len(stored_chunks)}")
    
    if stored_chunks:
        first = stored_chunks[0]
        print(f"Stored sld_number: {first['metadata']['sld_number']}")
        print(f"Stored case_id: {first['metadata']['case_id']}")
        print(f"Embedding field present: {'embedding' in first}")
        
    print("\n--- RE-INDEXING (Simulating Document Update) ---")
    # Delete and save again to prevent duplicates
    await chunk_repo.delete_chunks_by_document("judgment_1")
    await chunk_repo.save_chunks(chunks)
    
    reindexed_chunks = await chunk_repo.get_chunks_by_case("CASE-000032")
    print(f"Chunks stored after re-indexing: {len(reindexed_chunks)}")
    
    # Cleanup to be safe
    await chunk_repo.delete_chunks_by_document("judgment_1")

if __name__ == "__main__":
    asyncio.run(main())
