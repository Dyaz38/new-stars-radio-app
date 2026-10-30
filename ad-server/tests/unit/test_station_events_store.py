from datetime import datetime, timezone

from app.schemas.events import StationEvent
from app.services.station_events_store import events_for_public_listeners, is_published_for_listeners


def _event(**kwargs) -> StationEvent:
    base = {
        "id": 1,
        "title": "Test",
        "date_label": "Soon",
        "location": "Venue",
        "starts_at": datetime(2099, 1, 1, 20, 0, tzinfo=timezone.utc),
    }
    base.update(kwargs)
    return StationEvent.model_validate(base)


def test_pending_review_hidden_from_listeners():
    pending = _event(review_status="pending_review")
    published = _event(id=2, review_status="published")
    assert is_published_for_listeners(published)
    assert not is_published_for_listeners(pending)
    visible = events_for_public_listeners([pending, published])
    assert len(visible) == 1
    assert visible[0].id == 2


def test_placeholder_image_cleared_but_event_kept():
    from app.services.station_events_store import _sanitize_events

    with_placeholder = _event(image_url="https://picsum.photos/200")
    cleaned = _sanitize_events([with_placeholder])
    assert len(cleaned) == 1
    assert cleaned[0].image_url is None
