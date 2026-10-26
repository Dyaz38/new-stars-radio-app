from uuid import uuid4

from app.models.user import User, UserRole
from app.services.portal_advertiser_access import (
    list_portal_advertiser_ids,
    resolve_portal_advertiser_id,
)


class _FakeDb:
    """Minimal stub — list_portal_advertiser_ids falls back to user.advertiser_id when no rows."""

    def query(self, *_args, **_kwargs):
        return self

    def filter(self, *_args, **_kwargs):
        return self

    def all(self):
        return []


def test_resolve_single_client_without_query_param():
    user = User(
        id=uuid4(),
        email="a@b.com",
        hashed_password="x",
        full_name="Agency",
        role=UserRole.ADVERTISER,
        advertiser_id=uuid4(),
    )
    db = _FakeDb()
    resolved = resolve_portal_advertiser_id(db, user, None)
    assert resolved == user.advertiser_id


def test_list_falls_back_to_advertiser_id():
    aid = uuid4()
    user = User(
        id=uuid4(),
        email="a@b.com",
        hashed_password="x",
        full_name="Client",
        role=UserRole.ADVERTISER,
        advertiser_id=aid,
    )
    assert list_portal_advertiser_ids(_FakeDb(), user) == [aid]
