"""
Ad creative schemas.
"""
from pydantic import BaseModel, ConfigDict, field_validator
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

    @field_validator("image_url")
    @classmethod
    def normalize_image_url(cls, value: str) -> str:
        """Legacy uploads stored spaces in R2 URLs while the object key uses hyphens."""
        if value.startswith("http") and " " in value:
            return value.replace(" ", "-")
        return value


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













