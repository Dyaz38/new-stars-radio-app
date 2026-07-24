"""Which active campaigns have desktop vs mobile banner creatives."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session, selectinload

from app.constants.placements import size_matches
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.campaign import Campaign, CampaignStatus

DESKTOP_SIZE = (728, 90)
MOBILE_SIZE = (320, 50)
HOUSE_CAMPAIGN_PREFIX = "House Promo"


def is_desktop_banner(width: int, height: int) -> bool:
    return size_matches(width, height, *DESKTOP_SIZE)


def is_mobile_banner(width: int, height: int) -> bool:
    return size_matches(width, height, *MOBILE_SIZE)


@dataclass
class CampaignBannerGap:
    campaign_id: str
    campaign_name: str
    desktop_creative_id: str
    desktop_creative_name: str
    click_url: str
    alt_text: str | None


def campaigns_missing_mobile_banners(db: Session) -> list[CampaignBannerGap]:
    campaigns = (
        db.query(Campaign)
        .options(selectinload(Campaign.creatives))
        .filter(Campaign.status == CampaignStatus.ACTIVE)
        .order_by(Campaign.name)
        .all()
    )

    gaps: list[CampaignBannerGap] = []
    for campaign in campaigns:
        active = [
            c
            for c in campaign.creatives
            if c.status == CreativeStatus.ACTIVE
        ]
        has_mobile = any(is_mobile_banner(c.image_width, c.image_height) for c in active)
        if has_mobile:
            continue

        desktop = next(
            (c for c in active if is_desktop_banner(c.image_width, c.image_height)),
            None,
        )
        if not desktop:
            continue

        gaps.append(
            CampaignBannerGap(
                campaign_id=str(campaign.id),
                campaign_name=campaign.name,
                desktop_creative_id=str(desktop.id),
                desktop_creative_name=desktop.name,
                click_url=desktop.click_url,
                alt_text=desktop.alt_text,
            )
        )
    return gaps
