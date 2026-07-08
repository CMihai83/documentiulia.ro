# Sprint S-61 — GDPR-EXT MVP (the SMB wedge: consent banner + policy generator + RoPA)

**Track:** GDPR-C (external product) per `docs/gdpr-module/GDPR-SPRINT-PLAN.md` §Track B + packaging.
**Capacity:** ~29 SP · **Runs in PARALLEL with S-59** (module ownership: this sprint owns the new
`backend/src/gdpr-ext/` module and is the ONLY parallel worker allowed to touch `schema.prisma`).

## Goal
The sellable GDPR MVP for SMB customers (they are controllers; we are their tooling): a **cookie
consent banner** (prior-blocking, equal-prominence reject, proof-of-consent), a **policy/notice
generator** (RO/EN clause library driven by the RoPA), and a **RoPA builder** (seeded from the
tenant's ERP, industry templates, controller AND processor views, RO 5-year retention defaults) —
all on a new **multi-tenant data-subject foundation**.

## Foundation — multi-tenant data-subject schema (prerequisite, from the plan)
New Prisma models (all org-scoped — the tenant's CUSTOMERS' data subjects, not our users):
- `DataSubjectRecord` (orgId, externalRef, email hash/blind-index, sourceModule)
- `ConsentRecord` (orgId, dataSubjectRef, purpose, granted Bool, method banner|import|api,
  bannerVersion, textHash — **immutable proof: no update path, supersede by new row**, ip/ua hashed)
- `RopaEntry` (orgId, role controller|processor, processName, purposes[], legalBasis, categories[],
  recipients[], transfers[], retentionMonths, securityMeasures[], status draft|active)
- `PolicyDocument` (orgId, kind privacy|cookie|employee, locale, version Int, html, sourceRopaHash,
  status draft|published, publishedAt) — versioned like BcAssumptionSet.

## Stories

### GE-ROPA-MVP · 8 SP · MUST
- RoPA builder: **seed from the tenant's own ERP shape** (which modules the org actually uses →
  propose entries: invoicing→customer billing data, HR→employee records, OCR→document processing…),
  **industry templates** (accounting practice, e-commerce, services), controller AND processor
  configs (an accountant is a processor for their clients), **RO defaults: 5y financial retention
  (10y where tax law requires — reuse the retention knowledge from GDPR-A), CNP flagged as
  special-national-ID (Law 190/2018)**.
- CRUD + a completeness indicator (Art 30 required fields per entry).
- **AC:** seeding proposes entries from actual org module usage; templates instantiate; controller
  vs processor views; Art-30 completeness %; retention defaults RO-correct.

### GE-POLICY-MVP · 8 SP · MUST
- Clause library (RO/EN, handlebars) → generate a **layered privacy notice + cookie policy** FROM
  the org's RoPA entries (purposes/bases/recipients/retention flow through — no free-text lies).
  Versioned `PolicyDocument` (each regen = new version, diffable); publish → public read-only URL
  `GET /api/v1/gdpr-public/policy/:orgSlug/:kind` (unauthenticated BY DESIGN, serves published HTML
  only). Auto-update-on-legal-change and lawyer-reviewed template certification are FLAGGED
  follow-ups (do not claim).
- **AC:** policy content demonstrably derives from RoPA (change RoPA retention → regenerated policy
  reflects it); versions diffable; public URL serves ONLY published versions; RO diacritics correct.

### GE-CMP-MVP · 8 SP · MUST
- **Consent banner**: an embeddable script (`GET /api/v1/gdpr-public/cmp/:orgSlug.js`, public) that
  renders a banner with **equal-prominence Accept/Reject** (RO/EN by page lang), per-category
  toggles (necessary/analytics/marketing), **prior-blocking helper** (categorised `<script
  type="text/plain" data-gdpr-category>` activation pattern), and posts consent to a public intake
  endpoint → **immutable ConsentRecord** (banner version + text hash + hashed ip/ua).
- Tenant config: categories, colors, policy link (from GE-POLICY). Proof-of-consent export (CSV).
  **IAB TCF v2.3 + Google Consent Mode v2 are FLAGGED follow-ups** (Pro-tier roadmap, not claimed).
- **AC:** script embeds on a plain HTML page (integration: serve a mock page, assert blocked script
  stays inert until accept); reject is one click, same prominence; consent rows immutable +
  exportable; per-org isolation (org A's banner can't write org B's records).

### Cross-cutting · 5 SP · MUST
- **Tier packaging** per the plan: Gratuit = banner + 1 auto policy + basic RoPA; PRO = full RoPA +
  versioned policies + consent export; BUSINESS = processor views + multi-entity. Enforce with the
  existing TierGuard (this is a REVENUE feature — gate consistently).
- **Liability ToS**: informational-only/no-legal-advice disclaimer component on every GDPR-EXT
  page + in generated docs footer ("nu constituie consultanță juridică"); lawyer-review flagged.
- Frontend `frontend/app/[locale]/dashboard/gdpr/page.tsx`: RoPA table + completeness, policy
  generator (preview/publish/versions), banner configurator + embed snippet. Sidebar link (PRO map
  entry: base features visible to FREE per packaging — gate granular actions, not the page).
- Audit-chain every mutating action (reuse AuditChainService).

## Module ownership (parallel-safety contract)
This worker touches ONLY: `backend/src/gdpr-ext/**` (new), `backend/prisma/schema.prisma` (+offline
additive migration), `frontend/app/[locale]/dashboard/gdpr/**` (new), one sidebar link line, and
`docs/gdpr-module/**`. DO NOT touch business-case, simulation, funds, expertise, or existing gdpr/
(internal) module files.

## Definition of Done
tsc + nest build clean; `jest src/gdpr-ext` green + full-repo suites untouched; frontend build clean;
integration vs throwaway postgres: RoPA seed→policy derives→publish→public URL serves; banner script
embeds + prior-blocking works + consent immutable + org-isolated; tier packaging enforced (FREE gets
basic, PRO full). Additive migration only. Independent verification (org isolation + consent
immutability + policy-derives-from-RoPA are the critical checks) before deploy.
