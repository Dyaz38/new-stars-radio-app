"""
API dependencies for authentication and authorization.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.portal_advertiser_access import list_portal_advertiser_ids
from app.core.security import verify_token
from app.models.user import User, UserRole

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token.
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("sub")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return authenticated user when Bearer token is valid; otherwise None."""
    if not credentials:
        return None
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            return None
        return user
    except Exception:
        return None


def _is_staff(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SALES_REP)


async def get_current_staff_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Admin panel access (not advertiser portal accounts)."""
    if not _is_staff(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return current_user


async def get_current_promoter_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.PROMOTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Promoter portal access required",
        )
    return current_user


async def get_current_advertiser_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if current_user.role != UserRole.ADVERTISER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Advertiser portal access required",
        )
    if not list_portal_advertiser_ids(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not linked to an advertiser. Contact New Stars Radio.",
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Require admin role.
    
    Raises:
        HTTPException: If user is not an admin
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user



































