"""First-party, privacy-friendly traffic analytics (in the spirit of Plausible/Umami).

Privacy by construction:
- no cookies, no localStorage ID, no fingerprinting beyond User-Agent
- the raw IP is never stored: `visitor` = HMAC(daily_salt, ip|user-agent) truncated, and the salt
  is derived from SECRET_KEY + the date, so the same person gets a different ID every day and the
  value cannot be reversed or linked across days
- only the referrer *hostname* is kept; paths have no query string
- honours Do-Not-Track and Global Privacy Control; ignores bots
"""

from __future__ import annotations

import hashlib
import hmac
import re
from datetime import UTC, date, datetime, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from sqlalchemy import ColumnElement, delete, func, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.core.config import get_settings
from app.models.analytics import AnalyticsEvent
from app.schemas.analytics import (
    AnalyticsReport,
    Bucket,
    DayPoint,
    PreviousTotals,
    Totals,
)
from app.schemas.common import SUPPORTED_LOCALES

PAGEVIEW = "pageview"
RESUME_DOWNLOAD = "resume_download"

_BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|curl|wget|python-requests|"
    r"httpx|aiohttp|axios|node-fetch|go-http|java/|libwww|okhttp|scrapy|preview|monitor|uptime|"
    r"facebookexternalhit|embedly|whatsapp|telegram|discord|pingdom|statuscake",
    re.IGNORECASE,
)
# Only the site's real routes are accepted: it keeps the table small and stops a public
# endpoint from being used to stuff arbitrary strings into the database.
_PATH_RE = re.compile(r"^/(?:profile|projects/[a-z0-9]+(?:-[a-z0-9]+)*)?$")
_COUNTRY_RE = re.compile(r"^[A-Z]{2}$")


def is_bot(user_agent: str) -> bool:
    return not user_agent.strip() or bool(_BOT_RE.search(user_agent))


def parse_user_agent(user_agent: str) -> tuple[str, str]:
    """Return (device, browser) using a few conservative patterns."""
    ua = user_agent.lower()
    if "ipad" in ua or "tablet" in ua or ("android" in ua and "mobile" not in ua):
        device = "tablet"
    elif any(token in ua for token in ("mobi", "iphone", "ipod", "android")):
        device = "mobile"
    else:
        device = "desktop"

    if "edg/" in ua or "edga/" in ua or "edgios/" in ua:
        browser = "Edge"
    elif "opr/" in ua or "opera" in ua:
        browser = "Opera"
    elif "firefox" in ua or "fxios" in ua:
        browser = "Firefox"
    elif "chrome" in ua or "crios" in ua:
        browser = "Chrome"
    elif "safari" in ua:
        browser = "Safari"
    else:
        browser = "Other"
    return device, browser


def normalize_path(raw: str) -> str | None:
    """Strip query/fragment and trailing slash; None for anything that isn't a site route."""
    path = raw.split("?", 1)[0].split("#", 1)[0]
    if len(path) > 1:
        path = path.rstrip("/")
    return path if _PATH_RE.match(path) else None


def referrer_host(referrer: str, own_hosts: set[str]) -> str:
    """Hostname of an *external* referrer, else ''. Same-site navigation isn't a referral."""
    if not referrer:
        return ""
    try:
        host = (urlparse(referrer).hostname or "").lower()
        scheme = urlparse(referrer).scheme
    except ValueError:
        return ""
    host = host.removeprefix("www.")
    if scheme not in ("http", "https") or not host or len(host) > 120:
        return ""
    return "" if host in own_hosts else host


def local_today() -> date:
    return datetime.now(ZoneInfo(get_settings().analytics_timezone)).date()


def visitor_id(ip: str, user_agent: str, day: date) -> str:
    secret = get_settings().secret_key.get_secret_value().encode()
    daily_salt = hmac.new(secret, f"analytics:{day.isoformat()}".encode(), hashlib.sha256).digest()
    return hmac.new(daily_salt, f"{ip}|{user_agent}".encode(), hashlib.sha256).hexdigest()[:16]


def _clean_country(value: str | None) -> str:
    code = (value or "").strip().upper()
    return code if _COUNTRY_RE.match(code) and code not in {"XX", "T1"} else ""


def record(
    db: Session,
    *,
    kind: str,
    path: str,
    ip: str,
    user_agent: str,
    referrer: str = "",
    lang: str | None = None,
    country_header: str | None = None,
    own_hosts: set[str] | None = None,
) -> bool:
    """Store one event. Returns False when it was (deliberately) not recorded."""
    settings = get_settings()
    if not settings.analytics_enabled or is_bot(user_agent):
        return False
    clean_path = normalize_path(path)
    if clean_path is None:
        return False

    day = local_today()
    device, browser = parse_user_agent(user_agent)
    db.add(
        AnalyticsEvent(
            day=day,
            kind=kind,
            path=clean_path,
            referrer=referrer_host(referrer, own_hosts or set()),
            country=_clean_country(country_header),
            device=device,
            browser=browser,
            locale=lang if lang in SUPPORTED_LOCALES else "",
            visitor=visitor_id(ip, user_agent, day),
        )
    )
    db.commit()
    return True


def purge_old(db: Session, retention_days: int | None = None) -> int:
    days = retention_days or get_settings().analytics_retention_days
    cutoff = local_today() - timedelta(days=days)
    result = db.execute(delete(AnalyticsEvent).where(AnalyticsEvent.day < cutoff))
    db.commit()
    return int(result.rowcount or 0)  # type: ignore[attr-defined]


# --------------------------------------------------------------------------------- reporting


def _count_range(db: Session, start: date, end: date) -> tuple[int, int]:
    row = db.execute(
        select(func.count(), func.count(func.distinct(AnalyticsEvent.visitor))).where(
            AnalyticsEvent.kind == PAGEVIEW, AnalyticsEvent.day >= start, AnalyticsEvent.day <= end
        )
    ).one()
    return int(row[0]), int(row[1])


def _buckets(
    db: Session,
    column: InstrumentedAttribute[str],
    start: date,
    end: date,
    *,
    limit: int = 10,
    extra: ColumnElement[bool] | None = None,
) -> list[Bucket]:
    stmt = (
        select(
            column, func.count().label("views"), func.count(func.distinct(AnalyticsEvent.visitor))
        )
        .where(
            AnalyticsEvent.kind == PAGEVIEW, AnalyticsEvent.day >= start, AnalyticsEvent.day <= end
        )
        .group_by(column)
        .order_by(func.count().desc(), column)
        .limit(limit)
    )
    if extra is not None:
        stmt = stmt.where(extra)
    return [
        Bucket(name=name or "", views=int(v), visitors=int(u)) for name, v, u in db.execute(stmt)
    ]


def build_report(db: Session, days: int) -> AnalyticsReport:
    end = local_today()
    start = end - timedelta(days=days - 1)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)

    per_day = {
        d: (int(v), int(u))
        for d, v, u in db.execute(
            select(
                AnalyticsEvent.day, func.count(), func.count(func.distinct(AnalyticsEvent.visitor))
            )
            .where(
                AnalyticsEvent.kind == PAGEVIEW,
                AnalyticsEvent.day >= start,
                AnalyticsEvent.day <= end,
            )
            .group_by(AnalyticsEvent.day)
        )
    }
    series = [
        DayPoint(date=d, pageviews=per_day.get(d, (0, 0))[0], visitors=per_day.get(d, (0, 0))[1])
        for d in (start + timedelta(days=i) for i in range(days))
    ]

    pageviews, visitors = _count_range(db, start, end)
    prev_views, prev_visitors = _count_range(db, prev_start, prev_end)
    downloads = db.scalar(
        select(func.count()).where(
            AnalyticsEvent.kind == RESUME_DOWNLOAD,
            AnalyticsEvent.day >= start,
            AnalyticsEvent.day <= end,
        )
    )

    return AnalyticsReport(
        days=days,
        start=start,
        end=end,
        timezone=get_settings().analytics_timezone,
        totals=Totals(pageviews=pageviews, visitors=visitors, resume_downloads=int(downloads or 0)),
        previous=PreviousTotals(pageviews=prev_views, visitors=prev_visitors),
        series=series,
        top_pages=_buckets(db, AnalyticsEvent.path, start, end),
        top_projects=_buckets(
            db, AnalyticsEvent.path, start, end, extra=AnalyticsEvent.path.like("/projects/%")
        ),
        referrers=_buckets(db, AnalyticsEvent.referrer, start, end),
        countries=_buckets(db, AnalyticsEvent.country, start, end),
        devices=_buckets(db, AnalyticsEvent.device, start, end),
        browsers=_buckets(db, AnalyticsEvent.browser, start, end),
        locales=_buckets(db, AnalyticsEvent.locale, start, end),
    )


def utc_now() -> datetime:  # tiny seam so tests can freeze time if they want to
    return datetime.now(UTC)
