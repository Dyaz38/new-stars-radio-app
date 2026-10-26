"""Advertiser portal: user.advertiser_id, advertiser role, creative pending_review

Revision ID: 006
Revises: 005
Create Date: 2026-10-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'advertiser'")
    op.execute("ALTER TYPE creativestatus ADD VALUE IF NOT EXISTS 'pending_review'")

    op.add_column(
        "users",
        sa.Column("advertiser_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_users_advertiser_id",
        "users",
        "advertisers",
        ["advertiser_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_advertiser_id", "users", ["advertiser_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_advertiser_id", table_name="users")
    op.drop_constraint("fk_users_advertiser_id", "users", type_="foreignkey")
    op.drop_column("users", "advertiser_id")
    # PostgreSQL cannot remove enum values safely; leave ADVERTISER / PENDING_REVIEW in place.
