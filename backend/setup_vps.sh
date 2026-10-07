#!/bin/bash
# ==============================================================================
# SLD System - Automated Hostinger VPS Environment Setup Script
# Ubuntu 22.04 / 24.04 LTS
# ==============================================================================
set -e

echo "======================================================================"
echo "          SLD SYSTEM - AUTOMATED VPS SERVER SETUP"
echo "======================================================================"

# 1. Update system packages
echo -e "\n[1/6] Updating system packages..."
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y curl gnupg ufw git build-essential

# 2. Install Node.js 20 LTS
echo -e "\n[2/6] Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "  -> Node.js is already installed: $(node -v)"
fi
echo "  -> Node version: $(node -v), NPM version: $(npm -v)"

# 3. Install PM2 process manager
echo -e "\n[3/6] Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "  -> PM2 is already installed."
fi

# 4. Install MongoDB 7.0 Community Edition
echo -e "\n[4/6] Installing and configuring local MongoDB..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
       sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
    
    # Detect Ubuntu Codename
    UBUNTU_CODENAME=$(lsb_release -cs)
    # If 24.04 noble, fallback to jammy repo if needed
    if [ "$UBUNTU_CODENAME" = "noble" ]; then
        REPO_CODENAME="jammy"
    else
        REPO_CODENAME="$UBUNTU_CODENAME"
    fi

    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${REPO_CODENAME}/mongodb-org/7.0 multiverse" | \
       sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    sudo apt update -y
    sudo apt install -y mongodb-org
fi

sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl start mongod

if sudo systemctl is-active --quiet mongod; then
    echo "  -> MongoDB is running successfully on 127.0.0.1:27017"
else
    echo "  -> Warning: MongoDB service could not start automatically. Check: sudo systemctl status mongod"
fi

# 5. Install Nginx & Certbot (for SSL)
echo -e "\n[5/6] Installing Nginx & Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 6. Configure UFW Firewall (Security First)
echo -e "\n[6/6] Securing Firewall (UFW)..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
# Note: MongoDB port 27017 is kept blocked from external internet for 100% security
sudo ufw --force enable
echo "  -> Firewall active. Ports 22, 80, 443 allowed. MongoDB port 27017 protected."

echo -e "\n======================================================================"
echo "  VPS ENVIRONMENT SETUP COMPLETED SUCCESSFULLY!"
echo "======================================================================"
echo "Next step: Run 'bash restore_on_vps.sh' to seed all 165,278 cases, users, and statutes."
