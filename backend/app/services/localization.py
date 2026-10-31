"""Resolve translated content for a requested locale, falling back to the default (pt-BR)."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from app.schemas.common import DEFAULT_LOCALE, SUPPORTED_LOCALES, LocaleCode
from app.schemas.profile import ProfileContent, ProfilePublic
from app.schemas.project import (
    Credit,
    ProjectDetail,
    ProjectLink,
    ProjectPublic,
    ProjectTranslation,
)

_BASE_TO_LOCALE = {code.split("-")[0].lower(): code for code in SUPPORTED_LOCALES}
_LOWER_TO_LOCALE = {code.lower(): code for code in SUPPORTED_LOCALES}


def normalize_locale(raw: str | None) -> LocaleCode:
    """Map 'pt', 'PT-br', 'en-US', 'zh-CN'... to a supported code; default to pt-BR."""
    if not raw:
        return DEFAULT_LOCALE
    cleaned = raw.strip().replace("_", "-").lower()
    code = _LOWER_TO_LOCALE.get(cleaned) or _BASE_TO_LOCALE.get(cleaned.split("-")[0])
    return code or DEFAULT_LOCALE  # type: ignore[return-value]


def pick_translation(translations: Mapping[str, Any], locale: LocaleCode) -> tuple[Any, LocaleCode]:
    """Return (translation, locale it came from), preferring `locale` then the default."""
    if locale in translations:
        return translations[locale], locale
    if DEFAULT_LOCALE in translations:
        return translations[DEFAULT_LOCALE], DEFAULT_LOCALE
    # Defensive: data edited outside the API. Use whatever exists.
    code, value = next(iter(translations.items()))
    return value, normalize_locale(code)


def localize_project(project: Any, locale: LocaleCode) -> ProjectPublic:
    raw, resolved = pick_translation(project.translations, locale)
    tr = ProjectTranslation.model_validate(raw)
    return ProjectPublic(
        slug=project.slug,
        year=project.year,
        client=project.client,
        client_url=project.client_url,
        live_url=project.live_url,
        cover_image=project.cover_image,
        images=list(project.images),
        tags=list(project.tags),
        credits=[Credit.model_validate(c) for c in project.credits],
        title=tr.title,
        summary=tr.summary,
        description=tr.description,
        role=tr.role,
        locale=resolved,
    )


def project_link(project: Any, locale: LocaleCode) -> ProjectLink:
    raw, _ = pick_translation(project.translations, locale)
    return ProjectLink(slug=project.slug, title=ProjectTranslation.model_validate(raw).title)


def localize_project_detail(project: Any, siblings: list[Any], locale: LocaleCode) -> ProjectDetail:
    """Add next/previous links that cycle through the published projects."""
    base = localize_project(project, locale)
    others = [p for p in siblings if p.slug != project.slug]
    idx = next((i for i, p in enumerate(siblings) if p.slug == project.slug), None)
    next_link = prev_link = None
    if others and idx is not None:
        next_link = project_link(siblings[(idx + 1) % len(siblings)], locale)
        prev_link = project_link(siblings[(idx - 1) % len(siblings)], locale)
    return ProjectDetail(**base.model_dump(), next=next_link, previous=prev_link)


def localize_profile(profile: Any, locale: LocaleCode) -> ProfilePublic:
    raw, resolved = pick_translation(profile.translations, locale)
    content = ProfileContent.model_validate(raw)
    # Fill empty sections from the default locale so a partial translation never shows gaps.
    if resolved != DEFAULT_LOCALE and DEFAULT_LOCALE in profile.translations:
        fallback = ProfileContent.model_validate(profile.translations[DEFAULT_LOCALE])
        patch = {
            key: getattr(fallback, key)
            for key in ("headline", "bio", "about", "stack", "experience", "education")
            if not getattr(content, key)
        }
        content = content.model_copy(update=patch)
    return ProfilePublic(
        name=profile.name,
        email=profile.email,
        phone=profile.phone,
        location=profile.location,
        links=profile.links,
        locale=resolved,
        **content.model_dump(),
    )
