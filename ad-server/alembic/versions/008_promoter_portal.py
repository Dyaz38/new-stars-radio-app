"""Promoter portal role for self-service event submissions.

Revision ID: 008
Revises: 007
Create Date: 2026-10-28

"""
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'PROMOTER'")


def downgrade() -> None:
    pass
