from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.services.localization import normalize_locale
from tests.conftest import API

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def test_security_headers_present(client: TestClient) -> None:
    res = client.get(f"{API}/health")
    assert res.status_code == 200
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "no-referrer"
    assert "default-src 'none'" in res.headers["content-security-policy"]


def test_cors_allows_only_configured_origins(client: TestClient) -> None:
    ok = client.options(
        f"{API}/projects",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert ok.headers.get("access-control-allow-credentials") == "true"
    bad = client.options(
        f"{API}/projects",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in bad.headers


def test_untrusted_host_rejected(client: TestClient) -> None:
    res = client.get(f"{API}/health", headers={"Host": "evil.example"})
    assert res.status_code == 400


def test_loopback_host_is_always_allowed_for_health_checks(client: TestClient) -> None:
    # ALLOWED_HOSTS in the test env lists only "testserver,localhost": the Docker health check
    # (http://127.0.0.1:8000) must still pass, while foreign hosts stay rejected.
    assert client.get(f"{API}/health", headers={"Host": "127.0.0.1:8000"}).status_code == 200
    assert client.get(f"{API}/health", headers={"Host": "evil.example"}).status_code == 400


def test_unhandled_errors_do_not_leak_details(client: TestClient) -> None:
    assert client.get("/nope").json() == {"detail": "Not Found"}


def test_upload_accepts_images_and_serves_them(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    res = client.post(
        f"{API}/admin/uploads",
        headers=auth_headers,
        files={"file": ("../../x.png", PNG, "image/png")},
    )
    assert res.status_code == 201, res.text
    url = res.json()["url"]
    assert url.startswith("/uploads/") and url.endswith(".png")
    assert ".." not in url  # the client-provided filename is never used
    served = client.get(url)
    assert served.status_code == 200
    assert served.content == PNG
    assert served.headers["x-content-type-options"] == "nosniff"


@pytest.mark.parametrize(
    ("name", "content", "mime"),
    [
        (
            "evil.svg",
            b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
            "image/svg+xml",
        ),
        ("shell.png", b"<?php system($_GET['c']); ?>", "image/png"),  # lying extension/MIME
        ("empty.png", b"", "image/png"),
    ],
)
def test_upload_rejects_non_images(
    client: TestClient, auth_headers: dict[str, str], name: str, content: bytes, mime: str
) -> None:
    res = client.post(
        f"{API}/admin/uploads", headers=auth_headers, files={"file": (name, content, mime)}
    )
    assert res.status_code == 415


def test_upload_size_limit(client: TestClient, auth_headers: dict[str, str]) -> None:
    settings = get_settings()
    original = settings.max_upload_mb
    settings.max_upload_mb = 1
    try:
        big = PNG + b"\x00" * (1024 * 1024)
        res = client.post(
            f"{API}/admin/uploads",
            headers=auth_headers,
            files={"file": ("big.png", big, "image/png")},
        )
        assert res.status_code == 413
    finally:
        settings.max_upload_mb = original


def test_production_refuses_default_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    for var in ("SECRET_KEY", "ADMIN_PASSWORD", "CORS_ORIGINS"):
        monkeypatch.delenv(var, raising=False)  # conftest sets safe test values
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        Settings(environment="production", _env_file=None)
    with pytest.raises(ValidationError, match="CORS_ORIGINS"):
        Settings(
            environment="production",
            secret_key="x" * 40,
            admin_password="a-long-enough-password",
            cors_origins=["*"],
            _env_file=None,
        )
    ok = Settings(
        environment="production",
        secret_key="x" * 40,
        admin_password="a-long-enough-password",
        _env_file=None,
    )
    assert ok.use_secure_cookies is True


def test_cors_origins_parsed_from_csv(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example, https://b.example")
    assert Settings(_env_file=None).cors_origins == ["https://a.example", "https://b.example"]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("pt", "pt-BR"),
        ("PT-br", "pt-BR"),
        ("pt_BR", "pt-BR"),
        ("en-US", "en"),
        ("zh-CN", "zh"),
        ("ja", "ja"),
        ("ru-RU", "ru"),
        ("de", "pt-BR"),
        ("", "pt-BR"),
        (None, "pt-BR"),
    ],
)
def test_normalize_locale(raw: str | None, expected: str) -> None:
    assert normalize_locale(raw) == expected
