import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class InvestorType(str, enum.Enum):
    TECHNOLOGY = "technology"
    FINANCIAL = "financial"
    MARKET = "market"
    RISK = "risk"
    GROWTH = "growth"


class VoteDecision(str, enum.Enum):
    INVEST = "INVEST"
    PASS = "PASS"


class CommitteeVote(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "committee_votes"

    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_runs.id")
    )

    investor_type: Mapped[InvestorType] = mapped_column(
        Enum(InvestorType, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    decision: Mapped[VoteDecision] = mapped_column(
        Enum(VoteDecision, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    suggested_equity_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    workflow_run: Mapped["WorkflowRun"] = relationship(back_populates="committee_votes")


class RecommendationDecision(str, enum.Enum):
    STRONG_INVEST = "Strong Invest"
    INVEST_WITH_CAUTION = "Invest with Caution"
    MONITOR = "Monitor"
    REJECT = "Reject"


class FinalRecommendation(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "final_recommendations"

    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_runs.id"), unique=True
    )

    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    decision: Mapped[RecommendationDecision] = mapped_column(
        Enum(RecommendationDecision, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    human_decision: Mapped[str | None] = mapped_column(String(50), nullable=True)
    human_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    workflow_run: Mapped["WorkflowRun"] = relationship(back_populates="final_recommendation")


class Report(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "reports"

    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_runs.id"), unique=True
    )
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)

    workflow_run: Mapped["WorkflowRun"] = relationship(back_populates="report")
