import asyncio
import csv
import os
from docx import Document
from pptx import Presentation
from pypdf import PdfReader


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

    @staticmethod
    def _best_page_text(pypdf_page: str, pymupdf_page: str) -> str:
        """Prefer the engine that returned more usable text (pypdf often keeps only headers)."""
        a = (pypdf_page or "").strip()
        b = (pymupdf_page or "").strip()
        if len(b) > len(a):
            return pymupdf_page or pypdf_page
        return pypdf_page or pymupdf_page

    def _read_pdf_pages_pymupdf(self, path: str) -> list[str]:
        import pymupdf

        doc = pymupdf.open(path)
        try:
            out: list[str] = []
            for page in doc:
                plain = page.get_text(sort=True) or ""
                if len(plain.strip()) >= 80:
                    out.append(plain)
                    continue
                blocks = page.get_text("blocks") or []
                merged = "\n".join(
                    str(b[4]).strip()
                    for b in blocks
                    if len(b) > 4 and str(b[4]).strip()
                )
                out.append(merged if len(merged) > len(plain.strip()) else plain)
            return out
        finally:
            doc.close()

    def _read_pdf_pages_pypdf(self, path: str) -> list[str]:
        pages: list[str] = []
        with open(path, "rb") as fp:
            reader = PdfReader(fp)
            for page in reader.pages:
                raw = ""
                try:
                    raw = page.extract_text(extraction_mode="layout") or ""
                except (TypeError, ValueError):
                    pass
                if not (raw or "").strip():
                    raw = page.extract_text() or ""
                pages.append(raw)
        return pages

    def _read_pdf_structured(self, path: str) -> dict:
        pages_py = self._read_pdf_pages_pypdf(path)

        pages_mu: list[str] | None = None
        try:
            import pymupdf  # noqa: F401

            pages_mu = self._read_pdf_pages_pymupdf(path)
        except ImportError:
            pass
        except Exception as e:
            print(f"PyMuPDF extraction failed for {path}: {e}")

        if pages_mu is None:
            pages = pages_py
        else:
            n = max(len(pages_py), len(pages_mu))
            pages = [
                self._best_page_text(
                    pages_py[i] if i < len(pages_py) else "",
                    pages_mu[i] if i < len(pages_mu) else "",
                )
                for i in range(n)
            ]

        parts = [(p or "").strip() for p in pages if (p or "").strip()]
        text = "\n\n".join(parts)
        if os.path.getsize(path) > 150_000 and len(text) < 500:
            print(
                f"[PDF] Only {len(text)} characters extracted from a large file ({path}). "
                "Body text may be inside images — OCR (e.g. Tesseract) would be needed for full content."
            )
        return {"text": text, "pages": pages}

    def _read_pdf(self, path: str) -> str:
        return self._read_pdf_structured(path)["text"]

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

        if extension == ".pdf":
            structured = self._read_pdf_structured(file_path)
            return {
                "doc_id": item.get("doc_id", os.path.basename(file_path)),
                "title": item.get("title", os.path.basename(file_path)),
                "text": structured["text"],
                "pages": structured["pages"],
            }

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

    async def extract_data(self):
        items = self.input_data.get("files_data", [])
        print(f"Starting parallel text extraction for {len(items)} file(s)...")
        results = await asyncio.gather(
            *[self._extract_file(item) for item in items],
            return_exceptions=True,
        )
        for item, result in zip(items, results):
            if isinstance(result, Exception):
                print(f"Error processing {item.get('file_path')}: {result}")
            elif result:
                pages = result.get("pages")
                if isinstance(pages, list) and pages:
                    body = "\n".join((p or "").strip() for p in pages if (p or "").strip())
                else:
                    body = (result.get("text") or "").strip()
                if not body:
                    print(
                        f"No extractable text from {item.get('file_path')} — "
                        "often image-only (scanned) PDFs; OCR would be required."
                    )
                    continue
                yield result
        print("Extraction finished.")
