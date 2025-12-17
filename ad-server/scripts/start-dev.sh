#!/bin/bash
set -e

echo "🚀 Starting Ad Server development environment..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  Please review and update .env file with your settings"
    echo "   Press Enter to continue or Ctrl+C to exit and configure..."
    read
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p static/ads
mkdir -p logs
mkdir -p alembic/versions
echo "✓ Directories created"
echo ""

# Start containers
echo "🐳 Starting Docker containers..."
docker-compose up -d
echo "✓ Containers started"
echo ""

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
echo "🔄 Running database migrations..."
docker-compose exec -T backend alembic upgrade head
echo "✓ Migrations complete"
echo ""

# Seed initial data
echo "🌱 Seeding initial database data..."
docker-compose exec -T backend python -m app.db.seed
echo "✓ Seeding complete"
echo ""

echo "✅ Development environment ready!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Access Points:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌐 Backend API:     http://localhost:8000"
echo "  📚 API Docs:        http://localhost:8000/docs"
echo "  📖 ReDoc:           http://localhost:8000/redoc"
echo "  ❤️  Health Check:   http://localhost:8000/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Default Admin Login:"
echo "  📧 Email:    admin@newstarsradio.com"
echo "  🔑 Password: changeme123"
echo "  ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Useful commands:"
echo "  View logs:          docker-compose logs -f"
echo "  Stop:               docker-compose down"
echo "  Restart backend:    docker-compose restart backend"
echo "  Access database:    docker-compose exec postgres psql -U postgres -d adserver_dev"
echo ""

