"""Initial database schema

Revision ID: 001_initial
Revises: 
Create Date: 2025-11-19 22:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('ADMIN', 'SALES_REP', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create advertisers table
    op.create_table(
        'advertisers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', name='advertiserstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create campaigns table
    op.create_table(
        'campaigns',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('advertiser_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.Enum('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', name='campaignstatus'), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('impression_budget', sa.Integer(), nullable=False),
        sa.Column('impressions_served', sa.Integer(), nullable=False),
        sa.Column('target_cities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('target_states', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_served_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['advertiser_id'], ['advertisers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_campaign_advertiser', 'campaigns', ['advertiser_id'], unique=False)
    op.create_index('idx_campaign_status', 'campaigns', ['status'], unique=False)
    op.create_index('idx_campaign_dates', 'campaigns', ['start_date', 'end_date'], unique=False)
    op.create_index('idx_campaign_priority', 'campaigns', ['priority'], unique=False)

    # Create ad_creatives table
    op.create_table(
        'ad_creatives',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('image_width', sa.Integer(), nullable=False),
        sa.Column('image_height', sa.Integer(), nullable=False),
        sa.Column('click_url', sa.Text(), nullable=False),
        sa.Column('alt_text', sa.String(length=255), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', name='creativestatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create impressions table
    op.create_table(
        'impressions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ad_creative_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=50), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ad_creative_id'], ['ad_creatives.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_impressions_user_id'), 'impressions', ['user_id'], unique=False)
    op.create_index(op.f('ix_impressions_timestamp'), 'impressions', ['timestamp'], unique=False)
    op.create_index('idx_impression_campaign_timestamp', 'impressions', ['campaign_id', 'timestamp'], unique=False)
    op.create_index('idx_impression_user_campaign', 'impressions', ['user_id', 'campaign_id', 'timestamp'], unique=False)

    # Create clicks table
    op.create_table(
        'clicks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ad_creative_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ad_creative_id'], ['ad_creatives.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_clicks_timestamp'), 'clicks', ['timestamp'], unique=False)
    op.create_index('idx_click_campaign_timestamp', 'clicks', ['campaign_id', 'timestamp'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('clicks')
    op.drop_table('impressions')
    op.drop_table('ad_creatives')
    op.drop_table('campaigns')
    op.drop_table('advertisers')
    op.drop_table('users')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS creativestatus')
    op.execute('DROP TYPE IF EXISTS campaignstatus')
    op.execute('DROP TYPE IF EXISTS advertiserstatus')
    op.execute('DROP TYPE IF EXISTS userrole')





