from app.agents.base import invoke_with_retry, structured_chain
from app.agents.prompts.extraction_prompt import EXTRACTION_PROMPT
from app.rag.retriever import retrieve_context
from app.schemas.startup import StartupExtracted

_chain = structured_chain(EXTRACTION_PROMPT, StartupExtracted, temperature=0.0)


async def extract_startup(collection_name: str) -> StartupExtracted:
    context = retrieve_context(
        collection_name,
        query="startup name, industry, problem statement, solution, target audience, "
        "revenue model, funding requirement, business stage",
        k=8,
    )
    return await invoke_with_retry(_chain, {"context": context})
