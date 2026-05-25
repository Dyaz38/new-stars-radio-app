"""Campaign reporting helpers — stats aggregation, CSV, and share tokens."""
from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_report_share_token, verify_report_share_token
from app.models.ad_creative import AdCreative
from app.models.advertiser import Advertiser
from app.models.campaign import Campaign
from app.models.click import Click
from app.models.impression import Impression
from app.schemas.report import CampaignReportDetail, CreativeStatsBrief


def _apply_date_filters(query, model, start_date: Optional[datetime], end_date: Optional[datetime]):
    if start_date:
        query = query.filter(model.timestamp >= start_date)
    if end_date:
        query = query.filter(model.timestamp <= end_date)
    return query


def get_campaign_report_detail(
    db: Session,
    campaign_id: UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> CampaignReportDetail:
    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    advertiser = db.query(Advertiser).filter(Advertiser.id == campaign.advertiser_id).first()
    advertiser_name = advertiser.company_name or advertiser.name if advertiser else "Unknown"

    impression_query = db.query(Impression).filter(Impression.campaign_id == campaign_id)
    click_query = db.query(Click).filter(Click.campaign_id == campaign_id)
    impression_query = _apply_date_filters(impression_query, Impression, start_date, end_date)
    click_query = _apply_date_filters(click_query, Click, start_date, end_date)

    impressions_count = impression_query.count()
    clicks_count = click_query.count()
    ctr = (clicks_count / impressions_count * 100) if impressions_count > 0 else 0.0

    creatives = db.query(AdCreative).filter(AdCreative.campaign_id == campaign_id).all()
    creative_stats: list[CreativeStatsBrief] = []
    for creative in creatives:
        c_imp_q = db.query(Impression).filter(Impression.ad_creative_id == creative.id)
        c_clk_q = db.query(Click).filter(Click.ad_creative_id == creative.id)
        c_imp_q = _apply_date_filters(c_imp_q, Impression, start_date, end_date)
        c_clk_q = _apply_date_filters(c_clk_q, Click, start_date, end_date)
        c_impressions = c_imp_q.count()
        c_clicks = c_clk_q.count()
        c_ctr = (c_clicks / c_impressions * 100) if c_impressions > 0 else 0.0
        creative_stats.append(
            CreativeStatsBrief(
                creative_id=creative.id,
                creative_name=creative.name,
                impressions=c_impressions,
                clicks=c_clicks,
                click_through_rate=round(c_ctr, 2),
            )
        )

    return CampaignReportDetail(
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        advertiser_name=advertiser_name,
        status=campaign.status.value,
        campaign_start_date=campaign.start_date,
        campaign_end_date=campaign.end_date,
        impressions=impressions_count,
        clicks=clicks_count,
        click_through_rate=round(ctr, 2),
        impressions_served=campaign.impressions_served,
        budget_remaining=max(0, campaign.impression_budget - campaign.impressions_served),
        budget_utilized_percentage=round(campaign.budget_utilized_percentage, 2),
        report_period_start=start_date,
        report_period_end=end_date,
        generated_at=datetime.utcnow(),
        creatives=creative_stats,
    )


def build_campaigns_csv(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> str:
    campaigns = db.query(Campaign).order_by(Campaign.name).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Campaign",
        "Advertiser",
        "Status",
        "Impressions",
        "Clicks",
        "CTR %",
        "Budget Served",
        "Budget Total",
        "Budget Remaining",
        "Budget Used %",
    ])
    for campaign in campaigns:
        detail = get_campaign_report_detail(db, campaign.id, start_date, end_date)
        writer.writerow([
            detail.campaign_name,
            detail.advertiser_name,
            detail.status,
            detail.impressions,
            detail.clicks,
            detail.click_through_rate,
            detail.impressions_served,
            campaign.impression_budget,
            detail.budget_remaining,
            detail.budget_utilized_percentage,
        ])
    return output.getvalue()


def build_campaign_csv(
    db: Session,
    campaign_id: UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> str:
    detail = get_campaign_report_detail(db, campaign_id, start_date, end_date)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Campaign Report", detail.campaign_name])
    writer.writerow(["Advertiser", detail.advertiser_name])
    writer.writerow(["Status", detail.status])
    writer.writerow(["Generated", detail.generated_at.isoformat() + "Z"])
    if detail.report_period_start or detail.report_period_end:
        writer.writerow([
            "Report period",
            f"{detail.report_period_start or 'start'} — {detail.report_period_end or 'now'}",
        ])
    writer.writerow([])
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Impressions", detail.impressions])
    writer.writerow(["Clicks", detail.clicks])
    writer.writerow(["CTR %", detail.click_through_rate])
    writer.writerow(["Budget served", detail.impressions_served])
    writer.writerow(["Budget remaining", detail.budget_remaining])
    writer.writerow(["Budget used %", detail.budget_utilized_percentage])
    writer.writerow([])
    writer.writerow(["Creative", "Impressions", "Clicks", "CTR %"])
    for creative in detail.creatives:
        writer.writerow([
            creative.creative_name,
            creative.impressions,
            creative.clicks,
            creative.click_through_rate,
        ])
    return output.getvalue()


def create_share_link_for_campaign(
    campaign_id: UUID,
    days_valid: int = 30,
) -> dict:
    token = create_report_share_token(str(campaign_id), days_valid=days_valid)
    expires_at = datetime.utcnow() + timedelta(days=days_valid)
    return {
        "token": token,
        "expires_at": expires_at,
        "days_valid": days_valid,
    }


def campaign_id_from_share_token(token: str) -> UUID:
    payload = verify_report_share_token(token)
    return UUID(payload["campaign_id"])
