import os

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def configure_tracing() -> None:
    """Push LangSmith settings into the environment.

    LangChain/LangGraph read tracing config from `LANGCHAIN_*` env vars at call
    time (not at import time), so setting them here during app startup is
    enough to enable tracing for every chain, agent and graph run that follows
    — no per-call instrumentation needed.
    """
    if not settings.langchain_tracing_v2:
        logger.info("langsmith_tracing_disabled")
        return

    if not settings.langchain_api_key:
        logger.warning("langsmith_tracing_requested_but_no_api_key")
        return

    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
    os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint
    logger.info("langsmith_tracing_enabled", project=settings.langchain_project)
