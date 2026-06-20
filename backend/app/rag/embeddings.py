from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings


@lru_cache
def get_embeddings() -> HuggingFaceEmbeddings:
    """Local sentence-transformers embeddings - runs on CPU, no API key or quota."""
    return HuggingFaceEmbeddings(model_name=settings.hf_embedding_model)
