from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.schemas.common import LocaleCode


class CollectRequest(BaseModel):
    """What the browser beacon sends. Everything else (UA, IP, country) comes from the request."""

    model_config = ConfigDict(extra="forbid")

    path: Annotated[str, StringConstraints(max_length=200)]
    referrer: Annotated[str, StringConstraints(max_length=500)] = ""
    lang: LocaleCode | None = None
    # "resume_click" is sent when the visitor opens the résumé link; omitted for page views.
    event: Literal["resume_click"] | None = None


class DayPoint(BaseModel):
    date: date
    pageviews: int
    visitors: int


class Totals(BaseModel):
    pageviews: int
    visitors: int
    resume_downloads: int


class PreviousTotals(BaseModel):
    pageviews: int
    visitors: int


class Bucket(BaseModel):
    name: str  # "" = unknown / direct
    views: int
    visitors: int


class AnalyticsReport(BaseModel):
    days: int
    start: date
    end: date
    timezone: str
    totals: Totals
    previous: PreviousTotals  # the equally long period right before `start`, for deltas
    series: list[DayPoint]  # one point per day, zero-filled
    top_pages: list[Bucket]
    top_projects: list[Bucket]
    referrers: list[Bucket]
    countries: list[Bucket]
    devices: list[Bucket]
    browsers: list[Bucket]
    locales: list[Bucket]
