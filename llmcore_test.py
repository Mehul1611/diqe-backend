import asyncio
from llmcore.main import TaskExecutor

input_data = {
    "model_id": "dbe3efdd-f567-4c28-a022-545236edc585",
    "files_data":[
    {
        "doc_id": "doc-001-test",
        "file_path": "/Users/apple/Downloads/code/test/models/dbe3efdd-f567-4c28-a022-545236edc585/input/test_document.docx",
        "domain": "POLICY",
        "title": "Remote Work Policy 2024"
    },
    {
        "doc_id": "doc-002-test",
        "file_path": "/Users/apple/Downloads/code/test/models/dbe3efdd-f567-4c28-a022-545236edc585/input/test_pdf.pdf",
        "domain": "POLICY",
        "title": "Action to be taken"
    }
]
}

async def setup():
    print("Performing Setup")
    try:
        task_executor = TaskExecutor(input_data)
        await task_executor.setup()
        print("GraphRAG Setup Completed.")

    except Exception as e:
        print(f"Pipeline Failed: {e}")
        raise
    
async def model_inference():
    try:
        task_executor = TaskExecutor(input_data)
        query = "What is the policy on remote work eligibility?"
        print(f"\nTesting Query: {query}")
        await task_executor.query(query)

    except Exception as e:
        print(f"Pipeline Failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(model_inference())