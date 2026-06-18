import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.models.workflow import WorkflowStatus
from app.schemas.analysis import (
    FinancialAnalysis,
    FounderAnalysis,
    MarketAnalysis,
    RiskAnalysis,
    UnicornPrediction,
)
from app.schemas.committee import InvestorVote
from app.schemas.startup import StartupExtracted


class WorkflowStartRequest(BaseModel):
    startup_id: uuid.UUID


class HumanApprovalRequest(BaseModel):
    action: Literal["approve", "reject", "request_reanalysis"]
    feedback: str | None = None


class WorkflowRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    thread_id: str
    status: WorkflowStatus
    current_node: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class FinalRecommendationRead(BaseModel):
    overall_score: float
    decision: str
    reasoning: str
    human_decision: str | None = None


class WorkflowResultRead(BaseModel):
    """Full assembled view of a workflow run's state, for the dashboard."""

    run: WorkflowRunRead
    startup_summary: StartupExtracted | None = None
    market_analysis: MarketAnalysis | None = None
    founder_analysis: FounderAnalysis | None = None
    financial_analysis: FinancialAnalysis | None = None
    risk_analysis: RiskAnalysis | None = None
    unicorn_prediction: UnicornPrediction | None = None
    committee_votes: list[InvestorVote] = []
    final_recommendation: FinalRecommendationRead | None = None
    pending_approval_payload: dict | None = None
