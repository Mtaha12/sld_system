import pytest
from unittest.mock import AsyncMock, patch
import httpx

from app.services.llm import GroqProvider, get_llm_provider, MockLLMProvider, GeminiProvider
from app.core.config import settings
import os

@pytest.fixture
def mock_groq_env(monkeypatch):
    monkeypatch.setattr(settings, "GROQ_API_KEY", "dummy_groq_key")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "groq")
    monkeypatch.setattr(settings, "LLM_MODEL", "dummy_model")

@pytest.fixture
def mock_gemini_env(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy_gemini_key")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "gemini")

@pytest.mark.asyncio
async def test_groq_provider_success(mock_groq_env):
    provider = GroqProvider()
    
    messages = [{"role": "user", "content": "Hello!"}]
    
    # Mock httpx response
    mock_response = httpx.Response(
        200, 
        json={
            "choices": [
                {
                    "message": {
                        "content": "Hello from Groq!"
                    }
                }
            ]
        },
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    )
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        response = await provider.generate(messages=messages, temperature=0.5)
        
        assert response == "Hello from Groq!"
        
        # Verify the call was constructed correctly
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args.kwargs
        assert call_kwargs["json"]["model"] == "dummy_model"
        assert call_kwargs["json"]["temperature"] == 0.5
        assert call_kwargs["json"]["messages"] == messages
        assert call_kwargs["headers"]["Authorization"] == "Bearer dummy_groq_key"

@pytest.mark.asyncio
async def test_groq_provider_empty_messages(mock_groq_env):
    provider = GroqProvider()
    response = await provider.generate([])
    assert response == ""

@pytest.mark.asyncio
async def test_groq_provider_http_error(mock_groq_env):
    provider = GroqProvider()
    
    mock_response = httpx.Response(
        401,
        text="Unauthorized",
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    )
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        with pytest.raises(RuntimeError) as exc_info:
            await provider.generate([{"role": "user", "content": "Hi"}])
            
        assert "401" in str(exc_info.value)

@pytest.mark.asyncio
async def test_gemini_provider_unimplemented(mock_gemini_env):
    provider = GeminiProvider()
    
    with pytest.raises(NotImplementedError):
        await provider.generate([{"role": "user", "content": "Hi"}])

def test_get_llm_provider_factory(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "mock")
    provider = get_llm_provider()
    assert isinstance(provider, MockLLMProvider)
    
    monkeypatch.setattr(settings, "LLM_PROVIDER", "groq")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "dummy")
    provider = get_llm_provider()
    assert isinstance(provider, GroqProvider)
