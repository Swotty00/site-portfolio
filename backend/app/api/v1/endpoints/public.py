"""Public, read-only endpoints consumed by the portfolio site."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app import crud
from app.api.deps import DbSession, Locale
from app.api.v1.endpoints.analytics import client_ip, own_hosts
from app.core.config import get_settings
from app.core.rate_limit import pdf_limiter
from app.schemas.common import SUPPORTED_LOCALES
from app.schemas.profile import ProfilePublic
from app.schemas.project import ProjectDetail, ProjectPublic
from app.services import analytics, localization, resume

logger = logging.getLogger(__name__)
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


@router.get(
    "/resume.pdf",
    responses={200: {"content": {"application/pdf": {}}}},
    dependencies=[Depends(pdf_limiter)],
)
def download_resume(request: Request, db: DbSession, locale: Locale) -> Response:
    profile = crud.profile.get(db)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not configured yet")
    public = localization.localize_profile(profile, locale)
    try:
        pdf = resume.render_pdf(public, locale, version=profile.updated_at.isoformat())
    except OSError as exc:  # e.g. Pango/Cairo shared libraries missing
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "PDF generation is unavailable on this server"
        ) from exc
    try:  # a failing counter must never block the download
        analytics.record(
            db,
            kind=analytics.RESUME_DOWNLOAD,
            path="/profile",
            ip=client_ip(request),
            user_agent=request.headers.get("user-agent", ""),
            lang=locale,
            country_header=request.headers.get(get_settings().analytics_country_header),
            own_hosts=own_hosts(request),
        )
    except Exception:
        db.rollback()
        logger.exception("Could not record résumé download")
    filename = f"{profile.name.strip().replace(' ', '_') or 'resume'}_{locale}.pdf"
    safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Cache-Control": "public, max-age=300",
        },
    )
