from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.schemas.profile import ProfilePublic
from app.services import resume
from tests.conftest import API

try:
    import weasyprint  # noqa: F401

    HAS_WEASYPRINT = True
except OSError:  # Pango/Cairo not installed on this machine
    HAS_WEASYPRINT = False

needs_pdf = pytest.mark.skipif(not HAS_WEASYPRINT, reason="WeasyPrint system libraries missing")


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
    current = client.get(f"{API}/admin/profile", headers=auth_headers).json()
    body = {k: current[k] for k in ("name", "email", "phone", "location", "links", "translations")}
    assert client.put(f"{API}/admin/profile", json=body).status_code == 401

    bad_link = {**body, "links": [{"label": "x", "url": "javascript:alert(1)"}]}
    assert (
        client.put(f"{API}/admin/profile", json=bad_link, headers=auth_headers).status_code == 422
    )
    bad_email = {**body, "email": "not-an-email"}
    assert (
        client.put(f"{API}/admin/profile", json=bad_email, headers=auth_headers).status_code == 422
    )

    renamed = {**body, "name": "Renamed Person"}
    res = client.put(f"{API}/admin/profile", json=renamed, headers=auth_headers)
    assert res.status_code == 200
    assert client.get(f"{API}/profile").json()["name"] == "Renamed Person"
    client.put(f"{API}/admin/profile", json=body, headers=auth_headers)  # restore


def test_resume_html_is_autoescaped(client: TestClient) -> None:
    profile = ProfilePublic(
        name="<script>alert(1)</script>",
        email="",
        phone="",
        location="",
        links=[],
        locale="en",
        headline="",
        bio="",
        about=[],
        stack=[],
        experience=[],
        education=[],
    )
    html = resume.render_html(profile, "en")
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;" in html


@needs_pdf
@pytest.mark.parametrize("lang", ["pt-BR", "en", "ru", "zh", "ja"])
def test_resume_pdf_per_locale(client: TestClient, lang: str) -> None:
    res = client.get(f"{API}/resume.pdf", params={"lang": lang})
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF-")
    assert "attachment" in res.headers["content-disposition"]
    assert lang in res.headers["content-disposition"]
    assert len(res.content) > 2_000


@needs_pdf
def test_resume_pdf_is_cached_and_invalidated(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    first = client.get(f"{API}/resume.pdf", params={"lang": "en"}).content
    assert client.get(f"{API}/resume.pdf", params={"lang": "en"}).content == first
    current = client.get(f"{API}/admin/profile", headers=auth_headers).json()
    body = {k: current[k] for k in ("name", "email", "phone", "location", "links", "translations")}
    client.put(f"{API}/admin/profile", json={**body, "location": "Elsewhere"}, headers=auth_headers)
    assert client.get(f"{API}/resume.pdf", params={"lang": "en"}).content != first
    client.put(f"{API}/admin/profile", json=body, headers=auth_headers)
