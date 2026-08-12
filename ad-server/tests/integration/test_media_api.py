"""Integration tests for creative image proxy (/api/v1/media/i)."""
from __future__ import annotations

import io
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, event
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import String, TypeDecorator

from app.core.database import Base, get_db
from app.main import app
from app.models.ad_creative import AdCreative, CreativeStatus
from app.models.advertiser import Advertiser, AdvertiserStatus
from app.models.campaign import Campaign, CampaignStatus


class SQLiteUUID(TypeDecorator):
    """SQLite-compatible UUID type."""

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID())
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if isinstance(value, uuid.UUID):
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(Base.metadata, "before_create")
def _sqlite_uuid_columns(target, connection, **kw):
    for table in target.tables.values():
        for column in table.columns:
            if str(column.type) == "UUID":
                column.type = SQLiteUUID()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def creative_with_local_image(tmp_path, monkeypatch):
    static_dir = tmp_path / "static" / "creatives"
    static_dir.mkdir(parents=True)
    img = Image.new("RGB", (728, 90), color=(40, 120, 200))
    image_path = static_dir / "banner.png"
    img.save(image_path, format="PNG")
    monkeypatch.chdir(tmp_path)

    db = TestingSessionLocal()
    advertiser = Advertiser(
        name="Media Test Advertiser",
        email="media-test@example.com",
        status=AdvertiserStatus.ACTIVE,
    )
    db.add(advertiser)
    db.commit()
    db.refresh(advertiser)

    campaign = Campaign(
        advertiser_id=advertiser.id,
        name="Media Test Campaign",
        status=CampaignStatus.ACTIVE,
        start_date=datetime.utcnow() - timedelta(days=1),
        end_date=datetime.utcnow() + timedelta(days=30),
        priority=5,
        impression_budget=1000,
        impressions_served=0,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    creative = AdCreative(
        campaign_id=campaign.id,
        name="Local Banner",
        image_url="/static/creatives/banner.png",
        image_width=728,
        image_height=90,
        click_url="https://example.com",
        alt_text="Test banner",
        status=CreativeStatus.ACTIVE,
    )
    db.add(creative)
    db.commit()
    db.refresh(creative)
    creative_id = str(creative.id)
    db.close()
    return creative_id


class TestCreativeMediaEndpoint:
    def test_get_creative_image_success(self, creative_with_local_image):
        creative_id = creative_with_local_image
        response = client.get(f"/api/v1/media/i/{creative_id}")

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("image/")
        assert "max-age=86400" in response.headers.get("cache-control", "")
        assert len(response.content) > 100

        loaded = Image.open(io.BytesIO(response.content))
        assert loaded.size == (728, 90)

    def test_get_creative_image_not_found(self):
        missing_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/media/i/{missing_id}")
        assert response.status_code == 404
