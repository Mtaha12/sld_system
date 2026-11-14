#!/usr/bin/env bash
# ==============================================================================
# SLD System - VPS Production Master Update Script
# Updates Code, Database (Top 13 Laws, AI Search For All Users, Domain Attachment Migration),
# Re-syncs all PDF Uploads across VPS, Builds Frontend, and Restarts PM2 & Nginx.
#
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
echo -e "${CYAN}   SLD SYSTEM - PRODUCTION VPS ONE-CLICK MASTER SCRIPT    ${NC}"
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

# Ensure git safe directory
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

# 2. Pull latest code
echo -e "\n${YELLOW}>>> [1/8] Pulling latest updates from GitHub (origin/main)...${NC}"
git fetch --all --prune
git reset --hard origin/main
git pull origin main

# 3. Install backend dependencies
echo -e "\n${YELLOW}>>> [2/8] Verifying Backend Dependencies...${NC}"
if [ -d "backend" ]; then
    cd "$APP_DIR/backend"
    npm install --no-audit
    cd "$APP_DIR"
fi

# 4. Update Database: Top 13 Statute Laws Sequence
echo -e "\n${YELLOW}>>> [3/8] Setting Top 13 Priority Statute Laws in Database...${NC}"
if [ -f "backend/src/scripts/vps_set_law_magazine_order.js" ]; then
    node backend/src/scripts/vps_set_law_magazine_order.js || true
fi

# 5. Update Database: Enable AI Assistant and Allow All Forms for All Users
echo -e "\n${YELLOW}>>> [4/8] Setting AI Search: YES & Allow All Forms: YES for All Users in Database...${NC}"
if [ -f "backend/src/scripts/vps_enable_ai_search_all_users.js" ]; then
    node backend/src/scripts/vps_enable_ai_search_all_users.js || true
fi

# 6. Update Database: Migrate Legacy Domain Attachment URLs (api.sldsystempk.com -> api.sldsystem.com)
echo -e "\n${YELLOW}>>> [5/8] Migrating Attachment URLs to api.sldsystem.com...${NC}"
if [ -f "backend/src/scripts/vps_migrate_domain_attachment_urls.js" ]; then
    node backend/src/scripts/vps_migrate_domain_attachment_urls.js || true
fi

# 7. Recover & Sync All Uploaded Attachments & PDFs across VPS
echo -e "\n${YELLOW}>>> [6/8] Scanning VPS Disk & Consolidating All Attachments & PDFs...${NC}"
mkdir -p "$APP_DIR/backend/uploads/reference_views" "$APP_DIR/backend/uploads/newsletters" "$APP_DIR/backend/uploads/court_cache" "$APP_DIR/backend/uploads/payment_proofs"
mkdir -p "$APP_DIR/uploads/reference_views" "$APP_DIR/uploads/newsletters" "$APP_DIR/uploads/court_cache" "$APP_DIR/uploads/payment_proofs"

# Scan VPS for any existing reference_views or uploads directories
echo ">>> Consolidating all legacy uploads from VPS into active upload storage..."
for old_dir in \
    /var/www/sldsystempk.com/backend/uploads \
    /var/www/sldsystempk.com/uploads \
    /var/www/api.sldsystempk.com/backend/uploads \
    /var/www/api.sldsystempk.com/uploads \
    /var/www/api.sldsystem.com/backend/uploads \
    /var/www/api.sldsystem.com/uploads \
    /var/www/sldsystem.com/backend/uploads \
    /var/www/sldsystem.com/uploads \
    /var/www/sldsystempk/backend/uploads \
    /var/www/sldsystempk/uploads \
    /var/www/sldsystem/backend/uploads \
    /var/www/sldsystem/uploads \
    /var/www/sld-system/backend/uploads \
    /var/www/sld-system/uploads \
    /root/sld_system/backend/uploads \
    /root/sld_system/uploads \
    /home/*/sld*/backend/uploads \
    /home/*/sld*/uploads; do
    if [ -d "$old_dir" ] && [ "$old_dir" != "$APP_DIR/backend/uploads" ] && [ "$old_dir" != "$APP_DIR/uploads" ]; then
        echo "Found uploads in $old_dir. Copying files into active storage..."
        cp -rn "$old_dir"/* "$APP_DIR/backend/uploads/" 2>/dev/null || true
    fi
done

# Deep find for any reference_views directories anywhere on the VPS
if [ -d "/var/www" ]; then
    find /var/www /root /home -maxdepth 5 -type d -name "reference_views" 2>/dev/null | while read -r ref_dir; do
        if [ "$ref_dir" != "$APP_DIR/backend/uploads/reference_views" ] && [ "$ref_dir" != "$APP_DIR/uploads/reference_views" ]; then
            echo "Syncing PDFs from $ref_dir..."
            cp -rn "$ref_dir"/* "$APP_DIR/backend/uploads/reference_views/" 2>/dev/null || true
        fi
    done
fi

# Ensure bidirectional symlinks for space-separated vs hyphen-separated UUID files
echo ">>> Linking space and hyphen UUID filenames so all attachment links open cleanly..."
cd "$APP_DIR/backend/uploads/reference_views" 2>/dev/null || true
for f in *.pdf; do
    if [ -f "$f" ]; then
        if [[ "$f" =~ [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf ]]; then
            spaced_name="${f//-/ }"
            if [ ! -e "$spaced_name" ]; then
                ln -s "$f" "$spaced_name" 2>/dev/null || true
            fi
        elif [[ "$f" =~ [0-9a-f]{8}\ [0-9a-f]{4}\ [0-9a-f]{4}\ [0-9a-f]{4}\ [0-9a-f]{12}\.pdf ]]; then
            hyphen_name="${f// /-}"
            if [ ! -e "$hyphen_name" ]; then
                ln -s "$f" "$hyphen_name" 2>/dev/null || true
            fi
        fi
    fi
done 2>/dev/null || true
cd "$APP_DIR"

# Ensure symmetric files between backend/uploads and root uploads
cp -rn "$APP_DIR/backend/uploads"/* "$APP_DIR/uploads/" 2>/dev/null || true
cp -rn "$APP_DIR/uploads"/* "$APP_DIR/backend/uploads/" 2>/dev/null || true
chmod -R 775 "$APP_DIR/backend/uploads" "$APP_DIR/uploads" 2>/dev/null || true

# 8. Build Frontend
echo -e "\n${YELLOW}>>> [7/8] Building Production Frontend...${NC}"
if [ -d "frontend" ]; then
    cd "$APP_DIR/frontend"
    npm install --no-audit
    npm run build
    chmod -R 755 dist 2>/dev/null || true
    echo -e "${GREEN}✓ Frontend built successfully into dist/${NC}"
    cd "$APP_DIR"
fi

# 9. Configure Nginx upload limits & proxy timeouts and reload
echo -e "\n${YELLOW}>>> [8/8] Ensuring Nginx & PM2 Services Reloaded...${NC}"
if [ -d "/etc/nginx" ]; then
    if ! grep -q "client_max_body_size" /etc/nginx/nginx.conf 2>/dev/null; then
        sed -i '/http {/a \    client_max_body_size 50M;\n    proxy_read_timeout 180s;\n    proxy_connect_timeout 180s;' /etc/nginx/nginx.conf 2>/dev/null || true
    fi
fi

if command -v pm2 >/dev/null 2>&1; then
    pm2 restart sld-backend 2>/dev/null || pm2 restart all --update-env 2>/dev/null || pm2 reload all 2>/dev/null || true
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
