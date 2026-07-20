"""
Storage service for ad creative images.
Supports local disk (dev) and Cloudflare R2 (production).
"""
import io
import logging
import re
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4

from fastapi import UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)

_ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def sanitize_upload_filename(filename: str, default: str = "image.png") -> str:
    """Return a safe filename with a known image extension."""
    name = Path((filename or "").strip() or default).name
    stem = Path(name).stem
    ext = Path(name).suffix.lower()
    safe_stem = re.sub(r"[^\w\-]+", "-", stem).strip("-") or "image"
    if ext not in _ALLOWED_IMAGE_EXTENSIONS:
        ext = Path(default).suffix.lower() or ".png"
    return f"{safe_stem}{ext}"


async def read_upload_bytes(upload: UploadFile, max_size: Optional[int] = None) -> bytes:
    """Read and validate an uploaded file into memory."""
    limit = max_size or settings.MAX_UPLOAD_SIZE
    content = await upload.read()
    if not content:
        raise ValueError("Uploaded file is empty.")
    if len(content) > limit:
        max_mb = max(1, limit // (1024 * 1024))
        raise ValueError(f"File is too large. Maximum size is {max_mb} MB.")
    return content


def upload_creative_bytes(
    content: bytes,
    campaign_id: UUID,
    effective_filename: str,
) -> str:
    """
    Upload creative bytes and return the URL to store in the database.
    Uses a unique object key so repeated uploads do not overwrite prior images.
    """
    safe_name = sanitize_upload_filename(effective_filename)
    storage_name = f"{campaign_id}_{uuid4().hex[:12]}_{safe_name}"
    object_key = f"ads/{storage_name}"

    if settings.r2_enabled:
        return _upload_bytes_to_r2(content, object_key)
    return _upload_bytes_to_local(content, storage_name)


def upload_creative_image(
    file: UploadFile,
    campaign_id: UUID,
    effective_filename: str,
) -> str:
    """
    Upload an image from an UploadFile and return the URL to use in the database.
    Prefer upload_creative_bytes() when the file has already been buffered.
    """
    file_body = file.file
    if file_body is None:
        raise ValueError("Upload file has no body")

    file_body.seek(0)
    content = file_body.read()
    if not content:
        raise ValueError("Uploaded file is empty.")
    if len(content) > settings.MAX_UPLOAD_SIZE:
        max_mb = max(1, settings.MAX_UPLOAD_SIZE // (1024 * 1024))
        raise ValueError(f"File is too large. Maximum size is {max_mb} MB.")

    return upload_creative_bytes(content, campaign_id, effective_filename)


def _upload_bytes_to_r2(content: bytes, object_key: str) -> str:
    """Upload bytes to Cloudflare R2 and return public URL."""
    import boto3
    from botocore.exceptions import ClientError

    account_id = (settings.R2_ACCOUNT_ID or "").strip()
    for prefix in ("https://", "http://", "https:/", "http:/"):
        if account_id.lower().startswith(prefix):
            account_id = account_id[len(prefix) :].lstrip("/")
            break
    if account_id.endswith(".r2.cloudflarestorage.com"):
        account_id = account_id.replace(".r2.cloudflarestorage.com", "")

    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )

    try:
        client.upload_fileobj(
            io.BytesIO(content),
            settings.R2_BUCKET_NAME,
            object_key,
            ExtraArgs={"ContentType": _guess_content_type(object_key)},
        )
    except ClientError as e:
        logger.exception("R2 upload failed: %s", e)
        raise

    base = (settings.R2_PUBLIC_URL or "").rstrip("/")
    return f"{base}/{object_key}"


def _guess_content_type(object_key: str) -> str:
    """Guess Content-Type from file extension."""
    ext = Path(object_key).suffix.lower()
    mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    return mime.get(ext, "application/octet-stream")


def _upload_bytes_to_local(content: bytes, filename: str) -> str:
    """Save bytes to local disk and return /static/ads/... path."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    file_path.write_bytes(content)
    return f"/static/ads/{filename}"


def upload_station_event_image(file: UploadFile, effective_filename: str) -> str:
    """
    Upload a station event banner/image; returns URL for JSON storage.
    R2: full public URL. Local: path /static/events/...
    """
    file_body = file.file
    if file_body is None:
        raise ValueError("Upload file has no body")

    file_body.seek(0)
    content = file_body.read()
    if not content:
        raise ValueError("Uploaded file is empty.")
    if len(content) > settings.MAX_UPLOAD_SIZE:
        max_mb = max(1, settings.MAX_UPLOAD_SIZE // (1024 * 1024))
        raise ValueError(f"File is too large. Maximum size is {max_mb} MB.")

    safe_name = sanitize_upload_filename(effective_filename, default="image.jpg")
    storage_name = f"{uuid4().hex[:16]}_{safe_name}"

    if settings.r2_enabled:
        object_key = f"events/{storage_name}"
        return _upload_bytes_to_r2(content, object_key)

    events_dir = Path("static") / "events"
    events_dir.mkdir(parents=True, exist_ok=True)
    (events_dir / storage_name).write_bytes(content)
    return f"/static/events/{storage_name}"
