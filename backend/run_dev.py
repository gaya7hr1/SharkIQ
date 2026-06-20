"""Windows-safe local dev entrypoint.

`uvicorn app.main:app` hard-codes `ProactorEventLoop` on Windows (see
uvicorn.loops.asyncio.asyncio_loop_factory), which psycopg's async mode
(used by LangGraph's Postgres checkpointer) cannot run under. This runs the
same server under a SelectorEventLoop instead. Not needed in the Docker
image (Linux has no Proactor/Selector split), so the Dockerfile keeps using
plain `uvicorn app.main:app`.
"""

import asyncio
import sys

import uvicorn


async def _serve() -> None:
    config = uvicorn.Config("app.main:app", host="0.0.0.0", port=8010, reload=False)
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.run(_serve(), loop_factory=asyncio.SelectorEventLoop)
    else:
        asyncio.run(_serve())
