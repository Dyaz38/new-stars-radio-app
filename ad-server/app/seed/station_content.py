"""Default schedule and events for New Stars Radio (seed + API fallbacks)."""
from __future__ import annotations

from app.schemas.events import StationEvent
from app.schemas.schedule import ScheduleShow

NEW_STARS_SCHEDULE: list[ScheduleShow] = [
    ScheduleShow(
        id=1,
        time="12:00 AM - 5:00 AM",
        show="Overnight Stars Mix",
        dj="Automated Programme",
        description="Non-stop overnight rotation of rising Hip-Hop and R&B artists.",
        current=False,
    ),
    ScheduleShow(
        id=2,
        time="5:00 AM - 7:00 AM",
        show="Sunrise R&B Warmup",
        dj="Automated Programme",
        description="Easy morning R&B and mellow Hip-Hop from rising artists — a soft start before the day builds.",
        current=False,
    ),
    ScheduleShow(
        id=3,
        time="7:00 AM - 10:00 AM",
        show="Morning Hip-Hop Rise",
        dj="Automated Programme",
        description="Fresh bars and beats from tomorrow's stars — high-energy Hip-Hop focused on new voices.",
        current=False,
    ),
    ScheduleShow(
        id=4,
        time="10:00 AM - 2:00 PM",
        show="Midday R&B Flow",
        dj="Automated Programme",
        description="Midday grooves and newer R&B cuts for work, study, or the road.",
        current=False,
    ),
    ScheduleShow(
        id=5,
        time="2:00 PM - 6:00 PM",
        show="Afternoon Discovery",
        dj="Automated Programme",
        description="Deep cuts and debut tracks from unsigned artists we're breaking first.",
        current=False,
    ),
    ScheduleShow(
        id=6,
        time="6:00 PM - 9:00 PM",
        show="Drive Time Heat",
        dj="Automated Programme",
        description="Peak-hour Hip-Hop and R&B energy for the commute home.",
        current=False,
    ),
    ScheduleShow(
        id=7,
        time="9:00 PM - 12:00 AM",
        show="Late Night Lounge",
        dj="Automated Programme",
        description="Slow R&B and mellow late-night Hip-Hop to wind down.",
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
