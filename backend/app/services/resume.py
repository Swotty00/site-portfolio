"""Render the résumé PDF from the profile using Jinja2 + WeasyPrint."""

from __future__ import annotations

import threading
from collections import OrderedDict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.schemas.common import LocaleCode
from app.schemas.profile import ProfilePublic

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"

# Section headings for the PDF, in every supported language.
LABELS: dict[str, dict[str, str]] = {
    "pt-BR": {
        "summary": "Resumo",
        "stack": "Stack técnica",
        "experience": "Experiência",
        "education": "Formação",
        "contact": "Contato",
        "updated": "Atualizado em",
    },
    "en": {
        "summary": "Summary",
        "stack": "Technical stack",
        "experience": "Experience",
        "education": "Education",
        "contact": "Contact",
        "updated": "Updated",
    },
    "es": {
        "summary": "Resumen",
        "stack": "Stack técnico",
        "experience": "Experiencia",
        "education": "Formación",
        "contact": "Contacto",
        "updated": "Actualizado",
    },
    "it": {
        "summary": "Profilo",
        "stack": "Stack tecnico",
        "experience": "Esperienza",
        "education": "Formazione",
        "contact": "Contatti",
        "updated": "Aggiornato",
    },
    "fr": {
        "summary": "Résumé",
        "stack": "Stack technique",
        "experience": "Expérience",
        "education": "Formation",
        "contact": "Contact",
        "updated": "Mis à jour",
    },
    "ru": {
        "summary": "Обо мне",
        "stack": "Технологии",
        "experience": "Опыт работы",
        "education": "Образование",
        "contact": "Контакты",
        "updated": "Обновлено",
    },
    "zh": {
        "summary": "简介",
        "stack": "技术栈",
        "experience": "工作经历",
        "education": "教育背景",
        "contact": "联系方式",
        "updated": "更新于",
    },
    "ja": {
        "summary": "概要",
        "stack": "技術スタック",
        "experience": "職務経歴",
        "education": "学歴",
        "contact": "連絡先",
        "updated": "更新日",
    },
}

_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"]),  # profile text is user-controlled
)

_CACHE_SIZE = 16
_cache: OrderedDict[tuple[str, str], bytes] = OrderedDict()
_cache_lock = threading.Lock()


def _html_lang(locale: LocaleCode) -> str:
    # Language tags drive fontconfig's choice between the CJK font variants.
    return {"zh": "zh-Hans", "ja": "ja"}.get(locale, locale)


def render_html(profile: ProfilePublic, locale: LocaleCode) -> str:
    context: dict[str, Any] = {
        "p": profile,
        "labels": LABELS[locale],
        "lang": _html_lang(locale),
        "today": datetime.now(UTC).strftime("%Y-%m-%d"),
    }
    return _env.get_template("resume.html").render(**context)


def render_pdf(profile: ProfilePublic, locale: LocaleCode, version: str) -> bytes:
    """Return the PDF bytes, caching by (locale, profile version)."""
    key = (locale, version)
    with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]

    # Imported lazily so the API still boots (and tests run) where Pango isn't installed.
    from weasyprint import HTML  # noqa: PLC0415

    rendered = HTML(string=render_html(profile, locale), base_url=str(TEMPLATE_DIR)).write_pdf()
    if rendered is None:  # pragma: no cover - write_pdf only returns None when given a target
        raise RuntimeError("WeasyPrint produced no output")
    pdf: bytes = bytes(rendered)

    with _cache_lock:
        _cache[key] = pdf
        while len(_cache) > _CACHE_SIZE:
            _cache.popitem(last=False)
    return pdf


def clear_cache() -> None:
    with _cache_lock:
        _cache.clear()
