from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Any
from dotenv import load_dotenv
import os
import shutil

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
        # Run processing in background to unblock UI
        # MOCK MODE: Prevent OpenAI billing by commenting out actual execution
        # background_tasks.add_task(executor.setup)
        
        # Simulate processing time
        async def mock_processing():
            import asyncio
            print("MOCK: Starting processing simulation...")
            await asyncio.sleep(5)
            print("MOCK: Processing simulation completed.")
            
        background_tasks.add_task(mock_processing)
        
        return {"status": "success", "message": "Pipeline processing started in background (MOCK MODE)."}
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
        
        print(f"Received query request: '{query}' ({search_type})")
        
        # executor = TaskExecutor(input_data)
        # response = await executor.query(query)
        
        response = f"MOCK RESPONSE: OpenAI API is disabled. You asked: '{query}'."
        
        return {"status": "success", "answer": response}
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

@app.post("/upload/{model_id}")
async def upload_files(model_id: str, files: List[UploadFile] = File(...)):
    """
    Uploads source documents to the model's input directory.
    """
    try:
        # Define input directory
        input_dir = f"models/{model_id}/input"
        os.makedirs(input_dir, exist_ok=True)
        
        saved_files = []
        for file in files:
            file_location = f"{input_dir}/{file.filename}"
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # create absolute path for return
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
