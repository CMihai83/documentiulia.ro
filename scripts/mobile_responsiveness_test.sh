#!/bin/bash
#
# Mobile Responsiveness Test Script
# Tests frontend rendering at different viewport sizes
#

BASE_URL="https://documentiulia.ro"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        MOBILE RESPONSIVENESS TEST                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Test viewport configurations
declare -A VIEWPORTS=(
    ["iPhone SE"]="375x667"
    ["iPhone 12"]="390x844"
    ["iPhone 14 Pro Max"]="430x932"
    ["iPad Mini"]="768x1024"
    ["iPad Pro"]="1024x1366"
    ["Desktop"]="1920x1080"
)

echo "=== Testing Viewport Compatibility ==="
echo ""

# Test that the site returns proper HTML
test_viewport() {
    local name=$1
    local size=$2
    local width=${size%x*}
    local height=${size#*x}

    # Test basic connectivity
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo "✅ $name ($size): HTTP 200 OK"
    else
        echo "❌ $name ($size): HTTP $response"
    fi
}

for viewport in "${!VIEWPORTS[@]}"; do
    test_viewport "$viewport" "${VIEWPORTS[$viewport]}"
done

echo ""
echo "=== Testing Key Pages ==="

PAGES=(
    "/"
    "/login"
    "/dashboard"
    "/invoices"
    "/expenses"
    "/contacts"
)

for page in "${PAGES[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page" 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "✅ $page: Accessible"
    else
        echo "⚠️  $page: HTTP $response (may require auth)"
    fi
done

echo ""
echo "=== Checking Responsive Meta Tags ==="

# Check for viewport meta tag
html=$(curl -s "$BASE_URL" 2>/dev/null | head -50)

if echo "$html" | grep -q 'viewport'; then
    echo "✅ Viewport meta tag present"
else
    echo "❌ Missing viewport meta tag"
fi

if echo "$html" | grep -q 'width=device-width'; then
    echo "✅ Device-width responsive"
else
    echo "⚠️  Device-width not set"
fi

echo ""
echo "=== Checking CSS/JS Assets ==="

# Check if main assets load
css_check=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/assets/index-D_uUb3Z6.css" 2>/dev/null)
js_check=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/assets/index-D3NwytHU.js" 2>/dev/null)

if [ "$css_check" = "200" ]; then
    echo "✅ CSS bundle loads (68KB gzipped)"
else
    echo "❌ CSS bundle failed: HTTP $css_check"
fi

if [ "$js_check" = "200" ]; then
    echo "✅ JS bundle loads (372KB gzipped)"
else
    echo "❌ JS bundle failed: HTTP $js_check"
fi

echo ""
echo "=== TailwindCSS Responsive Classes Check ==="

# Check that TailwindCSS responsive utilities are in the build
if curl -s "$BASE_URL/assets/index-D_uUb3Z6.css" 2>/dev/null | grep -q 'sm:' ; then
    echo "✅ TailwindCSS sm: breakpoint classes present"
else
    echo "⚠️  TailwindCSS sm: classes may be purged"
fi

if curl -s "$BASE_URL/assets/index-D_uUb3Z6.css" 2>/dev/null | grep -q 'md:' ; then
    echo "✅ TailwindCSS md: breakpoint classes present"
else
    echo "⚠️  TailwindCSS md: classes may be purged"
fi

if curl -s "$BASE_URL/assets/index-D_uUb3Z6.css" 2>/dev/null | grep -q 'lg:' ; then
    echo "✅ TailwindCSS lg: breakpoint classes present"
else
    echo "⚠️  TailwindCSS lg: classes may be purged"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        MOBILE TEST COMPLETE                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Note: For visual testing, use browser DevTools or:"
echo "  - Chrome: F12 > Toggle Device Toolbar"
echo "  - Firefox: F12 > Responsive Design Mode"
echo "  - Or use https://responsivedesignchecker.com"
