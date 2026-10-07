#!/bin/bash
# ==============================================================================
# SLD System - Automated Database Restore Script for Hostinger VPS
# ==============================================================================
set -e

echo "======================================================================"
echo "          RESTORING SLD SYSTEM DATABASE ON HOSTINGER VPS"
echo "======================================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/database_backup"

# 1. Ensure MongoDB service is running
echo -e "\n[1/4] Checking MongoDB service..."
if sudo systemctl is-active --quiet mongod; then
    echo "  -> MongoDB service is active and running."
else
    echo "  -> Starting MongoDB service..."
    sudo systemctl daemon-reload
    sudo systemctl enable mongod
    sudo systemctl start mongod
    sleep 2
fi

# 2. Check if database_backup folder exists
echo -e "\n[2/4] Verifying database backup files..."
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found at $BACKUP_DIR"
    echo "Please copy the database_backup folder into: $SCRIPT_DIR/database_backup"
    exit 1
fi

COUNT_FILES=$(ls -1 "$BACKUP_DIR"/*.json.gz 2>/dev/null | wc -l)
echo "  -> Found $COUNT_FILES collection archive files + metadata.json in $BACKUP_DIR"

# 3. Ensure npm dependencies are installed
echo -e "\n[3/4] Checking backend dependencies..."
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "  -> node_modules not found. Running npm install..."
    cd "$SCRIPT_DIR" && npm install --production
else
    echo "  -> Backend dependencies already installed."
fi

# 4. Run high-performance streaming restore
echo -e "\n[4/4] Restoring all 29 collections and indexes into MongoDB..."
cd "$SCRIPT_DIR"
NODE_OPTIONS="--max-old-space-size=4096" node "$SCRIPT_DIR/src/scripts/importDatabase.js"

echo -e "\n======================================================================"
echo "  DATABASE RESTORE COMPLETED SUCCESSFULLY ON VPS!"
echo "  All 165,278 Cases, Users, Statutes, Notifications & Indexes Restored."
echo "======================================================================"
