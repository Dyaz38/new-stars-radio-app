"""
Simple rate limiting middleware for API endpoints.

For MVP, uses in-memory storage. For production, use Redis.
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


# In-memory rate limit storage
# Key: (client_ip, endpoint), Value: (request_count, window_start_time)
_rate_limit_store: Dict[Tuple[str, str], Tuple[int, datetime]] = {}

# Rate limit configuration
RATE_LIMITS = {
    "/api/v1/ads/request": (100, 60),  # 100 requests per 60 seconds
    "/api/v1/ads/tracking/impression": (200, 60),  # 200 requests per 60 seconds
    "/api/v1/ads/tracking/click": (200, 60),  # 200 requests per 60 seconds
}

# Default rate limit for unspecified endpoints
DEFAULT_RATE_LIMIT = (1000, 60)  # 1000 requests per 60 seconds


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware.
    
    Tracks request counts per IP address and endpoint.
    Uses sliding window algorithm.
    
    For production:
    - Use Redis for distributed rate limiting
    - Add more sophisticated algorithms (token bucket, leaky bucket)
    - Add rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
    """
    
    async def dispatch(self, request: Request, call_next):
        """Process request and apply rate limiting."""
        
        # Skip rate limiting for health check and docs
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Get endpoint path
        endpoint = request.url.path
        
        # Check rate limit
        is_allowed, remaining = self._check_rate_limit(client_ip, endpoint)
        
        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded: client={client_ip}, "
                f"endpoint={endpoint}"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": 60
                },
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self._get_limit(endpoint)[0]),
                    "X-RateLimit-Remaining": "0"
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        limit, _ = self._get_limit(endpoint)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Get client IP address from request.
        
        Checks X-Forwarded-For header for proxied requests.
        """
        # Check for X-Forwarded-For header (for proxied requests)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take the first IP in the list
            return forwarded.split(",")[0].strip()
        
        # Check for X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to client host
        return request.client.host if request.client else "unknown"
    
    def _get_limit(self, endpoint: str) -> Tuple[int, int]:
        """
        Get rate limit configuration for endpoint.
        
        Returns: (max_requests, window_seconds)
        """
        # Check for exact match
        if endpoint in RATE_LIMITS:
            return RATE_LIMITS[endpoint]
        
        # Check for prefix match
        for pattern, limit in RATE_LIMITS.items():
            if endpoint.startswith(pattern):
                return limit
        
        # Return default
        return DEFAULT_RATE_LIMIT
    
    def _check_rate_limit(self, client_ip: str, endpoint: str) -> Tuple[bool, int]:
        """
        Check if request is within rate limit.
        
        Returns: (is_allowed, remaining_requests)
        """
        global _rate_limit_store
        
        # Get limit configuration
        max_requests, window_seconds = self._get_limit(endpoint)
        
        # Create key
        key = (client_ip, endpoint)
        
        # Get current time
        now = datetime.utcnow()
        
        # Check if key exists in store
        if key in _rate_limit_store:
            count, window_start = _rate_limit_store[key]
            
            # Check if window has expired
            if now - window_start > timedelta(seconds=window_seconds):
                # Reset window
                _rate_limit_store[key] = (1, now)
                return True, max_requests - 1
            
            # Check if limit exceeded
            if count >= max_requests:
                return False, 0
            
            # Increment counter
            _rate_limit_store[key] = (count + 1, window_start)
            return True, max_requests - count - 1
        
        else:
            # First request from this client/endpoint
            _rate_limit_store[key] = (1, now)
            return True, max_requests - 1
    
    @staticmethod
    def cleanup_expired_entries():
        """
        Clean up expired entries from rate limit store.
        
        Should be called periodically to prevent memory leaks.
        For production, use Redis with TTL instead.
        """
        global _rate_limit_store
        
        now = datetime.utcnow()
        expired_keys = []
        
        # Find expired entries
        for key, (count, window_start) in _rate_limit_store.items():
            _, endpoint = key
            _, window_seconds = RATE_LIMITS.get(endpoint, DEFAULT_RATE_LIMIT)
            
            if now - window_start > timedelta(seconds=window_seconds * 2):
                expired_keys.append(key)
        
        # Remove expired entries
        for key in expired_keys:
            del _rate_limit_store[key]
        
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired rate limit entries")






