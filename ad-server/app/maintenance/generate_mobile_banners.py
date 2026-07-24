"""Generate 320×50 creatives from existing 728×90 desktop banners."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.maintenance.banner_coverage import campaigns_missing_mobile_banners
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.campaign import Campaign
from app.maintenance.banner_resize import resize_banner_cover
from app.services.storage import upload_creative_bytes

logger = logging.getLogger(__name__)

MOBILE_W, MOBILE_H = 320, 50


@dataclass
class GeneratedMobileBanner:
    campaign_id: str
    campaign_name: str
    creative_id: str
    creative_name: str
    image_url: str


@dataclass
class GenerateMobileBannersSummary:
    dry_run: bool
    generated: list[GeneratedMobileBanner]
    skipped: list[str]


def _resolve_fetch_url(image_url: str) -> str:
    url = image_url.strip()
    if url.startswith(("http://", "https://")):
        return url.replace(" ", "-")
    return url


def _fetch_image_bytes(image_url: str) -> bytes:
    url = _resolve_fetch_url(image_url)
    if url.startswith("/static/"):
        path = Path("static") / url.removeprefix("/static/").lstrip("/")
        if not path.is_file():
            raise FileNotFoundError(f"Local static file not found: {path}")
        return path.read_bytes()

    with httpx.Client(timeout=httpx.Timeout(20.0, connect=8.0), follow_redirects=True) as client:
        response = client.get(
            url,
            headers={"User-Agent": "NewStarsRadio-AdServer/1.0", "Accept": "image/*"},
        )
        response.raise_for_status()
        content = response.content
        if not content:
            raise ValueError("Empty image response")
        return content


def generate_missing_mobile_banners(db: Session, *, dry_run: bool = True) -> GenerateMobileBannersSummary:
    gaps = campaigns_missing_mobile_banners(db)
    generated: list[GeneratedMobileBanner] = []
    skipped: list[str] = []

    for gap in gaps:
        campaign = db.query(Campaign).filter(Campaign.id == UUID(gap.campaign_id)).first()
        desktop = db.query(AdCreative).filter(AdCreative.id == UUID(gap.desktop_creative_id)).first()
        if not campaign or not desktop:
            skipped.append(f"{gap.campaign_name}: source creative missing")
            continue

        try:
            source_bytes = _fetch_image_bytes(desktop.image_url)
            mobile_bytes, filename = resize_banner_cover(source_bytes, MOBILE_W, MOBILE_H)
        except Exception as e:
            logger.warning("Mobile banner generation failed for %s: %s", gap.campaign_name, e)
            skipped.append(f"{gap.campaign_name}: {e}")
            continue

        creative_name = (
            f"{desktop.name} (320×50)"
            if "(320×50)" not in desktop.name
            else desktop.name.replace("(728×90)", "(320×50)")
        )

        if dry_run:
            generated.append(
                GeneratedMobileBanner(
                    campaign_id=gap.campaign_id,
                    campaign_name=gap.campaign_name,
                    creative_id="dry-run",
                    creative_name=creative_name,
                    image_url="(dry-run)",
                )
            )
            continue

        try:
            image_url = upload_creative_bytes(mobile_bytes, campaign.id, filename)
        except Exception as e:
            skipped.append(f"{gap.campaign_name}: upload failed ({e})")
            continue

        creative = AdCreative(
            campaign_id=campaign.id,
            name=creative_name,
            image_url=image_url,
            image_width=MOBILE_W,
            image_height=MOBILE_H,
            click_url=desktop.click_url,
            alt_text=desktop.alt_text or f"{campaign.name} mobile banner",
            status=CreativeStatus.ACTIVE,
        )
        db.add(creative)
        db.flush()

        generated.append(
            GeneratedMobileBanner(
                campaign_id=gap.campaign_id,
                campaign_name=gap.campaign_name,
                creative_id=str(creative.id),
                creative_name=creative_name,
                image_url=image_url,
            )
        )

    if not dry_run and generated:
        db.commit()

    return GenerateMobileBannersSummary(
        dry_run=dry_run,
        generated=generated,
        skipped=skipped,
    )
