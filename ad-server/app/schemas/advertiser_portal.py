"""Schemas for advertiser self-service portal."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AdvertiserPortalClient(BaseModel):
    id: UUID
    name: str
    company_name: str | None


class AdvertiserPortalOverview(BaseModel):
    advertiser_id: UUID
    advertiser_name: str
    company_name: str | None
    campaign_count: int
    pending_creatives_count: int
    client_count: int = 1
    is_agency_account: bool = False


class AdvertiserPortalCampaign(BaseModel):
    id: UUID
    name: str
    status: str
    start_date: datetime
    end_date: datetime

    model_config = ConfigDict(from_attributes=True)


class AdvertiserPortalCreative(BaseModel):
    id: UUID
    campaign_id: UUID
    campaign_name: str
    advertiser_id: UUID
    advertiser_name: str
    name: str
    image_url: str
    image_width: int
    image_height: int
    click_url: str
    alt_text: str | None
    status: str
    created_at: datetime
