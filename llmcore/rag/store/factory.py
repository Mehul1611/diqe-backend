from __future__ import annotations

import os

from llmcore.constants import RAGStoreConstants

from .base import RAGStore
from .local_chroma import LocalChromaStore
from .postgres_pgvector import PostgresPGVectorStore


def get_rag_store(model_id: str) -> RAGStore:
    backend = (os.environ.get("RAG_BACKEND") or RAGStoreConstants.DEFAULT_BACKEND).strip().lower()
    if backend in ("postgres", "pg", "pgvector"):
        return PostgresPGVectorStore.get_instance(model_id)
    return LocalChromaStore(model_id)

