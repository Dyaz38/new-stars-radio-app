"""Station events endpoints for app + admin panel."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.api.dependencies import get_current_user, get_optional_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.event_locations import (
    EventLocationsResponse,
    EventLocationsUpdateRequest,
    EventLocationsUpdateResponse,
)
from app.schemas.events import (
    EventImageUploadResponse,
    EventsResponse,
    EventsUpdateRequest,
    EventsUpdateResponse,
    StationEvent,
)
from app.seed.station_content import NEW_STARS_EVENT_LOCATIONS, NEW_STARS_EVENTS
from app.services.storage import upload_station_event_image
from app.services.event_geo import filter_events_for_country
from app.services.geoip import resolve_request_geo

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_EVENTS: list[StationEvent] = NEW_STARS_EVENTS
DEFAULT_EVENT_LOCATIONS: list[str] = NEW_STARS_EVENT_LOCATIONS


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


def _events_file_path() -> Path:
    path = Path(settings.EVENTS_STORAGE_PATH)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _write_events(items: list[StationEvent]) -> None:
    path = _events_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"items": [item.model_dump(mode="json") for item in items]}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _read_events() -> list[StationEvent]:
    path = _events_file_path()
    if not path.exists():
        _write_events(DEFAULT_EVENTS)
        return DEFAULT_EVENTS

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        parsed = EventsResponse.model_validate(raw)
        return _sanitize_events(parsed.items)
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Invalid events file detected (%s). Resetting to defaults.", exc)
        _write_events(DEFAULT_EVENTS)
        return DEFAULT_EVENTS


def _locations_file_path() -> Path:
    path = Path(settings.EVENT_LOCATIONS_STORAGE_PATH)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _read_locations() -> list[str]:
    path = _locations_file_path()
    if not path.exists():
        _write_locations(DEFAULT_EVENT_LOCATIONS)
        return DEFAULT_EVENT_LOCATIONS

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        parsed = EventLocationsResponse.model_validate(raw)
        return parsed.places
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Invalid event locations file detected (%s). Resetting to defaults.", exc)
        _write_locations(DEFAULT_EVENT_LOCATIONS)
        return DEFAULT_EVENT_LOCATIONS


def _write_locations(places: list[str]) -> None:
    path = _locations_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = EventLocationsResponse(places=places).model_dump(mode="json")
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


@router.get(
    "/locations",
    response_model=EventLocationsResponse,
    summary="Get preset event locations (towns / cities)",
)
async def get_event_locations():
    return EventLocationsResponse(places=_read_locations())


@router.put(
    "/locations",
    response_model=EventLocationsUpdateResponse,
    summary="Update preset event locations (admin)",
)
async def update_event_locations(
    body: EventLocationsUpdateRequest,
    _: User = Depends(get_current_user),
):
    _write_locations(body.places)
    logger.info("station event locations updated: count=%s", len(body.places))
    return EventLocationsUpdateResponse(places=_read_locations())


@router.get(
    "/",
    response_model=EventsResponse,
    summary="Get public station events",
)
async def get_events(
    http_request: Request,
    current_user: User | None = Depends(get_optional_current_user),
):
    items = _read_events()
    if current_user is not None:
        return EventsResponse(items=items, listener_country=None, published_count=None)
    geo = await resolve_request_geo(http_request)
    filtered = filter_events_for_country(items, geo.country)
    return EventsResponse(
        items=filtered,
        listener_country=geo.country,
        published_count=len(items),
    )


@router.post(
    "/upload-image",
    response_model=EventImageUploadResponse,
    summary="Upload station event image (admin)",
)
async def upload_event_image(
    image_file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    effective_filename = (image_file.filename or "").strip() or "image.jpg"
    file_ext = Path(effective_filename).suffix.lower()
    if file_ext not in settings.get_allowed_extensions_list():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Use one of: {', '.join(settings.get_allowed_extensions_list())}",
        )
    try:
        image_url = upload_station_event_image(image_file, effective_filename)
    except Exception as e:
        logger.exception("Event image upload failed: %s", e)
        err_msg = str(e).split("\n")[0][:200]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Upload failed: {err_msg}. Check storage settings on Railway (R2 or disk).",
        ) from e
    return EventImageUploadResponse(image_url=image_url)


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
