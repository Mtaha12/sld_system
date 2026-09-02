import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import httpx

from app.core.config import settings
from app.core.logging import sanitize_for_log

logger = logging.getLogger(__name__)

class BaseLLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    """
    @abstractmethod
    async def generate(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1000) -> str:
        """
        Generate a text response based on a list of conversational messages.
        Messages format: [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
        """
        pass


class GroqProvider(BaseLLMProvider):
    """
    Implementation of the Groq API provider utilizing their OpenAI-compatible endpoints.
    """
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY must be set to use the Groq provider.")
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.LLM_MODEL
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1000) -> str:
        if not messages:
            return ""
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json=payload,
                    timeout=60.0
                )
                response.raise_for_status()
                data = response.json()
                
                if "choices" not in data or not data["choices"]:
                    logger.error(f"Invalid response format from Groq: {data}")
                    raise ValueError("Received empty or invalid choices from Groq API.")
                    
                return data["choices"][0]["message"]["content"]
                
        except httpx.HTTPStatusError as e:
            logger.error("Groq API HTTP error: status=%s", e.response.status_code)
            raise RuntimeError(f"Groq API failed with status {e.response.status_code}") from e
        except httpx.RequestError as e:
            logger.error("Groq API network/timeout error: %s", sanitize_for_log(e))
            raise RuntimeError(f"Groq API connection error: {str(e)}") from e
        except Exception as e:
            logger.error("Unexpected error communicating with Groq: %s", sanitize_for_log(e))
            raise


class GeminiProvider(BaseLLMProvider):
    """
    Structure/Interface placeholder for future Gemini API implementation.
    Do not implement logic yet.
    """
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY must be set to use the Gemini provider.")
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.LLM_MODEL

    async def generate(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1000) -> str:
        raise NotImplementedError("Gemini provider is structured but not yet implemented.")


class MockLLMProvider(BaseLLMProvider):
    """
    A mock provider for local unit testing to prevent API calls.
    """
    async def generate(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1000) -> str:
        return "This is a mock response from the LLM."


def get_llm_provider() -> BaseLLMProvider:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "groq":
        return GroqProvider()
    elif provider == "gemini":
        return GeminiProvider()
    elif provider == "mock":
        return MockLLMProvider()
    else:
        raise ValueError(f"Unknown LLM provider configured: {provider}")
