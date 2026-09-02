from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import datetime

class Hearing(BaseModel):
    model_config = ConfigDict(extra="allow")

class Order(BaseModel):
    model_config = ConfigDict(extra="allow")

class Judgment(BaseModel):
    model_config = ConfigDict(extra="allow")

class CaseMetadata(BaseModel):
    dated: Optional[str] = None
    department: Optional[str] = None
    court: Optional[str] = None
    caseNumber: List[str] = []
    judges: List[Any] = []
    petitioners: List[Any] = []
    lawyers: List[Any] = []
    
    model_config = ConfigDict(extra="allow")

class CaseHistoryEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

class Case(BaseModel):
    sldNumber: Any
    dated: Any = None
    department: Optional[str] = None
    court: Optional[str] = None
    caseNumber: List[str] = []
    judges: List[Any] = []
    petitioners: List[Any] = []
    lawyers: List[Any] = []
    headNote: Optional[str] = None
    references: Any = None
    principalLaw: Optional[str] = None
    judgment: Any = None
    publications: List[Any] = []
    attachments: List[Any] = []
    mapYearPage: Any = None
    isDeleted: bool = False
    deletedAt: Any = None
    createdAt: Any = None
    updatedAt: Any = None
    caseId: Optional[str] = None
    case_id: Optional[str] = None
    
    model_config = ConfigDict(extra="allow")

class Document(BaseModel):
    model_config = ConfigDict(extra="allow")
