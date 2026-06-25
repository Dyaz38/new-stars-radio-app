"""Generate default house ad banners for starter campaigns."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "static" / "ads"


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _draw_gradient(img: Image.Image, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> None:
    width, height = img.size
    draw = ImageDraw.Draw(img)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)


def render_banner(width: int, height: int, headline: str, subline: str) -> Image.Image:
    img = Image.new("RGB", (width, height))
    _draw_gradient(img, (88, 28, 135), (219, 39, 119))
    draw = ImageDraw.Draw(img)

    headline_size = 18 if width <= 320 else 28
    sub_size = 11 if width <= 320 else 16
    headline_font = _font(headline_size, bold=True)
    sub_font = _font(sub_size)

    headline_bbox = draw.textbbox((0, 0), headline, font=headline_font)
    sub_bbox = draw.textbbox((0, 0), subline, font=sub_font)
    headline_w = headline_bbox[2] - headline_bbox[0]
    headline_h = headline_bbox[3] - headline_bbox[1]
    sub_w = sub_bbox[2] - sub_bbox[0]
    sub_h = sub_bbox[3] - sub_bbox[1]
    gap = 4 if height <= 50 else 6
    total_h = headline_h + gap + sub_h
    y = (height - total_h) // 2

    draw.text(((width - headline_w) // 2, y), headline, fill=(255, 255, 255), font=headline_font)
    draw.text(((width - sub_w) // 2, y + headline_h + gap), subline, fill=(252, 231, 243), font=sub_font)
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    specs = [
        (320, 50, "newstars-house-320x50.png", "NEW STARS RADIO", "Advertise here"),
        (728, 90, "newstars-house-728x90.png", "NEW STARS RADIO", "Tomorrow's Stars, Today • Advertise With Us"),
    ]
    for width, height, filename, headline, subline in specs:
        path = OUT_DIR / filename
        render_banner(width, height, headline, subline).save(path, format="PNG", optimize=True)
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
