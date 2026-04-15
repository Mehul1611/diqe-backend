from pydantic import BaseModel, Field
from typing import List


class ChatMessage(BaseModel):
    role: str
    content: str


class FileData(BaseModel):
    doc_id: str
    file_path: str
    domain: str
    title: str

class ProcessRequest(BaseModel):
    model_id: str
    files_data: List[FileData]

class QueryRequest(BaseModel):
    model_id: str
    query: str
    type: str = "local"
    language: str = "English"
    mode: str = "fast"
    chat_history: List[ChatMessage] = Field(default_factory=list)
