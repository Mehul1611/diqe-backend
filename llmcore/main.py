# Author: Mehul Sharma
# This code is for evaluation purposes only. Unauthorized use is prohibited.

import logging
import llmcore.logger

from llmcore.data_processor.data_loader import DataLoader
from llmcore.data_processor.download_files import DownloadFiles
from llmcore.rag.indexer import RAGIndexer
from llmcore.rag.pipeline import RAGPipeline

logger = logging.getLogger(__name__)


class TaskExecutor:
    def __init__(self, input_data: dict):
        self.input_data = input_data

    async def setup(self):
        logger.info("Setup started for model_id=%s", self.input_data.get("model_id"))

        downloader = DownloadFiles(self.input_data)
        await downloader.download_all_files()

        loader = DataLoader(self.input_data)
        doc_generator = loader.extract_data()

        indexer = RAGIndexer(
            model_id=self.input_data["model_id"],
            user_id=self.input_data.get("user_id", "default"),
        )
        await indexer.index_documents(doc_generator)

        logger.info("Setup finished successfully for model_id=%s", self.input_data.get("model_id"))

    async def query(
        self,
        query: str,
        search_type: str = "local",
        language: str = "English",
        mode: str = "fast",
    ):
        logger.info("Invoking RAG pipeline for: '%s' (Mode: %s)", query, mode)
        pipeline = RAGPipeline(
            model_id=self.input_data["model_id"],
            user_id=self.input_data.get("user_id", "default"),
            language=language,
            mode=mode,
        )
        return await pipeline.execute(query, search_type=search_type)

    async def stream_query(
        self,
        query: str,
        search_type: str = "local",
        language: str = "English",
        mode: str = "fast",
    ):
        pipeline = RAGPipeline(
            model_id=self.input_data["model_id"],
            user_id=self.input_data.get("user_id", "default"),
            language=language,
            mode=mode,
        )
        async for chunk in pipeline.stream(query, search_type=search_type):
            yield chunk
