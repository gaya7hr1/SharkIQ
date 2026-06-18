import asyncio

from app.agents.base import invoke_with_retry, structured_chain
from app.agents.prompts.founder_prompt import FOUNDER_PROMPT
from app.integrations.huggingface import score_communication_sentiment
from app.rag.retriever import retrieve_context
from app.schemas.analysis import FounderAnalysis

_chain = structured_chain(FOUNDER_PROMPT, FounderAnalysis)


async def analyze_founder(collection_name: str, startup_name: str, industry: str) -> FounderAnalysis:
    context = retrieve_context(
        collection_name,
        query="founder background, team experience, leadership, previous startups, domain expertise",
        k=6,
    )
    result = await invoke_with_retry(
        _chain, {"startup_name": startup_name, "industry": industry, "context": context}
    )

    # Independent cross-check signal from a Hugging Face Hub model, scored on the
    # same retrieved context the OpenAI agent just analyzed.
    label, score = await asyncio.to_thread(score_communication_sentiment, context)
    result.communication_sentiment_label = label
    result.communication_sentiment_score = score
    return result
