"""Shared schema primitives: locales and validated string types."""

from __future__ import annotations

from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints

LocaleCode = Literal["pt-BR", "en", "es", "it", "fr", "ru", "zh", "ja"]
SUPPORTED_LOCALES: tuple[str, ...] = ("pt-BR", "en", "es", "it", "fr", "ru", "zh", "ja")
DEFAULT_LOCALE: LocaleCode = "pt-BR"

_ALLOWED_SCHEMES = {"http", "https"}


def _validate_safe_url(value: str) -> str:
    """Accept http(s) URLs and same-origin absolute paths; reject javascript:, data:, //host."""
    value = value.strip()
    if value == "":
        return value
    if value.startswith("/") and not value.startswith("//") and "\\" not in value:
        return value
    parsed = urlparse(value)
    if parsed.scheme.lower() not in _ALLOWED_SCHEMES or not parsed.netloc:
        raise ValueError("Must be an http(s) URL or an absolute path starting with '/'")
    return value


SafeUrl = Annotated[str, StringConstraints(max_length=500), AfterValidator(_validate_safe_url)]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
Slug = Annotated[
    str,
    StringConstraints(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"),
]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Message(BaseModel):
    detail: str
