from graphrag.query.context_builder.entity_extraction import EntityVectorStoreKey


class ModelConstant:
    class PathConstant:
        OUTPUT_PATH = "output/{model_id}/"
        INPUT_FOLDER = "models/{model_id}/input"


class GraphRAGConstant:
    INDEX_NAME = "default-entity-description"
    LANCEDB_URI = "lancedb"
    COMMUNITY_REPORT_TABLE = "community_reports"
    ENTITY_TABLE = "entities"
    COMMUNITY_TABLE = "communities"
    RELATIONSHIP_TABLE = "relationships"
    COVARIATE_TABLE = "covariates"
    TEXT_UNIT_TABLE = "text_units"
    COMMUNITY_LEVEL = 2

    LOCAL_PARAMETERS = {
        "text_unit_prop": 0.5,
        "top_k_mapped_entities": 10,
        "top_k_relationships": 10,
        "include_entity_rank": True,
        "include_relationship_weight": True,
        "conversation_history_user_turns_only": False,
        "embedding_vectorstore_key": EntityVectorStoreKey.ID,
        "max_tokens": 6000,
    }

    SETUP_FOLDERS_TO_CLEAN = ['cache', 'input', 'logs']
    INFERENCE_FOLDERS_TO_CLEAN = ["graphrag"]

    class PathConstant:
        GRAPHRAG_TEMPLATE_PATH = "llmcore/graphrag/graphrag_template"
        GRAPHRAG_FOLDER = os.path.join(ModelConstant.PathConstant.OUTPUT_PATH, "graphrag")
        GRAPHRAG_INPUT_FOLDER = os.path.join(GRAPHRAG_FOLDER, "input")
        GRAPHRAG_OUTPUT_FOLDER = os.path.join(GRAPHRAG_FOLDER, "output")


class LLMConstants:
    MODEL_PROVIDER = "openai"
    GRAPHRAG_CHAT_MODEL = "gpt-4.1-mini"
    EMBEDDINGS_MODEL = "text-embedding-3-small"
    CHAT_MODEL_NAME = "local_search"
    LOCAL_SEARCH_RESPONSE_TYPE = "multiple paragraphs"
    MODEL_PARAMETERS = {
        "max_tokens": 2_000,
        "temperature": 0.0,
    }
    CHAT_MODEL_MAX_RETRIES = 20
    EMBEDDING_MODEL_MAX_RETRIES = 20
    TEXT_EMBEDDER_NAME = "local_search_embedding"