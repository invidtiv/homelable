"""Generic media upload/serve endpoint.

Images are stored on disk (see `Settings.media_dir`) with server-generated
UUID filenames — never in the DB, and the client filename is never trusted.
Upload/delete require auth; GET is public so plain <img> tags and the read-only
live view can load images (filenames are unguessable).

Currently used by the floor-plan feature; kept deliberately generic so future
raw-image uploads reuse the same endpoint.
"""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter()

# content-type → extension. Also the allowlist of accepted uploads.
ALLOWED_TYPES: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}

# Magic-byte signatures for defense-in-depth (don't trust content-type alone).
_MAGIC: dict[str, tuple[bytes, ...]] = {
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".webp": (b"RIFF",),  # RIFF....WEBP; RIFF prefix is enough to reject non-images
}

MAX_BYTES = 10 * 1024 * 1024  # 10 MB

# Only ever serve/delete files we created: 32 hex chars + known extension.
_NAME_RE = re.compile(r"^[0-9a-f]{32}\.(png|jpg|webp)$")


@router.post("/upload")
async def upload_media(file: UploadFile, _user: str = Depends(get_current_user)) -> dict[str, str]:
    ext = ALLOWED_TYPES.get(file.content_type or "")
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported media type — PNG, JPEG, or WebP only",
        )
    # Read one byte past the cap so we can detect oversize without loading more.
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File too large (max 10 MB)",
        )
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if not any(data.startswith(sig) for sig in _MAGIC[ext]):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File content does not match its type",
        )

    media_dir = settings.media_dir()
    media_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (media_dir / name).write_bytes(data)
    return {"filename": name, "url": f"/api/v1/media/{name}"}


@router.get("/{filename}")
async def get_media(filename: str) -> FileResponse:
    if not _NAME_RE.match(filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    path = settings.media_dir() / filename
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return FileResponse(path)


@router.delete("/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(filename: str, _user: str = Depends(get_current_user)) -> None:
    if not _NAME_RE.match(filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    path = settings.media_dir() / filename
    if path.is_file():
        path.unlink()
