import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class Startup(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "startups"

    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    problem_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_audience: Mapped[str | None] = mapped_column(Text, nullable=True)
    revenue_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    funding_requirement: Mapped[str | None] = mapped_column(String(255), nullable=True)
    business_stage: Mapped[str | None] = mapped_column(String(100), nullable=True)

    chroma_collection: Mapped[str] = mapped_column(String(255), nullable=False)

    owner: Mapped["User"] = relationship(back_populates="startups")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="startup", cascade="all, delete-orphan"
    )
    workflow_runs: Mapped[list["WorkflowRun"]] = relationship(
        back_populates="startup", cascade="all, delete-orphan"
    )
