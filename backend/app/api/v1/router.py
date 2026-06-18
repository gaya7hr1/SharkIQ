from fastapi import APIRouter

from app.api.v1.endpoints import auth, documents, health, reports, startups, workflow

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(startups.router)
api_router.include_router(documents.router)
api_router.include_router(workflow.router)
api_router.include_router(reports.router)
