"""
Database seed script to create initial admin user.
Run this after migrations with: python -m app.db.seed
"""
import os
import sys
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.seed.starter_campaigns import seed_starter_campaigns


def create_initial_admin():
    """Create initial admin user for system access."""
    db: Session = SessionLocal()
    reset_password = os.environ.get("ADMIN_PASSWORD_RESET", "").lower() == "true"

    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(
            User.email == "admin@newstarsradio.com"
        ).first()

        if existing_admin:
            if reset_password:
                existing_admin.hashed_password = get_password_hash("changeme123")
                db.commit()
                db.refresh(existing_admin)
                print("✓ Admin password reset to changeme123")
            else:
                print("✓ Admin user already exists")
            return

        # Create admin user
        admin_user = User(
            email="admin@newstarsradio.com",
            hashed_password=get_password_hash("changeme123"),
            full_name="Admin User",
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Created initial admin user:")
        print(f"   Email: admin@newstarsradio.com")
        print(f"   Password: changeme123")
        print("   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!")
        
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
