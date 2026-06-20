from unittest.mock import AsyncMock

from fastapi.testclient import TestClient


def test_health_check(monkeypatch):
    monkeypatch.setattr("app.main.init_checkpointer", AsyncMock(return_value=None))
    monkeypatch.setattr("app.main.close_checkpointer", AsyncMock(return_value=None))

    from app.main import app

    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "database" in data
    assert "chromadb" in data


def test_protected_route_requires_auth(monkeypatch):
    monkeypatch.setattr("app.main.init_checkpointer", AsyncMock(return_value=None))
    monkeypatch.setattr("app.main.close_checkpointer", AsyncMock(return_value=None))

    from app.main import app

    with TestClient(app) as client:
        response = client.get("/api/v1/startups")

    assert response.status_code == 401
