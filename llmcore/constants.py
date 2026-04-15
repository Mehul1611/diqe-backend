import os


class ModelConstant:
    class PathConstant:
        OUTPUT_PATH = "output/{model_id}/"
        INPUT_FOLDER = "models/{model_id}/input"
        EXTRACTED_FOLDER = os.path.join(OUTPUT_PATH, "extracted")
        RAG_OUTPUT_PATH = os.path.join(OUTPUT_PATH, "rag")


class VectorDBConstants:
    TABLE_NAME = os.environ.get("PGVECTOR_TABLE", "rag_documents")
    CONNECTION_STRING = os.environ.get("PGVECTOR_CONNECTION_STRING")

class RAGStoreConstants:
    DEFAULT_BACKEND = "local"


class RAGConstants:
    EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMS = 384
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 100
    RETRIEVAL_TOP_K = 10
    LOCAL_RETRIEVAL_FALLBACK_THRESHOLD = None
    WEB_SEARCH_MAX_RESULTS = 8


class LLMConstants:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    GROQ_CLIENT_BASE_URL = "https://api.groq.com"
    AGENT_CHAT_MODEL = "llama-3.3-70b-versatile"
    THINKING_CHAT_MODEL = "openai/gpt-oss-120b"
