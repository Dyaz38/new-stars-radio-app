"""
Campaign management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.models.campaign import Campaign, CampaignStatus
from app.models.advertiser import Advertiser
from app.models.user import User

router = APIRouter()


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new campaign."""
    # Verify advertiser exists
    advertiser = db.query(Advertiser).filter(Advertiser.id == campaign_data.advertiser_id).first()
    if not advertiser:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertiser not found"
        )
    
    # Validate dates
    if campaign_data.start_date >= campaign_data.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # Validate priority
    if not (1 <= campaign_data.priority <= 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Priority must be between 1 and 10"
        )
    
    campaign = Campaign(
        advertiser_id=campaign_data.advertiser_id,
        name=campaign_data.name,
        start_date=campaign_data.start_date,
        end_date=campaign_data.end_date,
        priority=campaign_data.priority,
        impression_budget=campaign_data.impression_budget,
        target_cities=campaign_data.target_cities,
        target_states=campaign_data.target_states,
        status=CampaignStatus.DRAFT
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    skip: int = 0,
    limit: int = 100,
    status_filter: str = None,
    advertiser_id: UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List campaigns with optional filters."""
    query = db.query(Campaign)
    
    if status_filter:
        try:
            status_enum = CampaignStatus(status_filter)
            query = query.filter(Campaign.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    if advertiser_id:
        query = query.filter(Campaign.advertiser_id == advertiser_id)
    
    campaigns = query.offset(skip).limit(limit).all()
    return campaigns


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    campaign_data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    update_data = campaign_data.model_dump(exclude_unset=True)
    
    # Validate dates if both are being updated
    if "start_date" in update_data or "end_date" in update_data:
        start_date = update_data.get("start_date", campaign.start_date)
        end_date = update_data.get("end_date", campaign.end_date)
        if start_date >= end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date must be after start date"
            )
    
    # Validate priority if being updated
    if "priority" in update_data:
        if not (1 <= update_data["priority"] <= 10):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Priority must be between 1 and 10"
            )
    
    # Handle status enum
    if "status" in update_data:
        update_data["status"] = CampaignStatus(update_data["status"])
    
    for field, value in update_data.items():
        setattr(campaign, field, value)
    
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    db.delete(campaign)
    db.commit()
    
    return None






















