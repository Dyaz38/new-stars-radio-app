"""Tests for buffered image upload helpers."""
from __future__ import annotations

import io

import pytest
from fastapi import UploadFile
from PIL import Image

from app.services.image_upload import buffer_image_upload
from app.services.storage import public_url_for_object_key, sanitize_upload_filename, upload_creative_bytes
from uuid import uuid4


def _png_upload(width: int = 728, height: int = 90, filename: str = "banner.png") -> UploadFile:
    img = Image.new("RGB", (width, height), color="red")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return UploadFile(file=buf, filename=filename)


@pytest.mark.asyncio
async def test_buffer_image_upload_reads_dimensions_before_stream_is_consumed():
    upload = _png_upload(320, 50, "mobile.png")
    content, filename, width, height = await buffer_image_upload(upload)
    assert filename == "mobile.png"
    assert width == 320
    assert height == 50
    assert len(content) > 0


def test_sanitize_upload_filename_strips_unsafe_chars():
    assert sanitize_upload_filename("../../evil name.PNG") == "evil-name.png"
    assert sanitize_upload_filename("nsr ad 728x90 partner sample.png") == "nsr-ad-728x90-partner-sample.png"


def test_public_url_for_object_key_encodes_spaces(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "R2_PUBLIC_URL", "https://pub-example.r2.dev")
    url = public_url_for_object_key("ads/campaign_nsr ad.png")
    assert url == "https://pub-example.r2.dev/ads/campaign_nsr%20ad.png"
    assert " " not in url


def test_upload_creative_bytes_writes_local_file(tmp_path, monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "R2_ACCOUNT_ID", None)
    monkeypatch.setattr(config.settings, "UPLOAD_DIR", str(tmp_path / "ads"))

    img = Image.new("RGB", (728, 90), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    campaign_id = uuid4()

    url = upload_creative_bytes(buf.getvalue(), campaign_id, "starline.png")
    assert url.startswith("/static/ads/")
    saved = tmp_path / "ads" / url.split("/")[-1]
    assert saved.exists()
    with Image.open(saved) as loaded:
        assert loaded.size == (728, 90)
