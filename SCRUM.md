# memorize DocumentIulia.ro - Scrum Backlog & Sprint Planning

## Project Overview
AI-powered Romanian ERP/accounting SaaS platform with ANAF compliance.

---

## PRODUCT BACKLOG (MoSCoW Prioritized)

### MUST HAVE - Sprint 1-3 (Critical Compliance)

| ID | Epic | Story | Tasks | Story Points | Status |
|----|------|-------|-------|--------------|--------|
| M1 | REVISAL | Employee Registry Sync | API + Frontend + XML Generation | 8 | DONE |
| M2 | D112 | Payroll Declaration | API + Frontend + ANAF Submit | 8 | DONE |
| M3 | D394 | Transaction Declaration | API + Frontend + ANAF Submit | 8 | DONE |
| M4 | e-Factura | B2B/B2G Enhancement | UBL 2.1 Validation + Status Track | 5 | DONE |
| M5 | SAF-T | D406 Validation | Pre-submit Validation + Resubmit | 5 | DONE |
| M6 | VAT | Legea 141/2025 Config | Rate Config UI + Date Logic | 5 | DONE |
| M7 | Accounting | General Ledger | API + Frontend + Reports | 8 | DONE |
| M8 | Accounting | Trial Balance | API + Frontend + Export | 5 | DONE |
| M9 | Accounting | Financial Statements | Balance Sheet + P&L + Cash Flow | 8 | DONE |
| M10 | Accounting | Period Closing | Validation + Lock + Reports | 5 | DONE |

### SHOULD HAVE - Sprint 4-6 (Competitiveness)

| ID | Epic | Story | Tasks | Story Points | Status |
|----|------|-------|-------|--------------|--------|
| S1 | Fixed Assets | Asset Management | CRUD + Depreciation Calc | 8 | DONE |
| S2 | Inventory | Reconciliation | Physical vs System + Adjustments | 5 | DONE |
| S3 | Dashboard | Customization | Widget Drag-Drop + AI Insights | 8 | DONE |
| S4 | Onboarding | Setup Wizard | Step-by-step Config Flow | 5 | DONE |
| S5 | Bulk Actions | Invoice/Payment Bulk | Multi-select + Batch Process | 5 | DONE |
| S6 | Mobile | Responsive UI | PWA + Offline Sync | 8 | DONE |

### COULD HAVE - Sprint 7+ (Nice-to-Have)

| ID | Epic | Story | Tasks | Story Points | Status |
|----|------|-------|-------|--------------|--------|
| C1 | Integrations | SmartBill Connector | OAuth + Sync | 5 | DONE |
| C2 | Integrations | QuickBooks Connector | OAuth + Sync | 5 | DONE |
| C3 | Support | Ticket System | CRUD + Email Notifications | 5 | BACKLOG |
| C4 | Invoices | Recurring Scheduling | Cron + Auto-generate | 5 | BACKLOG |

---

## SPRINT 1 - Romanian Compliance Core (COMPLETED)

**Sprint Goal:** Implement REVISAL, D112, D394 compliance modules

**Duration:** 2 weeks
**Velocity Achieved:** 24 SP

| Task | Assignee | SP | Status | Notes |
|------|----------|-----|--------|-------|
| REVISAL Backend API | Claude | 3 | DONE | /api/v1/compliance/revisal |
| REVISAL Frontend Page | Claude | 3 | DONE | /compliance/revisal |
| REVISAL XML Generator | Claude | 2 | DONE | ITM format v3.0 |
| D112 Backend API | Claude | 3 | DONE | /api/v1/finance/d112 |
| D112 Frontend Page | Claude | 3 | DONE | /finance/d112 |
| D112 XML Generator | Claude | 2 | DONE | ANAF format |
| D394 Backend API | Claude | 3 | DONE | /api/v1/finance/d394 |
| D394 Frontend Page | Claude | 3 | DONE | /finance/d394 |
| D394 XML Generator | Claude | 2 | DONE | ANAF format |

---

## SPRINT 2 - Accounting Module (COMPLETED)

**Sprint Goal:** Implement core accounting functionality

**Duration:** 2 weeks
**Velocity Achieved:** 26 SP

| Task | Assignee | SP | Status | Notes |
|------|----------|-----|--------|-------|
| General Ledger API | Claude | 3 | DONE | /api/v1/accounting/general-ledger |
| General Ledger Page | Claude | 3 | DONE | /accounting/general-ledger |
| Journal Entry API | Claude | 2 | DONE | Manual entries |
| Trial Balance API | Claude | 2 | DONE | /api/v1/accounting/trial-balance |
| Trial Balance Page | Claude | 3 | DONE | /accounting/trial-balance |
| Financial Statements API | Claude | 3 | DONE | Balance/P&L/Cash |
| Financial Statements Page | Claude | 3 | DONE | /accounting/statements |
| Period Closing API | Claude | 2 | DONE | Lock + Validate |
| Period Closing Page | Claude | 3 | DONE | /accounting/closing |
| VAT Rate Config | Claude | 2 | DONE | Legea 141/2025 ready |

---

## SPRINT 3 - e-Factura & SAF-T Enhancement (COMPLETED)

**Sprint Goal:** Enhance ANAF integration with validation and status tracking

**Duration:** 2 weeks
**Velocity Achieved:** 20 SP

| Task | Assignee | SP | Status | Notes |
|------|----------|-----|--------|-------|
| e-Factura UBL Validator | Claude | 3 | DONE | RO_CIUS UBL 2.1 |
| e-Factura Status Page | Claude | 3 | DONE | /dashboard/efactura |
| e-Factura Resubmit | Claude | 2 | DONE | Error handling |
| SAF-T Pre-validation | Claude | 3 | DONE | Before submit |
| SAF-T Error Handler | Claude | 2 | DONE | Actionable errors |
| SAF-T Resubmit | Claude | 2 | DONE | Failed submissions |
| ANAF Status Dashboard | Claude | 3 | DONE | /compliance/anaf-status |
| ANAF Submission Log | Claude | 2 | DONE | Audit trail

---

## DEFINITION OF DONE

- [ ] Code written and tested
- [ ] API endpoints documented in Swagger
- [ ] Frontend pages responsive
- [ ] Romanian translations complete
- [ ] ANAF XML formats validated
- [ ] Error handling implemented
- [ ] Audit logging enabled

---

## TECHNICAL DEBT

| Item | Priority | Notes |
|------|----------|-------|
| MFA Components Missing | HIGH | MFASetup, BackupCodes components |
| API Rate Limiting | MEDIUM | ANAF throttling |
| Test Coverage | MEDIUM | <80% coverage |

---

## RETROSPECTIVE NOTES

### Sprint 0 (Completed)
- Created 15+ new pages (settings, invoices, HR)
- All builds passing
- Backend APIs functional

### Sprint 1-3 (Completed Dec 2025)
- Full Romanian Compliance: REVISAL, D112, D394
- Complete Accounting Module: GL, Trial Balance, Financial Statements, Period Closing
- e-Factura & SAF-T: UBL 2.1 validation, status tracking, resubmit

### Sprint 4-6 (Completed Dec 2025)
- Fixed Assets with depreciation calculation
- Inventory Reconciliation with variance analysis
- Dashboard Customization with drag-drop widgets
- Onboarding Wizard with gamification
- Bulk Operations for invoices and payments
- PWA with Service Worker for offline sync

### Sprint 7 (Completed Dec 2025)
- SmartBill Integration (OAuth + bidirectional sync)
- QuickBooks Integration (OAuth 2.0 + full API coverage)

### Blockers Resolved
- Grok API key expired (resolved with backend key)
- ANAF secret key validation blocking login (made optional)

---

## API ENDPOINTS (IMPLEMENTED)

### Compliance Module
```
POST /api/v1/compliance/revisal/sync
GET  /api/v1/compliance/revisal/status
POST /api/v1/compliance/revisal/download
GET  /api/v1/compliance/anaf-status
POST /api/v1/compliance/anaf-resubmit
```

### Finance Declarations
```
POST /api/v1/finance/d112/generate
POST /api/v1/finance/d112/submit
GET  /api/v1/finance/d112/status
POST /api/v1/finance/d394/generate
POST /api/v1/finance/d394/submit
GET  /api/v1/finance/d394/status
```

### Accounting Module
```
GET  /api/v1/accounting/ledger
POST /api/v1/accounting/journal-entry
GET  /api/v1/accounting/trial-balance
GET  /api/v1/accounting/statements/balance-sheet
GET  /api/v1/accounting/statements/profit-loss
GET  /api/v1/accounting/statements/cash-flow
POST /api/v1/accounting/period/close
GET  /api/v1/accounting/periods
```

### Fixed Assets
```
GET  /api/v1/assets
POST /api/v1/assets
GET  /api/v1/assets/:id
POST /api/v1/assets/depreciation/calculate
GET  /api/v1/assets/depreciation/report
```

---

## FRONTEND PAGES TO CREATE

### Compliance
- /dashboard/compliance/revisal
- /dashboard/compliance/anaf-status

### Finance Declarations
- /dashboard/finance/d112
- /dashboard/finance/d394
- /dashboard/finance/declarations

### Accounting
- /dashboard/accounting/general-ledger
- /dashboard/accounting/trial-balance
- /dashboard/accounting/statements
- /dashboard/accounting/closing
- /dashboard/accounting/journal-entry

### Operations
- /dashboard/operations/fixed-assets
- /dashboard/operations/inventory-reconciliation

### Settings
- /dashboard/settings/vat-rates

### Onboarding
- /onboarding/wizard

---

Last Updated: 2025-12-24
Sprint: 7 of 7 (All Core Sprints Complete)

## NEXT PHASE: Production Hardening & Growth
- Support Ticket System (C3)
- Recurring Invoice Scheduling (C4)
- Performance optimization & load testing
- Security audit & penetration testing
- Marketing & launch preparation
