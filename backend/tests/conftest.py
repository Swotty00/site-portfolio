"""Test fixtures. Environment is configured *before* the app is imported."""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="portfolio-tests-"))
os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DATABASE_URL": f"sqlite:///{_TMP / 'test.db'}",
        "UPLOAD_DIR": str(_TMP / "uploads"),
        "SECRET_KEY": "test-secret-key-test-secret-key-test-secret",
        "ADMIN_USERNAME": "admin",
        "ADMIN_PASSWORD": "correct-horse-battery",
        "ALLOWED_HOSTS": "testserver,localhost",
        "SEED_DEMO_DATA": "true",
    }
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.rate_limit import RateLimiter  # noqa: E402
from app.main import app  # noqa: E402

API = "/api/v1"
ADMIN = {"username": "admin", "password": "correct-horse-battery"}


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:  # context manager runs the lifespan (DB init + seed)
        yield c


@pytest.fixture(autouse=True)
def _reset_rate_limits() -> None:
    RateLimiter.reset_all()


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    res = client.post(f"{API}/auth/login", json=ADMIN)
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def project_payload(slug: str = "new-project", **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "slug": slug,
        "year": 2025,
        "client": "ACME",
        "client_url": "https://acme.example",
        "cover_image": "/uploads/cover.png",
        "images": [],
        "tags": ["Web"],
        "credits": [{"role": "Design", "name": "Jane"}],
        "translations": {
            "pt-BR": {"title": "Novo Projeto", "summary": "Resumo", "description": "Texto"},
            "en": {"title": "New Project", "summary": "Summary", "description": "Text"},
        },
        "published": True,
    }
    payload.update(overrides)
    return payload
