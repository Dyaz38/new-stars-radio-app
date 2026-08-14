"""Generate station logo variants from the master horizontal logo."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "app" / "public"
SOURCE = PUBLIC / "station-logo-source.png"
FALLBACK_SOURCE = PUBLIC / "station-logo.png"

# Brand purple (matches sticky bar / theme)
BRAND_PURPLE = (59, 7, 100, 255)  # #3b0764
BLACK_THRESHOLD = 28

# How much of the square the star fills (higher = more visible on home screens)
FILL_ANY = 0.92
FILL_MASKABLE = 0.78  # ~80% Android safe zone, kept bold


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
    """Crop the left star mark (exclude wordmark on the right)."""
    width, height = img.size
    crop_width = min(int(height * 0.98), int(width * 0.48))
    cropped = img.crop((0, 0, crop_width, height))
    bbox = cropped.getbbox()
    if bbox:
        cropped = cropped.crop(bbox)
    return cropped


def fit_on_square(
    img: Image.Image,
    size: int,
    *,
    background: tuple[int, int, int, int],
    fill_ratio: float,
) -> Image.Image:
    """Paste artwork centered on a full-bleed square (edge-to-edge background)."""
    canvas = Image.new("RGBA", (size, size), background)
    max_dim = size * fill_ratio
    scale = min(max_dim / img.width, max_dim / img.height)
    new_w = max(1, int(img.width * scale))
    new_h = max(1, int(img.height * scale))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    offset = ((size - new_w) // 2, (size - new_h) // 2)
    canvas.paste(resized, offset, resized)
    return canvas


def main() -> None:
    source_path = SOURCE if SOURCE.exists() else FALLBACK_SOURCE
    if not source_path.exists():
        raise SystemExit(f"Missing source logo: {SOURCE}")

    master = Image.open(source_path)
    transparent = remove_black_background(master)

    # Full horizontal logo for in-app header (transparent bg)
    transparent.save(PUBLIC / "station-logo.png", optimize=True)

    star = crop_star_mark(transparent)
    bg = (*BRAND_PURPLE[:3], 255)

    sizes = {
        "station-icon-192.png": 192,
        "station-icon-512.png": 512,
        "apple-touch-icon.png": 180,
        "favicon-32.png": 32,
        "favicon-48.png": 48,
    }

    for filename, size in sizes.items():
        fill = 0.88 if size <= 48 else FILL_ANY
        icon = fit_on_square(star, size, background=bg, fill_ratio=fill)
        icon.save(PUBLIC / filename, optimize=True)

    # Maskable PWA icons — full-bleed purple, bold star in safe zone
    for filename, size in (
        ("station-icon-maskable-512.png", 512),
        ("station-icon-maskable-192.png", 192),
    ):
        maskable = fit_on_square(star, size, background=bg, fill_ratio=FILL_MASKABLE)
        maskable.save(PUBLIC / filename, optimize=True)

    print("Generated station logo assets in", PUBLIC)


if __name__ == "__main__":
    main()
