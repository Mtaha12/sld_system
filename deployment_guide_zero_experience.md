# Complete Zero-Experience Deployment Guide: Hostinger VPS & Vercel

This guide is designed for **complete beginners**. Follow each step exactly in order.

---

## 📋 System Architecture Overview
- **Backend (Node.js/Express) + MongoDB**: Runs 24/7 on your **Hostinger VPS** (Ubuntu).
- **Database**: Local MongoDB directly on the VPS (fast, free, no Atlas limits).
- **Frontend (React/Vite)**: Runs on **Vercel** connected to your custom domain (global CDN, blazing fast).

---

## 🗂️ What We Prepared For You
1. **Full Database Backup (`backend/database_backup/`)**:
   - Every single collection in your database:
     - **165,278 Case Laws** (clean, sequential, full judgments linked)
     - **3,034 Users & Admins** (all passwords, permissions, profiles)
     - **11,618 Notifications**
     - **9,340 Statutes & Bare Acts**
     - **30,099 Legal News & Articles**
     - **34,538 Legal Dictionary Definitions**
     - All settings, court tariffs, invoices, magazines, and activities.
   - Preserves all MongoDB `ObjectId` types and `Date` timestamps with BSON EJSON fidelity.
2. **Automated Setup Script (`backend/setup_vps.sh`)**: Installs Node.js 20 LTS, MongoDB 7.0, PM2, Nginx, and secures the firewall with 1 command.
3. **Automated Restore Script (`backend/restore_on_vps.sh`)**: Restores all 29 collections and rebuilds all database indexes with 1 command.
4. **PM2 Configuration (`backend/ecosystem.config.cjs`)**: Keeps your backend alive 24/7 and auto-restarts on reboot.
5. **Nginx Reverse Proxy (`backend/nginx_sld.conf`)**: Directs web traffic to your backend securely.
6. **Vercel Configuration (`frontend/vercel.json`)**: Configures client-side routing and edge caching.

---

## 🚀 STEP-BY-STEP DEPLOYMENT PROCEDURE

---

### STEP 1: Commit and Push Your Code to GitHub

Open **PowerShell** on your computer and run:

```powershell
cd c:\Users\HP\Desktop\Quirk\sld\sld_system
git add .
git commit -m "feat: complete database backup, vps automated scripts, and deployment configuration"
git push origin main
```

*(Note: The huge `database_backup/` folder is safely excluded from GitHub to stay under GitHub's 100 MB file limit. We will transfer it directly to the VPS in Step 4).*

---

### STEP 2: Connect to Your Hostinger VPS

1. Open Hostinger Dashboard -> **VPS** -> Find your **VPS IP address** (e.g., `123.45.67.89`) and your `root` password.
2. Open **PowerShell** or **Command Prompt** on your computer.
3. Type the following command (replace `YOUR_VPS_IP` with your actual VPS IP):
   ```bash
   ssh root@YOUR_VPS_IP
   ```
4. If it asks `Are you sure you want to continue connecting (yes/no/[fingerprint])?`, type:
   ```text
   yes
   ```
5. Enter your VPS root password when prompted. You are now inside your VPS!

---

### STEP 3: Clone Your Code and Run Automated VPS Setup

Inside the VPS terminal:

1. Clone your repository into `/var/www/sld_system`:
   ```bash
   mkdir -p /var/www
   cd /var/www
   git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git sld_system
   cd /var/www/sld_system/backend
   ```
   *(If your GitHub repository is private, create a GitHub Personal Access Token or use GitHub SSH keys).*

2. Make the automated setup script executable and run it:
   ```bash
   chmod +x setup_vps.sh restore_on_vps.sh
   bash setup_vps.sh
   ```

**What this does automatically:**
- Installs Node.js 20 LTS and NPM
- Installs and activates MongoDB 7.0 Community Edition
- Installs PM2 process manager
- Installs Nginx and Certbot (SSL)
- Enables firewall protection (blocks external access to MongoDB port 27017 for 100% security)

---

### STEP 4: Transfer the Database Backup Folder to Your VPS

Now open a **NEW PowerShell window** on your **local Windows PC** (keep the VPS terminal open in the other window):

Run this exact command (replace `YOUR_VPS_IP` with your actual VPS IP):

```powershell
cd c:\Users\HP\Desktop\Quirk\sld\sld_system\backend
scp -r database_backup root@YOUR_VPS_IP:/var/www/sld_system/backend/
```

*Enter your VPS root password when prompted. The transfer will take about 1 to 3 minutes depending on your internet upload speed.*

---

### STEP 5: Restore All Data on the VPS (1-Click)

Switch back to your **VPS terminal window**:

1. Make sure you are in `/var/www/sld_system/backend`:
   ```bash
   cd /var/www/sld_system/backend
   ```

2. Run the restore script:
   ```bash
   bash restore_on_vps.sh
   ```

**What happens:**
- Connects to your local VPS MongoDB (`mongodb://127.0.0.1:27017/sld_system`).
- Streams and restores all **165,278 Cases**, **3,034 Users**, **11,618 Notifications**, **9,340 Statutes**, and all other collections.
- Rebuilds all indexes (`sldNumberInt`, `mapYearPage`, `caseNumber`, etc.) for maximum query speed.

---

### STEP 6: Configure Environment & Start the Backend

1. In the VPS terminal, create your production `.env` file:
   ```bash
   cp .env.production.example .env
   nano .env
   ```
   *(Check your settings. If you have your frontend domain or Vercel URL, set `CLIENT_URL=https://your-domain.com`. Press `CTRL + O`, `Enter` to save, then `CTRL + X` to exit nano).*

2. Start the backend with PM2:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```
   *(Copy and run the `sudo env PATH=...` line that PM2 outputs so it starts automatically if the VPS ever restarts).*

3. Test that the backend is responding locally:
   ```bash
   curl http://127.0.0.1:5000/api/health
   ```
   *(You should see `{"status":"healthy","uptime":...}`).*

---

### STEP 7: Configure Nginx & Free SSL Certificate

1. Copy the Nginx configuration:
   ```bash
   cp /var/www/sld_system/backend/nginx_sld.conf /etc/nginx/sites-available/sld_backend
   nano /etc/nginx/sites-available/sld_backend
   ```
   *Change `server_name api.yourdomain.com;` to your subdomain (e.g. `api.supremelawdigest.com`) or your VPS IP.*

2. Enable the site in Nginx:
   ```bash
   ln -s /etc/nginx/sites-available/sld_backend /etc/nginx/sites-enabled/
   rm -f /etc/nginx/sites-enabled/default
   nginx -t
   sudo systemctl reload nginx
   ```

3. In your DNS provider (Cloudflare, Namecheap, or Hostinger DNS):
   - Add an **A Record**:
     - **Name**: `api` (or `@` if using root)
     - **Value**: `YOUR_VPS_IP`
     - **TTL**: Auto / 300

4. Run Certbot to enable HTTPS (SSL) automatically:
   ```bash
   certbot --nginx -d api.yourdomain.com
   ```
   *(Follow the prompt: enter your email, press `Y` to agree, and Certbot configures SSL automatically!)*

---

### STEP 8: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** -> **"Project"**.
3. Select your GitHub repository (`sld_system`).
4. In the configuration settings:
   - **Framework Preset**: Vite
   - **Root Directory**: Click `Edit` and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://api.yourdomain.com` (or `http://YOUR_VPS_IP` if you haven't linked a domain yet)
6. Click **Deploy**. Vercel will build and deploy your frontend in ~30 seconds!

---

### STEP 9: Connect Your Custom Domain on Vercel

1. In your Vercel project dashboard, go to **Settings** -> **Domains**.
2. Enter your main domain (e.g., `supremelawdigest.com` or `www.supremelawdigest.com`).
3. Vercel will show you the exact DNS records to add:
   - **A Record**: Points `@` to `76.76.21.21`
   - **CNAME Record**: Points `www` to `cname.vercel-dns.com`
4. Add these records in your DNS manager. Vercel will verify the domain and issue a free SSL certificate within minutes!

---

## 🔍 Useful Maintenance Commands on VPS

| Action | Command on VPS |
| :--- | :--- |
| **Check Backend Status** | `pm2 status` |
| **View Live Backend Logs** | `pm2 logs sld-backend` |
| **Restart Backend** | `pm2 restart sld-backend` |
| **Check MongoDB Status** | `sudo systemctl status mongod` |
| **Check Nginx Status** | `sudo systemctl status nginx` |
| **Test Health Endpoint** | `curl http://127.0.0.1:5000/api/health` |
