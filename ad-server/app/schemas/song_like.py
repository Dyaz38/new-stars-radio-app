"""Pydantic schemas for song like API."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SongLikeCreate(BaseModel):
    """Public POST body — radio app listeners (no login)."""

    song_key: str = Field(..., min_length=1, max_length=512, description="Normalized id: artist-title slug")
    artist: str = Field(..., min_length=1, max_length=500)
    title: str = Field(..., min_length=1, max_length=500)
    listener_id: str = Field(..., min_length=8, max_length=64, description="Per-device UUID from client storage")
    action: Literal["like", "unlike"]

    @field_validator("song_key", "artist", "title")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()


class SongLikeCreateResponse(BaseModel):
    id: UUID
    ok: bool = True


class SongCatalogRow(BaseModel):
    """Aggregated row for admin catalog."""

    song_key: str
    artist: str
    title: str
    like_events: int
    unlike_events: int
    net_score: int
    last_event_at: Optional[datetime] = None


class SongCatalogResponse(BaseModel):
    items: list[SongCatalogRow]
    total_songs: int
    offset: int
    limit: int
