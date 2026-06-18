from langchain_chroma import Chroma
from langchain_core.documents import Document as LCDocument

from app.core.config import settings
from app.rag.embeddings import get_embeddings


def get_vector_store(collection_name: str) -> Chroma:
    return Chroma(
        collection_name=collection_name,
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_persist_dir,
    )


def add_chunks(collection_name: str, chunks: list[LCDocument]) -> list[str]:
    if not chunks:
        return []
    store = get_vector_store(collection_name)
    return store.add_documents(chunks)


def delete_collection(collection_name: str) -> None:
    store = get_vector_store(collection_name)
    store.delete_collection()
