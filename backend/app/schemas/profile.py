from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

from app.schemas.common import LocaleCode, ORMModel, SafeUrl, ShortText

LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


class Link(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: ShortText
    url: SafeUrl


class StackGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: ShortText
    items: list[ShortText] = Field(default_factory=list, max_length=40)


class Experience(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company: ShortText
    role: ShortText
    period: ShortText = ""
    location: ShortText = ""
    bullets: list[LongText] = Field(default_factory=list, max_length=12)


class Education(BaseModel):
    model_config = ConfigDict(extra="forbid")

    institution: ShortText
    degree: ShortText = ""
    period: ShortText = ""


class ProfileContent(BaseModel):
    """Everything on the profile page that depends on the visitor's language."""

    model_config = ConfigDict(extra="forbid")

    headline: ShortText = ""
    bio: LongText = ""
    about: list[LongText] = Field(default_factory=list, max_length=10)
    stack: list[StackGroup] = Field(default_factory=list, max_length=20)
    experience: list[Experience] = Field(default_factory=list, max_length=20)
    education: list[Education] = Field(default_factory=list, max_length=10)


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: ShortText
    email: EmailStr | None = None
    phone: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] = ""
    location: ShortText = ""
    links: list[Link] = Field(default_factory=list, max_length=12)
    translations: dict[LocaleCode, ProfileContent]

    @field_validator("translations")
    @classmethod
    def _require_default_locale(cls, value: dict[str, ProfileContent]) -> dict[str, ProfileContent]:
        if "pt-BR" not in value:
            raise ValueError("A pt-BR translation is required (it is the fallback language)")
        return value


class ProfileAdmin(ORMModel):
    name: str
    email: str
    phone: str
    location: str
    links: list[Link]
    translations: dict[str, ProfileContent]
    updated_at: datetime


class ProfilePublic(ProfileContent):
    name: str
    email: str
    phone: str
    location: str
    links: list[Link]
    locale: LocaleCode
