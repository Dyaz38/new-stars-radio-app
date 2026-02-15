"""
Ad creative management endpoints.
"""
import logging
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, status, UploadFile
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.creative import CreativeCreate, CreativeResponse, CreativeUpdate
from app.services.storage import upload_creative_image

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=CreativeResponse, status_code=status.HTTP_201_CREATED)
async def create_creative(
    campaign_id: UUID = Form(...),
    name: str = Form(...),
    click_url: str = Form(...),
    alt_text: Optional[str] = Form(None),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ad creative with image upload."""
    logger.info("create_creative: campaign_id=%s name=%r", campaign_id, name)

    # Verify campaign exists
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    # Validate file (allow missing filename for some clients; use default)
    effective_filename = (image_file.filename or "").strip() or "image.jpg"
    file_ext = Path(effective_filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        logger.warning("Creative create 400: file type not allowed filename=%r ext=%r", image_file.filename, file_ext)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Use one of: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Upload to R2 (if configured) or local disk
    try:
        image_url = upload_creative_image(image_file, campaign_id, effective_filename)
    except Exception as e:
        logger.warning("Creative image upload failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "File upload failed. If R2 is configured, check credentials. "
                "Otherwise use Image URL instead of file upload."
            ),
        ) from e

    # Get image dimensions (simplified - in production use PIL/Pillow)
    image_width = 728
    image_height = 90

    creative = AdCreative(
        campaign_id=campaign_id,
        name=name,
        image_url=image_url,
        image_width=image_width,
        image_height=image_height,
        click_url=click_url,
        alt_text=alt_text,
        status=CreativeStatus.ACTIVE,
    )
    db.add(creative)

    try:
        db.commit()
        db.refresh(creative)
    except IntegrityError as e:
        db.rollback()
        logger.warning("Creative create integrity error: %s", e)
        hint = "Duplicate name in campaign? Try a different creative name, or use Image URL instead of file upload."
        try:
            err_msg = str(e.orig) if hasattr(e, "orig") and e.orig else str(e)
            if "foreign key" in err_msg.lower() or "violates foreign key" in err_msg.lower():
                hint = "Campaign may no longer exist. Pick another campaign or refresh the page."
            elif "unique" in err_msg.lower() or "duplicate" in err_msg.lower():
                hint = "A creative with this name might already exist. Try a different name."
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=hint,
        ) from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Creative create database error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database temporarily unavailable. Please try again.",
        ) from e

    return creative


@router.post("/with-url", response_model=CreativeResponse, status_code=status.HTTP_201_CREATED)
async def create_creative_with_url(
    creative_data: CreativeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ad creative with image URL (no file upload)."""
    # Verify campaign exists
    campaign = db.query(Campaign).filter(Campaign.id == creative_data.campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    creative = AdCreative(
        campaign_id=creative_data.campaign_id,
        name=creative_data.name,
        image_url=creative_data.image_url,
        image_width=creative_data.image_width,
        image_height=creative_data.image_height,
        click_url=creative_data.click_url,
        alt_text=creative_data.alt_text,
        status=CreativeStatus.ACTIVE
    )
    
    db.add(creative)
    db.commit()
    db.refresh(creative)
    
    return creative


@router.get("", response_model=List[CreativeResponse])
async def list_creatives(
    campaign_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List ad creatives, optionally filtered by campaign."""
    query = db.query(AdCreative)
    
    if campaign_id:
        query = query.filter(AdCreative.campaign_id == campaign_id)
    
    creatives = query.offset(skip).limit(limit).all()
    return creatives


@router.get("/{creative_id}", response_model=CreativeResponse)
async def get_creative(
    creative_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific ad creative."""
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creative not found"
        )
    return creative


@router.put("/{creative_id}", response_model=CreativeResponse)
async def update_creative(
    creative_id: UUID,
    creative_data: CreativeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an ad creative."""
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creative not found"
        )
    
    update_data = creative_data.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        update_data["status"] = CreativeStatus(update_data["status"])
    
    for field, value in update_data.items():
        setattr(creative, field, value)
    
    db.commit()
    db.refresh(creative)
    
    return creative


@router.delete("/{creative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_creative(
    creative_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an ad creative."""
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creative not found"
        )
    
    db.delete(creative)
    db.commit()
    
    return None
























