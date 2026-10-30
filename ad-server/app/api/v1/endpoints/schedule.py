"""Radio schedule endpoints for app + admin panel."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_staff_user
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
from app.services.json_file_store import write_json_atomic

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_SCHEDULE_DAYS = ScheduleByDay(mon_thu=list(NEW_STARS_SCHEDULE))


def _schedule_file_path() -> Path:
    path = Path(settings.SCHEDULE_STORAGE_PATH)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _write_schedule(days: ScheduleByDay) -> None:
    write_json_atomic(_schedule_file_path(), {"days": days.model_dump()})


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


def _read_schedule(*, repair: bool = True) -> ScheduleByDay:
    path = _schedule_file_path()
    if not path.exists():
        if repair:
            _write_schedule(DEFAULT_SCHEDULE_DAYS)
        return DEFAULT_SCHEDULE_DAYS

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, dict) and "days" in raw:
            parsed = ScheduleResponse.model_validate(raw)
            return parsed.days
        legacy = _parse_legacy_items(raw) if isinstance(raw, dict) else None
        if legacy is not None:
            if repair:
                _write_schedule(legacy)
            return legacy
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Invalid schedule file detected (%s).", exc)
        if repair:
            bak = path.with_suffix(path.suffix + ".bak")
            try:
                path.replace(bak)
                logger.warning("Moved unreadable schedule to %s", bak)
            except Exception:
                logger.warning("Could not back up unreadable schedule at %s", path)
            _write_schedule(DEFAULT_SCHEDULE_DAYS)
            return DEFAULT_SCHEDULE_DAYS
        raise

    if repair:
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
    _: User = Depends(get_current_staff_user),
):
    _write_schedule(body.days)
    # Re-read without auto-repair so a parse glitch cannot overwrite the save with defaults.
    try:
        persisted = _read_schedule(repair=False)
    except Exception as exc:
        logger.exception("Schedule re-read failed after write: %s", exc)
        persisted = body.days
    count = len(persisted.all_items())
    logger.info(
        "radio schedule updated: items=%s path=%s fri=%s sat=%s sun=%s",
        count,
        _schedule_file_path(),
        len(persisted.fri),
        len(persisted.sat),
        len(persisted.sun),
    )
    return ScheduleUpdateResponse(updated_items=count, days=persisted)
