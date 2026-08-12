"""
Ad-blocker-safe creative image URLs and storage loading (stdlib + config only).

DB lookups live in the media API endpoint. Stored URLs may still use legacy /ads/
R2 keys; public responses use /api/v1/media/i/{creative_id} instead.
"""
from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlparse
from uuid import UUID

from app.core.config import settings

logger = logging.getLogger(__name__)

MEDIA_ROUTE_PREFIX = "/api/v1/media/i"
R2_OBJECT_PREFIX = "creatives/"
LEGACY_R2_OBJECT_PREFIX = "ads/"


def creative_media_path(creative_id: UUID | str) -> str:
    """Browser-safe relative URL for a creative image (no /ads/ in path)."""
    return f"{MEDIA_ROUTE_PREFIX}/{creative_id}"


def object_key_from_remote_url(url: str) -> Optional[str]:
    """Extract R2 object key from a public object URL."""
    parsed = urlparse(url.strip())
    if not parsed.path:
        return None
    host = (parsed.hostname or "").lower()
    if "r2.dev" not in host and "r2.cloudflarestorage.com" not in host:
        return None
    key = unquote(parsed.path.lstrip("/"))
    return key or None


def local_static_path(image_url: str) -> Optional[Path]:
    """Map /static/... URL to a file under the static directory."""
    raw = image_url.strip()
    if not raw.startswith("/static/"):
        return None
    relative = raw.removeprefix("/static/").lstrip("/")
    if not relative or ".." in relative.replace("\\", "/"):
        return None
    return Path("static") / relative


def _guess_content_type(path: str) -> str:
    ext = Path(path).suffix.lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }.get(ext, "application/octet-stream")


def _fetch_bytes_from_r2(object_key: str) -> bytes:
    import boto3
    from botocore.exceptions import ClientError

    account_id = (settings.R2_ACCOUNT_ID or "").strip()
    for prefix in ("https://", "http://", "https:/", "http:/"):
        if account_id.lower().startswith(prefix):
            account_id = account_id[len(prefix) :].lstrip("/")
            break
    if account_id.endswith(".r2.cloudflarestorage.com"):
        account_id = account_id.replace(".r2.cloudflarestorage.com", "")

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )
    buffer = io.BytesIO()
    try:
        client.download_fileobj(settings.R2_BUCKET_NAME, object_key, buffer)
    except ClientError as e:
        raise FileNotFoundError(object_key) from e
    data = buffer.getvalue()
    if not data:
        raise FileNotFoundError(object_key)
    return data


def _r2_keys_to_try(object_key: str) -> list[str]:
    keys = [object_key]
    if object_key.startswith(LEGACY_R2_OBJECT_PREFIX):
        keys.append(R2_OBJECT_PREFIX + object_key[len(LEGACY_R2_OBJECT_PREFIX) :])
    elif object_key.startswith(R2_OBJECT_PREFIX):
        keys.append(LEGACY_R2_OBJECT_PREFIX + object_key[len(R2_OBJECT_PREFIX) :])
    seen: set[str] = set()
    out: list[str] = []
    for key in keys:
        if key not in seen:
            seen.add(key)
            out.append(key)
    return out


def load_image_from_url(image_url: str) -> tuple[bytes, str]:
    """Load image bytes from R2 or local static storage. Returns (content, content_type)."""
    url = (image_url or "").strip()
    if not url:
        raise FileNotFoundError("empty image_url")

    local_path = local_static_path(url)
    if local_path is not None:
        if not local_path.is_file():
            raise FileNotFoundError(str(local_path))
        return local_path.read_bytes(), _guess_content_type(local_path.name)

    object_key = object_key_from_remote_url(url)
    if object_key and settings.r2_enabled:
        last_error: Exception | None = None
        for key in _r2_keys_to_try(object_key):
            try:
                data = _fetch_bytes_from_r2(key)
                return data, _guess_content_type(key)
            except Exception as e:
                last_error = e
                logger.debug("R2 fetch failed for %s: %s", key, e)
        raise FileNotFoundError(object_key) from last_error

    raise FileNotFoundError(url)
