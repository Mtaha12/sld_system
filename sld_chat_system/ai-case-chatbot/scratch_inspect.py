import asyncio
import sys
from app.db.mongodb import db, get_database
from app.db.repository import DocumentRepository
from app.services.document_processor import DocumentProcessor
from app.core.config import settings

async def main():
    db.client = await anext(get_database())
    database = db.client.get_database(settings.MONGODB_DB_NAME)
    
    repo = DocumentRepository(database)
    docs = await repo.get_documents_by_case_number("1629482")
    
    if not docs:
        print("No documents found for case 1629482.")
        return
        
    print(f"Found {len(docs)} documents.")
    
    # Pick the first document
    doc = docs[0]
    print(f"Document keys: {doc.keys()}")
    
    # We need to determine how to get the content
    # For now, let's just assume we have some text/html field, or simulate it if it's a URL we can't download
    # Let's inspect the document first
    for key, val in doc.items():
        val_str = str(val)
        print(f"{key}: {val_str[:100]}...")

if __name__ == "__main__":
    asyncio.run(main())
