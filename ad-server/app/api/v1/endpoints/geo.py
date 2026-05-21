"""Public geo hint for the listener app (derived from request IP)."""
from fastapi import APIRouter, Request

from app.services.geoip import resolve_request_geo

router = APIRouter()


@router.get(
    "/",
    summary="Detect country from client IP",
    description="Used by the radio app for ad targeting. Country comes from CDN headers or IP lookup.",
)
async def get_listener_geo(request: Request):
    geo = await resolve_request_geo(request)
    return {
        "country": geo.country,
        "city": geo.city,
        "state": geo.state,
        "source": geo.source,
    }
