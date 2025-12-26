"""
Tracking Service - Handles impression and click tracking with validation.

Includes:
- Impression tracking with location data
- Click tracking with redirect
- Token validation
- Replay attack prevention
- Error handling
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Set
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging
import uuid

from app.models.impression import Impression
from app.models.click import Click
from app.models.campaign import Campaign
from app.models.ad_creative import AdCreative, CreativeStatus
from app.core.security import verify_tracking_token

logger = logging.getLogger(__name__)


# In-memory set for tracking used tokens (prevents replay attacks)
# In production, use Redis with TTL
_used_tokens: Set[str] = set()
_token_cleanup_threshold = 10000  # Clear set when it gets too large


class TrackingService:
    """Service for tracking ad impressions and clicks."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def track_impression(
        self,
        ad_creative_id: str,
        campaign_id: str,
        user_id: str,
        tracking_token: str,
        timestamp: datetime,
        city: Optional[str] = None,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track an ad impression.
        
        Validates the tracking token and records the impression.
        Updates campaign impression count.
        
        Args:
            ad_creative_id: UUID of the ad creative
            campaign_id: UUID of the campaign
            user_id: User/device identifier
            tracking_token: JWT token for validation
            timestamp: When the impression occurred
            city: User's city (optional)
            state: User's state (optional)
        
        Returns:
            Dictionary with impression_id
        
        Raises:
            HTTPException: If validation fails
        """
        logger.info(f"Tracking impression: ad={ad_creative_id}, user={user_id}")
        
        try:
            # Step 1: Validate tracking token
            self._validate_token(
                tracking_token,
                ad_creative_id,
                campaign_id,
                "impression"
            )
            
            # Step 2: Check for replay attack
            if self._is_token_used(tracking_token):
                logger.warning(f"Token replay detected: {tracking_token[:20]}...")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tracking token already used"
                )
            
            # Step 3: Validate ad and campaign exist and are active
            self._validate_ad_and_campaign(ad_creative_id, campaign_id)
            
            # Step 4: Validate timestamp (must be within 5 minutes)
            if not self._is_timestamp_valid(timestamp):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Timestamp too old or in future"
                )
            
            # Step 5: Validate user_id format
            if not self._is_user_id_valid(user_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid user_id format"
                )
            
            # Step 6: Record impression
            impression = Impression(
                ad_creative_id=uuid.UUID(ad_creative_id),
                campaign_id=uuid.UUID(campaign_id),
                user_id=user_id,
                city=city,
                state=state,
                timestamp=timestamp
            )
            
            self.db.add(impression)
            self.db.commit()
            self.db.refresh(impression)
            
            # Step 7: Mark token as used
            self._mark_token_used(tracking_token)
            
            logger.info(f"Impression tracked: {impression.id}")
            return {"impression_id": str(impression.id)}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error tracking impression: {str(e)}", exc_info=True)
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to track impression"
            )
    
    def track_click(
        self,
        ad_creative_id: str,
        campaign_id: str,
        user_id: str,
        tracking_token: str,
        timestamp: datetime
    ) -> Dict[str, Any]:
        """
        Track an ad click.
        
        Validates the tracking token and records the click.
        Returns the click URL for redirect.
        
        Args:
            ad_creative_id: UUID of the ad creative
            campaign_id: UUID of the campaign
            user_id: User/device identifier
            tracking_token: JWT token for validation
            timestamp: When the click occurred
        
        Returns:
            Dictionary with click_id and click_url
        
        Raises:
            HTTPException: If validation fails
        """
        logger.info(f"Tracking click: ad={ad_creative_id}, user={user_id}")
        
        try:
            # Step 1: Validate tracking token
            self._validate_token(
                tracking_token,
                ad_creative_id,
                campaign_id,
                "click"
            )
            
            # Step 2: Check for replay attack
            if self._is_token_used(tracking_token):
                logger.warning(f"Token replay detected for click: {tracking_token[:20]}...")
                # For clicks, still redirect but don't count twice
                creative = self.db.query(AdCreative).filter(
                    AdCreative.id == uuid.UUID(ad_creative_id)
                ).first()
                if creative:
                    return {
                        "click_id": None,
                        "click_url": creative.click_url,
                        "duplicate": True
                    }
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ad creative not found"
                )
            
            # Step 3: Validate ad and campaign
            creative = self._validate_ad_and_campaign(ad_creative_id, campaign_id)
            
            # Step 4: Validate timestamp
            if not self._is_timestamp_valid(timestamp):
                # Still redirect even if timestamp is old
                logger.warning(f"Old timestamp for click, but redirecting anyway")
            
            # Step 5: Validate user_id
            if not self._is_user_id_valid(user_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid user_id format"
                )
            
            # Step 6: Record click
            click = Click(
                ad_creative_id=uuid.UUID(ad_creative_id),
                campaign_id=uuid.UUID(campaign_id),
                user_id=user_id,
                timestamp=timestamp
            )
            
            self.db.add(click)
            self.db.commit()
            self.db.refresh(click)
            
            # Step 7: Mark token as used
            self._mark_token_used(tracking_token)
            
            logger.info(f"Click tracked: {click.id}")
            return {
                "click_id": str(click.id),
                "click_url": creative.click_url,
                "duplicate": False
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error tracking click: {str(e)}", exc_info=True)
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to track click"
            )
    
    def _validate_token(
        self,
        token: str,
        expected_ad_id: str,
        expected_campaign_id: str,
        expected_type: str
    ) -> Dict[str, Any]:
        """Validate tracking token and check it matches expected values."""
        try:
            payload = verify_tracking_token(token, expected_type)
            
            # Verify ad_id and campaign_id match
            if payload.get("ad_id") != expected_ad_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token ad_id mismatch"
                )
            
            if payload.get("campaign_id") != expected_campaign_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token campaign_id mismatch"
                )
            
            return payload
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tracking token"
            )
    
    def _validate_ad_and_campaign(
        self,
        ad_creative_id: str,
        campaign_id: str
    ) -> AdCreative:
        """
        Validate that ad creative and campaign exist and are active.
        Returns the ad creative.
        """
        # Check ad creative exists and is active
        creative = self.db.query(AdCreative).filter(
            AdCreative.id == uuid.UUID(ad_creative_id)
        ).first()
        
        if not creative:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ad creative not found"
            )
        
        if creative.status != CreativeStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ad creative is not active"
            )
        
        # Check campaign exists and is active
        campaign = self.db.query(Campaign).filter(
            Campaign.id == uuid.UUID(campaign_id)
        ).first()
        
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        return creative
    
    def _is_timestamp_valid(self, timestamp: datetime) -> bool:
        """Check if timestamp is within acceptable range (5 minutes)."""
        now = datetime.utcnow()
        diff = abs((now - timestamp).total_seconds())
        return diff <= 300  # 5 minutes
    
    def _is_user_id_valid(self, user_id: str) -> bool:
        """Validate user_id format (alphanumeric, max 100 chars)."""
        if not user_id or len(user_id) > 100:
            return False
        return user_id.replace("-", "").replace("_", "").isalnum()
    
    def _is_token_used(self, token: str) -> bool:
        """Check if tracking token has already been used."""
        return token in _used_tokens
    
    def _mark_token_used(self, token: str) -> None:
        """Mark a tracking token as used to prevent replay attacks."""
        global _used_tokens
        
        _used_tokens.add(token)
        
        # Cleanup if set gets too large
        # In production, use Redis with TTL instead
        if len(_used_tokens) > _token_cleanup_threshold:
            logger.info(f"Clearing token cache ({len(_used_tokens)} tokens)")
            _used_tokens.clear()








