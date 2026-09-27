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
    ScheduleByDay,
    ScheduleResponse,
    ScheduleShow,
    ScheduleUpdateRequest,
    ScheduleUpdateResponse,
)
from app.seed.station_content import NEW_STARS_SCHEDULE

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_SCHEDULE_DAYS = ScheduleByDay(mon_thu=list(NEW_STARS_SCHEDULE))


def _schedule_file_path() -> Path:
    path = Path(settings.SCHEDULE_STORAGE_PATH)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _write_schedule(days: ScheduleByDay) -> None:
    path = _schedule_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"days": days.model_dump()}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _parse_legacy_items(raw: dict) -> ScheduleByDay | None:
    items_raw = raw.get("items")
    if not isinstance(items_raw, list):
        return None
    items: list[ScheduleShow] = []
    for row in items_raw:
        try:
            items.append(ScheduleShow.model_validate(row))
        except Exception:
            continue
    if not items:
        return None
    return ScheduleByDay(mon_thu=items)


def _read_schedule() -> ScheduleByDay:
    path = _schedule_file_path()
    if not path.exists():
        _write_schedule(DEFAULT_SCHEDULE_DAYS)
        return DEFAULT_SCHEDULE_DAYS

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, dict) and "days" in raw:
            parsed = ScheduleResponse.model_validate(raw)
            return parsed.days
        legacy = _parse_legacy_items(raw) if isinstance(raw, dict) else None
        if legacy is not None:
            _write_schedule(legacy)
            return legacy
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Invalid schedule file detected (%s). Resetting to defaults.", exc)

    _write_schedule(DEFAULT_SCHEDULE_DAYS)
    return DEFAULT_SCHEDULE_DAYS


@router.get(
    "/",
    response_model=ScheduleResponse,
    summary="Get public radio schedule",
)
async def get_schedule():
    return ScheduleResponse(days=_read_schedule())


@router.put(
    "/",
    response_model=ScheduleUpdateResponse,
    summary="Update radio schedule (admin)",
)
async def update_schedule(
    body: ScheduleUpdateRequest,
    _: User = Depends(get_current_user),
):
    _write_schedule(body.days)
    count = len(body.days.all_items())
    logger.info("radio schedule updated: items=%s", count)
    return ScheduleUpdateResponse(updated_items=count, days=body.days)
