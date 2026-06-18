from app.agents.base import invoke_with_retry, structured_chain
from app.agents.prompts.financial_prompt import FINANCIAL_PROMPT
from app.rag.retriever import retrieve_context
from app.schemas.analysis import FinancialAnalysis

_chain = structured_chain(FINANCIAL_PROMPT, FinancialAnalysis)


async def analyze_financial(
    collection_name: str, startup_name: str, industry: str
) -> FinancialAnalysis:
    context = retrieve_context(
        collection_name,
        query="revenue model, pricing, monetization, unit economics, burn rate, profitability",
        k=6,
    )
    return await invoke_with_retry(
        _chain, {"startup_name": startup_name, "industry": industry, "context": context}
    )
