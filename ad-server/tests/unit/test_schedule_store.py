from pathlib import Path

from app.api.v1.endpoints import schedule as sch
from app.schemas.schedule import ScheduleByDay, ScheduleShow


def _days_with_weekend() -> ScheduleByDay:
    return ScheduleByDay(
        mon_thu=[
            ScheduleShow(
                id=1,
                time="12:00 AM - 5:00 AM",
                show="Overnight",
                dj="Automated Programme",
                description="Night mix",
            )
        ],
        fri=[
            ScheduleShow(
                id=2,
                time="12:00 AM - 5:00 AM",
                show="Friday Night",
                dj="Automated Programme",
                description="Weekend",
            )
        ],
        sat=[],
        sun=[],
    )


def test_schedule_write_roundtrip(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(sch.settings, "SCHEDULE_STORAGE_PATH", str(tmp_path / "radio_schedule.json"))
    days = _days_with_weekend()
    sch._write_schedule(days)
    loaded = sch._read_schedule(repair=False)
    assert len(loaded.fri) == 1
    assert loaded.fri[0].show == "Friday Night"


def test_schedule_reread_without_repair_does_not_clobber(tmp_path: Path, monkeypatch):
    path = tmp_path / "radio_schedule.json"
    monkeypatch.setattr(sch.settings, "SCHEDULE_STORAGE_PATH", str(path))
    sch._write_schedule(_days_with_weekend())
    path.write_text("{ not-json", encoding="utf-8")
    try:
        sch._read_schedule(repair=False)
        assert False, "expected parse failure"
    except Exception:
        pass
    # Corrupt file must still be present (not replaced by defaults).
    assert path.read_text(encoding="utf-8") == "{ not-json"
