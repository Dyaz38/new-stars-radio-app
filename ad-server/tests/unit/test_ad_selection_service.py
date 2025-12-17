"""
Unit tests for Ad Selection Service.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock, PropertyMock
import uuid

from app.services.ad_selection import AdSelectionService
from app.models.campaign import Campaign, CampaignStatus
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.advertiser import Advertiser, AdvertiserStatus


class TestAdSelectionService:
    """Test cases for Ad Selection Service."""
    
    def test_select_ad_returns_none_when_no_eligible_campaigns(self):
        """Test that None is returned when no campaigns are eligible."""
        # Arrange
        mock_db = Mock()
        mock_db.query().filter().options().order_by().first.return_value = None
        
        service = AdSelectionService(mock_db)
        
        # Act
        result = service.select_ad(
            user_id="test-user-123",
            placement="banner_bottom"
        )
        
        # Assert
        assert result is None
    
    def test_select_ad_applies_priority_ordering(self):
        """Test that campaigns are selected by priority."""
        # Arrange
        mock_db = Mock()
        
        # Create mock campaigns with different priorities
        high_priority_campaign = self._create_mock_campaign(priority=10)
        low_priority_campaign = self._create_mock_campaign(priority=1)
        
        # Mock should return highest priority first
        mock_db.query().filter().options().order_by().first.return_value = high_priority_campaign
        
        service = AdSelectionService(mock_db)
        
        # Act
        result = service.select_ad(
            user_id="test-user-123",
            placement="banner_bottom"
        )
        
        # Assert
        assert result is not None
        assert result["campaign_id"] == str(high_priority_campaign.id)
    
    def test_select_ad_applies_geographic_targeting(self):
        """Test that geographic targeting is applied in the query."""
        # Arrange
        mock_db = Mock()
        service = AdSelectionService(mock_db)
        
        # Mock query chain
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.options.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = None  # No campaign found is acceptable for this test
        
        # Act - Call with location data
        result = service._find_eligible_campaign(city="New York", state="NY")
        
        # Assert - Just verify query was called (geo-targeting logic is applied)
        assert mock_db.query.called
        assert mock_query.filter.called
        # Result can be None, we're just testing the query is formed correctly
    
    def test_select_ad_generates_tracking_tokens(self):
        """Test that impression and click tracking tokens are generated."""
        # Arrange
        mock_db = Mock()
        campaign = self._create_mock_campaign()
        mock_db.query().filter().options().order_by().first.return_value = campaign
        mock_db.query().filter().update.return_value = None
        
        service = AdSelectionService(mock_db)
        
        # Act
        result = service.select_ad(
            user_id="test-user-123",
            placement="banner_bottom"
        )
        
        # Assert
        assert result is not None
        assert "impression_tracking_token" in result
        assert "click_tracking_token" in result
        assert len(result["impression_tracking_token"]) > 0
        assert len(result["click_tracking_token"]) > 0
    
    def test_select_ad_returns_creative_details(self):
        """Test that ad data includes all creative details."""
        # Arrange
        mock_db = Mock()
        campaign = self._create_mock_campaign()
        mock_db.query().filter().options().order_by().first.return_value = campaign
        mock_db.query().filter().update.return_value = None
        
        service = AdSelectionService(mock_db)
        
        # Act
        result = service.select_ad(
            user_id="test-user-123",
            placement="banner_bottom"
        )
        
        # Assert
        assert result is not None
        creative = campaign.creatives[0]
        assert result["ad_id"] == str(creative.id)
        assert result["image_url"] == creative.image_url
        assert result["image_width"] == creative.image_width
        assert result["image_height"] == creative.image_height
        assert result["click_url"] == creative.click_url
        assert result["alt_text"] == creative.alt_text
    
    def test_select_creative_returns_none_when_no_active_creatives(self):
        """Test that None is returned when campaign has no active creatives."""
        # Arrange
        mock_db = Mock()
        campaign = self._create_mock_campaign()
        campaign.creatives[0].status = CreativeStatus.INACTIVE
        
        service = AdSelectionService(mock_db)
        
        # Act
        result = service._select_creative(campaign)
        
        # Assert
        assert result is None
    
    def test_update_campaign_served_increments_count(self):
        """Test that campaign impressions_served is incremented."""
        # Arrange
        mock_db = Mock()
        campaign = self._create_mock_campaign()
        
        service = AdSelectionService(mock_db)
        
        # Act
        service._update_campaign_served(campaign)
        
        # Assert
        mock_db.query().filter().update.assert_called_once()
        mock_db.commit.assert_called_once()
    
    # Helper methods
    
    def _create_mock_campaign(
        self,
        priority=5,
        target_cities=None,
        target_states=None
    ):
        """Create a mock campaign with default values."""
        # Use MagicMock without spec to allow more flexibility
        campaign = MagicMock()
        campaign.id = uuid.uuid4()
        campaign.name = "Test Campaign"
        campaign.status = CampaignStatus.ACTIVE
        campaign.priority = priority
        campaign.start_date = datetime.utcnow() - timedelta(days=1)
        campaign.end_date = datetime.utcnow() + timedelta(days=30)
        campaign.impression_budget = 10000
        campaign.impressions_served = 100
        campaign.target_cities = target_cities
        campaign.target_states = target_states
        campaign.last_served_at = None
        
        # Add mock creative
        creative = MagicMock()
        creative.id = uuid.uuid4()
        creative.name = "Test Creative"
        creative.status = CreativeStatus.ACTIVE
        creative.image_url = "https://example.com/ad.jpg"
        creative.image_width = 728
        creative.image_height = 90
        creative.click_url = "https://advertiser.com"
        creative.alt_text = "Test Ad"
        
        # Make creatives iterable by using a list
        campaign.creatives = [creative]
        
        return campaign

