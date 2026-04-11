from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from llmcore.constants import ModelConstant, RAGConstants
from pathlib import Path
import chromadb
from chromadb.config import Settings
import json
import os


class RAGIndexer:
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.persist_dir = ModelConstant.PathConstant.RAG_OUTPUT_PATH.format(model_id=model_id)
        os.makedirs(self.persist_dir, exist_ok=True)

        self.embed_model = SentenceTransformer(RAGConstants.EMBEDDING_MODEL)
        self.client = chromadb.PersistentClient(
            path=self.persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"},
        )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=RAGConstants.CHUNK_SIZE,
            chunk_overlap=RAGConstants.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def index_documents(self, documents: list[dict]) -> int:
        """Index a list of {doc_id, text, title} dicts. Returns total chunks indexed."""
        all_ids, all_chunks, all_embeddings, all_metadatas = [], [], [], []

        for doc in documents:
            raw_chunks = self.splitter.split_text(doc["text"])
            for i, chunk in enumerate(raw_chunks):
                chunk_id = f"{doc['doc_id']}_{i}"
                embedding = self.embed_model.encode(
                    chunk, normalize_embeddings=True
                ).tolist()
                all_ids.append(chunk_id)
                all_chunks.append(chunk)
                all_embeddings.append(embedding)
                all_metadatas.append(
                    {"source": doc.get("title", "Unknown"), "doc_id": doc["doc_id"], "chunk_index": i}
                )

        batch = RAGConstants.INDEX_BATCH_SIZE
        for i in range(0, len(all_ids), batch):
            self.collection.upsert(
                ids=all_ids[i : i + batch],
                documents=all_chunks[i : i + batch],
                embeddings=all_embeddings[i : i + batch],
                metadatas=all_metadatas[i : i + batch],
            )

        corpus_path = Path(self.persist_dir) / "corpus.json"
        existing: list = json.loads(corpus_path.read_text()) if corpus_path.exists() else []
        existing.extend(
            [{"id": cid, "text": chunk} for cid, chunk in zip(all_ids, all_chunks)]
        )
        corpus_path.write_text(json.dumps(existing))

        marker = Path(self.persist_dir) / "index_complete.json"
        marker.write_text(json.dumps({"status": "complete", "chunk_count": len(existing)}))

        print(f"RAG indexing complete: {len(all_chunks)} new chunks, {len(existing)} total.")
        return len(all_chunks)

    def is_indexed(self) -> bool:
        return (Path(self.persist_dir) / "index_complete.json").exists()
