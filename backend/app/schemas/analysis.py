from pydantic import BaseModel, Field, field_validator


def _coerce_int_score(v: int | str) -> int | str:
    """Groq's llama tool-calling occasionally quotes scores (e.g. "0") when the
    model is uncertain due to missing context. The tool schema's `score` field
    accepts int or str (see int | str annotation below) so Groq's strict
    argument validation doesn't reject those responses; this coerces back to int.
    """
    return int(v) if isinstance(v, str) else v


class MarketAnalysis(BaseModel):
    """Structured output of the Market Intelligence Agent."""

    market_size: str = Field(description="TAM/SAM/SOM summary with figures if available")
    industry_growth: str
    competitor_analysis: str
    product_differentiation: str
    market_opportunity: str
    score: int | str = Field(ge=0, le=100)
    strengths: list[str]
    weaknesses: list[str]
    opportunities: list[str]

    _coerce_score = field_validator("score", mode="before")(_coerce_int_score)


class FounderAnalysis(BaseModel):
    """Structured output of the Founder Intelligence Agent."""

    experience: str
    domain_expertise: str
    leadership_indicators: str
    execution_capability: str
    score: int | str = Field(ge=0, le=100)
    strengths: list[str]
    weaknesses: list[str]
    communication_sentiment_label: str | None = Field(
        default=None,
        description="Hugging Face Hub sentiment label for founder communication text "
        "(independent cross-check signal, not OpenAI-derived).",
    )
    communication_sentiment_score: float | None = Field(default=None, ge=0, le=1)

    _coerce_score = field_validator("score", mode="before")(_coerce_int_score)


class FinancialAnalysis(BaseModel):
    """Structured output of the Financial Analysis Agent."""

    revenue_model_assessment: str
    monetization_strategy: str
    scalability: str
    sustainability: str
    profitability_potential: str
    score: int | str = Field(ge=0, le=100)
    investment_concerns: list[str]
    financial_strengths: list[str]

    _coerce_score = field_validator("score", mode="before")(_coerce_int_score)


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
    score: int | str = Field(ge=0, le=100, description="Higher score = lower overall risk")
    critical_risks: list[RiskItem]

    _coerce_score = field_validator("score", mode="before")(_coerce_int_score)


class UnicornPrediction(BaseModel):
    """Structured output of the Unicorn Predictor Agent."""

    startup_survival_probability: float = Field(ge=0, le=100)
    series_a_funding_probability: float = Field(ge=0, le=100)
    unicorn_probability: float = Field(ge=0, le=100)
    reasoning: str
    disclaimer: str = "AI-generated estimate. Not a financial prediction."
