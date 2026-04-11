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

REPO_ROOT = Path(__file__).resolve().parents[1]


def _rag_corpus_path(model_id: str) -> Path:
    return REPO_ROOT / "output" / model_id / "rag" / "corpus.json"


def _doc_id_from_chunk_id(chunk_id: str) -> str:
    if "_" in chunk_id:
        head, tail = chunk_id.rsplit("_", 1)
        if tail.isdigit():
            return head
    return chunk_id


def _rag_index_stats(model_id: str) -> dict:
    input_dir = REPO_ROOT / "models" / model_id / "input"
    uploaded_file_count = 0
    if input_dir.is_dir():
        uploaded_file_count = sum(1 for p in input_dir.iterdir() if p.is_file())

    corpus_path = _rag_corpus_path(model_id)
    total_chunks = 0
    doc_ids: set[str] = set()
    if corpus_path.exists():
        try:
            rows = json.loads(corpus_path.read_text())
            if isinstance(rows, list):
                total_chunks = len(rows)
                for row in rows:
                    cid = row.get("id", "")
                    doc_ids.add(_doc_id_from_chunk_id(str(cid)))
        except (json.JSONDecodeError, OSError, TypeError):
            pass

    marker = REPO_ROOT / "output" / model_id / "rag" / "index_complete.json"
    index_complete = marker.exists()
    if index_complete:
        try:
            info = json.loads(marker.read_text())
            cc = info.get("chunk_count")
            if isinstance(cc, int):
                total_chunks = max(total_chunks, cc)
        except (json.JSONDecodeError, OSError):
            pass

    return {
        "uploaded_file_count": uploaded_file_count,
        "indexed_document_count": len(doc_ids),
        "total_chunks": total_chunks,
        "index_complete": index_complete,
    }


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


@app.get("/model/{model_id}/sources")
async def get_rag_sources(model_id: str):
    path = _rag_corpus_path(model_id)
    if not path.exists():
        return {"data": []}
    try:
        rows: list = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {"data": []}
    out = []
    for row in rows:
        cid = row.get("id", "")
        text = row.get("text", "")
        out.append(
            {
                "id": cid,
                "text": text,
                "n_tokens": len(text.split()),
                "document_ids": [_doc_id_from_chunk_id(cid)],
            }
        )
    return {"data": out}


@app.get("/model/{model_id}/graph")
async def get_entity_graph(model_id: str):
    rag_stats = _rag_index_stats(model_id)
    try:
        from llmcore.graphrag.graphrag_search import GraphRAGSearch

        data = GraphRAGSearch(model_id).get_graph_data()
        data["rag_stats"] = rag_stats
        return {"data": data}
    except Exception as exc:
        print(f"Entity graph unavailable for {model_id}: {exc}")
        return {
            "data": {
                "entities": [],
                "relationships": [],
                "rag_stats": rag_stats,
            }
        }


@app.get("/api/status/{model_id}")
async def get_processing_status(model_id: str):
    try:
        repo_root = REPO_ROOT
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
