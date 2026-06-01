"""Ad placement slot sizes (IAB-style units)."""

from typing import Optional

# Preferred creative sizes per placement, in priority order.
PLACEMENT_SIZE_PREFERENCES: dict[str, list[tuple[int, int]]] = {
    "events_modal": [(300, 250), (320, 50)],
    "banner_top": [(320, 50), (728, 90)],
    "banner_bottom": [(320, 50), (728, 90)],
}

SIZE_TOLERANCE = 0.08


def size_matches(width: int, height: int, target_w: int, target_h: int) -> bool:
    if target_w <= 0 or target_h <= 0:
        return False
    w_ok = abs(width - target_w) / target_w <= SIZE_TOLERANCE
    h_ok = abs(height - target_h) / target_h <= SIZE_TOLERANCE
    return w_ok and h_ok


def preferred_sizes_for_placement(placement: str) -> Optional[list[tuple[int, int]]]:
    return PLACEMENT_SIZE_PREFERENCES.get(placement.strip().lower())
