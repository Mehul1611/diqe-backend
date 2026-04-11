from llmcore.models import ModelProvider
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

    async def index_documents(self, doc_iterator) -> int:
        embed_model = ModelProvider.get_embedding_model()
        total_indexed = 0
        corpus_path = Path(self.persist_dir) / "corpus.jsonl"
        marker = Path(self.persist_dir) / "index_complete.json"
        
        if marker.exists():
            os.remove(marker)

        async for doc in doc_iterator:
            doc_id = doc["doc_id"]
            title = doc.get("title", "Unknown")
            print(f"Indexing document: {title} ({doc_id})")
            raw_chunks = self.splitter.split_text(doc["text"])
            doc_ids, doc_chunks, doc_embeddings, doc_metadatas = [], [], [], []
            
            for i, chunk in enumerate(raw_chunks):
                chunk_id = f"{doc_id}_{i}"
                embedding = embed_model.encode(
                    chunk, normalize_embeddings=True
                ).tolist()
                
                doc_ids.append(chunk_id)
                doc_chunks.append(chunk)
                doc_embeddings.append(embedding)
                doc_metadatas.append({"source": title, "doc_id": doc_id, "chunk_index": i})
                
                if len(doc_ids) >= RAGConstants.INDEX_BATCH_SIZE:
                    self._save_batch(doc_ids, doc_chunks, doc_embeddings, doc_metadatas, corpus_path)
                    total_indexed += len(doc_ids)
                    doc_ids, doc_chunks, doc_embeddings, doc_metadatas = [], [], [], []

            if doc_ids:
                self._save_batch(doc_ids, doc_chunks, doc_embeddings, doc_metadatas, corpus_path)
                total_indexed += len(doc_ids)

        marker.write_text(json.dumps({"status": "complete", "chunk_count": total_indexed}))
        print(f"RAG indexing complete: {total_indexed} total chunks.")
        return total_indexed

    def _save_batch(self, ids, chunks, embeddings, metadatas, corpus_path):
        self.collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        with open(corpus_path, "a", encoding="utf-8") as f:
            for cid, chunk in zip(ids, chunks):
                f.write(json.dumps({"id": cid, "text": chunk}) + "\n")

    def is_indexed(self) -> bool:
        return (Path(self.persist_dir) / "index_complete.json").exists()
