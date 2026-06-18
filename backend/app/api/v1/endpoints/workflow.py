import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.workflow import HumanApprovalRequest, WorkflowResultRead, WorkflowRunRead
from app.services.startup_service import get_startup
from app.services.workflow_service import (
    get_workflow_result,
    get_workflow_run,
    list_workflow_runs,
    resume_workflow,
    start_workflow,
)

router = APIRouter(prefix="/workflow", tags=["workflow"])


@router.post("/startups/{startup_id}/start", response_model=WorkflowRunRead, status_code=201)
async def start(
    startup_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    startup = await get_startup(db, startup_id)
    return await start_workflow(db, startup)


@router.get("/startups/{startup_id}/runs", response_model=list[WorkflowRunRead])
async def list_runs(
    startup_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await list_workflow_runs(db, startup_id)


@router.get("/{run_id}", response_model=WorkflowResultRead)
async def get_result(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    run = await get_workflow_run(db, run_id)
    return await get_workflow_result(db, run)


@router.post("/{run_id}/approval", response_model=WorkflowResultRead)
async def submit_approval(
    run_id: uuid.UUID,
    payload: HumanApprovalRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    run = await get_workflow_run(db, run_id)
    run = await resume_workflow(db, run, action=payload.action, feedback=payload.feedback)
    return await get_workflow_result(db, run)
