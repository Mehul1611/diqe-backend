from __future__ import annotations

import threading

from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_postgres import PGEngine, PGVectorStore

from llmcore.constants import RAGConstants, VectorDBConstants

from .base import RetrievedChunk

_lock = threading.Lock()
_cache: dict[str, "PostgresPGVectorStore"] = {}


class PostgresPGVectorStore:
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.embeddings = FastEmbedEmbeddings(model_name=RAGConstants.EMBEDDING_MODEL)
        self.engine = PGEngine.from_connection_string(url=VectorDBConstants.CONNECTION_STRING)
        try:
            self.engine.init_vectorstore_table(
                table_name=VectorDBConstants.TABLE_NAME,
                vector_size=RAGConstants.EMBEDDING_DIMS,
            )
        except Exception:
            pass

        self.store = PGVectorStore.create_sync(
            engine=self.engine,
            table_name=VectorDBConstants.TABLE_NAME,
            embedding_service=self.embeddings,
        )

    @classmethod
    def get_instance(cls, model_id: str) -> "PostgresPGVectorStore":
        with _lock:
            if model_id not in _cache:
                if len(_cache) >= 2:
                    oldest_id = next(iter(_cache))
                    del _cache[oldest_id]
                _cache[model_id] = cls(model_id)
        return _cache[model_id]

    async def add_texts(self, texts: list[str], metadatas: list[dict], ids: list[str]) -> None:
        await self.store.aadd_texts(texts=texts, metadatas=metadatas, ids=ids)

    async def similarity_search(self, query: str, k: int, metadata_filter: dict | None = None) -> list[RetrievedChunk]:
        docs = await self.store.asimilarity_search(query=query, k=k, filter=metadata_filter)
        return [
            RetrievedChunk(id=(d.id or ""), text=d.page_content, metadata=d.metadata or {})
            for d in docs
        ]

    async def similarity_search_with_scores(
        self, query: str, k: int, metadata_filter: dict | None = None
    ) -> list[RetrievedChunk]:
        docs = await self.store.asimilarity_search_with_score(query=query, k=k, filter=metadata_filter)
        return [
            RetrievedChunk(id=(d.id or ""), text=d.page_content, metadata=d.metadata or {}, score=float(s))
            for d, s in docs
        ]

    async def list_chunks(self, metadata_filter: dict | None = None, limit: int = 10_000) -> list[RetrievedChunk]:
        bag = await self.store.aget(where=metadata_filter, limit=limit, include=["documents", "metadatas"])
        ids = bag.get("ids") or []
        docs = bag.get("documents") or []
        metas = bag.get("metadatas") or []
        out: list[RetrievedChunk] = []
        for i in range(min(len(ids), len(docs))):
            out.append(RetrievedChunk(id=str(ids[i]), text=str(docs[i]), metadata=metas[i] if i < len(metas) else {}))
        return out

