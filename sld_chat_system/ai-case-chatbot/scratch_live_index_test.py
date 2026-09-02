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
        print("FAIL: No judgment found.")
        return
        
    judgment_text = judgments[0]["judgment"]
    processor = DocumentProcessor()
    
    metadata = {
        "case_id": "CASE-1629482-TEST",
        "sld_number": 1629482,
        "document_id": "live_test_doc_1",
        "document_type": "judgment"
    }
    
    # 1. Process Document (Creates Text-Search Chunks)
    chunks = await processor.process_document(
        content=judgment_text,
        mime_type="text/html",
        metadata=metadata
    )
    
    # 2. Store in MongoDB
    await chunk_repo.delete_chunks_by_document("live_test_doc_1")
    await chunk_repo.save_chunks(chunks)
    
    # 3. Retrieve from MongoDB and Verify
    stored_chunks = await chunk_repo.get_chunks_by_case("CASE-1629482-TEST")
    
    if not stored_chunks:
        print("FAIL: Chunks not retrieved.")
        return
        
    print(f"Chunks Stored: {len(stored_chunks)}")
    print(f"Embedding field present: {'embedding' in stored_chunks[0]}")
    
    if "embedding" not in stored_chunks[0]:
        print("RESULT: PASS")
    else:
        print("RESULT: FAIL")
        
    # Clean up
    await chunk_repo.delete_chunks_by_document("live_test_doc_1")

if __name__ == "__main__":
    asyncio.run(main())
