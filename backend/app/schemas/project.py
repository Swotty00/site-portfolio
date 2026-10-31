from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.schemas.common import LocaleCode, ORMModel, SafeUrl, ShortText, Slug

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Paragraph = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]


class ProjectTranslation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    summary: Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)] = ""
    description: Paragraph = ""
    role: ShortText = ""


class Credit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: ShortText
    name: ShortText
    url: SafeUrl | None = None


class ProjectBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: Slug
    year: int = Field(ge=1990, le=2100)
    client: ShortText = ""
    client_url: SafeUrl | None = None
    live_url: SafeUrl | None = None
    cover_image: SafeUrl = ""
    images: list[SafeUrl] = Field(default_factory=list, max_length=30)
    tags: list[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    ] = Field(default_factory=list, max_length=20)
    credits: list[Credit] = Field(default_factory=list, max_length=30)
    translations: dict[LocaleCode, ProjectTranslation]
    published: bool = True

    @field_validator("translations")
    @classmethod
    def _require_default_locale(
        cls, value: dict[str, ProjectTranslation]
    ) -> dict[str, ProjectTranslation]:
        if "pt-BR" not in value:
            raise ValueError("A pt-BR translation is required (it is the fallback language)")
        return value


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    """Partial update: only the fields present in the request body are changed."""

    model_config = ConfigDict(extra="forbid")

    slug: Slug | None = None
    year: int | None = Field(default=None, ge=1990, le=2100)
    client: ShortText | None = None
    client_url: SafeUrl | None = None
    live_url: SafeUrl | None = None
    cover_image: SafeUrl | None = None
    images: list[SafeUrl] | None = Field(default=None, max_length=30)
    tags: (
        list[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]]
        | None
    ) = Field(default=None, max_length=20)
    credits: list[Credit] | None = Field(default=None, max_length=30)
    translations: dict[LocaleCode, ProjectTranslation] | None = None
    published: bool | None = None

    @field_validator("translations")
    @classmethod
    def _require_default_locale(
        cls, value: dict[str, ProjectTranslation] | None
    ) -> dict[str, ProjectTranslation] | None:
        if value is not None and "pt-BR" not in value:
            raise ValueError("A pt-BR translation is required (it is the fallback language)")
        return value


class ProjectAdmin(ORMModel):
    """Full record returned to the admin dashboard (all locales)."""

    id: int
    slug: str
    position: int
    year: int
    client: str
    client_url: str | None
    live_url: str | None
    cover_image: str
    images: list[str]
    tags: list[str]
    credits: list[Credit]
    translations: dict[str, ProjectTranslation]
    published: bool
    created_at: datetime
    updated_at: datetime


class ProjectPublic(BaseModel):
    """Localized, flattened view for the public site."""

    slug: str
    year: int
    client: str
    client_url: str | None
    live_url: str | None
    cover_image: str
    images: list[str]
    tags: list[str]
    credits: list[Credit]
    title: str
    summary: str
    description: str
    role: str
    locale: LocaleCode  # the language the text was actually resolved to (after fallback)


class ProjectLink(BaseModel):
    slug: str
    title: str


class ProjectDetail(ProjectPublic):
    next: ProjectLink | None = None
    previous: ProjectLink | None = None


class ReorderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ids: list[int] = Field(min_length=1, max_length=200)
