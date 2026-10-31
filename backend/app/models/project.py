from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.user import utcnow


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)
    year: Mapped[int] = mapped_column(Integer)
    client: Mapped[str] = mapped_column(String(120), default="")
    client_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    live_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_image: Mapped[str] = mapped_column(String(500), default="")
    images: Mapped[list[str]] = mapped_column(JSON, default=list)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    credits: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    # {"pt-BR": {"title": ..., "summary": ..., "description": ..., "role": ...}, "en": {...}}
    translations: Mapped[dict[str, dict[str, Any]]] = mapped_column(JSON, default=dict)
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
