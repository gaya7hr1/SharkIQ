import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StartupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class StartupExtracted(BaseModel):
    """Structured output of the Startup Extraction Agent."""

    startup_name: str
    industry: str
    problem_statement: str
    solution: str
    target_audience: str
    revenue_model: str
    funding_requirement: str
    business_stage: str


class StartupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    industry: str | None = None
    problem_statement: str | None = None
    solution: str | None = None
    target_audience: str | None = None
    revenue_model: str | None = None
    funding_requirement: str | None = None
    business_stage: str | None = None
    created_at: datetime
