from crewai import Agent, Task

from app.schemas.committee import InvestorVote

VOTE_TASK_TEMPLATE = """Startup: {startup_name} ({industry})

Due-diligence findings assembled by the analysis team:

MARKET ANALYSIS (score {market_score}/100): {market_summary}

FOUNDER ANALYSIS (score {founder_score}/100): {founder_summary}

FINANCIAL ANALYSIS (score {financial_score}/100): {financial_summary}

RISK ANALYSIS (score {risk_score}/100, higher = safer): {risk_summary}

From your specific investor perspective, decide INVEST or PASS on this startup. Respond with the
exact structured fields requested: investor_type, decision, reasoning, suggested_investment_amount,
suggested_equity_pct.
"""


def build_vote_task(agent: Agent, *, investor_type: str, context: dict) -> Task:
    description = VOTE_TASK_TEMPLATE.format(**context)
    return Task(
        description=description,
        expected_output=(
            f"A structured investment vote from the {investor_type} perspective conforming to "
            "the InvestorVote schema."
        ),
        agent=agent,
        output_pydantic=InvestorVote,
    )
