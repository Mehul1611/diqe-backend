from llmcore.rag.retriever import HybridRetriever
from llmcore.constants import LLMConstants
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

_RAG_SYSTEM_PROMPT = (
    "You are a precise, helpful AI assistant. "
    "Answer the user's question using ONLY the context chunks provided below. "
    "If the context does not contain enough information, clearly say so — do NOT fabricate answers. "
    "Be specific and accurate. Cite relevant details from the context when useful. "
    "You MUST respond in {language}."
)

_GLOBAL_SYSTEM_PROMPT = (
    "You are a knowledgeable AI assistant. "
    "Answer the user's question from your general knowledge. "
    "Be accurate, concise, and helpful. "
    "You MUST respond in {language}."
)


class RAGPipeline:
    def __init__(self, model_id: str, language: str = "English", mode: str = "fast"):
        self.model_id = model_id
        self.language = language
        self.llm = ChatGroq(
            model=LLMConstants.AGENT_CHAT_MODEL,
            api_key=LLMConstants.GROQ_API_KEY,
            temperature=0.0,
        )

    def _build_context(self, chunks: list[str]) -> str:
        return "\n\n---\n\n".join(f"[Source {i + 1}]\n{chunk}" for i, chunk in enumerate(chunks))

    async def stream(self, query: str, search_type: str = "local"):
        if search_type == "local":
            retriever = HybridRetriever(model_id=self.model_id)
            chunks = retriever.retrieve(query)
            context = self._build_context(chunks)
            messages = [
                SystemMessage(content=_RAG_SYSTEM_PROMPT.format(language=self.language)),
                HumanMessage(content=f"Context:\n{context}\n\nQuestion: {query}"),
            ]
        else:
            messages = [
                SystemMessage(content=_GLOBAL_SYSTEM_PROMPT.format(language=self.language)),
                HumanMessage(content=query),
            ]

        async for token in self.llm.astream(messages):
            if token.content:
                yield token.content

    async def execute(self, query: str, search_type: str = "local") -> str:
        result = ""
        async for chunk in self.stream(query, search_type):
            result += chunk
        return result
