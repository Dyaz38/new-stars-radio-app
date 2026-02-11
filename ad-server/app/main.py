"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from sqlalchemy import text
import logging
import sys
from pathlib import Path

from app.core.config import settings
from app.core.database import engine
from app.api.v1.router import api_router
from app.middleware import RateLimitMiddleware

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
)

# Allow any *.vercel.app origin (production + preview deployments) so login works from any Vercel URL
class VercelCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        origin = request.headers.get("origin")
        if origin and origin.endswith(".vercel.app"):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

app.add_middleware(VercelCORSMiddleware)

# Add CORS middleware (exact origins from config)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Mount static files directory
static_path = Path("static")
if static_path.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


def _cors_headers_for_request(origin: str | None) -> dict:
    """Return CORS headers if origin is allowed (so error responses don't get blocked by browser)."""
    if not origin:
        return {}
    allowed = settings.get_cors_origins_list()
    if origin in allowed:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Ensure 500 responses include CORS headers so the browser doesn't show a CORS error instead."""
    logger.exception("Unhandled exception: %s", exc)
    origin = request.headers.get("origin")
    headers = _cors_headers_for_request(origin)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


@app.on_event("startup")
async def startup_event():
    """Application startup event handler."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Log database configuration (without exposing password)
    db_url = settings.DATABASE_URL
    if db_url:
        # Mask password in logs
        if "@" in db_url:
            parts = db_url.split("@")
            if len(parts) == 2:
                masked_url = parts[0].split(":")[0] + ":***@" + parts[1]
                logger.info(f"Database URL configured: {masked_url}")
            else:
                logger.info(f"Database URL configured: {db_url[:50]}...")
        else:
            logger.warning("DATABASE_URL format may be incorrect")
    else:
        logger.error("DATABASE_URL is not set! Application may fail.")
    
    # Create static directories if they don't exist
    static_path.mkdir(exist_ok=True)
    (static_path / "ads").mkdir(exist_ok=True)
    
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event handler."""
    logger.info("Shutting down application")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers. Quick DB ping to verify readiness."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.warning("Health check: database unreachable: %s", e)
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "unreachable",
                "version": settings.VERSION,
            },
        )
    return {
        "status": "healthy",
        "database": "ok",
        "version": settings.VERSION,
    }
