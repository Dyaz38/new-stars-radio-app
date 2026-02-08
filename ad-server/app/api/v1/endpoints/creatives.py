"""
Ad creative management endpoints.
"""
import logging
from pathlib import Path
import shutil
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

logger = logging.getLogger(__name__)

router = APIRouter()


def save_uploaded_file(file: UploadFile, campaign_id: UUID) -> str:
    """Save uploaded file and return relative path."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename: campaign_id_filename.ext
    filename = f"{campaign_id}_{file.filename}"
    file_path = upload_dir / filename

    try:
        # Ensure we have a readable file object (multipart stream)
        file_body = file.file
        if file_body is None:
            raise ValueError("Upload file has no body")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file_body, buffer)
    except Exception as e:
        logger.warning("Creative image save failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "File upload is not available on this server (e.g. read-only storage). "
                "Use a creative with an image URL instead, or contact support."
            ),
        ) from e

    # Return relative path for database storage
    return f"ads/{filename}"


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
    # Verify campaign exists
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    # Validate file
    if not image_file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    file_ext = Path(image_file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Save file (may fail on read-only filesystem e.g. Railway, Heroku)
    image_path = save_uploaded_file(image_file, campaign_id)

    # Get image dimensions (simplified - in production use PIL/Pillow)
    image_width = 728
    image_height = 90
    image_url = f"/static/{image_path}"

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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid data (e.g. campaign or constraint violation). Check campaign exists and try again.",
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
























