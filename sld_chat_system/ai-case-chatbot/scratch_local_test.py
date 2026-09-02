import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.repository import CaseRepository
from app.services.document_processor import DocumentProcessor
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client.get_database(settings.MONGODB_DB_NAME)
    case_repo = CaseRepository(database)
    
    judgments = await case_repo.get_case_judgments("1629482")
    if not judgments or "judgment" not in judgments[0]:
        print("No judgment found.")
        return
        
    judgment_text = judgments[0]["judgment"]
    
    try:
        chunks = await DocumentProcessor().process_document(
            content=judgment_text[:1000],
            mime_type="text/html",
            metadata={
                "case_id": "CASE-000032",
                "sld_number": 1629482,
                "document_id": "judgment_1",
                "document_type": "judgment",
            },
        )
        
        print("\n--- Test Results ---")
        print("Status: SUCCESS")
        print(f"Chunks generated: {len(chunks)}")
        print(f"Embedding field present: {bool(chunks and 'embedding' in chunks[0])}")
        
    except Exception as e:
        print(f"Error during execution: {e}")

if __name__ == "__main__":
    asyncio.run(main())
