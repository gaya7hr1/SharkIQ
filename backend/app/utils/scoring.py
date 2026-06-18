from app.models.committee import RecommendationDecision
from app.schemas.analysis import FinancialAnalysis, FounderAnalysis, MarketAnalysis, RiskAnalysis
from app.schemas.committee import CommitteeResult

# Weights for the four analysis scores within the "analysis" component of the
# overall score. Market and founder are weighted slightly higher because they
# are the leading indicators VCs weight most heavily pre-traction.
MARKET_WEIGHT = 0.30
FOUNDER_WEIGHT = 0.25
FINANCIAL_WEIGHT = 0.25
RISK_WEIGHT = 0.20

# Final blend between the analysis-derived score and the committee vote ratio.
ANALYSIS_BLEND_WEIGHT = 0.7
VOTE_BLEND_WEIGHT = 0.3


def compute_analysis_score(
    market: MarketAnalysis,
    founder: FounderAnalysis,
    financial: FinancialAnalysis,
    risk: RiskAnalysis,
) -> float:
    return (
        market.score * MARKET_WEIGHT
        + founder.score * FOUNDER_WEIGHT
        + financial.score * FINANCIAL_WEIGHT
        + risk.score * RISK_WEIGHT
    )


def compute_vote_score(committee: CommitteeResult) -> float:
    total = committee.invest_count + committee.pass_count
    if total == 0:
        return 0.0
    return (committee.invest_count / total) * 100


def compute_overall_score(
    market: MarketAnalysis,
    founder: FounderAnalysis,
    financial: FinancialAnalysis,
    risk: RiskAnalysis,
    committee: CommitteeResult,
) -> float:
    analysis_score = compute_analysis_score(market, founder, financial, risk)
    vote_score = compute_vote_score(committee)
    overall = analysis_score * ANALYSIS_BLEND_WEIGHT + vote_score * VOTE_BLEND_WEIGHT
    return round(overall, 1)


def decide(overall_score: float, committee: CommitteeResult) -> RecommendationDecision:
    invest_majority = committee.invest_count >= 4

    if overall_score >= 80 and invest_majority:
        return RecommendationDecision.STRONG_INVEST
    if overall_score >= 60:
        return RecommendationDecision.INVEST_WITH_CAUTION
    if overall_score >= 40:
        return RecommendationDecision.MONITOR
    return RecommendationDecision.REJECT


def build_reasoning(
    *,
    startup_name: str,
    overall_score: float,
    decision: RecommendationDecision,
    market: MarketAnalysis,
    founder: FounderAnalysis,
    financial: FinancialAnalysis,
    risk: RiskAnalysis,
    committee: CommitteeResult,
) -> str:
    top_risks = sorted(
        risk.critical_risks,
        key=lambda r: {"critical": 3, "high": 2, "medium": 1, "low": 0}.get(r.severity.lower(), 0),
        reverse=True,
    )[:3]
    risk_summary = (
        "; ".join(f"{r.category} ({r.severity})" for r in top_risks)
        if top_risks
        else "no critical risks identified"
    )

    return (
        f"{startup_name} scored {overall_score}/100 overall, yielding a '{decision.value}' "
        f"recommendation. Component scores — Market: {market.score}/100, Founder: {founder.score}/100, "
        f"Financial: {financial.score}/100, Risk (higher=safer): {risk.score}/100. "
        f"The investment committee voted {committee.invest_count} INVEST / {committee.pass_count} PASS "
        f"across the five investor perspectives. Top risk factors: {risk_summary}."
    )
