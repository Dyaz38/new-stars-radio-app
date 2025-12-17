"""
Campaign schemas.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CampaignBase(BaseModel):
    """Base campaign schema."""
    name: str
    start_date: datetime
    end_date: datetime
    priority: int = 5  # 1-10
    impression_budget: int
    target_cities: Optional[List[str]] = None
    target_states: Optional[List[str]] = None


class CampaignCreate(CampaignBase):
    """Schema for creating a campaign."""
    advertiser_id: UUID


class CampaignUpdate(BaseModel):
    """Schema for updating a campaign."""
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    priority: Optional[int] = None
    impression_budget: Optional[int] = None
    target_cities: Optional[List[str]] = None
    target_states: Optional[List[str]] = None


class CampaignResponse(CampaignBase):
    """Campaign response schema."""
    id: UUID
    advertiser_id: UUID
    status: str
    impressions_served: int
    last_served_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)













