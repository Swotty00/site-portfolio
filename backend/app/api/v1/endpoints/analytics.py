"""Public beacon endpoint used by the site to report page views."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.deps import DbSession
from app.core.config import get_settings
from app.core.rate_limit import collect_limiter
from app.schemas.analytics import CollectRequest
from app.services import analytics

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


def own_hosts(request: Request) -> set[str]:
    """Hostnames that count as 'this site' when judging whether a referrer is external."""
    hosts = {h.removeprefix("www.").lower() for h in get_settings().allowed_hosts if h != "*"}
    host = (request.headers.get("host") or "").split(":")[0].removeprefix("www.").lower()
    if host:
        hosts.add(host)
    return hosts


def client_ip(request: Request) -> str:
    return request.client.host if request.client else ""


@router.post(
    "/collect", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(collect_limiter)]
)
def collect(payload: CollectRequest, request: Request, db: DbSession) -> Response:
    """Always answers 204, whether or not the hit was recorded, so the response reveals nothing
    about bot filtering or privacy signals. Analytics must never break the site."""
    # Respect Do-Not-Track and Global Privacy Control.
    if request.headers.get("dnt") == "1" or request.headers.get("sec-gpc") == "1":
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    try:
        analytics.record(
            db,
            kind=analytics.PAGEVIEW,
            path=payload.path,
            ip=client_ip(request),
            user_agent=request.headers.get("user-agent", ""),
            referrer=payload.referrer,
            lang=payload.lang,
            country_header=request.headers.get(get_settings().analytics_country_header),
            own_hosts=own_hosts(request),
        )
    except Exception:
        db.rollback()
        logger.exception("Could not record analytics event")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
