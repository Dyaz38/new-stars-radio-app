"""
Pure matching helpers for Airtime live-info (stdlib only — easy to unit test).
"""
from __future__ import annotations

import html
import re
from typing import Any, Optional


def norm_key(s: str) -> str:
    s = html.unescape(s).strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9\s]", "", s)
    return s.strip()


def normalize_tracks(
    data: dict[str, Any],
) -> tuple[Optional[dict[str, Any]], Optional[dict[str, Any]], Optional[dict[str, Any]]]:
    if isinstance(data.get("current"), dict):
        return (
            data.get("current"),  # type: ignore[return-value]
            data.get("previous") if isinstance(data.get("previous"), dict) else None,
            data.get("next") if isinstance(data.get("next"), dict) else None,
        )
    tracks = data.get("tracks")
    if isinstance(tracks, dict):
        return (
            tracks.get("current") if isinstance(tracks.get("current"), dict) else None,
            tracks.get("previous") if isinstance(tracks.get("previous"), dict) else None,
            tracks.get("next") if isinstance(tracks.get("next"), dict) else None,
        )
    return (None, None, None)


def artist_title_from_block(block: dict[str, Any]) -> tuple[str, str]:
    meta = block.get("metadata")
    if isinstance(meta, dict):
        ra = meta.get("artist_name")
        rt = meta.get("track_title") or meta.get("title")
        if ra is not None and rt is not None:
            return str(ra), str(rt)
    name = block.get("name")
    if isinstance(name, str) and " - " in name:
        left, right = name.split(" - ", 1)
        return left.strip(), right.strip()
    return "", ""


def genre_from_block(block: Optional[dict[str, Any]], want_a: str, want_t: str) -> Optional[str]:
    if not block or not isinstance(block, dict):
        return None

    raw_artist, raw_title = artist_title_from_block(block)
    if not raw_artist or not raw_title:
        return None

    a = norm_key(raw_artist)
    t = norm_key(raw_title)
    if a != want_a or t != want_t:
        return None

    meta = block.get("metadata")
    if not isinstance(meta, dict):
        return None
    raw_genre = meta.get("genre")
    if raw_genre is None or not str(raw_genre).strip():
        return None

    decoded = html.unescape(str(raw_genre).strip()).strip()
    if not decoded:
        return None
    return decoded[:200]
