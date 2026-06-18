from typing import Literal

from pydantic import BaseModel, Field


class InvestorVote(BaseModel):
    """Structured output returned by every CrewAI investor agent."""

    investor_type: Literal["technology", "financial", "market", "risk", "growth"]
    decision: Literal["INVEST", "PASS"]
    reasoning: str
    suggested_investment_amount: float = Field(
        description="Suggested investment amount in USD, 0 if decision is PASS"
    )
    suggested_equity_pct: float = Field(
        ge=0, le=100, description="Suggested equity percentage, 0 if decision is PASS"
    )


class CommitteeResult(BaseModel):
    votes: list[InvestorVote]
    invest_count: int
    pass_count: int
