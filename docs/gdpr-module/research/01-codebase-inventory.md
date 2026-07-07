# Research 01 — GDPR/Privacy Codebase Inventory

> Read-only audit of what exists in `/root/documentiulia.ro`. Net: a real skeleton for the platform's own DSAR + consent + retention (~60-70% functional), undermined by security gaps; customer-facing "GDPR-as-a-service" is essentially UI mockups with no multi-tenant data model.

## 1. Backend `backend/src/gdpr/`
Registered in `app.module.ts`. Files: `gdpr.module.ts`, `gdpr.dto.ts`, `gdpr.controller.ts`, `gdpr.service.ts`, `retention.service.ts` + specs.

- **DSAR lifecycle — REAL.** `createDsrRequest`/`getDsrRequests`/`updateDsrRequest` persist to Prisma `DSRRequest` + write `AuditLog`; admin approval of a DATA_DELETION triggers `deleteUserData`.
- **Consent — TWO PARALLEL, INCONSISTENT impls.** REAL: `updateConsent`/`getUserConsents` upsert `Consent` (`@@unique([userId,purpose])`) with IP+UA+timestamp. STUB: `getConsentLog()` returns a hardcoded 3-item array; `recordConsent()` persists nothing — and those stubs are the ones wired to `GET /gdpr/consent-log` / `POST /gdpr/consent`.
- **Export (Art 20) — REAL but partial + UNSAFE.** Pulled user+invoices+employees+payrolls+documents+VAT/SAFT+aiQueries+auditLogs. **Leaked password hash, mfaSecret, mfaBackupCodes** (comment claimed sanitization, removed nothing). Omitted Partners/Contracts/ATS/freelancer.
- **Erasure (Art 17) — REAL but hard-deletes.** `$transaction` physically deletes invoices/VAT/SAFT (contradicts the claimed 10-yr retention) AND the audit trail (defeats accountability). No anonymization path.
- **Data inventory — STATIC** hardcoded 5-category list.
- **RetentionService:** REAL cron deletes `AIQuery` >365d; REAL monthly report on 10-yr-approaching invoices; STUB `scheduleDataDeletion()` only audit-logs (no `scheduled_deletions` table → 30-day grace deletion never runs).

> **⚠️ Both findings above were HOTFIXED (PR #22):** identity now from JWT (was `?userId=` — any authed user could export/erase anyone); secrets stripped from export.

## 2. Root GDPR docs vs code
`GDPR_IMPLEMENTATION.md`, `GDPR_SETUP.md`, `GDPR_QUICK_REFERENCE.md`, `GDPR_FILES_SUMMARY.md` (Dec 2025). Mostly match the code, BUT present it as production-complete (~70% real) and don't disclose the stubbed consent methods, no-op scheduled deletion, the export secret-leak, or the authz weakness. `GDPR_SETUP.md` references a nonexistent `add_gdpr_tables.sql` (models live in schema.prisma).

## 3. Adjacent compliance surface
- **Audit** (`backend/src/audit/`): `AuditLog` is a **normal mutable table** (no hash chain / WORM). `compliance-logging.service.ts` implements a real hash-chain + anonymize, but **all storage is in-memory Maps** (lost on restart) — sophisticated stub.
- **Security** (`backend/src/security/`): `encryption.service.ts` is a full AES-256-GCM impl (PBKDF2, envelope, rotation) — **but keys live only in an in-memory Map, and NO other service imports it.** `grep encrypt(` across services = nothing → **CNP/IBAN/bankAccount/mfaSecret stored plaintext at rest.** TLS handled at nginx.
- **Retention logic** scattered across 3 disjoint places; **no reusable anonymization utility**.
- **Backups** (`backend/src/backup/`): `backups/` holds ~30 daily `*.sql.gz` — **plain gzip, unencrypted**, full PII (CNP, salaries). No erasure propagation to backups.

## 4. Prisma models holding personal data (schema, 182 models)
`User` (email, name, cui, address, **password hash, mfaSecret, mfaBackupCodes**), `Employee` (**cnp**, salary), `Payroll`, `Partner` (cui, **bankAccount**), `AtsCandidate` (**only model with `gdprConsent`/`gdprConsentDate`**), `AtsApplication`, `FreelancerProfile` (cui, pfaNumber), `AIQuery` (Q/A may contain PII), `AuditLog` (ipAddress, mutable), `Consent` (the consent store), `DSRRequest`. Plus Contract/Invoice/Document/Timesheet/HRContract/HSEIncident etc. **No model has `deletedAt`/`anonymizedAt`/retention-expiry columns** — soft-delete + retention are not modeled. `Consent`/`DSRRequest` are **single-tenant** (no `organizationId`) — blocks multi-tenant customer tooling.

## 5. Frontend
- `components/gdpr/`: DataExportRequest, DataDeletionRequest, ConsentManager, PrivacyDashboard — real, call `/api/gdpr/...?userId=`.
- `app/api/gdpr/*`: real proxies to NestJS (forward the client `userId` — inherited the authz weakness, now fixed backend-side).
- `dashboard/settings/privacy/page.tsx`: real, tabbed.
- `components/GDPRCookieBanner.tsx`: real UI but **stores consent only in localStorage** (not auditable server-side) and **is not mounted anywhere** (never renders).
- Public `privacy/` + `terms/` pages (static). `dashboard/gdpr/page.tsx` (30KB) = **all hardcoded mock data**. `dashboard/admin/gdpr/page.tsx` = real DSR management.

## 6. Gap summary
**(a) Own compliance:** ~~authz flaw~~ (fixed), ~~export leaks secrets~~ (fixed) · erasure hard-deletes financial+audit (no anonymize) · consent fragmented (banner localStorage-only + unmounted; stub methods) · **encryption-at-rest unused, volatile keys** · **plaintext PII backups** · **mutable audit log** (hash-chain is in-memory only) · no-op scheduled deletion · no `deletedAt`/`anonymizedAt` columns · retention scattered · **missing:** breach 72h workflow, DPIA, real RoPA (static array), DPO register, sub-processor register, transfer records.
**(b) As a service:** customer `dashboard/gdpr` is all mock · consent/DSR models single-tenant (no data-subject model, no `organizationId`) · no CMP/SDK, RoPA builder, DPIA generator, breach register, data-map, DPA tooling, per-tenant retention.
