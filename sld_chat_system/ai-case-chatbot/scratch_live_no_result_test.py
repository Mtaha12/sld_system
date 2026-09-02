import asyncio
from app.db.mongodb import db
from app.db.repository import ChunkRepository
from app.services.retrieval import RetrievalService

async def main():
    await db.connect_to_database()
    
    chunk_repo = ChunkRepository(db.client.get_database("sld_system"))
    retrieval_service = RetrievalService(chunk_repo)
    
    query = "tax dispute"
    sld_number = 999999999
    
    try:
        results = await retrieval_service.retrieve(sld_number=sld_number, query=query, top_k=5)
        print(f"Total results: {len(results)}")
        print(f"Results: {results}")
        if results:
            print("FAIL: Expected no results for a nonexistent case.")
        else:
            print("PASS: Handled no-result gracefully without exceptions.")
    except Exception as e:
        print(f"FAIL: Exception occurred: {e}")
        
    await db.close_database_connection()

if __name__ == '__main__':
    asyncio.run(main())
