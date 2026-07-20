"""Shared helpers for validating buffered image uploads."""
from __future__ import annotations

import io
from typing import Tuple

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.services.storage import read_upload_bytes, sanitize_upload_filename


async def buffer_image_upload(
    image_file: UploadFile,
    *,
    default_filename: str = "image.png",
) -> tuple[bytes, str, int, int]:
    """
    Read an uploaded image once, validate it, and return bytes + safe filename + dimensions.
    """
    try:
        content = await read_upload_bytes(image_file, settings.MAX_UPLOAD_SIZE)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    effective_filename = sanitize_upload_filename(image_file.filename or "", default_filename)
    file_ext = f".{effective_filename.rsplit('.', 1)[-1].lower()}" if "." in effective_filename else ".png"
    allowed = settings.get_allowed_extensions_list()
    if file_ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Use one of: {', '.join(allowed)}",
        )

    try:
        with Image.open(io.BytesIO(content)) as img:
            width, height = img.size
    except UnidentifiedImageError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read image dimensions. Upload a valid JPEG, PNG, GIF, or WebP file.",
        ) from e

    if width <= 0 or height <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image dimensions.",
        )

    return content, effective_filename, width, height
