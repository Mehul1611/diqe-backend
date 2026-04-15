from langchain_community.embeddings import FastEmbedEmbeddings
from llmcore.constants import RAGConstants


def get_embedding_model() -> FastEmbedEmbeddings:
    return FastEmbedEmbeddings(model_name=RAGConstants.EMBEDDING_MODEL)
