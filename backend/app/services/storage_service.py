import os
import uuid

from fastapi import UploadFile

from app.core.config import settings
from app.utils.exceptions import ValidationFailedError

ALLOWED_EXTENSIONS = {".pdf"}


async def save_upload(file: UploadFile, *, startup_id: str) -> tuple[str, int]:
    """Persist an uploaded file to disk and return (path, size_bytes)."""
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise ValidationFailedError(f"Unsupported file type '{ext}'. Only PDF is accepted.")

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise ValidationFailedError(
            f"File exceeds the {settings.max_upload_size_mb}MB upload limit."
        )

    target_dir = os.path.join(settings.upload_dir, startup_id)
    os.makedirs(target_dir, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex}{ext.lower()}"
    target_path = os.path.join(target_dir, safe_name)
    with open(target_path, "wb") as f:
        f.write(contents)

    return target_path, len(contents)
