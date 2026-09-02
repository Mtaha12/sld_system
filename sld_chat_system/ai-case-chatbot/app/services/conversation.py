import logging
import uuid
from typing import Dict, Any, List, Optional
from app.db.repository import SessionRepository
from app.services.rag import RAGEngine
from app.services.llm import BaseLLMProvider, get_llm_provider

logger = logging.getLogger(__name__)

REWRITE_PROMPT = """You are an AI assistant helping a user query a legal case database.
Given the following conversation history and a new user question, your task is to:
1. If the question is clear and standalone, output it exactly as is.
2. If the question refers to something in the history (e.g. "what did he do?", "why was that order given?"), rewrite it into a clear, standalone query replacing pronouns with names/entities from the history.
3. If the question is entirely ambiguous and cannot be understood even with the history, output exactly "CLARIFY: " followed by your question asking for clarification.

Conversation History:
{history_text}

New Question: {question}

Output ONLY the rewritten query or the CLARIFY statement. Do not explain yourself.
"""

class ConversationService:
    def __init__(self, session_repo: SessionRepository, rag_engine: RAGEngine, llm_provider: Optional[BaseLLMProvider] = None):
        self.session_repo = session_repo
        self.rag_engine = rag_engine
        self.llm_provider = llm_provider or get_llm_provider()
        self.max_history_messages = 10  # Keep last 10 messages for context (5 turns)

    async def create_session(self, sld_number: str, owner_id: str | None = None) -> str:
        session_id = str(uuid.uuid4())
        await self.session_repo.create_session(session_id, str(sld_number), owner_id)
        return session_id
        
    async def get_session(
        self,
        session_id: str,
        owner_id: str | None = None,
    ) -> Dict[str, Any]:
        session = await self.session_repo.get_session(session_id, owner_id)
        if not session:
            raise ValueError(f"Session {session_id} not found.")
        return session

    async def _rewrite_or_clarify(self, question: str, history: List[Dict[str, str]]) -> str:
        if not history:
            return question
            
        history_text = ""
        for msg in history:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"
            
        system_content = REWRITE_PROMPT.format(history_text=history_text.strip(), question=question)
        messages = [{"role": "user", "content": system_content}]
        
        try:
            rewritten = await self.llm_provider.generate(messages, temperature=0.0, max_tokens=150)
            return rewritten.strip()
        except Exception as e:
            logger.warning(f"Failed to rewrite query: {e}. Falling back to original question.")
            return question

    async def process_message(
        self,
        session_id: str,
        message: str,
        owner_id: str | None = None,
    ) -> Dict[str, Any]:
        session = await self.get_session(session_id, owner_id)
        sld_number = session["sld_number"]
        
        # Extract history, limiting to last N messages to manage token limits
        all_messages = session.get("messages", [])
        recent_history = all_messages[-self.max_history_messages:] if len(all_messages) > self.max_history_messages else all_messages
        
        formatted_history = [
            {"role": msg["role"], "content": msg["content"]} 
            for msg in recent_history
        ]
        
        # Check for ambiguity and rewrite query
        standalone_query = await self._rewrite_or_clarify(message, formatted_history)
        
        if standalone_query.startswith("CLARIFY:"):
            clarification = standalone_query.replace("CLARIFY:", "").strip()
            # Save the exchange to history
            await self.session_repo.add_message(session_id, "user", message)
            await self.session_repo.add_message(session_id, "assistant", clarification)
            return {
                "answer": clarification,
                "sources": [],
                "session_id": session_id
            }
            
        # Execute RAG pipeline
        rag_response = await self.rag_engine.ask_question(
            sld_number=sld_number,
            question=standalone_query,
            history=formatted_history
        )
        
        answer = rag_response["answer"]
        sources = rag_response["sources"]
        
        # Save messages
        await self.session_repo.add_message(session_id, "user", message)
        await self.session_repo.add_message(session_id, "assistant", answer)
        
        return {
            "answer": answer,
            "sources": sources,
            "session_id": session_id
        }
