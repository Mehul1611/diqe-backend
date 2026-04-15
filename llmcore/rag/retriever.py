import threading

from llmcore.constants import RAGConstants
from llmcore.rag.store import get_rag_store

_lock = threading.Lock()
_cache: dict[str, "VectorDBSearch"] = {}

class VectorDBSearch:
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.store = get_rag_store(model_id)

    @classmethod
    def get_instance(cls, model_id: str) -> "VectorDBSearch":
        with _lock:
            if model_id not in _cache:
                if len(_cache) >= 2:
                    oldest_id = next(iter(_cache))
                    del _cache[oldest_id]
                _cache[model_id] = cls(model_id)
        return _cache[model_id]

    def _format_docs(self, docs: list) -> str:
        return f"\n{'-' * 100}\n".join(
            f"Document {i + 1}:\n{d.metadata.get('source', '')}\n{d.page_content}"
            for i, d in enumerate(docs)
        )

    async def get_docs(self, query: str) -> str:
        try:
            chunks = await self.store.similarity_search(
                query=query,
                k=RAGConstants.RETRIEVAL_TOP_K,
                metadata_filter={"model_id": self.model_id},
            )
            return self._format_docs(
                [
                    type("D", (), {"page_content": c.text, "metadata": c.metadata, "id": c.id})
                    for c in chunks
                ]
            ) if chunks else "No relevant context found."
        except Exception as e:
            print(e)
            return "No relevant context found."

    async def retrieve(self, query: str) -> list[str]:
        try:
            chunks = await self.store.similarity_search(
                query=query,
                k=RAGConstants.RETRIEVAL_TOP_K,
                metadata_filter={"model_id": self.model_id},
            )
            return [c.text for c in chunks]
        except Exception as e:
            print(e)
            return []

    async def retrieve_with_scores(self, query: str) -> tuple[list[str], float]:
        try:
            chunks = await self.store.similarity_search_with_scores(
                query=query,
                k=RAGConstants.RETRIEVAL_TOP_K,
                metadata_filter={"model_id": self.model_id},
            )
            if not chunks:
                return [], float("-inf")
            top = chunks[0].score
            top_score = float(top) if top is not None else 0.0
            return [c.text for c in chunks], top_score
        except Exception as e:
            print(e)
            return [], float("-inf")

    async def source_rows_async(self) -> list[dict]:
        """Rows shaped like corpus.jsonl lines: {id, text} for the Sources API."""
        rows = await self.store.list_chunks(metadata_filter={"model_id": self.model_id}, limit=10_000)
        return [{"id": r.id, "text": r.text} for r in rows]


async def load_sources_for_model(model_id: str) -> list[dict]:
    vs = VectorDBSearch.get_instance(model_id)
    return await vs.source_rows_async()
