import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.startup import StartupCreate, StartupRead
from app.services.startup_service import create_startup, get_startup, list_startups

router = APIRouter(prefix="/startups", tags=["startups"])


@router.post("", response_model=StartupRead, status_code=201)
async def create(
    payload: StartupCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_startup(db, owner_id=user.id, name=payload.name)


@router.get("", response_model=list[StartupRead])
async def list_all(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_startups(db, owner_id=user.id)


@router.get("/{startup_id}", response_model=StartupRead)
async def get_one(
    startup_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await get_startup(db, startup_id)
