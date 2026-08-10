"""Unit tests for Icecast / Airtime metadata parsing helpers."""
from __future__ import annotations

from app.integrations.stream_metadata import (
    live_info_from_track_title,
    parse_icy_metadata_block,
    parse_listeners_from_status_html,
    parse_listeners_from_status_json,
    parse_live_info_from_status_json,
    pick_icecast_source,
)


def test_parse_listeners_from_status_json_single_source():
    payload = {
        "icestats": {
            "source": {
                "listenurl": "http://host:8000/newstarsradio_a",
                "listeners": 7,
                "title": "Artist - Song",
            }
        }
    }
    assert parse_listeners_from_status_json(payload, "/newstarsradio_a") == 7


def test_parse_listeners_from_status_json_array():
    payload = {
        "icestats": {
            "source": [
                {"listenurl": "http://host:8000/other", "listeners": 1},
                {"listenurl": "http://host:8000/newstarsradio_a", "listeners": 42},
            ]
        }
    }
    assert parse_listeners_from_status_json(payload, "/newstarsradio_a") == 42


def test_parse_live_info_from_status_json():
    payload = {
        "icestats": {
            "source": {
                "listenurl": "http://host/newstarsradio_a",
                "title": "Drake - God's Plan",
                "genre": "Hip-Hop",
            }
        }
    }
    info = parse_live_info_from_status_json(payload, "/newstarsradio_a")
    assert info is not None
    assert info["current"]["metadata"]["artist_name"] == "Drake"
    assert info["current"]["metadata"]["track_title"] == "God's Plan"
    assert info["current"]["metadata"]["genre"] == "Hip-Hop"


def test_parse_listeners_from_status_html_legacy_format():
    html = """
    <h3>Mount Point /newstarsradio_a</h3>
    <tr><td>Current Listeners:</td><td class="streamdata">15</td></tr>
    """
    assert parse_listeners_from_status_html(html, "/newstarsradio_a") == 15


def test_parse_icy_metadata_block():
    raw = b"StreamTitle='Alicia Keys - Fallin';StreamUrl='';"
    assert parse_icy_metadata_block(raw) == "Alicia Keys - Fallin"


def test_live_info_from_track_title_splits_artist():
    info = live_info_from_track_title("Burna Boy - Last Last")
    assert info["current"]["metadata"]["artist_name"] == "Burna Boy"
    assert info["current"]["metadata"]["track_title"] == "Last Last"


def test_pick_icecast_source_prefers_mount():
    payload = {
        "icestats": {
            "source": [
                {"listenurl": "http://x/other", "listeners": 1},
                {"listenurl": "http://x/newstarsradio_a", "listeners": 9},
            ]
        }
    }
    source = pick_icecast_source(payload, "/newstarsradio_a")
    assert source is not None
    assert source["listeners"] == 9
