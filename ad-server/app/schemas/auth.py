"""
Authentication schemas.
"""
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response schema."""
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True



































