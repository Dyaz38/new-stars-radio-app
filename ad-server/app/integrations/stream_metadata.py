"""
Fetch now-playing metadata and listener counts from Airtime / Icecast.

Tries multiple upstream URLs (configurable on Railway) so a single DNS or API
change does not break the listener app.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

HTTP_HEADERS = {
    "User-Agent": "NewStarsRadio-AdServer/1.0",
    "Accept": "application/json,text/html,*/*",
}

ICY_HEADERS = {
    **HTTP_HEADERS,
    "Icy-MetaData": "1",
}


def _dedupe_urls(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for url in urls:
        u = url.strip()
        if not u or u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def live_info_candidate_urls() -> list[str]:
    """Ordered Airtime / Icecast metadata endpoints."""
    if settings.AIRTIME_LIVE_INFO_URLS:
        raw = settings.AIRTIME_LIVE_INFO_URLS
        if isinstance(raw, str):
            return _dedupe_urls([u.strip() for u in raw.split(",") if u.strip()])

    base = settings.AIRTIME_LIVE_INFO_URL.rstrip("/")
    station_root = base.split("/api/")[0] if "/api/" in base else base

    return _dedupe_urls(
        [
            settings.AIRTIME_LIVE_INFO_URL,
            f"{station_root}/api/live-info-v2",
            f"{station_root}/api/live-info/format/json",
            f"{station_root}/embed/data",
            settings.ICECAST_STATUS_JSON_URL,
        ]
    )


def icecast_status_candidate_urls() -> list[str]:
    return _dedupe_urls(
        [
            settings.ICECAST_STATUS_JSON_URL,
            settings.ICECAST_STATUS_URL,
        ]
    )


def _split_artist_title(raw: str) -> tuple[str, str]:
    text = raw.strip()
    if not text:
        return "New Stars Radio", "Live Stream"
    if " - " in text:
        artist, title = text.split(" - ", 1)
        return artist.strip() or "New Stars Radio", title.strip() or "Live Stream"
    return "New Stars Radio", text


def live_info_from_track_title(title: str) -> dict[str, Any]:
    artist, track = _split_artist_title(title)
    return {
        "current": {
            "name": title,
            "metadata": {
                "artist_name": artist,
                "track_title": track,
            },
        },
        "next": None,
        "source": "icecast",
    }


def _normalize_sources(payload: dict[str, Any]) -> list[dict[str, Any]]:
    icestats = payload.get("icestats")
    if not isinstance(icestats, dict):
        return []
    source = icestats.get("source")
    if isinstance(source, list):
        return [s for s in source if isinstance(s, dict)]
    if isinstance(source, dict):
        return [source]
    return []


def _mount_matches(source: dict[str, Any], mount: str) -> bool:
    listenurl = str(source.get("listenurl") or source.get("server_url") or "")
    server_name = str(source.get("server_name") or "")
    mount_name = mount.lstrip("/")
    haystack = f"{listenurl} {server_name}".lower()
    return mount_name.lower() in haystack or mount.lower() in haystack


def pick_icecast_source(payload: dict[str, Any], mount: str) -> Optional[dict[str, Any]]:
    sources = _normalize_sources(payload)
    if not sources:
        return None
    for source in sources:
        if _mount_matches(source, mount):
            return source
    return sources[0]


def parse_listeners_from_status_json(payload: dict[str, Any], mount: str) -> Optional[int]:
    source = pick_icecast_source(payload, mount)
    if not source:
        return None
    listeners = source.get("listeners")
    if isinstance(listeners, int):
        return max(0, listeners)
    if isinstance(listeners, str) and listeners.isdigit():
        return int(listeners)
    return None


def parse_live_info_from_status_json(payload: dict[str, Any], mount: str) -> Optional[dict[str, Any]]:
    source = pick_icecast_source(payload, mount)
    if not source:
        return None
    title = source.get("title") or source.get("yp_currently_playing")
    if not isinstance(title, str) or not title.strip():
        return None
    data = live_info_from_track_title(title.strip())
    genre = source.get("genre")
    if isinstance(genre, str) and genre.strip():
        current = data.get("current")
        if isinstance(current, dict):
            meta = current.get("metadata")
            if isinstance(meta, dict):
                meta["genre"] = genre.strip()
    return data


def _build_listener_patterns(mount: str) -> list[re.Pattern[str]]:
    m = mount if mount.startswith("/") else f"/{mount}"
    escaped = re.escape(m)
    mount_tail = re.escape(m.lstrip("/"))
    return [
        re.compile(
            rf"Mount Point\s+{escaped}</h3>.*?Current Listeners:</td><td class=\"streamdata\">(\d+)</td>",
            re.DOTALL | re.IGNORECASE,
        ),
        re.compile(
            rf"Mount Point\s+/{mount_tail}.*?Current Listeners:\s*(\d+)",
            re.DOTALL | re.IGNORECASE,
        ),
        re.compile(
            rf"/{mount_tail}.*?Current Listeners:\s*(\d+)",
            re.DOTALL | re.IGNORECASE,
        ),
    ]


def parse_listeners_from_status_html(html: str, mount: str) -> Optional[int]:
    for pattern in _build_listener_patterns(mount):
        match = pattern.search(html)
        if match:
            return int(match.group(1))
    return None


def parse_icy_metadata_block(meta_bytes: bytes) -> Optional[str]:
    try:
        meta_str = meta_bytes.decode("utf-8", errors="ignore").strip("\x00")
    except Exception:
        return None
    match = re.search(r"StreamTitle='([^']*)'", meta_str)
    if match:
        title = match.group(1).strip()
        return title or None
    return None


async def fetch_icy_stream_title(stream_url: str) -> Optional[str]:
    """Read one ICY metadata block from the MP3 stream (Shoutcast/Icecast)."""
    timeout = httpx.Timeout(15.0, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            async with client.stream("GET", stream_url, headers=ICY_HEADERS) as response:
                response.raise_for_status()
                metaint_raw = response.headers.get("icy-metaint")
                if not metaint_raw or not str(metaint_raw).isdigit():
                    return None
                metaint = int(metaint_raw)
                if metaint <= 0:
                    return None

                remaining = metaint
                async for chunk in response.aiter_bytes():
                    if not chunk:
                        continue
                    if remaining > len(chunk):
                        remaining -= len(chunk)
                        continue
                    # Reached metadata interval — read length byte + metadata string
                    offset = len(chunk) - remaining
                    after_audio = chunk[offset:]
                    if not after_audio:
                        extra = await response.aread(1)
                        after_audio = extra
                    if not after_audio:
                        return None
                    meta_len = after_audio[0] * 16
                    if meta_len <= 0:
                        return None
                    meta_body = after_audio[1:]
                    if len(meta_body) < meta_len:
                        meta_body += await response.aread(meta_len - len(meta_body))
                    return parse_icy_metadata_block(meta_body[:meta_len])
    except Exception as e:
        logger.warning("ICY metadata fetch failed for %s: %s", stream_url, e)
        return None


async def _fetch_json_or_html(url: str) -> tuple[Optional[Any], str]:
    timeout = httpx.Timeout(12.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url, headers=HTTP_HEADERS)
        response.raise_for_status()
        content_type = (response.headers.get("content-type") or "").lower()
        text = response.text
        if "json" in content_type or text.lstrip().startswith("{"):
            return response.json(), "json"
        return text, "html"


async def fetch_live_info() -> Optional[dict[str, Any]]:
    """Try Airtime live-info endpoints, then Icecast JSON, then ICY stream title."""
    mount = settings.ICECAST_MOUNT
    errors: list[str] = []

    for url in live_info_candidate_urls():
        try:
            payload, kind = await _fetch_json_or_html(url)
            if kind == "json" and isinstance(payload, dict):
                if payload.get("current") or payload.get("tracks"):
                    payload = dict(payload)
                    payload.setdefault("source", "airtime")
                    return payload
                converted = parse_live_info_from_status_json(payload, mount)
                if converted:
                    return converted
            elif kind == "html" and isinstance(payload, str):
                # status.xsl HTML — no track title in older parsers; skip unless we add scraping
                pass
        except Exception as e:
            errors.append(f"{url}: {e}")
            logger.debug("live-info candidate failed %s: %s", url, e)

    stream_url = settings.STREAM_URL.strip()
    if stream_url:
        try:
            title = await fetch_icy_stream_title(stream_url)
            if title:
                data = live_info_from_track_title(title)
                data["source"] = "icy"
                return data
        except Exception as e:
            errors.append(f"icy:{stream_url}: {e}")

    if errors:
        logger.warning(
            "All live-info sources failed (%d attempts). Last errors: %s",
            len(errors),
            "; ".join(errors[-3:]),
        )
    return None


async def fetch_listener_count() -> Optional[int]:
    mount = settings.ICECAST_MOUNT
    errors: list[str] = []

    for url in icecast_status_candidate_urls():
        try:
            payload, kind = await _fetch_json_or_html(url)
            if kind == "json" and isinstance(payload, dict):
                count = parse_listeners_from_status_json(payload, mount)
                if count is not None:
                    return count
            elif kind == "html" and isinstance(payload, str):
                count = parse_listeners_from_status_html(payload, mount)
                if count is not None:
                    return count
            errors.append(f"{url}: mount {mount} not found in response")
        except Exception as e:
            errors.append(f"{url}: {e}")
            logger.debug("listener candidate failed %s: %s", url, e)

    if errors:
        logger.warning(
            "All listener count sources failed. Last errors: %s",
            "; ".join(errors[-3:]),
        )
    return None
