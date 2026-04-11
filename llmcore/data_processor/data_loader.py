import os
import csv
import asyncio
from pypdf import PdfReader
from docx import Document
from pptx import Presentation


class DataLoader:
    def __init__(self, input_data: dict):
        self.input_data = input_data
        self.model_id = input_data["model_id"]

    def _read_csv(self, path: str) -> str:
        content = []
        with open(path, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                content.append(", ".join(row))
        return "\n".join(content)

    def _read_txt(self, path: str) -> str:
        with open(path, encoding="utf-8") as f:
            return f.read()

    def _read_doc(self, path: str) -> str:
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)

    def _read_pdf(self, path: str) -> str:
        with open(path, "rb") as pdf:
            reader = PdfReader(pdf)
            return "".join(page.extract_text() or "" for page in reader.pages)

    def _read_ppt(self, path: str) -> str:
        pres = Presentation(path)
        slides = []
        for slide in pres.slides:
            slide_text = [
                shape.text.strip()
                for shape in slide.shapes
                if hasattr(shape, "text") and shape.text.strip()
            ]
            slides.append("\n".join(slide_text))
        return "\n\n".join(slides)

    def _get_file_handler(self, extension: str):
        return {
            ".pdf": self._read_pdf,
            ".csv": self._read_csv,
            ".doc": self._read_doc,
            ".docx": self._read_doc,
            ".ppt": self._read_ppt,
            ".pptx": self._read_ppt,
            ".txt": self._read_txt,
            ".md": self._read_txt,
        }.get(extension)

    def _extract_file_sync(self, item: dict) -> dict | None:
        file_path = item.get("file_path", "")
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return None

        extension = os.path.splitext(file_path)[1].lower()
        handler = self._get_file_handler(extension)
        if not handler:
            print(f"Unsupported file type: {file_path}")
            return None

        text = handler(file_path)
        return {
            "doc_id": item.get("doc_id", os.path.basename(file_path)),
            "title": item.get("title", os.path.basename(file_path)),
            "text": text,
        }

    async def _extract_file(self, item: dict) -> dict | None:
        try:
            return await asyncio.to_thread(self._extract_file_sync, item)
        except Exception as e:
            print(f"Failed to process {item.get('file_path')}: {e}")
            return None

    async def extract_data(self) -> list[dict]:
        print("Starting async text extraction...")
        tasks = [self._extract_file(item) for item in self.input_data["files_data"]]
        results = await asyncio.gather(*tasks)
        documents = [r for r in results if r is not None]
        print(f"Extraction completed. {len(documents)} files extracted.")
        return documents
