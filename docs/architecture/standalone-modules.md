# Standalone Module Architecture (REQ-043, approved 2026-07-23)

Group the ~132 backend folders into **10 product modules + platform-core**, each
deployable standalone (certainty-engine pattern) or integrated in the platform.

## The dual-mode contract

Every product module is a **deployable slice of the shared source tree** — not a
fork. A dedicated entrypoint (`backend/src/main-<module>.ts`) bootstraps only
that module's graph (`backend/src/standalone/<module>-app.module.ts`), and a
compose stack under `modules/<module>/` gives it:

- **Standalone mode**: own Postgres (full schema, own data), own Redis, own
  `JWT_SECRET`, own port (31xx range), own Stripe plans. Sellable alone.
- **Platform mode**: the same modules run inside the full backend (:3001),
  sharing platform auth/tenancy; integration via EventEmitter events
  (versioned, e.g. `invoice.issued.v1`) and REST.

Global `@Global()` infrastructure modules (prisma, redis, cache, common,
logging, security, tenant, subscription, monitoring, charts, matching) must be
registered in every slice's app module.

## Module map

| Module | Port | Absorbs (backend/src dirs) | Status |
|---|---|---|---|
| **invoicing-efactura** | 3101 | invoices, vat, payments, billing, anaf | ✅ shipped + verified (template) |
| accounting-core | 3102 | accounting, bank-reconciliation, budget-management, controlling, asset-management, funds, expense-management | ✅ verified (slice boots, own auth) |
| hr-payroll | 3103 | hr, hr-contracts, hr-forms, payroll-saga, employee-portal, ats, hse, scheduling | ✅ verified (slice boots, own auth) |
| compliance-hub | 3104 | compliance, gdpr, gdpr-ext, freelancer | ✅ verified (slice boots, own auth) |
| docs-ai | 3105 | documents, document-generation, ocr, pdf, contracts, templates (+ certainty-engine lease pack) | ✅ verified (slice boots, own auth) |
| crm-sales | 3106 | crm, partners, reseller, marketing, client-portal | ✅ verified (slice boots, own auth) |
| ops-supply | 3107 | inventory, warehouse, procurement, vendor-management, logistics, fleet, courier, ecommerce, quality | ✅ verified (slice boots, own auth) |
| analytics-bi | 3108 | analytics, business-intelligence, dashboard, reports, simulation, fraud-detection | ✅ verified (slice boots, own auth) |
| projects-work | 3109 | project+projects+project-management (merge), workspaces, collaboration, workflow, consulting, expertise, business-case | ✅ verified (slice boots, own auth) |
| lms-content | 3110 | lms, content, certifications, help | ✅ verified (slice boots, own auth) |
| platform-core | 3001 | auth, users, mfa, tenant, sessions, settings, notifications, communication, webhooks, integrations, automation, audit, admin, monitoring + full app | existing backend |

## Approved cleanup (pending)

- Delete/merge 16 stub-duplicate dirs: `audit-logging`, `audit-trail`, `caching`,
  `config`, `customer-portal`, `data-export`, `document`, `export-import`,
  `gateway`, `imports`, `notification`, `portal`, `rate-limiter`,
  `rate-limiting`, `testing`, `logging`(empty) — after confirming no imports.
- Hoist `EventEmitterModule.forRoot()` to one root registration (currently
  re-declared in 35 modules).
- Prune transitive routes from slices via slim module variants (e.g.
  `InvoicesSlimModule` without FinanceModule) as needed.

## Known platform issues found during the REQ-043 audit

- **Live public API was unreachable**: Vercel rewrites `/api/*` to
  `api.documentiulia.ro`, which had no DNS record. Origin vhost added
  (nginx, both `/v1/*` and `/api/v1/*` forms → :3001); needs Cloudflare
  A record `api → 95.216.112.59` (proxied).
- ~18 dashboard pages still demo-bannered though backends exist (REQ-038).
