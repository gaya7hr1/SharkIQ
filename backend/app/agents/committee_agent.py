from app.agents.base import invoke_with_retry, structured_chain
from app.agents.prompts.committee_prompt import COMMITTEE_PROMPT
from app.schemas.analysis import FinancialAnalysis, FounderAnalysis, MarketAnalysis, RiskAnalysis
from app.schemas.committee import CommitteeSynthesis

_chain = structured_chain(COMMITTEE_PROMPT, CommitteeSynthesis, temperature=0.3)


async def run_committee_synthesis(
    *,
    startup_name: str,
    industry: str,
    market: MarketAnalysis,
    founder: FounderAnalysis,
    financial: FinancialAnalysis,
    risk: RiskAnalysis,
) -> CommitteeSynthesis:
    return await invoke_with_retry(
        _chain,
        {
            "startup_name": startup_name,
            "industry": industry,
            "market_score": market.score,
            "founder_score": founder.score,
            "financial_score": financial.score,
            "risk_score": risk.score,
            "market_summary": market.market_opportunity,
            "founder_summary": founder.execution_capability,
            "financial_summary": financial.profitability_potential,
            "risk_summary": "; ".join(r.description for r in risk.critical_risks)
            or "No critical risks flagged.",
        },
        schema=CommitteeSynthesis,
    )
