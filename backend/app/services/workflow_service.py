import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.analysis import AgentType, AnalysisResult
from app.models.committee import (
    CommitteeVote,
    FinalRecommendation,
    InvestorType,
    RecommendationDecision,
    Report,
    VoteDecision,
)
from app.models.startup import Startup
from app.models.workflow import WorkflowRun, WorkflowStatus
from app.schemas.startup import StartupExtracted
from app.schemas.workflow import WorkflowResultRead, WorkflowRunRead
from app.services.startup_service import apply_extraction
from app.utils.exceptions import NotFoundError, WorkflowError, WorkflowNotInterruptedError
from app.workflows import runner

logger = get_logger(__name__)

_STATUS_MAP = {
    "running": WorkflowStatus.RUNNING,
    "paused_for_approval": WorkflowStatus.PAUSED_FOR_APPROVAL,
    "approved": WorkflowStatus.APPROVED,
    "rejected": WorkflowStatus.REJECTED,
    "reanalyzing": WorkflowStatus.REANALYZING,
    "completed": WorkflowStatus.COMPLETED,
}


async def get_workflow_run(db: AsyncSession, run_id: uuid.UUID) -> WorkflowRun:
    run = await db.get(WorkflowRun, run_id)
    if run is None:
        raise NotFoundError(f"Workflow run {run_id} not found")
    return run


async def list_workflow_runs(db: AsyncSession, startup_id: uuid.UUID) -> list[WorkflowRun]:
    result = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.startup_id == startup_id)
        .order_by(WorkflowRun.created_at.desc())
    )
    return list(result.scalars().all())


async def start_workflow(db: AsyncSession, startup: Startup) -> WorkflowRun:
    thread_id = f"wf_{uuid.uuid4().hex}"
    run = WorkflowRun(startup_id=startup.id, thread_id=thread_id, status=WorkflowStatus.RUNNING)
    db.add(run)
    await db.commit()
    await db.refresh(run)

    try:
        result = await runner.start_run(
            thread_id, startup_id=str(startup.id), chroma_collection=startup.chroma_collection
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("workflow_start_failed", run_id=str(run.id), error=str(exc))
        run.status = WorkflowStatus.FAILED
        run.error_message = str(exc)
        await db.commit()
        raise WorkflowError(f"Workflow failed to start: {exc}") from exc

    if result.get("startup_summary"):
        await apply_extraction(db, startup, StartupExtracted.model_validate(result["startup_summary"]))

    await _persist_state(db, run, result)
    return run


async def resume_workflow(
    db: AsyncSession, run: WorkflowRun, *, action: str, feedback: str | None
) -> WorkflowRun:
    if run.status != WorkflowStatus.PAUSED_FOR_APPROVAL:
        raise WorkflowNotInterruptedError("Workflow is not currently paused for human approval")

    try:
        result = await runner.resume_run(run.thread_id, action=action, feedback=feedback)
    except Exception as exc:  # noqa: BLE001
        logger.error("workflow_resume_failed", run_id=str(run.id), error=str(exc))
        run.status = WorkflowStatus.FAILED
        run.error_message = str(exc)
        await db.commit()
        raise WorkflowError(f"Workflow failed to resume: {exc}") from exc

    await _persist_state(db, run, result)
    return run


async def _persist_state(db: AsyncSession, run: WorkflowRun, result: dict[str, Any]) -> None:
    interrupt_payload = runner.extract_interrupt_payload(result)
    if interrupt_payload is not None:
        run.status = WorkflowStatus.PAUSED_FOR_APPROVAL
    else:
        run.status = _STATUS_MAP.get(result.get("status", "running"), WorkflowStatus.RUNNING)
    run.error_message = result.get("error")

    # Idempotent replace: clear prior rows for this run before re-inserting,
    # so a "request_reanalysis" loop doesn't accumulate stale duplicates.
    await db.execute(delete(AnalysisResult).where(AnalysisResult.workflow_run_id == run.id))
    await db.execute(delete(CommitteeVote).where(CommitteeVote.workflow_run_id == run.id))
    await db.execute(
        delete(FinalRecommendation).where(FinalRecommendation.workflow_run_id == run.id)
    )

    agent_field_map = {
        AgentType.MARKET: "market_analysis",
        AgentType.FOUNDER: "founder_analysis",
        AgentType.FINANCIAL: "financial_analysis",
        AgentType.RISK: "risk_analysis",
        AgentType.UNICORN: "unicorn_prediction",
    }
    for agent_type, field in agent_field_map.items():
        data = result.get(field)
        if data:
            db.add(
                AnalysisResult(
                    workflow_run_id=run.id,
                    agent_type=agent_type,
                    score=data.get("score"),
                    data=data,
                )
            )

    if result.get("startup_summary"):
        db.add(
            AnalysisResult(
                workflow_run_id=run.id,
                agent_type=AgentType.STARTUP_EXTRACTION,
                score=None,
                data=result["startup_summary"],
            )
        )

    for vote in result.get("committee_votes", []):
        db.add(
            CommitteeVote(
                workflow_run_id=run.id,
                investor_type=InvestorType(vote["investor_type"]),
                decision=VoteDecision(vote["decision"]),
                reasoning=vote["reasoning"],
                suggested_amount=vote.get("suggested_investment_amount"),
                suggested_equity_pct=vote.get("suggested_equity_pct"),
            )
        )

    final = result.get("final_recommendation")
    if final:
        db.add(
            FinalRecommendation(
                workflow_run_id=run.id,
                overall_score=final["overall_score"],
                decision=RecommendationDecision(final["decision"]),
                reasoning=final["reasoning"],
                human_decision=result.get("human_decision"),
                human_feedback=result.get("human_feedback"),
            )
        )

    if result.get("report_path"):
        existing = await db.execute(select(Report).where(Report.workflow_run_id == run.id))
        if existing.scalar_one_or_none() is None:
            db.add(Report(workflow_run_id=run.id, file_path=result["report_path"]))

    await db.commit()
    # `updated_at` has a server-side onupdate (func.now()), so the UPDATE above
    # expires it regardless of expire_on_commit=False; refresh so the response
    # model can read it without triggering a lazy load outside the async context.
    await db.refresh(run)


async def get_workflow_result(db: AsyncSession, run: WorkflowRun) -> WorkflowResultRead:
    startup = await db.get(Startup, run.startup_id)

    analyses_result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.workflow_run_id == run.id)
    )
    analyses = {a.agent_type: a.data for a in analyses_result.scalars().all()}

    votes_result = await db.execute(
        select(CommitteeVote).where(CommitteeVote.workflow_run_id == run.id)
    )
    votes = votes_result.scalars().all()

    final_result = await db.execute(
        select(FinalRecommendation).where(FinalRecommendation.workflow_run_id == run.id)
    )
    final = final_result.scalar_one_or_none()

    pending_payload = None
    if run.status == WorkflowStatus.PAUSED_FOR_APPROVAL and final is not None:
        pending_payload = {
            "message": "Investment Recommendation Ready",
            "actions": ["approve", "reject", "request_reanalysis"],
            "startup_name": startup.name if startup else None,
            "final_recommendation": {
                "overall_score": final.overall_score,
                "decision": final.decision.value,
                "reasoning": final.reasoning,
            },
        }

    return WorkflowResultRead(
        run=WorkflowRunRead.model_validate(run),
        startup_summary=analyses.get(AgentType.STARTUP_EXTRACTION),
        market_analysis=analyses.get(AgentType.MARKET),
        founder_analysis=analyses.get(AgentType.FOUNDER),
        financial_analysis=analyses.get(AgentType.FINANCIAL),
        risk_analysis=analyses.get(AgentType.RISK),
        unicorn_prediction=analyses.get(AgentType.UNICORN),
        committee_votes=[
            {
                "investor_type": v.investor_type.value,
                "decision": v.decision.value,
                "reasoning": v.reasoning,
                "suggested_investment_amount": v.suggested_amount or 0,
                "suggested_equity_pct": v.suggested_equity_pct or 0,
            }
            for v in votes
        ],
        final_recommendation=(
            {
                "overall_score": final.overall_score,
                "decision": final.decision.value,
                "reasoning": final.reasoning,
                "human_decision": final.human_decision,
            }
            if final
            else None
        ),
        pending_approval_payload=pending_payload,
    )


INVESTOR_PERSONAS = {
    "technology": (
        "TECHNOLOGY INVESTOR — a former CTO turned VC partner who has shipped and scaled three production "
        "platforms. Cares about highly defensible technology; penalizes startups whose 'innovation' is a thin "
        "wrapper around someone else's product with no moat."
    ),
    "financial": (
        "FINANCIAL INVESTOR — spent a decade as a public markets analyst before moving into venture. Cares "
        "about unit economics over growth-at-all-costs narratives; PASSes on a hot story with no credible path to margin."
    ),
    "market": (
        "MARKET INVESTOR — has led go-to-market diligence on over a hundred deals. Distinguishes real customer "
        "demand from founder optimism; discounts markets already dominated by well-funded incumbents unless there "
        "is a clear wedge."
    ),
    "risk": (
        "RISK INVESTOR — the committee's designated skeptic, modeled after a risk officer at an institutional "
        "fund. Has seen deals collapse from regulatory surprises and founder blind spots; votes PASS whenever "
        "critical risks are unaddressed."
    ),
    "growth": (
        "GROWTH INVESTOR — specializes in growth-stage follow-on rounds and thinks several rounds ahead: "
        "will this company be fundable at a higher valuation in 18 months? Backs companies with a credible "
        "compounding trajectory, not just a good quarter."
    ),
}


async def chat_with_committee_member(
    db: AsyncSession,
    run_id: uuid.UUID,
    *,
    investor_type: str,
    message: str,
    history: list[dict],
) -> str:
    # 1. Fetch the workflow run
    run = await db.get(WorkflowRun, run_id)
    if not run:
        raise NotFoundError(f"Workflow run {run_id} not found")

    startup = await db.get(Startup, run.startup_id)
    if not startup:
        raise NotFoundError(f"Startup {run.startup_id} not found")

    # 2. Fetch the specific vote from the DB
    from app.models.committee import CommitteeVote
    vote_result = await db.execute(
        select(CommitteeVote).where(
            CommitteeVote.workflow_run_id == run.id,
            CommitteeVote.investor_type == investor_type
        )
    )
    vote = vote_result.scalar_one_or_none()
    vote_details = ""
    if vote:
        vote_details = (
            f"During the simulated investment committee meeting, you voted: {vote.decision}.\n"
            f"Your recorded reasoning was: {vote.reasoning}\n"
        )
        if vote.decision == "INVEST":
            vote_details += f"Suggested check size: ${vote.suggested_amount:,.2f} for {vote.suggested_equity_pct}% equity.\n"

    # 3. Retrieve grounding context from Chroma DB
    from app.rag.retriever import retrieve_context
    context = retrieve_context(startup.chroma_collection, query=message, k=5)

    # 4. Construct System Prompt
    persona_desc = INVESTOR_PERSONAS.get(investor_type, "Venture Capital Partner")

    system_prompt = (
        f"You are the following investment committee partner: {persona_desc}\n\n"
        f"You are discussing the startup '{startup.name}' ({startup.industry or 'Unknown Industry'}) with a VC Associate.\n"
        f"{vote_details}\n"
        f"Here is some relevant context retrieved from the startup's pitch deck and documents:\n"
        f"--- CONTEXT ---\n"
        f"{context}\n"
        f"---------------\n\n"
        f"Guidelines:\n"
        f"- Stay completely in-character as this specific investor partner type.\n"
        f"- Ground your answers strictly in the retrieved facts and your recorded committee vote.\n"
        f"- Be concise, direct, professional, and slightly opinionated, as a partner-level VC investor would be.\n"
        f"- If the answer cannot be found in the context or database records, state that it is not in the uploaded files, but feel free to explain what you look for as a partner with your specific expertise."
    )

    # 5. Call LLM
    from app.agents.base import get_llm
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

    messages = [SystemMessage(content=system_prompt)]
    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "human"):
            messages.append(HumanMessage(content=content))
        elif role in ("assistant", "ai"):
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=message))

    llm = get_llm(temperature=0.7)
    response = await llm.ainvoke(messages)
    return response.content

