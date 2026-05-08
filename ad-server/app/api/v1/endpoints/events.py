"""Station events endpoints for app + admin panel."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.events import (
    EventImageUploadResponse,
    EventsResponse,
    EventsUpdateRequest,
    EventsUpdateResponse,
    StationEvent,
)
from app.services.storage import upload_station_event_image

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
    payload = {"items": [item.model_dump(mode="json") for item in items]}
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
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Use one of: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )
    try:
        image_url = upload_station_event_image(image_file, effective_filename)
    except Exception as e:
        logger.exception("Event image upload failed: %s", e)
        err_msg = str(e).split("\n")[0][:200]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Upload failed: {err_msg}. Check storage (R2 or disk) or use an Image URL instead."
            ),
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
