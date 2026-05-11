"""Schemas for station event location presets (towns / cities)."""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class EventLocationsResponse(BaseModel):
    """Ordered list of place names for event venue dropdowns."""

    places: list[str] = Field(default_factory=list)


class EventLocationsUpdateRequest(BaseModel):
    places: list[str] = Field(default_factory=list, max_length=200)

    @field_validator("places")
    @classmethod
    def normalize_places(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for raw in value:
            s = raw.strip()
            if not s:
                continue
            key = s.casefold()
            if key in seen:
                continue
            seen.add(key)
            out.append(s)
        return out


class EventLocationsUpdateResponse(BaseModel):
    ok: bool = True
    places: list[str]
