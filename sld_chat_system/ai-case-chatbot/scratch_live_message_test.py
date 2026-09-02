import asyncio
from app.db.mongodb import db
from app.db.repository import SessionRepository, ChunkRepository
from app.services.retrieval import RetrievalService
from app.services.rag import RAGEngine
from app.services.conversation import ConversationService
from app.core.config import settings
import sys

async def main():
    # Force UTF-8 for printing on Windows
    sys.stdout.reconfigure(encoding='utf-8')

    await db.connect_to_database()
    database = db.client.get_database(settings.MONGODB_DB_NAME)
    
    session_repo = SessionRepository(database)
    chunk_repo = ChunkRepository(database)
    retrieval_service = RetrievalService(chunk_repo=chunk_repo)
    rag_engine = RAGEngine(retrieval_service=retrieval_service)
    conv_service = ConversationService(session_repo=session_repo, rag_engine=rag_engine)
    
    session_id = "acd07357-172f-4b36-83e9-e5605e136cac"
    message = "What constitutional principle did the court refer to?"
    
    try:
        print(f"Sending message to session: {session_id}")
        print(f"Message: {message}\n")
        
        response = await conv_service.process_message(session_id, message)
        
        print("\n--- AI Response ---")
        print(response.get("answer"))
        print("\n--- Sources Used ---")
        for src in response.get("sources", []):
            print(f"- Doc: {src.get('document_id')}, Page: {src.get('page_number')}")
            
        print("\n--- Verifying MongoDB State ---")
        session = await conv_service.get_session(session_id)
        messages = session.get("messages", [])
        
        print(f"Total messages saved: {len(messages)}")
        for i, msg in enumerate(messages[-2:]):
            print(f"[Latest {i}] {msg['role']}: {msg['content'][:50]}...")
            
        print("\nRESULT: PASS")
            
    except Exception as e:
        print(f"Error: {e}")
        print("\nRESULT: FAIL")
    finally:
        await db.close_database_connection()

if __name__ == '__main__':
    asyncio.run(main())
