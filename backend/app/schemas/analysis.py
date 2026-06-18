from pydantic import BaseModel, Field


class MarketAnalysis(BaseModel):
    """Structured output of the Market Intelligence Agent."""

    market_size: str = Field(description="TAM/SAM/SOM summary with figures if available")
    industry_growth: str
    competitor_analysis: str
    product_differentiation: str
    market_opportunity: str
    score: int = Field(ge=0, le=100)
    strengths: list[str]
    weaknesses: list[str]
    opportunities: list[str]


class FounderAnalysis(BaseModel):
    """Structured output of the Founder Intelligence Agent."""

    experience: str
    domain_expertise: str
    leadership_indicators: str
    execution_capability: str
    score: int = Field(ge=0, le=100)
    strengths: list[str]
    weaknesses: list[str]
    communication_sentiment_label: str | None = Field(
        default=None,
        description="Hugging Face Hub sentiment label for founder communication text "
        "(independent cross-check signal, not OpenAI-derived).",
    )
    communication_sentiment_score: float | None = Field(default=None, ge=0, le=1)


class FinancialAnalysis(BaseModel):
    """Structured output of the Financial Analysis Agent."""

    revenue_model_assessment: str
    monetization_strategy: str
    scalability: str
    sustainability: str
    profitability_potential: str
    score: int = Field(ge=0, le=100)
    investment_concerns: list[str]
    financial_strengths: list[str]


class RiskItem(BaseModel):
    category: str
    description: str
    severity: str = Field(description="one of: low, medium, high, critical")


class RiskAnalysis(BaseModel):
    """Structured output of the Risk Assessment Agent."""

    market_risk: str
    competition_risk: str
    regulatory_risk: str
    funding_risk: str
    execution_risk: str
    score: int = Field(ge=0, le=100, description="Higher score = lower overall risk")
    critical_risks: list[RiskItem]


class UnicornPrediction(BaseModel):
    """Structured output of the Unicorn Predictor Agent."""

    startup_survival_probability: int = Field(ge=0, le=100)
    series_a_funding_probability: int = Field(ge=0, le=100)
    unicorn_probability: int = Field(ge=0, le=100)
    reasoning: str
    disclaimer: str = "AI-generated estimate. Not a financial prediction."
