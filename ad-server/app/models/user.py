"""
User model for admin authentication.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration."""
    ADMIN = "admin"
    SALES_REP = "sales_rep"
    ADVERTISER = "advertiser"
    PROMOTER = "promoter"


class User(Base):
    """
    User model for system administrators and sales representatives.
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.SALES_REP)
    advertiser_id = Column(
        UUID(as_uuid=True),
        ForeignKey("advertisers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    advertiser = relationship("Advertiser", backref="portal_users")
    advertiser_access = relationship(
        "UserAdvertiserAccess",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    # Password reset (SHA-256 hex of token; raw token only sent by email)
    password_reset_token_hash = Column(String(64), nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    def __repr__(self):
        return f"<User {self.email} ({self.role.value})>"
