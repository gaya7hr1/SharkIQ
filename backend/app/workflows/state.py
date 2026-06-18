from typing import Any, TypedDict


class WorkflowState(TypedDict, total=False):
    """Central LangGraph state shared by every node in the due-diligence workflow.

    Each parallel analysis node (market/founder/financial/risk) writes to its own
    key, so there is no write conflict when LangGraph merges the fan-out branch
    results back together — no custom reducer is required.
    """

    startup_id: str
    chroma_collection: str

    startup_name: str
    industry: str
    startup_summary: dict[str, Any]

    market_analysis: dict[str, Any]
    founder_analysis: dict[str, Any]
    financial_analysis: dict[str, Any]
    risk_analysis: dict[str, Any]
    unicorn_prediction: dict[str, Any]

    committee_votes: list[dict[str, Any]]

    final_recommendation: dict[str, Any]
    confidence_score: float

    human_decision: str | None
    human_feedback: str | None

    report_path: str | None

    status: str
    error: str | None
