"""
Ad creative schemas.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class CreativeBase(BaseModel):
    """Base creative schema."""
    name: str
    image_url: str
    image_width: int
    image_height: int
    click_url: str
    alt_text: Optional[str] = None


class CreativeCreate(CreativeBase):
    """Schema for creating a creative."""
    campaign_id: UUID


class CreativeUpdate(BaseModel):
    """Schema for updating a creative."""
    name: Optional[str] = None
    image_url: Optional[str] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    click_url: Optional[str] = None
    alt_text: Optional[str] = None
    status: Optional[str] = None


class CreativeResponse(CreativeBase):
    """Creative response schema."""
    id: UUID
    campaign_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)













