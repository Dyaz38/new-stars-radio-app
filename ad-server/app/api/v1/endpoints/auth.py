"""
Authentication endpoints.
"""
import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.api.dependencies import get_current_user
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    UserResponse,
)
from app.models.user import User
from app.services.password_reset_email import (
    hash_password_reset_token,
    send_password_reset_email,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

FORGOT_PASSWORD_PUBLIC_MESSAGE = (
    "If an account exists for this email, we've sent password reset instructions. "
    "Check your inbox and spam folder."
)

router = APIRouter()


@router.post("/login")
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT token with user info.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    access_token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role.value
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        is_active=current_user.is_active
    )


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the current user's password.
    Requires current password for verification.
    """
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    db.refresh(current_user)
    return {"message": "Password updated successfully"}


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request password reset email",
)
async def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Sends a reset link if the email is registered (same response either way — no user enumeration).
    """
    email_norm = body.email.lower().strip()
    user = (
        db.query(User)
        .filter(func.lower(User.email) == email_norm)
        .first()
    )

    if user and user.is_active:
        raw_token = secrets.token_urlsafe(32)
        user.password_reset_token_hash = hash_password_reset_token(raw_token)
        user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=1)
        db.commit()

        base = settings.FRONTEND_ADMIN_URL.rstrip("/")
        reset_url = f"{base}/reset-password?token={raw_token}"

        def _send() -> None:
            try:
                send_password_reset_email(user.email, reset_url)
            except Exception as e:
                logger.exception("Background password reset email failed: %s", e)

        background_tasks.add_task(_send)
    else:
        logger.info("Forgot-password request for unknown or inactive email (no email sent)")

    return ForgotPasswordResponse(message=FORGOT_PASSWORD_PUBLIC_MESSAGE)


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    summary="Set new password with reset token",
)
async def reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Consume one-time token from email and set a new password."""
    token_hash = hash_password_reset_token(body.token.strip())
    now = datetime.utcnow()

    user = (
        db.query(User)
        .filter(
            User.password_reset_token_hash == token_hash,
            User.password_reset_expires_at.isnot(None),
            User.password_reset_expires_at > now,
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired. Request a new one from the login page.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive. Contact an administrator.",
        )

    user.hashed_password = get_password_hash(body.new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()

    return ResetPasswordResponse(
        message="Your password has been updated. You can sign in with your new password."
    )

