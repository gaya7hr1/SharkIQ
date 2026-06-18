from crewai import Agent

from app.committee.investors.base_investor import build_investor_agent


def build_agent() -> Agent:
    return build_investor_agent(
        role="Technology Investor",
        goal="Decide whether to invest based on innovation, product moat, and scalability of the "
        "underlying technology.",
        backstory=(
            "You are a former CTO turned VC partner who has shipped and scaled three production "
            "platforms. You back defensible technology and penalize startups whose 'innovation' is "
            "just a thin wrapper around someone else's product with no moat."
        ),
    )
