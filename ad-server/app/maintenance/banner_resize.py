"""Resize banner art without pulling in the full services package."""
from __future__ import annotations

import io

from PIL import Image, UnidentifiedImageError


def resize_banner_cover(content: bytes, target_w: int, target_h: int) -> tuple[bytes, str]:
    """Scale and center-crop image bytes to exact target dimensions (PNG output)."""
    try:
        with Image.open(io.BytesIO(content)) as img:
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA" if "A" in img.mode else "RGB")

            src_w, src_h = img.size
            if src_w <= 0 or src_h <= 0:
                raise ValueError("Invalid source dimensions")

            scale = max(target_w / src_w, target_h / src_h)
            new_w = max(target_w, int(src_w * scale))
            new_h = max(target_h, int(src_h * scale))
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            left = max(0, (new_w - target_w) // 2)
            top = max(0, (new_h - target_h) // 2)
            cropped = resized.crop((left, top, left + target_w, top + target_h))

            if cropped.mode == "RGBA":
                background = Image.new("RGB", (target_w, target_h), (255, 255, 255))
                background.paste(cropped, mask=cropped.split()[3])
                cropped = background
            elif cropped.mode != "RGB":
                cropped = cropped.convert("RGB")

            out = io.BytesIO()
            cropped.save(out, format="PNG", optimize=True)
            return out.getvalue(), f"banner-{target_w}x{target_h}.png"
    except UnidentifiedImageError as e:
        raise ValueError("Could not read image for resize") from e
