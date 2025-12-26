"""
API endpoints for ad serving and tracking (QS-Prompt 3).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Union
import logging

from app.api.dependencies import get_db
from app.schemas.ad_serving import (
    AdRequest,
    AdResponse,
    NoAdResponse,
    ImpressionTrackingRequest,
    ImpressionTrackingResponse,
    ClickTrackingRequest,
    ClickTrackingResponse
)
from app.services.ad_selection import AdSelectionService
from app.services.tracking import TrackingService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/request",
    response_model=Union[AdResponse, NoAdResponse],
    status_code=status.HTTP_200_OK,
    summary="Request an ad",
    description="""
    Request an ad to display to a user.
    
    - **user_id**: Unique identifier for the user/device
    - **placement**: Ad placement identifier (e.g., 'banner_bottom')
    - **location**: Optional location data for geographic targeting
    
    Returns ad data with tracking tokens, or fallback instruction if no ad available.
    """,
    responses={
        200: {
            "description": "Ad successfully selected or fallback instruction",
            "content": {
                "application/json": {
                    "examples": {
                        "ad_available": {
                            "summary": "Ad Available",
                            "value": {
                                "ad_id": "550e8400-e29b-41d4-a716-446655440000",
                                "campaign_id": "660e8400-e29b-41d4-a716-446655440001",
                                "image_url": "https://cdn.example.com/ads/banner.jpg",
                                "image_width": 728,
                                "image_height": 90,
                                "click_url": "https://advertiser.com",
                                "alt_text": "Amazing Product",
                                "impression_tracking_token": "eyJhbGc...",
                                "click_tracking_token": "eyJhbGc..."
                            }
                        },
                        "no_ad": {
                            "summary": "No Ad Available",
                            "value": {
                                "fallback": "adsense",
                                "message": "No ad available, use fallback"
                            }
                        }
                    }
                }
            }
        },
        400: {"description": "Invalid request data"},
        500: {"description": "Internal server error"}
    }
)
async def request_ad(
    request: AdRequest,
    db: Session = Depends(get_db)
) -> Union[AdResponse, NoAdResponse]:
    """
    Request an ad to display.
    
    Returns an ad with tracking tokens if available,
    or a fallback instruction (e.g., for AdSense).
    """
    try:
        # Extract location data if provided
        country = request.location.country if request.location else None
        city = request.location.city if request.location else None
        state = request.location.state if request.location else None
        
        # Use AdSelectionService to select an ad
        ad_service = AdSelectionService(db)
        ad_data = ad_service.select_ad(
            user_id=request.user_id,
            placement=request.placement,
            country=country,
            city=city,
            state=state
        )
        
        # If no ad available, return fallback instruction
        if ad_data is None:
            logger.info(
                f"No ad available for user={request.user_id}, "
                f"placement={request.placement}, location={country}/{city}/{state}"
            )
            return NoAdResponse()
        
        # Return ad data
        logger.info(
            f"Serving ad: ad_id={ad_data['ad_id']}, "
            f"campaign_id={ad_data['campaign_id']}, user={request.user_id}"
        )
        return AdResponse(**ad_data)
        
    except Exception as e:
        logger.error(f"Error in request_ad: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process ad request"
        )


@router.post(
    "/tracking/impression",
    response_model=ImpressionTrackingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Track an ad impression",
    description="""
    Track when an ad is displayed to a user.
    
    - **ad_id**: UUID of the ad creative
    - **campaign_id**: UUID of the campaign
    - **user_id**: User/device identifier
    - **tracking_token**: JWT token from ad request
    - **timestamp**: When the impression occurred (ISO 8601)
    - **location**: Optional location data
    
    The tracking token is validated to prevent fraud and replay attacks.
    """,
    responses={
        201: {"description": "Impression successfully tracked"},
        400: {"description": "Invalid request or token validation failed"},
        404: {"description": "Ad or campaign not found"},
        500: {"description": "Internal server error"}
    }
)
async def track_impression(
    request: ImpressionTrackingRequest,
    db: Session = Depends(get_db)
) -> ImpressionTrackingResponse:
    """
    Track an ad impression.
    
    Validates the tracking token and records the impression.
    """
    try:
        # Extract location data if provided
        city = request.location.city if request.location else None
        state = request.location.state if request.location else None
        
        # Use TrackingService to track impression
        tracking_service = TrackingService(db)
        result = tracking_service.track_impression(
            ad_creative_id=request.ad_id,
            campaign_id=request.campaign_id,
            user_id=request.user_id,
            tracking_token=request.tracking_token,
            timestamp=request.timestamp,
            city=city,
            state=state
        )
        
        logger.info(
            f"Impression tracked: impression_id={result['impression_id']}, "
            f"ad_id={request.ad_id}, user={request.user_id}"
        )
        
        return ImpressionTrackingResponse(
            impression_id=result["impression_id"],
            status="tracked"
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions from tracking service
        raise
    except Exception as e:
        logger.error(f"Error in track_impression: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track impression"
        )


@router.post(
    "/tracking/click",
    response_model=ClickTrackingResponse,
    status_code=status.HTTP_200_OK,
    summary="Track an ad click",
    description="""
    Track when a user clicks on an ad.
    
    - **ad_id**: UUID of the ad creative
    - **campaign_id**: UUID of the campaign
    - **user_id**: User/device identifier
    - **tracking_token**: JWT token from ad request
    - **timestamp**: When the click occurred (ISO 8601)
    
    Returns the click URL for redirect. Duplicate clicks are detected but still redirected.
    """,
    responses={
        200: {"description": "Click tracked and redirect URL returned"},
        400: {"description": "Invalid request or token validation failed"},
        404: {"description": "Ad or campaign not found"},
        500: {"description": "Internal server error"}
    }
)
async def track_click(
    request: ClickTrackingRequest,
    db: Session = Depends(get_db)
) -> ClickTrackingResponse:
    """
    Track an ad click and return redirect URL.
    
    Validates the tracking token and records the click.
    Duplicate clicks are detected but still redirected.
    """
    try:
        # Use TrackingService to track click
        tracking_service = TrackingService(db)
        result = tracking_service.track_click(
            ad_creative_id=request.ad_id,
            campaign_id=request.campaign_id,
            user_id=request.user_id,
            tracking_token=request.tracking_token,
            timestamp=request.timestamp
        )
        
        logger.info(
            f"Click tracked: click_id={result.get('click_id')}, "
            f"ad_id={request.ad_id}, user={request.user_id}, "
            f"duplicate={result['duplicate']}"
        )
        
        return ClickTrackingResponse(
            click_id=result.get("click_id"),
            click_url=result["click_url"],
            duplicate=result["duplicate"]
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions from tracking service
        raise
    except Exception as e:
        logger.error(f"Error in track_click: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track click"
        )


@router.get(
    "/tracking/click/{token}",
    response_class=RedirectResponse,
    status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    summary="Track click via GET redirect",
    description="""
    Simplified click tracking via GET request with redirect.
    
    This endpoint allows click tracking via a simple GET request
    and immediately redirects the user to the advertiser's URL.
    
    - **token**: Combined tracking token containing ad_id, campaign_id, and timestamp
    
    This is the recommended method for click tracking in web environments.
    """,
    responses={
        307: {"description": "Redirecting to advertiser URL"},
        400: {"description": "Invalid token"},
        404: {"description": "Ad not found"},
        500: {"description": "Internal server error"}
    }
)
async def track_click_redirect(
    token: str,
    db: Session = Depends(get_db)
) -> RedirectResponse:
    """
    Track click and redirect to advertiser URL.
    
    This is a simplified endpoint that extracts tracking data
    from the token and immediately redirects.
    """
    try:
        from app.core.security import verify_tracking_token
        from datetime import datetime
        import uuid
        
        # Verify and decode the token
        payload = verify_tracking_token(token, "click")
        
        ad_id = payload.get("ad_id")
        campaign_id = payload.get("campaign_id")
        timestamp_str = payload.get("timestamp")
        
        if not all([ad_id, campaign_id, timestamp_str]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token payload"
            )
        
        # Parse timestamp
        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        
        # Generate a user_id from the token (for tracking purposes)
        user_id = f"redirect-{uuid.uuid4().hex[:8]}"
        
        # Track the click
        tracking_service = TrackingService(db)
        result = tracking_service.track_click(
            ad_creative_id=ad_id,
            campaign_id=campaign_id,
            user_id=user_id,
            tracking_token=token,
            timestamp=timestamp
        )
        
        logger.info(
            f"Click redirect: ad_id={ad_id}, "
            f"duplicate={result['duplicate']}, url={result['click_url']}"
        )
        
        # Redirect to advertiser URL
        return RedirectResponse(
            url=result["click_url"],
            status_code=status.HTTP_307_TEMPORARY_REDIRECT
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in track_click_redirect: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process click redirect"
        )
