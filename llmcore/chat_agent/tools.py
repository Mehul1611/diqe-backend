from langchain_core.tools import tool
from llmcore.graphrag.graphrag_search import GraphRAGSearch

def get_tools(model_id: str):
    @tool
    async def search_knowledge_graph(search_query: str) -> str:
        """Useful to search the document knowledge database for context. ONLY pass the search query."""
        search = GraphRAGSearch(model_id=model_id)
        return await search.local_search(search_query)
        
    return [search_knowledge_graph]
