"""
Report and analytics schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CampaignStats(BaseModel):
    """Campaign statistics."""
    campaign_id: UUID
    campaign_name: str
    impressions: int
    clicks: int
    click_through_rate: float
    impressions_served: int
    budget_remaining: int
    budget_utilized_percentage: float


class CreativeStats(BaseModel):
    """Creative statistics."""
    creative_id: UUID
    creative_name: str
    impressions: int
    clicks: int
    click_through_rate: float


class CreativeStatsBrief(BaseModel):
    """Creative row for detailed campaign reports."""
    creative_id: UUID
    creative_name: str
    impressions: int
    clicks: int
    click_through_rate: float


class CampaignReportDetail(CampaignStats):
    """Full campaign report for advertisers (export + share page)."""
    advertiser_name: str
    status: str
    campaign_start_date: datetime
    campaign_end_date: datetime
    report_period_start: Optional[datetime] = None
    report_period_end: Optional[datetime] = None
    generated_at: datetime
    creatives: List[CreativeStatsBrief] = Field(default_factory=list)


class ReportShareResponse(BaseModel):
    """Shareable read-only report link for an advertiser."""
    token: str
    expires_at: datetime
    days_valid: int


class TopCampaignRow(BaseModel):
    """Campaign row for dashboard leaderboard."""
    id: UUID
    name: str
    status: str
    impressions_served: int
    impression_budget: int
    clicks: int
    ctr: float


class DashboardOverview(BaseModel):
    """Aggregated stats for the admin dashboard."""
    total_campaigns: int
    active_campaigns: int
    total_impressions: int
    total_clicks: int
    overall_ctr: float
    top_campaigns: List[TopCampaignRow] = Field(default_factory=list)


class DateRange(BaseModel):
    """Date range for reports."""
    start_date: datetime
    end_date: datetime



































