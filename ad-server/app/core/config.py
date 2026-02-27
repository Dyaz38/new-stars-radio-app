"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables.
"""
from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "New Stars Radio Ad Server"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/adserver_dev"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-minimum-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # CORS - can be string (comma-separated) or list. Set CORS_ORIGINS on Railway to override.
    CORS_ORIGINS: str | List[str] = (
        "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:8000,"
        "https://newstarsadminpanel.vercel.app,https://new-stars-radio-app.vercel.app"
    )
    
    # File Upload
    UPLOAD_DIR: str = "static/ads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

    # Cloudflare R2 (S3-compatible object storage) - when set, uploads go to R2 instead of disk
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: Optional[str] = None
    R2_PUBLIC_URL: Optional[str] = None  # e.g. https://pub-xxx.r2.dev or custom domain

    @property
    def r2_enabled(self) -> bool:
        """True if R2 is configured."""
        return bool(
            self.R2_ACCOUNT_ID
            and self.R2_ACCESS_KEY_ID
            and self.R2_SECRET_ACCESS_KEY
            and self.R2_BUCKET_NAME
            and self.R2_PUBLIC_URL
        )
    
    # Ad Serving
    DEFAULT_AD_PRIORITY: int = 5
    AD_SELECTION_TIMEOUT: int = 100  # milliseconds
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 1000
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json or console
    
    # Redis (for caching - optional for MVP)
    REDIS_URL: Optional[str] = None
    CACHE_TTL: int = 300  # 5 minutes
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list."""
        if v is None:
            return []
        if isinstance(v, str):
            if not v.strip():
                return []
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return v
        return []
    
    def get_cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list. Always includes production admin panel URL so login works."""
        if isinstance(self.CORS_ORIGINS, list):
            origins = list(self.CORS_ORIGINS)
        elif isinstance(self.CORS_ORIGINS, str):
            origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        else:
            origins = []
        # Ensure production URLs are always allowed
        for origin in [
            "https://newstarsadminpanel.vercel.app",
            "https://new-stars-radio-app.vercel.app",
        ]:
            if origin not in origins:
                origins.append(origin)
        return origins
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


# Create global settings instance
settings = Settings()
