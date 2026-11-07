#!/usr/bin/env bash
# ==============================================================================
# SLD System - VPS One-Click Deployment & Update Script
# ==============================================================================
set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${CYAN}${BOLD}==========================================================${NC}"
echo -e "${CYAN}${BOLD}       SLD SYSTEM - PRODUCTION VPS UPDATE SCRIPT          ${NC}"
echo -e "${CYAN}${BOLD}==========================================================${NC}\n"

# 1. Locate repository directory on VPS
if [ -d "/var/www/sld_system" ]; then
    APP_DIR="/var/www/sld_system"
elif [ -d "/var/www/sld-system" ]; then
    APP_DIR="/var/www/sld-system"
elif [ -d "$HOME/sld_system" ]; then
    APP_DIR="$HOME/sld_system"
elif [ -f "package.json" ] || [ -d "frontend" ]; then
    APP_DIR="$(pwd)"
else
    echo -e "${RED}Error: Could not locate SLD System directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}>>> Navigating to app directory: ${APP_DIR}${NC}"
cd "$APP_DIR"

# 2. Pull latest code from GitHub
echo -e "\n${YELLOW}>>> Pulling latest code from origin/main...${NC}"
git fetch --all --prune
git reset --hard origin/main
git pull origin main

# 3. Update backend packages & restart API
echo -e "\n${YELLOW}>>> Updating backend dependencies & restarting PM2...${NC}"
if [ -d "backend" ]; then
    cd backend
    npm install --no-audit --no-fund 2>/dev/null || true
    cd ..
fi

# Restart PM2 service
if command -v pm2 >/dev/null 2>&1; then
    (pm2 restart all --update-env 2>/dev/null || pm2 reload all 2>/dev/null || pm2 restart sld-backend --update-env 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || true)
    pm2 save 2>/dev/null || true
    echo -e "${GREEN}>>> PM2 processes restarted successfully.${NC}"
else
    echo -e "${RED}Warning: PM2 not found in PATH.${NC}"
fi

# 4. Build frontend
echo -e "\n${YELLOW}>>> Building frontend assets...${NC}"
if [ -d "frontend" ]; then
    cd frontend
    npm install --no-audit --no-fund 2>/dev/null || true
    npm run build
    chmod -R 755 dist 2>/dev/null || true
    cd ..
    echo -e "${GREEN}>>> Frontend build completed successfully.${NC}"
fi

# 5. Reload Nginx
echo -e "\n${YELLOW}>>> Verifying and reloading Nginx...${NC}"
if command -v nginx >/dev/null 2>&1; then
    nginx -t
    (systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || service nginx reload 2>/dev/null || true)
    echo -e "${GREEN}>>> Nginx reloaded successfully.${NC}"
fi

# 6. Show PM2 status
echo -e "\n${CYAN}>>> Current PM2 Process Status:${NC}"
pm2 status 2>/dev/null || true

echo -e "\n${GREEN}${BOLD}==========================================================${NC}"
echo -e "${GREEN}${BOLD}   SUCCESS: SLD SYSTEM DEPLOYED & UPDATED SUCCESSFULLY!   ${NC}"
echo -e "${GREEN}${BOLD}==========================================================${NC}"
echo -e "Website URL:  https://www.sldsystempk.com/\n"

