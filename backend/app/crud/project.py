from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


def get(db: Session, project_id: int) -> Project | None:
    return db.get(Project, project_id)


def get_by_slug(db: Session, slug: str) -> Project | None:
    return db.scalar(select(Project).where(Project.slug == slug))


def list_all(db: Session, *, published_only: bool = False) -> list[Project]:
    stmt = select(Project).order_by(Project.position, Project.id)
    if published_only:
        stmt = stmt.where(Project.published.is_(True))
    return list(db.scalars(stmt))


def count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Project)) or 0


def create(db: Session, data: ProjectCreate) -> Project:
    max_position = db.scalar(select(func.max(Project.position)))
    project = Project(
        **data.model_dump(mode="json", exclude={"translations", "credits"}),
        credits=[c.model_dump(mode="json") for c in data.credits],
        translations={k: v.model_dump(mode="json") for k, v in data.translations.items()},
        position=0 if max_position is None else max_position + 1,
    )
    db.add(project)
    db.commit()
    return project


def update(db: Session, project: Project, data: ProjectUpdate) -> Project:
    changes = data.model_dump(mode="json", exclude_unset=True)
    for field, value in changes.items():
        # A null for a non-nullable column means "leave it alone".
        if value is None and field not in {"client_url", "live_url"}:
            continue
        setattr(project, field, value)
    db.commit()
    return project


def delete(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()


def reorder(db: Session, ordered_ids: list[int]) -> list[Project]:
    projects = {p.id: p for p in list_all(db)}
    if set(ordered_ids) != set(projects) or len(ordered_ids) != len(projects):
        raise ValueError("`ids` must list every project exactly once")
    for position, project_id in enumerate(ordered_ids):
        projects[project_id].position = position
    db.commit()
    return [projects[i] for i in ordered_ids]
