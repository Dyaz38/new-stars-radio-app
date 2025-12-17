"""
Ad Creative model.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Enum, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class CreativeStatus(str, enum.Enum):
    """Ad creative status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"


class AdCreative(Base):
    """
    Ad Creative model representing individual ad images/banners.
    """
    __tablename__ = "ad_creatives"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(255), nullable=False)
    
    # Image details
    image_url = Column(Text, nullable=False)
    image_width = Column(Integer, nullable=False)
    image_height = Column(Integer, nullable=False)
    
    # Click destination
    click_url = Column(Text, nullable=False)
    alt_text = Column(String(255), nullable=True)
    
    status = Column(
        Enum(CreativeStatus),
        nullable=False,
        default=CreativeStatus.ACTIVE
    )
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    campaign = relationship("Campaign", back_populates="creatives")
    impressions = relationship(
        "Impression",
        back_populates="ad_creative"
    )
    clicks = relationship(
        "Click",
        back_populates="ad_creative"
    )
    
    def __repr__(self):
        return f"<AdCreative {self.name} ({self.campaign_id})>"
