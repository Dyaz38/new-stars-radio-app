"""Promoter self-service event submissions."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.events import StationEvent


class PromoterEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    date_label: str = Field(..., min_length=1, max_length=200)
    location: str = Field(..., min_length=1, max_length=200)
    is_online: bool = False
    description: str = Field(default="", max_length=1000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    doors_at: datetime | None = None
    ticket_url: str | None = Field(default=None, max_length=2000)
    ticket_price: str | None = Field(default=None, max_length=120)
    image_url: str | None = Field(default=None, max_length=2000)
    country_code: str | None = Field(default=None, max_length=2)


class PromoterEventUpdate(PromoterEventCreate):
    pass


class PromoterEventsListResponse(BaseModel):
    items: list[StationEvent]
