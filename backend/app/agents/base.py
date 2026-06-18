from functools import lru_cache

from langchain_openai import ChatOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache
def get_llm(temperature: float = 0.2) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.openai_chat_model,
        temperature=temperature,
        api_key=settings.openai_api_key,
        timeout=60,
    )


def structured_chain(prompt, schema, *, temperature: float = 0.2):
    """Build a `prompt | llm.with_structured_output(schema)` chain.

    Centralized so every agent gets the same retry/temperature policy and so the
    underlying model can be swapped in one place.
    """
    llm = get_llm(temperature=temperature).with_structured_output(schema)
    return prompt | llm


@retry(wait=wait_exponential(multiplier=1, min=2, max=20), stop=stop_after_attempt(3))
async def invoke_with_retry(chain, inputs: dict):
    try:
        return await chain.ainvoke(inputs)
    except Exception as exc:  # noqa: BLE001
        logger.warning("agent_invocation_retry", error=str(exc))
        raise
