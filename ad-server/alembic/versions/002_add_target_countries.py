"""add target_countries to campaigns

Revision ID: 002
Revises: 001
Create Date: 2025-12-26 17:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add target_countries column to campaigns table."""
    op.add_column(
        'campaigns',
        sa.Column('target_countries', postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    """Remove target_countries column from campaigns table."""
    op.drop_column('campaigns', 'target_countries')


