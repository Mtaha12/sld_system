import asyncio
import json
from app.db.mongodb import db
from app.db.repository import ChunkRepository
from app.services.retrieval import RetrievalService

async def main():
    await db.connect_to_database()
    
    chunk_repo = ChunkRepository(db.client.get_database("sld_system"))
    retrieval_service = RetrievalService(chunk_repo)
    
    query = "What did the court decide in this case?"
    sld_number = 1629482
    
    results = await retrieval_service.retrieve(sld_number=sld_number, query=query, top_k=1)
    
    print(f"Got {len(results)} chunks")
    for i, r in enumerate(results):
        print(f"\n--- Chunk {i+1} ---")
        print(f"Score: {r.get('score')}")
        print(f"Metadata: {json.dumps(r.get('metadata', {}), indent=2)}")
        text_preview = r.get('text', '')[:150].replace('\n', ' ')
        print(f"Text Preview: {text_preview}...")
        
    await db.close_database_connection()

if __name__ == '__main__':
    asyncio.run(main())
