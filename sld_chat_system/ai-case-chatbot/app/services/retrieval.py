import logging
from typing import List, Dict, Any

from app.db.repository import ChunkRepository

logger = logging.getLogger(__name__)

class RetrievalService:
    """
    Independent retrieval service that fetches relevant case document chunks
    using full-text keyword search. Kept separate from LLM/Chat layers.
    """
    
    def __init__(self, chunk_repo: ChunkRepository):
        self.chunk_repo = chunk_repo
        
    async def retrieve(self, sld_number: str | int, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves the most relevant chunks for a specific case using text search.
        Always filters by the requested case to ensure strict isolation.
        """
        if not query.strip():
            logger.warning("Empty query provided to retrieval service.")
            return []
            
        try:
            # Execute the Atlas Search natively filtered by sld_number
            results = await self.chunk_repo.text_search(
                query=query,
                sld_number=sld_number,
                limit=top_k
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to perform text retrieval for case {sld_number}: {e}")
            return []
