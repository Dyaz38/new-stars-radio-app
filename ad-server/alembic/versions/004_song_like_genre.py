"""Add genre to song_like_records

Revision ID: 004
Revises: 003
Create Date: 2026-03-28

"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "song_like_records",
        sa.Column("genre", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("song_like_records", "genre")
