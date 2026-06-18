from app.agents.base import invoke_with_retry, structured_chain
from app.agents.prompts.market_prompt import MARKET_PROMPT
from app.rag.retriever import retrieve_context
from app.schemas.analysis import MarketAnalysis

_chain = structured_chain(MARKET_PROMPT, MarketAnalysis)


async def analyze_market(collection_name: str, startup_name: str, industry: str) -> MarketAnalysis:
    context = retrieve_context(
        collection_name,
        query="market size, total addressable market, competitors, industry growth, differentiation",
        k=6,
    )
    return await invoke_with_retry(
        _chain, {"startup_name": startup_name, "industry": industry, "context": context}
    )
