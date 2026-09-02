import asyncio
from app.db.mongodb import db
from app.db.repository import SessionRepository, ChunkRepository
from app.services.retrieval import RetrievalService
from app.services.rag import RAGEngine
from app.services.conversation import ConversationService
from app.core.config import settings

async def main():
    await db.connect_to_database()
    database = db.client.get_database(settings.MONGODB_DB_NAME)
    
    session_repo = SessionRepository(database)
    chunk_repo = ChunkRepository(database)
    retrieval_service = RetrievalService(chunk_repo=chunk_repo)
    rag_engine = RAGEngine(retrieval_service=retrieval_service)
    conv_service = ConversationService(session_repo=session_repo, rag_engine=rag_engine)
    
    sld_number = "1629482"
    
    try:
        print("Creating session...")
        session_id = await conv_service.create_session(sld_number)
        print(f"Session ID created: {session_id}")
        
        print("Fetching session from DB...")
        session = await conv_service.get_session(session_id)
        
        print("\n--- Session Data ---")
        print(f"ID: {session.get('_id')}")
        print(f"SLD Number: {session.get('sld_number')}")
        print(f"Messages count: len({session.get('messages', [])})")
        print("--------------------\n")
        
        if session.get("_id") == session_id and session.get("sld_number") == sld_number and len(session.get("messages", [])) == 0:
            print("RESULT: PASS")
        else:
            print("RESULT: FAIL")
            
    except Exception as e:
        print(f"Error: {e}")
        print("RESULT: FAIL")
    finally:
        await db.close_database_connection()

if __name__ == '__main__':
    asyncio.run(main())
