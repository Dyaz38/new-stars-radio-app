"""Radio schedule endpoints for app + admin panel."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.schedule import (
    ScheduleResponse,
    ScheduleShow,
    ScheduleUpdateRequest,
    ScheduleUpdateResponse,
)
from app.seed.station_content import NEW_STARS_SCHEDULE

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_SCHEDULE: list[ScheduleShow] = NEW_STARS_SCHEDULE


def _schedule_file_path() -> Path:
    path = Path(settings.SCHEDULE_STORAGE_PATH)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _write_schedule(items: list[ScheduleShow]) -> None:
    path = _schedule_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"items": [item.model_dump() for item in items]}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _read_schedule() -> list[ScheduleShow]:
    path = _schedule_file_path()
    if not path.exists():
        _write_schedule(DEFAULT_SCHEDULE)
        return DEFAULT_SCHEDULE

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        parsed = ScheduleResponse.model_validate(raw)
        return parsed.items
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Invalid schedule file detected (%s). Resetting to defaults.", exc)
        _write_schedule(DEFAULT_SCHEDULE)
        return DEFAULT_SCHEDULE


@router.get(
    "/",
    response_model=ScheduleResponse,
    summary="Get public radio schedule",
)
async def get_schedule():
    return ScheduleResponse(items=_read_schedule())


@router.put(
    "/",
    response_model=ScheduleUpdateResponse,
    summary="Update radio schedule (admin)",
)
async def update_schedule(
    body: ScheduleUpdateRequest,
    _: User = Depends(get_current_user),
):
    _write_schedule(body.items)
    logger.info("radio schedule updated: items=%s", len(body.items))
    return ScheduleUpdateResponse(updated_items=len(body.items), items=body.items)
