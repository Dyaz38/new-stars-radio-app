"""
Song like / unlike events from the radio web app (cataloged in DB).
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import case, desc, func
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.song_like import SongLikeRecord
from app.models.user import User
from app.schemas.song_like import (
    SongLikeCreate,
    SongLikeCreateResponse,
    SongCatalogClearResponse,
    SongCatalogResponse,
    SongCatalogRow,
)
from app.integrations.airtime_genre import resolve_genre_from_airtime

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/",
    response_model=SongLikeCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a like or unlike from the radio app",
)
async def record_song_like(
    body: SongLikeCreate,
    db: Session = Depends(get_db),
    user_agent: Optional[str] = Header(None, convert_underscores=False),
):
    """
    Public endpoint — no JWT. Uses anonymous `listener_id` from the client.
    """
    if body.action not in ("like", "unlike"):
        raise HTTPException(status_code=400, detail="action must be like or unlike")

    ua = (user_agent or "")[:2000] if user_agent else None

    genre_val = body.genre[:200] if body.genre else None
    if not genre_val:
        resolved = await resolve_genre_from_airtime(body.artist, body.title)
        if resolved:
            genre_val = resolved[:200]

    row = SongLikeRecord(
        song_key=body.song_key[:512],
        artist=body.artist[:500],
        title=body.title[:500],
        listener_id=body.listener_id[:64],
        action=body.action,
        genre=genre_val,
        user_agent=ua,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    logger.info(
        "song_like %s song_key=%s listener=%s",
        body.action,
        body.song_key[:80],
        body.listener_id[:12],
    )
    return SongLikeCreateResponse(id=row.id)


@router.get(
    "/catalog",
    response_model=SongCatalogResponse,
    summary="Aggregated like catalog (admin)",
    description="Grouped by song: like/unlike counts and net score. Sort by like_events desc.",
)
async def get_like_catalog(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    like_events = func.coalesce(
        func.sum(case((SongLikeRecord.action == "like", 1), else_=0)), 0
    ).label("like_events")
    unlike_events = func.coalesce(
        func.sum(case((SongLikeRecord.action == "unlike", 1), else_=0)), 0
    ).label("unlike_events")

    # Prefer a non-null genre when the same song has multiple rows (e.g. older rows without genre)
    genre_display = func.max(SongLikeRecord.genre).label("genre")

    base_q = (
        db.query(
            SongLikeRecord.song_key,
            SongLikeRecord.artist,
            SongLikeRecord.title,
            genre_display,
            like_events,
            unlike_events,
            func.max(SongLikeRecord.created_at).label("last_event_at"),
        )
        .group_by(SongLikeRecord.song_key, SongLikeRecord.artist, SongLikeRecord.title)
    )

    subq = base_q.subquery()
    total = db.query(func.count()).select_from(subq).scalar() or 0

    rows = (
        db.query(
            SongLikeRecord.song_key,
            SongLikeRecord.artist,
            SongLikeRecord.title,
            genre_display,
            like_events,
            unlike_events,
            func.max(SongLikeRecord.created_at).label("last_event_at"),
        )
        .group_by(SongLikeRecord.song_key, SongLikeRecord.artist, SongLikeRecord.title)
        .order_by(desc(like_events), SongLikeRecord.song_key)
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [
        SongCatalogRow(
            song_key=r.song_key,
            artist=r.artist,
            title=r.title,
            genre=r.genre,
            like_events=int(r.like_events or 0),
            unlike_events=int(r.unlike_events or 0),
            net_score=int(r.like_events or 0) - int(r.unlike_events or 0),
            last_event_at=r.last_event_at,
        )
        for r in rows
    ]

    return SongCatalogResponse(
        items=items,
        total_songs=int(total),
        offset=offset,
        limit=limit,
    )


@router.delete(
    "/catalog",
    response_model=SongCatalogClearResponse,
    summary="Delete all song like events (admin)",
    description="Removes every row from song_like_records. The aggregated catalog becomes empty.",
)
async def clear_like_catalog(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Destructive: clears all listener like/unlike history. Requires admin JWT."""
    deleted = db.query(SongLikeRecord).delete(synchronize_session=False)
    db.commit()
    logger.warning("song_like catalog cleared by admin: deleted_rows=%s", deleted)
    return SongCatalogClearResponse(deleted_rows=int(deleted or 0))
