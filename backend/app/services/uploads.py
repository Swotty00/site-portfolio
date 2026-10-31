"""Validated image uploads. Files are sniffed by magic bytes, never trusted by name/MIME."""

from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

_CHUNK = 64 * 1024


def _detect_extension(head: bytes) -> str | None:
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if head[4:8] == b"ftyp" and head[8:12] in (b"avif", b"avis"):
        return "avif"
    return None  # SVG is deliberately unsupported: it can carry scripts.


async def save_image(file: UploadFile) -> str:
    """Store the upload and return its public URL path."""
    settings = get_settings()
    head = await file.read(32)
    ext = _detect_extension(head)
    if ext is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Unsupported image type. Use PNG, JPEG, WebP, GIF or AVIF.",
        )

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_urlsafe(12)}.{ext}"  # random: no user-controlled path components
    destination = settings.upload_dir / name
    written = len(head)
    try:
        with destination.open("wb") as out:
            out.write(head)
            while chunk := await file.read(_CHUNK):
                written += len(chunk)
                if written > settings.max_upload_bytes:
                    raise HTTPException(
                        413,
                        f"Image exceeds the {settings.max_upload_mb} MB limit.",
                    )
                out.write(chunk)
    except BaseException:
        Path(destination).unlink(missing_ok=True)
        raise
    return f"/uploads/{name}"
