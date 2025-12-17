"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2025-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
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
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create advertisers table
    op.create_table('advertisers',
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
    op.create_index(op.f('ix_advertisers_id'), 'advertisers', ['id'], unique=False)

    # Create campaigns table
    op.create_table('campaigns',
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
        sa.ForeignKeyConstraint(['advertiser_id'], ['advertisers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_campaigns_date_range', 'campaigns', ['start_date', 'end_date'], unique=False)
    op.create_index('ix_campaigns_status_priority', 'campaigns', ['status', 'priority'], unique=False)
    op.create_index(op.f('ix_campaigns_advertiser_id'), 'campaigns', ['advertiser_id'], unique=False)
    op.create_index(op.f('ix_campaigns_end_date'), 'campaigns', ['end_date'], unique=False)
    op.create_index(op.f('ix_campaigns_id'), 'campaigns', ['id'], unique=False)
    op.create_index(op.f('ix_campaigns_start_date'), 'campaigns', ['start_date'], unique=False)
    op.create_index(op.f('ix_campaigns_status'), 'campaigns', ['status'], unique=False)

    # Create ad_creatives table
    op.create_table('ad_creatives',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('image_width', sa.Integer(), nullable=True),
        sa.Column('image_height', sa.Integer(), nullable=True),
        sa.Column('click_url', sa.Text(), nullable=False),
        sa.Column('alt_text', sa.String(length=255), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', name='creativestatus'), nullable=False),
        sa.Column('times_served', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ad_creatives_campaign_id'), 'ad_creatives', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_ad_creatives_id'), 'ad_creatives', ['id'], unique=False)

    # Create impressions table
    op.create_table('impressions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ad_creative_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=50), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ad_creative_id'], ['ad_creatives.id'], ),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_impressions_campaign_timestamp', 'impressions', ['campaign_id', 'timestamp'], unique=False)
    op.create_index('ix_impressions_user_campaign', 'impressions', ['user_id', 'campaign_id', 'timestamp'], unique=False)
    op.create_index(op.f('ix_impressions_campaign_id'), 'impressions', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_impressions_timestamp'), 'impressions', ['timestamp'], unique=False)
    op.create_index(op.f('ix_impressions_user_id'), 'impressions', ['user_id'], unique=False)

    # Create clicks table
    op.create_table('clicks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ad_creative_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ad_creative_id'], ['ad_creatives.id'], ),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_clicks_campaign_timestamp', 'clicks', ['campaign_id', 'timestamp'], unique=False)
    op.create_index(op.f('ix_clicks_campaign_id'), 'clicks', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_clicks_timestamp'), 'clicks', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_clicks_timestamp'), table_name='clicks')
    op.drop_index(op.f('ix_clicks_campaign_id'), table_name='clicks')
    op.drop_index('ix_clicks_campaign_timestamp', table_name='clicks')
    op.drop_table('clicks')
    
    op.drop_index(op.f('ix_impressions_user_id'), table_name='impressions')
    op.drop_index(op.f('ix_impressions_timestamp'), table_name='impressions')
    op.drop_index(op.f('ix_impressions_campaign_id'), table_name='impressions')
    op.drop_index('ix_impressions_user_campaign', table_name='impressions')
    op.drop_index('ix_impressions_campaign_timestamp', table_name='impressions')
    op.drop_table('impressions')
    
    op.drop_index(op.f('ix_ad_creatives_id'), table_name='ad_creatives')
    op.drop_index(op.f('ix_ad_creatives_campaign_id'), table_name='ad_creatives')
    op.drop_table('ad_creatives')
    
    op.drop_index(op.f('ix_campaigns_status'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_start_date'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_id'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_end_date'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_advertiser_id'), table_name='campaigns')
    op.drop_index('ix_campaigns_status_priority', table_name='campaigns')
    op.drop_index('ix_campaigns_date_range', table_name='campaigns')
    op.drop_table('campaigns')
    
    op.drop_index(op.f('ix_advertisers_id'), table_name='advertisers')
    op.drop_table('advertisers')
    
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')

