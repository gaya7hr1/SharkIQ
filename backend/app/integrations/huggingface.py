"""Hugging Face Hub integration.

Provides a secondary, open-source-model signal that is independent of the
OpenAI-based agents: a sentiment/confidence read on founder communication
text, scored via a Hugging Face Hub hosted inference model. Used to give the
founder agent a cross-check signal sourced from a different model provider.
"""

from functools import lru_cache

from huggingface_hub import InferenceClient

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache
def get_hf_client() -> InferenceClient:
    return InferenceClient(token=settings.huggingfacehub_api_token or None)


def score_communication_sentiment(text: str) -> tuple[str | None, float | None]:
    """Run founder communication text through a Hugging Face Hub sentiment model.

    This is a best-effort enrichment, not part of the critical path: hosted
    inference models can be slow to cold-start or briefly unavailable, so any
    failure here is logged and swallowed rather than failing the whole
    founder analysis.
    """
    if not text.strip():
        return None, None

    try:
        client = get_hf_client()
        results = client.text_classification(text[:512], model=settings.hf_sentiment_model)
        if not results:
            return None, None
        top = max(results, key=lambda r: r.score)
        return top.label, round(float(top.score), 4)
    except Exception as exc:  # noqa: BLE001 - enrichment signal, never block the pipeline
        logger.warning("huggingface_sentiment_failed", error=str(exc))
        return None, None
