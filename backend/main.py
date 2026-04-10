# Author: Mehul Sharma
# This code is for evaluation purposes only. Unauthorized use is prohibited.

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
import os
import json
import shutil
from pathlib import Path

load_dotenv()

from llmcore.main import TaskExecutor
import uvicorn

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DIQE Data Science Core API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/")
def health_check():
    return {"status": "ok", "message": "DIQE Core Service Running"}


@app.post("/process")
async def process_documents(request: ProcessRequest, background_tasks: BackgroundTasks):
    try:
        input_data = request.model_dump()
        print(f"Received process request for model: {input_data['model_id']}")
        executor = TaskExecutor(input_data)
        background_tasks.add_task(executor.setup)
        return {"status": "success", "message": "Pipeline processing started in background."}
    except Exception as e:
        print(f"Error initiating pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
async def query_documents(request: QueryRequest):
    try:
        input_data = {"model_id": request.model_id}
        print(f"Received query: '{request.query}' ({request.type}) - Lang: {request.language}")
        executor = TaskExecutor(input_data)
        return StreamingResponse(
            executor.stream_query(
                request.query,
                type=request.type,
                language=request.language,
                mode=request.mode,
            ),
            media_type="text/plain",
        )
    except Exception as e:
        print(f"Error executing query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status/{model_id}")
async def get_processing_status(model_id: str):
    try:
        repo_root = Path(__file__).resolve().parents[1]
        rag_dir = repo_root / "output" / model_id / "rag"
        marker = rag_dir / "index_complete.json"
        corpus = rag_dir / "corpus.json"

        if marker.exists():
            info = json.loads(marker.read_text())
            return {
                "status": "completed",
                "progress": 100,
                "message": f"Indexing complete. {info.get('chunk_count', '?')} chunks indexed.",
            }

        if corpus.exists():
            return {"status": "indexing", "progress": 70, "message": "Building vector index..."}

        extracted_dir = repo_root / "output" / model_id / "extracted"
        if extracted_dir.exists() and any(extracted_dir.iterdir()):
            return {"status": "indexing", "progress": 40, "message": "Extracting document text..."}

        models_dir = repo_root / "models" / model_id / "input"
        if models_dir.exists() and any(models_dir.iterdir()):
            return {"status": "construction", "progress": 20, "message": "Documents received, processing..."}

        return {"status": "pending", "progress": 0, "message": "Waiting for pipeline to start..."}
    except Exception as e:
        print(f"Error checking status: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/upload/{model_id}")
async def upload_files(model_id: str, files: List[UploadFile] = File(...)):
    try:
        input_dir = f"models/{model_id}/input"
        os.makedirs(input_dir, exist_ok=True)

        saved_files = []
        for file in files:
            file_location = f"{input_dir}/{file.filename}"
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append({"filename": file.filename, "file_path": os.path.abspath(file_location)})

        print(f"Uploaded {len(saved_files)} files for model {model_id}")
        return {"status": "success", "files": saved_files}
    except Exception as e:
        print(f"Error uploading files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
