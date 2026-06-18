from functools import lru_cache

from crewai import LLM

from app.core.config import settings


@lru_cache
def get_committee_llm() -> LLM:
    return LLM(
        model=f"openai/{settings.openai_chat_model}",
        api_key=settings.openai_api_key,
        temperature=0.3,
    )
