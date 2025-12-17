"""
Campaign model.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Enum, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class CampaignStatus(str, enum.Enum):
    """Campaign status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class Campaign(Base):
    """
    Campaign model representing an advertising campaign.
    """
    __tablename__ = "campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    advertiser_id = Column(
        UUID(as_uuid=True),
        ForeignKey("advertisers.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(255), nullable=False)
    status = Column(
        Enum(CampaignStatus),
        nullable=False,
        default=CampaignStatus.DRAFT
    )
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    priority = Column(Integer, nullable=False, default=5)  # 1-10, higher = more priority
    impression_budget = Column(Integer, nullable=False)
    impressions_served = Column(Integer, nullable=False, default=0)
    
    # Targeting (optional)
    target_cities = Column(JSONB, nullable=True)  # Array of city names
    target_states = Column(JSONB, nullable=True)  # Array of state codes
    
    # Tracking
    last_served_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    advertiser = relationship("Advertiser", back_populates="campaigns")
    creatives = relationship(
        "AdCreative",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )
    impressions = relationship(
        "Impression",
        back_populates="campaign"
    )
    clicks = relationship(
        "Click",
        back_populates="campaign"
    )
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_campaign_advertiser', 'advertiser_id'),
        Index('idx_campaign_status', 'status'),
        Index('idx_campaign_dates', 'start_date', 'end_date'),
        Index('idx_campaign_priority', 'priority'),
    )
    
    def __repr__(self):
        return f"<Campaign {self.name} ({self.status.value})>"
    
    @property
    def remaining_impressions(self) -> int:
        """Calculate remaining impressions in budget."""
        return max(0, self.impression_budget - self.impressions_served)
    
    @property
    def budget_utilized_percentage(self) -> float:
        """Calculate percentage of budget utilized."""
        if self.impression_budget == 0:
            return 0.0
        return (self.impressions_served / self.impression_budget) * 100
