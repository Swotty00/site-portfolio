from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import API, project_payload

ADMIN_PROJECTS = f"{API}/admin/projects"


def test_public_list_is_localized_with_fallback(client: TestClient) -> None:
    en = client.get(f"{API}/projects", params={"lang": "en"}).json()
    assert len(en) >= 5
    assert en[0]["slug"] == "aurora"
    assert en[0]["summary"].startswith("An immersive")
    assert en[0]["locale"] == "en"

    ja = client.get(f"{API}/projects", params={"lang": "ja-JP"}).json()
    assert ja[0]["locale"] == "ja"

    for lang in ("xx", "", "../../etc/passwd"):
        res = client.get(f"{API}/projects", params={"lang": lang}).json()
        assert res[0]["locale"] == "pt-BR"
    assert client.get(f"{API}/projects").json()[0]["locale"] == "pt-BR"


def test_project_detail_has_cycling_next_and_previous(client: TestClient) -> None:
    slugs = [p["slug"] for p in client.get(f"{API}/projects").json()]
    first = client.get(f"{API}/projects/{slugs[0]}").json()
    last = client.get(f"{API}/projects/{slugs[-1]}").json()
    assert first["next"]["slug"] == slugs[1]
    assert first["previous"]["slug"] == slugs[-1]  # wraps backwards
    assert last["next"]["slug"] == slugs[0]  # wraps forwards: the "cycling" flow
    assert first["credits"][0]["role"] == "Design"


def test_project_detail_404(client: TestClient) -> None:
    assert client.get(f"{API}/projects/does-not-exist").status_code == 404


def test_admin_endpoints_require_authentication(client: TestClient) -> None:
    assert client.get(ADMIN_PROJECTS).status_code == 401
    assert client.post(ADMIN_PROJECTS, json=project_payload()).status_code == 401
    assert client.patch(f"{ADMIN_PROJECTS}/1", json={"year": 2020}).status_code == 401
    assert client.delete(f"{ADMIN_PROJECTS}/1").status_code == 401
    assert client.get(f"{API}/admin/profile").status_code == 401
    assert client.post(f"{API}/admin/uploads").status_code == 401


def test_crud_lifecycle(client: TestClient, auth_headers: dict[str, str]) -> None:
    created = client.post(ADMIN_PROJECTS, json=project_payload("crud-demo"), headers=auth_headers)
    assert created.status_code == 201, created.text
    project = created.json()
    pid = project["id"]
    assert project["translations"]["en"]["title"] == "New Project"

    # visible publicly, in English
    public = client.get(f"{API}/projects/crud-demo", params={"lang": "en"}).json()
    assert public["title"] == "New Project"

    # partial update leaves other fields untouched
    patched = client.patch(
        f"{ADMIN_PROJECTS}/{pid}", json={"year": 2021, "published": False}, headers=auth_headers
    )
    assert patched.status_code == 200
    assert patched.json()["year"] == 2021
    assert patched.json()["client"] == "ACME"

    # unpublished => hidden from the public site, still visible to admins
    assert client.get(f"{API}/projects/crud-demo").status_code == 404
    assert "crud-demo" not in [p["slug"] for p in client.get(f"{API}/projects").json()]
    assert client.get(f"{ADMIN_PROJECTS}/{pid}", headers=auth_headers).status_code == 200

    assert client.delete(f"{ADMIN_PROJECTS}/{pid}", headers=auth_headers).status_code == 204
    assert client.get(f"{ADMIN_PROJECTS}/{pid}", headers=auth_headers).status_code == 404
    assert client.delete(f"{ADMIN_PROJECTS}/{pid}", headers=auth_headers).status_code == 404


def test_duplicate_slug_conflict(client: TestClient, auth_headers: dict[str, str]) -> None:
    first = client.post(ADMIN_PROJECTS, json=project_payload("dupe"), headers=auth_headers)
    assert first.status_code == 201
    again = client.post(ADMIN_PROJECTS, json=project_payload("dupe"), headers=auth_headers)
    assert again.status_code == 409
    other = client.post(ADMIN_PROJECTS, json=project_payload("dupe-2"), headers=auth_headers).json()
    clash = client.patch(
        f"{ADMIN_PROJECTS}/{other['id']}", json={"slug": "dupe"}, headers=auth_headers
    )
    assert clash.status_code == 409
    for pid in (first.json()["id"], other["id"]):
        client.delete(f"{ADMIN_PROJECTS}/{pid}", headers=auth_headers)


def test_input_validation(client: TestClient, auth_headers: dict[str, str]) -> None:
    def post(**overrides: object) -> int:
        return client.post(
            ADMIN_PROJECTS, json=project_payload(**overrides), headers=auth_headers
        ).status_code

    assert post(slug="Bad Slug!") == 422
    assert post(slug="x") == 422
    assert post(year=1800) == 422
    assert post(client_url="javascript:alert(1)") == 422
    assert post(live_url="data:text/html,<script>alert(1)</script>") == 422
    assert post(cover_image="//evil.example/x.png") == 422
    assert post(images=["ftp://example.com/a.png"]) == 422
    assert post(translations={"en": {"title": "Only English"}}) == 422  # pt-BR required
    assert post(translations={"pt-BR": {"title": ""}}) == 422
    assert post(translations={"pt-BR": {"title": "ok"}, "xx": {"title": "bad locale"}}) == 422
    assert post(unexpected_field=1) == 422


def test_reorder(client: TestClient, auth_headers: dict[str, str]) -> None:
    items = client.get(ADMIN_PROJECTS, headers=auth_headers).json()
    ids = [p["id"] for p in items]
    reversed_ids = list(reversed(ids))
    res = client.post(f"{ADMIN_PROJECTS}/reorder", json={"ids": reversed_ids}, headers=auth_headers)
    assert res.status_code == 200
    assert [
        p["id"] for p in client.get(ADMIN_PROJECTS, headers=auth_headers).json()
    ] == reversed_ids
    # incomplete list is rejected
    bad = client.post(f"{ADMIN_PROJECTS}/reorder", json={"ids": ids[:-1]}, headers=auth_headers)
    assert bad.status_code == 422
    client.post(f"{ADMIN_PROJECTS}/reorder", json={"ids": ids}, headers=auth_headers)  # restore
