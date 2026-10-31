from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text

from app.db.init_db import ensure_columns
from tests.conftest import API


def _editable(client: TestClient, headers: dict[str, str]) -> dict[str, Any]:
    current = client.get(f"{API}/admin/profile", headers=headers).json()
    keys = ("name", "email", "phone", "location", "resume_url", "links", "translations")
    return {k: current[k] for k in keys}


def test_public_profile_localized(client: TestClient) -> None:
    en = client.get(f"{API}/profile", params={"lang": "en"}).json()
    assert en["locale"] == "en"
    assert en["headline"] == "Full-stack & creative developer"
    assert {g["category"] for g in en["stack"]} >= {"Frontend", "Backend"}
    assert en["experience"][0]["bullets"]

    zh = client.get(f"{API}/profile", params={"lang": "zh-CN"}).json()
    assert zh["locale"] == "zh"
    assert "全栈" in zh["headline"]


def test_profile_update_requires_auth_and_validates(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = _editable(client, auth_headers)
    assert client.put(f"{API}/admin/profile", json=body).status_code == 401

    def put(**changes: Any) -> int:
        return client.put(
            f"{API}/admin/profile", json={**body, **changes}, headers=auth_headers
        ).status_code

    assert put(links=[{"label": "x", "url": "javascript:alert(1)"}]) == 422
    assert put(email="not-an-email") == 422
    assert put(name="Renamed Person") == 200
    assert client.get(f"{API}/profile").json()["name"] == "Renamed Person"
    client.put(f"{API}/admin/profile", json=body, headers=auth_headers)  # restore


# --- résumé link: written by hand, never generated ---


def test_resume_link_is_manual_and_round_trips(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = _editable(client, auth_headers)
    assert body["resume_url"] == ""  # nothing is generated or pre-filled
    assert client.get(f"{API}/profile").json()["resume_url"] == ""

    for url in (
        "https://read.cv/someone/resume.pdf",
        "https://drive.google.com/file/d/abc/view",
        "/curriculo.pdf",
    ):
        res = client.put(
            f"{API}/admin/profile", json={**body, "resume_url": url}, headers=auth_headers
        )
        assert res.status_code == 200, res.text
        assert res.json()["resume_url"] == url
        for lang in ("pt-BR", "en", "ja"):  # the same link is served for every site language
            assert client.get(f"{API}/profile", params={"lang": lang}).json()["resume_url"] == url

    client.put(f"{API}/admin/profile", json=body, headers=auth_headers)  # restore


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "data:application/pdf;base64,AAAA",
        "//evil.example/cv.pdf",
        "ftp://x.example/cv.pdf",
        "file:///etc/passwd",
        "x" * 501,
    ],
)
def test_resume_link_rejects_unsafe_values(
    client: TestClient, auth_headers: dict[str, str], url: str
) -> None:
    body = _editable(client, auth_headers)
    res = client.put(f"{API}/admin/profile", json={**body, "resume_url": url}, headers=auth_headers)
    assert res.status_code == 422


def test_there_is_no_generated_pdf_endpoint(client: TestClient) -> None:
    for lang in ("pt-BR", "en"):
        assert client.get(f"{API}/resume.pdf", params={"lang": lang}).status_code == 404


# --- migrating databases created before resume_url existed ---


def test_ensure_columns_upgrades_an_old_database_without_losing_data(tmp_path: Any) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as conn:  # the schema as it was before the résumé link existed
        conn.execute(
            text(
                "CREATE TABLE profile (id INTEGER PRIMARY KEY, name VARCHAR(120), "
                "location VARCHAR(120))"
            )
        )
        conn.execute(text("INSERT INTO profile (id, name, location) VALUES (1, 'Ana', 'Recife')"))

    assert ensure_columns(engine) == ["profile.resume_url"]
    assert "resume_url" in {c["name"] for c in inspect(engine).get_columns("profile")}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT name, resume_url FROM profile")).one() == ("Ana", "")

    assert ensure_columns(engine) == []  # idempotent: safe to run on every start
    assert ensure_columns(create_engine("sqlite://")) == []  # no profile table yet: nothing to do
