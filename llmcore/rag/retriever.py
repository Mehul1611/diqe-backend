import chromadb
import json
import logging
import numpy as np
import threading
from chromadb.config import Settings
from pathlib import Path
from rank_bm25 import BM25Okapi
from llmcore.constants import ModelConstant, RAGConstants
from llmcore.models import ModelProvider

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_cache: dict[str, "HybridRetriever"] = {}


class HybridRetriever:
    def __init__(self, model_id: str, user_id: str = "default"):
        self.model_id = model_id
        self.user_id = user_id
        persist_dir = ModelConstant.PathConstant.RAG_OUTPUT_PATH.format(
            user_id=user_id, model_id=model_id
        )
        client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = client.get_collection("documents")
        corpus_path_jsonl = Path(persist_dir) / "corpus.jsonl"
        corpus_path_json = Path(persist_dir) / "corpus.json"
        corpus = []
        if corpus_path_jsonl.exists():
            with open(corpus_path_jsonl, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        corpus.append(json.loads(line))
        elif corpus_path_json.exists():
            try:
                corpus = json.loads(corpus_path_json.read_text())
            except Exception:
                corpus = []
        self.corpus_ids: list[str] = [c["id"] for c in corpus]
        self.corpus_texts: list[str] = [c["text"] for c in corpus]
        tokenized = [t.lower().split() for t in self.corpus_texts]
        self.bm25 = BM25Okapi(tokenized)

    @classmethod
    def get_instance(cls, model_id: str, user_id: str = "default") -> "HybridRetriever":
        cache_key = f"{user_id}/{model_id}"
        with _lock:
            if cache_key not in _cache:
                if len(_cache) >= 2:
                    oldest_key = next(iter(_cache))
                    del _cache[oldest_key]
                _cache[cache_key] = cls(model_id, user_id)
            return _cache[cache_key]

    def retrieve(self, query: str) -> list[str]:
        chunks, _ = self.retrieve_with_scores(query)
        return chunks

    def retrieve_with_scores(self, query: str) -> tuple[list[str], float]:
        n = min(RAGConstants.RETRIEVAL_TOP_K, self.collection.count())
        if n == 0:
            return [], float("-inf")
        embed_model = ModelProvider.get_embedding_model()
        q_emb = embed_model.encode(query, normalize_embeddings=True).tolist()
        sem = self.collection.query(query_embeddings=[q_emb], n_results=n)
        sem_ids: list[str] = sem["ids"][0]
        sem_texts: list[str] = sem["documents"][0]
        scores = self.bm25.get_scores(query.lower().split())
        top_idx = np.argsort(scores)[::-1][:n]
        bm25_ids = [self.corpus_ids[i] for i in top_idx]
        bm25_texts = [self.corpus_texts[i] for i in top_idx]
        id_to_text: dict[str, str] = {**dict(zip(sem_ids, sem_texts)), **dict(zip(bm25_ids, bm25_texts))}
        rrf: dict[str, float] = {}
        k = 60
        for rank, cid in enumerate(sem_ids):
            rrf[cid] = rrf.get(cid, 0.0) + 1.0 / (k + rank + 1)
        for rank, cid in enumerate(bm25_ids):
            rrf[cid] = rrf.get(cid, 0.0) + 1.0 / (k + rank + 1)
        candidates = [id_to_text[cid] for cid in sorted(rrf, key=rrf.get, reverse=True) if cid in id_to_text]
        top_score = float("-inf")
        if len(candidates) > 1:
            pairs = [(query, c) for c in candidates]
            reranker = ModelProvider.get_reranker_model()
            rerank_scores = reranker.predict(pairs)
            sorted_pairs = sorted(zip(rerank_scores, candidates), reverse=True)
            top_score = float(sorted_pairs[0][0])
            candidates = [c for _, c in sorted_pairs]
        elif len(candidates) == 1:
            reranker = ModelProvider.get_reranker_model()
            top_score = float(reranker.predict([(query, candidates[0])])[0])
        return candidates[: RAGConstants.RERANK_TOP_K], top_score
