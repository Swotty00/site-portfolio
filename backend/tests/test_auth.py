from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from tests.conftest import ADMIN, API


def test_password_hashing_roundtrip() -> None:
    hashed = hash_password("s3cret-pass")
    assert hashed != "s3cret-pass"
    assert hashed.startswith("$2")  # bcrypt
    assert verify_password("s3cret-pass", hashed)
    assert not verify_password("wrong", hashed)
    assert not verify_password("anything", None)  # unknown user path


def test_login_success_sets_httponly_refresh_cookie(client: TestClient) -> None:
    res = client.post(f"{API}/auth/login", json=ADMIN)
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    cookie = res.headers["set-cookie"].lower()
    assert "refresh_token=" in cookie
    assert "httponly" in cookie
    assert "samesite=strict" in cookie
    assert res.headers["cache-control"] == "no-store"


def test_login_failures_are_indistinguishable(client: TestClient) -> None:
    wrong_pw = client.post(f"{API}/auth/login", json={**ADMIN, "password": "nope-nope-nope"})
    no_user = client.post(f"{API}/auth/login", json={"username": "ghost", "password": "nope"})
    assert wrong_pw.status_code == no_user.status_code == 401
    assert wrong_pw.json() == no_user.json()


def test_login_validates_input(client: TestClient) -> None:
    res = client.post(f"{API}/auth/login", json={"username": "admin", "password": "x" * 100})
    assert res.status_code == 422
    assert "x" * 100 not in res.text  # submitted secrets are never echoed back
    assert client.post(f"{API}/auth/login", json={"username": "admin"}).status_code == 422
    extra = client.post(f"{API}/auth/login", json={**ADMIN, "is_admin": True})
    assert extra.status_code == 422


def test_login_is_rate_limited(client: TestClient) -> None:
    codes = [
        client.post(f"{API}/auth/login", json={**ADMIN, "password": "wrong-wrong"}).status_code
        for _ in range(7)
    ]
    assert codes[:5] == [401] * 5
    assert codes[5:] == [429, 429]
    res = client.post(f"{API}/auth/login", json=ADMIN)
    assert res.status_code == 429
    assert int(res.headers["retry-after"]) >= 1


def test_me_requires_valid_access_token(client: TestClient, auth_headers: dict[str, str]) -> None:
    assert client.get(f"{API}/auth/me").status_code == 401
    assert client.get(f"{API}/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401
    res = client.get(f"{API}/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["username"] == "admin"
    assert "hashed_password" not in res.text


def test_refresh_token_cannot_be_used_as_access_token(client: TestClient) -> None:
    refresh = create_refresh_token("1", 0)
    res = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {refresh}"})
    assert res.status_code == 401


def test_tampered_or_unsigned_tokens_rejected(client: TestClient) -> None:
    token = create_access_token("1", 0)
    forged = token[:-4] + ("AAAA" if not token.endswith("AAAA") else "BBBB")
    res = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 401


def test_refresh_rotates_and_logout_revokes_all_tokens(client: TestClient) -> None:
    login = client.post(f"{API}/auth/login", json=ADMIN)
    access = login.json()["access_token"]

    refreshed = client.post(f"{API}/auth/refresh")  # cookie jar carries the refresh token
    assert refreshed.status_code == 200
    new_access = refreshed.json()["access_token"]
    assert (
        client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {new_access}"}).status_code
        == 200
    )

    assert client.post(f"{API}/auth/logout").status_code == 204
    # Token version was bumped: previously issued access tokens are dead too.
    assert (
        client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {access}"}).status_code
        == 401
    )
    assert client.post(f"{API}/auth/refresh").status_code == 401


def test_refresh_without_cookie(client: TestClient) -> None:
    client.cookies.clear()
    assert client.post(f"{API}/auth/refresh").status_code == 401


def test_refresh_has_its_own_limit_so_page_reloads_do_not_lock_out_login(
    client: TestClient,
) -> None:
    client.post(f"{API}/auth/login", json=ADMIN)
    for _ in range(8):  # more than the login limit (5/min)
        assert client.post(f"{API}/auth/refresh").status_code == 200
    assert client.post(f"{API}/auth/login", json=ADMIN).status_code == 200
