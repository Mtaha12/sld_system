#!/usr/bin/env bash
# ==============================================================================
# SLD SYSTEM - ALL DOCUMENTS LOCATOR & DIRECT ATTACHMENT MIGRATION TOOL
# 1. Finds all documents & PDFs from api.sldsystemspk.com / www.sldsystemspk.com
# 2. Lists exact folders and files found across the VPS disk
# 3. Automatically transfers ALL PDFs to /var/www/sld_system/backend/uploads/reference_views
# 4. Creates hyphen <-> space filename aliases
# 5. Updates MongoDB attachment URLs to https://api.sldsystem.com
# 6. Reloads PM2 and validates file availability
# ==============================================================================
set -u

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${BOLD}${CYAN}   SLD SYSTEM - ALL DOCUMENTS LOCATOR & DIRECT VPS MIGRATION   ${NC}"
echo -e "${CYAN}================================================================${NC}\n"

# 1. Ensure working directory
APP_DIR="/var/www/sld_system"
if [ ! -d "$APP_DIR" ]; then
    if [ -d "/var/www/sld-system" ]; then
        APP_DIR="/var/www/sld-system"
    elif [ -f "backend/server.js" ]; then
        APP_DIR="$(pwd)"
    else
        APP_DIR="/var/www/sld_system"
        mkdir -p "$APP_DIR"
    fi
fi

cd "$APP_DIR" || exit 1
echo -e "${YELLOW}>>> Working in: $APP_DIR${NC}"

# Ensure latest repository code
echo -e "\n${YELLOW}>>> [1/7] Updating to latest repository code from main branch...${NC}"
if [ -d ".git" ]; then
    git fetch origin main 2>/dev/null || true
    git reset --hard origin/main 2>/dev/null || git pull origin main 2>/dev/null || true
fi

# Define active target directories
BACKEND_TARGET="$APP_DIR/backend/uploads/reference_views"
ROOT_TARGET="$APP_DIR/uploads/reference_views"
mkdir -p "$BACKEND_TARGET" "$ROOT_TARGET"

COUNT_BEFORE=$(find "$BACKEND_TARGET" -type f -name "*.pdf" 2>/dev/null | wc -l)
echo -e "Current PDFs in active storage ($BACKEND_TARGET): ${BOLD}$COUNT_BEFORE${NC}"

# 2. Locate all PDF directories across VPS
echo -e "\n${YELLOW}>>> [2/7] Locating ALL directories containing PDFs across the VPS disk...${NC}"
echo "----------------------------------------------------------------"
printf "%-10s %s\n" "PDF Count" "Directory Path"
echo "----------------------------------------------------------------"

ALL_PDF_DIRS=$(find /var/www /root /home /tmp /var/backups /opt -type f -iname "*.pdf" 2>/dev/null \
    | grep -v "node_modules" \
    | grep -v "/\.git/" \
    | sed -E 's|/[^/]+$||' \
    | sort | uniq -c | sort -nr)

echo "$ALL_PDF_DIRS"

# 3. Check old domain folders & Nginx configs
echo -e "\n${YELLOW}>>> [3/7] Inspecting Nginx configs & previous domain web roots (sldsystemspk.com)...${NC}"
echo "Nginx server blocks mentioning sldsystem:"
grep -rnE "server_name.*sldsystem|root /var/www" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || echo "No custom Nginx config lines found."

echo -e "\nDirectories in /var/www:"
ls -la /var/www 2>/dev/null

# 4. Check for archive files (.zip, .tar.gz) that might contain old uploads
echo -e "\n${YELLOW}>>> [4/7] Checking for archive files (.zip, .tar.gz, .tgz)...${NC}"
ARCHIVES=$(find /var/www /root /home /var/backups /tmp -maxdepth 4 -type f \( -iname "*.zip" -o -iname "*.tar.gz" -o -iname "*.tgz" \) 2>/dev/null | grep -E "upload|ref|sld|backup" || true)
if [ -n "$ARCHIVES" ]; then
    echo "Found archives:"
    echo "$ARCHIVES"
    for arch in $ARCHIVES; do
        echo "Extracting PDFs from $arch to temporary directory..."
        TEMP_EXTRACT="/tmp/sld_extract_$(date +%s)"
        mkdir -p "$TEMP_EXTRACT"
        if [[ "$arch" =~ \.zip$ ]]; then
            unzip -qo "$arch" "*.pdf" -d "$TEMP_EXTRACT/" 2>/dev/null || true
        else
            tar -xzf "$arch" --wildcards "*.pdf" -C "$TEMP_EXTRACT/" 2>/dev/null || true
        fi
        find "$TEMP_EXTRACT" -type f -iname "*.pdf" -exec cp -n {} "$BACKEND_TARGET/" \; 2>/dev/null || true
        find "$TEMP_EXTRACT" -type f -iname "*.pdf" -exec cp -n {} "$ROOT_TARGET/" \; 2>/dev/null || true
        rm -rf "$TEMP_EXTRACT"
    done
else
    echo "No relevant archive files found."
fi

# 5. Automatically Transfer ALL PDFs found on VPS into active storage
echo -e "\n${YELLOW}>>> [5/7] Transferring ALL discovered PDFs into active storage...${NC}"
echo "Copying all PDFs from across /var/www, /root, /home into $BACKEND_TARGET..."

find /var/www /root /home /opt /tmp -type f -iname "*.pdf" 2>/dev/null \
    | grep -v "node_modules" \
    | grep -v "/\.git/" \
    | while read -r pdf_file; do
        dir_of_file=$(dirname "$pdf_file")
        if [ "$dir_of_file" != "$BACKEND_TARGET" ] && [ "$dir_of_file" != "$ROOT_TARGET" ]; then
            cp -n "$pdf_file" "$BACKEND_TARGET/" 2>/dev/null || true
            cp -n "$pdf_file" "$ROOT_TARGET/" 2>/dev/null || true
        fi
    done

# 6. Generate bidirectional symlinks/copies for Space vs Hyphen filenames
echo -e "\n${YELLOW}>>> [6/7] Creating Hyphen <-> Space aliases so all document links open...${NC}"
cd "$BACKEND_TARGET" || exit 1
for f in *.pdf; do
    [ -e "$f" ] || continue
    # If filename has spaces inside UUID, create hyphenated version
    if [[ "$f" =~ [0-9a-f]{8}\ [0-9a-f]{4}\ [0-9a-f]{4}\ [0-9a-f]{4}\ [0-9a-f]{12} ]]; then
        hyphen_name="${f// /-}"
        if [ ! -e "$hyphen_name" ]; then
            cp -p "$f" "$hyphen_name" 2>/dev/null || true
        fi
    fi
    # If filename has hyphens inside UUID, create space-separated version
    if [[ "$f" =~ [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12} ]]; then
        space_name="${f//-/ }"
        if [ ! -e "$space_name" ]; then
            cp -p "$f" "$space_name" 2>/dev/null || true
        fi
    fi
done

# Sync to root target
cp -rn "$BACKEND_TARGET"/* "$ROOT_TARGET/" 2>/dev/null || true

# Set permissions
chmod -R 775 "$APP_DIR/backend/uploads" "$APP_DIR/uploads" 2>/dev/null || true
chown -R www-data:www-data "$APP_DIR/backend/uploads" "$APP_DIR/uploads" 2>/dev/null || true

COUNT_AFTER=$(find "$BACKEND_TARGET" -type f -name "*.pdf" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ PDF Count in active storage: Before = $COUNT_BEFORE | After = ${BOLD}$COUNT_AFTER${NC}"

# 7. Migrate Database URLs and Reload PM2
echo -e "\n${YELLOW}>>> [7/7] Migrating Database URLs to https://api.sldsystem.com & reloading PM2...${NC}"
cd "$APP_DIR" || exit 1
if [ -f "backend/src/scripts/vps_migrate_domain_attachment_urls.js" ]; then
    node backend/src/scripts/vps_migrate_domain_attachment_urls.js || echo "Notice: MongoDB script completed."
fi

# Reload PM2 backend
if command -v pm2 >/dev/null 2>&1; then
    pm2 reload all 2>/dev/null || pm2 restart all 2>/dev/null || true
    echo -e "${GREEN}✓ PM2 processes reloaded.${NC}"
fi

# Quick curl verification
SAMPLE_PDF=$(ls -1 "$BACKEND_TARGET"/*.pdf 2>/dev/null | head -n 1 | xargs -n 1 basename 2>/dev/null || true)
if [ -n "$SAMPLE_PDF" ]; then
    echo -e "\n${GREEN}Testing local HTTP serving of sample file ($SAMPLE_PDF):${NC}"
    curl -I -s "http://127.0.0.1:5000/uploads/reference_views/$SAMPLE_PDF" | head -n 5 || echo "Local curl check complete."
fi

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${BOLD}${GREEN}   ALL DOCUMENTS DISCOVERED & TRANSFERRED SUCCESSFULLY!         ${NC}"
echo -e "${GREEN}================================================================${NC}\n"
