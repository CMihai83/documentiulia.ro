# DocumentIulia.ro Test Credentials

**Generated:** 2025-11-30
**Password for ALL test users:** `Test123!`

---

## Quick Start

1. Go to: https://documentiulia.ro/login
2. Use any email/password combination below
3. Password is always: `Test123!`

---

## Complete User Credentials List

### System Administrator

| Email | Password | Role | Company | Test Focus |
|-------|----------|------|---------|------------|
| superadmin@documentiulia.ro | Test123! | Super Admin | System | Full system access, all companies |
| test_admin@accountech.com | Test123! | Admin | Test SRL | Admin features testing |

---

### Construction Company (ConstructPro Test SRL)

| Email | Password | Role | Test Focus |
|-------|----------|------|------------|
| owner@constructpro-test.ro | Test123! | Owner | Full company access, billing, reports |
| manager@constructpro-test.ro | Test123! | Manager | Project management, team oversight |
| worker1@constructpro-test.ro | Test123! | Worker | Time tracking, task completion |
| worker2@constructpro-test.ro | Test123! | Worker | Time tracking, task completion |

**Available Data:**
- 4 Projects (Renovare Vila, Birouri IT, Acoperiș, Hală)
- 4 Invoices (paid, pending, overdue, draft)
- 4 Expenses
- 4 Employees
- 4 Tasks
- 3 Contacts/Customers
- 3 Products (construction materials)

---

### Electrical Services Company (ElectroPro Test SRL)

| Email | Password | Role | Test Focus |
|-------|----------|------|------------|
| owner@electropro-test.ro | Test123! | Owner | Full company access, service calls |
| master@electropro-test.ro | Test123! | Manager | Technician coordination |
| technician1@electropro-test.ro | Test123! | Technician | Service calls, time tracking |

**Available Data:**
- 3 Projects (Smart Home, Hotel Revizie, Panouri Solare)
- 2 Invoices
- 3 Employees
- 3 Tasks
- 3 Contacts
- 3 Service Calls (completed, scheduled, new)
- 3 Products (KNX equipment)

---

### Delivery Company (QuickDelivery Test SRL)

| Email | Password | Role | Test Focus |
|-------|----------|------|------------|
| owner@quickdelivery-test.ro | Test123! | Owner | Fleet management, routes |
| driver1@quickdelivery-test.ro | Test123! | Driver | Deliveries, vehicle assignment |
| driver2@quickdelivery-test.ro | Test123! | Driver | Deliveries, vehicle assignment |

**Available Data:**
- 3 Vehicles (Renault Master, Mercedes Sprinter, Dacia Dokker)
- 2 Customers (eMAG, Fashion Boutique)

---

### Freelancer (Ion Popescu PFA)

| Email | Password | Role | Test Focus |
|-------|----------|------|------------|
| ion.popescu@freelancer-test.ro | Test123! | Owner/Solo | Single-person business, invoicing |

---

### Restaurant (Restaurant La Bunica SRL)

| Email | Password | Role | Test Focus |
|-------|----------|------|------------|
| owner@labunica-test.ro | Test123! | Owner | Full access, inventory, staff |
| manager@labunica-test.ro | Test123! | Manager | Daily operations, orders |

---

### Test Client Users

| Email | Password | Role | Test Focus |
|-------|----------|------|------------|
| client.homeowner@test.ro | Test123! | Client | Customer portal testing |
| client.business@test.ro | Test123! | Client | B2B customer testing |
| test_manager@accountech.com | Test123! | Manager | Manager role features |
| test_user@accountech.com | Test123! | User | Basic user features |

---

## Company IDs (for API Testing)

| Company | UUID | Persona |
|---------|------|---------|
| ConstructPro Test SRL | c1000000-0000-0000-0000-000000000001 | construction |
| ElectroPro Test SRL | c2000000-0000-0000-0000-000000000002 | electrical |
| QuickDelivery Test SRL | c3000000-0000-0000-0000-000000000003 | delivery |
| Ion Popescu PFA | c4000000-0000-0000-0000-000000000004 | freelancer |
| Restaurant La Bunica SRL | c5000000-0000-0000-0000-000000000005 | horeca |
| Test SRL | aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa | - |

---

## API Testing Examples

### Login (Get Token)

```bash
curl -X POST "https://documentiulia.ro/api/v1/auth/login.php" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@constructpro-test.ro","password":"Test123!"}'
```

### List Projects (with token)

```bash
TOKEN="<your_token_here>"
COMPANY_ID="c1000000-0000-0000-0000-000000000001"

curl -s "https://documentiulia.ro/api/v1/projects/list.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID"
```

### List Invoices

```bash
curl -s "https://documentiulia.ro/api/v1/invoices/list.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID"
```

---

## Test Scenarios

### 1. Invoice Lifecycle
1. Login as `owner@constructpro-test.ro`
2. View invoices: FACT-2025-0001 (paid), FACT-2025-0002 (pending), FACT-2025-0003 (overdue), FACT-2025-0004 (draft)
3. Create new invoice
4. Mark as sent → Mark as paid

### 2. Project Management
1. Login as `manager@constructpro-test.ro`
2. View projects in different statuses
3. Create/edit tasks
4. Log time entries

### 3. Service Calls (Electrical)
1. Login as `owner@electropro-test.ro`
2. View service calls: SVC-2025-001 (completed), SVC-2025-002 (scheduled), SVC-2025-003 (new)
3. Assign technician
4. Complete service call

### 4. Fleet Management (Delivery)
1. Login as `owner@quickdelivery-test.ro`
2. View vehicles with different statuses
3. Assign vehicle to driver
4. Track vehicle status

### 5. Time Tracking
1. Login as `worker1@constructpro-test.ro`
2. Log hours on project
3. View timesheet
4. Submit for approval

---

## Data Summary

| Category | Count |
|----------|-------|
| Test Users | 19 |
| Test Companies | 6 |
| Contacts | 8 |
| Projects | 7 |
| Invoices | 6 |
| Expenses | 4 |
| Employees | 7 |
| Tasks | 7 |
| Time Entries | 6 |
| Products | 13 |
| Vehicles | 3 |
| Service Calls | 3 |

---

## Troubleshooting

### Login Issues
- Ensure password is exactly: `Test123!`
- Check email spelling (case-sensitive domains)
- Clear browser cache/cookies

### Missing Data
- Re-run seed script:
  ```bash
  PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production \
    -f /var/www/documentiulia.ro/database/seeds/comprehensive_test_data.sql
  ```

### API Returns 401
- Token may be expired (30 days validity)
- Re-login to get fresh token
- Check X-Company-ID header matches user's company

---

## Database Connection

```
Host: 127.0.0.1
Database: accountech_production
User: accountech_app
Password: AccTech2025Prod@Secure
```

---

*Document maintained by: Claude AI Assistant*
*Last updated: 2025-11-30*
