from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User


def get_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def get(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(User)) or 0


def create(db: Session, username: str, password: str) -> User:
    user = User(username=username, hashed_password=hash_password(password))
    db.add(user)
    db.commit()
    return user


def revoke_tokens(db: Session, user: User) -> None:
    """Invalidate every outstanding access/refresh token for the user."""
    user.token_version += 1
    db.commit()
