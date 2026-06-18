from langchain_core.vectorstores import VectorStoreRetriever

from app.rag.vector_store import get_vector_store


def get_retriever(collection_name: str, k: int = 6) -> VectorStoreRetriever:
    store = get_vector_store(collection_name)
    return store.as_retriever(search_type="mmr", search_kwargs={"k": k, "fetch_k": 20})


def retrieve_context(collection_name: str, query: str, k: int = 6) -> str:
    """Fetch the top-k chunks for a query and join them into a single context block."""
    retriever = get_retriever(collection_name, k=k)
    docs = retriever.invoke(query)
    if not docs:
        return "No relevant context found in the uploaded documents."
    return "\n\n---\n\n".join(
        f"[Source: {doc.metadata.get('doc_type', 'unknown')}, page "
        f"{doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )
