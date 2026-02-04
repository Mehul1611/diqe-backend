from llmcore.data_processor.download_files import DownloadFiles
from llmcore.data_processor.data_loader import DataLoader
from llmcore.graphrag.graphrag_manager import GraphRAGManager
from llmcore.graphrag.graphrag_search import GraphRAGSearch

class TaskExecutor:
    def __init__(self, input_data: list):
        self.input_data = input_data

    async def setup(self):
        print("Setup started...")
        
        downloader = DownloadFiles(self.input_data)
        await downloader.download_all_files()

        loader = DataLoader(self.input_data)
        await loader.extract_data()
        
        graphrag_manager = GraphRAGManager(self.input_data)
        await graphrag_manager.setup_graphrag()
        
        print("Setup finished successfully.")

    async def query(self, query: str):
        model_id = self.input_data["model_id"]
        print(f"Invoking GraphRAG search for: '{query}'")
        graphrag_search = GraphRAGSearch(model_id=model_id)
        response = await graphrag_search.local_search(query)
        return response

    def get_sources(self):
        model_id = self.input_data["model_id"]
        graphrag_search = GraphRAGSearch(model_id=model_id)
        return graphrag_search.get_text_units()

    def get_graph(self):
        model_id = self.input_data["model_id"]
        graphrag_search = GraphRAGSearch(model_id=model_id)
        return graphrag_search.get_graph_data()
