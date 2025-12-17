"""
Ad serving service with ad selection logic.
"""
import random
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.models.campaign import Campaign, CampaignStatus
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.impression import Impression


class AdService:
    """Service for selecting and serving ads."""
    
    @staticmethod
    def select_ad(
        db: Session,
        user_id: str,
        city: Optional[str] = None,
        state: Optional[str] = None,
        width: Optional[int] = None,
        height: Optional[int] = None
    ) -> Optional[AdCreative]:
        """
        Select an ad creative to serve based on:
        - Campaign status (must be ACTIVE)
        - Campaign date range (must be within start/end dates)
        - Budget availability (impressions_served < impression_budget)
        - Creative status (must be ACTIVE)
        - Targeting (city/state if provided)
        - Priority (higher priority campaigns first)
        
        Returns the selected AdCreative or None if no ad available.
        """
        now = datetime.utcnow()
        
        # Build query for eligible campaigns
        query = db.query(Campaign).join(AdCreative).filter(
            Campaign.status == CampaignStatus.ACTIVE,
            Campaign.start_date <= now,
            Campaign.end_date >= now,
            Campaign.impressions_served < Campaign.impression_budget,
            AdCreative.status == CreativeStatus.ACTIVE
        )
        
        # Apply targeting filters if location data provided
        if city or state:
            targeting_filters = []
            if city:
                targeting_filters.append(
                    or_(
                        Campaign.target_cities.is_(None),
                        Campaign.target_cities.contains([city])
                    )
                )
            if state:
                targeting_filters.append(
                    or_(
                        Campaign.target_states.is_(None),
                        Campaign.target_states.contains([state])
                    )
                )
            if targeting_filters:
                query = query.filter(and_(*targeting_filters))
        
        # Filter by size if provided (optional - can be relaxed)
        if width and height:
            # Allow ads that match size or are flexible
            query = query.filter(
                or_(
                    and_(
                        AdCreative.image_width == width,
                        AdCreative.image_height == height
                    ),
                    # Allow ads that are close in size (within 20% tolerance)
                    and_(
                        AdCreative.image_width.between(int(width * 0.8), int(width * 1.2)),
                        AdCreative.image_height.between(int(height * 0.8), int(height * 1.2))
                    )
                )
            )
        
        # Order by priority (descending) and randomize within same priority
        campaigns = query.order_by(
            Campaign.priority.desc(),
            func.random()
        ).all()
        
        # Select first campaign with available creatives
        for campaign in campaigns:
            # Get active creatives for this campaign
            creatives = db.query(AdCreative).filter(
                AdCreative.campaign_id == campaign.id,
                AdCreative.status == CreativeStatus.ACTIVE
            ).all()
            
            if creatives:
                # Select a random creative from the campaign
                selected_creative = random.choice(creatives)
                return selected_creative
        
        return None
    
    @staticmethod
    def record_impression(
        db: Session,
        creative_id: UUID,
        campaign_id: UUID,
        user_id: str,
        city: Optional[str] = None,
        state: Optional[str] = None
    ) -> Impression:
        """Record an ad impression."""
        impression = Impression(
            ad_creative_id=creative_id,
            campaign_id=campaign_id,
            user_id=user_id,
            city=city,
            state=state,
            timestamp=datetime.utcnow()
        )
        db.add(impression)
        
        # Update campaign impressions_served counter
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.impressions_served += 1
            campaign.last_served_at = datetime.utcnow()
        
        db.commit()
        db.refresh(impression)
        return impression

