#!/bin/bash
# ==============================================================================
# SLD SYSTEM - VPS MONGODB IMPORT SCRIPT (Bash)
# Run directly on VPS:  bash backend/src/scripts/vps_import_data.sh <path_to_archive.gz>
# ==============================================================================

set -e

ARCHIVE_PATH="$1"

if [ -z "$ARCHIVE_PATH" ]; then
  echo ""
  echo "Usage: bash backend/src/scripts/vps_import_data.sh <path_to_archive.gz>"
  echo ""
  echo "Available backups in /var/backups/sld_system/:"
  ls -lh /var/backups/sld_system/ 2>/dev/null || echo "No backups found."
  echo ""
  read -p "Enter path to .gz archive file: " ARCHIVE_PATH
fi

if [ ! -f "$ARCHIVE_PATH" ]; then
  echo "Error: File not found at $ARCHIVE_PATH"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SAFETY_BACKUP="/var/backups/sld_system/pre_import_safety_$TIMESTAMP.gz"

echo ""
echo "=========================================================="
echo "   SLD SYSTEM - IMPORT MONGODB DATA ON VPS                "
echo "=========================================================="
echo "Target Archive: $ARCHIVE_PATH"
echo ""

# 1. Take safety backup
echo ">>> [1/3] Creating safety backup of current database..."
mkdir -p /var/backups/sld_system
mongodump --db=sld_system --gzip --archive="$SAFETY_BACKUP"
echo "✓ Current database backed up to $SAFETY_BACKUP"

# 2. Restore
echo ""
echo ">>> [2/3] Restoring from $ARCHIVE_PATH..."
if [[ "$ARCHIVE_PATH" == *"statutes"* ]]; then
  echo "Restoring 'statutes' collection with --drop..."
  mongorestore --nsInclude="sld_system.statutes" --drop --gzip --archive="$ARCHIVE_PATH"
elif [[ "$ARCHIVE_PATH" == *"notif"* ]]; then
  echo "Restoring 'notifications' collection with --drop..."
  mongorestore --nsInclude="sld_system.notifications" --drop --gzip --archive="$ARCHIVE_PATH"
else
  echo "Restoring full database archive..."
  mongorestore --drop --gzip --archive="$ARCHIVE_PATH"
fi

# 3. Reload PM2
echo ""
echo ">>> [3/3] Reloading PM2 backend processes..."
pm2 restart all --update-env
pm2 save

echo ""
echo "=========================================================="
echo "   IMPORT COMPLETED SUCCESSFULLY!                         "
echo "=========================================================="
echo "Safety Backup: $SAFETY_BACKUP"
pm2 status
echo ""
