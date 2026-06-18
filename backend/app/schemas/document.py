import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentStatus, DocumentType


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    filename: str
    doc_type: DocumentType
    status: DocumentStatus
    chunk_count: int
    error_message: str | None = None
    created_at: datetime
