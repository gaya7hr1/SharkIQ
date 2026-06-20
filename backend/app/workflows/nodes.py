from langgraph.types import interrupt

from app.agents.committee_agent import run_committee_synthesis
from app.agents.financial_agent import analyze_financial
from app.agents.founder_agent import analyze_founder
from app.agents.market_agent import analyze_market
from app.agents.risk_agent import analyze_risk
from app.agents.startup_extraction_agent import extract_startup
from app.core.logging import get_logger
from app.reports.pdf_generator import generate_report
from app.schemas.analysis import FinancialAnalysis, FounderAnalysis, MarketAnalysis, RiskAnalysis
from app.schemas.committee import CommitteeResult
from app.utils import scoring
from app.workflows.state import WorkflowState

logger = get_logger(__name__)


async def extract_startup_node(state: WorkflowState) -> dict:
    extracted = await extract_startup(state["chroma_collection"])
    return {
        "startup_name": extracted.startup_name,
        "industry": extracted.industry,
        "startup_summary": extracted.model_dump(),
        "status": "running",
    }


async def begin_analysis_node(state: WorkflowState) -> dict:
    """No-op fan-out anchor: gives both the initial run and the reanalysis loop a
    single edge target that branches out to the four parallel analysis nodes."""
    return {"status": "running"}


async def market_node(state: WorkflowState) -> dict:
    result = await analyze_market(state["chroma_collection"], state["startup_name"], state["industry"])
    return {"market_analysis": result.model_dump()}


async def founder_node(state: WorkflowState) -> dict:
    result = await analyze_founder(state["chroma_collection"], state["startup_name"], state["industry"])
    return {"founder_analysis": result.model_dump()}


async def financial_node(state: WorkflowState) -> dict:
    result = await analyze_financial(
        state["chroma_collection"], state["startup_name"], state["industry"]
    )
    return {"financial_analysis": result.model_dump()}


async def risk_node(state: WorkflowState) -> dict:
    result = await analyze_risk(state["chroma_collection"], state["startup_name"], state["industry"])
    return {"risk_analysis": result.model_dump()}


async def committee_synthesis_node(state: WorkflowState) -> dict:
    """Single LLM call producing both the committee's 5 investor votes and the
    unicorn prediction — merged (instead of 6 separate calls) to fit Groq's
    free-tier rate limits."""
    synthesis = await run_committee_synthesis(
        startup_name=state["startup_name"],
        industry=state["industry"],
        market=MarketAnalysis.model_validate(state["market_analysis"]),
        founder=FounderAnalysis.model_validate(state["founder_analysis"]),
        financial=FinancialAnalysis.model_validate(state["financial_analysis"]),
        risk=RiskAnalysis.model_validate(state["risk_analysis"]),
    )
    return {
        "committee_votes": [v.model_dump() for v in synthesis.votes],
        "unicorn_prediction": {
            "startup_survival_probability": synthesis.startup_survival_probability,
            "series_a_funding_probability": synthesis.series_a_funding_probability,
            "unicorn_probability": synthesis.unicorn_probability,
            "reasoning": synthesis.unicorn_reasoning,
            "disclaimer": "AI-generated estimate. Not a financial prediction.",
        },
    }


async def final_recommendation_node(state: WorkflowState) -> dict:
    market = MarketAnalysis.model_validate(state["market_analysis"])
    founder = FounderAnalysis.model_validate(state["founder_analysis"])
    financial = FinancialAnalysis.model_validate(state["financial_analysis"])
    risk = RiskAnalysis.model_validate(state["risk_analysis"])
    committee = CommitteeResult(
        votes=state["committee_votes"],
        invest_count=sum(1 for v in state["committee_votes"] if v["decision"] == "INVEST"),
        pass_count=sum(1 for v in state["committee_votes"] if v["decision"] == "PASS"),
    )

    overall_score = scoring.compute_overall_score(market, founder, financial, risk, committee)
    decision = scoring.decide(overall_score, committee)
    reasoning = scoring.build_reasoning(
        startup_name=state["startup_name"],
        overall_score=overall_score,
        decision=decision,
        market=market,
        founder=founder,
        financial=financial,
        risk=risk,
        committee=committee,
    )

    return {
        "final_recommendation": {
            "overall_score": overall_score,
            "decision": decision.value,
            "reasoning": reasoning,
        },
        "confidence_score": overall_score,
        "status": "paused_for_approval",
    }


async def human_approval_node(state: WorkflowState) -> dict:
    decision = interrupt(
        {
            "message": "Investment Recommendation Ready",
            "actions": ["approve", "reject", "request_reanalysis"],
            "final_recommendation": state["final_recommendation"],
            "startup_name": state["startup_name"],
        }
    )

    action = decision.get("action")
    feedback = decision.get("feedback")

    if action == "approve":
        return {"human_decision": "approve", "human_feedback": feedback, "status": "approved"}
    if action == "reject":
        return {"human_decision": "reject", "human_feedback": feedback, "status": "rejected"}
    return {"human_decision": "request_reanalysis", "human_feedback": feedback, "status": "reanalyzing"}


def route_after_approval(state: WorkflowState) -> str:
    if state.get("status") == "approved":
        return "report_generation"
    if state.get("status") == "reanalyzing":
        return "begin_analysis"
    return "__end__"


async def report_generation_node(state: WorkflowState) -> dict:
    path = generate_report(state)
    return {"report_path": path, "status": "completed"}
