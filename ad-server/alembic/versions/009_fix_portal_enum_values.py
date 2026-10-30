"""Ensure portal enum labels exist for SQLAlchemy name + value styles.

Revision ID: 009
Revises: 008
Create Date: 2026-10-30

"""
from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Initial schema used uppercase names (ADMIN, ACTIVE). Portal migrations mixed
    # lowercase values. Add both forms so inserts/reads do not fail on Postgres.
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADVERTISER'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'advertiser'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'PROMOTER'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'promoter'")
    op.execute("ALTER TYPE creativestatus ADD VALUE IF NOT EXISTS 'PENDING_REVIEW'")
    op.execute("ALTER TYPE creativestatus ADD VALUE IF NOT EXISTS 'pending_review'")


def downgrade() -> None:
    pass
