"""
Authentication schemas.
"""
from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    """Change password request schema."""
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    """User response schema."""
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    """Request a password reset email."""
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Generic message — does not reveal whether the email exists."""
    message: str


class ResetPasswordRequest(BaseModel):
    """Complete password reset using token from email link."""
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str



































