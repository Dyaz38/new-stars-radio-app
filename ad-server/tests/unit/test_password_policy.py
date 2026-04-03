"""Password policy (NIST-aligned) unit tests."""

import pytest

from app.core.password_policy import normalize_password_unicode, validate_new_password


def test_rejects_common_passwords():
    with pytest.raises(ValueError, match="too common"):
        validate_new_password("password")


def test_rejects_short_password():
    with pytest.raises(ValueError, match="at least 8"):
        validate_new_password("short")


def test_rejects_null_byte():
    with pytest.raises(ValueError, match="null"):
        validate_new_password("bad\x00pass")


def test_rejects_single_repeated_char():
    with pytest.raises(ValueError, match="variety"):
        validate_new_password("aaaaaaaa")


def test_accepts_strong_password_without_current_hash():
    out = validate_new_password("My-unique-phrase-99!")
    assert len(out) >= 8
    assert normalize_password_unicode("café") == normalize_password_unicode("café")
