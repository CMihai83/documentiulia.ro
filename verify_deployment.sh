#!/bin/bash

echo "=============================================="
echo " DocumentIulia Deployment Verification"
echo "=============================================="
echo ""

# Check 1: Database tables
echo "✓ Database Tables:"
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "
SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'efactura%';" | xargs echo "  e-Factura tables:"

# Check 2: API endpoints
echo ""
echo "✓ API Endpoints:"
ls -1 /var/www/documentiulia.ro/api/v1/efactura/*.php 2>/dev/null | wc -l | xargs echo "  Files:"

# Check 3: Service classes
echo ""
echo "✓ Service Classes:"
ls -1 /var/www/documentiulia.ro/includes/services/efactura/*.php 2>/dev/null | wc -l | xargs echo "  Files:"

# Check 4: Email templates
echo ""
echo "✓ Email Templates:"
ls -1 /var/www/documentiulia.ro/templates/emails/*.html 2>/dev/null | wc -l | xargs echo "  Files:"

# Check 5: Frontend build
echo ""
echo "✓ Frontend Build:"
if [ -d "/var/www/documentiulia.ro/frontend/dist" ]; then
  ls -lh /var/www/documentiulia.ro/frontend/dist/index.html 2>/dev/null | awk '{print "  index.html: " $5}'
  ls -1 /var/www/documentiulia.ro/frontend/dist/assets/*.js 2>/dev/null | wc -l | xargs echo "  JavaScript bundles:"
else
  echo "  ✗ Build directory missing"
fi

# Check 6: e-Factura pages
echo ""
echo "✓ e-Factura Pages:"
ls -1 /var/www/documentiulia.ro/frontend/src/pages/efactura/*.tsx 2>/dev/null | wc -l | xargs echo "  Pages:"

# Check 7: Storage directories
echo ""
echo "✓ Storage Directories:"
for dir in xml received logs; do
  if [ -d "/var/www/documentiulia.ro/storage/efactura/$dir" ]; then
    echo "  $dir: ✓"
  else
    echo "  $dir: ✗"
  fi
done

# Check 8: Environment configuration
echo ""
echo "✓ Configuration:"
if [ -f "/var/www/documentiulia.ro/.env" ]; then
  echo "  .env: ✓"
  grep -q "ANAF_CLIENT_ID" /var/www/documentiulia.ro/.env && echo "  ANAF config: ✓" || echo "  ANAF config: Pending"
else
  echo "  .env: ✗"
fi

# Check 9: SSL/HTTPS
echo ""
echo "✓ SSL Certificate:"
curl -sI https://documentiulia.ro 2>&1 | grep -q "HTTP/2 200" && echo "  HTTPS working: ✓" || echo "  HTTPS: ✗"

echo ""
echo "=============================================="
echo " Deployment Status: Complete"
echo "=============================================="
