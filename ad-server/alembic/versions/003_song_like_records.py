"""song_like_records for radio app like catalog

Revision ID: 003
Revises: 002
Create Date: 2026-03-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "song_like_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("song_key", sa.String(length=512), nullable=False),
        sa.Column("artist", sa.String(length=500), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("listener_id", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=16), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_song_like_records_song_key", "song_like_records", ["song_key"], unique=False)
    op.create_index("ix_song_like_records_listener_id", "song_like_records", ["listener_id"], unique=False)
    op.create_index("ix_song_like_records_created_at", "song_like_records", ["created_at"], unique=False)
    op.create_index(
        "idx_song_like_song_key_created", "song_like_records", ["song_key", "created_at"], unique=False
    )
    op.create_index(
        "idx_song_like_listener_created", "song_like_records", ["listener_id", "created_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index("idx_song_like_listener_created", table_name="song_like_records")
    op.drop_index("idx_song_like_song_key_created", table_name="song_like_records")
    op.drop_index("ix_song_like_records_created_at", table_name="song_like_records")
    op.drop_index("ix_song_like_records_listener_id", table_name="song_like_records")
    op.drop_index("ix_song_like_records_song_key", table_name="song_like_records")
    op.drop_table("song_like_records")
