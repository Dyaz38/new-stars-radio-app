"""Resolve advertiser IDs a portal user may access."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_advertiser_access import UserAdvertiserAccess


def list_portal_advertiser_ids(db: Session, user: User) -> list[UUID]:
    rows = (
        db.query(UserAdvertiserAccess.advertiser_id)
        .filter(UserAdvertiserAccess.user_id == user.id)
        .all()
    )
    ids = [row[0] for row in rows]
    if ids:
        return ids
    if user.advertiser_id:
        return [user.advertiser_id]
    return []


def user_can_access_advertiser(db: Session, user: User, advertiser_id: UUID) -> bool:
    return advertiser_id in list_portal_advertiser_ids(db, user)


def resolve_portal_advertiser_id(
    db: Session,
    user: User,
    advertiser_id: UUID | None,
) -> UUID:
    allowed = list_portal_advertiser_ids(db, user)
    if not allowed:
        raise ValueError("no_advertisers")
    if advertiser_id is None:
        if len(allowed) == 1:
            return allowed[0]
        raise ValueError("advertiser_id_required")
    if advertiser_id not in allowed:
        raise ValueError("forbidden")
    return advertiser_id


def sync_user_advertiser_assignments(
    db: Session,
    user: User,
    advertiser_ids: list[UUID],
) -> None:
    """Replace junction rows; set users.advertiser_id to the first client (default)."""
    unique_ids: list[UUID] = []
    for aid in advertiser_ids:
        if aid not in unique_ids:
            unique_ids.append(aid)
    if not unique_ids:
        return

    db.query(UserAdvertiserAccess).filter(UserAdvertiserAccess.user_id == user.id).delete()
    for aid in unique_ids:
        db.add(UserAdvertiserAccess(user_id=user.id, advertiser_id=aid))
    user.advertiser_id = unique_ids[0]
