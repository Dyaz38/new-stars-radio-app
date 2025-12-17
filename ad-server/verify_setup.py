"""
Quick verification script to check if the setup is correct.
Run with: python verify_setup.py
"""
import sys
from pathlib import Path

def check_file_exists(file_path: str) -> bool:
    """Check if a file exists."""
    return Path(file_path).exists()

def verify_setup():
    """Verify that all necessary files are in place."""
    print("🔍 Verifying Ad Server Setup...\n")
    
    required_files = [
        ("requirements.txt", "Python dependencies"),
        ("Dockerfile", "Docker configuration"),
        ("docker-compose.yml", "Docker Compose configuration"),
        ("alembic.ini", "Alembic configuration"),
        ("env.example", "Environment variables example"),
        ("app/main.py", "FastAPI application"),
        ("app/core/config.py", "Application configuration"),
        ("app/core/database.py", "Database connection"),
        ("app/core/security.py", "Security utilities"),
        ("app/models/user.py", "User model"),
        ("app/models/advertiser.py", "Advertiser model"),
        ("app/models/campaign.py", "Campaign model"),
        ("app/models/ad_creative.py", "Ad Creative model"),
        ("app/models/impression.py", "Impression model"),
        ("app/models/click.py", "Click model"),
        ("alembic/env.py", "Alembic environment"),
        ("alembic/versions/20251119_initial_schema.py", "Initial migration"),
        ("app/db/seed.py", "Database seed script"),
    ]
    
    all_good = True
    for file_path, description in required_files:
        exists = check_file_exists(file_path)
        status = "✅" if exists else "❌"
        print(f"{status} {description:<40} ({file_path})")
        if not exists:
            all_good = False
    
    print("\n" + "="*70)
    if all_good:
        print("✅ All files are in place!")
        print("\nNext steps:")
        print("1. Copy env.example to .env")
        print("2. Run: docker-compose up -d")
        print("3. Run: docker-compose exec backend alembic upgrade head")
        print("4. Run: docker-compose exec backend python -m app.db.seed")
        print("5. Visit: http://localhost:8000/docs")
        return 0
    else:
        print("❌ Some files are missing. Please check the setup.")
        return 1

if __name__ == "__main__":
    sys.exit(verify_setup())





