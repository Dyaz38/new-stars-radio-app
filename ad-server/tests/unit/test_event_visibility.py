from datetime import datetime, timezone

from app.schemas.events import StationEvent
from app.services.event_visibility import is_event_ended, refresh_event_status, visible_to_listeners


def _event(**kwargs) -> StationEvent:
    base = dict(
        id=1,
        title="Show",
        date_label="Sat 8 PM",
        location="Windhoek",
    )
    base.update(kwargs)
    return StationEvent(**base)


def test_is_event_ended_uses_end_time():
    ev = _event(
        starts_at=datetime(2020, 1, 1, 18, tzinfo=timezone.utc),
        ends_at=datetime(2020, 1, 1, 20, tzinfo=timezone.utc),
        status="upcoming",
    )
    assert is_event_ended(ev, datetime(2020, 1, 1, 21, tzinfo=timezone.utc))
    assert not is_event_ended(ev, datetime(2020, 1, 1, 19, tzinfo=timezone.utc))


def test_refresh_status_marks_live_and_past():
    ev = _event(
        starts_at=datetime(2020, 1, 1, 18, tzinfo=timezone.utc),
        ends_at=datetime(2020, 1, 1, 20, tzinfo=timezone.utc),
    )
    live = refresh_event_status(ev, datetime(2020, 1, 1, 19, tzinfo=timezone.utc))
    assert live.status == "live"
    past = refresh_event_status(ev, datetime(2020, 1, 1, 21, tzinfo=timezone.utc))
    assert past.status == "past"
    assert not visible_to_listeners(past)
