"""Unit tests for banner resize helper."""
from PIL import Image

from app.maintenance.banner_resize import resize_banner_cover


def _make_png(width: int, height: int) -> bytes:
    img = Image.new("RGB", (width, height), color=(10, 20, 30))
    from io import BytesIO

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_resize_banner_cover_outputs_exact_mobile_size():
    content = _make_png(728, 90)
    out, name = resize_banner_cover(content, 320, 50)
    assert name == "banner-320x50.png"
    with Image.open(__import__("io").BytesIO(out)) as img:
        assert img.size == (320, 50)
