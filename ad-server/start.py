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

# Get PORT from environment or default to 8000
port = os.environ.get("PORT", "8000")

# Start uvicorn
print(f"🚀 Starting server on port {port}...")
cmd = [
    "uvicorn",
    "app.main:app",
    "--host", "0.0.0.0",
    "--port", str(port)
]

sys.exit(subprocess.run(cmd).returncode)
