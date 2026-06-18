import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.document import Document, DocumentStatus, DocumentType
from app.rag.loader import load_pdf
from app.rag.splitter import split_documents
from app.rag.vector_store import add_chunks
from app.utils.exceptions import DocumentProcessingError

logger = get_logger(__name__)


async def create_document_record(
    db: AsyncSession,
    *,
    startup_id: uuid.UUID,
    filename: str,
    file_path: str,
    doc_type: DocumentType,
) -> Document:
    document = Document(
        startup_id=startup_id,
        filename=filename,
        file_path=file_path,
        doc_type=doc_type,
        status=DocumentStatus.UPLOADED,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


async def process_document(
    db: AsyncSession, document: Document, *, chroma_collection: str
) -> Document:
    """Load, chunk, embed, and index a single document into the startup's ChromaDB collection."""
    document.status = DocumentStatus.PROCESSING
    await db.commit()

    try:
        raw_docs = load_pdf(document.file_path)
        chunks = split_documents(
            raw_docs,
            startup_id=str(document.startup_id),
            doc_id=str(document.id),
            doc_type=document.doc_type.value,
        )
        add_chunks(chroma_collection, chunks)

        document.status = DocumentStatus.INDEXED
        document.chunk_count = len(chunks)
        document.error_message = None
    except DocumentProcessingError as exc:
        logger.error("document_processing_failed", document_id=str(document.id), error=str(exc))
        document.status = DocumentStatus.FAILED
        document.error_message = str(exc)

    await db.commit()
    await db.refresh(document)
    return document


async def list_documents_for_startup(db: AsyncSession, startup_id: uuid.UUID) -> list[Document]:
    result = await db.execute(select(Document).where(Document.startup_id == startup_id))
    return list(result.scalars().all())
