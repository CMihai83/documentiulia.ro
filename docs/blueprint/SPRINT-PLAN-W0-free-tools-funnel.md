# Sprint W-0 — Free-Tools Funnel (DOC-W0-1..5)

**Track:** Horizon W (parallel) · **Capacity:** ~22 SP · **Recovered spec:** `SPRINT-EXECUTION-PLAN-S41-46-W0.html` §W-0 (authoritative — read it).
**Goal:** Five zero-data-cost PUBLIC tools, each grabbing a different persona and funnelling to
signup: CUI validator (everyone/SEO), VAT calculator (SMBs), salary calculator (employees/PFAs),
free invoice + e-Factura XML (freelancers), SAF-T/e-Factura validator (accountants).

## Ground rules
- **PUBLIC surface**: pages live at `/[locale]/tools/*` (NOT under /dashboard, NOT auth-gated —
  verify middleware doesn't guard them); backend = a guard-free `tools` controller (mirror the
  `gdpr-public` pattern) with **throttling on every endpoint**.
- **Reuse, don't rebuild**: AnafLookupService (DOC-44-4, exists), the date-aware VAT rate engine
  (S-45/DOC-45-4 audit landed in the vat module — grep), invoice/PDF + UBL 2.1 XML logic
  (invoices/pdf/efactura modules), the SAF-T XSD validator (DOC-42-4).
- **Zero Prisma migrations**: anonymous caps tracked in Redis (hashed IP + cookie), not the DB.
- **GDPR**: uploaded XML validated in memory, never stored; IPs hashed for caps; no accounts data.
- **SEO**: tools pages server-rendered (no 'use client' on the shell), RO-first with EN toggle,
  proper <title>/meta, and a signup CTA on every tool.

## Stories (AC from the recovered spec)
- **DOC-W0-1 (5)** — `GET /api/v1/tools/cui/:cui` → AnafLookupService (24h Redis cache, 10 req/s
  backoff) → name, address, VAT-payer, split-TVA, e-Factura enrolled, inactive. Page
  `/[locale]/tools/verificare-cui`. AC: valid CUI → company + VAT status; invalid → friendly RO
  error; cached; graceful when ANAF down; server-rendered.
- **DOC-W0-2 (3)** — VAT calculator: date-aware 21/11/9 (+pre-Aug-2025 19/9/5), add/extract,
  reverse-charge note; shares the real rate engine; shareable URL params. Page `/tools/calculator-tva`.
- **DOC-W0-3 (3)** — Net↔gross salary: CAS 25%, CASS 10%, impozit 10%, deducere personală; both
  directions; matches an official reference example to the leu (commit the reference in the spec).
  Page `/tools/calculator-salariu`.
- **DOC-W0-4 (8)** — Free invoice: form → PDF (reuse pdf module) + RO_CIUS UBL 2.1 XML (reuse
  invoices/efactura logic); **anonymous cap 3/month** (Redis, hashed IP + cookie) with a clear
  signup CTA for unlimited; optional CUI auto-fill via W0-1. AC: XML passes XSD; PDF matches; cap
  enforced (4th attempt → CTA, not 500). Page `/tools/factura-gratuita`.
- **DOC-W0-5 (3)** — SAF-T / e-Factura XML validator: upload → XSD validate (reuse DOC-42-4
  validator + e-Factura XSD) → plain-language RO errors (line/field); **no data stored**; size cap
  (<10MB for the free tool). Page `/tools/validator-xml`. Tax-specialist-sensitive: errors must be
  actionable Romanian.

## Also
- A `/tools` index page linking all five + homepage/nav link ("Instrumente gratuite").
- Sitemap entries if a sitemap exists (grep first).

## Definition of Done
tsc + nest build clean; jest for the pure logic (salary math to the leu, VAT date matrix, cap
logic) + existing suites untouched; frontend build clean; integration: CUI endpoint (mock ANAF
response — do NOT depend on live ANAF in tests), invoice XML XSD-passes, cap 3→blocked, validator
rejects a broken fixture with an RO message and stores nothing; all tools pages reachable
UNAUTHENTICATED (200, not 307). Independent verification incl. anonymous-access proof before deploy.
