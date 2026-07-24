"""Detect sample/test ad campaigns that should not run in production rotation."""
from __future__ import annotations

import re
from typing import Iterable, Protocol


class CreativeLike(Protocol):
    name: str | None
    click_url: str | None


class CampaignLike(Protocol):
    name: str
    creatives: Iterable[CreativeLike] | None

# Never auto-pause built-in house inventory (fallback promos).
HOUSE_CAMPAIGN_NAME_PREFIX = "House Promo"

# Campaign or creative names that indicate dev/sample inventory.
TEST_NAME_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"starline",
        r"starlink",
        r"\btest\b",
        r"sample\s+(ad|banner|creative)",
    )
)

# Click URLs that are placeholders, not real client destinations.
TEST_CLICK_URL_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"^https?://example\.com(/|$)",
        r"^https?://www\.example\.com(/|$)",
    )
)


def _name_matches_test_pattern(name: str | None) -> bool:
    if not name or not name.strip():
        return False
    return any(p.search(name.strip()) for p in TEST_NAME_PATTERNS)


def _click_url_is_test_placeholder(url: str | None) -> bool:
    if not url or not url.strip():
        return False
    normalized = url.strip()
    if normalized.lower().startswith("mailto:"):
        return False
    return any(p.search(normalized) for p in TEST_CLICK_URL_PATTERNS)


def is_protected_house_campaign(campaign: CampaignLike) -> bool:
    return campaign.name.startswith(HOUSE_CAMPAIGN_NAME_PREFIX)


def classify_test_campaign(
    campaign: CampaignLike,
    creatives: Iterable[CreativeLike] | None = None,
) -> tuple[bool, str]:
    """
    Return (is_test, reason).

    A campaign is treated as test inventory when it is not house promo and either
    its name looks like a sample ad or any creative uses an example.com click URL.
    """
    if is_protected_house_campaign(campaign):
        return False, "house promo (protected)"

    creative_list = list(creatives) if creatives is not None else list(campaign.creatives or [])

    if _name_matches_test_pattern(campaign.name):
        return True, f"campaign name matches test pattern: {campaign.name!r}"

    for creative in creative_list:
        if _name_matches_test_pattern(creative.name):
            return True, f"creative name matches test pattern: {creative.name!r}"
        if _click_url_is_test_placeholder(creative.click_url):
            return True, f"placeholder click URL on creative {creative.name!r}: {creative.click_url!r}"

    return False, "not classified as test"
