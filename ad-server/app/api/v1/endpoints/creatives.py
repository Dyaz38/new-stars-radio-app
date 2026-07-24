"""
Ad creative management endpoints.
"""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, status, UploadFile
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.campaign import Campaign, CampaignStatus
from app.models.user import User
from app.schemas.creative import CreativeCreate, CreativeResponse, CreativeUpdate
from app.maintenance.click_url_audit import audit_active_creative_click_urls
from app.maintenance.click_url_rules import is_placeholder_click_url
from app.maintenance.generate_mobile_banners import generate_missing_mobile_banners
from app.services.image_upload import buffer_image_upload
from app.services.storage import upload_creative_bytes

logger = logging.getLogger(__name__)

router = APIRouter()


def _reject_placeholder_click_url_for_active_campaign(campaign: Campaign, click_url: str) -> None:
    if campaign.status == CampaignStatus.ACTIVE and is_placeholder_click_url(click_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Active campaigns need a real client click URL — not example.com. "
                "Use the advertiser landing page or pause the campaign while testing."
            ),
        )


def _storage_upload_error(prefix: str, exc: Exception) -> HTTPException:
    logger.exception("%s: %s", prefix, exc)
    err_msg = str(exc).split("\n")[0][:200]
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            f"{prefix}: {err_msg}. "
            "Check Railway storage settings (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, "
            "R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)."
        ),
    )


@router.post("", response_model=CreativeResponse, status_code=status.HTTP_201_CREATED)
async def create_creative(
    campaign_id: UUID = Form(...),
    name: str = Form(...),
    click_url: str = Form(...),
    alt_text: Optional[str] = Form(None),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new ad creative with image upload."""
    logger.info("create_creative: campaign_id=%s name=%r", campaign_id, name)

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    _reject_placeholder_click_url_for_active_campaign(campaign, click_url)

    content, effective_filename, image_width, image_height = await buffer_image_upload(image_file)

    try:
        image_url = upload_creative_bytes(content, campaign_id, effective_filename)
    except Exception as e:
        raise _storage_upload_error("File upload failed", e) from e

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
        hint = "Duplicate name in campaign? Try a different creative name."
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
    current_user: User = Depends(get_current_user),
):
    """Create a new ad creative with image URL (no file upload)."""
    campaign = db.query(Campaign).filter(Campaign.id == creative_data.campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    creative = AdCreative(
        campaign_id=creative_data.campaign_id,
        name=creative_data.name,
        image_url=creative_data.image_url,
        image_width=creative_data.image_width,
        image_height=creative_data.image_height,
        click_url=creative_data.click_url,
        alt_text=creative_data.alt_text,
        status=CreativeStatus.ACTIVE,
    )
    db.add(creative)

    try:
        db.commit()
        db.refresh(creative)
    except IntegrityError as e:
        db.rollback()
        logger.warning("Creative create (with-url) integrity error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Save failed. Try a different creative name or check the campaign.",
        ) from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Creative create (with-url) database error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database temporarily unavailable. Please try again.",
        ) from e

    return creative


@router.get("", response_model=List[CreativeResponse])
async def list_creatives(
    campaign_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List ad creatives, optionally filtered by campaign."""
    query = db.query(AdCreative)

    if campaign_id:
        query = query.filter(AdCreative.campaign_id == campaign_id)

    creatives = query.offset(skip).limit(limit).all()
    return creatives


@router.get("/maintenance/click-url-audit")
async def click_url_audit(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List active creatives on active campaigns that still use placeholder click URLs."""
    issues = audit_active_creative_click_urls(db)
    return {
        "issue_count": len(issues),
        "issues": [
            {
                "creative_id": item.creative_id,
                "creative_name": item.creative_name,
                "campaign_id": item.campaign_id,
                "campaign_name": item.campaign_name,
                "campaign_status": item.campaign_status,
                "click_url": item.click_url,
            }
            for item in issues
        ],
    }


@router.post("/maintenance/generate-mobile-banners")
async def generate_mobile_banners_endpoint(
    dry_run: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create 320×50 creatives from each active campaign's 728×90 desktop banner.

    Default dry_run=true previews work without writing to storage/DB.
    """
    summary = generate_missing_mobile_banners(db, dry_run=dry_run)
    return {
        "dry_run": summary.dry_run,
        "generated_count": len(summary.generated),
        "generated": [
            {
                "campaign_id": item.campaign_id,
                "campaign_name": item.campaign_name,
                "creative_id": item.creative_id,
                "creative_name": item.creative_name,
                "image_url": item.image_url,
            }
            for item in summary.generated
        ],
        "skipped": summary.skipped,
    }


@router.get("/{creative_id}", response_model=CreativeResponse)
async def get_creative(
    creative_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific ad creative."""
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creative not found",
        )
    return creative


@router.post("/{creative_id}/image", response_model=CreativeResponse)
async def replace_creative_image(
    creative_id: UUID,
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace a creative's image file (updates URL and detected dimensions)."""
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creative not found",
        )

    content, effective_filename, image_width, image_height = await buffer_image_upload(image_file)

    try:
        image_url = upload_creative_bytes(content, creative.campaign_id, effective_filename)
    except Exception as e:
        raise _storage_upload_error("File upload failed", e) from e

    creative.image_url = image_url
    creative.image_width = image_width
    creative.image_height = image_height

    try:
        db.commit()
        db.refresh(creative)
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Creative image replace database error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database temporarily unavailable. Please try again.",
        ) from e

    return creative


@router.put("/{creative_id}", response_model=CreativeResponse)
async def update_creative(
    creative_id: UUID,
    creative_data: CreativeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an ad creative."""
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creative not found",
        )

    update_data = creative_data.model_dump(exclude_unset=True)

    if "status" in update_data:
        update_data["status"] = CreativeStatus(update_data["status"])

    next_click_url = update_data.get("click_url", creative.click_url)
    campaign = db.query(Campaign).filter(Campaign.id == creative.campaign_id).first()
    next_status = update_data.get("status", creative.status)
    if campaign and next_status == CreativeStatus.ACTIVE:
        _reject_placeholder_click_url_for_active_campaign(campaign, next_click_url)

    for field, value in update_data.items():
        setattr(creative, field, value)

    try:
        db.commit()
        db.refresh(creative)
    except IntegrityError as e:
        db.rollback()
        logger.warning("Creative update integrity error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Update failed. Check the data and try again.",
        ) from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Creative update database error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database temporarily unavailable. Please try again.",
        ) from e

    return creative


@router.delete("/{creative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_creative(
    creative_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an ad creative."""
    creative = db.query(AdCreative).filter(AdCreative.id == creative_id).first()
    if not creative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creative not found",
        )

    try:
        db.delete(creative)
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Creative delete database error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Delete failed. Please try again.",
        ) from e

    return None
