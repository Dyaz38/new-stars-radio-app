"""Unit tests for placement size matching."""
from app.constants.placements import (
    creative_matches_placement,
    preferred_sizes_for_placement,
    size_matches,
)


class TestPlacementSizes:
    def test_size_matches_exact(self):
        assert size_matches(320, 50, 320, 50) is True
        assert size_matches(728, 90, 728, 90) is True

    def test_size_matches_within_tolerance(self):
        assert size_matches(324, 51, 320, 50) is True

    def test_size_matches_rejects_wrong_aspect(self):
        assert size_matches(300, 250, 320, 50) is False

    def test_events_modal_accepts_mobile_banner_only(self):
        assert creative_matches_placement(320, 50, "events_modal") is True
        assert creative_matches_placement(728, 90, "events_modal") is False

    def test_banner_top_accepts_main_sizes(self):
        assert creative_matches_placement(728, 90, "banner_top") is True
        assert creative_matches_placement(320, 50, "banner_top") is True
        assert creative_matches_placement(300, 250, "banner_top") is False

    def test_unknown_placement_falls_back_to_banner_top_sizes(self):
        assert preferred_sizes_for_placement("unknown_slot") == preferred_sizes_for_placement("banner_top")
