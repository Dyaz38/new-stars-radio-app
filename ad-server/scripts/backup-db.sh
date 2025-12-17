#!/bin/bash
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/adserver_backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

echo "💾 Backing up database..."

# Load environment variables
source .env 2>/dev/null || true

docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-adserver} > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_FILE"
    
    # Compress backup
    gzip $BACKUP_FILE
    echo "✅ Compressed: $BACKUP_FILE.gz"
    
    # Keep only last 7 days of backups
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
    echo "✅ Cleaned old backups (keeping last 7 days)"
else
    echo "❌ Backup failed!"
    exit 1
fi

