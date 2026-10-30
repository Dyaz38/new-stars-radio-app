"""Station events endpoints for app + admin panel."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.api.dependencies import get_current_staff_user, get_optional_current_user
from app.core.config import settings
from app.models.user import User, UserRole
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
from app.seed.station_content import NEW_STARS_EVENT_LOCATIONS
from app.services.storage import upload_station_event_image
from app.services.event_geo import filter_events_for_country
from app.services.station_events_store import (
    events_for_public_listeners,
    normalize_events,
    read_events,
    write_events,
)
from app.services.geoip import resolve_request_geo
from app.services.json_file_store import write_json_atomic

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_EVENT_LOCATIONS: list[str] = NEW_STARS_EVENT_LOCATIONS


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
    payload = EventLocationsResponse(places=places).model_dump(mode="json")
    write_json_atomic(_locations_file_path(), payload)


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
    _: User = Depends(get_current_staff_user),
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
    items = read_events()
    if current_user is not None and current_user.role in (UserRole.ADMIN, UserRole.SALES_REP):
        return EventsResponse(items=items, listener_country=None, published_count=None)
    geo = await resolve_request_geo(http_request)
    upcoming = events_for_public_listeners(items)
    filtered = filter_events_for_country(upcoming, geo.country)
    return EventsResponse(
        items=filtered,
        listener_country=geo.country,
        published_count=len(upcoming),
    )


@router.post(
    "/upload-image",
    response_model=EventImageUploadResponse,
    summary="Upload station event image (admin)",
)
async def upload_event_image(
    image_file: UploadFile = File(...),
    _: User = Depends(get_current_staff_user),
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


@router.post(
    "/{event_id}/approve",
    response_model=StationEvent,
    summary="Publish a promoter-submitted event (staff)",
)
async def approve_event(
    event_id: int,
    _: User = Depends(get_current_staff_user),
):
    all_items = read_events()
    target: StationEvent | None = None
    for item in all_items:
        if item.id == event_id:
            target = item
            break
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if target.review_status != "pending_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending_review events can be approved.",
        )
    updated = target.model_copy(update={"review_status": "published"})
    replaced = [updated if e.id == event_id else e for e in all_items]
    write_events(normalize_events(replaced))
    logger.info("Event approved for listeners: id=%s", event_id)
    return updated


@router.put(
    "/",
    response_model=EventsUpdateResponse,
    summary="Update station events (admin)",
)
async def update_events(
    body: EventsUpdateRequest,
    _: User = Depends(get_current_staff_user),
):
    normalized = normalize_events(body.items)
    write_events(normalized)
    logger.info("station events updated: items=%s", len(normalized))
    return EventsUpdateResponse(updated_items=len(normalized), items=normalized)
