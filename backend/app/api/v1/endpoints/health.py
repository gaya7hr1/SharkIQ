import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.rag.vector_store import get_vector_store

router = APIRouter(tags=["health"])
logger = structlog.get_logger(__name__)


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    # 1. Ping PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error("health_check_database_failed", error=str(e))
        db_status = f"unhealthy: {str(e)}"

    # 2. Ping ChromaDB
    try:
        store = get_vector_store("health_check_collection")
        heartbeat = store._client.heartbeat()
        chroma_status = "healthy" if heartbeat else "degraded"
    except Exception as e:
        logger.error("health_check_chromadb_failed", error=str(e))
        chroma_status = f"unhealthy: {str(e)}"

    overall_status = (
        "healthy"
        if db_status == "healthy" and chroma_status == "healthy"
        else "degraded"
    )

    return {
        "status": overall_status,
        "database": db_status,
        "chromadb": chroma_status,
    }

