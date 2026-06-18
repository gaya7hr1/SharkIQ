from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.core.config import settings

_checkpointer: AsyncPostgresSaver | None = None
_cm = None


async def init_checkpointer() -> AsyncPostgresSaver:
    """Create (and migrate) the Postgres-backed LangGraph checkpointer.

    Called once at app startup. Using Postgres rather than the in-memory saver
    is what makes a paused-for-human-approval workflow survive a backend
    restart or be resumed from a different process/request.
    """
    global _checkpointer, _cm
    if _checkpointer is not None:
        return _checkpointer

    conninfo = settings.database_url_sync.replace("postgresql+psycopg2://", "postgresql://")
    _cm = AsyncPostgresSaver.from_conn_string(conninfo)
    _checkpointer = await _cm.__aenter__()
    await _checkpointer.setup()
    return _checkpointer


async def close_checkpointer() -> None:
    global _checkpointer, _cm
    if _cm is not None:
        await _cm.__aexit__(None, None, None)
    _checkpointer = None
    _cm = None


def get_checkpointer() -> AsyncPostgresSaver:
    if _checkpointer is None:
        raise RuntimeError("Checkpointer not initialized. Call init_checkpointer() at startup.")
    return _checkpointer
