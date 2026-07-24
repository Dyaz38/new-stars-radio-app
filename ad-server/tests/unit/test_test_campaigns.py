"""Unit tests for test campaign classification."""
from types import SimpleNamespace

from app.maintenance.test_campaigns import classify_test_campaign, is_protected_house_campaign


def _campaign(name: str, creatives=None):
    return SimpleNamespace(name=name, creatives=creatives or [])


def _creative(name: str, click_url: str):
    return SimpleNamespace(name=name, click_url=click_url)


def test_house_campaign_is_protected():
    campaign = _campaign("House Promo — Global")
    assert is_protected_house_campaign(campaign) is True
    is_test, reason = classify_test_campaign(campaign)
    assert is_test is False
    assert "house" in reason


def test_starline_campaign_is_test():
    campaign = _campaign("Starline Auto")
    is_test, reason = classify_test_campaign(campaign)
    assert is_test is True
    assert "starline" in reason.lower()


def test_example_com_click_url_is_test():
    campaign = _campaign(
        "Toyota",
        [_creative("Toyota Banner", "https://example.com/starline-auto")],
    )
    is_test, reason = classify_test_campaign(campaign)
    assert is_test is True
    assert "example.com" in reason


def test_real_client_campaign_is_not_test():
    campaign = _campaign(
        "Toyota",
        [_creative("Toyota Banner", "https://www.toyota.com")],
    )
    is_test, _ = classify_test_campaign(campaign)
    assert is_test is False
