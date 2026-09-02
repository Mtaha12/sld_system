import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.repository import CaseRepository
from app.services.document_processor import DocumentProcessor
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client.get_database(settings.MONGODB_DB_NAME)
    
    # Let's inspect the judgment as well, in case there are no attachments
    case_repo = CaseRepository(database)
    judgments = await case_repo.get_case_judgments("1629482")
    
    if judgments and "judgment" in judgments[0]:
        print("Found judgment text!")
        judgment_text = judgments[0]["judgment"]
        
        processor = DocumentProcessor()
        metadata = {
            "case_id": "CASE-000032",
            "sld_number": "1629482",
            "document_id": "judgment_1",
            "document_type": "judgment"
        }
        
        chunks = await processor.process_document(
            content=judgment_text,
            mime_type="text/html",
            metadata=metadata
        )
        
        print(f"Total chunks created: {len(chunks)}")
        if chunks:
            print(f"First chunk metadata: {chunks[0]['metadata']}")
            print(f"First chunk text: {chunks[0]['text'][:200]}...")
            print(f"Embedding field present: {'embedding' in chunks[0]}")
    else:
        print("No judgment found.")

if __name__ == "__main__":
    asyncio.run(main())
