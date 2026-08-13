# DocumentIulia — Requirements / Requests Log

Append-only via `scripts/reqlog.py` (NEVER edit by hand — regenerated on every write).
Total: 48 · logged: 3 · planned: 4 · in_progress: 4 · shipped: 35 · parked: 2 · rejected: 0

| ID | Date | Status | Request | Links |
|---|---|---|---|---|
| REQ-001 | 2025-12-06 | **in_progress** | Build DocumentIulia.ro: AI ERP/accounting combining SAGA+OneStream+SAP, RO compliance (VAT 21/11, SAF-T D406, e-Factura), freemium, Grok API | CLAUDE.md |
| REQ-002 | 2026-07-06 | **shipped** | Blueprint v2->v3.1 + 5-horizon roadmap incl. Work & Delivery Platform pillar (section 09) | docs/blueprint/PLATFORM-BLUEPRINT-v3.1.html |
| REQ-003 | 2026-07-06 | **shipped** | Module where customers and freelancers can work in VMs (delivery workspaces: dev container / shared VM / GPU pod, RunPod, escrow+e-Factura l… | Blueprint §09 W-3,docs/blueprint/REQUIREMENTS-COVERAGE.md,W-1 sprint planned,W-1 worker launched,W-1,master b3b9bc77,/delivery-workspaces |
| REQ-004 | 2026-07-06 | **shipped** | W-0 free-tools funnel: CUI validator, VAT calc, salary calc, free invoice+e-Factura XML, SAF-T validator | SPRINT-PLAN-W0,worker running,master ddcbafe5,/tools/* |
| REQ-005 | 2026-07-07 | **shipped** | Full GDPR module: extensive research + blueprint as external product AND internal compliance | GDPR-A,S-61 GDPR-EXT MVP,PR#23 |
| REQ-006 | 2026-07-07 | **shipped** | Start with GDPR critical blockers | GDPR-A,PR#25-28 |
| REQ-007 | 2026-07-07 | **shipped** | Business Simulator v2 / Expert-Growth platform research + plan; approved order SIM->BC->FND->EXP | S-47..S-57 |
| REQ-008 | 2026-07-07 | **shipped** | All pages (templates/simulator/courses) accessible ONLY to registered accounts, gated by subscription level; fix the 4 test credentials | PR#30,PR#31,TierGuard |
| REQ-009 | 2026-07-07 | **shipped** | Simulator business cases with actual tenant data is OK now (login-gated) — integrate per initial research (mirror mode) | simv2.calibration service-delivery change |
| REQ-010 | 2026-07-08 | **shipped** | Tier-UX follow-ups: sidebar hiding, upgrade prompt on 403, subscription page | PR#32 |
| REQ-011 | 2026-07-08 | **parked** | Skip/postpone Grok advisor (S-52) | SPRINT-PLAN-S52 (resumable) |
| REQ-012 | 2026-07-08 | **shipped** | Start FND epic (EU funds) | S-53,S-54 |
| REQ-013 | 2026-07-08 | **shipped** | Implement all of planning-audit Finding 1 (BC gap) + external GDPR from Finding 2 | S-58,S-59,S-60,S-61 |
| REQ-014 | 2026-07-08 | **shipped** | Deploy multiple agents in parallel on independent items | S-59+S-61+follow-ups parallel batch; module-ownership pattern |
| REQ-015 | 2026-07-08 | **shipped** | Production/live-site error logger: log any error when clicking/using the site, like Chrome/Edge DevTools console | /dashboard/admin/error-logs,ClientErrorLog |
| REQ-016 | 2026-07-08 | **shipped** | Review: what would it take to bring the platform 2 levels up | Level+1/+2 report (chat) |
| REQ-017 | 2026-07-09 | **shipped** | Chronological implementation-requirements audit; user flagged missing VM module -> search all sources | docs/blueprint/REQUIREMENTS-COVERAGE.md |
| REQ-018 | 2026-07-09 | **shipped** | Give me all horizons blueprints | docs/blueprint/HORIZONS.md |
| REQ-019 | 2026-07-09 | **shipped** | Launch W-0 | W-0 sprint active,master ddcbafe5 |
| REQ-020 | 2026-07-09 | **shipped** | Build a requirements/requests logger for ALL documentiulia work, mandatory across sessions | scripts/reqlog.py,docs/requirements/ |
| REQ-021 | 2026-07-07 | **parked** | Stripe live keys -> real payments (DOC-44-2 + marketplace + subscriptions) | DOC-44-2 |
| REQ-022 | 2026-07-08 | **logged** | User must save printed keys: ENCRYPTION_MASTER_KEY, CREDENTIAL_SIGNING_KEY, PEER_REVIEW_HMAC_KEY; configure BACKUP_REMOTE; rotate RunPod+xAI… | GDPR-A,S-56 |
| REQ-023 | 2026-07-06 | **planned** | Financial consolidation (OneStream pillar, blueprint H2) — approved requirement, never scheduled | Blueprint §02/§07 |
| REQ-024 | 2026-07-06 | **planned** | Accountant channel: multi-client filing + white-label for firms (GTM wedge) | Blueprint §08 |
| REQ-025 | 2026-07-09 | **shipped** | Plan and launch W-1 delivery workspaces (the VM module) after W-0 | REQ-003,SPRINT-PLAN-W1 committed,W-1 worker launched,W-1 deployed |
| REQ-026 | 2026-07-09 | **planned** | W-1.5: live RunPod GPU provisioning + security review (needs RUNPOD_API_KEY + security-engineer sign-off) | W-1 |
| REQ-027 | 2026-07-09 | **shipped** | What about the external GDPR services provision module deliverable? | S-61,GDPR-SPRINT-PLAN Track B,S-62,master ffb95e4d |
| REQ-028 | 2026-07-09 | **shipped** | S-63 GDPR-EXT Shoulds: DPIA, vendor/DPA/SCC/TIA, LMS GDPR training, Data Act export, CMP hardening (TCF v2.3 + Consent Mode v2 + cookie scan… | GDPR-SPRINT-PLAN Track B,S-63 plan committed, worker launching,S-63,master 5f2a0e99 |
| REQ-029 | 2026-07-09 | **logged** | Lawyer review of GDPR-EXT generated templates (DPA, policies, breach/DSAR responses) before selling paid tiers | S-62 GE-LIABILITY |
| REQ-030 | 2026-07-09 | **shipped** | Find loose points / broken pages across the live site while S-63 runs | sweep: i18n x12 + WS gate, 3c201917 |
| REQ-031 | 2026-07-09 | **shipped** | Fix the errors captured by the live error logger | 3c201917,b337f941 |
| REQ-032 | 2026-07-09 | **shipped** | Investigate all logger errors + fix what is missing | b337f941,2815df44,0ca9ca7b honesty sweep |
| REQ-033 | 2026-07-09 | **shipped** | Remove all fabricated/mock data shown to users; wire mock-only pages (e-Factura, analytics, ANAF status, logistics reconciliation, finance t… | honesty sweep,a3c8dc57 — 4 pages wired; only analytics Goals widget stays demo (no backend) |
| REQ-034 | 2026-07-09 | **shipped** | Dedupe duplicate pages: /dashboard/efactura vs /dashboard/e-invoice (sidebar links e-invoice), and /dashboard/webhooks vs /dashboard/develop… | 0ca9ca7b,23ba852b |
| REQ-035 | 2026-07-10 | **shipped** | Fabrication residue in ~26 OTHER pages (Maria Ionescu / SKU-001 seeds: client-portal, blog, ecommerce, scheduling, employee-portal, logistic… | 7bc5f151 — 3 lanes + last mile; A-class 0 |
| REQ-036 | 2026-07-10 | **shipped** | Build backends for the 21 demo-bannered pages (procurement orders, inventory movements/alerts, expenses, assets, contracts, payroll runs, fr… | REQ-035,master a5410b33 — 15 pages wired (backends existed), FraudDetectionModule registered, 6 honest banners remain |
| REQ-037 | 2026-07-10 | **logged** | Marketing /about page lists fabricated executives (e.g. 'Elena Dumitrescu, CFO') — user decision: real team, placeholder, or remove |  |
| REQ-038 | 2026-07-10 | **in_progress** | MAJOR FINDING: the 21 'no backend' bannered pages nearly all HAVE backends under different module names (assets->asset-management 83 routes,… | REQ-036,PR#46 |
| REQ-039 | 2026-07-10 | **shipped** | Research and upgrade the frontend design | master 6657ea5c — Registrul viu live |
| REQ-040 | 2026-07-10 | **shipped** | Build genuinely-missing backends: projects controller, scheduling/meetings module, client-portal self-resolution ('my client' from JWT); wir… | master 22be257e |
| REQ-041 | 2026-07-10 | **shipped** | Organise how services are bundled and how users consume them from the dashboard burger/left menu | sidebar IA live |
| REQ-042 | 2026-07-10 | **planned** | Retire the legacy in-memory client-portal :clientId controller/service in favour of me/*; add create-goal UI for analytics goals; ATS /candi… |  |
| REQ-043 | 2026-07-23 | **shipped** | check functionality in documentiulia and group/create stand alone modules that can be used as standalone or in connection with other modules… | PR#33,docs/architecture/standalone-modules.md,PR#33,PR#34,PR#35,docs/architecture/standalone-modules.md |
| REQ-044 | 2026-07-23 | **in_progress** | make sure you are doing the /deep-research on all modules you implement |  |
| REQ-045 | 2026-07-23 | **shipped** | continue with build work, prioritize SAF-T D406 generation | PR#40,PR#40,PR#41,PR#42 |
| REQ-046 | 2026-07-24 | **shipped** | PRE-EXISTING BUG found during REQ-043 cleanup: DealsService.createDeal does not reject non-existent pipelineId (deals.service.spec.ts test f… |  |
| REQ-047 | 2026-07-24 | **shipped** | continue with the REGES-Online API integration | PR#44 |
| REQ-048 | 2026-08-13 | **in_progress** | do full review of entire platform and span multiple agents to close gaps and enhance functionality and accuracy and operability of the platf… |  |
