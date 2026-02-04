from graphrag.config.load_config import load_config
import graphrag.api as api
from llmcore.constants import GraphRAGConstant
from llmcore.utils.utils import clean_specific_folders
from pathlib import Path
import shutil

class GraphRAGManager:
    def __init__(self, input_data: list):
        self.model_id = input_data["model_id"]
        self.files_data = input_data["files_data"]

    def _setup_graphrag_dir(self, graphrag_dir: Path) -> None:
        graphrag_config_path = GraphRAGConstant.PathConstant.GRAPHRAG_TEMPLATE_PATH
        shutil.copytree(graphrag_config_path, graphrag_dir, dirs_exist_ok=True)
        print("Successfully copied GraphRAG Template")

    def _get_input_file_paths(self) -> list:
        input_files = []
        for file_data in self.files_data:
            input_files.append(file_data["file_path"])
        return input_files

    async def _run_graphrag_index(self, config):
        try:
            result = await api.build_index(config=config)
            for workflow in result:
                print(f"{workflow.workflow}: Errors: {workflow.errors}")
        except Exception:
            print("GraphRAG indexing failed")
            raise
    
    async def setup_graphrag(self) -> str:
        graphrag_dir = Path(GraphRAGConstant.PathConstant.GRAPHRAG_FOLDER.format(model_id=self.model_id))
        self._setup_graphrag_dir(graphrag_dir)

        input_files = self._get_input_file_paths()
        if not input_files:
            print("No additional files found. Skipping GraphRAG setup")
            return

        config = load_config(root_dir=graphrag_dir)
        await self._run_graphrag_index(config)
        
        clean_specific_folders(base_path=graphrag_dir, folders=GraphRAGConstant.SETUP_FOLDERS_TO_CLEAN)
        print("GraphRAG Setup Completed")