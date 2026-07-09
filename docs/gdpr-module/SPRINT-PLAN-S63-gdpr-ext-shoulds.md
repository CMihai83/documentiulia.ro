# Sprint S-63 — GDPR-EXT Shoulds (DPIA · Vendor/DPA · Training · Data Act · CMP hardening)

**Track:** GDPR-C / Track B completion (after S-61 MVP + S-62 MUSTs). **Capacity:** ~29 SP.
**Unlocks:** the full Business-tier promise (DPIA + vendor/DPA/SCC) and Pro extras (training, TCF).

## Reuse
S-61/62 foundation (RopaEntry, tiered controller, guard-free public controller, LegalTerms,
assertPro/assertBusiness pattern) · **LMS (F-1)** for GE-TRAIN — courses/enrollment/completion +
the S-55 evidence bridge · AuditChainService · the existing CMP banner script (harden, don't rewrite).

## Honest constraints (carry-over + new)
- Templates remain `lawyerReviewed:false` (REQ-029). Nothing auto-submits anywhere.
- **IAB TCF v2.3**: full IAB registration/validation is a certification process — implement the
  TC-string mechanics (consent encoding, vendor-list consumption, CMP API stub) and mark
  "IAB registration pending" honestly; do NOT claim a registered CMP ID.
- **Google Consent Mode v2**: emit the gtag consent default/update signals from the banner —
  testable in a mini-DOM; real-site verification is a customer-side step.
- DPIA/TIA outputs are structured working documents, not legal advice (disclaimer + versioning).

## Stories

### GE-DPIA — DPIA module · 8 SP · SHOULD (BUSINESS tier)
- **Screening** (Art 35(3) + WP248 criteria + **ANSPDCP Decision 174/2018** national list —
  systematic monitoring, large-scale special categories, CNP at scale, employee monitoring…):
  a questionnaire over a RoPA entry → "DPIA required / recommended / not required" with reasons.
- **Risk matrix**: per risk (likelihood × severity, 4×4) with mitigations → residual risk;
  deterministic scoring, unit-tested.
- **Art 5 employee-monitoring wizard** (Law 190/2018): the 5 gates (legitimate interest proven,
  prior info, consultation, less-intrusive alternatives exhausted, **30-day max storage** unless
  justified) — pass/fail with remedies, blocks the DPIA sign-off until satisfied when applicable.
- **Art 36 export**: when residual risk stays high → generate the prior-consultation package draft.
- **AC:** screening verdict deterministic vs fixture matrix; risk math unit-tested; employee-
  monitoring wizard blocks until the 5 gates pass; Art 36 draft generated; BUSINESS-gated;
  versioned + disclaimed.

### GE-VENDOR — Vendor/processor register · 8 SP · SHOULD (BUSINESS tier)
- `Vendor` register linked to RoPA entries (recipients ↔ vendors); per-vendor: role, country,
  transfer mechanism.
- **Art 28 DPA generator** (EU 2021/915 SCC structure, RO/EN handlebars): instantiated from the
  vendor + the org's RoPA entries; versioned like policies; `lawyerReviewed:false`.
- **Sub-processor list + objection flow**: publish the org's sub-processor list (public URL like
  policies), record objections with a response clock.
- **Transfers**: SCC 2021/914 module picker (M1–M4 by role pairing) + a **TIA questionnaire**
  (destination-law risk, supplementary measures — mirror docs/gdpr-module/TIA-xai.md's structure);
  **DPF lookup**: a maintained allowlist check (US org claims DPF → verify manually; we store the
  claim + evidence link, we do NOT scrape the DPF site) with SCC fallback recommendation.
- **AC:** DPA generates from real vendor+RoPA data; module picker correct per role pairing
  (C2P/P2P/C2C/P2C); TIA produces a scored risk verdict + measures; sub-processor list public URL
  serves published only; objection clock recorded; BUSINESS-gated.

### GE-TRAIN — GDPR training via the LMS · 5 SP · SHOULD (PRO tier)
- Seed **role-based micro-courses** (RO): general staff, HR (CNP/Law 190), finance (retention),
  marketing (consent) — reuse the existing LMS course/lesson/quiz models (grep the F-1 surface;
  do NOT build a parallel LMS).
- **Annual re-assignment**: completion valid 12 months → @Cron re-enrolls/flags expiring (reuse
  the S-55 evidence-validity pattern); **completion evidence** export (who/when/score) for audits;
  ties into GE-CNP's "training attestation" condition (a valid completion satisfies it).
- **AC:** courses seeded + completable; completion satisfies the Law-190 training gate
  automatically; expiry flags at 12 months; evidence CSV export; PRO-gated.

### GE-DATA-ACT — Cloud-switching + full export · 3 SP · SHOULD (PRO tier)
- **Full-account export** (EU Data Act switching / doubles as Art 20): one endpoint streaming the
  org's data as a structured zip (JSON per module: invoices, partners, employees-sans-secrets,
  RoPA, policies, consents, DSARs) — reuse the module-by-module discovery pattern from GE-DSAR,
  org-scoped, async job if large. Switching-clauses doc added to LegalTerms.
- **AC:** export contains every module's org data and nothing cross-tenant; secrets/PII-encrypted
  fields handled per the internal export rules (mirror gdpr.service exportUserData exclusions);
  large-org path doesn't time out (chunked/async).

### GE-CMP-HARDEN — CMP hardening · 5 SP · SHOULD (PRO tier)
- **Cookie scanner**: given the tenant's site URL, fetch the page server-side (10s cap, polite UA)
  and statically detect known trackers/cookies (script-src heuristics against a seeded signature
  list — GA, GTM, Meta, TikTok, Hotjar…) → proposed banner categories. No headless browser
  (puppeteer optional follow-up); honest "static scan" label.
- **Google Consent Mode v2**: banner script emits `gtag('consent','default',…)` before load and
  `('consent','update',…)` on choice (ad_storage/analytics_storage/ad_user_data/ad_personalization).
- **TC string (TCF v2.3 mechanics)**: encode the consent decision into a spec-conformant TC string
  (purposes/vendors from a bundled GVL snapshot), expose `__tcfapi` stub returning it; label
  "IAB registration pending" — no CMP ID claimed.
- **Geo**: banner auto-shows for EU locales/timezone heuristic, configurable off.
- **AC:** scanner finds seeded trackers on a mock page (LOCAL http server in tests); consent-mode
  signals asserted in mini-DOM pre/post choice; TC string decodes back to the choices made
  (round-trip test); geo toggle works; PRO-gated config.

## Out of scope
GE-DPO marketplace (Could — separate legal entity per the plan) · IAB CMP registration ·
puppeteer-based deep cookie crawl · lawyer certification (REQ-029).

## Definition of Done
tsc + nest build clean; `jest src/gdpr-ext src/lms` green (screening matrix, risk math, 5-gate
wizard, SCC module picker, TIA scoring, TC-string round-trip, scanner signatures) + internal gdpr
lane untouched; frontend build clean. Integration vs throwaway postgres: DPIA screening→matrix→
sign-off blocked by employee-monitoring gates→Art 36 draft; vendor→DPA generated from RoPA + TIA
verdict + public sub-processor URL; training completion auto-satisfies the Law-190 gate; full
export org-scoped; scanner vs local mock page; consent-mode + TC string round-trip. ONE additive
migration. Tier gating per story (BUSINESS: DPIA/vendor · PRO: train/data-act/cmp-config).
Independent verification before deploy.
