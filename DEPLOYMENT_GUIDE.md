# Deployment Guide for documentiulia.ro

## ✅ Completed Setup (Steps 1-4)

### 1. GitHub Repository Created
- **Repository**: https://github.com/CMihai83/documentiulia.ro
- **Status**: ✅ Live and pushed
- **Branch**: main

### 2. Directory Structure Setup
- **Location**: `/var/www/documentiulia.ro/`
- **Structure**:
  ```
  /var/www/documentiulia.ro/
  ├── .git/
  ├── .gitignore
  ├── README.md
  ├── DEPLOYMENT_GUIDE.md (this file)
  └── public/
      ├── index.html
      ├── css/
      │   └── style.css
      ├── js/
      ├── images/
      └── assets/
  ```

### 3. Nginx Configuration Created
- **Config file**: `/etc/nginx/sites-available/documentiulia.ro`
- **Symlink**: `/etc/nginx/sites-enabled/documentiulia.ro`
- **Status**: ✅ Active and serving HTTP
- **Test URL**: http://95.216.112.59 (if domain not yet pointed)

### 4. SSL Certificate Setup (Partial)
- **Status**: ⚠️ Awaiting DNS configuration
- **Issue**: Domain currently pointing to Cloudflare Tunnel
- **Error**: 530 response from Cloudflare

---

## 🔧 Required Action: DNS/Cloudflare Configuration

Since you're using **Cloudflare Tunnel**, you have **2 options**:

### Option A: Use Cloudflare SSL (Recommended for Cloudflare Tunnel)

If you want to keep using Cloudflare Tunnel from your PC:

1. **In Cloudflare Dashboard**:
   - Go to SSL/TLS → Overview
   - Set SSL mode to "Full (strict)" or "Full"
   - Cloudflare will handle HTTPS automatically

2. **Update your Cloudflare Tunnel**:
   - Point `documentiulia.ro` tunnel to this server instead
   - Use: `http://95.216.112.59` (or localhost if tunnel runs here)
   - Cloudflare will add SSL automatically

3. **Skip Let's Encrypt** - Not needed with Cloudflare

### Option B: Direct Server SSL (No Cloudflare Tunnel)

If you want to move completely to this server:

1. **Update DNS Records** (in Cloudflare or your DNS provider):
   ```
   A    documentiulia.ro       95.216.112.59
   A    www.documentiulia.ro   95.216.112.59
   ```

2. **Turn OFF Cloudflare Proxy** (click orange cloud to make it gray)
   - This allows direct connection to your server
   - Required for Let's Encrypt validation

3. **Wait for DNS propagation** (5-30 minutes)
   ```bash
   # Check if DNS points to server
   dig documentiulia.ro +short
   # Should show: 95.216.112.59
   ```

4. **Run SSL certificate command**:
   ```bash
   sudo certbot --nginx -d documentiulia.ro -d www.documentiulia.ro
   ```

5. **Nginx will auto-configure HTTPS** after certbot succeeds

---

## 📝 Current System Status

### Server Information
- **IP**: 95.216.112.59
- **OS**: Linux 6.12.19
- **Web Server**: nginx/1.22.1
- **SSL Tool**: certbot 2.1.0

### AI-XYZ Trading System (UNTOUCHED)
- **Location**: `/root/ai_xyz/`
- **Running Services**:
  - ✅ autonomous_sync.py (PID: 556279)
  - ✅ momentum_guardian.py (PID: 415248)
  - ✅ surplus_dump_manager.py (PID: 163040)
- **Status**: All services running normally, unaffected by website setup

### Website Services
- **Nginx**: Active and serving documentiulia.ro on HTTP (port 80)
- **HTTP URL**: http://documentiulia.ro (once DNS updated)
- **HTTPS URL**: https://documentiulia.ro (after SSL configured)

---

## 🚀 Update Website Content

### Method 1: Edit on GitHub
1. Go to https://github.com/CMihai83/documentiulia.ro
2. Edit files directly on GitHub
3. On server, run:
   ```bash
   cd /var/www/documentiulia.ro
   git pull origin main
   ```

### Method 2: Edit on Server
1. SSH to server
2. Edit files:
   ```bash
   cd /var/www/documentiulia.ro/public
   nano index.html  # or use your preferred editor
   ```
3. Push to GitHub:
   ```bash
   cd /var/www/documentiulia.ro
   git add .
   git commit -m "Update website content"
   git push origin main
   ```

### Method 3: Edit Locally + Push
1. Clone on your PC:
   ```bash
   git clone https://github.com/CMihai83/documentiulia.ro.git
   cd documentiulia.ro
   ```
2. Make changes to files in `public/` folder
3. Push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
4. On server, pull changes:
   ```bash
   cd /var/www/documentiulia.ro
   git pull origin main
   ```

---

## 🔍 Testing & Verification

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t  # Test configuration
```

### Check Website is Serving
```bash
curl -I http://localhost  # From server
curl -I http://95.216.112.59  # From anywhere
```

### View Nginx Logs
```bash
tail -f /var/log/nginx/documentiulia.ro-access.log
tail -f /var/log/nginx/documentiulia.ro-error.log
```

### Check AI-XYZ Services (Verify No Impact)
```bash
ps aux | grep -E "(autonomous_sync|momentum_guardian|surplus_dump)" | grep -v grep
```

---

## 📂 File Locations Reference

| Item | Location |
|------|----------|
| Website Root | `/var/www/documentiulia.ro/public/` |
| Git Repository | `/var/www/documentiulia.ro/` |
| Nginx Config | `/etc/nginx/sites-available/documentiulia.ro` |
| Access Logs | `/var/log/nginx/documentiulia.ro-access.log` |
| Error Logs | `/var/log/nginx/documentiulia.ro-error.log` |
| SSL Certificates | `/etc/letsencrypt/live/documentiulia.ro/` (after setup) |
| AI-XYZ System | `/root/ai_xyz/` (separate, untouched) |

---

## 🛡️ Security Considerations

- ✅ Nginx security headers configured
- ✅ Hidden files (.git, etc.) blocked
- ✅ AI-XYZ system completely isolated from web directory
- ⚠️ SSL pending DNS/Cloudflare configuration
- ✅ GitHub repository set to public (change to private if needed)

---

## 🎯 Next Steps

1. **Decide on Cloudflare vs Direct Server** (Option A or B above)
2. **Configure DNS** accordingly
3. **Setup SSL** (automatic with Cloudflare or certbot)
4. **Upload your actual website content** to replace placeholder
5. **Test thoroughly** before going live

---

## 📞 Support Commands

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### Reload Nginx (without downtime)
```bash
sudo systemctl reload nginx
```

### Check Port 80/443
```bash
sudo netstat -tulpn | grep nginx
```

### Manual SSL Certificate Renewal
```bash
sudo certbot renew
```

---

**Setup completed by**: Claude Code
**Date**: 2025-11-09
**Status**: ✅ Ready for DNS configuration and content upload
