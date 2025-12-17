"""
Report and analytics schemas.
"""
from pydantic import BaseModel
from typing import Optional
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


class DateRange(BaseModel):
    """Date range for reports."""
    start_date: datetime
    end_date: datetime






















