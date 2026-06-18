import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.database.session import AsyncSessionLocal
from app.models.document import DocumentType
from app.models.user import User
from app.schemas.document import DocumentRead
from app.services.document_service import (
    create_document_record,
    list_documents_for_startup,
    process_document,
)
from app.services.startup_service import get_startup
from app.services.storage_service import save_upload

router = APIRouter(prefix="/startups/{startup_id}/documents", tags=["documents"])


@router.post("", response_model=DocumentRead, status_code=201)
async def upload_document(
    startup_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    doc_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    startup = await get_startup(db, startup_id)
    file_path, _size = await save_upload(file, startup_id=str(startup_id))
    document = await create_document_record(
        db,
        startup_id=startup_id,
        filename=file.filename or "document.pdf",
        file_path=file_path,
        doc_type=doc_type,
    )

    background_tasks.add_task(
        _process_document_task, document.id, startup.chroma_collection
    )
    return document


async def _process_document_task(document_id: uuid.UUID, chroma_collection: str) -> None:
    from app.models.document import Document

    async with AsyncSessionLocal() as db:
        document = await db.get(Document, document_id)
        if document is not None:
            await process_document(db, document, chroma_collection=chroma_collection)


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    startup_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await list_documents_for_startup(db, startup_id)
