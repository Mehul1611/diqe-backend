import chromadb
import gc
import json
import logging
import os
from chromadb.config import Settings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pathlib import Path
from llmcore.constants import ModelConstant, RAGConstants
from llmcore.models import ModelProvider
from llmcore.rag.retriever import HybridRetriever

logger = logging.getLogger(__name__)


class RAGIndexer:
    def __init__(self, model_id: str, user_id: str = "default"):
        self.model_id = model_id
        self.user_id = user_id
        self.persist_dir = ModelConstant.PathConstant.RAG_OUTPUT_PATH.format(
            user_id=user_id, model_id=model_id
        )
        os.makedirs(self.persist_dir, exist_ok=True)
        self._client = None
        self._collection = None
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=RAGConstants.CHUNK_SIZE,
            chunk_overlap=RAGConstants.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def _get_collection(self):
        if self._collection is None:
            self._client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_or_create_collection(
                name="documents",
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    @property
    def collection(self):
        return self._get_collection()

    def _restore_marker_if_indexed(self, marker: Path) -> None:
        try:
            count = self.collection.count()
        except Exception:
            count = 0
        if count > 0:
            marker.write_text(
                json.dumps({"status": "complete", "chunk_count": count}),
                encoding="utf-8",
            )
            logger.info("Restored index marker after failure (%d chunks in store).", count)

    async def index_documents(self, doc_iterator) -> int:
        embed_model = ModelProvider.get_embedding_model()
        total_indexed = 0
        docs_indexed = 0
        corpus_path = Path(self.persist_dir) / "corpus.jsonl"
        marker = Path(self.persist_dir) / "index_complete.json"
        progress_path = Path(self.persist_dir) / "index_progress.json"

        try:
            async for doc in doc_iterator:
                doc_id = doc["doc_id"]
                title = doc.get("title", "Unknown")
                text = (doc.get("text") or "").strip()
                if not text:
                    logger.warning("Skipping empty document: %s (%s)", title, doc_id)
                    continue

                logger.info("Indexing document: %s (%s)", title, doc_id)
                raw_chunks = self.splitter.split_text(text)
                if not raw_chunks:
                    logger.warning("No chunks produced for: %s (%s)", title, doc_id)
                    continue

                for batch_start in range(0, len(raw_chunks), RAGConstants.INDEX_BATCH_SIZE):
                    batch_end = min(batch_start + RAGConstants.INDEX_BATCH_SIZE, len(raw_chunks))
                    batch_chunks = raw_chunks[batch_start:batch_end]

                    embeddings = embed_model.encode_batch(batch_chunks, normalize_embeddings=True)

                    doc_ids = [f"{doc_id}_{batch_start + i}" for i in range(len(batch_chunks))]
                    doc_embeddings = [emb.tolist() for emb in embeddings]
                    doc_metadatas = [
                        {"source": title, "doc_id": doc_id, "chunk_index": batch_start + i}
                        for i in range(len(batch_chunks))
                    ]

                    self._save_batch(doc_ids, batch_chunks, doc_embeddings, doc_metadatas, corpus_path)
                    total_indexed += len(doc_ids)

                    progress_path.write_text(json.dumps({
                        "status": "indexing",
                        "chunks_indexed": total_indexed,
                        "current_doc": title,
                    }))

                    gc.collect()

                docs_indexed += 1

            if docs_indexed == 0:
                raise ValueError(
                    "No text could be extracted from the uploaded file(s). "
                    "Try a different PDF/DOCX or a text-based document."
                )

            try:
                chunk_count = self.collection.count()
            except Exception:
                chunk_count = total_indexed

            marker.write_text(
                json.dumps({"status": "complete", "chunk_count": chunk_count}),
                encoding="utf-8",
            )
            if progress_path.exists():
                progress_path.unlink()
            HybridRetriever.clear_cache(model_id=self.model_id, user_id=self.user_id)
            logger.info(
                "RAG indexing complete: %d new chunks, %d docs, %d total in store.",
                total_indexed,
                docs_indexed,
                chunk_count,
            )
            return total_indexed

        except Exception as e:
            logger.error("Indexing failed after %d chunks: %s", total_indexed, e)
            progress_path.write_text(json.dumps({
                "status": "failed",
                "chunks_indexed": total_indexed,
                "error": str(e),
            }))
            self._restore_marker_if_indexed(marker)
            HybridRetriever.clear_cache(model_id=self.model_id, user_id=self.user_id)
            raise

    def _save_batch(self, ids, chunks, embeddings, metadatas, corpus_path):
        self.collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        with open(corpus_path, "a", encoding="utf-8") as f:
            for cid, chunk, md in zip(ids, chunks, metadatas):
                f.write(json.dumps({
                    "id": cid,
                    "text": chunk,
                    "doc_id": md.get("doc_id"),
                    "source": md.get("source"),
                    "chunk_index": md.get("chunk_index"),
                }) + "\n")

    def is_indexed(self) -> bool:
        return (Path(self.persist_dir) / "index_complete.json").exists()
