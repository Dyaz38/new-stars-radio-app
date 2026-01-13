"""
Advertiser management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.schemas.advertiser import AdvertiserCreate, AdvertiserUpdate, AdvertiserResponse
from app.models.advertiser import Advertiser, AdvertiserStatus
from app.models.user import User

router = APIRouter()


@router.post("", response_model=AdvertiserResponse, status_code=status.HTTP_201_CREATED)
async def create_advertiser(
    advertiser_data: AdvertiserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new advertiser."""
    # Check if email already exists
    existing = db.query(Advertiser).filter(Advertiser.email == advertiser_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Advertiser with this email already exists"
        )
    
    advertiser = Advertiser(
        name=advertiser_data.name,
        email=advertiser_data.email,
        phone=advertiser_data.phone,
        company_name=advertiser_data.company_name,
        status=AdvertiserStatus.ACTIVE
    )
    
    db.add(advertiser)
    db.commit()
    db.refresh(advertiser)
    
    return advertiser


@router.get("", response_model=List[AdvertiserResponse])
async def list_advertisers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all advertisers."""
    advertisers = db.query(Advertiser).offset(skip).limit(limit).all()
    return advertisers


@router.get("/{advertiser_id}", response_model=AdvertiserResponse)
async def get_advertiser(
    advertiser_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific advertiser."""
    advertiser = db.query(Advertiser).filter(Advertiser.id == advertiser_id).first()
    if not advertiser:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertiser not found"
        )
    return advertiser


@router.put("/{advertiser_id}", response_model=AdvertiserResponse)
async def update_advertiser(
    advertiser_id: UUID,
    advertiser_data: AdvertiserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an advertiser."""
    advertiser = db.query(Advertiser).filter(Advertiser.id == advertiser_id).first()
    if not advertiser:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertiser not found"
        )
    
    update_data = advertiser_data.model_dump(exclude_unset=True)
    if "status" in update_data:
        update_data["status"] = AdvertiserStatus(update_data["status"])
    
    for field, value in update_data.items():
        setattr(advertiser, field, value)
    
    db.commit()
    db.refresh(advertiser)
    
    return advertiser


@router.delete("/{advertiser_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_advertiser(
    advertiser_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an advertiser."""
    advertiser = db.query(Advertiser).filter(Advertiser.id == advertiser_id).first()
    if not advertiser:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertiser not found"
        )
    
    db.delete(advertiser)
    db.commit()
    
    return None



































