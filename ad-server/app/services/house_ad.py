"""Serve static house promo when paid inventory is unavailable."""
from __future__ import annotations

from app.constants.house_ad import build_house_ad_payload
from app.schemas.ad_serving import AdResponse


def get_house_ad_response(placement: str) -> AdResponse:
    return AdResponse(**build_house_ad_payload(placement))
