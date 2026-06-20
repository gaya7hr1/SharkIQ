from typing import Literal

from pydantic import BaseModel, Field, field_validator

_EXPECTED_INVESTOR_TYPES = {"technology", "financial", "market", "risk", "growth"}


class InvestorVote(BaseModel):
    """One investor persona's vote, as part of a CommitteeSynthesis structured output."""

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


class CommitteeSynthesis(BaseModel):
    """Single-call structured output covering both the investment committee's
    votes and the unicorn predictor's probabilities. Merged into one LLM call
    (rather than 5 separate committee-member calls + 1 unicorn call) to stay
    within Groq free-tier rate limits without dropping any of the analysis."""

    votes: list[InvestorVote] = Field(min_length=5, max_length=5)
    startup_survival_probability: float = Field(ge=0, le=100)
    series_a_funding_probability: float = Field(ge=0, le=100)
    unicorn_probability: float = Field(ge=0, le=100)
    unicorn_reasoning: str

    @field_validator("votes")
    @classmethod
    def _exactly_one_vote_per_persona(cls, votes: list[InvestorVote]) -> list[InvestorVote]:
        """Smaller models occasionally skip or duplicate a persona instead of
        casting one vote each. Catch it here so the existing tenacity retry in
        invoke_with_retry re-runs the call rather than silently dropping a
        perspective."""
        types = [v.investor_type for v in votes]
        seen = set(types)
        if seen != _EXPECTED_INVESTOR_TYPES or len(types) != len(seen):
            missing = sorted(_EXPECTED_INVESTOR_TYPES - seen)
            duplicated = sorted({t for t in types if types.count(t) > 1})
            raise ValueError(
                f"Expected exactly one vote per persona {sorted(_EXPECTED_INVESTOR_TYPES)}, "
                f"missing={missing} duplicated={duplicated}"
            )
        return votes


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class CommitteeChatRequest(BaseModel):
    investor_type: Literal["technology", "financial", "market", "risk", "growth"]
    message: str
    history: list[Message] = []


class CommitteeChatResponse(BaseModel):
    reply: str

