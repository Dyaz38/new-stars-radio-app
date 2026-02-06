"""
Ad creative management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import shutil
from pathlib import Path

from app.core.database import get_db
from app.core.config import settings
from app.api.dependencies import get_current_user
from app.schemas.creative import CreativeCreate, CreativeUpdate, CreativeResponse
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.campaign import Campaign
from app.models.user import User

router = APIRouter()


def save_uploaded_file(file: UploadFile, campaign_id: UUID) -> str:
    """Save uploaded file and return relative path."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename: campaign_id_filename.ext
    file_ext = Path(file.filename).suffix
    filename = f"{campaign_id}_{file.filename}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
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
    
    # Save file (may fail on read-only filesystem e.g. some cloud hosts)
    try:
        image_path = save_uploaded_file(image_file, campaign_id)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File upload not available on this server. Use a creative with an image URL instead, or contact support."
        ) from e
    
    # Get image dimensions (simplified - in production use PIL/Pillow)
    # For now, use default banner dimensions
    image_width = 728
    image_height = 90
    
    # Build full URL
    image_url = f"/static/{image_path}"
    
    creative = AdCreative(
        campaign_id=campaign_id,
        name=name,
        image_url=image_url,
        image_width=image_width,
        image_height=image_height,
        click_url=click_url,
        alt_text=alt_text,
        status=CreativeStatus.ACTIVE
    )
    
    db.add(creative)
    db.commit()
    db.refresh(creative)
    
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
























