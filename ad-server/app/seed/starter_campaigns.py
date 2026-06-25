"""Seed starter house ad campaigns (Global + NA + ZA) for launch inventory."""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.advertiser import Advertiser, AdvertiserStatus
from app.models.campaign import Campaign, CampaignStatus

HOUSE_ADVERTISER_NAME = "New Stars Radio (House)"
HOUSE_ADVERTISER_EMAIL = "ads@newstarsradio.com"

CAMPAIGN_GLOBAL = "House Promo — Global"
CAMPAIGN_NA = "House Promo — Namibia (NA)"
CAMPAIGN_ZA = "House Promo — South Africa (ZA)"

CREATIVE_MOBILE = "House Banner 320×50"
CREATIVE_DESKTOP = "House Banner 728×90"

from app.constants.house_ad import HOUSE_AD_CLICK_URL, HOUSE_AD_IMAGE_BY_SIZE

IMAGE_MOBILE = HOUSE_AD_IMAGE_BY_SIZE[(320, 50)]
IMAGE_DESKTOP = HOUSE_AD_IMAGE_BY_SIZE[(728, 90)]
CLICK_URL = HOUSE_AD_CLICK_URL


def _campaign_window() -> tuple[datetime, datetime]:
    start = datetime.utcnow() - timedelta(days=1)
    end = datetime(2027, 12, 31, 23, 59, 59)
    return start, end


def _get_or_create_advertiser(db: Session) -> Advertiser:
    advertiser = (
        db.query(Advertiser)
        .filter(Advertiser.email == HOUSE_ADVERTISER_EMAIL)
        .first()
    )
    if advertiser:
        return advertiser

    advertiser = Advertiser(
        name=HOUSE_ADVERTISER_NAME,
        email=HOUSE_ADVERTISER_EMAIL,
        company_name="New Stars Radio",
        status=AdvertiserStatus.ACTIVE,
    )
    db.add(advertiser)
    db.flush()
    return advertiser


def _ensure_campaign(
    db: Session,
    *,
    advertiser: Advertiser,
    name: str,
    priority: int,
    target_countries: list[str] | None,
) -> Campaign:
    campaign = db.query(Campaign).filter(Campaign.name == name).first()
    start, end = _campaign_window()

    if campaign:
        changed = False
        if campaign.status != CampaignStatus.ACTIVE:
            campaign.status = CampaignStatus.ACTIVE
            changed = True
        if campaign.end_date < datetime.utcnow():
            campaign.end_date = end
            changed = True
        if changed:
            db.flush()
        return campaign

    campaign = Campaign(
        advertiser_id=advertiser.id,
        name=name,
        status=CampaignStatus.ACTIVE,
        start_date=start,
        end_date=end,
        priority=priority,
        impression_budget=10_000_000,
        impressions_served=0,
        target_countries=target_countries,
        target_cities=None,
        target_states=None,
    )
    db.add(campaign)
    db.flush()
    return campaign


def _ensure_creatives(db: Session, campaign: Campaign) -> None:
    existing = {
        c.name
        for c in db.query(AdCreative).filter(AdCreative.campaign_id == campaign.id).all()
    }
    specs = [
        (CREATIVE_MOBILE, IMAGE_MOBILE, 320, 50, "New Stars Radio — advertise with us"),
        (CREATIVE_DESKTOP, IMAGE_DESKTOP, 728, 90, "New Stars Radio — Tomorrow's Stars, Today"),
    ]
    for name, image_url, width, height, alt_text in specs:
        if name in existing:
            continue
        db.add(
            AdCreative(
                campaign_id=campaign.id,
                name=name,
                image_url=image_url,
                image_width=width,
                image_height=height,
                click_url=CLICK_URL,
                alt_text=alt_text,
                status=CreativeStatus.ACTIVE,
            )
        )


def seed_starter_campaigns(db: Session) -> bool:
    """
    Create house ad campaigns if missing. Idempotent.

    Returns True when new campaigns were created, False when already present.
    """
    before = db.query(Campaign).filter(
        Campaign.name.in_([CAMPAIGN_GLOBAL, CAMPAIGN_NA, CAMPAIGN_ZA])
    ).count()

    advertiser = _get_or_create_advertiser(db)

    global_campaign = _ensure_campaign(
        db,
        advertiser=advertiser,
        name=CAMPAIGN_GLOBAL,
        priority=8,
        target_countries=None,
    )
    na_campaign = _ensure_campaign(
        db,
        advertiser=advertiser,
        name=CAMPAIGN_NA,
        priority=6,
        target_countries=["NA"],
    )
    za_campaign = _ensure_campaign(
        db,
        advertiser=advertiser,
        name=CAMPAIGN_ZA,
        priority=6,
        target_countries=["ZA"],
    )

    for campaign in (global_campaign, na_campaign, za_campaign):
        _ensure_creatives(db, campaign)

    db.commit()

    after = db.query(Campaign).filter(
        Campaign.name.in_([CAMPAIGN_GLOBAL, CAMPAIGN_NA, CAMPAIGN_ZA])
    ).count()
    return after > before
