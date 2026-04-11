from sentence_transformers import SentenceTransformer
from llmcore.constants import RAGConstants

class SentenceTransformerEmbedder:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.model = SentenceTransformer(RAGConstants.EMBEDDING_MODEL)
        return cls._instance

    def embed(self, text: str | list[str]) -> list[float] | list[list[float]]:
        result = self.model.encode(text)
        return result.tolist()

    async def aembed(self, text: str) -> list[float]:
        return self.model.encode(text).tolist()

    def __call__(self, text: str) -> list[float]:
        return self.model.encode(text).tolist()
