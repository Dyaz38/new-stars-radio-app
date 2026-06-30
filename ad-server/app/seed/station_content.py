"""Default schedule and events for New Stars Radio (seed + API fallbacks)."""
from __future__ import annotations

from app.schemas.events import StationEvent
from app.schemas.schedule import ScheduleShow

NEW_STARS_SCHEDULE: list[ScheduleShow] = [
    ScheduleShow(
        id=1,
        time="12:00 AM - 5:00 AM",
        show="Overnight Stars Mix",
        dj="Auto DJ",
        description="Non-stop overnight rotation of rising Hip-Hop, R&B, and Smooth Jazz artists.",
        current=False,
    ),
    ScheduleShow(
        id=2,
        time="5:00 AM - 7:00 AM",
        show="Sunrise Smooth Jazz",
        dj="DJ Marcus",
        description="Ease into the day with mellow jazz and soulful instrumentals.",
        current=False,
    ),
    ScheduleShow(
        id=3,
        time="7:00 AM - 10:00 AM",
        show="Morning Hip-Hop Rise",
        dj="DJ Kaya",
        description="Fresh bars and beats from tomorrow's stars — news and community shout-outs.",
        current=False,
    ),
    ScheduleShow(
        id=4,
        time="10:00 AM - 2:00 PM",
        show="Midday R&B Flow",
        dj="DJ Lila",
        description="Midday grooves and new voices in R&B — perfect for work or the road.",
        current=False,
    ),
    ScheduleShow(
        id=5,
        time="2:00 PM - 6:00 PM",
        show="Afternoon Discovery",
        dj="New Stars Team",
        description="Deep cuts and debut tracks from unsigned artists we're breaking first.",
        current=False,
    ),
    ScheduleShow(
        id=6,
        time="6:00 PM - 9:00 PM",
        show="Drive Time Heat",
        dj="DJ Apex",
        description="Peak-hour energy — Hip-Hop and R&B anthems for the commute home.",
        current=False,
    ),
    ScheduleShow(
        id=7,
        time="9:00 PM - 12:00 AM",
        show="Late Night Lounge",
        dj="DJ Nova",
        description="Smooth Jazz and slow R&B to wind down the evening.",
        current=False,
    ),
]

NEW_STARS_EVENT_LOCATIONS: list[str] = [
    "Windhoek",
    "Cape Town",
    "Johannesburg",
    "Online Livestream",
]

NEW_STARS_EVENTS: list[StationEvent] = []
