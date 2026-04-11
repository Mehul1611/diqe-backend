import graphrag.api as api
import shutil
from graphrag.config.load_config import load_config
from pathlib import Path
from llmcore.graphrag.graphrag_constants import GraphRAGConstant
from llmcore.utils.utils import clean_specific_folders

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
            print("Starting GraphRAG indexing engine (this may take several minutes)...")
            result = await api.build_index(config=config)
            
            has_errors = False
            for workflow in result:
                if getattr(workflow, 'error', None):
                    has_errors = True
                    print(f"Workflow '{workflow.workflow}' encountered issues: {workflow.error}")
                else:
                    print(f"Workflow '{workflow.workflow}' completed successfully.")
            
            if has_errors:
                print("Note: Some indexing workflows reported errors. This is common with small datasets or hardware limitations. The knowledge graph might still be usable.")
        except Exception as e:
            print(f"GraphRAG indexing failed FATALLY: {e}")
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