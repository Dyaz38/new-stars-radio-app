#!/usr/bin/env python3
"""Check production listener + ad API endpoints (no auth required)."""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

DEFAULT_LISTENER = "https://www.newstarsradio.com"
DEFAULT_API = "https://new-stars-radio-app-production.up.railway.app/api/v1"


def fetch_json(url: str, *, method: str = "GET", body: dict | None = None) -> tuple[int, dict | str]:
    data = None
    headers = {"Accept": "application/json", "User-Agent": "NewStarsRadio-Verify/1.0"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw[:200]
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw[:200]


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke-check production listener and ad server.")
    parser.add_argument("--listener", default=DEFAULT_LISTENER)
    parser.add_argument("--api", default=DEFAULT_API)
    args = parser.parse_args()

    ok = True

    status, body = fetch_json(f"{args.api.rstrip('/')}/health")
    print(f"API health: HTTP {status}")
    if status != 200:
        ok = False
        print(f"  {body}")

    status, body = fetch_json(f"{args.api.rstrip('/')}/stream/live-info")
    print(f"Now-playing proxy: HTTP {status}")
    if status != 200:
        ok = False
    elif isinstance(body, dict) and body.get("error"):
        print(f"  warning: {body.get('error')}")

    ad_body = {
        "user_id": "verify-script",
        "placement": "banner_top",
        "client_country": "NA",
    }
    status, body = fetch_json(f"{args.api.rstrip('/')}/ads/request", method="POST", body=ad_body)
    print(f"Top banner ad: HTTP {status}")
    if status != 200 or not isinstance(body, dict):
        ok = False
        print(f"  {body}")
    else:
        print(
            f"  {body.get('image_width')}×{body.get('image_height')} "
            f"house={body.get('is_house_ad', False)} "
            f"click={str(body.get('click_url', ''))[:60]}"
        )

    events_body = {**ad_body, "placement": "events_modal"}
    status, body = fetch_json(f"{args.api.rstrip('/')}/ads/request", method="POST", body=events_body)
    print(f"Events modal ad: HTTP {status}")
    if status != 200 or not isinstance(body, dict):
        ok = False
        print(f"  {body}")
    elif body.get("image_width") == 320 and body.get("image_height") == 50:
        print("  320×50 served (ideal)")
    else:
        print(
            f"  {body.get('image_width')}×{body.get('image_height')} "
            "(upload 320×50 creatives for best Events modal fit)"
        )

    try:
        with urllib.request.urlopen(args.listener.rstrip("/") + "/", timeout=20) as resp:
            html = resp.read(800).decode("utf-8", errors="replace")
            print(f"Listener home: HTTP {resp.status}")
            if "NEW STARS RADIO" not in html.upper() and "newstars" not in html.lower():
                print("  warning: title/branding not found in first 800 bytes")
    except Exception as e:
        ok = False
        print(f"Listener home failed: {e}")

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
