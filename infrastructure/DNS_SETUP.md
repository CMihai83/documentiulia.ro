# DocumentIulia.ro - DNS Configuration Guide

## DNS Records Required

Configure the following DNS records at your domain registrar:

### A Records (Point to Hetzner Floating IP)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `<FLOATING_IP>` | 300 |
| A | www | `<FLOATING_IP>` | 300 |
| A | api | `<FLOATING_IP>` | 300 |

### AAAA Records (IPv6 - Optional)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| AAAA | @ | `<APP_SERVER_IPV6>` | 300 |
| AAAA | www | `<APP_SERVER_IPV6>` | 300 |

### CNAME Records (For Vercel Frontend - Alternative)

If using Vercel for frontend hosting:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | cname.vercel-dns.com | 300 |
| CNAME | www | cname.vercel-dns.com | 300 |
| A | api | `<FLOATING_IP>` | 300 |

### MX Records (Email)

| Type | Name | Priority | Value | TTL |
|------|------|----------|-------|-----|
| MX | @ | 10 | mail.documentiulia.ro | 3600 |

Or for Google Workspace:
| Type | Name | Priority | Value | TTL |
|------|------|----------|-------|-----|
| MX | @ | 1 | aspmx.l.google.com | 3600 |
| MX | @ | 5 | alt1.aspmx.l.google.com | 3600 |
| MX | @ | 5 | alt2.aspmx.l.google.com | 3600 |

### TXT Records (SPF, DKIM, DMARC)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | @ | `v=spf1 include:_spf.google.com ~all` | 3600 |
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@documentiulia.ro` | 3600 |
| TXT | @ | `google-site-verification=<YOUR_CODE>` | 3600 |

### CAA Records (Certificate Authority Authorization)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CAA | @ | `0 issue "letsencrypt.org"` | 3600 |
| CAA | @ | `0 issuewild "letsencrypt.org"` | 3600 |

## Deployment Configurations

### Option 1: All-in-One Hetzner (Recommended for Control)

```
documentiulia.ro      → Floating IP (Hetzner)
www.documentiulia.ro  → Floating IP (Hetzner)
api.documentiulia.ro  → Floating IP (Hetzner)
```

All traffic goes through nginx on Hetzner which routes to frontend/backend containers.

### Option 2: Hybrid (Vercel + Hetzner)

```
documentiulia.ro      → Vercel (Frontend)
www.documentiulia.ro  → Vercel (Frontend)
api.documentiulia.ro  → Floating IP (Backend on Hetzner)
```

Frontend on Vercel for edge performance, backend on Hetzner for data sovereignty.

## Verification Commands

After DNS propagation (5-30 minutes), verify:

```bash
# Check A records
dig documentiulia.ro +short
dig api.documentiulia.ro +short

# Check propagation worldwide
curl -s "https://dns.google/resolve?name=documentiulia.ro&type=A" | jq

# Verify SSL certificate
openssl s_client -connect documentiulia.ro:443 -servername documentiulia.ro < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

## Cloudflare Configuration (If Using Cloudflare DNS)

1. Add domain to Cloudflare
2. Update nameservers at registrar
3. Configure DNS records as above
4. SSL/TLS settings:
   - Encryption mode: Full (strict)
   - Always Use HTTPS: On
   - Automatic HTTPS Rewrites: On
5. Caching:
   - Cache Level: Standard
   - Browser Cache TTL: 4 hours
6. Security:
   - Security Level: Medium
   - Challenge Passage: 30 minutes

## Estimated Propagation Times

| Record Type | Typical Time |
|-------------|--------------|
| A/AAAA | 5-30 minutes |
| CNAME | 5-30 minutes |
| MX | 1-4 hours |
| TXT | 1-4 hours |
| Full propagation | Up to 48 hours |

## Troubleshooting

### DNS not resolving
```bash
# Clear local DNS cache
sudo systemd-resolve --flush-caches  # Linux
ipconfig /flushdns                    # Windows
sudo dscacheutil -flushcache          # macOS
```

### Certificate issues
```bash
# Check certificate chain
openssl s_client -connect documentiulia.ro:443 -servername documentiulia.ro -showcerts

# Verify certificate validity
curl -vI https://documentiulia.ro 2>&1 | grep -A 6 "Server certificate"
```
