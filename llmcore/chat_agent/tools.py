from langchain_core.tools import tool
from llmcore.rag.retriever import VectorDBSearch


def get_tools(model_id: str):
    @tool
    async def search_documents(search_query: str) -> str:
        searcher = VectorDBSearch.get_instance(model_id)
        return await searcher.get_docs(search_query)

    return [search_documents]
