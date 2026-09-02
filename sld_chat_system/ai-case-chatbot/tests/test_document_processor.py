import pytest
import pymupdf
from app.services.document_processor import DocumentProcessor

@pytest.fixture
def dummy_pdf_bytes():
    # Create a simple PDF in memory using PyMuPDF
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 50), "This is a test PDF document for case processing.\nIt has multiple lines and   weird spaces.\n" * 50)
    
    page2 = doc.new_page()
    page2.insert_text((50, 50), "<b>This is page 2 with fake HTML</b>.")
    
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes

def test_clean_text():
    processor = DocumentProcessor()
    raw = "<p>This is  <strong>some</strong>    HTML text.</p>"
    cleaned = processor.clean_text(raw)
    assert cleaned == "This is some HTML text."

@pytest.mark.asyncio
async def test_process_pdf_document(dummy_pdf_bytes):
    processor = DocumentProcessor(chunk_size=200, chunk_overlap=20)
    
    metadata = {
        "case_id": "CASE-123",
        "sld_number": 12345,
        "document_id": "DOC-999",
        "document_type": "judgment"
    }
    
    chunks = await processor.process_document(
        content=dummy_pdf_bytes,
        mime_type="application/pdf",
        metadata=metadata
    )
    
    assert len(chunks) > 0
    
    # Check the first chunk structure
    first_chunk = chunks[0]
    assert "text" in first_chunk
    assert "This is a test PDF" in first_chunk["text"]
    
    assert "metadata" in first_chunk
    assert first_chunk["metadata"]["case_id"] == "CASE-123"
    assert first_chunk["metadata"]["sld_number"] == 12345
    assert first_chunk["metadata"]["document_type"] == "judgment"
    assert first_chunk["metadata"]["page_number"] == 1

@pytest.mark.asyncio
async def test_process_html_document():
    processor = DocumentProcessor(chunk_size=100, chunk_overlap=10)
    
    html_content = "<html><body><h1>Judgment</h1><p>The court rules in favor of the plaintiff.</p></body></html>"
    
    metadata = {
        "case_id": "CASE-124",
        "sld_number": 67890,
        "document_id": "DOC-888",
        "document_type": "order"
    }
    
    chunks = await processor.process_document(
        content=html_content,
        mime_type="text/html",
        metadata=metadata
    )
    
    assert len(chunks) == 1
    assert chunks[0]["metadata"]["page_number"] == 1
