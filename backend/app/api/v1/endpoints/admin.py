"""Authenticated endpoints backing the admin dashboard."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.exc import IntegrityError

from app import crud
from app.api.deps import DbSession, get_current_user
from app.core.config import get_settings
from app.core.rate_limit import translate_limiter
from app.schemas.analytics import AnalyticsReport
from app.schemas.profile import ProfileAdmin, ProfileUpdate
from app.schemas.project import (
    ProjectAdmin,
    ProjectCreate,
    ProjectUpdate,
    ReorderRequest,
)
from app.schemas.translate import TranslateRequest, TranslateResponse
from app.services import analytics, resume, translation, uploads

# Every route in this router requires a valid access token.
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_user)])

_SLUG_TAKEN = HTTPException(status.HTTP_409_CONFLICT, "A project with this slug already exists")


@router.get("/projects", response_model=list[ProjectAdmin])
def list_projects(db: DbSession) -> list[ProjectAdmin]:
    return [ProjectAdmin.model_validate(p) for p in crud.project.list_all(db)]


@router.get("/projects/{project_id}", response_model=ProjectAdmin)
def get_project(project_id: int, db: DbSession) -> ProjectAdmin:
    project = crud.project.get(db, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return ProjectAdmin.model_validate(project)


@router.post("/projects", response_model=ProjectAdmin, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: DbSession) -> ProjectAdmin:
    if crud.project.get_by_slug(db, data.slug):
        raise _SLUG_TAKEN
    try:
        project = crud.project.create(db, data)
    except IntegrityError:  # lost a race with a concurrent request
        db.rollback()
        raise _SLUG_TAKEN from None
    return ProjectAdmin.model_validate(project)


@router.post("/projects/reorder", response_model=list[ProjectAdmin])
def reorder_projects(data: ReorderRequest, db: DbSession) -> list[ProjectAdmin]:
    try:
        projects = crud.project.reorder(db, data.ids)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return [ProjectAdmin.model_validate(p) for p in projects]


@router.patch("/projects/{project_id}", response_model=ProjectAdmin)
def update_project(project_id: int, data: ProjectUpdate, db: DbSession) -> ProjectAdmin:
    project = crud.project.get(db, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    if data.slug and data.slug != project.slug and crud.project.get_by_slug(db, data.slug):
        raise _SLUG_TAKEN
    try:
        project = crud.project.update(db, project, data)
    except IntegrityError:
        db.rollback()
        raise _SLUG_TAKEN from None
    return ProjectAdmin.model_validate(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: DbSession) -> Response:
    project = crud.project.get(db, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    crud.project.delete(db, project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/profile", response_model=ProfileAdmin)
def get_profile(db: DbSession) -> ProfileAdmin:
    profile = crud.profile.get(db)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not configured yet")
    return ProfileAdmin.model_validate(profile)


@router.put("/profile", response_model=ProfileAdmin)
def update_profile(data: ProfileUpdate, db: DbSession) -> ProfileAdmin:
    profile = crud.profile.upsert(db, data)
    resume.clear_cache()
    return ProfileAdmin.model_validate(profile)


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile = File(...)) -> dict[str, str]:
    return {"url": await uploads.save_image(file)}


@router.post(
    "/translate", response_model=TranslateResponse, dependencies=[Depends(translate_limiter)]
)
def translate(data: TranslateRequest) -> TranslateResponse:
    """Translate admin-authored text with the Claude API (see services/translation.py)."""
    try:
        texts = translation.translate_texts(data.texts, data.source, data.target)
    except translation.TranslationError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return TranslateResponse(texts=texts, model=get_settings().translation_model)


@router.get("/translate/status")
def translate_status() -> dict[str, object]:
    """Lets the dashboard show whether the translate button can work before it is clicked."""
    settings = get_settings()
    return {"enabled": settings.translation_enabled, "model": settings.translation_model}


@router.get("/analytics", response_model=AnalyticsReport)
def analytics_report(db: DbSession, days: int = Query(30, ge=1, le=366)) -> AnalyticsReport:
    return analytics.build_report(db, days)
