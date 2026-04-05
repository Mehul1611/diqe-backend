import os
import csv
import asyncio
from pypdf import PdfReader
from docx import Document
from pptx import Presentation
from llmcore.constants import GraphRAGConstant

class DataLoader:
    def __init__(self, input_data: list):
        self.input_data = input_data
        self.model_id = input_data["model_id"]

    def _read_csv(self, path: str) -> str:
        content = []
        with open(path, mode='r', encoding='utf-8') as f:
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
            slide_text = []
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_text.append(shape.text.strip())
            slides.append("\n".join(slide_text))
        return "\n\n".join(slides)

    def _get_file_handler(self, extension: str): 
        file_handlers = {
            ".pdf": self._read_pdf,
            ".csv": self._read_csv,
            ".doc": self._read_doc,
            ".docx": self._read_doc,
            ".ppt": self._read_ppt,
            ".pptx": self._read_ppt,
            ".txt": self._read_txt,
            ".md": self._read_txt,
        }
        return file_handlers.get(extension)

    def _process_file_sync(self, file_path: str):
        try:
            if not os.path.exists(file_path):
                 print(f"File not found: {file_path}")
                 return False

            extension = os.path.splitext(file_path)[1].lower()
            file_handler = self._get_file_handler(extension)

            if not file_handler:
                print(f"Unsupported file type: {file_path}")
                return True

            output_dir = GraphRAGConstant.PathConstant.GRAPHRAG_INPUT_FOLDER.format(model_id=self.model_id)
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"{os.path.splitext(os.path.basename(file_path))[0]}.txt")

            if os.path.exists(output_path):
                print(f"Skipping existing file: {output_path}")
                return True

            content = file_handler(file_path)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(content)
            return True

        except Exception as e:
            print(f"Failed to process {file_path}: {e}")
            raise
    
    async def _process_file(self, item: dict):
        file_path = item.get("file_path")
        try:
            return await asyncio.to_thread(self._process_file_sync, file_path)

        except Exception as e:
            print(f"Failed to process {file_path}: {e}")
            return False

    async def extract_data(self):
        print("Starting async text extraction...")
        tasks = [self._process_file(item) for item in self.input_data["files_data"]]
        results = await asyncio.gather(*tasks)
        print(f"Extraction completed. Processed: {sum(results)} files.")