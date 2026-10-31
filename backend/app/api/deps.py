from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import InvalidTokenError
from app.models.user import User
from app.schemas.common import LocaleCode
from app.services import auth as auth_service
from app.services.localization import normalize_locale

DbSession = Annotated[Session, Depends(get_db)]
_bearer = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise _UNAUTHORIZED
    try:
        return auth_service.user_from_token(db, credentials.credentials, "access")
    except InvalidTokenError:
        raise _UNAUTHORIZED from None


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_locale(lang: str | None = None) -> LocaleCode:
    """`?lang=` query parameter, tolerant of 'pt', 'en-US', 'zh_CN'... (defaults to pt-BR)."""
    return normalize_locale(lang)


Locale = Annotated[LocaleCode, Depends(get_locale)]
