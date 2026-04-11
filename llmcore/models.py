import threading
from sentence_transformers import CrossEncoder, SentenceTransformer
from llmcore.constants import RAGConstants

class ModelProvider:
    _embedding_model = None
    _reranker_model = None
    _lock = threading.Lock()

    @classmethod
    def get_embedding_model(cls) -> SentenceTransformer:
        with cls._lock:
            if cls._embedding_model is None:
                print(f"Loading embedding model: {RAGConstants.EMBEDDING_MODEL}")
                cls._embedding_model = SentenceTransformer(RAGConstants.EMBEDDING_MODEL)
            return cls._embedding_model

    @classmethod
    def get_reranker_model(cls) -> CrossEncoder:
        with cls._lock:
            if cls._reranker_model is None:
                print(f"Loading reranker model: {RAGConstants.RERANKER_MODEL}")
                cls._reranker_model = CrossEncoder(RAGConstants.RERANKER_MODEL)
            return cls._reranker_model
