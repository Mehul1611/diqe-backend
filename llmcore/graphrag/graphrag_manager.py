from llmcore.constants import ModelConstant, GraphRAGConstant
from pathlib import Path
from llmcore.graphrag.graphrag_index import load_config, run_graphrag_index
from llmcore.utils.utils import clean_specific_folders

class GraphRAGManager:
    def __init__(self, model_id: str):
        self.model_id = model_id

    def _setup_graphrag_dir(self, graphrag_dir: Path) -> None:
        graphrag_config_path = GraphRAGConstant.PathConstant.GRAPHRAG_TEMPLATE_PATH
        shutil.copytree(graphrag_config_path, graphrag_dir, dirs_exist_ok=True)
        self.logger.info("Successfully copied GraphRAG Template")

    async def setup_graphrag(self) -> str:
        graphrag_dir = Path(ModelConstant.PathConstant.GRAPHRAG_FOLDER.format(model_id=self.model_id))
        self._setup_graphrag_dir(graphrag_dir)

        input_files = self._get_input_file_paths()
        if not input_files:
            print("No additional files found. Skipping GraphRAG setup")

        success_file_count, failed_file_count = self._process_all_files(input_files)
        
        print(f"Files processed successfully: {success_file_count}")
        print(f"Files failed: {failed_file_count}")

        config = load_config(root_dir=graphrag_dir)
        await self._run_graphrag_index(config)
        
        clean_specific_folders(base_path=graphrag_dir, folders=GraphRAGConstant.SETUP_FOLDERS_TO_CLEAN)
        print("GraphRAG Setup Completed")