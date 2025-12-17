#!/bin/bash
set -e

echo "🚀 Starting Ad Server production environment..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please copy .env.example to .env and configure all values"
    exit 1
fi

# Validate SECRET_KEY length
SECRET_KEY=$(grep SECRET_KEY .env | cut -d '=' -f2)
if [ ${#SECRET_KEY} -lt 32 ]; then
    echo "❌ Error: SECRET_KEY must be at least 32 characters!"
    echo "   Generate one with: openssl rand -hex 32"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p static/ads
mkdir -p logs
mkdir -p backups
echo "✓ Directories created"
echo ""

# Build and start containers
echo "🐳 Building and starting Docker containers..."
docker-compose -f docker-compose.prod.yml up -d --build
echo "✓ Containers started"
echo ""

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head
echo "✓ Migrations complete"
echo ""

# Seed initial data (only first time)
echo "🌱 Seeding initial database data..."
docker-compose -f docker-compose.prod.yml exec -T backend python -m app.db.seed
echo "✓ Seeding complete"
echo ""

echo "✅ Production environment ready!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Monitor with:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

