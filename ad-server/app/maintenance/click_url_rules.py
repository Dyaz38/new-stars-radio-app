"""Pure helpers for spotting placeholder click URLs (no DB imports)."""
from __future__ import annotations

import re

PLACEHOLDER_CLICK_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"^https?://(www\.)?example\.com(/|$)",
        r"^https?://example\.org(/|$)",
        r"^https?://localhost(/|$)",
    )
)


def is_placeholder_click_url(url: str | None) -> bool:
    if not url or not url.strip():
        return True
    normalized = url.strip()
    if normalized.lower().startswith("mailto:"):
        return False
    return any(p.search(normalized) for p in PLACEHOLDER_CLICK_PATTERNS)
