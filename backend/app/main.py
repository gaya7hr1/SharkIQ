import asyncio
import sys
import uuid
import time
import re
from contextlib import asynccontextmanager

import structlog

if sys.platform == "win32":
    # psycopg's async mode (used by LangGraph's Postgres checkpointer) cannot run
    # under Windows' default ProactorEventLoop - it requires SelectorEventLoop.
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.tracing import configure_tracing
from app.utils.exceptions import SharkIQError
from app.workflows.checkpointer import close_checkpointer, init_checkpointer
from app.core.metrics import metrics_collector

configure_logging()
configure_tracing()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", env=settings.app_env)
    await init_checkpointer()
    yield
    await close_checkpointer()
    logger.info("shutdown")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI Venture Capital Intelligence Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    structlog.contextvars.bind_contextvars(request_id=request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    structlog.contextvars.clear_contextvars()
    return response


@app.middleware("http")
async def request_metrics_middleware(request: Request, call_next):
    if request.url.path == "/metrics" or request.url.path.endswith("/health"):
        return await call_next(request)
    
    start_time = time.perf_counter()
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as e:
        status_code = 500
        raise e
    finally:
        duration = time.perf_counter() - start_time
        path = request.url.path
        normalized_path = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/{id}', path)
        normalized_path = re.sub(r'/\d+', '/{id}', normalized_path)
        metrics_collector.record_request(request.method, normalized_path, status_code, duration)
        
    return response


@app.get("/metrics")
async def get_metrics():
    return Response(
        content=metrics_collector.generate_prometheus_metrics(),
        media_type="text/plain; version=0.0.4"
    )


@app.exception_handler(SharkIQError)
async def sharkiq_error_handler(request: Request, exc: SharkIQError) -> JSONResponse:
    logger.warning("handled_error", error=exc.message, status_code=exc.status_code)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


app.include_router(api_router, prefix=settings.api_v1_prefix)
