"""Create tables, bootstrap the admin account and (optionally) seed demo content."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app import crud, models  # noqa: F401  (models import registers tables on Base.metadata)
from app.core.config import get_settings
from app.core.database import Base, engine
from app.db import seed_data
from app.schemas.profile import ProfileUpdate
from app.schemas.project import ProjectCreate
from app.services.auth import bootstrap_admin

logger = logging.getLogger(__name__)


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
    bootstrap_admin(db)
    if settings.seed_demo_data:
        seed_demo_content(db)
