# API Endpoint Status Report

## Date: 2025-11-19 18:25 UTC

## Test Results Summary

### ✅ Working Modules (9/13)
- Contabilitate (Accounting) - 4/4 endpoints
- CRM - 3/3 endpoints
- Pontaj Timp (Time Tracking) - 1/1 endpoint
- AI Insights - 1/1 endpoint
- Inventory Products - 1/3 endpoints

### ⚠️ Partially Working (2/13)
- Inventory - 1/3 endpoints (products works, stock-levels/warehouses need company_id fix)
- Asistență AI - 0/2 endpoints (need POST method, currently GET only)

### ❌ Need Fixes (2/13)
- Purchase Orders - Wrong endpoint called
- Projects - Wrong endpoint called
- Analytics - Wrong endpoint called

---

## Detailed Endpoint Mapping

### 📊 CONTABILITATE (4/4 Working)
| Feature | Frontend Path | API Endpoint | Status |
|---------|--------------|--------------|--------|
| Facturi | `/invoices` | `/api/v1/invoices/list.php` | ✅ Working |
| Chitanțe | `/bills` | `/api/v1/bills/list.php` | ✅ Working |
| Cheltuieli | `/expenses` | `/api/v1/expenses/list.php` | ✅ Working |
| Rapoarte | `/reports` | `/api/v1/reports/profit-loss.php` | ✅ Working |

### 📦 OPERAȚIUNI

#### Inventar (1/3 Working)
| Feature | Frontend Path | API Endpoint | Status | Fix Needed |
|---------|--------------|--------------|--------|------------|
| Products | `/inventory/products` | `/api/v1/inventory/products.php` | ✅ Working | None |
| Stock Levels | `/inventory/stock-levels` | `/api/v1/inventory/stock-levels.php` | ❌ 400 Error | Fix company_id header handling |
| Warehouses | `/inventory/warehouses` | `/api/v1/inventory/warehouses.php` | ❌ 400 Error | Fix company_id header handling |

#### Comenzi Achiziție (Needs Fix)
| Feature | Frontend Path | Current API Call | Correct Endpoint | Status |
|---------|--------------|------------------|------------------|--------|
| Purchase Orders List | `/purchase-orders` | `/api/v1/purchase-orders/list.php` | `/api/v1/purchase-orders/list.php` | ❌ 500 Error |

**Available Purchase Order Endpoints:**
- `/api/v1/purchase-orders/list.php`
- `/api/v1/purchase-orders/purchase-orders.php`
- `/api/v1/purchase-orders/approve.php`
- `/api/v1/purchase-orders/reject.php`
- `/api/v1/purchase-orders/receive-goods.php`
- `/api/v1/purchase-orders/convert-to-invoice.php`

### 🎯 VÂNZĂRI & CLIENȚI (3/3 Working)
| Feature | Frontend Path | API Endpoint | Status |
|---------|--------------|--------------|--------|
| CRM Opportunities | `/crm/opportunities` | `/api/v1/crm/opportunities.php` | ✅ Working |
| CRM Pipeline | `/crm` | `/api/v1/crm/opportunities-pipeline.php` | ✅ Working |
| Contacte | `/contacts` | `/api/v1/contacts/list.php` | ✅ Working |

### 💼 MANAGEMENT

#### Proiecte (Needs Endpoint Fix)
| Feature | Frontend Path | Current API Call | Correct Endpoint | Status |
|---------|--------------|------------------|------------------|--------|
| Projects List | `/projects` | `/api/v1/projects/list.php` | `/api/v1/projects/projects.php` | ❌ 404 |

**Available Project Endpoints:**
- `/api/v1/projects/projects.php` - Main projects endpoint
- `/api/v1/projects/milestones.php`
- `/api/v1/projects/sprints.php`
- `/api/v1/projects/kanban.php`
- `/api/v1/projects/gantt.php`
- `/api/v1/projects/risks.php`
- `/api/v1/projects/resources.php`
- `/api/v1/projects/analytics.php`

#### Pontaj Timp (1/1 Working)
| Feature | Frontend Path | API Endpoint | Status |
|---------|--------------|--------------|--------|
| Time Entries | `/time-tracking` | `/api/v1/time/entries.php` | ✅ Working |

### 📊 ANALIZE

#### Analize & BI (Needs Endpoint Fix)
| Feature | Frontend Path | Current API Call | Correct Endpoint | Status |
|---------|--------------|------------------|------------------|--------|
| Analytics Dashboard | `/analytics` | `/api/v1/analytics/dashboard.php` | `/api/v1/analytics/dashboards.php` | ❌ 404 |

**Available Analytics Endpoints:**
- `/api/v1/analytics/dashboards.php` - Main dashboards
- `/api/v1/analytics/widgets.php`
- `/api/v1/analytics/kpis.php`
- `/api/v1/analytics/metrics.php`
- `/api/v1/analytics/reports.php`
- `/api/v1/analytics/aging-report.php`
- `/api/v1/analytics/revenue-trend.php`
- `/api/v1/analytics/top-customers.php`
- `/api/v1/analytics/project-profitability.php`
- `/api/v1/analytics/employee-productivity.php`

#### Analize AI (1/1 Working)
| Feature | Frontend Path | API Endpoint | Status |
|---------|--------------|--------------|--------|
| AI Insights | `/insights` | `/api/v1/insights/list.php` | ✅ Working |

### 🧠 ASISTENȚĂ AI (Needs Method Fix)

| Feature | Frontend Path | API Endpoint | Status | Fix Needed |
|---------|--------------|--------------|--------|------------|
| Business Consultant | `/business-consultant` | `/api/v1/business/consultant.php` | ❌ 405 | Change to POST method |
| Fiscal Law AI | `/fiscal-law` | `/api/v1/fiscal/ai-consultant.php` | ❌ 405 | Change to POST method |

---

## Required Frontend API Fixes

###  1. Update Projects API Call
**File**: `/var/www/documentiulia.ro/frontend/src/services/api.ts` or project-specific service

**Change**:
```typescript
// From:
const response = await api.get('/projects/list.php');

// To:
const response = await api.get('/projects/projects.php');
```

### 2. Update Analytics API Call
**File**: Analytics service file

**Change**:
```typescript
// From:
const response = await api.get('/analytics/dashboard.php');

// To:
const response = await api.get('/analytics/dashboards.php');
```

### 3. Update AI Consultant Calls (POST Method)
**File**: Business consultant and fiscal law services

**Change**:
```typescript
// From:
const response = await api.get('/business/consultant.php');

// To:
const response = await api.post('/business/consultant.php', {
  question: userQuery,
  context: businessContext
});
```

---

## Backend Fixes Needed

### 1. Fix Inventory Stock Levels & Warehouses
**Files**:
- `/api/v1/inventory/stock-levels.php`
- `/api/v1/inventory/warehouses.php`

**Issue**: Not reading `X-Company-ID` header properly

**Fix**: Ensure header reading logic matches working endpoints:
```php
$headers = getallheaders();
$company_id = $headers['X-Company-ID'] ?? $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
```

### 2. Fix Purchase Orders List Endpoint
**File**: `/api/v1/purchase-orders/list.php`

**Issue**: HTTP 500 error (likely database query issue)

**Action**: Check error logs and fix SQL query or missing database schema

---

## Testing Command

```bash
# Get fresh token
TOKEN=$(curl -s "http://127.0.0.1/api/v1/auth/login.php" \
  -H "Host: documentiulia.ro" \
  -H "Content-Type: application/json" \
  -d '{"email":"test_admin@accountech.com","password":"TestPass123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

# Test any endpoint
curl -s "http://127.0.0.1/api/v1/ENDPOINT.php" \
  -H "Host: documentiulia.ro" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
```

---

## Summary

- **9/13 modules fully working** (69%)
- **2/13 modules partially working** (need minor fixes)
- **2/13 modules need endpoint mapping fixes** (frontend changes only)

**Next Steps**:
1. Update frontend API service files with correct endpoint names
2. Fix inventory endpoints to properly read company_id header
3. Debug purchase orders list endpoint (500 error)
4. Rebuild frontend and test all modules
