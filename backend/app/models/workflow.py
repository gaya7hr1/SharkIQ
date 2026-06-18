import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class WorkflowStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED_FOR_APPROVAL = "paused_for_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    REANALYZING = "reanalyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class WorkflowRun(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "workflow_runs"

    startup_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("startups.id"))

    thread_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    status: Mapped[WorkflowStatus] = mapped_column(
        Enum(WorkflowStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=WorkflowStatus.PENDING,
        nullable=False,
    )
    current_node: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    startup: Mapped["Startup"] = relationship(back_populates="workflow_runs")
    analyses: Mapped[list["AnalysisResult"]] = relationship(
        back_populates="workflow_run", cascade="all, delete-orphan"
    )
    committee_votes: Mapped[list["CommitteeVote"]] = relationship(
        back_populates="workflow_run", cascade="all, delete-orphan"
    )
    final_recommendation: Mapped["FinalRecommendation"] = relationship(
        back_populates="workflow_run", cascade="all, delete-orphan", uselist=False
    )
    report: Mapped["Report"] = relationship(
        back_populates="workflow_run", cascade="all, delete-orphan", uselist=False
    )
