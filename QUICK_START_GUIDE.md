# Documentiulia.ro - Quick Start Guide

## 🚀 Getting Started with the New Features

This guide will help you quickly get started with the newly implemented features.

---

## Authentication

All endpoints require JWT authentication. Include these headers in every request:

```bash
Authorization: Bearer {your-jwt-token}
X-Company-ID: {company-uuid}
Content-Type: application/json
```

---

## Module 1: Time Tracking ⏱️

### Create a Time Entry
POST /api/v1/time/entries.php

### Get Employee Timesheet
GET /api/v1/time/timesheets.php?employee_id={uuid}

### Generate Time Reports
GET /api/v1/time/reports.php?type=by_employee

---

## Module 2: Project Management 📊

### Create a Project
POST /api/v1/time/projects.php

### Get Kanban Board
GET /api/v1/time/tasks.php?board=1

---

## Module 3: Advanced Accounting 💰

### Create Journal Entry
POST /api/v1/accounting/journal-entries.php

### Get Financial Statements
GET /api/v1/accounting/income-statement.php
GET /api/v1/accounting/balance-sheet.php
GET /api/v1/accounting/cash-flow.php

---

## Module 4: Analytics & BI 📈

### Get Business KPIs
GET /api/v1/analytics/kpis.php

### Revenue Trend
GET /api/v1/analytics/revenue-trend.php

### Aging Report
GET /api/v1/analytics/aging-report.php

---

See API_FEATURES_SUMMARY.md for complete documentation.
