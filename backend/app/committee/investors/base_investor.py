from crewai import Agent

from app.committee.llm import get_committee_llm

OUTPUT_DISCIPLINE = (
    "You MUST cast a final vote of either INVEST or PASS, with a suggested_investment_amount "
    "(USD, 0 if PASS) and suggested_equity_pct (0 if PASS). Base your reasoning strictly on the "
    "due-diligence findings you are given — do not ask for more information, you must decide now."
)


def build_investor_agent(*, role: str, goal: str, backstory: str) -> Agent:
    return Agent(
        role=role,
        goal=f"{goal} {OUTPUT_DISCIPLINE}",
        backstory=backstory,
        llm=get_committee_llm(),
        verbose=False,
        allow_delegation=False,
    )
