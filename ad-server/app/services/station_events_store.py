"""Read/write station events JSON (listener + admin + promoter portal)."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from app.core.config import settings
from app.schemas.events import EventsResponse, StationEvent
from app.seed.station_content import NEW_STARS_EVENTS
from app.services.event_visibility import refresh_event_status, visible_to_listeners
from app.services.json_file_store import write_json_atomic

logger = logging.getLogger(__name__)

DEFAULT_EVENTS: list[StationEvent] = NEW_STARS_EVENTS


def _is_placeholder_event_image(url: str | None) -> bool:
    if not url or not url.strip():
        return False
    lower = url.strip().lower()
    return "picsum.photos" in lower or "placehold.co" in lower or "placeholder.com" in lower


def _sanitize_event(item: StationEvent) -> StationEvent:
    if item.image_url and _is_placeholder_event_image(item.image_url):
        return item.model_copy(update={"image_url": None})
    return item


def _sanitize_events(items: list[StationEvent]) -> list[StationEvent]:
    cleaned: list[StationEvent] = []
    for item in items:
        if item.image_url and _is_placeholder_event_image(item.image_url):
            continue
        cleaned.append(_sanitize_event(item))
    return cleaned


def events_file_path() -> Path:
    path = Path(settings.EVENTS_STORAGE_PATH)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def write_events(items: list[StationEvent]) -> None:
    write_json_atomic(
        events_file_path(),
        {"items": [item.model_dump(mode="json") for item in items]},
    )


def normalize_events(items: list[StationEvent]) -> list[StationEvent]:
    return [refresh_event_status(item) for item in items]


def read_events() -> list[StationEvent]:
    path = events_file_path()
    if not path.exists():
        write_events(DEFAULT_EVENTS)
        return normalize_events(DEFAULT_EVENTS)

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        parsed = EventsResponse.model_validate(raw)
        return normalize_events(_sanitize_events(parsed.items))
    except Exception as exc:  # pragma: no cover
        logger.warning("Invalid events file detected (%s). Resetting to defaults.", exc)
        write_events(DEFAULT_EVENTS)
        return normalize_events(DEFAULT_EVENTS)


def next_event_id(items: list[StationEvent]) -> int:
    if not items:
        return 1
    return max(item.id for item in items) + 1


def is_published_for_listeners(event: StationEvent) -> bool:
    return event.review_status == "published"


def events_for_public_listeners(items: list[StationEvent]) -> list[StationEvent]:
    return [
        e
        for e in items
        if is_published_for_listeners(e) and visible_to_listeners(e)
    ]
