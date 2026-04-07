from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Any
from dotenv import load_dotenv
import os
import shutil
from pathlib import Path

load_dotenv()

from llmcore.main import TaskExecutor
import uvicorn
import asyncio

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
    type: str = "local" # 'local' or 'global'
    language: str = "English"
    mode: str = "fast" # 'fast' or 'thinking'

class ModelIdRequest(BaseModel):
    model_id: str

@app.get("/")
def health_check():
    return {"status": "ok", "message": "DIQE Core Service Running"}

@app.post("/process")
async def process_documents(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Triggers the ETL pipeline: Download -> Extract -> Graph Construction -> Indexing.
    """
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
    """
    Executes a GraphRAG search (Local or Global) against the indexed model.
    """
    try:
        input_data = {"model_id": request.model_id}
        query = request.query
        search_type = request.type
        
        print(f"Received query request: '{query}' ({search_type}) - Lang: {request.language}, Mode: {request.mode}")
        
        executor = TaskExecutor(input_data)

        return StreamingResponse(
            executor.stream_query(
                query, 
                type=search_type, 
                language=request.language, 
                mode=request.mode
            ), 
            media_type="text/plain"
        )
    except Exception as e:
        print(f"Error executing query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/{model_id}/sources")
def get_model_sources(model_id: str):
    """
    Retrieves the indexed source text units for visualization.
    """
    try:
        input_data = {"model_id": model_id}
        executor = TaskExecutor(input_data)
        sources = executor.get_sources()
        return {"status": "success", "data": sources}
    except Exception as e:
        print(f"Error serving sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/{model_id}/graph")
def get_model_graph(model_id: str):
    """
    Retrieves the indexed nodes and relationships for visualization.
    """
    try:
        input_data = {"model_id": model_id}
        executor = TaskExecutor(input_data)
        graph_data = executor.get_graph()
        return {"status": "success", "data": graph_data}
    except Exception as e:
        print(f"Error serving graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status/{model_id}")
async def get_processing_status(model_id: str):
    try:
        
        repo_root = Path(__file__).resolve().parents[1]
        output_dir = repo_root / "output" / model_id / "graphrag" / "output"

        def _exists_any(dir_path: Path, filenames: set[str]) -> bool:
            if not dir_path.exists():
                return False
            for root, _, files in os.walk(dir_path):
                if any(f in filenames for f in files):
                    return True
            return False

        if _exists_any(output_dir, {"entities.parquet", "relationships.parquet", "text_units.parquet", "stats.json"}):
            has_core = _exists_any(output_dir, {"entities.parquet", "text_units.parquet"}) or _exists_any(output_dir, {"relationships.parquet"})
            has_stats = _exists_any(output_dir, {"stats.json"})
            if has_core and has_stats:
                return {"status": "completed", "progress": 100, "message": "Indexing complete."}
        
        lance_dir = output_dir / "lancedb"
        if lance_dir.exists():
            return {"status": "indexing", "progress": 90, "message": "Starting LanceDB vector store..."}

        log_path = repo_root / "output" / model_id / "graphrag" / "logs" / "indexing-engine.log"
        if log_path.exists():
            with open(log_path, "r") as f:
                logs = f.readlines()
                last_logs = logs[-10:] if len(logs) > 10 else logs
                
                progress = 75
                message = "Indexing knowledge graph..."
                
                for log in reversed(last_logs):
                    if "create_final_communities" in log:
                        progress = 85
                        message = "Generating community reports..."
                        break
                    elif "create_base_entities" in log:
                        progress = 80
                        message = "Extracting entities and relationships..."
                        break
                    elif "create_base_text_units" in log:
                        progress = 70
                        message = "Partitioning text units..."
                        break
                
                return {"status": "indexing", "progress": progress, "message": message}

        input_dir = repo_root / "output" / model_id / "graphrag" / "input"
        if input_dir.exists() and any(input_dir.iterdir()):
            return {"status": "indexing", "progress": 60, "message": "GraphRAG pipeline started..."}
            
        extraction_dir = repo_root / "models" / model_id / "input"
        if extraction_dir.exists() and any(extraction_dir.iterdir()):
             return {"status": "construction", "progress": 50, "message": "Knowledge graph construction..."}
            
        return {"status": "pending", "progress": 0, "message": "Checking pipeline status..."}
    except Exception as e:
        print(f"Error checking status: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/upload/{model_id}")
async def upload_files(model_id: str, files: List[UploadFile] = File(...)):
    """
    Uploads source documents to the model's input directory.
    """
    try:
        input_dir = f"models/{model_id}/input"
        os.makedirs(input_dir, exist_ok=True)
        
        saved_files = []
        for file in files:
            file_location = f"{input_dir}/{file.filename}"
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            abs_path = os.path.abspath(file_location)
            saved_files.append({
                "filename": file.filename,
                "file_path": abs_path
            })
            
        print(f"Uploaded {len(saved_files)} files for model {model_id}")
        return {"status": "success", "files": saved_files}

    except Exception as e:
        print(f"Error uploading files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
