import asyncio
from app.db.mongodb import db
from app.db.repository import ChunkRepository
from app.services.retrieval import RetrievalService

async def main():
    await db.connect_to_database()
    
    chunk_repo = ChunkRepository(db.client.get_database("sld_system"))
    retrieval_service = RetrievalService(chunk_repo)
    
    query = "What is the case about?"
    sld_number = 1629482
    
    results = await retrieval_service.retrieve(sld_number=sld_number, query=query, top_k=5)
    
    print(f"Total results: {len(results)}")
    
    case_ids = []
    sld_numbers = []
    
    for r in results:
        meta = r.get("metadata", {})
        case_ids.append(meta.get("case_id"))
        sld_numbers.append(meta.get("sld_number"))
        
    print(f"Case IDs found: {case_ids}")
    print(f"SLD Numbers found: {sld_numbers}")
    
    all_match = all(s == sld_number for s in sld_numbers)
    print(f"PASS/FAIL: {'PASS' if all_match and len(results) > 0 else 'FAIL'}")
    
    await db.close_database_connection()

if __name__ == '__main__':
    asyncio.run(main())
