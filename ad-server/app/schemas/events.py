"""Pydantic schemas for station events API."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class StationEvent(BaseModel):
    """Single event shown in the listener app."""

    id: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=200)
    date_label: str = Field(..., min_length=1, max_length=200)
    location: str = Field(..., min_length=1, max_length=200)
    is_online: bool = False
    is_this_week: bool = False
    status: Literal["upcoming", "live", "past"] = "upcoming"
    description: str = Field(default="", max_length=1000)
    # ISO 8601 — used for Add to calendar in the listener app (optional for legacy rows)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    # Absolute https URL or relative path e.g. /static/events/... (listener resolves against API origin)
    image_url: str | None = Field(default=None, max_length=2000)
    # ISO 3166-1 alpha-2 — empty/null = show in all countries; else IP country must match
    country_code: str | None = Field(default=None, max_length=2)

    @field_validator("title", "date_label", "location", "description")
    @classmethod
    def strip_text_fields(cls, value: str) -> str:
        return value.strip()

    @field_validator("image_url")
    @classmethod
    def normalize_image_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        s = value.strip()
        return s or None

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        s = value.strip().upper()
        if not s:
            return None
        if len(s) != 2 or not s.isalpha():
            raise ValueError("country_code must be a 2-letter ISO code (e.g. NA, ZA)")
        return s


class EventsResponse(BaseModel):
    items: list[StationEvent]
    listener_country: str | None = Field(
        default=None,
        description="ISO country detected from listener IP (public API only)",
    )
    published_count: int | None = Field(
        default=None,
        description="Total published events before country filter (public API only)",
    )


class EventsUpdateRequest(BaseModel):
    items: list[StationEvent] = Field(default_factory=list, max_length=100)

    @field_validator("items")
    @classmethod
    def unique_ids(cls, items: list[StationEvent]) -> list[StationEvent]:
        ids = [item.id for item in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Event ids must be unique")
        return items


class EventsUpdateResponse(BaseModel):
    ok: bool = True
    updated_items: int
    items: list[StationEvent]


class EventImageUploadResponse(BaseModel):
    image_url: str
