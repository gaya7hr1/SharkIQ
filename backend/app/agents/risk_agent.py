from app.agents.base import invoke_with_retry, structured_chain
from app.agents.prompts.risk_prompt import RISK_PROMPT
from app.rag.retriever import retrieve_context
from app.schemas.analysis import RiskAnalysis

_chain = structured_chain(RISK_PROMPT, RiskAnalysis)


async def analyze_risk(collection_name: str, startup_name: str, industry: str) -> RiskAnalysis:
    context = retrieve_context(
        collection_name,
        query="risks, competition, regulation, compliance, funding needs, execution challenges",
        k=6,
    )
    return await invoke_with_retry(
        _chain,
        {"startup_name": startup_name, "industry": industry, "context": context},
        schema=RiskAnalysis,
    )
