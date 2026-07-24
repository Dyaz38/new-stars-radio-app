"""Audit active creatives for placeholder click URLs."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session, selectinload

from app.maintenance.click_url_rules import is_placeholder_click_url
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.campaign import Campaign, CampaignStatus
class ClickUrlIssue:
    creative_id: str
    creative_name: str
    campaign_id: str
    campaign_name: str
    campaign_status: str
    click_url: str


def audit_active_creative_click_urls(db: Session) -> list[ClickUrlIssue]:
    creatives = (
        db.query(AdCreative)
        .join(Campaign, AdCreative.campaign_id == Campaign.id)
        .options(selectinload(AdCreative.campaign))
        .filter(
            AdCreative.status == CreativeStatus.ACTIVE,
            Campaign.status == CampaignStatus.ACTIVE,
        )
        .order_by(Campaign.name, AdCreative.name)
        .all()
    )

    issues: list[ClickUrlIssue] = []
    for creative in creatives:
        if not is_placeholder_click_url(creative.click_url):
            continue
        campaign = creative.campaign
        issues.append(
            ClickUrlIssue(
                creative_id=str(creative.id),
                creative_name=creative.name,
                campaign_id=str(creative.campaign_id),
                campaign_name=campaign.name if campaign else "Unknown",
                campaign_status=campaign.status.value if campaign else "unknown",
                click_url=creative.click_url,
            )
        )
    return issues
