"""Public, read-only endpoints consumed by the portfolio site."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from app import crud
from app.api.deps import DbSession, Locale
from app.schemas.common import SUPPORTED_LOCALES
from app.schemas.profile import ProfilePublic
from app.schemas.project import ProjectDetail, ProjectPublic
from app.services import localization

router = APIRouter(tags=["public"])

_CACHE_HEADERS = {"Cache-Control": "public, max-age=60, stale-while-revalidate=300"}


@router.get("/locales")
def list_locales() -> dict[str, object]:
    return {"default": "pt-BR", "supported": list(SUPPORTED_LOCALES)}


@router.get("/projects", response_model=list[ProjectPublic])
def list_projects(db: DbSession, locale: Locale, response: Response) -> list[ProjectPublic]:
    response.headers.update(_CACHE_HEADERS)
    projects = crud.project.list_all(db, published_only=True)
    return [localization.localize_project(p, locale) for p in projects]


@router.get("/projects/{slug}", response_model=ProjectDetail)
def get_project(slug: str, db: DbSession, locale: Locale, response: Response) -> ProjectDetail:
    project = crud.project.get_by_slug(db, slug)
    if project is None or not project.published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    response.headers.update(_CACHE_HEADERS)
    siblings = crud.project.list_all(db, published_only=True)
    return localization.localize_project_detail(project, siblings, locale)


@router.get("/profile", response_model=ProfilePublic)
def get_profile(db: DbSession, locale: Locale, response: Response) -> ProfilePublic:
    profile = crud.profile.get(db)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not configured yet")
    response.headers.update(_CACHE_HEADERS)
    return localization.localize_profile(profile, locale)
