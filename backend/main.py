# Author: Mehul Sharma
# This code is for evaluation purposes only. Unauthorized use is prohibited.

import json
import re
import time
import unicodedata
import uvicorn
from dotenv import load_dotenv
from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pathlib import Path
from typing import List
from llmcore.main import TaskExecutor
from llmcore.rag.retriever import load_sources_for_model
from llmcore.utils.cleanup import cleanup_old_data
from .schemas import (
    FileData,
    ProcessRequest,
    QueryRequest,
)

load_dotenv()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".doc", ".ppt", ".txt", ".md"}
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class DIQECoreAPI:
    REPO_ROOT = Path(__file__).resolve().parents[1]

    def __init__(self):
        self.app = FastAPI(
            title="DIQE Data Science Core API",
            description=(
                "Copyright (c) 2026 Mehul Sharma. All rights reserved. "
                "Proprietary software - unauthorized use, copying, and distribution are prohibited. "
                "See repository LICENSE."
            ),
        )
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self._register_routes()

    def _register_routes(self):
        self.app.get("/")(self._health_check)
        self.app.post("/process")(self._process_documents)
        self.app.post("/query")(self._query_documents)
        self.app.get("/model/{model_id}/sources")(self._get_rag_sources)
        self.app.get("/model/{model_id}/graph")(self._get_entity_graph)
        self.app.get("/api/status/{model_id}")(self._get_processing_status)
        self.app.post("/upload/{model_id}")(self._upload_files)
        self.app.add_api_route("/admin/cleanup", self._run_cleanup, methods=["GET", "POST"])

    def _rag_dir(self, model_id: str) -> Path:
        return self.REPO_ROOT / "output" / model_id / "rag"

    def _rag_corpus_path(self, model_id: str) -> Path:
        jsonl = self._rag_dir(model_id) / "corpus.jsonl"
        if jsonl.exists():
            return jsonl
        return self._rag_dir(model_id) / "corpus.json"

    def _doc_id_from_chunk_id(self, chunk_id: str) -> str:
        if "_" in chunk_id:
            head, tail = chunk_id.rsplit("_", 1)
            if tail.isdigit():
                return head
        return chunk_id

    def _count_corpus_chunks(self, corpus_path: Path) -> tuple[int, set]:
        total_chunks, doc_ids = 0, set()
        try:
            if corpus_path.suffix == ".jsonl":
                with open(corpus_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            row = json.loads(line)
                            total_chunks += 1
                            doc_ids.add(self._doc_id_from_chunk_id(str(row.get("id", ""))))
            else:
                rows = json.loads(corpus_path.read_text())
                if isinstance(rows, list):
                    total_chunks = len(rows)
                    for row in rows:
                        doc_ids.add(self._doc_id_from_chunk_id(str(row.get("id", ""))))
        except (json.JSONDecodeError, OSError, TypeError):
            pass
        return total_chunks, doc_ids

    def _read_marker_chunk_count(self, marker: Path) -> int:
        try:
            info = json.loads(marker.read_text())
            cc = info.get("chunk_count")
            if isinstance(cc, int):
                return cc
        except (json.JSONDecodeError, OSError):
            pass
        return 0

    def _rag_index_stats(self, model_id: str) -> dict:
        input_dir = self.REPO_ROOT / "models" / model_id / "input"
        uploaded = sum(1 for p in input_dir.iterdir() if p.is_file()) if input_dir.is_dir() else 0
        corpus_path = self._rag_corpus_path(model_id)
        total_chunks, doc_ids = self._count_corpus_chunks(corpus_path) if corpus_path.exists() else (0, set())
        marker = self._rag_dir(model_id) / "index_complete.json"
        index_complete = marker.exists()
        if index_complete:
            total_chunks = max(total_chunks, self._read_marker_chunk_count(marker))
        return {
            "uploaded_file_count": uploaded,
            "indexed_document_count": len(doc_ids),
            "total_chunks": total_chunks,
            "index_complete": index_complete,
        }

    def _corpus_row_to_entry(self, row: dict) -> dict:
        cid = row.get("id", "")
        text = row.get("text", "")
        return {
            "id": cid,
            "text": text,
            "n_tokens": len(text.split()),
            "document_ids": [self._doc_id_from_chunk_id(str(cid))],
        }

    def _read_corpus_entries(self, path: Path) -> list:
        out = []
        try:
            if path.suffix == ".jsonl":
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            out.append(self._corpus_row_to_entry(json.loads(line)))
            else:
                for row in json.loads(path.read_text()):
                    out.append(self._corpus_row_to_entry(row))
        except (json.JSONDecodeError, OSError):
            return []
        return out

    def _status_from_marker(self, marker: Path) -> dict | None:
        if not marker.exists():
            return None
        try:
            chunk_count = json.loads(marker.read_text()).get("chunk_count", "?")
        except (json.JSONDecodeError, OSError):
            chunk_count = "?"
        return {"status": "completed", "progress": 100, "message": f"Indexing complete - {chunk_count} chunks ready for querying."}

    def _count_corpus_lines(self, corpus_path: Path) -> int:
        try:
            if corpus_path.suffix == ".jsonl":
                with open(corpus_path, "r", encoding="utf-8") as f:
                    return sum(1 for line in f if line.strip())
            rows = json.loads(corpus_path.read_text())
            return len(rows) if isinstance(rows, list) else 0
        except (json.JSONDecodeError, OSError):
            return 0

    def _status_from_corpus(self, rag_dir: Path) -> dict | None:
        corpus_l = rag_dir / "corpus.jsonl"
        corpus_j = rag_dir / "corpus.json"
        corpus_path = corpus_l if corpus_l.exists() else (corpus_j if corpus_j.exists() else None)
        if corpus_path is None:
            return None
        count = self._count_corpus_lines(corpus_path)
        hint = f" ({count} chunks so far)" if count else ""
        return {"status": "indexing", "progress": 70, "message": f"Building vector index{hint} - this may take a few minutes..."}

    def _status_from_extracted(self, model_id: str) -> dict | None:
        extracted_dir = self.REPO_ROOT / "output" / model_id / "extracted"
        if not extracted_dir.exists():
            return None
        try:
            files = list(extracted_dir.iterdir())
        except OSError:
            return None
        if not files:
            return None
        return {"status": "indexing", "progress": 40, "message": f"Text extracted from {len(files)} file(s) - chunking and embedding..."}

    def _status_from_input(self, model_id: str) -> dict | None:
        models_dir = self.REPO_ROOT / "models" / model_id / "input"
        if not models_dir.exists():
            return None
        try:
            input_files = [p for p in models_dir.iterdir() if p.is_file()]
        except OSError:
            return None
        if not input_files:
            return None
        names = ", ".join(p.name for p in input_files[:3])
        suffix = f" and {len(input_files) - 3} more" if len(input_files) > 3 else ""
        return {"status": "construction", "progress": 20, "message": f"Received {len(input_files)} file(s) ({names}{suffix}) - starting extraction..."}

    def _compute_pipeline_status(self, model_id: str) -> dict:
        rag_dir = self._rag_dir(model_id)
        for result in [
            self._status_from_marker(rag_dir / "index_complete.json"),
            self._status_from_corpus(rag_dir),
            self._status_from_extracted(model_id),
            self._status_from_input(model_id),
        ]:
            if result:
                return result
        return {"status": "pending", "progress": 0, "message": "Pipeline starting up - please wait..."}

    def _sanitize_filename(self, name: str) -> str:
        name = unicodedata.normalize("NFKD", name)
        name = name.encode("ascii", "ignore").decode("ascii")
        name = re.sub(r"[^\w.\-]", "_", name)
        name = re.sub(r"_+", "_", name).strip("_.")
        return name or "document"

    def _resolve_upload_dest(self, input_dir: Path, original_name: str) -> Path:
        ext = Path(original_name).suffix.lower()
        safe_stem = self._sanitize_filename(Path(original_name).stem)
        dest = input_dir / (safe_stem + ext)
        counter = 1
        while dest.exists():
            dest = input_dir / f"{safe_stem}_{counter}{ext}"
            counter += 1
        return dest

    async def _stream_file_to_disk(self, file: UploadFile, dest: Path, original_name: str) -> tuple[dict | None, dict | None]:
        bytes_written = 0
        try:
            with open(dest, "wb") as buf:
                while True:
                    chunk = await file.read(65536)
                    if not chunk:
                        break
                    bytes_written += len(chunk)
                    if bytes_written > MAX_FILE_SIZE_BYTES:
                        dest.unlink(missing_ok=True)
                        mb = bytes_written // (1024 * 1024)
                        return None, {"filename": original_name, "reason": f"File exceeds 100 MB limit ({mb} MB so far)."}
                    buf.write(chunk)
        except Exception as err:
            dest.unlink(missing_ok=True)
            print(f"[UPLOAD] Error saving '{original_name}': {err}")
            return None, {"filename": original_name, "reason": f"Write error: {err}"}
        print(f"[UPLOAD] Saved '{original_name}' -> '{dest.name}' ({bytes_written} bytes)")
        return {"filename": dest.name, "original_filename": original_name, "file_path": str(dest.resolve()), "size_bytes": bytes_written}, None

    async def _process_upload_files(self, model_id: str, files: List[UploadFile]) -> tuple[list, list]:
        input_dir = self.REPO_ROOT / "models" / model_id / "input"
        input_dir.mkdir(parents=True, exist_ok=True)
        saved_files, skipped_files = [], []
        for file in files:
            original_name = file.filename or "unknown"
            ext = Path(original_name).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                print(f"[UPLOAD] Skipped '{original_name}' - unsupported type '{ext}'")
                skipped_files.append({"filename": original_name, "reason": f"Unsupported type '{ext}'. Accepted: PDF, DOCX, PPTX, DOC, PPT, TXT, MD."})
                continue
            dest = self._resolve_upload_dest(input_dir, original_name)
            saved, skipped = await self._stream_file_to_disk(file, dest, original_name)
            if saved:
                saved_files.append(saved)
            if skipped:
                skipped_files.append(skipped)
        return saved_files, skipped_files

    async def _run_pipeline_task(self, executor: TaskExecutor, model_id: str) -> None:
        t0 = time.monotonic()
        print(f"[PIPELINE] model={model_id} - background task started")
        try:
            await executor.setup()
            print(f"[PIPELINE] model={model_id} - completed in {time.monotonic() - t0:.1f}s")
        except Exception as exc:
            print(f"[PIPELINE] model={model_id} - FAILED after {time.monotonic() - t0:.1f}s: {exc}")
            raise

    async def _health_check(self):
        return {"status": "ok", "message": "DIQE Core Service Running"}

    async def _process_documents(self, request: ProcessRequest, background_tasks: BackgroundTasks):
        try:
            input_data = request.model_dump()
            model_id = input_data["model_id"]
            file_count = len(input_data.get("files_data", []))
            print(f"[PIPELINE] Starting for model={model_id}, files={file_count}")
            executor = TaskExecutor(input_data)
            background_tasks.add_task(self._run_pipeline_task, executor, model_id)
            return {"status": "success", "message": "Pipeline processing started in background."}
        except Exception as e:
            print(f"[PIPELINE] Error initiating pipeline: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def _query_documents(self, request: QueryRequest):
        try:
            print(f"Received query: '{request.query}' ({request.type}) - Lang: {request.language}")
            executor = TaskExecutor({"model_id": request.model_id})
            history = [m.model_dump() for m in request.chat_history]
            return StreamingResponse(
                executor.stream_query(
                    request.query,
                    type=request.type,
                    language=request.language,
                    mode=request.mode,
                    chat_history=history,
                ),
                media_type="text/plain",
            )
        except Exception as e:
            print(f"Error executing query: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def _get_rag_sources(self, model_id: str):
        path = self._rag_corpus_path(model_id)
        if path.exists():
            return {"data": self._read_corpus_entries(path)}
        try:
            rows = await load_sources_for_model(model_id)
            return {"data": [self._corpus_row_to_entry(r) for r in rows]}
        except Exception as e:
            print(f"[SOURCES] Postgres fallback failed for {model_id}: {e}")
            return {"data": []}

    async def _get_entity_graph(self, model_id: str):
        return {"data": {"entities": [], "relationships": [], "rag_stats": self._rag_index_stats(model_id)}}

    async def _get_processing_status(self, model_id: str):
        try:
            return self._compute_pipeline_status(model_id)
        except Exception as e:
            print(f"[STATUS] Error checking status for {model_id}: {e}")
            return {"status": "error", "message": str(e)}

    async def _upload_files(self, model_id: str, files: List[UploadFile] = File(...)):
        try:
            saved_files, skipped_files = await self._process_upload_files(model_id, files)
            if not saved_files:
                raise HTTPException(status_code=422, detail={"message": "No files were saved. All uploads were rejected.", "skipped": skipped_files})
            print(f"[UPLOAD] model={model_id}: {len(saved_files)} saved, {len(skipped_files)} skipped")
            return {"status": "success", "files": saved_files, "skipped": skipped_files}
        except HTTPException:
            raise
        except Exception as e:
            print(f"[UPLOAD] Unexpected error for model {model_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def _run_cleanup(self, hours: int = 24):
        try:
            count, errors = cleanup_old_data(retention_hours=hours)
            return {"status": "success", "deleted_count": count, "errors": errors, "message": f"Cleanup finished. Removed {count} old project directories."}
        except Exception as e:
            print(f"Cleanup failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))


api_instance = DIQECoreAPI()
app = api_instance.app


@app.middleware("http")
async def copyright_notice_middleware(request, call_next):
    response = await call_next(request)
    response.headers["X-Copyright"] = "(c) 2026 Mehul Sharma. All rights reserved."
    response.headers["X-License"] = "Proprietary - see LICENSE. Unauthorized use prohibited."
    return response


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
