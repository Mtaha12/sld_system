import pytest
import mongomock_motor
from app.db.repository import ChunkRepository
from app.services.retrieval import RetrievalService

@pytest.fixture
async def setup_db():
    db = mongomock_motor.AsyncMongoMockClient().sld_system
    chunk_repo = ChunkRepository(db)
    
    # Insert chunks for CASE A (sld_number 100)
    await chunk_repo.save_chunks([
        {
            "text": "This is a document about a tax dispute for case A.",
            "metadata": {"sld_number": 100, "case_id": "CASE-A", "document_type": "order", "page_number": 1}
        },
        {
            "text": "Second chunk of case A with more details on tax.",
            "metadata": {"sld_number": 100, "case_id": "CASE-A", "document_type": "judgment", "page_number": 2}
        }
    ])
    
    # Insert chunks for CASE B (sld_number 200)
    await chunk_repo.save_chunks([
        {
            "text": "This is a criminal law document for case B.",
            "metadata": {"sld_number": 200, "case_id": "CASE-B", "document_type": "hearing", "page_number": 1}
        }
    ])
    
    return chunk_repo

@pytest.mark.asyncio
async def test_retrieval_isolation(setup_db):
    chunk_repo = setup_db
    
    retrieval_service = RetrievalService(
        chunk_repo=chunk_repo
    )
    
    # Query for case A
    results_a = await retrieval_service.retrieve(sld_number=100, query="tax dispute", top_k=5)
    
    # Should only return chunks for Case A
    assert len(results_a) > 0
    for chunk in results_a:
        assert chunk["metadata"]["sld_number"] == 100
        
    # Query for case B
    results_b = await retrieval_service.retrieve(sld_number=200, query="criminal law", top_k=5)
    
    # Should only return chunks for Case B
    assert len(results_b) > 0
    for chunk in results_b:
        assert chunk["metadata"]["sld_number"] == 200

@pytest.mark.asyncio
async def test_retrieval_empty_query(setup_db):
    chunk_repo = setup_db
    retrieval_service = RetrievalService(
        chunk_repo=chunk_repo
    )
    
    results = await retrieval_service.retrieve(sld_number=100, query="")
    assert results == []

@pytest.mark.asyncio
async def test_retrieval_no_results(setup_db):
    chunk_repo = setup_db
    retrieval_service = RetrievalService(
        chunk_repo=chunk_repo
    )
    
    # Query for non-existent case 999
    results = await retrieval_service.retrieve(sld_number=999, query="tax dispute")
    assert results == []
