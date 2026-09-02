from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.db.mongodb import get_database
from app.db.repository import CaseRepository, DocumentRepository
from app.schemas.case import (
    Case,
    CaseMetadata,
    CaseHistoryEvent,
    Hearing,
    Order,
    Judgment,
    Document
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cases"])

def get_case_repo(db: AsyncIOMotorDatabase = Depends(get_database)) -> CaseRepository:
    return CaseRepository(db)
    
def get_doc_repo(db: AsyncIOMotorDatabase = Depends(get_database)) -> DocumentRepository:
    return DocumentRepository(db)

@router.get("/{case_number}", response_model=Case)
async def get_case(case_number: str, repo: CaseRepository = Depends(get_case_repo)) -> Case:
    try:
        case = await repo.get_case_by_case_number(case_number)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
        
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return Case(**case)

@router.get("/{case_number}/metadata", response_model=CaseMetadata)
async def get_case_metadata(case_number: str, repo: CaseRepository = Depends(get_case_repo)) -> CaseMetadata:
    try:
        meta = await repo.get_case_metadata(case_number)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
        
    if not meta:
        raise HTTPException(status_code=404, detail="Case metadata not found")
    return CaseMetadata(**meta)

@router.get("/{case_number}/history", response_model=List[CaseHistoryEvent])
async def get_case_history(
    case_number: str, 
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: CaseRepository = Depends(get_case_repo)
) -> List[CaseHistoryEvent]:
    try:
        history = await repo.get_case_history(case_number, skip=skip, limit=limit)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
        
    if history is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return [CaseHistoryEvent(**event) for event in history]

@router.get("/{case_number}/hearings", response_model=List[Hearing])
async def get_case_hearings(
    case_number: str, 
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: CaseRepository = Depends(get_case_repo)
) -> List[Hearing]:
    try:
        hearings = await repo.get_case_hearings(case_number, skip=skip, limit=limit)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
        
    if hearings is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return [Hearing(**hearing) for hearing in hearings]

@router.get("/{case_number}/orders", response_model=List[Order])
async def get_case_orders(
    case_number: str, 
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: CaseRepository = Depends(get_case_repo)
) -> List[Order]:
    try:
        orders = await repo.get_case_orders(case_number, skip=skip, limit=limit)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
        
    if orders is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return [Order(**order) for order in orders]

@router.get("/{case_number}/judgments", response_model=List[Judgment])
async def get_case_judgments(
    case_number: str, 
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: CaseRepository = Depends(get_case_repo)
) -> List[Judgment]:
    try:
        judgments = await repo.get_case_judgments(case_number, skip=skip, limit=limit)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
        
    if judgments is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return [Judgment(**judgment) for judgment in judgments]

@router.get("/{case_number}/documents", response_model=List[Document])
async def get_case_documents(
    case_number: str, 
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: DocumentRepository = Depends(get_doc_repo)
) -> List[Document]:
    try:
        docs = await repo.get_documents_by_case_number(case_number, skip=skip, limit=limit)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
        
    return [Document(**doc) for doc in docs]
