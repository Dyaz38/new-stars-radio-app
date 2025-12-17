"""
User model for admin authentication.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration."""
    ADMIN = "admin"
    SALES_REP = "sales_rep"


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
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    def __repr__(self):
        return f"<User {self.email} ({self.role.value})>"
