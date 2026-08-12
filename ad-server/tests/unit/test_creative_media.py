"""Tests for ad-blocker-safe creative media URLs and loading."""
from __future__ import annotations

import io
from pathlib import Path
from uuid import uuid4

import pytest
from PIL import Image

from app.integrations.creative_media import (
    creative_media_path,
    load_image_from_url,
    local_static_path,
    object_key_from_remote_url,
)


def test_creative_media_path_has_no_ads_segment():
    cid = uuid4()
    path = creative_media_path(cid)
    assert path == f"/api/v1/media/i/{cid}"
    assert "/ads/" not in path


def test_object_key_from_r2_url():
    url = "https://pub-example.r2.dev/ads/campaign_banner.png"
    assert object_key_from_remote_url(url) == "ads/campaign_banner.png"


def test_local_static_path_maps_promo():
    path = local_static_path("/static/promo/newstars-house-728x90.png")
    assert path == Path("static/promo/newstars-house-728x90.png")


def test_load_image_from_local_static(tmp_path, monkeypatch):
    promo_dir = tmp_path / "static" / "promo"
    promo_dir.mkdir(parents=True)
    img = Image.new("RGB", (728, 90), color=(120, 40, 180))
    file_path = promo_dir / "sample.png"
    img.save(file_path, format="PNG")
    monkeypatch.chdir(tmp_path)

    data, content_type = load_image_from_url("/static/promo/sample.png")
    assert content_type == "image/png"
    assert len(data) > 100
