"""Static house promo banners when no paid ad is available."""
from __future__ import annotations

from app.constants.placements import preferred_sizes_for_placement

HOUSE_AD_CLICK_URL = (
    "mailto:sales@newstarsradio.com?subject=Advertise%20on%20New%20Stars%20Radio"
)
HOUSE_AD_ALT = "New Stars Radio — Advertise With Us"

# Relative paths served from ad-server /static
HOUSE_AD_IMAGE_BY_SIZE: dict[tuple[int, int], str] = {
    (320, 50): "/static/promo/newstars-house-320x50.png",
    (728, 90): "/static/promo/newstars-house-728x90.png",
}

# Stable ids for house fallback responses (not stored in DB; tracking skipped client-side)
HOUSE_AD_ID = "00000000-0000-4000-8000-000000000001"
HOUSE_CAMPAIGN_ID = "00000000-0000-4000-8000-000000000002"


def primary_size_for_placement(placement: str) -> tuple[int, int]:
    """Best-fit house banner dimensions for a placement."""
    sizes = preferred_sizes_for_placement(placement)
    return sizes[0]


def house_image_url_for_placement(placement: str) -> tuple[str, int, int]:
    width, height = primary_size_for_placement(placement)
    url = HOUSE_AD_IMAGE_BY_SIZE.get((width, height))
    if not url:
        width, height = 320, 50
        url = HOUSE_AD_IMAGE_BY_SIZE[(320, 50)]
    return url, width, height


def build_house_ad_payload(placement: str) -> dict:
    """Ad response payload for the listener when inventory is empty."""
    image_url, width, height = house_image_url_for_placement(placement)
    return {
        "ad_id": HOUSE_AD_ID,
        "campaign_id": HOUSE_CAMPAIGN_ID,
        "image_url": image_url,
        "image_width": width,
        "image_height": height,
        "click_url": HOUSE_AD_CLICK_URL,
        "alt_text": HOUSE_AD_ALT,
        "impression_tracking_token": "",
        "click_tracking_token": "",
        "is_house_ad": True,
    }
