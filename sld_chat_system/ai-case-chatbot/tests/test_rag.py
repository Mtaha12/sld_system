import pytest
from app.services.rag import RAGEngine
from app.services.llm import BaseLLMProvider

class DummyRetrievalService:
    async def retrieve(self, sld_number, query, top_k=5):
        if query == "unrelated question":
            return []
        
        if query == "complex question":
            return [
                {
                    "text": "The contract was signed on Jan 1st 2020.",
                    "metadata": {"document_id": "doc1", "document_type": "contract", "page_number": 1, "sld_number": 123}
                },
                {
                    "text": "The breach occurred on Feb 1st 2020 due to non-payment.",
                    "metadata": {"document_id": "doc2", "document_type": "judgment", "page_number": 3, "sld_number": 123}
                }
            ]
            
        return [
            {
                "text": "The court decided that the contract was breached due to non-payment (Mens rea was established).",
                "metadata": {"document_id": "doc1", "document_type": "judgment", "page_number": 1, "sld_number": 123}
            }
        ]

class DummyLLMProvider(BaseLLMProvider):
    async def generate(self, messages, temperature=0.1, max_tokens=1000):
        system_content = messages[0]["content"]
        user_content = messages[1]["content"]
        
        # Test missing evidence
        if not "--- Document:" in system_content:
            return "I could not find the information in the provided case documents."
            
        # Test complex synthesis
        if "complex question" in user_content.lower():
            return "The contract signed on Jan 1st 2020 was breached on Feb 1st 2020 due to non-payment. [Doc: doc1, Page: 1] [Doc: doc2, Page: 3]"
            
        # Test simple explanation and citations
        if "contract" in user_content.lower():
            return "The court found the contract was broken because of failure to pay. The legal term 'Mens rea' means criminal intent. [Doc: doc1, Page: 1]"
            
        return "I could not find the information in the provided case documents."

@pytest.mark.asyncio
async def test_rag_engine_simple_explanation():
    retrieval_service = DummyRetrievalService()
    llm_provider = DummyLLMProvider()
    rag = RAGEngine(retrieval_service=retrieval_service, llm_provider=llm_provider)
    
    result = await rag.ask_question(sld_number=123, question="Why was the contract breached?")
    
    assert "failure to pay" in result["answer"]
    assert "criminal intent" in result["answer"] # Explaining legal language
    assert "[Doc: doc1, Page: 1]" in result["answer"] # Citations
    assert len(result["sources"]) == 1

@pytest.mark.asyncio
async def test_rag_engine_complex_question_multiple_sources():
    retrieval_service = DummyRetrievalService()
    llm_provider = DummyLLMProvider()
    rag = RAGEngine(retrieval_service=retrieval_service, llm_provider=llm_provider)
    
    result = await rag.ask_question(sld_number=123, question="complex question")
    
    assert "Jan 1st 2020" in result["answer"]
    assert "Feb 1st 2020" in result["answer"]
    assert "[Doc: doc1, Page: 1]" in result["answer"]
    assert "[Doc: doc2, Page: 3]" in result["answer"]
    assert len(result["sources"]) == 2
    assert result["sources"][0]["document_id"] == "doc1"
    assert result["sources"][1]["document_id"] == "doc2"

@pytest.mark.asyncio
async def test_rag_engine_unsupported_question():
    retrieval_service = DummyRetrievalService()
    llm_provider = DummyLLMProvider()
    rag = RAGEngine(retrieval_service=retrieval_service, llm_provider=llm_provider)
    
    result = await rag.ask_question(sld_number=123, question="unrelated question")
    
    assert result["answer"] == "I could not find the information in the provided case documents."
    assert len(result["sources"]) == 0
