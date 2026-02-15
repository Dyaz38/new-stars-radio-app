"""
Storage service for ad creative images.
Supports local disk (dev) and Cloudflare R2 (production).
"""
import logging
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)


def upload_creative_image(
    file: UploadFile,
    campaign_id: UUID,
    effective_filename: str,
) -> str:
    """
    Upload an image and return the URL to use in the database.
    - If R2 is configured: uploads to R2 and returns the public URL.
    - Otherwise: saves to local disk and returns /static/ads/... path.
    """
    object_key = f"ads/{campaign_id}_{effective_filename}"

    if settings.r2_enabled:
        return _upload_to_r2(file, object_key)
    return _upload_to_local(file, campaign_id, effective_filename)


def _upload_to_r2(file: UploadFile, object_key: str) -> str:
    """Upload to Cloudflare R2 and return public URL."""
    import boto3
    from botocore.exceptions import ClientError

    file_body = file.file
    if file_body is None:
        raise ValueError("Upload file has no body")

    endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )

    try:
        # Ensure we're at the start of the file (in case it was read earlier)
        file_body.seek(0)
        client.upload_fileobj(
            file_body,
            settings.R2_BUCKET_NAME,
            object_key,
            ExtraArgs={"ContentType": _guess_content_type(object_key)},
        )
    except ClientError as e:
        logger.exception("R2 upload failed: %s", e)
        raise

    # Return full public URL (R2_PUBLIC_URL should not have trailing slash)
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


def _upload_to_local(file: UploadFile, campaign_id: UUID, effective_filename: str) -> str:
    """Save to local disk and return /static/ads/... path."""
    import shutil

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{campaign_id}_{effective_filename}"
    file_path = upload_dir / filename

    file_body = file.file
    if file_body is None:
        raise ValueError("Upload file has no body")

    try:
        file_body.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file_body, buffer)
    except OSError as e:
        logger.warning("Local file save failed: %s", e, exc_info=True)
        raise

    return f"/static/ads/{filename}"
