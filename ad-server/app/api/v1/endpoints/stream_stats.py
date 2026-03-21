"""
Public stream statistics (Icecast listener count) — proxied server-side for CORS.
"""
from __future__ import annotations

import logging
import re
import time
from typing import Optional

import httpx
from fastapi import APIRouter

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Short-lived cache to avoid hammering shared Icecast status page
_cache_value: Optional[int] = None
_cache_ts: float = 0.0
CACHE_TTL_SEC = 15.0

# Mount block in status.xsl: <h3>Mount Point /newstarsradio_a</h3> ... Current Listeners:</td><td class="streamdata">N</td>
def _build_listener_pattern(mount: str) -> re.Pattern[str]:
    # mount e.g. "/newstarsradio_a" or "newstarsradio_a"
    m = mount if mount.startswith("/") else f"/{mount}"
    escaped = re.escape(m)
    return re.compile(
        rf"Mount Point\s+{escaped}</h3>.*?Current Listeners:</td><td class=\"streamdata\">(\d+)</td>",
        re.DOTALL | re.IGNORECASE,
    )


def _parse_listeners(html: str, mount: str) -> Optional[int]:
    pattern = _build_listener_pattern(mount)
    match = pattern.search(html)
    if not match:
        logger.warning("Could not find listener count for mount %s in Icecast status HTML", mount)
        return None
    return int(match.group(1))


async def _fetch_listeners_from_icecast() -> Optional[int]:
    url = settings.ICECAST_STATUS_URL
    mount = settings.ICECAST_MOUNT
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0)) as client:
            response = await client.get(url, headers={"User-Agent": "NewStarsRadio-AdServer/1.0"})
            response.raise_for_status()
        return _parse_listeners(response.text, mount)
    except Exception as e:
        logger.exception("Failed to fetch Icecast status from %s: %s", url, e)
        return None


@router.get(
    "/listeners",
    summary="Current Icecast listener count",
    description="Returns live listener count for the configured mount (proxied from Icecast status).",
)
async def get_listener_count():
    global _cache_value, _cache_ts
    now = time.monotonic()
    if _cache_value is not None and (now - _cache_ts) < CACHE_TTL_SEC:
        return {
            "listeners": _cache_value,
            "cached": True,
            "mount": settings.ICECAST_MOUNT,
        }

    count = await _fetch_listeners_from_icecast()
    if count is not None:
        _cache_value = count
        _cache_ts = now
        return {
            "listeners": count,
            "cached": False,
            "mount": settings.ICECAST_MOUNT,
        }

    # Stale cache on upstream failure
    if _cache_value is not None:
        return {
            "listeners": _cache_value,
            "cached": True,
            "stale": True,
            "mount": settings.ICECAST_MOUNT,
        }

    return {
        "listeners": 0,
        "error": "unavailable",
        "mount": settings.ICECAST_MOUNT,
    }
