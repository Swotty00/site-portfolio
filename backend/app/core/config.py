"""Application settings, loaded from environment variables (and an optional .env file)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

_DEFAULT_SECRET = "dev-only-secret-change-me-dev-only-secret"  # noqa: S105
_DEFAULT_ADMIN_PASSWORD = "change-me-admin"  # noqa: S105


def _split_csv(value: object) -> object:
    """Accept comma-separated strings (the natural .env format) as well as JSON lists."""
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("["):
            return value
        return [item.strip() for item in stripped.split(",") if item.strip()]
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Portfolio API"
    environment: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"

    # --- Security -----------------------------------------------------------------------
    secret_key: SecretStr = SecretStr(_DEFAULT_SECRET)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cookie_secure: bool | None = None  # None => secure in production only
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]
    allowed_hosts: Annotated[list[str], NoDecode] = ["*"]

    # --- Rate limiting (per client IP, in-memory sliding window) --------------------------
    rate_limit_enabled: bool = True
    rate_limit_default: int = 120  # requests / minute for the public API
    rate_limit_login: int = 5  # login attempts / minute (strict: this is the brute-force target)
    rate_limit_refresh: int = 30  # session refreshes / minute (signed JWT: not brute-forceable)
    rate_limit_pdf: int = 10  # résumé renders / minute

    # --- Persistence ----------------------------------------------------------------------
    database_url: str = "sqlite:///./data/portfolio.db"
    upload_dir: Path = Path("./data/uploads")
    max_upload_mb: int = 5

    # --- Bootstrap -------------------------------------------------------------------------
    admin_username: str = "admin"
    admin_password: SecretStr = SecretStr(_DEFAULT_ADMIN_PASSWORD)
    seed_demo_data: bool = True

    _split_origins = field_validator("cors_origins", "allowed_hosts", mode="before")(_split_csv)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def use_secure_cookies(self) -> bool:
        return self.is_production if self.cookie_secure is None else self.cookie_secure

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @model_validator(mode="after")
    def _enforce_production_secrets(self) -> Settings:
        if not self.is_production:
            return self
        problems: list[str] = []
        secret = self.secret_key.get_secret_value()
        if secret == _DEFAULT_SECRET or len(secret) < 32:
            problems.append("SECRET_KEY must be set to a random value of at least 32 characters")
        password = self.admin_password.get_secret_value()
        if password == _DEFAULT_ADMIN_PASSWORD or len(password) < 12:
            problems.append("ADMIN_PASSWORD must be set and at least 12 characters long")
        if "*" in self.cors_origins:
            problems.append("CORS_ORIGINS must not contain '*' in production")
        if problems:
            raise ValueError("Unsafe production configuration: " + "; ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
