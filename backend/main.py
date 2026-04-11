# Author: Mehul Sharma
# This code is for evaluation purposes only. Unauthorized use is prohibited.

import os
import json
import shutil
from pathlib import Path
from typing import List
from fastapi import (
FastAPI, 
HTTPException, 
UploadFile, 
File, 
BackgroundTasks, APIRouter)

from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

from llmcore.main import TaskExecutor
from llmcore.graphrag.graphrag_search import GraphRAGSearch
from llmcore.utils.cleanup import cleanup_old_data
from .schemas import FileData, ProcessRequest, QueryRequest

load_dotenv()

class DIQECoreAPI:
    REPO_ROOT = Path(__file__).resolve().parents[1]

    def __init__(self):
        self.app = FastAPI(title="DIQE Data Science Core API")
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self._register_routes()

    def _rag_corpus_path(self, model_id: str) -> Path:
        jsonl = self.REPO_ROOT / "output" / model_id / "rag" / "corpus.jsonl"
        if jsonl.exists():
            return jsonl
        return self.REPO_ROOT / "output" / model_id / "rag" / "corpus.json"

    def _doc_id_from_chunk_id(self, chunk_id: str) -> str:
        if "_" in chunk_id:
            head, tail = chunk_id.rsplit("_", 1)
            if tail.isdigit():
                return head
        return chunk_id

    def _rag_index_stats(self, model_id: str) -> dict:
        input_dir = self.REPO_ROOT / "models" / model_id / "input"
        uploaded_file_count = 0
        if input_dir.is_dir():
            uploaded_file_count = sum(1 for p in input_dir.iterdir() if p.is_file())

        corpus_path = self._rag_corpus_path(model_id)
        total_chunks = 0
        doc_ids: set[str] = set()
        if corpus_path.exists():
            try:
                if corpus_path.suffix == ".jsonl":
                    with open(corpus_path, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.strip():
                                row = json.loads(line)
                                total_chunks += 1
                                cid = row.get("id", "")
                                doc_ids.add(self._doc_id_from_chunk_id(str(cid)))
                else:
                    rows = json.loads(corpus_path.read_text())
                    if isinstance(rows, list):
                        total_chunks = len(rows)
                        for row in rows:
                            cid = row.get("id", "")
                            doc_ids.add(self._doc_id_from_chunk_id(str(cid)))
            except (json.JSONDecodeError, OSError, TypeError):
                pass

        marker = self.REPO_ROOT / "output" / model_id / "rag" / "index_complete.json"
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

    def _register_routes(self):
        @self.app.get("/")
        def health_check():
            return {"status": "ok", "message": "DIQE Core Service Running"}

        @self.app.post("/process")
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

        @self.app.post("/query")
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

        @self.app.get("/model/{model_id}/sources")
        async def get_rag_sources(model_id: str):
            path = self._rag_corpus_path(model_id)
            if not path.exists():
                return {"data": []}
            
            out = []
            try:
                if path.suffix == ".jsonl":
                    with open(path, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.strip():
                                row = json.loads(line)
                                cid = row.get("id", "")
                                text = row.get("text", "")
                                out.append({
                                    "id": cid,
                                    "text": text,
                                    "n_tokens": len(text.split()),
                                    "document_ids": [self._doc_id_from_chunk_id(cid)],
                                })
                else:
                    rows: list = json.loads(path.read_text())
                    for row in rows:
                        cid = row.get("id", "")
                        text = row.get("text", "")
                        out.append({
                            "id": cid,
                            "text": text,
                            "n_tokens": len(text.split()),
                            "document_ids": [self._doc_id_from_chunk_id(cid)],
                        })
            except (json.JSONDecodeError, OSError):
                return {"data": []}
            return {"data": out}

        @self.app.get("/model/{model_id}/graph")
        async def get_entity_graph(model_id: str):
            rag_stats = self._rag_index_stats(model_id)
            try:
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

        @self.app.get("/api/status/{model_id}")
        async def get_processing_status(model_id: str):
            try:
                rag_dir = self.REPO_ROOT / "output" / model_id / "rag"
                marker = rag_dir / "index_complete.json"
                corpus_j = rag_dir / "corpus.json"
                corpus_l = rag_dir / "corpus.jsonl"

                if marker.exists():
                    info = json.loads(marker.read_text())
                    return {
                        "status": "completed",
                        "progress": 100,
                        "message": f"Indexing complete. {info.get('chunk_count', '?')} chunks indexed.",
                    }

                if corpus_j.exists() or corpus_l.exists():
                    return {"status": "indexing", "progress": 70, "message": "Building vector index..."}

                extracted_dir = self.REPO_ROOT / "output" / model_id / "extracted"
                if extracted_dir.exists() and any(extracted_dir.iterdir()):
                    return {"status": "indexing", "progress": 40, "message": "Extracting document text..."}

                models_dir = self.REPO_ROOT / "models" / model_id / "input"
                if models_dir.exists() and any(models_dir.iterdir()):
                    return {"status": "construction", "progress": 20, "message": "Documents received, processing..."}

                return {"status": "pending", "progress": 0, "message": "Waiting for pipeline to start..."}
            except Exception as e:
                print(f"Error checking status: {e}")
                return {"status": "error", "message": str(e)}

        @self.app.post("/upload/{model_id}")
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

        @self.app.post("/admin/cleanup")
        async def run_cleanup(hours: int = 24):
            try:
                count, errors = cleanup_old_data(retention_hours=hours)
                return {
                    "status": "success",
                    "deleted_count": count,
                    "errors": errors,
                    "message": f"Cleanup finished. Removed {count} old project directories."
                }
            except Exception as e:
                print(f"Cleanup failed: {e}")
                raise HTTPException(status_code=500, detail=str(e))

api_instance = DIQECoreAPI()
app = api_instance.app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
