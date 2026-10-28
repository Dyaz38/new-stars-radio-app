"""Admin-created advertiser portal login."""
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class AdvertiserUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    """One id = single client; multiple = agency managing several advertisers."""
    advertiser_ids: list[UUID] = Field(..., min_length=1, max_length=50)


class AdvertiserUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    advertiser_id: str
    advertiser_ids: list[str]
    is_active: bool


class AdvertiserUserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    advertiser_ids: list[UUID] | None = Field(None, min_length=1, max_length=50)
    password: str | None = Field(None, min_length=8, max_length=128)
    is_active: bool | None = None
