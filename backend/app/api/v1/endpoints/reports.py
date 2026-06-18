import os
import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.committee import Report
from app.models.user import User
from app.utils.exceptions import NotFoundError

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{run_id}/download")
async def download_report(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Report).where(Report.workflow_run_id == run_id))
    report = result.scalar_one_or_none()
    if report is None or not os.path.exists(report.file_path):
        raise NotFoundError("Report not found. The workflow may not be completed yet.")

    return FileResponse(
        report.file_path,
        media_type="application/pdf",
        filename=os.path.basename(report.file_path),
    )
