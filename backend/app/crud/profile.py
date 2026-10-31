from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.profile import PROFILE_ID, Profile
from app.schemas.profile import ProfileUpdate


def get(db: Session) -> Profile | None:
    return db.get(Profile, PROFILE_ID)


def upsert(db: Session, data: ProfileUpdate) -> Profile:
    profile = get(db) or Profile(id=PROFILE_ID)
    profile.name = data.name
    profile.email = data.email or ""
    profile.phone = data.phone
    profile.location = data.location
    profile.resume_url = data.resume_url
    profile.links = [link.model_dump(mode="json") for link in data.links]
    profile.translations = {k: v.model_dump(mode="json") for k, v in data.translations.items()}
    db.add(profile)
    db.commit()
    return profile
