"""
Reports and analytics endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.schemas.report import CampaignStats, CreativeStats
from app.models.campaign import Campaign
from app.models.ad_creative import AdCreative
from app.models.impression import Impression
from app.models.click import Click
from app.models.user import User

router = APIRouter()


@router.get("/campaigns/{campaign_id}/stats", response_model=CampaignStats)
async def get_campaign_stats(
    campaign_id: UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for a specific campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Build date filter
    impression_query = db.query(Impression).filter(Impression.campaign_id == campaign_id)
    click_query = db.query(Click).filter(Click.campaign_id == campaign_id)
    
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
        budget_utilized_percentage=campaign.budget_utilized_percentage
    )


@router.get("/campaigns/stats", response_model=List[CampaignStats])
async def get_all_campaigns_stats(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for all campaigns."""
    campaigns = db.query(Campaign).all()
    stats = []
    
    for campaign in campaigns:
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
        
        stats.append(CampaignStats(
            campaign_id=campaign.id,
            campaign_name=campaign.name,
            impressions=impressions_count,
            clicks=clicks_count,
            click_through_rate=round(click_through_rate, 2),
            impressions_served=campaign.impressions_served,
            budget_remaining=max(0, campaign.impression_budget - campaign.impressions_served),
            budget_utilized_percentage=campaign.budget_utilized_percentage
        ))
    
    return stats


@router.get("/creatives/{creative_id}/stats", response_model=CreativeStats)
async def get_creative_stats(
    creative_id: UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
        click_through_rate=round(click_through_rate, 2)
    )






















