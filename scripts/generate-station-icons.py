"""Generate station logo variants from the master horizontal logo."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "app" / "public"
SOURCE = PUBLIC / "station-logo.png"

# Brand purple (matches sticky bar / theme)
BRAND_PURPLE = (59, 7, 100, 255)  # #3b0764
BLACK_THRESHOLD = 28


def remove_black_background(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r <= BLACK_THRESHOLD and g <= BLACK_THRESHOLD and b <= BLACK_THRESHOLD:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def crop_star_mark(img: Image.Image) -> Image.Image:
    """Crop the left star portion (exclude wordmark on the right)."""
    width, height = img.size
    crop_width = int(height * 0.92)
    crop_width = min(crop_width, int(width * 0.52))
    return img.crop((0, 0, crop_width, height))


def fit_on_square(img: Image.Image, size: int, *, background: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    scale = min(size * 0.82 / img.width, size * 0.82 / img.height)
    new_w = max(1, int(img.width * scale))
    new_h = max(1, int(img.height * scale))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    offset = ((size - new_w) // 2, (size - new_h) // 2)
    canvas.paste(resized, offset, resized)
    return canvas


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source logo: {SOURCE}")

    master = Image.open(SOURCE)
    transparent = remove_black_background(master)

    # Full horizontal logo for in-app header (transparent bg)
    transparent.save(PUBLIC / "station-logo.png", optimize=True)

    star = crop_star_mark(transparent)

    sizes = {
        "station-icon-192.png": 192,
        "station-icon-512.png": 512,
        "apple-touch-icon.png": 180,
        "favicon-32.png": 32,
        "favicon-48.png": 48,
    }

    for filename, size in sizes.items():
        icon = fit_on_square(star, size, background=(*BRAND_PURPLE[:3], 255))
        icon.save(PUBLIC / filename, optimize=True)

    # Maskable PWA icon — extra padding for Android safe zone (~80%)
    maskable = fit_on_square(star, 512, background=(*BRAND_PURPLE[:3], 255))
    inner = fit_on_square(star, 410, background=(*BRAND_PURPLE[:3], 255))
    maskable.paste(inner, ((512 - 410) // 2, (512 - 410) // 2), inner)
    maskable.save(PUBLIC / "station-icon-maskable-512.png", optimize=True)

    print("Generated station logo assets in", PUBLIC)


if __name__ == "__main__":
    main()
