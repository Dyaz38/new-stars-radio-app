"""Admin-created promoter portal login."""
from pydantic import BaseModel, EmailStr, Field


class PromoterUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class PromoterUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool


class PromoterUserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    password: str | None = Field(None, min_length=8, max_length=128)
    is_active: bool | None = None
