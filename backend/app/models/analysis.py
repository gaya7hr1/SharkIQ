import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class AgentType(str, enum.Enum):
    STARTUP_EXTRACTION = "startup_extraction"
    MARKET = "market"
    FOUNDER = "founder"
    FINANCIAL = "financial"
    RISK = "risk"
    UNICORN = "unicorn"


class AnalysisResult(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "analysis_results"

    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_runs.id")
    )

    agent_type: Mapped[AgentType] = mapped_column(
        Enum(AgentType, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    workflow_run: Mapped["WorkflowRun"] = relationship(back_populates="analyses")
