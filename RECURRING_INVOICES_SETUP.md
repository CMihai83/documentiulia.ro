# 🔄 Recurring Invoices - Setup & Usage Guide

**Date**: 2025-11-21
**Status**: ✅ **COMPLETE** - Ready for use

---

## 📋 Overview

The Recurring Invoices system enables automated subscription billing:
- **Automated invoice generation** based on frequency (weekly, monthly, quarterly, yearly)
- **Email automation** with PDF attachments
- **Flexible billing templates** for any subscription service
- **Cron job automation** for hands-free operation

---

## 🏗️ Architecture

### Components Created:
1. **RecurringInvoiceService.php** (519 lines) - Core service
2. **5 API Endpoints** - Full CRUD operations
3. **Cron Job Script** - Automated generation
4. **Database Structure** - Already exists (recurring_invoices table)

### Data Flow:
```
1. User creates recurring invoice template (API)
   ↓
2. Template stored in database with next_invoice_date
   ↓
3. Cron job runs daily (checks for due invoices)
   ↓
4. System generates invoice from template
   ↓
5. PDF generated + Email sent (if auto_send = true)
   ↓
6. Next invoice date calculated and updated
   ↓
7. Repeat from step 3
```

---

## 🚀 Quick Start

### Step 1: Test Manually (5 minutes)

Test the generation script manually first:

```bash
# Run the script manually
php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php

# Expected output:
# =====================================
# Recurring Invoice Generation Started
# =====================================
# Time: 2025-11-21 10:00:00
#
# ✓ RecurringInvoiceService initialized
# ✓ Database connection established
#
# Scanning for due recurring invoices...
#
# =====================================
# Generation Report
# =====================================
# Total due: 0
# Generated: 0
# Failed: 0
#
# ✓ Execution completed successfully
```

### Step 2: Setup Cron Job (2 minutes)

Add cron job to run daily at 2:00 AM:

```bash
# Open crontab editor
crontab -e

# Add this line:
0 2 * * * /usr/bin/php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php >> /var/log/recurring_invoices.log 2>&1

# Save and exit

# Verify cron job
crontab -l
```

**Alternative schedules**:
```bash
# Run every hour
0 * * * * /usr/bin/php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php >> /var/log/recurring_invoices.log 2>&1

# Run every 6 hours
0 */6 * * * /usr/bin/php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php >> /var/log/recurring_invoices.log 2>&1

# Run twice daily (2 AM and 2 PM)
0 2,14 * * * /usr/bin/php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php >> /var/log/recurring_invoices.log 2>&1
```

### Step 3: Monitor Logs (ongoing)

```bash
# View cron job logs
tail -f /var/log/recurring_invoices.log

# View last 50 lines
tail -50 /var/log/recurring_invoices.log

# Search for errors
grep -i "error" /var/log/recurring_invoices.log
```

---

## 📡 API Documentation

### Base URL
```
https://documentiulia.ro/api/v1/recurring-invoices/
```

### Authentication
All endpoints require:
- `Authorization: Bearer YOUR_JWT_TOKEN`
- `X-Company-ID: YOUR_COMPANY_ID`

---

### 1. Create Recurring Invoice

**Endpoint**: `POST /api/v1/recurring-invoices/create.php`

**Request Body**:
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "frequency": "monthly",
  "start_date": "2025-12-01",
  "end_date": null,
  "auto_send": true,
  "due_days": 30,
  "notes": "Monthly subscription for AccountTech Pro",
  "terms": "Net 30 days",
  "line_items": [
    {
      "description": "AccountTech Pro - Monthly Subscription",
      "quantity": 1,
      "unit_price": 49.00,
      "tax_rate": 19.00
    },
    {
      "description": "SMS Credits (1000 credits)",
      "quantity": 1,
      "unit_price": 10.00,
      "tax_rate": 19.00
    }
  ]
}
```

**Frequency Options**:
- `weekly` - Generate invoice every 7 days
- `monthly` - Generate invoice every month (same day)
- `quarterly` - Generate invoice every 3 months
- `yearly` - Generate invoice every year

**Response**:
```json
{
  "success": true,
  "data": {
    "recurring_invoice": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "customer_id": "550e8400-e29b-41d4-a716-446655440000",
      "customer_name": "Acme Corporation",
      "frequency": "monthly",
      "start_date": "2025-12-01",
      "next_invoice_date": "2025-12-01",
      "end_date": null,
      "subtotal": 59.00,
      "tax_amount": 11.21,
      "total_amount": 70.21,
      "status": "active",
      "auto_send": true,
      "invoices_generated_count": 0,
      "created_at": "2025-11-21T10:00:00Z"
    },
    "message": "Recurring invoice created successfully"
  }
}
```

---

### 2. List Recurring Invoices

**Endpoint**: `GET /api/v1/recurring-invoices/list.php`

**Query Parameters** (optional):
- `status` - Filter by status (active, cancelled, paused)
- `customer_id` - Filter by customer
- `frequency` - Filter by frequency (weekly, monthly, quarterly, yearly)

**Example**:
```bash
curl "https://documentiulia.ro/api/v1/recurring-invoices/list.php?status=active" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Company-ID: YOUR_COMPANY_ID"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recurring_invoices": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "customer_name": "Acme Corporation",
        "customer_email": "billing@acme.com",
        "frequency": "monthly",
        "next_invoice_date": "2025-12-01",
        "total_amount": 70.21,
        "status": "active",
        "invoices_generated": 5
      }
    ],
    "statistics": {
      "total_recurring": 10,
      "active_recurring": 8,
      "monthly_recurring_revenue": 450.00,
      "total_invoices_generated": 42
    },
    "count": 1
  }
}
```

---

### 3. Get Recurring Invoice Details

**Endpoint**: `GET /api/v1/recurring-invoices/get.php?id=XXX`

**Example**:
```bash
curl "https://documentiulia.ro/api/v1/recurring-invoices/get.php?id=660e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Company-ID: YOUR_COMPANY_ID"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recurring_invoice": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "customer_name": "Acme Corporation",
      "customer_email": "billing@acme.com",
      "frequency": "monthly",
      "next_invoice_date": "2025-12-01",
      "invoice_template": {
        "line_items": [...],
        "notes": "Monthly subscription",
        "terms": "Net 30 days",
        "due_days": 30
      },
      "generated_invoices": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440000",
          "invoice_number": "INV-000042",
          "invoice_date": "2025-11-01",
          "total_amount": 70.21,
          "status": "paid",
          "paid_at": "2025-11-05T10:00:00Z"
        }
      ]
    }
  }
}
```

---

### 4. Update Recurring Invoice

**Endpoint**: `PUT /api/v1/recurring-invoices/update.php?id=XXX`

**Allowed Fields**:
- `frequency` - Change billing frequency
- `end_date` - Set expiration date
- `auto_send` - Enable/disable automatic sending
- `status` - Change status (active, paused, cancelled)
- `line_items` - Update billing items

**Request Body**:
```json
{
  "frequency": "quarterly",
  "auto_send": false,
  "line_items": [
    {
      "description": "Updated subscription plan",
      "quantity": 1,
      "unit_price": 99.00,
      "tax_rate": 19.00
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recurring_invoice": { ... },
    "message": "Recurring invoice updated successfully"
  }
}
```

---

### 5. Cancel Recurring Invoice

**Endpoint**: `DELETE /api/v1/recurring-invoices/cancel.php?id=XXX`

**Example**:
```bash
curl -X DELETE "https://documentiulia.ro/api/v1/recurring-invoices/cancel.php?id=660e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Company-ID: YOUR_COMPANY_ID"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Recurring invoice cancelled successfully"
  }
}
```

---

## 🧪 Testing Guide

### Test Scenario 1: Monthly Subscription

```bash
TOKEN="YOUR_JWT_TOKEN"
COMPANY_ID="YOUR_COMPANY_ID"

# 1. Create monthly recurring invoice
curl -X POST "https://documentiulia.ro/api/v1/recurring-invoices/create.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "550e8400-e29b-41d4-a716-446655440000",
    "frequency": "monthly",
    "start_date": "'$(date +%Y-%m-%d)'",
    "auto_send": true,
    "due_days": 30,
    "notes": "Test monthly subscription",
    "line_items": [
      {
        "description": "Monthly Subscription",
        "quantity": 1,
        "unit_price": 49.00,
        "tax_rate": 19.00
      }
    ]
  }'

# 2. List recurring invoices
curl "https://documentiulia.ro/api/v1/recurring-invoices/list.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID"

# 3. Run generation script
php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php

# 4. Verify invoice was generated
curl "https://documentiulia.ro/api/v1/invoices/list.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID"
```

### Test Scenario 2: Quarterly Subscription

```bash
# Create quarterly recurring invoice
curl -X POST "https://documentiulia.ro/api/v1/recurring-invoices/create.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "550e8400-e29b-41d4-a716-446655440000",
    "frequency": "quarterly",
    "start_date": "'$(date +%Y-%m-%d)'",
    "end_date": "'$(date -d '+2 years' +%Y-%m-%d)'",
    "auto_send": true,
    "line_items": [
      {
        "description": "Quarterly Subscription",
        "quantity": 1,
        "unit_price": 129.00,
        "tax_rate": 19.00
      }
    ]
  }'
```

---

## 💰 Revenue Impact

### Before Recurring Invoices:
- Manual invoice creation every month
- Time per invoice: ~5 minutes
- 50 subscriptions = 250 minutes/month = 4.2 hours
- Monthly cost: €84 (assuming €20/hour labor)
- Missed invoices: ~5% = lost revenue

### After Recurring Invoices:
- Automated invoice generation
- Time saved: 4.2 hours/month = €84/month
- Zero missed invoices = +5% revenue capture
- Annual savings: €1,008

**For 100 subscriptions**: €2,000+ annual savings

---

## 🔧 Troubleshooting

### Issue 1: Cron job not running

**Check cron service**:
```bash
systemctl status cron
```

**Check cron logs**:
```bash
grep CRON /var/log/syslog
```

**Verify script permissions**:
```bash
ls -la /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php
# Should show: -rwxr-xr-x
```

---

### Issue 2: Invoices not generating

**Check database**:
```bash
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "
SELECT id, frequency, next_invoice_date, status
FROM recurring_invoices
WHERE status = 'active'
AND next_invoice_date <= CURRENT_DATE;
"
```

**Run script manually with debugging**:
```bash
php -d display_errors=1 /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php
```

---

### Issue 3: Emails not sending

**Verify SendGrid configuration**:
```bash
grep SENDGRID /var/www/documentiulia.ro/.env
```

**Check email service**:
```bash
# Test email sending
curl -X POST "https://documentiulia.ro/api/v1/invoices/send-email.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{"invoice_id": "YOUR_INVOICE_ID"}'
```

---

## 📊 Database Schema

The `recurring_invoices` table structure:

```sql
CREATE TABLE recurring_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- weekly, monthly, quarterly, yearly
    start_date DATE NOT NULL,
    next_invoice_date DATE NOT NULL,
    end_date DATE,
    invoice_template JSONB NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, cancelled
    auto_send BOOLEAN DEFAULT true,
    last_generated_at TIMESTAMP,
    invoices_generated_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ Completion Checklist

### Development (100%):
- [x] RecurringInvoiceService created (519 lines)
- [x] 5 API endpoints created
- [x] Cron job script created
- [x] Documentation complete

### Configuration (User Action):
- [ ] Cron job scheduled
- [ ] First test recurring invoice created
- [ ] Generation script tested manually
- [ ] Monitoring setup for cron logs

### Launch:
- [ ] First automated invoice generated
- [ ] Email sending verified
- [ ] Customer notified
- [ ] Revenue tracking enabled

---

## 🚀 Ready for Automated Billing!

**Status**: ✅ CODE 100% COMPLETE
**Action**: Schedule cron job (2 minutes)
**Result**: Automated subscription billing

---

**All systems ready - Generate recurring revenue! 💰**
