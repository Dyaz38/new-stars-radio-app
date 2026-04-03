"""
Password rules aligned with NIST SP 800-63B (length, Unicode, no arbitrary composition rules)
and OWASP (reject trivial passwords, reject reuse on reset).
"""
from __future__ import annotations

import unicodedata
from typing import Optional

# Short blocklist of widely breached / trivial passwords (extend as needed)
_COMMON_WEAK = frozenset(
    {
        "password",
        "password1",
        "password123",
        "12345678",
        "123456789",
        "qwerty123",
        "admin123",
        "letmein",
        "welcome1",
        "changeme",
        "changeme123",
    }
)


def normalize_password_unicode(password: str) -> str:
    """NIST: normalize Unicode to NFKC before hashing or comparison."""
    return unicodedata.normalize("NFKC", password)


def validate_new_password(
    password: str,
    *,
    current_hash: Optional[str] = None,
) -> str:
    """
    Validates password policy; returns Unicode-normalized password for hashing.

    Raises ValueError with a safe, user-facing message if invalid.
    """
    if "\x00" in password:
        raise ValueError("Password cannot contain null characters.")

    normalized = normalize_password_unicode(password)

    if len(normalized) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if len(normalized) > 128:
        raise ValueError("Password must be at most 128 characters.")

    # Reject lines of only whitespace (after NFKC)
    if not normalized.strip():
        raise ValueError("Password cannot be only spaces.")

    lower = normalized.lower()
    if lower in _COMMON_WEAK:
        raise ValueError("This password is too common. Choose a stronger one.")

    # Reject trivial repeating characters only (e.g. "aaaaaaaa")
    if len(set(normalized)) == 1:
        raise ValueError("Choose a password with more variety.")

    if current_hash:
        from app.core.security import verify_password  # lazy: keeps unit tests import-light

        if verify_password(normalized, current_hash):
            raise ValueError("New password must be different from your current password.")

    return normalized
