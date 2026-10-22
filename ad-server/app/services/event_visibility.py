"""Past/upcoming visibility and status for station events."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.schemas.events import StationEvent

DEFAULT_EVENT_DURATION = timedelta(hours=2)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def event_end_at(event: StationEvent) -> datetime | None:
    if event.ends_at is not None:
        return _as_utc(event.ends_at)
    if event.starts_at is not None:
        return _as_utc(event.starts_at) + DEFAULT_EVENT_DURATION
    return None


def is_event_ended(event: StationEvent, now: datetime | None = None) -> bool:
    now = _utc_now() if now is None else _as_utc(now)
    end = event_end_at(event)
    if end is not None:
        return end < now
    return event.status == "past"


def refresh_event_status(event: StationEvent, now: datetime | None = None) -> StationEvent:
    """Set status from start/end times when calendar fields exist."""
    now = _utc_now() if now is None else _as_utc(now)
    end = event_end_at(event)
    start = _as_utc(event.starts_at) if event.starts_at is not None else None

    if end is not None and end < now:
        return event.model_copy(update={"status": "past"})
    if start is not None and start <= now and end is not None and end >= now:
        return event.model_copy(update={"status": "live"})
    if start is not None and start > now:
        return event.model_copy(update={"status": "upcoming"})
    return event


def visible_to_listeners(event: StationEvent, now: datetime | None = None) -> bool:
    return not is_event_ended(event, now)
