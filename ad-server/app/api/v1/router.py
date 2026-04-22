"""
API v1 router that combines all endpoint routers.
"""
from fastapi import APIRouter

# Import endpoint routers
from app.api.v1.endpoints import (
    ads,
    auth,
    advertisers,
    campaigns,
    creatives,
    events,
    reports,
    stream_stats,
    likes,
    schedule,
)
from app.services.password_reset_email import password_reset_delivery_mode

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(ads.router, prefix="/ads", tags=["Ad Serving"])
api_router.include_router(advertisers.router, prefix="/advertisers", tags=["Advertisers"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])
api_router.include_router(creatives.router, prefix="/creatives", tags=["Creatives"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(stream_stats.router, prefix="/stream", tags=["Stream"])
api_router.include_router(likes.router, prefix="/likes", tags=["Song likes"])
api_router.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])

# Health check endpoint
@api_router.get("/health")
async def api_health():
    """API health check endpoint."""
    return {
        "status": "healthy",
        "api_version": "v1",
        "password_reset_email_delivery": password_reset_delivery_mode(),
    }





