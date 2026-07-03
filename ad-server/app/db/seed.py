"""
Database seed script to create initial admin user.
Run this after migrations with: python -m app.db.seed
"""
import logging
import sys

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.seed.starter_campaigns import seed_starter_campaigns

logger = logging.getLogger(__name__)

DEFAULT_ADMIN_EMAIL = "admin@newstarsradio.com"


def _resolve_admin_email() -> str:
    email = (settings.ADMIN_RESET_EMAIL or DEFAULT_ADMIN_EMAIL).lower().strip()
    return email or DEFAULT_ADMIN_EMAIL


def _resolve_reset_password() -> str:
    if settings.ADMIN_RESET_PASSWORD and settings.ADMIN_RESET_PASSWORD.strip():
        return settings.ADMIN_RESET_PASSWORD.strip()
    logger.warning(
        "ADMIN_PASSWORD_RESET is enabled but ADMIN_RESET_PASSWORD is not set — "
        "using default initial password. Set ADMIN_RESET_PASSWORD to a strong temporary password."
    )
    return settings.ADMIN_INITIAL_PASSWORD


def _apply_emergency_password_reset(db: Session, user: User, email: str) -> None:
    new_password = _resolve_reset_password()
    user.hashed_password = get_password_hash(new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    user.is_active = True
    db.commit()
    db.refresh(user)

    logger.warning(
        "BACKUP ADMIN PASSWORD RESET applied for %s — remove ADMIN_PASSWORD_RESET "
        "and ADMIN_RESET_PASSWORD from Railway immediately after signing in.",
        email,
    )
    print(f"✓ Backup admin password reset applied for {email}")
    print("  ⚠️  Remove ADMIN_PASSWORD_RESET (and ADMIN_RESET_PASSWORD) from Railway now.")
    if settings.DEBUG:
        print(f"  Temp password (debug only): {new_password}")


def create_initial_admin():
    """Create initial admin user for system access."""
    db: Session = SessionLocal()
    admin_email = _resolve_admin_email()

    try:
        existing_admin = (
            db.query(User)
            .filter(func.lower(User.email) == admin_email)
            .first()
        )

        if existing_admin:
            if settings.ADMIN_PASSWORD_RESET:
                _apply_emergency_password_reset(db, existing_admin, admin_email)
            else:
                print("✓ Admin user already exists")
            return

        initial_password = settings.ADMIN_INITIAL_PASSWORD
        admin_user = User(
            email=admin_email,
            hashed_password=get_password_hash(initial_password),
            full_name="Admin User",
            role=UserRole.ADMIN,
            is_active=True,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("✅ Created initial admin user:")
        print(f"   Email: {admin_email}")
        if settings.DEBUG:
            print(f"   Password: {initial_password}")
        print("   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY after first sign-in!")

    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def create_starter_campaigns():
    """Create house ad campaigns (Global + NA + ZA) if not already present."""
    db: Session = SessionLocal()
    try:
        created = seed_starter_campaigns(db)
        if created:
            print("✅ Created starter house ad campaigns (Global, NA, ZA)")
        else:
            print("✓ Starter house ad campaigns already configured")
    except Exception as e:
        print(f"❌ Error seeding starter campaigns: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Seeding database...")
    try:
        create_initial_admin()
        create_starter_campaigns()
        print("✅ Database seeding complete!")
    except Exception:
        sys.exit(1)
