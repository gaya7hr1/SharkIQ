import asyncio
import json
import re
from functools import lru_cache

from groq import BadRequestError
from langchain_groq import ChatGroq
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limiter import groq_rate_limiter

logger = get_logger(__name__)


@lru_cache
def get_llm(temperature: float = 0.2) -> ChatGroq:
    return ChatGroq(
        model=settings.groq_chat_model,
        temperature=temperature,
        api_key=settings.groq_api_key,
        timeout=60,
    )


def structured_chain(prompt, schema, *, temperature: float = 0.2):
    """Build a `prompt | llm.with_structured_output(schema)` chain.

    Centralized so every agent gets the same retry/temperature policy and so the
    underlying model can be swapped in one place.
    """
    llm = get_llm(temperature=temperature).with_structured_output(schema)
    return prompt | llm


def _repair_groq_tool_call_json(exc: BadRequestError) -> dict | None:
    """Smaller Groq models occasionally backslash-escape apostrophes inside JSON
    string values (e.g. `Ingreadient\\'s`), which is not a legal JSON escape and
    makes Groq's own tool-call parser reject the request as `tool_use_failed`.
    Groq returns the raw generation in the error body specifically so callers can
    repair and re-parse it themselves - this does that instead of burning a retry
    on a call whose content was actually fine.
    """
    body = exc.body if isinstance(exc.body, dict) else None
    error = (body or {}).get("error", {})
    if error.get("code") != "tool_use_failed":
        return None
    raw = error.get("failed_generation")
    if not raw:
        return None

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return None
    json_str = match.group(0).replace("\\'", "'")
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return None


@retry(wait=wait_exponential(multiplier=1, min=2, max=20), stop=stop_after_attempt(3))
async def invoke_with_retry(chain, inputs: dict, *, schema: type[BaseModel] | None = None):
    await asyncio.to_thread(groq_rate_limiter.wait)
    try:
        return await chain.ainvoke(inputs)
    except BadRequestError as exc:
        if schema is not None:
            repaired = _repair_groq_tool_call_json(exc)
            if repaired is not None:
                try:
                    result = schema.model_validate(repaired)
                    logger.info("groq_tool_call_json_repaired", schema=schema.__name__)
                    return result
                except Exception:  # noqa: BLE001 - repaired JSON still didn't match the schema
                    pass
        logger.warning("agent_invocation_retry", error=str(exc))
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning("agent_invocation_retry", error=str(exc))
        raise
