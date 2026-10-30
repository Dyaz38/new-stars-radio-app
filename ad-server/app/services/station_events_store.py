"""Read/write station events JSON (listener + admin + promoter portal)."""
from __future__ import annotations

import json
import logging
from collections.abc import Callable
from pathlib import Path

from app.core.config import settings
from app.schemas.events import EventsResponse, StationEvent
from app.seed.station_content import NEW_STARS_EVENTS
from app.services.event_visibility import refresh_event_status, visible_to_listeners
from app.services.json_file_store import exclusive_file_lock, write_json_atomic

logger = logging.getLogger(__name__)

DEFAULT_EVENTS: list[StationEvent] = NEW_STARS_EVENTS


class EventsStoreError(RuntimeError):
    """Raised when the on-disk events file cannot be read safely."""


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
    # Clear placeholder image URLs only — never drop the whole event (that permanently
    # deleted listings whenever read_events() was followed by write_events()).
    return [_sanitize_event(item) for item in items]


def events_file_path() -> Path:
    path = Path(settings.EVENTS_STORAGE_PATH)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _write_events_unlocked(items: list[StationEvent]) -> None:
    write_json_atomic(
        events_file_path(),
        {"items": [item.model_dump(mode="json") for item in items]},
    )


def write_events(items: list[StationEvent]) -> None:
    with exclusive_file_lock(events_file_path()):
        _write_events_unlocked(items)


def normalize_events(items: list[StationEvent]) -> list[StationEvent]:
    return [refresh_event_status(item) for item in items]


def _read_events_unlocked(*, seed_if_missing: bool = True) -> list[StationEvent]:
    path = events_file_path()
    if not path.exists():
        if not seed_if_missing:
            return []
        _write_events_unlocked(DEFAULT_EVENTS)
        return normalize_events(DEFAULT_EVENTS)

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        parsed = EventsResponse.model_validate(raw)
        return normalize_events(_sanitize_events(parsed.items))
    except Exception as exc:  # pragma: no cover
        logger.warning("Invalid events file detected (%s).", exc)
        bak = path.with_suffix(path.suffix + ".bak")
        try:
            path.replace(bak)
            logger.warning("Moved unreadable events file to %s", bak)
        except Exception:
            logger.warning("Could not back up unreadable events file at %s", path)
        # Do not auto-seed defaults over production data — force ops to restore from .bak.
        raise EventsStoreError(
            f"Unreadable events file at {path}. Restored copy may be at {bak}."
        ) from exc


def read_events() -> list[StationEvent]:
    with exclusive_file_lock(events_file_path()):
        return _read_events_unlocked()


def mutate_events(
    mutator: Callable[[list[StationEvent]], list[StationEvent]],
) -> list[StationEvent]:
    """Atomically read → mutate → write under one file lock."""
    with exclusive_file_lock(events_file_path()):
        items = _read_events_unlocked()
        next_items = normalize_events(mutator(items))
        _write_events_unlocked(next_items)
        return next_items


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
