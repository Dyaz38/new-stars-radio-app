"""
Pydantic schemas for ad serving and tracking endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class AdRequestLocation(BaseModel):
    """Location data for ad targeting."""
    country: Optional[str] = Field(None, max_length=2, description="User's country (ISO 3166-1 alpha-2 code, e.g., 'NA' for Namibia)")
    city: Optional[str] = Field(None, max_length=100, description="User's city")
    state: Optional[str] = Field(None, max_length=50, description="User's state/province")
    
    @field_validator('country', 'city', 'state')
    @classmethod
    def validate_location(cls, v: Optional[str]) -> Optional[str]:
        """Validate and sanitize location strings."""
        if v is None:
            return None
        # Strip whitespace and validate length
        v = v.strip()
        if not v:
            return None
        return v.upper() if len(v) == 2 else v  # Uppercase country codes


class AdRequest(BaseModel):
    """Request body for ad serving endpoint."""
    user_id: str = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="Unique identifier for user/device",
        examples=["user-123", "device-abc-xyz"]
    )
    placement: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Ad placement identifier",
        examples=["banner_bottom", "sidebar_right", "popup"]
    )
    location: Optional[AdRequestLocation] = Field(
        None,
        description="Optional location data for geographic targeting"
    )
    
    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        """Validate user_id format (alphanumeric, dashes, underscores)."""
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("user_id must be alphanumeric with optional dashes/underscores")
        return v
    
    @field_validator('placement')
    @classmethod
    def validate_placement(cls, v: str) -> str:
        """Validate and normalize placement."""
        v = v.strip().lower()
        if not v:
            raise ValueError("placement cannot be empty")
        return v


class AdResponse(BaseModel):
    """Response for successful ad request."""
    ad_id: str = Field(..., description="UUID of the ad creative")
    campaign_id: str = Field(..., description="UUID of the campaign")
    image_url: str = Field(..., description="URL of the ad image")
    image_width: int = Field(..., gt=0, description="Image width in pixels")
    image_height: int = Field(..., gt=0, description="Image height in pixels")
    click_url: str = Field(..., description="Advertiser's destination URL")
    alt_text: str = Field(..., description="Alt text for the image")
    impression_tracking_token: str = Field(..., description="JWT token for impression tracking")
    click_tracking_token: str = Field(..., description="JWT token for click tracking")
    
    class Config:
        json_schema_extra = {
            "example": {
                "ad_id": "550e8400-e29b-41d4-a716-446655440000",
                "campaign_id": "660e8400-e29b-41d4-a716-446655440001",
                "image_url": "https://cdn.example.com/ads/banner-728x90.jpg",
                "image_width": 728,
                "image_height": 90,
                "click_url": "https://advertiser.com/landing",
                "alt_text": "Check out our amazing product!",
                "impression_tracking_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "click_tracking_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }


class NoAdResponse(BaseModel):
    """Response when no ad is available (fallback to AdSense)."""
    fallback: str = Field(default="adsense", description="Fallback provider")
    message: str = Field(
        default="No ad available, use fallback",
        description="Message explaining why no ad was served"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "fallback": "adsense",
                "message": "No ad available, use fallback"
            }
        }


class ImpressionTrackingRequest(BaseModel):
    """Request body for impression tracking."""
    ad_id: str = Field(..., description="UUID of the ad creative")
    campaign_id: str = Field(..., description="UUID of the campaign")
    user_id: str = Field(..., min_length=1, max_length=100, description="User/device identifier")
    tracking_token: str = Field(..., description="JWT token from ad request")
    timestamp: datetime = Field(..., description="When the impression occurred (ISO 8601)")
    location: Optional[AdRequestLocation] = Field(
        None,
        description="Optional location data"
    )
    
    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        """Validate user_id format."""
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("user_id must be alphanumeric with optional dashes/underscores")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "ad_id": "550e8400-e29b-41d4-a716-446655440000",
                "campaign_id": "660e8400-e29b-41d4-a716-446655440001",
                "user_id": "user-123",
                "tracking_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "timestamp": "2025-12-12T12:00:00Z",
                "location": {
                    "city": "New York",
                    "state": "NY"
                }
            }
        }


class ImpressionTrackingResponse(BaseModel):
    """Response for successful impression tracking."""
    impression_id: str = Field(..., description="UUID of the recorded impression")
    status: str = Field(default="tracked", description="Tracking status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "impression_id": "770e8400-e29b-41d4-a716-446655440002",
                "status": "tracked"
            }
        }


class ClickTrackingRequest(BaseModel):
    """Request body for click tracking."""
    ad_id: str = Field(..., description="UUID of the ad creative")
    campaign_id: str = Field(..., description="UUID of the campaign")
    user_id: str = Field(..., min_length=1, max_length=100, description="User/device identifier")
    tracking_token: str = Field(..., description="JWT token from ad request")
    timestamp: datetime = Field(..., description="When the click occurred (ISO 8601)")
    
    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        """Validate user_id format."""
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("user_id must be alphanumeric with optional dashes/underscores")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "ad_id": "550e8400-e29b-41d4-a716-446655440000",
                "campaign_id": "660e8400-e29b-41d4-a716-446655440001",
                "user_id": "user-123",
                "tracking_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "timestamp": "2025-12-12T12:00:05Z"
            }
        }


class ClickTrackingResponse(BaseModel):
    """Response for successful click tracking with redirect URL."""
    click_id: Optional[str] = Field(None, description="UUID of the recorded click (None if duplicate)")
    click_url: str = Field(..., description="URL to redirect the user to")
    duplicate: bool = Field(default=False, description="Whether this was a duplicate click")
    
    class Config:
        json_schema_extra = {
            "example": {
                "click_id": "880e8400-e29b-41d4-a716-446655440003",
                "click_url": "https://advertiser.com/landing",
                "duplicate": False
            }
        }








