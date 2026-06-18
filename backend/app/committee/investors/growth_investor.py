from crewai import Agent

from app.committee.investors.base_investor import build_investor_agent


def build_agent() -> Agent:
    return build_investor_agent(
        role="Growth Investor",
        goal="Decide whether to invest based on long-term growth trajectory, fundraising "
        "potential, and ability to scale.",
        backstory=(
            "You specialize in growth-stage follow-on rounds and think several rounds ahead: "
            "will this company be fundable at a higher valuation in 18 months? You back "
            "companies with a credible compounding trajectory, not just a good quarter."
        ),
    )
