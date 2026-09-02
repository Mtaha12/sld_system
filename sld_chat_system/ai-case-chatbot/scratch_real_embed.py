import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.repository import CaseRepository
from app.services.document_processor import DocumentProcessor
from app.core.config import settings

async def main():
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        database = client.get_database(settings.MONGODB_DB_NAME)
        
        case_repo = CaseRepository(database)
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
            content=judgment_text[:1000],  # just testing a small chunk to save time/tokens
            mime_type="text/html",
            metadata=metadata
        )
        
        if chunks:
            chunk = chunks[0]
            print("Text-search chunk generated: True")
            print(f"Embedding field present: {'embedding' in chunk}")
            print(f"Text preview: {chunk.get('text', '')[:100]}...")
        else:
            print("No chunks generated.")
            
    except Exception as e:
        print(f"Error during execution: {e}")

if __name__ == "__main__":
    asyncio.run(main())
