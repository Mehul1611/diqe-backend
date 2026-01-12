from llmcore.data_processor.download_files import DownloadFiles
from llmcore.data_processor.data_loader import DataLoader
from llmcore.graphrag.graphrag_manager import GraphRAGManager

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
