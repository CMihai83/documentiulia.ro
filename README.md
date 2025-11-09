# Documentiulia.ro

Website for documentiulia.ro - Document management and services

## Structure

```
public/
├── index.html       # Main page
├── css/            # Stylesheets
│   └── style.css
├── js/             # JavaScript files
├── images/         # Images
└── assets/         # Other assets
```

## Deployment

This website is deployed to a VPS server running nginx with SSL.

### Server Location
- Production: `/var/www/documentiulia.ro/public/`
- Nginx config: `/etc/nginx/sites-available/documentiulia.ro`

### Update Website

```bash
cd /var/www/documentiulia.ro
git pull origin main
sudo systemctl reload nginx
```

## Development

1. Clone repository:
```bash
git clone https://github.com/CMihai83/documentiulia.ro.git
cd documentiulia.ro
```

2. Make changes to files in `public/` directory

3. Test locally (optional - use any web server)

4. Commit and push:
```bash
git add .
git commit -m "Your message"
git push origin main
```

## License

All rights reserved © 2025
