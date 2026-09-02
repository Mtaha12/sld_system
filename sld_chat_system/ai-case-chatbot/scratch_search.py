import asyncio
import time
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.repository import CaseRepository, ChunkRepository
from app.services.document_processor import DocumentProcessor
from app.services.retrieval import RetrievalService
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client.get_database(settings.MONGODB_DB_NAME)
    
    case_repo = CaseRepository(database)
    chunk_repo = ChunkRepository(database)
    
    # 1. Ensure the document is in the db
    judgments = await case_repo.get_case_judgments("1629482")
    if judgments and "judgment" in judgments[0]:
        processor = DocumentProcessor()
        metadata = {
            "case_id": "CASE-000032",
            "sld_number": 1629482,
            "document_id": "judgment_1",
            "document_type": "judgment"
        }
        chunks = await processor.process_document(
            content=judgments[0]["judgment"],
            mime_type="text/html",
            metadata=metadata
        )
        await chunk_repo.delete_chunks_by_document("judgment_1")
        await chunk_repo.save_chunks(chunks)
        print("Chunks saved. Waiting 5 seconds for Atlas Search to index...")
        time.sleep(5)
        
    # 2. Run the RetrievalService
    retrieval_service = RetrievalService(chunk_repo=chunk_repo)
    
    query = "What did the court decide in this case?"
    print(f"Running query: '{query}' for case 1629482")
    
    results = await retrieval_service.retrieve(sld_number=1629482, query=query, top_k=5)
    
    print(f"Results returned: {len(results)}")
    for i, res in enumerate(results):
        print(f"\n--- Result {i+1} ---")
        print(f"Score: {res.get('score')}")
        print(f"Metadata: {res.get('metadata')}")
        print(f"Text Snippet: {res.get('text')[:200]}...")
        
if __name__ == "__main__":
    asyncio.run(main())
