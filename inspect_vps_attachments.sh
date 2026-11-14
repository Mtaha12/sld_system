#!/usr/bin/env bash
# ==============================================================================
# SLD System - VPS Attachment & Legacy Domain Diagnostic Tool
# Inspects filesystem for old/new documents, Nginx configs, PM2 apps, and MongoDB URLs
# ==============================================================================

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${CYAN}      SLD SYSTEM - VPS ATTACHMENTS & MIGRATION DIAGNOSTIC       ${NC}"
echo -e "${CYAN}================================================================${NC}\n"

# 1. Active Working Directory
echo -e "${YELLOW}>>> [1/5] Checking Active Repository & Web Roots...${NC}"
echo "Current directory: $(pwd)"
echo "Listing /var/www contents:"
ls -la /var/www 2>/dev/null || echo "Cannot list /var/www"

# 2. PM2 Processes
echo -e "\n${YELLOW}>>> [2/5] Checking PM2 Backend Processes & Paths...${NC}"
if command -v pm2 >/dev/null 2>&1; then
    pm2 list
    echo "PM2 process working directories:"
    pm2 jlist 2>/dev/null | grep -oE '"name":"[^"]+"|"pm_cwd":"[^"]+"' | tr '\n' ' '
    echo ""
else
    echo "PM2 not found in PATH."
fi

# 3. Nginx Domain & Proxy Paths
echo -e "\n${YELLOW}>>> [3/5] Checking Nginx Domain Configurations & Proxy Ports...${NC}"
if [ -d "/etc/nginx" ]; then
    echo "Sites enabled in Nginx:"
    ls -l /etc/nginx/sites-enabled/ 2>/dev/null || true
    echo "Server names & proxy passes for sldsystem:"
    grep -rnE "server_name|proxy_pass|root " /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || true
else
    echo "Nginx directory /etc/nginx not found."
fi

# 4. Search VPS for PDF Attachments
echo -e "\n${YELLOW}>>> [4/5] Scanning VPS Disk for PDF Files & Reference Views Folders...${NC}"
echo "Looking for reference_views folders:"
find /var/www /root /home /tmp -maxdepth 6 -type d -name "reference_views" 2>/dev/null | while read -r rdir; do
    pdf_count=$(find "$rdir" -maxdepth 2 -type f -name "*.pdf" 2>/dev/null | wc -l)
    total_files=$(find "$rdir" -maxdepth 2 -type f 2>/dev/null | wc -l)
    echo "  - $rdir : $pdf_count PDFs (total files: $total_files)"
    # Show first 3 files
    ls -1 "$rdir" 2>/dev/null | head -n 3 | sed 's/^/      sample: /'
done

echo ""
echo "Looking for newsletters folders:"
find /var/www /root /home -maxdepth 6 -type d -name "newsletters" 2>/dev/null | while read -r ndir; do
    pdf_count=$(find "$ndir" -maxdepth 3 -type f -name "*.pdf" 2>/dev/null | wc -l)
    echo "  - $ndir : $pdf_count PDFs"
done

echo ""
echo "Total PDF files found under /var/www:"
find /var/www -type f -name "*.pdf" 2>/dev/null | wc -l

# 5. MongoDB URL Check
echo -e "\n${YELLOW}>>> [5/5] Checking MongoDB Attachment URLs...${NC}"
APP_DIR=""
if [ -d "/var/www/sld_system" ]; then
    APP_DIR="/var/www/sld_system"
elif [ -d "/var/www/sld-system" ]; then
    APP_DIR="/var/www/sld-system"
elif [ -f "backend/server.js" ]; then
    APP_DIR="$(pwd)"
fi

if [ -n "$APP_DIR" ] && [ -f "$APP_DIR/backend/src/scripts/vps_diagnostic_attachments.js" ]; then
    cd "$APP_DIR"
    node backend/src/scripts/vps_diagnostic_attachments.js 2>/dev/null || true
fi

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}      DIAGNOSTIC SCAN COMPLETED!                                ${NC}"
echo -e "${GREEN}================================================================${NC}\n"

