"""Pause sample/test campaigns in the database."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session, selectinload

from app.maintenance.test_campaigns import classify_test_campaign
from app.models.campaign import Campaign, CampaignStatus


@dataclass
class PauseTestCampaignResult:
    campaign_id: str
    campaign_name: str
    previous_status: str
    reason: str


@dataclass
class PauseTestCampaignsSummary:
    dry_run: bool
    scanned: int
    paused: list[PauseTestCampaignResult]
    already_paused: list[str]
    active_real_campaigns: list[str]


def pause_test_campaigns(db: Session, *, dry_run: bool = True) -> PauseTestCampaignsSummary:
    campaigns = (
        db.query(Campaign)
        .options(selectinload(Campaign.creatives))
        .order_by(Campaign.name)
        .all()
    )

    paused: list[PauseTestCampaignResult] = []
    already_paused: list[str] = []
    active_real: list[str] = []

    for campaign in campaigns:
        is_test, reason = classify_test_campaign(campaign)
        if not is_test:
            if campaign.status == CampaignStatus.ACTIVE:
                active_real.append(campaign.name)
            continue

        if campaign.status == CampaignStatus.PAUSED:
            already_paused.append(campaign.name)
            continue

        paused.append(
            PauseTestCampaignResult(
                campaign_id=str(campaign.id),
                campaign_name=campaign.name,
                previous_status=campaign.status.value,
                reason=reason,
            )
        )
        if not dry_run:
            campaign.status = CampaignStatus.PAUSED

    if not dry_run and paused:
        db.commit()

    return PauseTestCampaignsSummary(
        dry_run=dry_run,
        scanned=len(campaigns),
        paused=paused,
        already_paused=already_paused,
        active_real_campaigns=active_real,
    )
