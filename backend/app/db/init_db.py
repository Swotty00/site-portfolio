"""Create tables, bootstrap the admin account and (optionally) seed demo content."""

from __future__ import annotations

import logging

from sqlalchemy import Engine, inspect, text
from sqlalchemy.orm import Session

from app import crud, models  # noqa: F401  (models import registers tables on Base.metadata)
from app.core.config import get_settings
from app.core.database import Base, engine
from app.db import seed_data
from app.schemas.profile import ProfileUpdate
from app.schemas.project import ProjectCreate
from app.services import analytics
from app.services.auth import bootstrap_admin

logger = logging.getLogger(__name__)


# Columns added after the first release. `create_all()` never alters an existing table, so databases
# created by an older version get them here. Idempotent; plain DDL that SQLite and Postgres accept.
_ADDED_COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("profile", "resume_url", "VARCHAR(500) NOT NULL DEFAULT ''"),
)


def ensure_columns(bind: Engine) -> list[str]:
    """Add any column from `_ADDED_COLUMNS` that the database is missing. Returns what was added."""
    added: list[str] = []
    inspector = inspect(bind)
    for table, column, ddl in _ADDED_COLUMNS:
        if not inspector.has_table(table):
            continue
        if column not in {c["name"] for c in inspector.get_columns(table)}:
            with bind.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))  # noqa: S608
            added.append(f"{table}.{column}")
    return added


def seed_demo_content(db: Session) -> None:
    if crud.profile.get(db) is None:
        crud.profile.upsert(
            db,
            ProfileUpdate.model_validate(
                {**seed_data.PROFILE, "translations": seed_data.profile_translations()}
            ),
        )
    if crud.project.count(db) == 0:
        for item in seed_data.projects():
            crud.project.create(db, ProjectCreate.model_validate(item))
        logger.info("Seeded demo projects")


def init_db(db: Session) -> None:
    settings = get_settings()
    if settings.database_url.startswith("sqlite"):
        # Make sure the folder holding the SQLite file exists (e.g. a fresh Docker volume).
        path = settings.database_url.removeprefix("sqlite:///")
        if path and path != ":memory:":
            from pathlib import Path  # noqa: PLC0415

            Path(path).parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    for added in ensure_columns(engine):
        logger.info("Migrated database: added column %s", added)
    bootstrap_admin(db)
    if settings.seed_demo_data:
        seed_demo_content(db)
    if settings.analytics_enabled:
        removed = analytics.purge_old(db)
        if removed:
            logger.info("Purged %d analytics events older than the retention window", removed)
