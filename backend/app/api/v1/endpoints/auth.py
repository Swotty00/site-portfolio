from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.rate_limit import login_limiter, refresh_limiter
from app.core.security import InvalidTokenError
from app.crud import user as user_crud
from app.schemas.auth import LoginRequest, TokenResponse, UserRead
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"


def _set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.refresh_token_expire_days * 86400,
        httponly=True,  # not readable from JavaScript
        secure=settings.use_secure_cookies,
        samesite="strict",
        path=f"{settings.api_v1_prefix}/auth",  # only sent to the auth endpoints
    )


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(login_limiter)])
def login(payload: LoginRequest, response: Response, db: DbSession) -> TokenResponse:
    user = auth_service.authenticate(db, payload.username, payload.password)
    if user is None:
        # Same message for unknown user / wrong password / disabled account.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password")
    body, refresh = auth_service.issue_tokens(user)
    _set_refresh_cookie(response, refresh)
    response.headers["Cache-Control"] = "no-store"
    return body


@router.post("/refresh", response_model=TokenResponse, dependencies=[Depends(refresh_limiter)])
def refresh(request: Request, response: Response, db: DbSession) -> TokenResponse:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No refresh token")
    try:
        user = auth_service.user_from_token(db, token, "refresh")
    except InvalidTokenError:
        response.delete_cookie(REFRESH_COOKIE, path=f"{get_settings().api_v1_prefix}/auth")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token") from None
    body, new_refresh = auth_service.issue_tokens(user)  # rotate
    _set_refresh_cookie(response, new_refresh)
    response.headers["Cache-Control"] = "no-store"
    return body


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: DbSession) -> Response:
    """Revoke every outstanding token for the user behind the refresh cookie (if valid)."""
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        try:
            user = auth_service.user_from_token(db, token, "refresh")
            user_crud.revoke_tokens(db, user)
        except InvalidTokenError:
            pass
    response.delete_cookie(REFRESH_COOKIE, path=f"{get_settings().api_v1_prefix}/auth")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)
