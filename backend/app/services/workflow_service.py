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
