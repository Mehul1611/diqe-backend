import json
import os
import uuid
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter

from llmcore.constants import RAGConstants
from llmcore.rag.store import get_rag_store


class RAGIndexer:
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.persist_dir = Path(f"output/{model_id}/rag")
        os.makedirs(self.persist_dir, exist_ok=True)

        self.store = get_rag_store(model_id)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=RAGConstants.CHUNK_SIZE,
            chunk_overlap=RAGConstants.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    async def index_documents(self, doc_iterator) -> int:
        total_indexed = 0
        marker = self.persist_dir / "index_complete.json"
        corpus_path = self.persist_dir / "corpus.jsonl"

        if marker.exists():
            os.remove(marker)
        if corpus_path.exists():
            corpus_path.unlink()

        async for doc in doc_iterator:
            doc_id = doc["doc_id"]
            title = doc.get("title", "Unknown")
            pages = doc.get("pages")
            raw_chunks: list[str] = []
            chunk_pages: list[int] = []

            if isinstance(pages, list) and pages:
                for page_num, page_text in enumerate(pages, start=1):
                    p = (page_text or "").strip()
                    if not p:
                        continue
                    for part in self.splitter.split_text(p):
                        raw_chunks.append(part)
                        chunk_pages.append(page_num)
            else:
                raw_chunks = self.splitter.split_text(doc["text"])
                chunk_pages = [0] * len(raw_chunks)

            if not raw_chunks:
                continue

            print(f"Indexing document: {title} ({doc_id}) — {len(raw_chunks)} chunks")

            metadatas = []
            for i, page in enumerate(chunk_pages):
                meta = {
                    "model_id": self.model_id,
                    "source": title,
                    "doc_id": doc_id,
                    "chunk_index": i,
                }
                if page > 0:
                    meta["page"] = page
                metadatas.append(meta)
            ids = [str(uuid.uuid1()) for _ in raw_chunks]

            await self.store.add_texts(texts=raw_chunks, metadatas=metadatas, ids=ids)
            total_indexed += len(raw_chunks)
            with open(corpus_path, "a", encoding="utf-8") as f:
                for cid, chunk in zip(ids, raw_chunks):
                    f.write(json.dumps({"id": cid, "text": chunk}) + "\n")

        marker.write_text(
            json.dumps({"status": "complete", "chunk_count": total_indexed})
        )
        print(f"RAG indexing complete: {total_indexed} total chunks.")
        if total_indexed == 0:
            print(
                "RAG indexing: 0 chunks — no documents reached the indexer, or "
                "all files had no extractable text after splitting."
            )
        return total_indexed

    def is_indexed(self) -> bool:
        return (self.persist_dir / "index_complete.json").exists()
