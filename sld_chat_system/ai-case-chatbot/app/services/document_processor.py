import io
import re
from typing import Any, Dict, List, Optional
import pymupdf
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter

class DocumentProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len
        )

    def clean_text(self, text: str) -> str:
        """Removes HTML tags and normalizes whitespace."""
        if not text:
            return ""
            
        # Parse and remove HTML
        soup = BeautifulSoup(text, "html.parser")
        cleaned = soup.get_text(separator=" ")
        
        # Remove extra whitespace and noise
        cleaned = re.sub(r'\s+', ' ', cleaned)
        return cleaned.strip()

    def extract_from_pdf(self, file_bytes: bytes) -> List[Dict[str, Any]]:
        """Extracts text from a PDF page by page."""
        pages = []
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            for i in range(len(doc)):
                page = doc.load_page(i)
                text = page.get_text()
                pages.append({"page_number": i + 1, "text": text})
            doc.close()
        except Exception as e:
            # Handle non-PDF or corrupted files gracefully
            raise ValueError(f"Failed to process PDF: {e}")
        return pages
        
    def extract_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Handles plain text or HTML strings directly."""
        return [{"page_number": 1, "text": text}]

    async def chunk_document(
        self, 
        pages: List[Dict[str, Any]], 
        base_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Takes extracted pages and splits them into meaningful chunks,
        attaching metadata.
        """
        chunks = []
        
        for page in pages:
            cleaned_text = self.clean_text(page.get("text", ""))
            if not cleaned_text:
                continue
                
            page_chunks = self.text_splitter.create_documents([cleaned_text])
            
            for chunk_obj in page_chunks:
                # Merge base metadata with page specific metadata
                chunk_metadata = base_metadata.copy()
                chunk_metadata["page_number"] = page.get("page_number")
                
                chunks.append({
                    "text": chunk_obj.page_content,
                    "metadata": chunk_metadata
                })
                
        return chunks

    async def process_document(
        self, 
        content: bytes | str, 
        mime_type: str, 
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Main entry point to process a document based on its type."""
        pages = []
        
        if mime_type == "application/pdf":
            if isinstance(content, str):
                content = content.encode("utf-8")
            pages = self.extract_from_pdf(content)
        elif mime_type in ["text/plain", "text/html"]:
            if isinstance(content, bytes):
                content = content.decode("utf-8", errors="ignore")
            pages = self.extract_from_text(content)
        else:
            raise ValueError(f"Unsupported document type: {mime_type}")
            
        return await self.chunk_document(pages, metadata)
