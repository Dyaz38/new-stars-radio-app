#!/usr/bin/env python3
"""Startup script that reads PORT from environment and runs migrations."""
import os
import sys
import subprocess

# Run database migrations first
print("🔄 Running database migrations...")
migration_result = subprocess.run(["alembic", "upgrade", "head"])
if migration_result.returncode != 0:
    print("❌ Migration failed! Check your database connection.")
    sys.exit(1)
print("✅ Migrations complete")

# Seed admin user (only if it doesn't exist - the seed script handles this)
print("🌱 Checking for admin user...")
seed_result = subprocess.run([sys.executable, "-m", "app.db.seed"])
if seed_result.returncode == 0:
    print("✅ Admin user check complete")
else:
    print("⚠️  Admin user seeding had issues (may already exist)")

# Get PORT from environment or default to 8000
port = os.environ.get("PORT", "8000")

# Start uvicorn
print(f"🚀 Starting server on port {port}...")
cmd = [
    "uvicorn",
    "app.main:app",
    "--host", "0.0.0.0",
    "--port", str(port),
    # Railway terminates TLS at the edge; without this, redirects use http:// and HTTPS
    # frontends (e.g. Vercel admin) fail with mixed-content / ERR_NETWORK on trailing-slash redirects.
    "--proxy-headers",
    "--forwarded-allow-ips",
    "*",
]

sys.exit(subprocess.run(cmd).returncode)
