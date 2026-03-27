"""
Listener song like / unlike events (radio app — cataloged in PostgreSQL).
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Index, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SongLikeRecord(Base):
    """
    One row per like or unlike action from the radio web app.
    Used to build catalogs: top songs, trends, per-listener history (via listener_id).
    """

    __tablename__ = "song_like_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Normalized slug: artist-title (matches client song id)
    song_key = Column(String(512), nullable=False, index=True)
    artist = Column(String(500), nullable=False)
    title = Column(String(500), nullable=False)
    # Anonymous per-browser id (UUID from client localStorage)
    listener_id = Column(String(64), nullable=False, index=True)
    action = Column(String(16), nullable=False)  # "like" | "unlike"
    # From Airtime/stream metadata when available (e.g. Hip-Hop, Pop)
    genre = Column(String(200), nullable=True)
    # Optional client metadata for analytics
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        Index("idx_song_like_song_key_created", "song_key", "created_at"),
        Index("idx_song_like_listener_created", "listener_id", "created_at"),
    )

    def __repr__(self):
        return f"<SongLikeRecord {self.song_key} {self.action} {self.id}>"
