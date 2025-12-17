"""
Integration tests for Ad Serving API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from sqlalchemy import create_engine, event, TypeDecorator, String
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid

from app.main import app
from app.core.database import Base, get_db


# Custom UUID type that works with SQLite
class SQLiteUUID(TypeDecorator):
    """SQLite-compatible UUID type."""
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID())
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)
from app.models.advertiser import Advertiser, AdvertiserStatus
from app.models.campaign import Campaign, CampaignStatus
from app.models.ad_creative import AdCreative, CreativeStatus


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Replace UUID type with SQLite-compatible version
@event.listens_for(Base.metadata, "before_create")
def receive_before_create(target, connection, **kw):
    """Replace UUID columns with String columns for SQLite."""
    for table in target.tables.values():
        for column in table.columns:
            if str(column.type) == 'UUID':
                column.type = SQLiteUUID()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Setup test database before each test and teardown after."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_campaign_with_creative():
    """Create a test campaign with an active creative."""
    db = TestingSessionLocal()
    
    # Create advertiser
    advertiser = Advertiser(
        name="Test Advertiser",
        email="test@example.com",
        status=AdvertiserStatus.ACTIVE
    )
    db.add(advertiser)
    db.commit()
    db.refresh(advertiser)
    
    # Create campaign
    campaign = Campaign(
        advertiser_id=advertiser.id,
        name="Test Campaign",
        status=CampaignStatus.ACTIVE,
        start_date=datetime.utcnow() - timedelta(days=1),
        end_date=datetime.utcnow() + timedelta(days=30),
        priority=5,
        impression_budget=10000,
        impressions_served=0
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Create creative
    creative = AdCreative(
        campaign_id=campaign.id,
        name="Test Creative",
        image_url="https://example.com/ad.jpg",
        image_width=728,
        image_height=90,
        click_url="https://advertiser.com",
        alt_text="Test Ad",
        status=CreativeStatus.ACTIVE
    )
    db.add(creative)
    db.commit()
    db.refresh(creative)
    
    db.close()
    
    return {
        "advertiser_id": str(advertiser.id),
        "campaign_id": str(campaign.id),
        "creative_id": str(creative.id)
    }


class TestAdRequestEndpoint:
    """Test cases for POST /api/v1/ads/request endpoint."""
    
    def test_request_ad_success(self, test_campaign_with_creative):
        """Test successful ad request."""
        response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-123",
                "placement": "banner_bottom"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "ad_id" in data
        assert "campaign_id" in data
        assert "image_url" in data
        assert "image_width" in data
        assert "image_height" in data
        assert "click_url" in data
        assert "alt_text" in data
        assert "impression_tracking_token" in data
        assert "click_tracking_token" in data
        
        # Verify data
        assert data["campaign_id"] == test_campaign_with_creative["campaign_id"]
        assert data["image_url"] == "https://example.com/ad.jpg"
        assert data["image_width"] == 728
        assert data["image_height"] == 90
    
    def test_request_ad_with_location(self, test_campaign_with_creative):
        """Test ad request with location data."""
        response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-123",
                "placement": "banner_bottom",
                "location": {
                    "city": "New York",
                    "state": "NY"
                }
            }
        )
        
        assert response.status_code == 200
    
    def test_request_ad_no_campaigns(self):
        """Test ad request when no campaigns available."""
        response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-123",
                "placement": "banner_bottom"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return fallback instruction
        assert data["fallback"] == "adsense"
        assert "message" in data
    
    def test_request_ad_invalid_user_id(self):
        """Test ad request with invalid user_id."""
        response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "invalid@user!",
                "placement": "banner_bottom"
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_request_ad_missing_fields(self):
        """Test ad request with missing required fields."""
        response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-123"
                # Missing placement
            }
        )
        
        assert response.status_code == 422  # Validation error


class TestImpressionTrackingEndpoint:
    """Test cases for POST /api/v1/ads/tracking/impression endpoint."""
    
    def test_track_impression_success(self, test_campaign_with_creative):
        """Test successful impression tracking."""
        # First, get an ad to get tracking tokens
        ad_response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-123",
                "placement": "banner_bottom"
            }
        )
        
        assert ad_response.status_code == 200
        ad_data = ad_response.json()
        
        # Track impression
        response = client.post(
            "/api/v1/ads/tracking/impression",
            json={
                "ad_id": ad_data["ad_id"],
                "campaign_id": ad_data["campaign_id"],
                "user_id": "test-user-123",
                "tracking_token": ad_data["impression_tracking_token"],
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert "impression_id" in data
        assert data["status"] == "tracked"
    
    def test_track_impression_with_location(self, test_campaign_with_creative):
        """Test impression tracking with location data."""
        # Get ad
        ad_response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-456",
                "placement": "banner_bottom"
            }
        )
        
        ad_data = ad_response.json()
        
        # Track impression with location
        response = client.post(
            "/api/v1/ads/tracking/impression",
            json={
                "ad_id": ad_data["ad_id"],
                "campaign_id": ad_data["campaign_id"],
                "user_id": "test-user-456",
                "tracking_token": ad_data["impression_tracking_token"],
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "location": {
                    "city": "Los Angeles",
                    "state": "CA"
                }
            }
        )
        
        assert response.status_code == 201
    
    def test_track_impression_duplicate_token(self, test_campaign_with_creative):
        """Test that using the same token twice fails."""
        # Get ad
        ad_response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-789",
                "placement": "banner_bottom"
            }
        )
        
        ad_data = ad_response.json()
        
        # Track impression first time
        response1 = client.post(
            "/api/v1/ads/tracking/impression",
            json={
                "ad_id": ad_data["ad_id"],
                "campaign_id": ad_data["campaign_id"],
                "user_id": "test-user-789",
                "tracking_token": ad_data["impression_tracking_token"],
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        )
        
        assert response1.status_code == 201
        
        # Try to track impression second time with same token
        response2 = client.post(
            "/api/v1/ads/tracking/impression",
            json={
                "ad_id": ad_data["ad_id"],
                "campaign_id": ad_data["campaign_id"],
                "user_id": "test-user-789-duplicate",
                "tracking_token": ad_data["impression_tracking_token"],  # Same token!
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        )
        
        assert response2.status_code == 400  # Should fail


class TestClickTrackingEndpoint:
    """Test cases for POST /api/v1/ads/tracking/click endpoint."""
    
    def test_track_click_success(self, test_campaign_with_creative):
        """Test successful click tracking."""
        # Get ad
        ad_response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-click-1",
                "placement": "banner_bottom"
            }
        )
        
        ad_data = ad_response.json()
        
        # Track click
        response = client.post(
            "/api/v1/ads/tracking/click",
            json={
                "ad_id": ad_data["ad_id"],
                "campaign_id": ad_data["campaign_id"],
                "user_id": "test-user-click-1",
                "tracking_token": ad_data["click_tracking_token"],
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "click_id" in data
        assert "click_url" in data
        assert data["click_url"] == "https://advertiser.com"
        assert data["duplicate"] is False
    
    def test_track_click_duplicate(self, test_campaign_with_creative):
        """Test that duplicate clicks are detected but still redirect."""
        # Get ad
        ad_response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-click-2",
                "placement": "banner_bottom"
            }
        )
        
        ad_data = ad_response.json()
        
        # Track click first time
        response1 = client.post(
            "/api/v1/ads/tracking/click",
            json={
                "ad_id": ad_data["ad_id"],
                "campaign_id": ad_data["campaign_id"],
                "user_id": "test-user-click-2",
                "tracking_token": ad_data["click_tracking_token"],
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        )
        
        assert response1.status_code == 200
        assert response1.json()["duplicate"] is False
        
        # Track click second time
        response2 = client.post(
            "/api/v1/ads/tracking/click",
            json={
                "ad_id": ad_data["ad_id"],
                "campaign_id": ad_data["campaign_id"],
                "user_id": "test-user-click-2-dup",
                "tracking_token": ad_data["click_tracking_token"],
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        )
        
        assert response2.status_code == 200
        data = response2.json()
        assert data["duplicate"] is True
        assert data["click_url"] == "https://advertiser.com"  # Still redirects


class TestClickRedirectEndpoint:
    """Test cases for GET /api/v1/ads/tracking/click/{token} endpoint."""
    
    def test_click_redirect_success(self, test_campaign_with_creative):
        """Test successful click tracking with redirect."""
        # Get ad
        ad_response = client.post(
            "/api/v1/ads/request",
            json={
                "user_id": "test-user-redirect-1",
                "placement": "banner_bottom"
            }
        )
        
        ad_data = ad_response.json()
        token = ad_data["click_tracking_token"]
        
        # Track click via GET redirect
        response = client.get(
            f"/api/v1/ads/tracking/click/{token}",
            follow_redirects=False
        )
        
        assert response.status_code == 307  # Temporary redirect
        assert response.headers["location"] == "https://advertiser.com"


class TestRateLimiting:
    """Test cases for rate limiting middleware."""
    
    def test_rate_limit_not_exceeded(self, test_campaign_with_creative):
        """Test that normal usage doesn't hit rate limits."""
        # Make several requests (under limit)
        for i in range(10):
            response = client.post(
                "/api/v1/ads/request",
                json={
                    "user_id": f"test-user-{i}",
                    "placement": "banner_bottom"
                }
            )
            
            assert response.status_code == 200
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers

