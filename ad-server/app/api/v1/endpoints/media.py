"""
Public creative image delivery — avoids /ads/ URLs blocked by browser extensions.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.integrations.creative_media import load_image_from_url
from app.models.ad_creative import AdCreative

router = APIRouter()

_CACHE_CONTROL = "public, max-age=86400, immutable"


@router.get(
    "/i/{creative_id}",
    summary="Creative banner image",
    description="Proxies stored creative artwork through the API (ad-blocker safe path).",
    responses={
        200: {"content": {"image/png": {}, "image/jpeg": {}, "image/webp": {}}},
        404: {"description": "Creative or image not found"},
    },
)
async def get_creative_image(creative_id: UUID, db: Session = Depends(get_db)):
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(status_code=404, detail="Creative image not found")

    try:
        content, content_type = load_image_from_url(creative.image_url)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Creative image not found") from None
    except Exception:
        raise HTTPException(status_code=404, detail="Creative image not found") from None

    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": _CACHE_CONTROL},
    )
