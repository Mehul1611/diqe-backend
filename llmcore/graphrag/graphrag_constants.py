"""GraphRAG paths and tuning (kept out of llmcore.constants)."""

from pathlib import Path

_PKG_DIR = Path(__file__).resolve().parent


class GraphRAGConstant:
    MODEL_PROVIDER = "groq"

    LANCEDB_URI = "lancedb"
    ENTITY_TABLE = "entities"
    COMMUNITY_TABLE = "communities"
    RELATIONSHIP_TABLE = "relationships"
    COMMUNITY_REPORT_TABLE = "community_reports"
    TEXT_UNIT_TABLE = "text_units"
    COMMUNITY_LEVEL = 2
    INDEX_NAME = "entity_description_embedding"

    MODEL_PARAMETERS = {"max_tokens": 4096}
    LOCAL_SEARCH_RESPONSE_TYPE = "Multiple Paragraphs"
    LOCAL_PARAMETERS = {
        "text_unit_prop": 0.3,
        "community_prop": 0.1,
        "conversation_history_max_turns": 5,
        "conversation_history_user_turns_only": True,
        "top_k_mapped_entities": 10,
        "top_k_relationships": 10,
        "include_entity_rankings": True,
        "include_relationship_weights": True,
        "include_community_rankings": True,
        "return_candidate_context": False,
    }

    SETUP_FOLDERS_TO_CLEAN = ["cache", "logs"]

    class PathConstant:
        GRAPHRAG_TEMPLATE_PATH = str(_PKG_DIR / "graphrag_template")
        GRAPHRAG_FOLDER = "output/{model_id}/graphrag"
        GRAPHRAG_OUTPUT_FOLDER = "output/{model_id}/graphrag/output"
