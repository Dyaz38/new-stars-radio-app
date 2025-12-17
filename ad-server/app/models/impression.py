"""
Impression tracking model.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from sqlalchemy.orm import relationship


class Impression(Base):
    """
    Impression model for tracking when ads are displayed to users.
    """
    __tablename__ = "impressions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad_creative_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ad_creatives.id", ondelete="CASCADE"),
        nullable=False
    )
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # User/Device identification
    user_id = Column(String(255), nullable=False, index=True)
    
    # Location data (optional)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    
    # Tracking
    timestamp = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    ad_creative = relationship("AdCreative", back_populates="impressions")
    campaign = relationship("Campaign", back_populates="impressions")
    
    # Composite indexes for reporting queries
    __table_args__ = (
        Index('idx_impression_campaign_timestamp', 'campaign_id', 'timestamp'),
        Index('idx_impression_user_campaign', 'user_id', 'campaign_id', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<Impression {self.id} - Campaign {self.campaign_id}>"
