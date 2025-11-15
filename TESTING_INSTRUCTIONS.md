# Testing Instructions for DocumentiUlia

## Important: curl vs Browser Testing

**⚠️ CRITICAL**: The DocumentiUlia frontend is a **React Single Page Application (SPA)** that runs entirely in the browser using JavaScript.

### Why curl doesn't show the content:

`curl` only downloads the HTML file - it **does NOT execute JavaScript**. This is why you see an empty page with just `<div id="root"></div>`.

The actual application content is rendered dynamically by React after the JavaScript loads and executes in the browser.

## How to Test the Frontend Properly

### Option 1: Web Browser (Recommended)

Open these URLs in **Firefox, Chrome, or any modern web browser**:

1. **Main Application**: https://documentiulia.ro
2. **Personal MBA Library**: https://documentiulia.ro/mba-library
3. **MBA Progress Dashboard**: https://documentiulia.ro/mba-progress
4. **Hybrid Consultant**: https://documentiulia.ro/hybrid-consultant
5. **Decision Trees**: https://documentiulia.ro/decision-trees

You should see:
- Full navigation sidebar with menu items
- Rich UI components with Tailwind CSS styling
- Interactive elements (buttons, cards, forms)
- Data loaded from API endpoints

### Option 2: Test API Endpoints with curl

The backend API endpoints CAN be tested with curl because they return JSON directly:

```bash
# Test Decision Trees API
curl -s 'https://documentiulia.ro/api/v1/fiscal/decision-trees' | python3 -m json.tool

# Expected response:
{
  "success": true,
  "trees": [
    {
      "id": 1,
      "tree_key": "tva_registration",
      "tree_name": "Înregistrare TVA",
      "description": "Ghid complet pentru înregistrarea ca plătitor de TVA",
      "category": "fiscal",
      "icon": "📊",
      "priority": 1
    }
  ],
  "count": 1
}

# Test MBA Library API
curl -s 'https://documentiulia.ro/api/v1/mba/library' | python3 -m json.tool | head -50

# Expected response:
{
  "success": true,
  "books": [
    {
      "id": 1,
      "book_number": 1,
      "title": "The Personal MBA: Master the Art of Business",
      "author": "Josh Kaufman",
      "category": "Foundation",
      "core_concept": "Comprehensive overview of universal business principles..."
    },
    # ... 98 more books
  ]
}

# Test MBA Recommendations API
curl -s -X POST 'https://documentiulia.ro/api/v1/mba/recommendations.php' \
  -H 'Content-Type: application/json' \
  -d '{"fiscal_situation": "Vreau să îmi deschid un business", "user_id": "test"}' \
  | python3 -m json.tool

# Test Hybrid Consultant API
curl -s -X POST 'https://documentiulia.ro/api/v1/fiscal/hybrid-consultant.php' \
  -H 'Content-Type: application/json' \
  -d '{"question": "Cum mă înregistrez la TVA?", "user_id": "test"}' \
  | python3 -m json.tool
```

### Option 3: Use a Headless Browser

If you need automated testing without a GUI:

```bash
# Install headless browser tools
npm install -g puppeteer

# Create test script
node test-frontend.js
```

## What You Should See in the Browser

### 1. Main Dashboard (/)
- Login page if not authenticated
- Dashboard with navigation sidebar if authenticated
- Links to all features in the sidebar

### 2. Personal MBA Library (/mba-library)
- Grid or category view of 99 books
- Search bar to filter books
- Category badges (Foundation, Business Creation, Marketing, etc.)
- Book cards with:
  - Book number (#1-99)
  - Title and author
  - Category tag
  - Core concept description
  - "Start Reading" and "Mark Done" buttons (on hover)

### 3. MBA Progress Dashboard (/mba-progress)
- Statistics cards:
  - Total completion percentage with progress bar
  - Books completed counter (0-99)
  - Currently reading counter
  - Reading streak (weekly)
- Category mastery chart
- Filter tabs (All, Reading, Completed)
- List of books with progress status

### 4. Hybrid Fiscal Consultant (/hybrid-consultant)
- Question input textarea
- "Întreabă" (Ask) button
- Suggestion chips for quick questions
- Two-tab response interface:
  - **Fiscal Answer Tab**: Legislative answer with references
  - **MBA Strategy Tab**: Framework cards with:
    - Framework name and book source
    - Strategic recommendation
    - Fiscal benefit explanation
    - Tactical steps (numbered list)
    - Estimated savings

### 5. Decision Trees (/decision-trees)
- Grid of available decision trees (currently 1: TVA Registration)
- Each tree card shows:
  - Category badge
  - Icon
  - Tree name
  - Description
  - "Începe ghidarea →" (Start guidance) link
- When navigating a tree:
  - Breadcrumb trail of previous answers
  - Current question with help text
  - Multiple answer option buttons
  - "Switch to AI" alternative option
  - Final answer display with:
    - Answer template
    - Legislative references
    - Strategic advice
    - Warnings
    - Next steps
    - "Începe din nou" (Start over) and "Printează" (Print) buttons

## Debugging Tips

### If the page appears blank in the browser:

1. **Open Developer Console** (F12 in most browsers)
2. **Check Console tab** for JavaScript errors
3. **Check Network tab** to see if API calls are failing
4. **Check Elements tab** to see if DOM is being populated

### Common issues:

1. **CORS errors**: API endpoints should have proper CORS headers (already configured)
2. **404 on API calls**: Check nginx configuration for /api/ location
3. **Authentication redirects**: Protected routes redirect to /login if not authenticated
4. **Missing data**: Check database has been populated with migrations

## API Endpoint Quick Reference

All endpoints respond with JSON and support CORS:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/fiscal/decision-trees` | GET | List all decision trees |
| `/api/v1/fiscal/hybrid-consultant.php` | POST | Route question to tree/AI/queue |
| `/api/v1/mba/library` | GET | Get all MBA books |
| `/api/v1/mba/library?action=categories` | GET | Get books grouped by category |
| `/api/v1/mba/library?search=query` | GET | Search books by keyword |
| `/api/v1/mba/progress` | GET/POST | Get/update user progress |
| `/api/v1/mba/recommendations.php` | POST | Get MBA recommendations |

## System Status Verification

### Check if all services are running:

```bash
# Check nginx
systemctl status nginx

# Check PHP-FPM
systemctl status php8.2-fpm

# Check PostgreSQL
systemctl status postgresql

# Check database tables
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Check MBA books count
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT COUNT(*) FROM mba_books;"

# Check decision trees count
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT COUNT(*) FROM decision_trees WHERE is_active = TRUE;"
```

## Expected Database State

- **mba_books**: 99 rows (all Personal MBA books)
- **decision_trees**: 1 row (TVA Registration tree)
- **decision_nodes**: Multiple nodes for TVA tree
- **decision_paths**: Multiple paths for TVA tree navigation
- All other tables may be empty initially (populated by user activity)

## Summary

**✅ Frontend is accessible**: https://documentiulia.ro
**✅ API endpoints are working**: All JSON endpoints return valid responses
**✅ Database is populated**: 99 MBA books, 1 decision tree
**✅ React app is deployed**: JavaScript bundle served correctly

**❌ curl won't show content**: Use a web browser to see the rendered application

---

**Testing Status**: System is production-ready. All components accessible via web browser.
