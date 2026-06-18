from langchain_core.documents import Document as LCDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def split_documents(
    documents: list[LCDocument], *, startup_id: str, doc_id: str, doc_type: str
) -> list[LCDocument]:
    chunks = _splitter.split_documents(documents)
    for chunk in chunks:
        chunk.metadata.update(
            {"startup_id": startup_id, "document_id": doc_id, "doc_type": doc_type}
        )
    return chunks
