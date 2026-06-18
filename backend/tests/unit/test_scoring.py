from app.models.committee import RecommendationDecision
from app.schemas.analysis import FinancialAnalysis, FounderAnalysis, MarketAnalysis, RiskAnalysis
from app.schemas.committee import CommitteeResult, InvestorVote
from app.utils import scoring


def _market(score: int) -> MarketAnalysis:
    return MarketAnalysis(
        market_size="Large",
        industry_growth="Fast",
        competitor_analysis="Few",
        product_differentiation="Strong",
        market_opportunity="Excellent",
        score=score,
        strengths=["s1"],
        weaknesses=["w1"],
        opportunities=["o1"],
    )


def _founder(score: int) -> FounderAnalysis:
    return FounderAnalysis(
        experience="Strong",
        domain_expertise="Deep",
        leadership_indicators="Good",
        execution_capability="Proven",
        score=score,
        strengths=["s1"],
        weaknesses=["w1"],
    )


def _financial(score: int) -> FinancialAnalysis:
    return FinancialAnalysis(
        revenue_model_assessment="Clear",
        monetization_strategy="SaaS",
        scalability="High",
        sustainability="Good",
        profitability_potential="Strong",
        score=score,
        investment_concerns=["c1"],
        financial_strengths=["f1"],
    )


def _risk(score: int) -> RiskAnalysis:
    return RiskAnalysis(
        market_risk="Low",
        competition_risk="Medium",
        regulatory_risk="Low",
        funding_risk="Low",
        execution_risk="Medium",
        score=score,
        critical_risks=[],
    )


def _committee(invest: int, total: int = 5) -> CommitteeResult:
    votes = [
        InvestorVote(
            investor_type="technology",
            decision="INVEST" if i < invest else "PASS",
            reasoning="ok",
            suggested_investment_amount=100000 if i < invest else 0,
            suggested_equity_pct=5 if i < invest else 0,
        )
        for i in range(total)
    ]
    return CommitteeResult(votes=votes, invest_count=invest, pass_count=total - invest)


def test_compute_overall_score_is_weighted_blend():
    score = scoring.compute_overall_score(
        _market(90), _founder(90), _financial(90), _risk(90), _committee(5)
    )
    assert score == 90.0


def test_strong_invest_requires_high_score_and_majority_votes():
    committee = _committee(invest=5)
    score = scoring.compute_overall_score(_market(90), _founder(85), _financial(85), _risk(85), committee)
    decision = scoring.decide(score, committee)
    assert decision == RecommendationDecision.STRONG_INVEST


def test_high_score_without_vote_majority_is_not_strong_invest():
    committee = _committee(invest=2)
    score = scoring.compute_overall_score(_market(90), _founder(90), _financial(90), _risk(90), committee)
    decision = scoring.decide(score, committee)
    assert decision != RecommendationDecision.STRONG_INVEST


def test_low_score_is_reject():
    committee = _committee(invest=0)
    score = scoring.compute_overall_score(_market(10), _founder(10), _financial(10), _risk(10), committee)
    decision = scoring.decide(score, committee)
    assert decision == RecommendationDecision.REJECT


def test_build_reasoning_includes_decision_and_scores():
    committee = _committee(invest=3)
    market, founder, financial, risk = _market(70), _founder(60), _financial(65), _risk(55)
    score = scoring.compute_overall_score(market, founder, financial, risk, committee)
    decision = scoring.decide(score, committee)
    reasoning = scoring.build_reasoning(
        startup_name="Acme",
        overall_score=score,
        decision=decision,
        market=market,
        founder=founder,
        financial=financial,
        risk=risk,
        committee=committee,
    )
    assert "Acme" in reasoning
    assert decision.value in reasoning
    assert "3 INVEST" in reasoning
