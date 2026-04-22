"""Pydantic schemas for station events API."""
from __future__ import annotations

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

    @field_validator("title", "date_label", "location", "description")
    @classmethod
    def strip_text_fields(cls, value: str) -> str:
        return value.strip()


class EventsResponse(BaseModel):
    items: list[StationEvent]


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
