"""Unit tests for house ad fallback payloads."""
from app.constants.house_ad import build_house_ad_payload, house_image_url_for_placement
from app.schemas.ad_serving import AdResponse


class TestHouseAd:
    def test_events_modal_uses_mobile_banner(self):
        url, w, h = house_image_url_for_placement("events_modal")
        assert (w, h) == (320, 50)
        assert "320x50" in url

    def test_banner_top_uses_desktop_first(self):
        url, w, h = house_image_url_for_placement("banner_top")
        assert (w, h) == (728, 90)
        assert "728x90" in url

    def test_build_payload_marks_house_ad(self):
        payload = build_house_ad_payload("events_modal")
        assert payload["is_house_ad"] is True
        assert payload["image_width"] == 320
        assert payload["click_url"].startswith("mailto:")

    def test_ad_response_accepts_house_payload(self):
        response = AdResponse(**build_house_ad_payload("events_modal"))
        assert response.is_house_ad is True
        assert response.image_height == 50
