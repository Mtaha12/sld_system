import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.logging import sanitize_for_log
from app.core.security import APIIdentity, require_api_identity
from app.db.mongodb import get_database
from app.db.repository import ChunkRepository, SessionRepository
from app.schemas.chat import (
    ChatResponse,
    ChatSession,
    CreateSessionRequest,
    SendMessageRequest,
)
from app.services.conversation import ConversationService
from app.services.rag import RAGEngine
from app.services.retrieval import RetrievalService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_conversation_service(
    db: Annotated[Any, Depends(get_database)],
) -> ConversationService:
    session_repo = SessionRepository(db)
    chunk_repo = ChunkRepository(db)
    retrieval_service = RetrievalService(chunk_repo=chunk_repo)
    rag_engine = RAGEngine(retrieval_service=retrieval_service)
    return ConversationService(session_repo=session_repo, rag_engine=rag_engine)


@router.post(
    "/sessions",
    response_model=ChatSession,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    request: CreateSessionRequest,
    identity: Annotated[APIIdentity, Depends(require_api_identity)],
    conv_service: Annotated[ConversationService, Depends(get_conversation_service)],
) -> Any:
    """Create a new chat session bound to a specific case."""
    try:
        session_id = await conv_service.create_session(
            request.sld_number,
            owner_id=identity.user_id,
        )
        session = await conv_service.get_session(session_id, owner_id=identity.user_id)
        return session
    except Exception as e:
        logger.error("Failed to create chat session: %s", sanitize_for_log(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/sessions")
async def get_all_sessions(
    identity: Annotated[APIIdentity, Depends(require_api_identity)],
    conversation_service: Annotated[ConversationService, Depends(get_conversation_service)]
):
    try:
        sessions = await conversation_service.session_repo.get_user_sessions(identity.user_id)
        return sessions
    except Exception as e:
        logger.error(f"Error fetching sessions for user {sanitize_for_log(identity.user_id)}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/sessions/{session_id}", response_model=ChatSession)
async def get_session(
    session_id: str,
    identity: Annotated[APIIdentity, Depends(require_api_identity)],
    conv_service: Annotated[ConversationService, Depends(get_conversation_service)],
) -> Any:
    """Get the history of a specific chat session."""
    try:
        session = await conv_service.get_session(session_id, owner_id=identity.user_id)
        return session
    except ValueError as e:
        raise HTTPException(status_code=404, detail="Session not found") from e
    except Exception as e:
        logger.error("Failed to get chat session: %s", sanitize_for_log(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    identity: Annotated[APIIdentity, Depends(require_api_identity)],
    conv_service: Annotated[ConversationService, Depends(get_conversation_service)],
) -> Any:
    """Send a message to a session and get a response."""
    try:
        result = await conv_service.process_message(
            session_id,
            request.message,
            owner_id=identity.user_id,
        )
        return ChatResponse(
            session_id=result["session_id"],
            answer=result["answer"],
            sources=result["sources"],
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail="Session not found") from e
    except Exception as e:
        logger.error("Failed to process chat message: %s", sanitize_for_log(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e
