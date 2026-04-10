import os


class ModelConstant:
    class PathConstant:
        OUTPUT_PATH = "output/{model_id}/"
        INPUT_FOLDER = "models/{model_id}/input"
        EXTRACTED_FOLDER = os.path.join(OUTPUT_PATH, "extracted")


class RAGConstants:
    RAG_OUTPUT_PATH = os.path.join(ModelConstant.PathConstant.OUTPUT_PATH, "rag")

    EMBEDDING_MODEL = "BAAI/bge-base-en-v1.5"
    EMBEDDING_DIMS = 768

    RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 100
    INDEX_BATCH_SIZE = 100

    RETRIEVAL_TOP_K = 15
    RERANK_TOP_K = 5


class LLMConstants:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    AGENT_CHAT_MODEL = "llama-3.3-70b-versatile"
