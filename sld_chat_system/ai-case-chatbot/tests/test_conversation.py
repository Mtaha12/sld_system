import pytest
import uuid
from unittest.mock import patch, AsyncMock
from app.services.conversation import ConversationService
from app.services.rag import RAGEngine
from app.services.retrieval import RetrievalService
from app.db.repository import SessionRepository, ChunkRepository
from app.schemas.chat import CreateSessionRequest, SendMessageRequest
from app.api.chat import create_session, send_message, get_session

import mongomock_motor

@pytest.fixture
def db():
    return mongomock_motor.AsyncMongoMockClient().sld_system

@pytest.fixture
def session_repo(db):
    return SessionRepository(db)

@pytest.fixture
def chunk_repo(db):
    return ChunkRepository(db)

@pytest.fixture
def retrieval_service(chunk_repo):
    # Mock retrieval to always return empty or some dummy chunks if needed
    service = RetrievalService(chunk_repo=chunk_repo)
    service.retrieve = AsyncMock(return_value=[])
    return service

@pytest.fixture
def rag_engine(retrieval_service):
    engine = RAGEngine(retrieval_service=retrieval_service)
    # Mock generate to return a standard answer
    engine.generate_answer = AsyncMock(return_value="Answer based on evidence.")
    # Actually wait, ask_question is what is called by ConversationService
    engine.ask_question = AsyncMock(return_value={"answer": "Evidence based answer", "sources": []})
    return engine

@pytest.fixture
def mock_llm():
    provider = AsyncMock()
    # By default, pretend rewriting doesn't change anything
    provider.generate.return_value = "Rewritten question"
    return provider

@pytest.fixture
def conv_service(session_repo, rag_engine, mock_llm):
    return ConversationService(
        session_repo=session_repo, 
        rag_engine=rag_engine, 
        llm_provider=mock_llm
    )

@pytest.mark.asyncio
async def test_new_session_with_case(conv_service, session_repo):
    """Test creating a new session correctly binds it to the requested case."""
    sld_number = "1629482"
    session_id = await conv_service.create_session(sld_number)
    
    # Verify in DB
    session = await session_repo.get_session(session_id)
    assert session is not None
    assert session["sld_number"] == sld_number
    assert session["messages"] == []

@pytest.mark.asyncio
async def test_follow_up_question_and_persistence(conv_service, session_repo, mock_llm, rag_engine):
    """Test sending a message persists history and passes it to the LLM rewrite properly."""
    session_id = await conv_service.create_session("1629482")
    
    # 1. First question
    mock_llm.generate.return_value = "What is the background?"
    res1 = await conv_service.process_message(session_id, "What is the background?")
    
    assert res1["answer"] == "Evidence based answer"
    
    # Verify history
    session = await session_repo.get_session(session_id)
    assert len(session["messages"]) == 2
    assert session["messages"][0]["role"] == "user"
    assert session["messages"][0]["content"] == "What is the background?"
    assert session["messages"][1]["role"] == "assistant"
    
    # 2. Second question (follow up)
    mock_llm.generate.return_value = "Who was the petitioner?"
    res2 = await conv_service.process_message(session_id, "Who was he?")
    
    # Verify the history passed to LLM for rewrite contained the first question
    # mock_llm.generate was called ONCE since the first query had no history and skipped the LLM
    calls = mock_llm.generate.call_args_list
    rewrite_prompt = calls[0][0][0][0]["content"]
    assert "What is the background?" in rewrite_prompt
    assert "Evidence based answer" in rewrite_prompt
    assert "Who was he?" in rewrite_prompt
    
    # Verify rag_engine got the rewritten query and full history
    rag_calls = rag_engine.ask_question.call_args_list
    assert rag_calls[1].kwargs["question"] == "Who was the petitioner?"
    assert len(rag_calls[1].kwargs["history"]) == 2

@pytest.mark.asyncio
async def test_ambiguous_question_clarification(conv_service, session_repo, mock_llm, rag_engine):
    """Test when LLM detects ambiguous query, it short circuits to CLARIFY."""
    session_id = await conv_service.create_session("1629482")
    
    # Add dummy history so the rewrite LLM is actually called
    await session_repo.add_message(session_id, "user", "Hello")
    await session_repo.add_message(session_id, "assistant", "Hi, how can I help?")
    
    # Make LLM return CLARIFY
    mock_llm.generate.return_value = "CLARIFY: Could you specify which order you are referring to?"
    
    res = await conv_service.process_message(session_id, "What does it mean?")
    
    assert res["answer"] == "Could you specify which order you are referring to?"
    
    # Ensure RAG was NOT called (it was called 0 times for this message)
    rag_engine.ask_question.assert_not_called()

@pytest.mark.asyncio
async def test_context_token_management(conv_service, session_repo, mock_llm, rag_engine):
    """Test that only max_history_messages are kept for rewriting and retrieval."""
    session_id = await conv_service.create_session("1629482")
    conv_service.max_history_messages = 2  # Override for testing
    
    # Insert 4 messages manually (2 turns)
    await session_repo.add_message(session_id, "user", "turn 1")
    await session_repo.add_message(session_id, "assistant", "resp 1")
    await session_repo.add_message(session_id, "user", "turn 2")
    await session_repo.add_message(session_id, "assistant", "resp 2")
    
    # Process 3rd turn
    mock_llm.generate.return_value = "turn 3"
    await conv_service.process_message(session_id, "turn 3")
    
    # Check what got passed to rewrite LLM
    calls = mock_llm.generate.call_args_list
    rewrite_prompt = calls[0][0][0][0]["content"]
    
    # It should only include turn 2 and resp 2 (last 2 messages)
    assert "turn 2" in rewrite_prompt
    assert "resp 2" in rewrite_prompt
    assert "turn 1" not in rewrite_prompt
    
@pytest.mark.asyncio
async def test_cross_case_isolation(conv_service):
    """Test that operations on a session strictly use the bound sld_number."""
    session_id = await conv_service.create_session("999999")
    
    # If the user tries to ask about a different case, the system STILL queries 999999
    # We verify this by checking what sld_number was passed to RAG engine
    await conv_service.process_message(session_id, "What happened in case 123456?")
    
    rag_calls = conv_service.rag_engine.ask_question.call_args_list
    assert rag_calls[0].kwargs["sld_number"] == "999999"  # Context firmly rooted
