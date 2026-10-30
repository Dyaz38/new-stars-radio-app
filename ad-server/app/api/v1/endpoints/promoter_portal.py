"""Self-service event listings for promoter portal accounts."""
from __future__ import annotations

import logging
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.dependencies import get_current_promoter_user
from app.services.storage import upload_station_event_bytes
from app.core.config import settings
from app.models.user import User
from app.schemas.events import EventImageUploadResponse, StationEvent
from app.schemas.promoter_portal import (
    PromoterEventCreate,
    PromoterEventUpdate,
    PromoterEventsListResponse,
)
from app.services.event_visibility import refresh_event_status
from app.services.station_events_store import (
    EventsStoreError,
    mutate_events,
    next_event_id,
    read_events,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _owner_id(user: User) -> str:
    return str(user.id)


def _promoter_events(all_items: list[StationEvent], user: User) -> list[StationEvent]:
    uid = _owner_id(user)
    return [e for e in all_items if e.submitted_by_user_id == uid]


def _find_owned(all_items: list[StationEvent], event_id: int, user: User) -> StationEvent | None:
    uid = _owner_id(user)
    for item in all_items:
        if item.id == event_id and item.submitted_by_user_id == uid:
            return item
    return None


def _build_event(
    body: PromoterEventCreate | PromoterEventUpdate,
    *,
    event_id: int,
    user: User,
    existing: StationEvent | None = None,
) -> StationEvent:
    base = existing.model_dump() if existing else {}
    merged = {
        **base,
        **body.model_dump(mode="json"),
        "id": event_id,
        "is_this_week": existing.is_this_week if existing else True,
        "status": existing.status if existing else "upcoming",
        "review_status": "pending_review",
        "submitted_by_user_id": _owner_id(user),
    }
    try:
        return refresh_event_status(StationEvent.model_validate(merged))
    except Exception as exc:
        raise ValueError(str(exc)) from exc


@router.get("/events", response_model=PromoterEventsListResponse)
async def list_promoter_events(
    current_user: User = Depends(get_current_promoter_user),
):
    try:
        items = _promoter_events(read_events(), current_user)
    except EventsStoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    return PromoterEventsListResponse(items=items)


@router.post("/events", response_model=StationEvent, status_code=status.HTTP_201_CREATED)
async def create_promoter_event(
    body: PromoterEventCreate,
    current_user: User = Depends(get_current_promoter_user),
):
    created_holder: dict[str, StationEvent] = {}

    def _create(all_items: list[StationEvent]) -> list[StationEvent]:
        event_id = next_event_id(all_items)
        try:
            event = _build_event(body, event_id=event_id, user=current_user)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc
        created_holder["event"] = event
        return [*all_items, event]

    try:
        mutate_events(_create)
    except EventsStoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    logger.info(
        "Promoter event submitted: user=%s event_id=%s",
        current_user.email,
        created_holder["event"].id,
    )
    return created_holder["event"]


@router.put("/events/{event_id}", response_model=StationEvent)
async def update_promoter_event(
    event_id: int,
    body: PromoterEventUpdate,
    current_user: User = Depends(get_current_promoter_user),
):
    updated_holder: dict[str, StationEvent] = {}

    def _update(all_items: list[StationEvent]) -> list[StationEvent]:
        existing = _find_owned(all_items, event_id, current_user)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        try:
            updated = _build_event(body, event_id=event_id, user=current_user, existing=existing)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc
        updated_holder["event"] = updated
        return [updated if e.id == event_id else e for e in all_items]

    try:
        mutate_events(_update)
    except EventsStoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    logger.info("Promoter event updated: user=%s event_id=%s", current_user.email, event_id)
    return updated_holder["event"]


@router.post("/upload-image", response_model=EventImageUploadResponse)
async def promoter_upload_event_image(
    image_file: UploadFile = File(...),
    _: User = Depends(get_current_promoter_user),
):
    effective_filename = (image_file.filename or "").strip() or "image.jpg"
    file_ext = Path(effective_filename).suffix.lower()
    if file_ext not in settings.get_allowed_extensions_list():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Use one of: {', '.join(settings.get_allowed_extensions_list())}",
        )
    try:
        content = await image_file.read()
        image_url = upload_station_event_bytes(content, effective_filename)
    except Exception as e:
        logger.exception("Promoter event image upload failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Upload failed. Try again or contact sales@newstarsradio.com.",
        ) from e
    return EventImageUploadResponse(image_url=image_url)
