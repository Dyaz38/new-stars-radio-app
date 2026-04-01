"""
Resolve track genre from Airtime Pro live-info (server-side).

The browser cannot always attach genre (timing vs scheduler, HTML entities in JSON).
Fetching live-info here matches the radio app logic: current, then previous, then next.

Placed under integrations/ so imports do not pull in app.services (heavy deps).
"""
from __future__ import annotations

import logging
from typing import Optional

from app.core.config import settings
from app.integrations.airtime_genre_match import genre_from_block, normalize_tracks, norm_key

logger = logging.getLogger(__name__)


async def resolve_genre_from_airtime(artist: str, title: str) -> Optional[str]:
    """
    Fetch Airtime live-info and return genre when current/previous/next matches artist+title.
    """
    import httpx  # lazy: unit tests can import match helpers without httpx

    want_a = norm_key(artist)
    want_t = norm_key(title)
    if not want_a or not want_t:
        return None

    url = settings.AIRTIME_LIVE_INFO_URL
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0)) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "NewStarsRadio-AdServer/1.0",
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        logger.warning("Airtime live-info fetch failed (%s): %s", url, e)
        return None

    if not isinstance(data, dict):
        return None

    cur, prev, nxt = normalize_tracks(data)
    for block in (cur, prev, nxt):
        g = genre_from_block(block, want_a, want_t)
        if g:
            logger.info(
                "Resolved genre from Airtime for '%s' - '%s': %s",
                artist[:80],
                title[:80],
                g[:80],
            )
            return g

    logger.debug(
        "No Airtime genre match for '%s' - '%s' (checked current/previous/next)",
        artist[:80],
        title[:80],
    )
    return None
