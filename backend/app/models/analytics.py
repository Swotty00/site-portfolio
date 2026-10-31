from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.user import utcnow


class AnalyticsEvent(Base):
    """One page view (or résumé download). Deliberately holds no IP address and no cookie ID:
    `visitor` is an HMAC that rotates every day, so it can't be linked across days or reversed."""

    __tablename__ = "analytics_events"
    __table_args__ = (Index("ix_analytics_day_kind", "day", "kind"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    day: Mapped[date] = mapped_column(Date, index=True)  # in ANALYTICS_TIMEZONE
    kind: Mapped[str] = mapped_column(String(16), default="pageview")  # pageview | resume_download
    path: Mapped[str] = mapped_column(String(200), default="", index=True)
    referrer: Mapped[str] = mapped_column(String(120), default="")  # hostname only
    country: Mapped[str] = mapped_column(String(2), default="")
    device: Mapped[str] = mapped_column(String(10), default="")  # desktop | mobile | tablet
    browser: Mapped[str] = mapped_column(String(20), default="")
    locale: Mapped[str] = mapped_column(String(8), default="")  # language the site was shown in
    visitor: Mapped[str] = mapped_column(String(16), default="")  # daily-rotating anonymous hash
