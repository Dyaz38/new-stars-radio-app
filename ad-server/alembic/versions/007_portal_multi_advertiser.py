"""Portal users may access multiple advertisers (agencies).

Revision ID: 007
Revises: 006
Create Date: 2026-10-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_advertiser_access",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("advertiser_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["advertiser_id"], ["advertisers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "advertiser_id", name="uq_user_advertiser_access"),
    )
    op.create_index("ix_user_advertiser_access_user_id", "user_advertiser_access", ["user_id"])
    op.create_index("ix_user_advertiser_access_advertiser_id", "user_advertiser_access", ["advertiser_id"])

    op.execute(
        """
        INSERT INTO user_advertiser_access (id, user_id, advertiser_id)
        SELECT gen_random_uuid(), id, advertiser_id
        FROM users
        WHERE advertiser_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_user_advertiser_access_advertiser_id", table_name="user_advertiser_access")
    op.drop_index("ix_user_advertiser_access_user_id", table_name="user_advertiser_access")
    op.drop_table("user_advertiser_access")
