from __future__ import annotations

import os
import threading
import uuid
from pathlib import Path

import chromadb
from chromadb.config import Settings
from fastembed import TextEmbedding

from llmcore.constants import RAGConstants

from .base import RetrievedChunk

_lock = threading.Lock()
_cache: dict[str, "LocalChromaStore"] = {}


class LocalChromaStore:

    def __init__(self, model_id: str):
        self.model_id = model_id
        persist_dir = Path(f"output/{model_id}/rag_local")
        os.makedirs(persist_dir, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=str(persist_dir),
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"},
        )
        self._embedder = TextEmbedding(RAGConstants.EMBEDDING_MODEL)

    @classmethod
    def get_instance(cls, model_id: str) -> "LocalChromaStore":
        with _lock:
            if model_id not in _cache:
                if len(_cache) >= 2:
                    oldest_id = next(iter(_cache))
                    del _cache[oldest_id]
                _cache[model_id] = cls(model_id)
        return _cache[model_id]

    async def add_texts(self, texts: list[str], metadatas: list[dict], ids: list[str]) -> None:
        embeddings = [e.tolist() for e in self._embedder.embed(texts)]
        self.collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    async def similarity_search(self, query: str, k: int, metadata_filter: dict | None = None) -> list[RetrievedChunk]:
        q_emb = next(self._embedder.embed([query])).tolist()
        res = self.collection.query(
            query_embeddings=[q_emb],
            n_results=min(k, self.collection.count()),
            where=metadata_filter,
        )
        ids = (res.get("ids") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        out: list[RetrievedChunk] = []
        for i in range(min(len(ids), len(docs))):
            out.append(RetrievedChunk(id=str(ids[i]), text=str(docs[i]), metadata=metas[i] if i < len(metas) else {}))
        return out

    async def similarity_search_with_scores(
        self, query: str, k: int, metadata_filter: dict | None = None
    ) -> list[RetrievedChunk]:
        q_emb = next(self._embedder.embed([query])).tolist()
        res = self.collection.query(
            query_embeddings=[q_emb],
            n_results=min(k, self.collection.count()),
            where=metadata_filter,
            include=["documents", "metadatas", "distances"],
        )
        ids = (res.get("ids") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        out: list[RetrievedChunk] = []
        for i in range(min(len(ids), len(docs))):
            score = None
            if i < len(dists) and dists[i] is not None:
                try:
                    score = 1.0 - float(dists[i])
                except Exception:
                    score = None
            out.append(
                RetrievedChunk(
                    id=str(ids[i]),
                    text=str(docs[i]),
                    metadata=metas[i] if i < len(metas) else {},
                    score=score,
                )
            )
        return out

    async def list_chunks(self, metadata_filter: dict | None = None, limit: int = 10_000) -> list[RetrievedChunk]:
        res = self.collection.get(
            where=metadata_filter,
            limit=limit,
            include=["documents", "metadatas"],
        )
        ids = res.get("ids") or []
        docs = res.get("documents") or []
        metas = res.get("metadatas") or []
        return [
            RetrievedChunk(id=str(ids[i]), text=str(docs[i]), metadata=metas[i] if i < len(metas) else {})
            for i in range(min(len(ids), len(docs)))
        ]


def new_ids(n: int) -> list[str]:
    return [str(uuid.uuid1()) for _ in range(n)]

