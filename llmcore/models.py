import logging
import threading
import numpy as np
from fastembed import TextEmbedding
from llmcore.constants import RAGConstants

logger = logging.getLogger(__name__)


class _EmbeddingAdapter:
    def __init__(self, model: TextEmbedding):
        self._model = model

    def encode(self, text: str, normalize_embeddings: bool = True) -> np.ndarray:
        embeddings = list(self._model.embed([text]))
        return np.array(embeddings[0])


class _DummyReranker:
    def predict(self, pairs: list) -> list:
        return [0.0] * len(pairs)


class ModelProvider:
    _embedding_model: "_EmbeddingAdapter | None" = None
    _reranker_model: "_DummyReranker | None" = None
    _lock = threading.Lock()

    @classmethod
    def get_embedding_model(cls) -> _EmbeddingAdapter:
        with cls._lock:
            if cls._embedding_model is None:
                logger.info("Loading embedding model: %s", RAGConstants.EMBEDDING_MODEL)
                model = TextEmbedding(RAGConstants.EMBEDDING_MODEL)
                cls._embedding_model = _EmbeddingAdapter(model)
        return cls._embedding_model

    @classmethod
    def get_reranker_model(cls) -> _DummyReranker:
        with cls._lock:
            if cls._reranker_model is None:
                cls._reranker_model = _DummyReranker()
        return cls._reranker_model
