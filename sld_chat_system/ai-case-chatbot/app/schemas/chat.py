from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from typing import List
from datetime import datetime

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ChatSession(BaseModel):
    id: str = Field(validation_alias=AliasChoices("id", "_id"))
    sld_number: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessage] = []
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class CreateSessionRequest(BaseModel):
    sld_number: str

class SendMessageRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    session_id: str
    answer: str
    sources: List[dict] = []
