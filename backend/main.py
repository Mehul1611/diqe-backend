import gc
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List
import uvicorn
from dotenv import load_dotenv
from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from backend.auth import get_current_user
from backend.routers.models import router as models_router
from backend.schemas import ProcessRequest, QueryRequest
from backend.storage import StorageService
from llmcore.main import TaskExecutor
from llmcore.models import ModelProvider
from llmcore.utils.cleanup import cleanup_old_data

load_dotenv()

logger = logging.getLogger(__name__)

UPLOAD_CHUNK_SIZE = int(os.environ.get("UPLOAD_CHUNK_SIZE_BYTES", str(1024 * 1024)))  # 1 MiB
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "15"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup: preloading models...")
    try:
        if os.environ.get("PRELOAD_MODELS", "0") == "1":
            ModelProvider.preload_models()
            gc.collect()
            logger.info("Models preloaded successfully")
        else:
            logger.info("Model preloading disabled (set PRELOAD_MODELS=1 to enable).")
    except Exception as e:
        logger.error("Failed to preload models at startup: %s", e)
    yield
    logger.info("Application shutdown")


class DIQECoreAPI:
    REPO_ROOT = Path(__file__).resolve().parents[1]

    def __init__(self):
        self.app = FastAPI(title="DIQE Data Science Core API", lifespan=lifespan)
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self.app.include_router(models_router)
        self._register_routes()

    def _rag_dir(self, user_id: str, model_id: str) -> Path:
        return self.REPO_ROOT / "output" / user_id / model_id / "rag"

    def _rag_corpus_path(self, user_id: str, model_id: str) -> Path:
        rag_dir = self._rag_dir(user_id, model_id)
        jsonl = rag_dir / "corpus.jsonl"
        if jsonl.exists():
            return jsonl
        return rag_dir / "corpus.json"

    @staticmethod
    def _doc_id_from_chunk_id(chunk_id: str) -> str:
        if "_" in chunk_id:
            head, tail = chunk_id.rsplit("_", 1)
            if tail.isdigit():
                return head
        return chunk_id

    def _rag_index_stats(self, user_id: str, model_id: str) -> dict:
        input_dir = self.REPO_ROOT / "models" / user_id / model_id / "input"
        uploaded_file_count = 0
        if input_dir.is_dir():
            uploaded_file_count = sum(1 for p in input_dir.iterdir() if p.is_file())

        corpus_path = self._rag_corpus_path(user_id, model_id)
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

        rag_dir = self._rag_dir(user_id, model_id)
        marker = rag_dir / "index_complete.json"
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

    def _register_routes(self) -> None:
        app = self.app
        app.get("/")(self.health_check)
        app.post("/process")(self.process_documents)
        app.post("/query")(self.query_documents)
        app.get("/model/{model_id}/sources")(self.get_rag_sources)
        app.get("/model/{model_id}/graph")(self.get_entity_graph)
        app.get("/api/status/{model_id}")(self.get_processing_status)
        app.post("/upload/{model_id}")(self.upload_files)
        app.post("/admin/cleanup")(self.run_cleanup)

    async def health_check(self):
        return {"status": "ok", "message": "DIQE Core Service Running"}

    async def process_documents(
        self,
        request: ProcessRequest,
        background_tasks: BackgroundTasks,
        user_id: str = Depends(get_current_user),
    ):
        try:
            input_data = request.model_dump()
            input_data["user_id"] = user_id
            logger.info(
                "Process request: model_id=%s user_id=%s",
                input_data["model_id"],
                user_id,
            )
            executor = TaskExecutor(input_data)
            background_tasks.add_task(executor.setup)
            return {"status": "success", "message": "Pipeline processing started in background."}
        except Exception as exc:
            logger.error("Error initiating pipeline: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def query_documents(
        self,
        request: QueryRequest,
        user_id: str = Depends(get_current_user),
    ):
        try:
            input_data = {"model_id": request.model_id, "user_id": user_id}
            logger.info(
                "Query: '%s' (%s) - Lang: %s user_id=%s",
                request.query,
                request.search_type,
                request.language,
                user_id,
            )

            if request.search_type == "local":
                rag_dir = self.REPO_ROOT / "output" / user_id / request.model_id / "rag"
                marker = rag_dir / "index_complete.json"
                if not marker.exists():
                    progress_file = rag_dir / "index_progress.json"
                    if progress_file.exists():
                        try:
                            progress = json.loads(progress_file.read_text())
                            if progress.get("status") == "failed":
                                raise HTTPException(
                                    status_code=503,
                                    detail="Document indexing failed. Please re-upload and process your documents."
                                )
                        except json.JSONDecodeError:
                            pass
                    raise HTTPException(
                        status_code=503,
                        detail="Document indexing is still in progress. Please wait for it to complete."
                    )

            executor = TaskExecutor(input_data)
            return StreamingResponse(
                executor.stream_query(
                    request.query,
                    search_type=request.search_type,
                    language=request.language,
                    mode=request.mode,
                ),
                media_type="text/plain; charset=utf-8",
                headers={
                    "Cache-Control": "no-cache, no-transform",
                    "X-Accel-Buffering": "no",
                    "Connection": "keep-alive",
                },
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Error executing query: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def get_rag_sources(
        self,
        model_id: str,
        user_id: str = Depends(get_current_user),
    ):
        path = self._rag_corpus_path(user_id, model_id)
        if not path.exists():
            return {"data": []}

        out: list[dict] = []
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
                                "document_ids": [row.get("doc_id") or self._doc_id_from_chunk_id(str(cid))],
                                "source": row.get("source") or None,
                            })
            else:
                rows = json.loads(path.read_text())
                if not isinstance(rows, list):
                    return {"data": []}
                for row in rows:
                    cid = row.get("id", "")
                    text = row.get("text", "")
                    out.append({
                        "id": cid,
                        "text": text,
                        "n_tokens": len(text.split()),
                        "document_ids": [row.get("doc_id") or self._doc_id_from_chunk_id(str(cid))],
                        "source": row.get("source") or None,
                    })
        except (json.JSONDecodeError, OSError):
            return {"data": []}
        return {"data": out}

    async def get_entity_graph(
        self,
        model_id: str,
        user_id: str = Depends(get_current_user),
    ):
        rag_stats = self._rag_index_stats(user_id, model_id)
        return {
            "data": {
                "entities": [],
                "relationships": [],
                "rag_stats": rag_stats,
            }
        }

    async def get_processing_status(
        self,
        model_id: str,
        user_id: str = Depends(get_current_user),
    ):
        try:
            rag_dir = self.REPO_ROOT / "output" / user_id / model_id / "rag"
            marker = rag_dir / "index_complete.json"
            progress_file = rag_dir / "index_progress.json"
            corpus_j = rag_dir / "corpus.json"
            corpus_l = rag_dir / "corpus.jsonl"

            if marker.exists():
                info = json.loads(marker.read_text())
                return JSONResponse(
                    content={
                        "status": "completed",
                        "progress": 100,
                        "message": f"Indexing complete. {info.get('chunk_count', '?')} chunks indexed.",
                    },
                    headers={"Cache-Control": "public, max-age=60"},
                )

            if progress_file.exists():
                try:
                    progress_info = json.loads(progress_file.read_text())
                    if progress_info.get("status") == "failed":
                        return JSONResponse(
                            content={
                                "status": "error",
                                "progress": 0,
                                "message": f"Indexing failed: {progress_info.get('error', 'Unknown error')}. "
                                           f"Indexed {progress_info.get('chunks_indexed', 0)} chunks before failure.",
                            },
                            headers={"Cache-Control": "no-cache"},
                        )
                    chunks = progress_info.get("chunks_indexed", 0)
                    current_doc = progress_info.get("current_doc", "")
                    return JSONResponse(
                        content={
                            "status": "indexing",
                            "progress": min(90, 50 + (chunks // 10)),
                            "message": f"Indexing in progress... {chunks} chunks indexed. Current: {current_doc}",
                        },
                        headers={"Cache-Control": "no-cache, max-age=3"},
                    )
                except (json.JSONDecodeError, OSError):
                    pass

            if corpus_j.exists() or corpus_l.exists():
                return JSONResponse(
                    content={"status": "indexing", "progress": 70, "message": "Building vector index..."},
                    headers={"Cache-Control": "no-cache, max-age=3"},
                )

            extracted_dir = self.REPO_ROOT / "output" / user_id / model_id / "extracted"
            if extracted_dir.exists() and any(extracted_dir.iterdir()):
                return JSONResponse(
                    content={"status": "indexing", "progress": 40, "message": "Extracting document text..."},
                    headers={"Cache-Control": "no-cache, max-age=3"},
                )

            models_dir = self.REPO_ROOT / "models" / user_id / model_id / "input"
            if models_dir.exists() and any(models_dir.iterdir()):
                return JSONResponse(
                    content={"status": "construction", "progress": 20, "message": "Documents received, processing..."},
                    headers={"Cache-Control": "no-cache, max-age=3"},
                )

            return JSONResponse(
                content={"status": "pending", "progress": 0, "message": "Waiting for pipeline to start..."},
                headers={"Cache-Control": "no-cache, max-age=5"},
            )
        except Exception as exc:
            logger.error("Error checking status for model %s: %s", model_id, exc)
            return JSONResponse(
                content={"status": "error", "progress": 0, "message": str(exc)},
                headers={"Cache-Control": "no-cache"},
            )

    async def upload_files(
        self,
        model_id: str,
        files: List[UploadFile] = File(...),
        user_id: str = Depends(get_current_user),
    ):
        try:
            input_dir = self.REPO_ROOT / "models" / user_id / model_id / "input"
            input_dir.mkdir(parents=True, exist_ok=True)

            storage = StorageService(user_id)
            saved_files: list[dict] = []

            for file in files:
                local_path = input_dir / file.filename
                bytes_written = 0
                try:
                    with open(local_path, "wb") as out:
                        while True:
                            chunk = await file.read(UPLOAD_CHUNK_SIZE)
                            if not chunk:
                                break
                            bytes_written += len(chunk)
                            if bytes_written > MAX_UPLOAD_BYTES:
                                raise HTTPException(
                                    status_code=413,
                                    detail=f"File '{file.filename}' exceeds upload limit ({MAX_UPLOAD_MB} MB).",
                                )
                            out.write(chunk)
                finally:
                    await file.close()

                try:
                    with open(local_path, "rb") as f:
                        storage.upload_file(model_id, "input", file.filename, f)
                except Exception as storage_exc:
                    logger.warning(
                        "Storage upload failed for %s (local copy kept): %s",
                        file.filename,
                        storage_exc,
                    )

                saved_files.append({
                    "filename": file.filename,
                    "file_path": str(local_path.resolve()),
                })

            logger.info(
                "Uploaded %d file(s) for model %s (user %s)",
                len(saved_files),
                model_id,
                user_id,
            )
            return {"status": "success", "files": saved_files}
        except Exception as exc:
            logger.error("Error uploading files: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def run_cleanup(self, hours: int = 24):
        try:
            count, errors = cleanup_old_data(retention_hours=hours)
            return {
                "status": "success",
                "deleted_count": count,
                "errors": errors,
                "message": f"Cleanup finished. Removed {count} old project directories.",
            }
        except Exception as exc:
            logger.error("Cleanup failed: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc


api_instance = DIQECoreAPI()
app = api_instance.app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
