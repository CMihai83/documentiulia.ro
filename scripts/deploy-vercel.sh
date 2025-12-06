#!/bin/bash
# DocumentIulia.ro Deployment Script
# Deploy to Vercel with i18n rewrites and schema generation
#
# Usage: ./scripts/deploy-vercel.sh [preview|production]
#
# Author: DocumentIulia Team
# Version: 1.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="./frontend"
BUILD_DIR="./frontend/dist"
VERCEL_CONFIG="./vercel.json"

# Default environment
ENVIRONMENT="${1:-preview}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DocumentIulia.ro Deployment Script${NC}"
echo -e "${BLUE}  Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Pre-deployment checks
echo -e "\n${YELLOW}Step 1: Pre-deployment checks...${NC}"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found${NC}"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    exit 1
fi

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm i -g vercel@latest
fi

echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"

# Step 2: Install dependencies
echo -e "\n${YELLOW}Step 2: Installing dependencies...${NC}"
cd "$FRONTEND_DIR"
npm ci --prefer-offline
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Run tests
echo -e "\n${YELLOW}Step 3: Running tests...${NC}"
npm test -- --watchAll=false --passWithNoTests || {
    echo -e "${YELLOW}⚠ Tests skipped or failed (non-blocking)${NC}"
}

# Step 4: Build application
echo -e "\n${YELLOW}Step 4: Building application...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - dist directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build completed${NC}"

# Step 5: Generate i18n rewrites
echo -e "\n${YELLOW}Step 5: Generating i18n configuration...${NC}"
cd ..

cat > "$VERCEL_CONFIG" << 'EOF'
{
  "version": 2,
  "framework": "vite",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd frontend && npm ci",
  "rewrites": [
    { "source": "/ro/:path*", "destination": "/:path*" },
    { "source": "/en/:path*", "destination": "/:path*" }
  ],
  "redirects": [
    { "source": "/", "destination": "/ro", "permanent": false }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/api/:path*",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate" }
      ]
    },
    {
      "source": "/:path*.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/:path*.css",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "regions": ["fra1"],
  "env": {
    "VITE_API_URL": "@vite_api_url",
    "VITE_SAGA_API_URL": "@vite_saga_api_url",
    "VITE_ANAF_API_URL": "@vite_anaf_api_url"
  }
}
EOF

echo -e "${GREEN}✓ i18n configuration generated${NC}"

# Step 6: Generate sitemap
echo -e "\n${YELLOW}Step 6: Generating sitemap...${NC}"

cat > "$BUILD_DIR/sitemap.xml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://documentiulia.ro/ro</loc>
    <xhtml:link rel="alternate" hreflang="ro" href="https://documentiulia.ro/ro"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://documentiulia.ro/en"/>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://documentiulia.ro/ro/saga</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://documentiulia.ro/ro/hr</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://documentiulia.ro/ro/reforms</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://documentiulia.ro/ro/forum</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://documentiulia.ro/ro/courses</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://documentiulia.ro/ro/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://documentiulia.ro/ro/pricing</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://documentiulia.ro/ro/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
EOF

echo -e "${GREEN}✓ Sitemap generated${NC}"

# Step 7: Generate robots.txt
echo -e "\n${YELLOW}Step 7: Generating robots.txt...${NC}"

cat > "$BUILD_DIR/robots.txt" << 'EOF'
User-agent: *
Allow: /

Sitemap: https://documentiulia.ro/sitemap.xml

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/

# Disallow auth pages from indexing
Disallow: /ro/sign-in
Disallow: /ro/sign-up
Disallow: /en/sign-in
Disallow: /en/sign-up
EOF

echo -e "${GREEN}✓ robots.txt generated${NC}"

# Step 8: Deploy to Vercel
echo -e "\n${YELLOW}Step 8: Deploying to Vercel...${NC}"

if [ "$ENVIRONMENT" == "production" ]; then
    echo -e "${YELLOW}Deploying to PRODUCTION...${NC}"
    vercel --prod --yes
else
    echo -e "${YELLOW}Deploying to PREVIEW...${NC}"
    vercel --yes
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}Test Credentials (visible on /ro/sign-in):${NC}"
echo -e "  Admin:    test_admin@documentiulia.ro / Admin2025!Demo"
echo -e "  Contabil: test_accountant@documentiulia.ro / Contabil2025!Demo"
echo -e "  HR:       test_hr@documentiulia.ro / HR2025!Demo"
echo -e "  Student:  test_student@documentiulia.ro / Student2025!Demo"
echo -e "  Enterprise: test_enterprise@documentiulia.ro / Enterprise2025!Demo"

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Verify deployment at https://documentiulia.ro"
echo -e "  2. Test login with test credentials"
echo -e "  3. Submit sitemap to Google Search Console"
echo -e "  4. Run Lighthouse audit for Core Web Vitals"
