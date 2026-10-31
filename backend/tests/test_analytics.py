from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import delete, select

from app.core.config import Settings, get_settings
from app.core.database import SessionLocal
from app.models.analytics import AnalyticsEvent
from app.services import analytics
from tests.conftest import API

COLLECT = f"{API}/analytics/collect"
REPORT = f"{API}/admin/analytics"
CHROME = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Safari/537.36"
)
IPHONE = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
)


@pytest.fixture(autouse=True)
def _clean_events() -> None:
    with SessionLocal() as db:
        db.execute(delete(AnalyticsEvent))
        db.commit()


def hit(client: TestClient, path: str = "/", ua: str = CHROME, **extra: Any) -> int:
    headers = {"User-Agent": ua, **extra.pop("headers", {})}
    return client.post(COLLECT, json={"path": path, **extra}, headers=headers).status_code


def rows() -> list[AnalyticsEvent]:
    with SessionLocal() as db:
        return list(db.scalars(select(AnalyticsEvent)))


# --- collection ---


def test_records_a_pageview(client: TestClient) -> None:
    assert (
        hit(client, "/projects/aurora", referrer="https://www.google.com/search?q=x", lang="en")
        == 204
    )
    [row] = rows()
    assert (row.kind, row.path, row.referrer, row.locale) == (
        "pageview",
        "/projects/aurora",
        "google.com",
        "en",
    )
    assert (row.device, row.browser) == ("desktop", "Chrome")
    assert row.day == analytics.local_today()


def test_user_agent_parsing() -> None:
    assert analytics.parse_user_agent(IPHONE) == ("mobile", "Safari")
    assert analytics.parse_user_agent(CHROME + " Edg/130.0") == ("desktop", "Edge")
    assert analytics.parse_user_agent("Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/131.0") == (
        "desktop",
        "Firefox",
    )
    assert (
        analytics.parse_user_agent("Mozilla/5.0 (iPad; CPU OS 17_5) AppleWebKit Mobile Safari")[0]
        == "tablet"
    )
    assert (
        analytics.parse_user_agent(
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile Safari"
        )[0]
        == "mobile"
    )


@pytest.mark.parametrize(
    "ua",
    [
        "Googlebot/2.1 (+http://www.google.com/bot.html)",
        "curl/8.5.0",
        "python-requests/2.32",
        "HeadlessChrome/130",
        "Lighthouse",
        "",
    ],
)
def test_bots_and_missing_user_agents_are_ignored(client: TestClient, ua: str) -> None:
    assert hit(client, "/", ua=ua) == 204  # same answer: the response reveals nothing
    assert rows() == []


def test_do_not_track_and_gpc_are_respected(client: TestClient) -> None:
    assert hit(client, "/", headers={"DNT": "1"}) == 204
    assert hit(client, "/", headers={"Sec-GPC": "1"}) == 204
    assert rows() == []


@pytest.mark.parametrize(
    "path",
    [
        "/admin",
        "/admin/projects",
        "/wp-login.php",
        "//evil.com",
        "/projects/",
        "/projects/Bad Slug",
        "/<script>",
        "/a/b/c",
    ],
)
def test_only_real_site_routes_are_stored(client: TestClient, path: str) -> None:
    assert hit(client, path) == 204
    assert rows() == []


def test_query_strings_and_trailing_slashes_are_normalised(client: TestClient) -> None:
    hit(client, "/profile/?utm_source=x&token=secret#frag")
    assert [r.path for r in rows()] == ["/profile"]


@pytest.mark.parametrize(
    "body", [{}, {"path": "/", "extra": 1}, {"path": "/" + "a" * 300}, {"path": "/", "lang": "xx"}]
)
def test_malformed_beacons_are_rejected(client: TestClient, body: dict[str, Any]) -> None:
    assert client.post(COLLECT, json=body, headers={"User-Agent": CHROME}).status_code == 422


def test_referrer_handling() -> None:
    own = {"example.com"}
    assert analytics.referrer_host("https://www.example.com/profile", own) == ""  # same site
    assert (
        analytics.referrer_host("https://news.ycombinator.com/item?id=1", own)
        == "news.ycombinator.com"
    )
    assert analytics.referrer_host("javascript:alert(1)", own) == ""
    assert analytics.referrer_host("android-app://com.google.android.gm", own) == ""
    assert analytics.referrer_host("", own) == ""


def test_own_host_referrer_is_not_a_referral(client: TestClient) -> None:
    hit(client, "/", referrer="http://testserver/projects/aurora")
    assert rows()[0].referrer == ""


def test_country_comes_only_from_the_configured_header(client: TestClient) -> None:
    hit(client, "/", headers={"CF-IPCountry": "br"})
    hit(client, "/profile", headers={"CF-IPCountry": "XX"})  # Cloudflare's "unknown"
    hit(client, "/profile", headers={"CF-IPCountry": "<script>"})
    assert sorted(r.country for r in rows()) == ["", "", "BR"]


def test_collect_is_rate_limited(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "rate_limit_collect", 3)
    codes = [hit(client, "/") for _ in range(4)]
    assert codes == [204, 204, 204, 429]


def test_disabled_analytics_records_nothing(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "analytics_enabled", False)
    assert hit(client, "/") == 204
    assert rows() == []


# --- privacy guarantees ---


def test_visitor_id_is_stable_within_a_day_and_rotates_across_days() -> None:
    d1, d2 = date(2026, 1, 1), date(2026, 1, 2)
    a = analytics.visitor_id("203.0.113.7", CHROME, d1)
    assert a == analytics.visitor_id("203.0.113.7", CHROME, d1)
    assert a != analytics.visitor_id("203.0.113.8", CHROME, d1)  # other IP
    assert a != analytics.visitor_id("203.0.113.7", IPHONE, d1)  # other browser
    assert a != analytics.visitor_id("203.0.113.7", CHROME, d2)  # next day: unlinkable
    assert len(a) == 16


def test_raw_ip_and_user_agent_are_never_stored(client: TestClient) -> None:
    client.post(
        COLLECT,
        json={"path": "/"},
        headers={"User-Agent": CHROME, "X-Forwarded-For": "198.51.100.23"},
    )
    stored = " ".join(
        str(getattr(r, c.name)) for r in rows() for c in AnalyticsEvent.__table__.columns
    )
    assert "198.51.100.23" not in stored
    assert "testclient" not in stored  # starlette's fake client host
    assert "Mozilla" not in stored


# --- reporting ---


def test_report_requires_authentication(client: TestClient) -> None:
    assert client.get(REPORT).status_code == 401


def test_report_aggregates_correctly(client: TestClient, auth_headers: dict[str, str]) -> None:
    today = analytics.local_today()
    with SessionLocal() as db:

        def add(**kw: Any) -> None:
            defaults = {
                "kind": "pageview",
                "path": "/",
                "device": "desktop",
                "browser": "Chrome",
                "locale": "en",
            }
            db.add(AnalyticsEvent(**{**defaults, **kw}))

        add(day=today, visitor="aaaa", path="/")
        add(day=today, visitor="aaaa", path="/projects/aurora")  # same visitor, 2 views
        add(
            day=today,
            visitor="bbbb",
            path="/projects/aurora",
            referrer="google.com",
            country="BR",
            device="mobile",
            browser="Safari",
            locale="pt-BR",
        )
        add(day=today - timedelta(days=2), visitor="cccc", path="/projects/atlas")
        add(
            day=today - timedelta(days=40), visitor="dddd", path="/"
        )  # previous period (days 30-59)
        add(day=today - timedelta(days=35), visitor="eeee", path="/")  # previous period
        add(day=today - timedelta(days=70), visitor="ffff", path="/")  # outside both windows
        add(day=today, visitor="aaaa", kind="resume_download", path="/profile")
        db.commit()

    r = client.get(REPORT, params={"days": 30}, headers=auth_headers).json()
    assert r["totals"] == {"pageviews": 4, "visitors": 3, "resume_downloads": 1}
    assert r["previous"] == {"pageviews": 2, "visitors": 2}
    assert len(r["series"]) == 30  # zero-filled: one point per day
    assert r["series"][-1] == {"date": today.isoformat(), "pageviews": 3, "visitors": 2}
    assert r["series"][-3]["pageviews"] == 1
    assert sum(p["pageviews"] for p in r["series"]) == 4
    assert r["top_pages"][0] == {"name": "/projects/aurora", "views": 2, "visitors": 2}
    assert [p["name"] for p in r["top_projects"]] == ["/projects/aurora", "/projects/atlas"]
    assert {b["name"]: b["views"] for b in r["referrers"]} == {"": 3, "google.com": 1}
    assert {b["name"] for b in r["countries"]} == {"", "BR"}
    assert {b["name"]: b["views"] for b in r["devices"]} == {"desktop": 3, "mobile": 1}
    assert {b["name"] for b in r["locales"]} == {"en", "pt-BR"}

    seven = client.get(REPORT, params={"days": 7}, headers=auth_headers).json()
    assert seven["totals"]["pageviews"] == 4
    assert len(seven["series"]) == 7


@pytest.mark.parametrize("days", [0, -1, 367, "abc"])
def test_report_validates_range(
    client: TestClient, auth_headers: dict[str, str], days: Any
) -> None:
    assert client.get(REPORT, params={"days": days}, headers=auth_headers).status_code == 422


def test_empty_report_is_all_zeroes(client: TestClient, auth_headers: dict[str, str]) -> None:
    r = client.get(REPORT, headers=auth_headers).json()
    assert r["totals"] == {"pageviews": 0, "visitors": 0, "resume_downloads": 0}
    assert len(r["series"]) == 30 and all(p["pageviews"] == 0 for p in r["series"])
    assert r["top_pages"] == []


def test_end_to_end_beacon_to_report(client: TestClient, auth_headers: dict[str, str]) -> None:
    hit(client, "/", ua=CHROME)
    hit(client, "/projects/aurora", ua=CHROME)
    hit(client, "/", ua=IPHONE)
    r = client.get(REPORT, headers=auth_headers).json()
    assert r["totals"]["pageviews"] == 3
    assert r["totals"]["visitors"] == 2  # Chrome and iPhone share the test IP but differ in UA


def test_resume_download_is_counted(client: TestClient, auth_headers: dict[str, str]) -> None:
    pytest.importorskip("weasyprint")
    res = client.get(f"{API}/resume.pdf", params={"lang": "en"}, headers={"User-Agent": CHROME})
    if res.status_code == 503:
        pytest.skip("Pango not installed")
    assert res.status_code == 200
    r = client.get(REPORT, headers=auth_headers).json()
    assert r["totals"]["resume_downloads"] == 1
    assert r["totals"]["pageviews"] == 0  # a download is not a page view


# --- retention & timezone ---


def test_purge_removes_only_old_events() -> None:
    today = analytics.local_today()
    with SessionLocal() as db:
        db.add_all(
            [
                AnalyticsEvent(day=today - timedelta(days=500)),
                AnalyticsEvent(day=today - timedelta(days=5)),
            ]
        )
        db.commit()
        assert analytics.purge_old(db, retention_days=400) == 1
        assert db.scalar(select(AnalyticsEvent.id).limit(1)) is not None


def test_days_follow_the_configured_timezone(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "analytics_timezone", "Pacific/Kiritimati")  # UTC+14
    ahead = analytics.local_today()
    monkeypatch.setattr(get_settings(), "analytics_timezone", "Pacific/Pago_Pago")  # UTC-11
    behind = analytics.local_today()
    assert ahead - behind == timedelta(days=1)


def test_invalid_timezone_is_rejected() -> None:
    with pytest.raises(ValidationError, match="Unknown timezone"):
        Settings(analytics_timezone="Mars/Olympus", _env_file=None)
    assert (
        Settings(analytics_timezone="America/Sao_Paulo", _env_file=None).analytics_timezone
        == "America/Sao_Paulo"
    )
