"""Pydantic schemas for radio schedule API."""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ScheduleShow(BaseModel):
    """Single schedule slot shown in the radio app."""

    id: int = Field(..., ge=1)
    time: str = Field(..., min_length=3, max_length=120)
    show: str = Field(..., min_length=1, max_length=120)
    dj: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=500)
    current: bool = False

    @field_validator("time", "show", "dj", "description")
    @classmethod
    def strip_text_fields(cls, value: str) -> str:
        return value.strip()


class ScheduleResponse(BaseModel):
    items: list[ScheduleShow]


class ScheduleUpdateRequest(BaseModel):
    items: list[ScheduleShow] = Field(..., min_length=1, max_length=100)

    @field_validator("items")
    @classmethod
    def unique_ids(cls, items: list[ScheduleShow]) -> list[ScheduleShow]:
        ids = [item.id for item in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Schedule item ids must be unique")
        return items


class ScheduleUpdateResponse(BaseModel):
    ok: bool = True
    updated_items: int
    items: list[ScheduleShow]
