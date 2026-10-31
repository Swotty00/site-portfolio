from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app import crud
from app.core.config import get_settings
from app.core.security import (
    InvalidTokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import TokenResponse

logger = logging.getLogger(__name__)


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = crud.user.get_by_username(db, username)
    # verify_password always burns a bcrypt round, even for unknown users.
    valid = verify_password(password, user.hashed_password if user else None)
    if not user or not valid or not user.is_active:
        return None
    return user


def issue_tokens(user: User) -> tuple[TokenResponse, str]:
    """Return the JSON access-token payload and the refresh token (delivered as a cookie)."""
    settings = get_settings()
    subject = str(user.id)
    access = create_access_token(subject, user.token_version)
    refresh = create_refresh_token(subject, user.token_version)
    body = TokenResponse(access_token=access, expires_in=settings.access_token_expire_minutes * 60)
    return body, refresh


def user_from_token(db: Session, token: str, expected: str) -> User:
    """Resolve and validate the user a token belongs to. Raises InvalidTokenError."""
    payload = decode_token(token, expected)  # type: ignore[arg-type]
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise InvalidTokenError("Bad subject") from exc
    user = crud.user.get(db, user_id)
    if user is None or not user.is_active or payload["tv"] != user.token_version:
        raise InvalidTokenError("Token revoked or user disabled")
    return user


def bootstrap_admin(db: Session) -> None:
    """Create the first admin account from environment settings if no user exists yet."""
    if crud.user.count(db) > 0:
        return
    settings = get_settings()
    crud.user.create(db, settings.admin_username, settings.admin_password.get_secret_value())
    logger.info("Created initial admin user %r", settings.admin_username)
