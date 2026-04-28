import gc
import json
import logging
from pathlib import Path
from llmcore.constants import ModelConstant
from llmcore.data_processor.data_loader import DataLoader
from llmcore.data_processor.download_files import DownloadFiles
from llmcore.rag.indexer import RAGIndexer
from llmcore.rag.pipeline import RAGPipeline
from llmcore.rag.retriever import HybridRetriever

logger = logging.getLogger(__name__)


class TaskExecutor:
    def __init__(self, input_data: dict):
        self.input_data = input_data

    async def setup(self):
        model_id = self.input_data.get("model_id")
        user_id = self.input_data.get("user_id", "default")
        logger.info("Setup started for model_id=%s", model_id)

        rag_dir = Path(ModelConstant.PathConstant.RAG_OUTPUT_PATH.format(
            user_id=user_id, model_id=model_id
        ))
        progress_path = rag_dir / "index_progress.json"

        try:
            HybridRetriever.clear_cache(model_id=model_id, user_id=user_id)

            downloader = DownloadFiles(self.input_data)
            await downloader.download_all_files()

            loader = DataLoader(self.input_data)
            doc_generator = loader.extract_data()

            indexer = RAGIndexer(
                model_id=model_id,
                user_id=user_id,
            )
            await indexer.index_documents(doc_generator)

            gc.collect()
            logger.info("Setup finished successfully for model_id=%s", model_id)

        except Exception as e:
            logger.error("Setup failed for model_id=%s: %s", model_id, e)
            rag_dir.mkdir(parents=True, exist_ok=True)
            progress_path.write_text(json.dumps({
                "status": "failed",
                "error": str(e),
                "chunks_indexed": 0,
            }))
            raise

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
