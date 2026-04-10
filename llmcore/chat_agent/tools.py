from langchain_core.tools import tool
from llmcore.rag.retriever import HybridRetriever


def get_tools(model_id: str):
    @tool
    async def search_documents(search_query: str) -> str:
        """Search the indexed document knowledge base for relevant context. ONLY pass the search query."""
        retriever = HybridRetriever(model_id=model_id)
        chunks = retriever.retrieve(search_query)
        return "\n\n---\n\n".join(chunks) if chunks else "No relevant context found."

    return [search_documents]
