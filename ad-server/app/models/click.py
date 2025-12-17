"""
Click tracking model.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Click(Base):
    """
    Click model for tracking when users click on ads.
    """
    __tablename__ = "clicks"
    
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
    user_id = Column(String(255), nullable=False)
    
    # Tracking
    timestamp = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    ad_creative = relationship("AdCreative", back_populates="clicks")
    campaign = relationship("Campaign", back_populates="clicks")
    
    # Index for reporting queries
    __table_args__ = (
        Index('idx_click_campaign_timestamp', 'campaign_id', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<Click {self.id} - Campaign {self.campaign_id}>"
