"""Resolve listener country (and optional city/region) from request IP."""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

import httpx
from fastapi import Request

logger = logging.getLogger(__name__)

# ISO 3166-1 alpha-2
_COUNTRY_RE = re.compile(r"^[A-Z]{2}$")
_PRIVATE_IP_PREFIXES = (
    "127.",
    "10.",
    "192.168.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.2",
    "172.30.",
    "172.31.",
    "::1",
    "fc00:",
    "fe80:",
)


@dataclass(frozen=True)
class GeoLocation:
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    source: str = "none"  # header | ip-api | none


def get_client_ip(request: Request) -> Optional[str]:
    """Best-effort client IP behind proxies (Vercel, Cloudflare, Railway)."""
    for header in (
        "CF-Connecting-IP",
        "True-Client-IP",
        "X-Real-IP",
    ):
        value = request.headers.get(header)
        if value:
            ip = value.split(",")[0].strip()
            if ip:
                return ip

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        if ip:
            return ip

    if request.client and request.client.host:
        return request.client.host
    return None


def _normalize_country(code: Optional[str]) -> Optional[str]:
    if not code:
        return None
    c = code.strip().upper()
    if len(c) == 2 and _COUNTRY_RE.match(c):
        return c
    return None


def _country_from_headers(request: Request) -> Optional[str]:
    """CDN / edge often set country without a separate IP lookup."""
    for header in (
        "CF-IPCountry",
        "X-Vercel-IP-Country",
        "CloudFront-Viewer-Country",
    ):
        raw = request.headers.get(header)
        if not raw or raw.strip().upper() in ("XX", "T1", "UNKNOWN"):
            continue
        normalized = _normalize_country(raw)
        if normalized:
            return normalized
    return None


def _is_public_ip(ip: str) -> bool:
    if not ip or ip == "unknown":
        return False
    if ip.startswith(_PRIVATE_IP_PREFIXES):
        return False
    return True


async def lookup_geo_from_ip(ip: str) -> GeoLocation:
    """
    Free tier ip-api.com (non-commercial). Fails open to country=None.
    """
    if not _is_public_ip(ip):
        return GeoLocation(source="none")

    url = f"http://ip-api.com/json/{ip}?fields=status,countryCode,city,regionName"
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        logger.warning("GeoIP lookup failed for %s: %s", ip, exc)
        return GeoLocation(source="none")

    if data.get("status") != "success":
        return GeoLocation(source="none")

    return GeoLocation(
        country=_normalize_country(data.get("countryCode")),
        city=(data.get("city") or "").strip() or None,
        state=(data.get("regionName") or "").strip() or None,
        source="ip-api",
    )


async def resolve_request_geo(request: Request) -> GeoLocation:
    """Country/city/state for ad targeting from edge headers or IP lookup."""
    header_country = _country_from_headers(request)
    if header_country:
        return GeoLocation(country=header_country, source="header")

    ip = get_client_ip(request)
    if ip:
        geo = await lookup_geo_from_ip(ip)
        if geo.country:
            return geo

    return GeoLocation(source="none")


def merge_geo_with_client(
    server: GeoLocation,
    client_country: Optional[str],
    client_city: Optional[str],
    client_state: Optional[str],
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Server IP/geo wins for country (anti-spoofing). Client may supplement city/state.
    """
    country = server.country or _normalize_country(client_country)
    city = client_city.strip() if client_city and client_city.strip() else server.city
    state = client_state.strip() if client_state and client_state.strip() else server.state
    return country, city, state
