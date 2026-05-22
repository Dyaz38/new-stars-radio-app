"""Geographic filtering for station events (mirrors ad campaign rules)."""
from __future__ import annotations

from typing import Optional

from app.schemas.events import StationEvent


def filter_events_for_country(
    events: list[StationEvent],
    country: Optional[str],
) -> list[StationEvent]:
    """
    - Event with no country_code: worldwide (any detected country).
    - Event with country_code: only listeners in that ISO country.
    - Unknown listener country: only worldwide events (no country_code).
    """
    if not country:
        return [e for e in events if not _event_country(e)]

    code = country.strip().upper()
    return [
        e
        for e in events
        if not _event_country(e) or _event_country(e) == code
    ]


def _event_country(event: StationEvent) -> Optional[str]:
    if not event.country_code:
        return None
    return event.country_code.strip().upper() or None
