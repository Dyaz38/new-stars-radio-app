"""Station events endpoints for app + admin panel."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.events import (
    EventsResponse,
    EventsUpdateRequest,
    EventsUpdateResponse,
    StationEvent,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _events_file_path() -> Path:
    path = Path(settings.EVENTS_STORAGE_PATH)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _write_events(items: list[StationEvent]) -> None:
    path = _events_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"items": [item.model_dump() for item in items]}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _read_events() -> list[StationEvent]:
    path = _events_file_path()
    if not path.exists():
        return []

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        parsed = EventsResponse.model_validate(raw)
        return parsed.items
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Invalid events file detected (%s). Returning empty list.", exc)
        return []


@router.get(
    "/",
    response_model=EventsResponse,
    summary="Get public station events",
)
async def get_events():
    return EventsResponse(items=_read_events())


@router.put(
    "/",
    response_model=EventsUpdateResponse,
    summary="Update station events (admin)",
)
async def update_events(
    body: EventsUpdateRequest,
    _: User = Depends(get_current_user),
):
    _write_events(body.items)
    logger.info("station events updated: items=%s", len(body.items))
    return EventsUpdateResponse(updated_items=len(body.items), items=body.items)
