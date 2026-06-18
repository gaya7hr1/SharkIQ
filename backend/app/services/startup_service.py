import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.startup import Startup
from app.schemas.startup import StartupExtracted
from app.utils.exceptions import NotFoundError


async def create_startup(db: AsyncSession, *, owner_id: uuid.UUID, name: str) -> Startup:
    startup_id = uuid.uuid4()
    startup = Startup(
        id=startup_id,
        owner_id=owner_id,
        name=name,
        chroma_collection=f"startup_{startup_id.hex}",
    )
    db.add(startup)
    await db.commit()
    await db.refresh(startup)
    return startup


async def get_startup(db: AsyncSession, startup_id: uuid.UUID) -> Startup:
    startup = await db.get(Startup, startup_id)
    if startup is None:
        raise NotFoundError(f"Startup {startup_id} not found")
    return startup


async def list_startups(db: AsyncSession, owner_id: uuid.UUID) -> list[Startup]:
    result = await db.execute(select(Startup).where(Startup.owner_id == owner_id))
    return list(result.scalars().all())


async def apply_extraction(db: AsyncSession, startup: Startup, extracted: StartupExtracted) -> Startup:
    startup.name = extracted.startup_name or startup.name
    startup.industry = extracted.industry
    startup.problem_statement = extracted.problem_statement
    startup.solution = extracted.solution
    startup.target_audience = extracted.target_audience
    startup.revenue_model = extracted.revenue_model
    startup.funding_requirement = extracted.funding_requirement
    startup.business_stage = extracted.business_stage
    await db.commit()
    await db.refresh(startup)
    return startup
