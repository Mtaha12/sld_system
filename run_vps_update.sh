#!/usr/bin/env bash
# ==============================================================================
# SLD System - VPS Production Judgments Import & TaxCard Purge Script
# Run this script directly on your VPS terminal:
#   bash run_vps_update.sh
# ==============================================================================
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${CYAN}==========================================================${NC}"
echo -e "${CYAN}   SLD SYSTEM - PRODUCTION VPS ONE-CLICK EXECUTION        ${NC}"
echo -e "${CYAN}==========================================================${NC}\n"

# 1. Locate repository directory
if [ -d "/var/www/sld_system" ]; then
    APP_DIR="/var/www/sld_system"
elif [ -d "/var/www/sld-system" ]; then
    APP_DIR="/var/www/sld-system"
elif [ -d "$HOME/sld_system" ]; then
    APP_DIR="$HOME/sld_system"
elif [ -f "package.json" ]; then
    APP_DIR="$(pwd)"
else
    echo -e "${RED}Error: Could not locate SLD System repository directory.${NC}"
    exit 1
fi

cd "$APP_DIR"
echo -e "${YELLOW}>>> Working Directory: ${APP_DIR}${NC}"

# 2. Pull latest code
echo -e "\n${YELLOW}>>> Pulling latest updates from GitHub (origin/main)...${NC}"
git fetch --all --prune
git reset --hard origin/main
git pull origin main

# 3. Run the database judgment import and tax card clean up
echo -e "\n${YELLOW}>>> Running database updates (filling judgments & deleting tax cards)...${NC}"
node backend/src/scripts/vps_import_judgments_and_clean.js

# 4. Restart PM2 backend service
echo -e "\n${YELLOW}>>> Restarting PM2 backend services...${NC}"
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart all --update-env 2>/dev/null || pm2 reload all 2>/dev/null || true
    echo -e "${GREEN}>>> PM2 processes reloaded.${NC}"
fi

echo -e "\n${GREEN}==========================================================${NC}"
echo -e "${GREEN}   ALL VPS UPDATES & DATABASE OPERATIONS COMPLETED!       ${NC}"
echo -e "${GREEN}==========================================================\n"

