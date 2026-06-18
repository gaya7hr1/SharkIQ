import asyncio

from crewai import Crew, Process
from langsmith import traceable

from app.committee.investors import (
    financial_investor,
    growth_investor,
    market_investor,
    risk_investor,
    technology_investor,
)
from app.committee.tasks import build_vote_task
from app.core.logging import get_logger
from app.schemas.analysis import FinancialAnalysis, FounderAnalysis, MarketAnalysis, RiskAnalysis
from app.schemas.committee import CommitteeResult, InvestorVote

logger = get_logger(__name__)

_INVESTOR_BUILDERS = {
    "technology": technology_investor.build_agent,
    "financial": financial_investor.build_agent,
    "market": market_investor.build_agent,
    "risk": risk_investor.build_agent,
    "growth": growth_investor.build_agent,
}


def _build_context(
    *,
    startup_name: str,
    industry: str,
    market: MarketAnalysis,
    founder: FounderAnalysis,
    financial: FinancialAnalysis,
    risk: RiskAnalysis,
) -> dict:
    return {
        "startup_name": startup_name,
        "industry": industry,
        "market_score": market.score,
        "market_summary": market.market_opportunity,
        "founder_score": founder.score,
        "founder_summary": founder.execution_capability,
        "financial_score": financial.score,
        "financial_summary": financial.profitability_potential,
        "risk_score": risk.score,
        "risk_summary": "; ".join(r.description for r in risk.critical_risks)
        or "No critical risks flagged.",
    }


@traceable(name="crewai_investment_committee", run_type="chain")
def _run_committee_sync(context: dict) -> list[InvestorVote]:
    agents = {name: builder() for name, builder in _INVESTOR_BUILDERS.items()}
    tasks = {
        name: build_vote_task(agent, investor_type=name, context=context)
        for name, agent in agents.items()
    }

    crew = Crew(
        agents=list(agents.values()),
        tasks=list(tasks.values()),
        process=Process.sequential,
        verbose=False,
    )
    crew.kickoff()

    votes: list[InvestorVote] = []
    for investor_type, task in tasks.items():
        vote = task.output.pydantic
        if vote is None:
            logger.error("committee_vote_parse_failed", investor_type=investor_type)
            continue
        vote.investor_type = investor_type  # guard against the LLM mislabeling itself
        votes.append(vote)
    return votes


async def run_committee(
    *,
    startup_name: str,
    industry: str,
    market: MarketAnalysis,
    founder: FounderAnalysis,
    financial: FinancialAnalysis,
    risk: RiskAnalysis,
) -> CommitteeResult:
    context = _build_context(
        startup_name=startup_name,
        industry=industry,
        market=market,
        founder=founder,
        financial=financial,
        risk=risk,
    )
    votes = await asyncio.to_thread(_run_committee_sync, context)
    invest_count = sum(1 for v in votes if v.decision == "INVEST")
    return CommitteeResult(
        votes=votes,
        invest_count=invest_count,
        pass_count=len(votes) - invest_count,
    )
