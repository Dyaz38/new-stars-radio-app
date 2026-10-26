"""Which advertiser records a portal user may manage (single client or agency)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserAdvertiserAccess(Base):
    __tablename__ = "user_advertiser_access"
    __table_args__ = (
        UniqueConstraint("user_id", "advertiser_id", name="uq_user_advertiser_access"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    advertiser_id = Column(
        UUID(as_uuid=True),
        ForeignKey("advertisers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user = relationship("User", back_populates="advertiser_access")
    advertiser = relationship("Advertiser")
