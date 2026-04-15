from pydantic import BaseModel
from typing import List, Optional


class FileData(BaseModel):
    doc_id: str
    file_path: str
    domain: str
    title: str


class ProcessRequest(BaseModel):
    model_id: str
    user_id: str
    files_data: List[FileData]


class QueryRequest(BaseModel):
    model_id: str
    user_id: str
    query: str
    type: str = "local"
    language: str = "English"
    mode: str = "fast"


class ModelCardCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ModelCardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    doc_count: Optional[int] = None
    status: Optional[str] = None


class ModelCardResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    doc_count: int
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
