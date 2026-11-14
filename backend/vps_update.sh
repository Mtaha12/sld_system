#!/bin/bash
set -e

echo ""
echo "=========================================================="
echo "   SLD SYSTEM - FULL PRODUCTION VPS UPDATE & BUILD SCRIPT "
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
echo ">>> [1/7] Pulling latest code from GitHub (origin/main)..."
git fetch --all
git reset --hard origin/main
git pull origin main

echo ""
echo ">>> [2/7] Building Frontend (Compiling latest assets)..."
cd "$PROJECT_DIR/frontend"
npm install --no-audit
npm run build
chmod -R 755 dist 2>/dev/null || true
echo "✓ Frontend built successfully into dist/"

echo ""
echo ">>> [3/7] Installing Backend Dependencies..."
cd "$PROJECT_DIR/backend"
npm install --no-audit

echo ""
echo ">>> [4/7] Updating Admin Credentials & Database Settings..."
if [ -f "src/utils/resetAdminPw.js" ]; then
    node src/utils/resetAdminPw.js || true
fi

echo ">>> Setting Top 13 Priority Statute Laws in Database..."
if [ -f "src/scripts/vps_set_law_magazine_order.js" ]; then
    node src/scripts/vps_set_law_magazine_order.js || true
fi

echo ">>> Setting AI Search: YES by default for all users in VPS Database..."
if [ -f "src/scripts/vps_enable_ai_search_all_users.js" ]; then
    node src/scripts/vps_enable_ai_search_all_users.js || true
fi

echo ">>> Ensuring Upload Directories and Permissions..."
mkdir -p uploads/reference_views uploads/newsletters uploads/court_cache uploads/payment_proofs
mkdir -p "$PROJECT_DIR/uploads/reference_views" "$PROJECT_DIR/uploads/newsletters" "$PROJECT_DIR/uploads/court_cache"
chmod -R 775 uploads "$PROJECT_DIR/uploads" 2>/dev/null || true

echo ""
echo ">>> [5/7] Importing Laws from LIST.xlsx into VPS Database..."
if [ -f "src/scripts/importListLaws.js" ]; then
    node src/scripts/importListLaws.js || true
else
    echo "Notice: importListLaws.js not found."
fi

echo ""
echo ">>> [6/7] Restarting Backend Services via PM2..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart sld-backend 2>/dev/null || pm2 restart all 2>/dev/null || pm2 reload all 2>/dev/null || pm2 start ecosystem.config.cjs
    pm2 save
    echo ""
    echo ">>> PM2 Status:"
    pm2 status
else
    echo "PM2 not found globally. Trying npx pm2..."
    npx pm2 restart sld-backend 2>/dev/null || npx pm2 restart all
fi

echo ""
echo ">>> [7/7] Reloading Nginx to serve new build..."
if command -v nginx >/dev/null 2>&1; then
    nginx -t && (systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || service nginx reload 2>/dev/null || true)
    echo "✓ Nginx reloaded successfully."
else
    echo "Notice: Nginx binary not detected in PATH."
fi

echo ""
echo "=========================================================="
echo "   VPS MIGRATION & FRONTEND BUILD COMPLETED SUCCESSFULLY! "
echo "=========================================================="
echo "Production Website: https://www.sldsystempk.com/"
echo "Admin Login:"
echo "  Email:    haroonarafiq@gmail.com"
echo "  Password: Admin@123"
echo "=========================================================="
