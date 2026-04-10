from sentence_transformers import SentenceTransformer, CrossEncoder
from llmcore.constants import RAGConstants
from pathlib import Path
from rank_bm25 import BM25Okapi
import chromadb
import numpy as np
import json


class HybridRetriever:
    """
    Retrieval pipeline:
      1. Semantic search  — dense vector similarity via ChromaDB
      2. Keyword search   — sparse BM25 over the stored corpus
      3. Fusion           — Reciprocal Rank Fusion merges both result lists
      4. Reranking        — cross-encoder scores candidates and returns top-k
    """

    def __init__(self, model_id: str):
        self.model_id = model_id
        persist_dir = RAGConstants.RAG_OUTPUT_PATH.format(model_id=model_id)

        self.embed_model = SentenceTransformer(RAGConstants.EMBEDDING_MODEL)
        self.reranker = CrossEncoder(RAGConstants.RERANKER_MODEL)

        client = chromadb.PersistentClient(path=persist_dir)
        self.collection = client.get_collection("documents")

        corpus_path = Path(persist_dir) / "corpus.json"
        corpus = json.loads(corpus_path.read_text())
        self.corpus_ids: list[str] = [c["id"] for c in corpus]
        self.corpus_texts: list[str] = [c["text"] for c in corpus]
        tokenized = [t.lower().split() for t in self.corpus_texts]
        self.bm25 = BM25Okapi(tokenized)

    def retrieve(self, query: str) -> list[str]:
        n = min(RAGConstants.RETRIEVAL_TOP_K, self.collection.count())

        # 1. Semantic
        q_emb = self.embed_model.encode(query, normalize_embeddings=True).tolist()
        sem = self.collection.query(query_embeddings=[q_emb], n_results=n)
        sem_ids: list[str] = sem["ids"][0]
        sem_texts: list[str] = sem["documents"][0]

        # 2. BM25
        scores = self.bm25.get_scores(query.lower().split())
        top_idx = np.argsort(scores)[::-1][:n]
        bm25_ids = [self.corpus_ids[i] for i in top_idx]
        bm25_texts = [self.corpus_texts[i] for i in top_idx]

        # 3. Reciprocal Rank Fusion
        id_to_text: dict[str, str] = {**dict(zip(sem_ids, sem_texts)), **dict(zip(bm25_ids, bm25_texts))}
        rrf: dict[str, float] = {}
        k = 60
        for rank, cid in enumerate(sem_ids):
            rrf[cid] = rrf.get(cid, 0.0) + 1.0 / (k + rank + 1)
        for rank, cid in enumerate(bm25_ids):
            rrf[cid] = rrf.get(cid, 0.0) + 1.0 / (k + rank + 1)

        candidates = [id_to_text[cid] for cid in sorted(rrf, key=rrf.get, reverse=True) if cid in id_to_text]

        # 4. Cross-encoder rerank
        if len(candidates) > 1:
            pairs = [(query, c) for c in candidates]
            rerank_scores = self.reranker.predict(pairs)
            candidates = [c for _, c in sorted(zip(rerank_scores, candidates), reverse=True)]

        return candidates[: RAGConstants.RERANK_TOP_K]
