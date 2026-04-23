import os


class ModelConstant:
    class PathConstant:
        OUTPUT_PATH = "output/{user_id}/{model_id}/"
        INPUT_FOLDER = "models/{user_id}/{model_id}/input"
        RAG_OUTPUT_PATH = "output/{user_id}/{model_id}/rag"


class VectorDBConstants:
    TABLE_NAME = os.environ.get("PGVECTOR_TABLE", "rag_documents")
    CONNECTION_STRING = os.environ.get("PGVECTOR_CONNECTION_STRING")

class RAGStoreConstants:
    DEFAULT_BACKEND = "local"


class RAGConstants:
    EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
    RERANKER_MODEL = "Xenova/ms-marco-MiniLM-L-6-v2"
    EMBEDDING_DIMS = 384
    INDEX_BATCH_SIZE = 32
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 100
    RETRIEVAL_TOP_K = 10
    RERANK_TOP_K = 5
    WEB_SEARCH_MAX_RESULTS = 8
    WEB_QUERY_CHAR_LIMIT = 200


class GenerationConstants:
    FAST_MAX_TOKENS = 2048
    FAST_RAG_TEMPERATURE = 0.0
    FAST_WEB_TEMPERATURE = 0.2
    THINKING_MAX_TOKENS = 4096
    THINKING_TEMPERATURE = 0.8


class LLMConstants:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    GROQ_CLIENT_BASE_URL = "https://api.groq.com"
    AGENT_CHAT_MODEL = "llama-3.3-70b-versatile"
    THINKING_CHAT_MODEL = "openai/gpt-oss-120b"
