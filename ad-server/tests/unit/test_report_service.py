"""Unit tests for report share tokens (no database required)."""
from __future__ import annotations

from uuid import uuid4

from app.core.security import create_report_share_token, verify_report_share_token


def test_report_share_token_round_trip():
    campaign_id = str(uuid4())
    token = create_report_share_token(campaign_id, days_valid=7)
    payload = verify_report_share_token(token)
    assert payload["type"] == "report_share"
    assert payload["campaign_id"] == campaign_id


def test_invalid_share_token_rejected():
    import pytest
    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        verify_report_share_token("not-a-valid-token")
