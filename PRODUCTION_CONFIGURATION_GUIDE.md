# DocumentIulia - Production Configuration Guide

**Version:** 1.0
**Date:** 2025-11-22
**Status:** Ready for Production Setup

---

## Overview

This guide provides step-by-step instructions for configuring DocumentIulia for production deployment, including e-Factura integration with ANAF.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Server with PHP 8.2+ and PostgreSQL
- [ ] SSL certificate for documentiulia.ro
- [ ] ANAF e-Factura account (SPV access)
- [ ] Email service (SMTP or SendGrid)
- [ ] Domain DNS configured
- [ ] Database backup capabilities

---

## Phase 1: Environment Configuration

### 1.1 Create .env File

Create `/var/www/documentiulia.ro/.env`:

```bash
cd /var/www/documentiulia.ro
cp .env.example .env
chmod 600 .env
chown www-data:www-data .env
```

### 1.2 Configure Database

Edit `.env` and add:

```env
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=accountech_production
DB_USER=accountech_app
DB_PASSWORD=AccTech2025Prod@Secure

# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://documentiulia.ro
```

### 1.3 Configure JWT Authentication

Generate a strong JWT secret:

```bash
php -r "echo bin2hex(random_bytes(32));"
```

Add to `.env`:

```env
# JWT Configuration
JWT_SECRET=<generated_secret_from_above>
JWT_ALGORITHM=HS256
JWT_EXPIRATION=2592000
```

### 1.4 Configure Email Service

**Option A: SMTP (Gmail/Custom)**

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@documentiulia.ro
SMTP_PASS=your_app_password_here
FROM_EMAIL=noreply@documentiulia.ro
FROM_NAME=DocumentIulia
USE_SENDGRID=false
```

**Option B: SendGrid**

```env
# Email Configuration
USE_SENDGRID=true
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@documentiulia.ro
FROM_NAME=DocumentIulia
```

### 1.5 Configure ANAF e-Factura (After OAuth Registration)

```env
# ANAF e-Factura Configuration
ANAF_CLIENT_ID=your_client_id_from_anaf
ANAF_CLIENT_SECRET=your_client_secret_from_anaf
ANAF_REDIRECT_URI=https://documentiulia.ro/api/v1/efactura/oauth-callback.php
ANAF_ENVIRONMENT=production
```

---

## Phase 2: ANAF OAuth Registration

### 2.1 Access ANAF SPV

1. Go to https://efactura.mfinante.ro
2. Log in with your certificate or credentials
3. Navigate to "Administrare" → "API"

### 2.2 Register Application

1. Click "Aplicație Nouă"
2. Fill in details:
   - **Nume aplicație:** DocumentIulia
   - **Descriere:** Platformă de facturare electronică
   - **Redirect URIs:**
     - `https://documentiulia.ro/api/v1/efactura/oauth-callback.php`
     - `https://documentiulia.ro/efactura/oauth-callback`
   - **Scopes:** Read/Write access to e-Factura

3. Save and note down:
   - Client ID
   - Client Secret

### 2.3 Update Configuration

Add the credentials to `.env`:

```env
ANAF_CLIENT_ID=<client_id_from_step_2>
ANAF_CLIENT_SECRET=<client_secret_from_step_2>
```

### 2.4 Test OAuth Flow

1. Log in to DocumentIulia
2. Go to Settings → e-Factura Settings
3. Select a company
4. Click "Connect to ANAF"
5. Complete OAuth authorization
6. Verify connection status shows "Connected"

---

## Phase 3: Web Server Configuration

### 3.1 Nginx Configuration

Create `/etc/nginx/sites-available/documentiulia.ro`:

```nginx
server {
    listen 80;
    server_name documentiulia.ro www.documentiulia.ro;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name documentiulia.ro www.documentiulia.ro;

    root /var/www/documentiulia.ro/frontend/dist;
    index index.html;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/documentiulia.ro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/documentiulia.ro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API requests
    location /api/ {
        alias /var/www/documentiulia.ro/api/;
        try_files $uri $uri/ /api/index.php?$query_string;

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
        }
    }

    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Upload limits for e-Factura
    client_max_body_size 10M;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/documentiulia.ro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.2 PHP-FPM Configuration

Edit `/etc/php/8.2/fpm/pool.d/www.conf`:

```ini
[www]
user = www-data
group = www-data
listen = /var/run/php/php8.2-fpm.sock
listen.owner = www-data
listen.group = www-data

pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35

php_admin_value[upload_max_filesize] = 10M
php_admin_value[post_max_size] = 10M
php_admin_value[memory_limit] = 256M
php_admin_value[max_execution_time] = 60
```

Restart PHP-FPM:

```bash
sudo systemctl restart php8.2-fpm
```

---

## Phase 4: SSL Certificate Setup

### 4.1 Install Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### 4.2 Obtain Certificate

```bash
sudo certbot --nginx -d documentiulia.ro -d www.documentiulia.ro
```

Follow prompts:
- Enter email for urgent renewal notices
- Agree to Terms of Service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 4.3 Auto-Renewal

Test renewal:

```bash
sudo certbot renew --dry-run
```

Certbot automatically sets up cron job for renewal.

---

## Phase 5: File Permissions

### 5.1 Set Ownership

```bash
cd /var/www/documentiulia.ro
sudo chown -R www-data:www-data .
```

### 5.2 Set Directory Permissions

```bash
# Executable directories
sudo find . -type d -exec chmod 755 {} \;

# Readable files
sudo find . -type f -exec chmod 644 {} \;

# Writable storage
sudo chmod -R 775 storage/
sudo chmod -R 775 storage/efactura/

# Protect sensitive files
chmod 600 .env
chmod 600 database/migrations/*.sql
```

---

## Phase 6: Monitoring & Logging

### 6.1 Error Logging

Create log directory:

```bash
mkdir -p /var/www/documentiulia.ro/storage/logs
chmod 775 /var/www/documentiulia.ro/storage/logs
```

Configure PHP error logging in `.env`:

```env
# Logging
LOG_LEVEL=error
LOG_PATH=/var/www/documentiulia.ro/storage/logs/app.log
```

### 6.2 Set Up Sentry (Optional)

```env
# Error Tracking
SENTRY_DSN=https://xxxxxx@oxxxxx.ingest.sentry.io/xxxxxx
SENTRY_ENVIRONMENT=production
```

### 6.3 Set Up Uptime Monitoring

1. Sign up for UptimeRobot or Pingdom
2. Add monitor for `https://documentiulia.ro`
3. Add monitor for `https://documentiulia.ro/api/v1/health`
4. Configure SMS/email alerts

---

## Phase 7: Database Optimization

### 7.1 Connection Pooling

Install pgBouncer:

```bash
sudo apt install pgbouncer
```

Configure `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
accountech_production = host=127.0.0.1 port=5432 dbname=accountech_production

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

### 7.2 Backup Strategy

Create daily backup script `/root/backup_db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
PGPASSWORD='AccTech2025Prod@Secure' pg_dump -h 127.0.0.1 -U accountech_app accountech_production | gzip > "$BACKUP_DIR/documentiulia_$DATE.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "documentiulia_*.sql.gz" -mtime +30 -delete
```

Add to crontab:

```bash
0 2 * * * /root/backup_db.sh
```

---

## Phase 8: Testing

### 8.1 Health Check Endpoint

Test application health:

```bash
curl -I https://documentiulia.ro/api/v1/health
```

Expected response: HTTP 200 OK

### 8.2 e-Factura Workflow Test

1. Log in as test user
2. Create a test invoice
3. Navigate to invoice detail
4. Click "Upload to ANAF"
5. Verify success message
6. Check status updates

### 8.3 Email Test

Test email delivery:

```bash
php -r "
require 'includes/services/EmailService.php';
\$email = new \DocumentIulia\Services\EmailService();
\$result = \$email->send(
    'your-email@example.com',
    'Test Email',
    '<h1>Test</h1><p>Email service is working!</p>'
);
var_dump(\$result);
"
```

---

## Phase 9: Security Checklist

- [ ] HTTPS enforced
- [ ] SSL certificate valid
- [ ] Security headers configured
- [ ] .env file protected (chmod 600)
- [ ] Database credentials secure
- [ ] JWT secret strong and unique
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] File upload restrictions in place

---

## Phase 10: Launch Checklist

- [ ] All environment variables configured
- [ ] ANAF OAuth registered and tested
- [ ] Email service configured and tested
- [ ] SSL certificate installed
- [ ] Web server configured
- [ ] Database backups running
- [ ] Monitoring configured
- [ ] Error logging working
- [ ] Frontend routes integrated
- [ ] End-to-end testing complete
- [ ] Performance testing done
- [ ] Security audit passed
- [ ] User documentation created
- [ ] Support team trained

---

## Troubleshooting

### Issue: e-Factura Upload Fails

**Check:**
1. OAuth token not expired: `SELECT expires_at FROM efactura_oauth_tokens;`
2. XML file permissions: `ls -la storage/efactura/xml/`
3. API error logs: `tail -f storage/logs/app.log`

**Solution:**
- Reconnect OAuth in Settings → e-Factura
- Check ANAF API status
- Verify XML validation

### Issue: Email Not Sending

**Check:**
1. SMTP credentials in `.env`
2. Port 587 open: `telnet smtp.gmail.com 587`
3. Error logs

**Solution:**
- Test with SendGrid as alternative
- Enable "Less secure apps" for Gmail
- Check firewall rules

### Issue: Frontend Not Loading

**Check:**
1. Nginx configuration
2. Frontend build: `ls -la frontend/dist/`
3. Browser console for errors

**Solution:**
```bash
cd frontend
npm run build
sudo systemctl reload nginx
```

---

## Support Contacts

**Technical Issues:**
- Email: tech@documentiulia.ro
- Phone: +40 XXX XXX XXX

**ANAF Support:**
- Email: infoeFactura@anaf.ro
- Portal: https://www.anaf.ro/efactura

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Status:** ✅ READY FOR PRODUCTION SETUP
