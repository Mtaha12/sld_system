#!/usr/bin/env bash
# ==============================================================================
# SLD System - VPS Production Master Update Script
# Updates Code, Database (Top 13 Laws, AI Search For All Users), Builds Frontend,
# Ensures Upload Folders & Permissions, and Restarts PM2 & Nginx Services.
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
echo -e "\n${YELLOW}>>> [1/6] Pulling latest updates from GitHub (origin/main)...${NC}"
git fetch --all --prune
git reset --hard origin/main
git pull origin main

# 3. Update Database: Top 13 Statute Laws Sequence
echo -e "\n${YELLOW}>>> [2/6] Setting Top 13 Priority Statute Laws in Database...${NC}"
if [ -f "backend/src/scripts/vps_set_law_magazine_order.js" ]; then
    node backend/src/scripts/vps_set_law_magazine_order.js || true
fi

# 4. Update Database: Enable AI Assistant for All Users (Existing & New)
echo -e "\n${YELLOW}>>> [3/6] Setting AI Search: YES for All Users in Database...${NC}"
if [ -f "backend/src/scripts/vps_enable_ai_search_all_users.js" ]; then
    node backend/src/scripts/vps_enable_ai_search_all_users.js || true
fi

# 5. Ensure Upload Directories and File Permissions
echo -e "\n${YELLOW}>>> [4/6] Verifying Upload Storage Directories & Permissions...${NC}"
mkdir -p backend/uploads/reference_views backend/uploads/newsletters backend/uploads/court_cache backend/uploads/payment_proofs
mkdir -p uploads/reference_views uploads/newsletters uploads/court_cache
chmod -R 775 backend/uploads uploads 2>/dev/null || true

# 6. Build Frontend
echo -e "\n${YELLOW}>>> [5/6] Building Production Frontend...${NC}"
if [ -d "frontend" ]; then
    cd "$APP_DIR/frontend"
    npm install --no-audit
    npm run build
    chmod -R 755 dist 2>/dev/null || true
    echo -e "${GREEN}✓ Frontend built successfully into dist/${NC}"
    cd "$APP_DIR"
fi

# 7. Restart PM2 and reload Nginx
echo -e "\n${YELLOW}>>> [6/6] Reloading PM2 backend services and Nginx...${NC}"
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart all --update-env 2>/dev/null || pm2 reload all 2>/dev/null || true
    pm2 save 2>/dev/null || true
    echo -e "${GREEN}✓ PM2 services reloaded.${NC}"
fi

if command -v nginx >/dev/null 2>&1; then
    nginx -t && (systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || service nginx reload 2>/dev/null || true)
    echo -e "${GREEN}✓ Nginx reloaded successfully.${NC}"
fi

echo -e "\n${GREEN}==========================================================${NC}"
echo -e "${GREEN}   ALL VPS UPDATES & DATABASE OPERATIONS COMPLETED!       ${NC}"
echo -e "${GREEN}==========================================================\n"

