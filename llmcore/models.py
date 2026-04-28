import logging
import os
import threading

import numpy as np
from fastembed import TextEmbedding
from fastembed.rerank.cross_encoder import TextCrossEncoder
from llmcore.constants import RAGConstants

logger = logging.getLogger(__name__)

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("FASTEMBED_DISABLE_PROGRESS_BAR", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


class _EmbeddingAdapter:
    def __init__(self, model: TextEmbedding):
        self._model = model

    def encode(self, text: str, normalize_embeddings: bool = True) -> np.ndarray:
        embeddings = list(self._model.embed([text]))
        return np.array(embeddings[0])

    def encode_batch(self, texts: list[str], normalize_embeddings: bool = True) -> list[np.ndarray]:
        embeddings = list(self._model.embed(texts))
        return [np.array(emb) for emb in embeddings]


class _RerankerAdapter:
    def __init__(self, model: TextCrossEncoder):
        self._model = model

    def predict(self, pairs: list) -> list[float]:
        if not pairs:
            return []
        query = pairs[0][0]
        if any(p[0] != query for p in pairs):
            return [s for p in pairs for s in self._model.rerank(p[0], [p[1]])]
        documents = [p[1] for p in pairs]
        return list(self._model.rerank(query, documents))


class ModelProvider:
    _embedding_model: "_EmbeddingAdapter | None" = None
    _reranker_model: "_RerankerAdapter | None" = None
    _lock = threading.Lock()
    _initialized = False

    @classmethod
    def preload_models(cls) -> None:
        if cls._initialized:
            return
        logger.info("Preloading ML models at startup...")
        try:
            cls.get_embedding_model()
            logger.info("Embedding model preloaded successfully")
        except Exception as e:
            logger.error("Failed to preload embedding model: %s", e)

    @classmethod
    def get_embedding_model(cls) -> _EmbeddingAdapter:
        with cls._lock:
            if cls._embedding_model is None:
                logger.info("Loading embedding model %s", RAGConstants.EMBEDDING_MODEL)
                model = TextEmbedding(
                    RAGConstants.EMBEDDING_MODEL,
                    cache_dir=os.environ.get("MODEL_CACHE_DIR", "/tmp/fastembed_cache"),
                )
                cls._embedding_model = _EmbeddingAdapter(model)
                cls._initialized = True
                logger.info("Embedding model ready.")
        return cls._embedding_model

    @classmethod
    def get_reranker_model(cls) -> _RerankerAdapter:
        with cls._lock:
            if cls._reranker_model is None:
                logger.info("Loading reranker model %s", RAGConstants.RERANKER_MODEL)
                model = TextCrossEncoder(
                    RAGConstants.RERANKER_MODEL,
                    cache_dir=os.environ.get("MODEL_CACHE_DIR", "/tmp/fastembed_cache"),
                )
                cls._reranker_model = _RerankerAdapter(model)
                logger.info("Reranker model ready.")
        return cls._reranker_model

    @classmethod
    def cleanup(cls) -> None:
        with cls._lock:
            cls._embedding_model = None
            cls._reranker_model = None
            cls._initialized = False
            logger.info("Model memory released")
