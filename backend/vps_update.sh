#!/bin/bash
set -e

echo ""
echo "=========================================================="
echo "   SLD SYSTEM - VPS MIGRATION & RESTART SCRIPT            "
echo "=========================================================="
echo ""

# Find project directory
if [ -d "/var/www/sld_system" ]; then
    PROJECT_DIR="/var/www/sld_system"
elif [ -d "/var/www/sld-system" ]; then
    PROJECT_DIR="/var/www/sld-system"
elif [ -d "$HOME/sld_system" ]; then
    PROJECT_DIR="$HOME/sld_system"
else
    PROJECT_DIR=$(pwd)
fi

echo ">>> Project Directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo ""
echo ">>> [1/4] Pulling latest updates from GitHub..."
git fetch --all
git reset --hard origin/main
git pull origin main

echo ""
echo ">>> [2/4] Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install --no-audit

echo ""
echo ">>> [3/4] Updating Admin Credentials in VPS Database..."
if [ -f "src/utils/resetAdminPw.js" ]; then
    node src/utils/resetAdminPw.js
else
    echo "Notice: resetAdminPw.js not found."
fi

echo ""
echo ">>> [4/4] Restarting Backend Service via PM2..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart sld-backend || pm2 restart all || pm2 reload all || pm2 start ecosystem.config.cjs
    pm2 save
    echo ""
    echo ">>> PM2 Status:"
    pm2 status
else
    echo "PM2 not found globally. Trying npx pm2..."
    npx pm2 restart sld-backend || npx pm2 restart all
fi

echo ""
echo "=========================================================="
echo "   VPS MIGRATION & RESTART COMPLETED SUCCESSFULLY!        "
echo "=========================================================="
echo "Admin Login:"
echo "  Email:    haroonarafiq@gmail.com"
echo "  Password: Admin@123"
echo "=========================================================="
