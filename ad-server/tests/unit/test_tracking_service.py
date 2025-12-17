"""
Unit tests for Tracking Service.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import uuid
from fastapi import HTTPException

from app.services.tracking import TrackingService
from app.models.impression import Impression
from app.models.click import Click
from app.models.campaign import Campaign, CampaignStatus
from app.models.ad_creative import AdCreative, CreativeStatus


class TestTrackingService:
    """Test cases for Tracking Service."""
    
    def test_track_impression_creates_impression_record(self):
        """Test that tracking an impression creates a database record."""
        # Arrange
        mock_db = Mock()
        service = TrackingService(mock_db)
        
        ad_id = str(uuid.uuid4())
        campaign_id = str(uuid.uuid4())
        user_id = "test-user-123"
        timestamp = datetime.utcnow()
        
        # Mock token validation
        with patch('app.services.tracking.verify_tracking_token') as mock_verify:
            mock_verify.return_value = {
                "ad_id": ad_id,
                "campaign_id": campaign_id,
                "type": "impression"
            }
            
            # Mock ad/campaign validation
            mock_creative = Mock(spec=AdCreative)
            mock_creative.id = uuid.UUID(ad_id)
            mock_creative.status = CreativeStatus.ACTIVE
            
            mock_campaign = Mock(spec=Campaign)
            mock_campaign.id = uuid.UUID(campaign_id)
            
            mock_db.query().filter().first.side_effect = [
                mock_creative,  # First call for creative
                mock_campaign   # Second call for campaign
            ]
            
            # Act
            result = service.track_impression(
                ad_creative_id=ad_id,
                campaign_id=campaign_id,
                user_id=user_id,
                tracking_token="valid-token",
                timestamp=timestamp
            )
        
        # Assert
        assert result is not None
        assert "impression_id" in result
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
    
    def test_track_impression_rejects_old_timestamp(self):
        """Test that impressions with old timestamps are rejected."""
        # Arrange
        mock_db = Mock()
        service = TrackingService(mock_db)
        
        ad_id = str(uuid.uuid4())
        campaign_id = str(uuid.uuid4())
        old_timestamp = datetime.utcnow() - timedelta(minutes=10)
        
        with patch('app.services.tracking.verify_tracking_token') as mock_verify:
            mock_verify.return_value = {
                "ad_id": ad_id,
                "campaign_id": campaign_id,
                "type": "impression"
            }
            
            # Mock ad/campaign validation
            mock_creative = Mock(spec=AdCreative)
            mock_creative.status = CreativeStatus.ACTIVE
            mock_campaign = Mock(spec=Campaign)
            mock_db.query().filter().first.side_effect = [mock_creative, mock_campaign]
            
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                service.track_impression(
                    ad_creative_id=ad_id,
                    campaign_id=campaign_id,
                    user_id="test-user",
                    tracking_token="token",
                    timestamp=old_timestamp
                )
            
            assert exc_info.value.status_code == 400
            assert "Timestamp" in exc_info.value.detail
    
    def test_track_impression_prevents_replay_attacks(self):
        """Test that using the same token twice is rejected."""
        # Arrange
        mock_db = Mock()
        service = TrackingService(mock_db)
        
        ad_id = str(uuid.uuid4())
        campaign_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()
        token = "test-token-123"
        
        with patch('app.services.tracking.verify_tracking_token') as mock_verify:
            mock_verify.return_value = {
                "ad_id": ad_id,
                "campaign_id": campaign_id,
                "type": "impression"
            }
            
            # Mock ad/campaign validation
            mock_creative = Mock(spec=AdCreative)
            mock_creative.status = CreativeStatus.ACTIVE
            mock_campaign = Mock(spec=Campaign)
            mock_db.query().filter().first.side_effect = [
                mock_creative, mock_campaign,  # First tracking
                mock_creative, mock_campaign   # Second tracking (should fail)
            ]
            
            # Act - First tracking should succeed
            result1 = service.track_impression(
                ad_creative_id=ad_id,
                campaign_id=campaign_id,
                user_id="user-1",
                tracking_token=token,
                timestamp=timestamp
            )
            
            assert result1 is not None
            
            # Act & Assert - Second tracking should fail
            with pytest.raises(HTTPException) as exc_info:
                service.track_impression(
                    ad_creative_id=ad_id,
                    campaign_id=campaign_id,
                    user_id="user-2",
                    tracking_token=token,  # Same token!
                    timestamp=timestamp
                )
            
            assert exc_info.value.status_code == 400
            assert "already used" in exc_info.value.detail
    
    def test_track_click_creates_click_record(self):
        """Test that tracking a click creates a database record."""
        # Arrange
        mock_db = Mock()
        service = TrackingService(mock_db)
        
        ad_id = str(uuid.uuid4())
        campaign_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()
        unique_token = f"click-token-{uuid.uuid4()}"
        
        with patch('app.services.tracking.verify_tracking_token') as mock_verify:
            mock_verify.return_value = {
                "ad_id": ad_id,
                "campaign_id": campaign_id,
                "type": "click"
            }
            
            # Mock ad/campaign validation
            mock_creative = Mock(spec=AdCreative)
            mock_creative.id = uuid.UUID(ad_id)
            mock_creative.status = CreativeStatus.ACTIVE
            mock_creative.click_url = "https://advertiser.com"
            
            mock_campaign = Mock(spec=Campaign)
            mock_campaign.id = uuid.UUID(campaign_id)
            
            mock_db.query().filter().first.side_effect = [
                mock_creative,
                mock_campaign
            ]
            
            # Act
            result = service.track_click(
                ad_creative_id=ad_id,
                campaign_id=campaign_id,
                user_id="test-user",
                tracking_token=unique_token,
                timestamp=timestamp
            )
        
        # Assert
        assert result is not None
        assert "click_id" in result
        assert "click_url" in result
        assert result["click_url"] == "https://advertiser.com"
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
    
    def test_track_click_redirects_even_for_duplicate(self):
        """Test that duplicate clicks still redirect to advertiser."""
        # Arrange
        mock_db = Mock()
        service = TrackingService(mock_db)
        
        ad_id = str(uuid.uuid4())
        campaign_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()
        token = "click-token-123"
        
        with patch('app.services.tracking.verify_tracking_token') as mock_verify:
            mock_verify.return_value = {
                "ad_id": ad_id,
                "campaign_id": campaign_id,
                "type": "click"
            }
            
            mock_creative = Mock(spec=AdCreative)
            mock_creative.id = uuid.UUID(ad_id)
            mock_creative.status = CreativeStatus.ACTIVE
            mock_creative.click_url = "https://advertiser.com"
            
            mock_campaign = Mock(spec=Campaign)
            
            # First click
            mock_db.query().filter().first.side_effect = [
                mock_creative, mock_campaign,
                # Second click (duplicate)
                mock_creative
            ]
            
            # Act - First click
            result1 = service.track_click(
                ad_creative_id=ad_id,
                campaign_id=campaign_id,
                user_id="user-1",
                tracking_token=token,
                timestamp=timestamp
            )
            
            # Act - Second click (duplicate)
            result2 = service.track_click(
                ad_creative_id=ad_id,
                campaign_id=campaign_id,
                user_id="user-2",
                tracking_token=token,  # Same token
                timestamp=timestamp
            )
        
        # Assert
        assert result1 is not None
        assert result1["duplicate"] is False
        assert result2 is not None
        assert result2["duplicate"] is True
        assert result2["click_url"] == "https://advertiser.com"
    
    def test_validate_user_id_rejects_invalid_format(self):
        """Test that invalid user IDs are rejected."""
        # Arrange
        service = TrackingService(Mock())
        
        # Act & Assert
        assert service._is_user_id_valid("valid-user-123") is True
        assert service._is_user_id_valid("valid_user_123") is True
        assert service._is_user_id_valid("") is False
        assert service._is_user_id_valid("a" * 101) is False  # Too long
        assert service._is_user_id_valid("user@invalid!") is False  # Invalid chars
    
    def test_timestamp_validation(self):
        """Test timestamp validation logic."""
        # Arrange
        service = TrackingService(Mock())
        
        # Act & Assert
        now = datetime.utcnow()
        assert service._is_timestamp_valid(now) is True
        assert service._is_timestamp_valid(now - timedelta(minutes=4)) is True
        assert service._is_timestamp_valid(now - timedelta(minutes=6)) is False
        assert service._is_timestamp_valid(now + timedelta(minutes=6)) is False

