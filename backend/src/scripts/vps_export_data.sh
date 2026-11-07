#!/bin/bash
# ==============================================================================
# SLD SYSTEM - VPS MONGODB EXPORT SCRIPT (Bash)
# Run directly on VPS:  bash backend/src/scripts/vps_export_data.sh
# ==============================================================================

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/sld_system"
mkdir -p "$BACKUP_DIR"

echo ""
echo "=========================================================="
echo "   SLD SYSTEM - EXPORT MONGODB DATA ON VPS                "
echo "=========================================================="
echo ""
echo "Select export option:"
echo "  [1] Statutes & Notifications only (Recommended)"
echo "  [2] Statutes only"
echo "  [3] Notifications only"
echo "  [4] Full Database (sld_system)"
read -p "Choose option [1-4] (Default: 1): " CHOICE
CHOICE=${CHOICE:-1}

case $CHOICE in
  2)
    ARCHIVE="$BACKUP_DIR/statutes_$TIMESTAMP.gz"
    echo ">>> Exporting 'statutes' collection to $ARCHIVE..."
    mongodump --db=sld_system --collection=statutes --gzip --archive="$ARCHIVE"
    ;;
  3)
    ARCHIVE="$BACKUP_DIR/notifications_$TIMESTAMP.gz"
    echo ">>> Exporting 'notifications' collection to $ARCHIVE..."
    mongodump --db=sld_system --collection=notifications --gzip --archive="$ARCHIVE"
    ;;
  4)
    ARCHIVE="$BACKUP_DIR/full_backup_$TIMESTAMP.gz"
    echo ">>> Exporting FULL DATABASE to $ARCHIVE..."
    mongodump --db=sld_system --gzip --archive="$ARCHIVE"
    ;;
  *)
    ARCHIVE_STATUTES="$BACKUP_DIR/statutes_$TIMESTAMP.gz"
    ARCHIVE_NOTIFS="$BACKUP_DIR/notifications_$TIMESTAMP.gz"
    echo ">>> Exporting 'statutes' to $ARCHIVE_STATUTES..."
    mongodump --db=sld_system --collection=statutes --gzip --archive="$ARCHIVE_STATUTES"
    echo ">>> Exporting 'notifications' to $ARCHIVE_NOTIFS..."
    mongodump --db=sld_system --collection=notifications --gzip --archive="$ARCHIVE_NOTIFS"
    ;;
esac

echo ""
echo "=========================================================="
echo "   EXPORT COMPLETED SUCCESSFULLY!                         "
echo "=========================================================="
ls -lh "$BACKUP_DIR"/*"$TIMESTAMP"*
echo ""
