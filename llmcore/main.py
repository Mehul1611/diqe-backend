# Author: Mehul Sharma
# This code is for evaluation purposes only. Unauthorized use is prohibited.

from llmcore.data_processor.data_loader import DataLoader
from llmcore.data_processor.download_files import DownloadFiles
from llmcore.rag.indexer import RAGIndexer
from llmcore.rag.pipeline import RAGPipeline


class TaskExecutor:
    def __init__(self, input_data: dict):
        self.input_data = input_data

    async def setup(self):
        print("Setup started...")

        downloader = DownloadFiles(self.input_data)
        await downloader.download_all_files()

        loader = DataLoader(self.input_data)
        doc_generator = loader.extract_data()

        indexer = RAGIndexer(model_id=self.input_data["model_id"])
        await indexer.index_documents(doc_generator)

        print("Setup finished successfully.")

    async def query(
        self,
        query: str,
        language: str = "English",
        mode: str = "fast",
        chat_history: list | None = None,
    ):
        print(f"Invoking RAG pipeline for: '{query}' (Mode: {mode})")
        pipeline = RAGPipeline(
            model_id=self.input_data["model_id"], language=language, mode=mode
        )
        return await pipeline.execute(
            query, search_type="local", chat_history=chat_history or []
        )

    async def stream_query(
        self,
        query: str,
        type: str = "local",
        language: str = "English",
        mode: str = "fast",
        chat_history: list | None = None,
    ):
        pipeline = RAGPipeline(
            model_id=self.input_data["model_id"], language=language, mode=mode
        )
        async for chunk in pipeline.stream(
            query, search_type=type, chat_history=chat_history or []
        ):
            yield chunk
