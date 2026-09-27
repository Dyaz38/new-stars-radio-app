"""Schedule day groups shown as tabs in the listener app and admin panel."""
from __future__ import annotations

from typing import Literal

ScheduleDayKey = Literal["mon_thu", "fri", "sat", "sun"]

SCHEDULE_DAY_KEYS: tuple[ScheduleDayKey, ...] = ("mon_thu", "fri", "sat", "sun")

SCHEDULE_DAY_LABELS: dict[ScheduleDayKey, str] = {
    "mon_thu": "Monday – Thursday",
    "fri": "Friday",
    "sat": "Saturday",
    "sun": "Sunday",
}
