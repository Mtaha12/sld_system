import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.repository import ChunkRepository
from app.services.retrieval import RetrievalService
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client.get_database(settings.MONGODB_DB_NAME)
    
    chunk_repo = ChunkRepository(database)
    retrieval_service = RetrievalService(chunk_repo=chunk_repo)
    
    query = "What did the court decide in this case?"
    sld_number = 1629482
    top_k = 5
    
    print("Running text-search retrieval...")
    results = await retrieval_service.retrieve(
        sld_number=sld_number,
        query=query,
        top_k=top_k
    )
    
    if not results:
        print("FAIL: No results returned.")
        return
        
    print(f"Retrieved {len(results)} chunks.")
    
    all_from_case = True
    has_scores = True
    has_embeddings = False
    for idx, r in enumerate(results):
        meta = r.get("metadata", {})
        if meta.get("sld_number") != sld_number:
            all_from_case = False
        if "embedding" in r:
            has_embeddings = True
        
        score = r.get("score")
        if score is None:
            has_scores = False
            
        print(f"\n--- Result {idx+1} ---")
        print(f"Score: {score}")
        print(f"Doc ID: {meta.get('document_id', 'N/A')}")
        print(f"Text Snippet: {r.get('text', '')[:100]}...")
        
    if not all_from_case:
        print("FAIL: Results belong to other cases.")
        return
        
    if not has_scores:
        print("FAIL: Missing similarity scores.")
        return

    if has_embeddings:
        print("FAIL: Embedding fields were returned.")
        return

    print("\nRESULT: PASS")

if __name__ == "__main__":
    asyncio.run(main())
