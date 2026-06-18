from app.agents.base import invoke_with_retry, structured_chain
from app.agents.prompts.unicorn_prompt import UNICORN_PROMPT
from app.schemas.analysis import (
    FinancialAnalysis,
    FounderAnalysis,
    MarketAnalysis,
    RiskAnalysis,
    UnicornPrediction,
)

_chain = structured_chain(UNICORN_PROMPT, UnicornPrediction, temperature=0.3)


async def predict_unicorn(
    *,
    startup_name: str,
    industry: str,
    market: MarketAnalysis,
    founder: FounderAnalysis,
    financial: FinancialAnalysis,
    risk: RiskAnalysis,
) -> UnicornPrediction:
    prediction = await invoke_with_retry(
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
            "risk_summary": "; ".join(r.description for r in risk.critical_risks) or "No critical risks flagged.",
        },
    )
    prediction.disclaimer = "AI-generated estimate. Not a financial prediction."
    return prediction
