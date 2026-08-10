"""
Public stream statistics (Icecast listener count) — proxied server-side for CORS.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import APIRouter

from app.core.config import settings
from app.integrations.stream_metadata import fetch_live_info, fetch_listener_count

logger = logging.getLogger(__name__)

router = APIRouter()

# Short-lived cache to avoid hammering shared Icecast status page
_cache_value: Optional[int] = None
_cache_ts: float = 0.0
CACHE_TTL_SEC = 15.0

_live_info_cache: Optional[dict] = None
_live_info_cache_ts: float = 0.0
LIVE_INFO_CACHE_TTL_SEC = 10.0


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

    count = await fetch_listener_count()
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


@router.get(
    "/live-info",
    summary="Airtime Pro now-playing metadata",
    description="Proxies Airtime live-info JSON for the listener app (avoids browser CORS/DNS issues).",
)
async def get_live_info():
    global _live_info_cache, _live_info_cache_ts
    now = time.monotonic()
    if _live_info_cache is not None and (now - _live_info_cache_ts) < LIVE_INFO_CACHE_TTL_SEC:
        return _live_info_cache

    data = await fetch_live_info()
    if data is not None:
        _live_info_cache = data
        _live_info_cache_ts = now
        return data

    if _live_info_cache is not None:
        return _live_info_cache

    return {
        "current": None,
        "next": None,
        "error": "unavailable",
    }
