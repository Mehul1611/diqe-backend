import chromadb
import gc
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
MAX_CACHE_SIZE = 1


class HybridRetriever:
    def __init__(self, model_id: str, user_id: str = "default"):
        self.model_id = model_id
        self.user_id = user_id
        self._persist_dir = ModelConstant.PathConstant.RAG_OUTPUT_PATH.format(
            user_id=user_id, model_id=model_id
        )
        self._client = None
        self._collection = None
        self.corpus_ids: list[str] = []
        self.corpus_texts: list[str] = []
        self.bm25 = None
        self._load_corpus()

    def _get_collection(self):
        if self._collection is None:
            self._client = chromadb.PersistentClient(
                path=self._persist_dir,
                settings=Settings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_collection("documents")
        return self._collection

    @property
    def collection(self):
        return self._get_collection()

    def _load_corpus(self):
        corpus_path_jsonl = Path(self._persist_dir) / "corpus.jsonl"
        corpus_path_json = Path(self._persist_dir) / "corpus.json"

        corpus_ids = []
        corpus_texts = []

        if corpus_path_jsonl.exists():
            with open(corpus_path_jsonl, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        row = json.loads(line)
                        corpus_ids.append(row["id"])
                        corpus_texts.append(row["text"])
        elif corpus_path_json.exists():
            try:
                corpus = json.loads(corpus_path_json.read_text())
                for c in corpus:
                    corpus_ids.append(c["id"])
                    corpus_texts.append(c["text"])
            except Exception:
                pass

        self.corpus_ids = corpus_ids
        self.corpus_texts = corpus_texts

        if corpus_texts:
            tokenized = [t.lower().split() for t in corpus_texts]
            self.bm25 = BM25Okapi(tokenized)
            del tokenized
            gc.collect()

    @classmethod
    def get_instance(cls, model_id: str, user_id: str = "default") -> "HybridRetriever":
        cache_key = f"{user_id}/{model_id}"
        with _lock:
            if cache_key not in _cache:
                while len(_cache) >= MAX_CACHE_SIZE:
                    oldest_key = next(iter(_cache))
                    logger.info("Evicting retriever cache: %s", oldest_key)
                    del _cache[oldest_key]
                    gc.collect()
                _cache[cache_key] = cls(model_id, user_id)
            return _cache[cache_key]

    @classmethod
    def clear_cache(cls, model_id: str = None, user_id: str = None):
        with _lock:
            if model_id and user_id:
                cache_key = f"{user_id}/{model_id}"
                if cache_key in _cache:
                    del _cache[cache_key]
            else:
                _cache.clear()
            gc.collect()

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
