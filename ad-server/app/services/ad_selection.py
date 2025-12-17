"""
Ad Selection Service - Core business logic for selecting ads to serve.

This service implements the ad selection algorithm with:
- Priority-based selection
- Geographic targeting
- Budget management
- Fair rotation among creatives
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, or_
import logging

from app.models.campaign import Campaign, CampaignStatus
from app.models.ad_creative import AdCreative, CreativeStatus
from app.core.security import create_tracking_token

logger = logging.getLogger(__name__)


class AdSelectionService:
    """Service for selecting which ad to serve based on targeting and priority."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def select_ad(
        self,
        user_id: str,
        placement: str,
        city: Optional[str] = None,
        state: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Select an ad to serve based on targeting criteria and priority.
        
        Algorithm:
        1. Find eligible campaigns (active, within date range, has budget)
        2. Apply geographic targeting filters
        3. Sort by priority (highest first), then by last_served_at (least recent)
        4. Select active creative from chosen campaign
        5. Generate tracking tokens
        6. Update campaign metrics
        
        Args:
            user_id: Unique identifier for the user/device
            placement: Ad placement identifier (e.g., 'banner_bottom')
            city: User's city (optional, for targeting)
            state: User's state (optional, for targeting)
        
        Returns:
            Dictionary with ad data and tracking tokens, or None if no ad available
        """
        logger.info(f"Selecting ad for user={user_id}, placement={placement}, location={city}/{state}")
        
        try:
            # Step 1: Find eligible campaigns
            eligible_campaign = self._find_eligible_campaign(city, state)
            
            if not eligible_campaign:
                logger.info("No eligible campaigns found - returning None for AdSense fallback")
                return None
            
            # Step 2: Select an active creative from the campaign
            creative = self._select_creative(eligible_campaign)
            
            if not creative:
                logger.warning(f"No active creatives for campaign {eligible_campaign.id}")
                return None
            
            # Step 3: Generate tracking tokens
            timestamp = datetime.utcnow()
            impression_token = create_tracking_token(
                ad_creative_id=str(creative.id),
                campaign_id=str(eligible_campaign.id),
                timestamp=timestamp,
                token_type="impression"
            )
            
            click_token = create_tracking_token(
                ad_creative_id=str(creative.id),
                campaign_id=str(eligible_campaign.id),
                timestamp=timestamp,
                token_type="click"
            )
            
            # Step 4: Update campaign metrics (atomic)
            self._update_campaign_served(eligible_campaign)
            
            # Step 5: Build response
            ad_data = {
                "ad_id": str(creative.id),
                "campaign_id": str(eligible_campaign.id),
                "image_url": creative.image_url,
                "image_width": creative.image_width,
                "image_height": creative.image_height,
                "click_url": creative.click_url,
                "alt_text": creative.alt_text or eligible_campaign.name,
                "impression_tracking_token": impression_token,
                "click_tracking_token": click_token,
            }
            
            logger.info(f"Selected ad: creative={creative.id}, campaign={eligible_campaign.id}")
            return ad_data
            
        except Exception as e:
            logger.error(f"Error selecting ad: {str(e)}", exc_info=True)
            return None
    
    def _find_eligible_campaign(
        self,
        city: Optional[str],
        state: Optional[str]
    ) -> Optional[Campaign]:
        """
        Find an eligible campaign based on status, date range, budget, and targeting.
        
        Returns the highest priority campaign that:
        - Has status = 'active'
        - Current time is between start_date and end_date
        - Has remaining impression budget
        - Matches geographic targeting (if specified)
        
        Sorted by priority (desc), then last_served_at (asc) for fair rotation.
        """
        now = datetime.utcnow()
        
        # Base query: active campaigns with budget remaining
        query = self.db.query(Campaign).filter(
            and_(
                Campaign.status == CampaignStatus.ACTIVE,
                Campaign.start_date <= now,
                Campaign.end_date >= now,
                Campaign.impressions_served < Campaign.impression_budget
            )
        ).options(
            selectinload(Campaign.creatives)  # Eager load creatives
        )
        
        # Apply geographic targeting
        if city or state:
            # Campaign matches if:
            # 1. No targeting specified (target_cities and target_states are null/empty), OR
            # 2. City matches target_cities (if city provided), OR
            # 3. State matches target_states (if state provided)
            
            targeting_conditions = []
            
            # No targeting specified
            targeting_conditions.append(
                and_(
                    or_(Campaign.target_cities.is_(None), Campaign.target_cities == []),
                    or_(Campaign.target_states.is_(None), Campaign.target_states == [])
                )
            )
            
            # City targeting
            if city:
                targeting_conditions.append(
                    Campaign.target_cities.contains([city])
                )
            
            # State targeting
            if state:
                targeting_conditions.append(
                    Campaign.target_states.contains([state])
                )
            
            query = query.filter(or_(*targeting_conditions))
        
        # Sort by priority (highest first), then by last_served_at (least recent first)
        # Campaigns never served (last_served_at = NULL) come first
        query = query.order_by(
            Campaign.priority.desc(),
            Campaign.last_served_at.asc().nullsfirst()
        )
        
        # Get the first eligible campaign
        campaign = query.first()
        
        return campaign
    
    def _select_creative(self, campaign: Campaign) -> Optional[AdCreative]:
        """
        Select an active creative from the campaign.
        
        Uses simple rotation - could be enhanced with performance-based selection.
        """
        # Get active creatives
        active_creatives = [
            c for c in campaign.creatives
            if c.status == CreativeStatus.ACTIVE
        ]
        
        if not active_creatives:
            return None
        
        # Simple rotation: just return the first one
        # TODO: Could enhance with round-robin or performance-based selection
        return active_creatives[0]
    
    def _update_campaign_served(self, campaign: Campaign) -> None:
        """
        Update campaign metrics atomically after serving an ad.
        
        Increments impressions_served and updates last_served_at.
        Uses database-level atomic operations to prevent race conditions.
        """
        try:
            # Update using SQLAlchemy's update() for atomic operation
            self.db.query(Campaign).filter(
                Campaign.id == campaign.id
            ).update(
                {
                    "impressions_served": Campaign.impressions_served + 1,
                    "last_served_at": datetime.utcnow()
                },
                synchronize_session=False
            )
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error updating campaign metrics: {str(e)}")
            self.db.rollback()
            raise






