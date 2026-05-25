from pathlib import Path
import uuid

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/x-pdf",
}


def validate_pdf_upload(upload: UploadFile, file_bytes: bytes | None = None) -> None:
    filename = (upload.filename or "").strip()
    suffix = Path(filename).suffix.lower()
    content_type = (upload.content_type or "").lower()

    if not filename or suffix != ".pdf" or content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF resume uploads are supported",
        )

    if file_bytes is not None and len(file_bytes) > settings.CAREER_UPLOAD_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resume upload exceeds the {settings.CAREER_UPLOAD_MAX_BYTES} byte limit",
        )


def build_resume_storage_path(filename: str | None) -> Path:
    suffix = Path(filename or "resume.pdf").suffix.lower() or ".pdf"
    if suffix != ".pdf":
        suffix = ".pdf"

    base_dir = Path(settings.CAREER_UPLOAD_DIR).resolve()
    return base_dir / f"{uuid.uuid4()}{suffix}"


def write_upload_bytes(data: bytes, destination: Path) -> None:
    if len(data) > settings.CAREER_UPLOAD_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resume upload exceeds the {settings.CAREER_UPLOAD_MAX_BYTES} byte limit",
        )

    base_dir = Path(settings.CAREER_UPLOAD_DIR).resolve()
    destination = destination.resolve()
    if base_dir not in destination.parents and destination != base_dir:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume upload destination is invalid",
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)


def delete_upload(destination: Path) -> None:
    try:
        destination.unlink(missing_ok=True)
    except OSError:
        pass
