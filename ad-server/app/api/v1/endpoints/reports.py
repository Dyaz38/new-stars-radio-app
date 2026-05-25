"""
Reports and analytics endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.schemas.report import (
    CampaignStats,
    CreativeStats,
    CampaignReportDetail,
    ReportShareResponse,
    DashboardOverview,
    TopCampaignRow,
)
from app.models.campaign import Campaign
from app.models.ad_creative import AdCreative
from app.models.impression import Impression
from app.models.click import Click
from app.models.user import User
from app.services.report_service import (
    get_campaign_report_detail,
    build_campaigns_csv,
    build_campaign_csv,
    create_share_link_for_campaign,
    campaign_id_from_share_token,
)

router = APIRouter()


def _campaign_stats_row(
    db: Session,
    campaign: Campaign,
    start_date: Optional[datetime],
    end_date: Optional[datetime],
) -> CampaignStats:
    impression_query = db.query(Impression).filter(Impression.campaign_id == campaign.id)
    click_query = db.query(Click).filter(Click.campaign_id == campaign.id)

    if start_date:
        impression_query = impression_query.filter(Impression.timestamp >= start_date)
        click_query = click_query.filter(Click.timestamp >= start_date)

    if end_date:
        impression_query = impression_query.filter(Impression.timestamp <= end_date)
        click_query = click_query.filter(Click.timestamp <= end_date)

    impressions_count = impression_query.count()
    clicks_count = click_query.count()
    click_through_rate = (clicks_count / impressions_count * 100) if impressions_count > 0 else 0.0

    return CampaignStats(
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        impressions=impressions_count,
        clicks=clicks_count,
        click_through_rate=round(click_through_rate, 2),
        impressions_served=campaign.impressions_served,
        budget_remaining=max(0, campaign.impression_budget - campaign.impressions_served),
        budget_utilized_percentage=campaign.budget_utilized_percentage,
    )


@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated dashboard metrics and top campaigns."""
    campaigns = db.query(Campaign).all()
    rows = [_campaign_stats_row(db, campaign, None, None) for campaign in campaigns]
    total_impressions = sum(r.impressions for r in rows)
    total_clicks = sum(r.clicks for r in rows)
    overall_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0
    active_count = sum(1 for c in campaigns if c.status.value == "active")

    campaign_by_id = {c.id: c for c in campaigns}
    top = sorted(rows, key=lambda r: r.impressions, reverse=True)[:10]
    top_campaigns = [
        TopCampaignRow(
            id=r.campaign_id,
            name=r.campaign_name,
            status=campaign_by_id[r.campaign_id].status.value,
            impressions_served=r.impressions_served,
            impression_budget=campaign_by_id[r.campaign_id].impression_budget,
            clicks=r.clicks,
            ctr=r.click_through_rate,
        )
        for r in top
    ]

    return DashboardOverview(
        total_campaigns=len(campaigns),
        active_campaigns=active_count,
        total_impressions=total_impressions,
        total_clicks=total_clicks,
        overall_ctr=round(overall_ctr, 2),
        top_campaigns=top_campaigns,
    )


@router.get("/campaigns/stats", response_model=List[CampaignStats])
async def get_all_campaigns_stats(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get statistics for all campaigns."""
    campaigns = db.query(Campaign).all()
    return [_campaign_stats_row(db, campaign, start_date, end_date) for campaign in campaigns]


@router.get("/campaigns/export.csv")
async def export_all_campaigns_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download CSV summary for all campaigns."""
    csv_text = build_campaigns_csv(db, start_date, end_date)
    filename = f"new-stars-radio-campaigns-{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/campaigns/{campaign_id}/stats", response_model=CampaignStats)
async def get_campaign_stats(
    campaign_id: UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get statistics for a specific campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _campaign_stats_row(db, campaign, start_date, end_date)


@router.get("/campaigns/{campaign_id}/detail", response_model=CampaignReportDetail)
async def get_campaign_report_detail_endpoint(
    campaign_id: UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detailed campaign report with creative breakdown."""
    return get_campaign_report_detail(db, campaign_id, start_date, end_date)


@router.get("/campaigns/{campaign_id}/export.csv")
async def export_campaign_csv(
    campaign_id: UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download CSV report for one campaign."""
    csv_text = build_campaign_csv(db, campaign_id, start_date, end_date)
    detail = get_campaign_report_detail(db, campaign_id, start_date, end_date)
    safe_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in detail.campaign_name)[:40]
    filename = f"report-{safe_name}-{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/campaigns/{campaign_id}/share", response_model=ReportShareResponse)
async def create_campaign_share_link(
    campaign_id: UUID,
    days_valid: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a shareable read-only report link for an advertiser."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    share = create_share_link_for_campaign(campaign_id, days_valid=days_valid)
    return ReportShareResponse(**share)


@router.get("/share", response_model=CampaignReportDetail)
async def get_shared_campaign_report(
    token: str = Query(..., min_length=10),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    """Public read-only campaign report (token from share link)."""
    campaign_id = campaign_id_from_share_token(token)
    return get_campaign_report_detail(db, campaign_id, start_date, end_date)


@router.get("/creatives/{creative_id}/stats", response_model=CreativeStats)
async def get_creative_stats(
    creative_id: UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get statistics for a specific creative."""
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(status_code=404, detail="Creative not found")

    impression_query = db.query(Impression).filter(Impression.ad_creative_id == creative_id)
    click_query = db.query(Click).filter(Click.ad_creative_id == creative_id)

    if start_date:
        impression_query = impression_query.filter(Impression.timestamp >= start_date)
        click_query = click_query.filter(Click.timestamp >= start_date)

    if end_date:
        impression_query = impression_query.filter(Impression.timestamp <= end_date)
        click_query = click_query.filter(Click.timestamp <= end_date)

    impressions_count = impression_query.count()
    clicks_count = click_query.count()
    click_through_rate = (clicks_count / impressions_count * 100) if impressions_count > 0 else 0.0

    return CreativeStats(
        creative_id=creative.id,
        creative_name=creative.name,
        impressions=impressions_count,
        clicks=clicks_count,
        click_through_rate=round(click_through_rate, 2),
    )
