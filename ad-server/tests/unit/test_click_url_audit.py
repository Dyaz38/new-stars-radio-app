"""Unit tests for click URL audit helpers."""
from app.maintenance.click_url_rules import is_placeholder_click_url


def test_example_com_is_placeholder():
    assert is_placeholder_click_url("https://example.com/starline-auto") is True


def test_real_client_url_is_ok():
    assert is_placeholder_click_url("https://www.toyota.com") is False


def test_mailto_is_ok():
    assert is_placeholder_click_url("mailto:sales@newstarsradio.com") is False
