"""Pydantic schemas for radio schedule API."""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schedule_days import SCHEDULE_DAY_KEYS, ScheduleDayKey


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


class ScheduleByDay(BaseModel):
    mon_thu: list[ScheduleShow] = Field(default_factory=list)
    fri: list[ScheduleShow] = Field(default_factory=list)
    sat: list[ScheduleShow] = Field(default_factory=list)
    sun: list[ScheduleShow] = Field(default_factory=list)

    def all_items(self) -> list[ScheduleShow]:
        return [item for key in SCHEDULE_DAY_KEYS for item in getattr(self, key)]


class ScheduleResponse(BaseModel):
    days: ScheduleByDay


class ScheduleUpdateRequest(BaseModel):
    days: ScheduleByDay

    @model_validator(mode="after")
    def unique_ids_across_days(self) -> ScheduleUpdateRequest:
        ids = [item.id for item in self.days.all_items()]
        if len(ids) != len(set(ids)):
            raise ValueError("Schedule item ids must be unique across all day tabs")
        total = len(ids)
        if total > 400:
            raise ValueError("Schedule is too large (max 400 slots total)")
        return self


class ScheduleUpdateResponse(BaseModel):
    ok: bool = True
    updated_items: int
    days: ScheduleByDay
