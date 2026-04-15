from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class RetrievedChunk:
    id: str
    text: str
    metadata: dict
    score: float | None = None


class RAGStore(Protocol):
    async def add_texts(
        self,
        texts: list[str],
        metadatas: list[dict],
        ids: list[str],
    ) -> None: ...

    async def similarity_search(
        self,
        query: str,
        k: int,
        metadata_filter: dict | None = None,
    ) -> list[RetrievedChunk]: ...

    async def similarity_search_with_scores(
        self,
        query: str,
        k: int,
        metadata_filter: dict | None = None,
    ) -> list[RetrievedChunk]: ...

    async def list_chunks(
        self,
        metadata_filter: dict | None = None,
        limit: int = 10_000,
    ) -> list[RetrievedChunk]: ...

