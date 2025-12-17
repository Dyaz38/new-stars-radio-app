"""
Advertiser model.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class AdvertiserStatus(str, enum.Enum):
    """Advertiser status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"


class Advertiser(Base):
    """
    Advertiser model representing companies/individuals who purchase ad space.
    """
    __tablename__ = "advertisers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    company_name = Column(String(255), nullable=True)
    status = Column(
        Enum(AdvertiserStatus),
        nullable=False,
        default=AdvertiserStatus.ACTIVE
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    campaigns = relationship(
        "Campaign",
        back_populates="advertiser",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Advertiser {self.name} ({self.status.value})>"
