from llmcore.constants import GraphRAGConstant, LLMConstants
from graphrag.query.context_builder.entity_extraction import EntityVectorStoreKey
from graphrag.query.indexer_adapters import (
    read_indexer_entities,
    read_indexer_relationships,
    read_indexer_reports,
    read_indexer_text_units,
)
from graphrag.query.structured_search.local_search.mixed_context import LocalSearchMixedContext
from graphrag.query.structured_search.local_search.search import LocalSearch
from graphrag_vectors.lancedb import LanceDBVectorStore
from graphrag_vectors.vector_store_config import VectorStoreConfig
from graphrag_llm.config import ModelConfig
from graphrag_llm.completion import create_completion
from graphrag_llm.embedding import create_embedding
from graphrag.tokenizer.get_tokenizer import get_tokenizer
from graphrag.tokenizer.get_tokenizer import Tokenizer
from typing import Tuple, Any, List
import pandas as pd
import numpy as np
import os

class GraphRAGSearch:
    def __init__(self, model_id: str) -> None:
        self.model_id = model_id

    def _get_chat_model(self) -> Tuple[Any, Any]:
        chat_config = ModelConfig(
            api_key=LLMConstants.OPENAI_API_KEY,
            model_provider=LLMConstants.MODEL_PROVIDER,
            model=LLMConstants.GRAPHRAG_CHAT_MODEL,
        )
        chat_model = create_completion(chat_config)
        tokenizer = get_tokenizer(chat_config)
        return chat_model, tokenizer
    
    def _get_embedding_model(self) -> Any:
        embedding_config = ModelConfig(
            api_key=LLMConstants.OPENAI_API_KEY,
            model_provider=LLMConstants.MODEL_PROVIDER,
            model=LLMConstants.EMBEDDINGS_MODEL,
        )
        text_embedder = create_embedding(embedding_config)
        return text_embedder
    
    def _read_parquet_files(self, file_path: str, required: bool = False) -> pd.DataFrame:
        file_name = os.path.basename(file_path)

        if not os.path.exists(file_path):
            if required:
                print(f"{file_name} not found at {file_path}")
                raise FileNotFoundError(f"{file_name} not found at {file_path}")

            print(f"{file_name} not found at {file_path}. Skipping.")
            return None

        print(f"Loading {file_name}")
        return pd.read_parquet(file_path)
    
    def _load_and_index_data(self) -> Tuple[List[Any], List[Any], List[Any], List[Any], Any]:
        base_dir = GraphRAGConstant.PathConstant.GRAPHRAG_OUTPUT_FOLDER.format(model_id=self.model_id)
        lance_uri = os.path.join(base_dir, GraphRAGConstant.LANCEDB_URI)
        
        entity_df = self._read_parquet_files(file_path=os.path.join(base_dir, f"{GraphRAGConstant.ENTITY_TABLE}.parquet"), required=True)
        community_df = self._read_parquet_files(file_path=os.path.join(base_dir, f"{GraphRAGConstant.COMMUNITY_TABLE}.parquet"), required=True)
        relationship_df = self._read_parquet_files(file_path=os.path.join(base_dir, f"{GraphRAGConstant.RELATIONSHIP_TABLE}.parquet"), required=True)
        report_df = self._read_parquet_files(file_path=os.path.join(base_dir, f"{GraphRAGConstant.COMMUNITY_REPORT_TABLE}.parquet"))
        text_unit_df = self._read_parquet_files(file_path=os.path.join(base_dir, f"{GraphRAGConstant.TEXT_UNIT_TABLE}.parquet"))

        entities = read_indexer_entities(entity_df, community_df, GraphRAGConstant.COMMUNITY_LEVEL)
        relationships = read_indexer_relationships(relationship_df)
        if report_df is not None:
            reports = read_indexer_reports(report_df, community_df, GraphRAGConstant.COMMUNITY_LEVEL)
        else:
            reports = []

        if text_unit_df is not None:
            text_units = read_indexer_text_units(text_unit_df)
        else:
            text_units = []

        description_embedding_store = LanceDBVectorStore(
            vector_store_schema_config=VectorStoreConfig(
                index_name=GraphRAGConstant.INDEX_NAME
            )
        )
        description_embedding_store.connect(db_uri=lance_uri)

        return entities, relationships, reports, text_units, description_embedding_store
    
    def _build_context(self, tokenizer: Tokenizer) -> LocalSearchMixedContext:
        entities, relationships, reports, text_units, description_embedding_store = self._load_and_index_data()
        return LocalSearchMixedContext(
            community_reports=reports,
            text_units=text_units,
            entities=entities,
            relationships=relationships,
            covariates=None,
            entity_text_embeddings=description_embedding_store,
            embedding_vectorstore_key=EntityVectorStoreKey.ID,
            text_embedder=self._get_embedding_model(),
            tokenizer=tokenizer,
        )
    
    def _init_search_engine(self) -> LocalSearch:
        local_context_params = GraphRAGConstant.LOCAL_PARAMETERS
        model_params = LLMConstants.MODEL_PARAMETERS

        chat_model, tokenizer = self._get_chat_model()
        context_builder = self._build_context(tokenizer)

        return LocalSearch(
            model=chat_model,
            context_builder=context_builder,
            tokenizer=tokenizer,
            model_params=model_params,
            context_builder_params=local_context_params,
            response_type=LLMConstants.LOCAL_SEARCH_RESPONSE_TYPE,
        )
    
    async def local_search(self, query: str) -> str:
        search_engine = self._init_search_engine()
        print(f"Running Knowledge Graph Tool Search")
        result = await search_engine.search(query)
        print(f"Tool Response: {result.response}")
        return result.response

    def _sanitize_data(self, data: List[dict]) -> List[dict]:
        """Convert numpy types and NaNs to standard JSON-compatible formats."""
        sanitized_data = []
        for record in data:
            sanitized_record = {}
            for key, value in record.items():
                if isinstance(value, np.ndarray):
                    sanitized_record[key] = value.tolist()
                elif isinstance(value, (np.int64, np.int32)):
                    sanitized_record[key] = int(value)
                elif isinstance(value, (np.float64, np.float32)):
                    sanitized_record[key] = float(value)
                elif pd.isna(value):
                    sanitized_record[key] = None
                else:
                    sanitized_record[key] = value
            sanitized_data.append(sanitized_record)
        return sanitized_data

    def get_text_units(self) -> List[dict]:
        base_dir = GraphRAGConstant.PathConstant.GRAPHRAG_OUTPUT_FOLDER.format(model_id=self.model_id)
        text_unit_df = self._read_parquet_files(file_path=os.path.join(base_dir, f"{GraphRAGConstant.TEXT_UNIT_TABLE}.parquet"))
        
        if text_unit_df is None or text_unit_df.empty:
            return []
            
        data = text_unit_df.reset_index().to_dict(orient="records")
        return self._sanitize_data(data)
    def get_graph_data(self) -> dict:
        base_dir = GraphRAGConstant.PathConstant.GRAPHRAG_OUTPUT_FOLDER.format(model_id=self.model_id)
        
        entity_df = self._read_parquet_files(file_path=os.path.join(base_dir, f"{GraphRAGConstant.ENTITY_TABLE}.parquet"))
        relationship_df = self._read_parquet_files(file_path=os.path.join(base_dir, f"{GraphRAGConstant.RELATIONSHIP_TABLE}.parquet"))
        
        entities = []
        if entity_df is not None and not entity_df.empty:
            entities = self._sanitize_data(entity_df.reset_index().to_dict(orient="records"))
            
        relationships = []
        if relationship_df is not None and not relationship_df.empty:
            relationships = self._sanitize_data(relationship_df.reset_index().to_dict(orient="records"))
            
        return {
            "entities": entities,
            "relationships": relationships
        }