import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class DocumentType(str, enum.Enum):
    PITCH_DECK = "pitch_deck"
    BUSINESS_PLAN = "business_plan"
    SUPPORTING = "supporting"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"


class Document(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "documents"

    startup_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("startups.id"))

    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    doc_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=DocumentStatus.UPLOADED,
        nullable=False,
    )
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    startup: Mapped["Startup"] = relationship(back_populates="documents")
