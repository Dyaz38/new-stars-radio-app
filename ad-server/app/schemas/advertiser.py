"""
Advertiser schemas.
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class AdvertiserBase(BaseModel):
    """Base advertiser schema."""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company_name: Optional[str] = None


class AdvertiserCreate(AdvertiserBase):
    """Schema for creating an advertiser."""
    pass


class AdvertiserUpdate(BaseModel):
    """Schema for updating an advertiser."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    status: Optional[str] = None


class AdvertiserResponse(AdvertiserBase):
    """Advertiser response schema."""
    id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)













