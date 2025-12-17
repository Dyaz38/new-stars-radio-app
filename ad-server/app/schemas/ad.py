"""
Pydantic schemas for ad serving endpoints.
"""
from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
from uuid import UUID


class AdServeRequest(BaseModel):
    """Request schema for ad serving endpoint."""
    user_id: str  # Unique identifier for the user/device
    city: Optional[str] = None
    state: Optional[str] = None
    width: Optional[int] = None  # Banner width in pixels
    height: Optional[int] = None  # Banner height in pixels


class AdServeResponse(BaseModel):
    """Response schema for ad serving endpoint."""
    creative_id: UUID
    campaign_id: UUID
    image_url: str
    click_url: str
    alt_text: Optional[str] = None
    width: int
    height: int
    impression_id: UUID  # For tracking purposes
    
    class Config:
        from_attributes = True


class AdClickRequest(BaseModel):
    """Request schema for click tracking."""
    user_id: str
    creative_id: UUID
    campaign_id: UUID
    impression_id: Optional[UUID] = None






















