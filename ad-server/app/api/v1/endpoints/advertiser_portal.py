"""Self-service uploads for advertiser portal accounts."""
from __future__ import annotations

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_advertiser_user
from app.core.database import get_db
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.advertiser import Advertiser
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.advertiser_portal import (
    AdvertiserPortalCampaign,
    AdvertiserPortalClient,
    AdvertiserPortalCreative,
    AdvertiserPortalOverview,
)
from app.schemas.creative import CreativeResponse
from app.schemas.report import ReportShareResponse
from app.services.report_service import create_share_link_for_campaign
from app.services.image_upload import buffer_image_upload
from app.services.portal_advertiser_access import (
    list_portal_advertiser_ids,
    resolve_portal_advertiser_id,
    user_can_access_advertiser,
)
from app.services.storage import upload_creative_bytes

logger = logging.getLogger(__name__)

router = APIRouter()


def _http_resolve_advertiser_id(
    db: Session,
    user: User,
    advertiser_id: UUID | None,
) -> UUID:
    try:
        return resolve_portal_advertiser_id(db, user, advertiser_id)
    except ValueError as exc:
        code = str(exc)
        if code == "advertiser_id_required":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Select a client (advertiser_id query parameter required for agency accounts).",
            ) from exc
        if code == "forbidden":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to that client.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No advertisers linked to this account.",
        ) from exc


@router.get("/clients", response_model=List[AdvertiserPortalClient])
async def portal_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser_user),
):
    ids = list_portal_advertiser_ids(db, current_user)
    advertisers = db.query(Advertiser).filter(Advertiser.id.in_(ids)).order_by(Advertiser.name).all()
    return [
        AdvertiserPortalClient(id=a.id, name=a.name, company_name=a.company_name)
        for a in advertisers
    ]


@router.get("/overview", response_model=AdvertiserPortalOverview)
async def portal_overview(
    advertiser_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser_user),
):
    allowed = list_portal_advertiser_ids(db, current_user)
    aid = _http_resolve_advertiser_id(db, current_user, advertiser_id)
    advertiser = db.query(Advertiser).filter(Advertiser.id == aid).first()
    if not advertiser:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advertiser not found")

    campaigns = (
        db.query(Campaign)
        .filter(Campaign.advertiser_id == aid)
        .order_by(Campaign.start_date.desc())
        .all()
    )
    pending = (
        db.query(AdCreative)
        .join(Campaign)
        .filter(
            Campaign.advertiser_id == aid,
            AdCreative.status == CreativeStatus.PENDING_REVIEW,
        )
        .count()
    )
    return AdvertiserPortalOverview(
        advertiser_id=advertiser.id,
        advertiser_name=advertiser.name,
        company_name=advertiser.company_name,
        campaign_count=len(campaigns),
        pending_creatives_count=pending,
        client_count=len(allowed),
        is_agency_account=len(allowed) > 1,
    )


@router.get("/campaigns", response_model=List[AdvertiserPortalCampaign])
async def portal_campaigns(
    advertiser_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser_user),
):
    aid = _http_resolve_advertiser_id(db, current_user, advertiser_id)
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.advertiser_id == aid)
        .order_by(Campaign.start_date.desc())
        .all()
    )
    return [
        AdvertiserPortalCampaign(
            id=c.id,
            name=c.name,
            status=c.status.value,
            start_date=c.start_date,
            end_date=c.end_date,
        )
        for c in campaigns
    ]


@router.get("/creatives", response_model=List[AdvertiserPortalCreative])
async def portal_creatives(
    advertiser_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser_user),
):
    allowed = list_portal_advertiser_ids(db, current_user)
    if advertiser_id is not None:
        if not user_can_access_advertiser(db, current_user, advertiser_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        filter_ids = [advertiser_id]
    else:
        filter_ids = allowed

    creatives = (
        db.query(AdCreative)
        .join(Campaign)
        .options(selectinload(AdCreative.campaign))
        .filter(Campaign.advertiser_id.in_(filter_ids))
        .order_by(AdCreative.created_at.desc())
        .all()
    )
    advertiser_names = {
        a.id: a.name
        for a in db.query(Advertiser).filter(Advertiser.id.in_(filter_ids)).all()
    }
    result: list[AdvertiserPortalCreative] = []
    for c in creatives:
        adv_id = c.campaign.advertiser_id if c.campaign else filter_ids[0]
        result.append(
            AdvertiserPortalCreative(
                id=c.id,
                campaign_id=c.campaign_id,
                campaign_name=c.campaign.name if c.campaign else "",
                advertiser_id=adv_id,
                advertiser_name=advertiser_names.get(adv_id, ""),
                name=c.name,
                image_url=c.image_url,
                image_width=c.image_width,
                image_height=c.image_height,
                click_url=c.click_url,
                alt_text=c.alt_text,
                status=c.status.value,
                created_at=c.created_at,
            )
        )
    return result


@router.post(
    "/campaigns/{campaign_id}/report-link",
    response_model=ReportShareResponse,
)
async def portal_campaign_report_link(
    campaign_id: UUID,
    days_valid: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser_user),
):
    """Read-only campaign report link the advertiser can share (same as staff share links)."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or not user_can_access_advertiser(db, current_user, campaign.advertiser_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found for your account.",
        )
    share = create_share_link_for_campaign(campaign_id, days_valid=days_valid)
    return ReportShareResponse(**share)


@router.post("/creatives", response_model=CreativeResponse, status_code=status.HTTP_201_CREATED)
async def portal_upload_creative(
    campaign_id: UUID = Form(...),
    name: str = Form(...),
    click_url: str = Form(...),
    alt_text: Optional[str] = Form(None),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser_user),
):
    """Upload creative — stays pending until New Stars Radio approves (sets active in Ad Manager)."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or not user_can_access_advertiser(db, current_user, campaign.advertiser_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found for your account.",
        )

    content, effective_filename, image_width, image_height = await buffer_image_upload(image_file)

    try:
        image_url = upload_creative_bytes(content, campaign_id, effective_filename)
    except Exception as e:
        logger.exception("Advertiser portal upload failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Upload failed. Try again or contact sales@newstarsradio.com.",
        ) from e

    creative = AdCreative(
        campaign_id=campaign_id,
        name=name.strip(),
        image_url=image_url,
        image_width=image_width,
        image_height=image_height,
        click_url=click_url.strip(),
        alt_text=alt_text.strip() if alt_text else None,
        status=CreativeStatus.PENDING_REVIEW,
    )
    db.add(creative)
    db.commit()
    db.refresh(creative)
    logger.info(
        "Advertiser portal creative submitted: user=%s campaign=%s creative=%s",
        current_user.email,
        campaign_id,
        creative.id,
    )
    return creative
