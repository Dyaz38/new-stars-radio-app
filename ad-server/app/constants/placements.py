"""Ad placement slot sizes (IAB-style units)."""
from __future__ import annotations

# Preferred creative sizes per placement, in priority order (first = best fit).
PLACEMENT_SIZE_PREFERENCES: dict[str, list[tuple[int, int]]] = {
    "banner_top": [(728, 90), (320, 50)],
    "banner_bottom": [(728, 90), (320, 50)],
    # 728×90 scales down in the compact Events header; prefer 320×50 when both exist.
    "events_modal": [(320, 50), (728, 90)],
}

DEFAULT_PLACEMENT = "banner_top"

SIZE_TOLERANCE = 0.08


def size_matches(width: int, height: int, target_w: int, target_h: int) -> bool:
    """True when creative dimensions are within tolerance of a target size."""
    if target_w <= 0 or target_h <= 0:
        return False
    w_ok = abs(width - target_w) / target_w <= SIZE_TOLERANCE
    h_ok = abs(height - target_h) / target_h <= SIZE_TOLERANCE
    return w_ok and h_ok


def preferred_sizes_for_placement(placement: str) -> list[tuple[int, int]]:
    key = (placement or DEFAULT_PLACEMENT).strip().lower()
    return PLACEMENT_SIZE_PREFERENCES.get(key, PLACEMENT_SIZE_PREFERENCES[DEFAULT_PLACEMENT])


def creative_matches_placement(width: int, height: int, placement: str) -> bool:
    """True when a creative's dimensions fit the given ad placement."""
    return any(
        size_matches(width, height, target_w, target_h)
        for target_w, target_h in preferred_sizes_for_placement(placement)
    )
