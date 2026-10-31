"""Password hashing (bcrypt) and JWT helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt

from app.core.config import get_settings

TokenType = Literal["access", "refresh"]

# bcrypt only looks at the first 72 bytes; schemas reject longer passwords instead of
# silently truncating them.
MAX_PASSWORD_BYTES = 72

# Verified against when the username is unknown so that response timing does not leak
# which usernames exist.
_DUMMY_HASH = bcrypt.hashpw(b"timing-equalisation", bcrypt.gensalt(rounds=12))


class InvalidTokenError(Exception):
    """Raised when a token is malformed, expired, of the wrong type or revoked."""


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    candidate = password.encode()[:MAX_PASSWORD_BYTES]
    target = hashed.encode() if hashed else _DUMMY_HASH
    try:
        ok = bcrypt.checkpw(candidate, target)
    except ValueError:
        return False
    return ok and hashed is not None


def _create_token(subject: str, token_version: int, token_type: TokenType, ttl: timedelta) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "typ": token_type,
        "tv": token_version,
        "jti": uuid.uuid4().hex,
        "iat": now,
        "nbf": now,
        "exp": now + ttl,
    }
    return jwt.encode(
        payload, settings.secret_key.get_secret_value(), algorithm=settings.jwt_algorithm
    )


def create_access_token(subject: str, token_version: int) -> str:
    ttl = timedelta(minutes=get_settings().access_token_expire_minutes)
    return _create_token(subject, token_version, "access", ttl)


def create_refresh_token(subject: str, token_version: int) -> str:
    ttl = timedelta(days=get_settings().refresh_token_expire_days)
    return _create_token(subject, token_version, "refresh", ttl)


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[settings.jwt_algorithm],  # never trust the header's `alg`
            options={"require": ["exp", "sub", "typ", "tv", "iat"]},
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc
    if payload.get("typ") != expected_type:
        raise InvalidTokenError("Wrong token type")
    return payload
