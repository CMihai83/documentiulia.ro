# Sprint S-62 — GDPR-EXT: the remaining MUST epics (DSAR · Breach · CNP · Liability)

**Track:** GDPR-C / Track B completion. **Capacity:** ~29 SP.
**Why:** S-61 shipped only the MVP (GE-CMP + GE-ROPA + GE-POLICY, each partial). The **paid tiers
cannot be sold today**: Pro (49 RON) promises DSAR-with-deadline-tracking; Business (149 RON)
promises DPIA + breach + vendor/DPA/SCC + CNP pack. This sprint delivers the MUST epics that unlock
Pro and most of Business; the Shoulds (DPIA, VENDOR, TRAIN, DATA-ACT, CMP hardening) follow in S-63.

## Reuse
- Multi-tenant foundation from S-61: `DataSubjectRecord`, `ConsentRecord`, `RopaEntry`,
  `PolicyDocument`, `CmpBannerConfig` + the tiered controller + the guard-free public controller.
- **Internal** single-tenant DSR logic in `backend/src/gdpr/gdpr.service.ts` (GI-DSR-1: retention-aware
  erasure, restrict-vs-delete semantics, export-minus-secrets) — the MULTI-TENANT DSAR must mirror
  those semantics for the *tenant's* data subjects. Read it; do not fork the rules.
- `AuditChainService` (hash-chained) for every DSAR/breach action. LMS for GE-TRAIN (S-63).

## Honest constraints (do not overclaim)
- **No legal certification.** Every generated document (DPA, breach notification, DSAR response)
  carries the existing "nu constituie consultanță juridică" disclaimer and is marked
  `lawyerReviewed: false`. A partner-cabinet review is a business step, flagged, never asserted.
- **Erasure across backups** is genuinely hard: implement a documented `ErasureLedger` (record the
  erasure request + a backup-expiry date derived from the retention policy) rather than pretending
  we rewrite encrypted backups. State this in the DSAR response text.
- ANSPDCP forms: generate the *content*; submission remains manual (no ANSPDCP API exists).

## Stories

### GE-DSAR — Multi-tenant DSAR portal · 13 SP · MUST
- Models: `DsarRequest` (orgId, dataSubjectRef, type access|erasure|rectification|restriction|
  portability|objection, status new|verifying|in_progress|responded|refused, receivedAt, dueAt
  (= receivedAt + 1 month, Art 12(3)), extendedTo?, verificationTier, responsePayload Json?,
  refusalReason?), `DsarEvent` (immutable trail), `ErasureLedger` (see constraints).
- **Branded public intake** at `GET/POST /gdpr-public/dsar/:orgSlug` (guard-free, throttled, org
  resolved from slug ONLY — same isolation contract as consent intake).
- **Proportionate tiered ID verification** (Art 12(6)): low (email confirm token) / medium (email +
  known-record match) / high (document upload → manual review) — chosen by request type & risk;
  never demand ID for a simple access request from a verified account.
- **1-month clock** with a 2-month extension (Art 12(3)) — `dueAt` computed, extension recorded with
  a reason; **countdown + overdue flags** surfaced; daily @Cron warns at T-7 and marks overdue.
- **Cross-module discovery**: a `DataSubjectDiscoveryService` that, given an identifier, collects the
  tenant's records across their modules (invoices/partners/employees/consents) → machine-readable
  export (JSON + CSV zip, Art 20 portability).
- **Erasure**: mirror the internal retention-aware semantics (tax records → *restrict* not delete;
  anonymize instead where lawful); write an `ErasureLedger` row incl. backup-expiry date.
- **AC:** intake org-isolated; dueAt correct + extension; verification tier enforced per type;
  export contains the tenant's records for that subject and nothing from other orgs; erasure
  restricts-not-deletes fiscal records and logs the ledger; every step audit-chained; overdue cron.

### GE-BREACH — Breach + incident · 8 SP · MUST
- `BreachIncident` (orgId, detectedAt, description, categories[], affectedCount, riskScore,
  status triage|assessed|notified|closed, **notifyDueAt = detectedAt + 72h**, dpaNotifiedAt?,
  subjectsNotifiedAt?, register Json) + `BreachAction` trail.
- **72h countdown** (Art 33) with T-24h/T-6h warnings (@Cron); **ENISA-style severity scoring**
  (data-processing-context × ease-of-identification × circumstances → low/medium/high/very-high);
  **auto-draft the ANSPDCP notification** (Decision 128/2018 content fields, RO) + an Art 34
  subject-notification draft when risk is high; **Art 33(5) register** export (every breach, even
  un-notified, with the reasoning).
- Optional NIS2/DNSC 24h+72h dual track flagged as a follow-up (out of scope, note it).
- **AC:** notifyDueAt = +72h; severity computed deterministically (unit-tested matrix); ANSPDCP
  draft contains the mandatory fields; register exports all incidents incl. non-notified with
  justification; nothing auto-submits anywhere.

### GE-CNP — CNP compliance pack (RO differentiator) · 5 SP · MUST
- Detect CNP processing across the tenant's RoPA + actual data (reuse the S-55/GDPR-A CNP detection
  regex + `isValidCnp`): when a RoPA entry's legal basis is **legitimate interest** and CNP is in
  its data categories → **Law 190/2018 Art 4 triggers**: force (a) DPO designated, (b) explicit
  retention period set, (c) staff-training attestation, (d) documented safeguards.
- A `Law190Check` result surfaced on the RoPA UI: pass/fail per condition with the remedy;
  **blocks** marking that RoPA entry `active` until satisfied.
- **AC:** legit-interest+CNP entry fails until all four conditions are met; consent/contract bases
  are unaffected; valid-CNP detection unit-tested; blocking is enforced server-side, not just UI.

### Cross-cutting — Liability ToS + tier packaging enforcement · 3 SP · MUST
- Informational-only ToS component + `lawyerReviewed:false` metadata on every generated artifact;
  AS-IS + 12-month cap + "no individual case assessment" clauses in a versioned `LegalTerms` doc.
- **Enforce the packaging** with TierGuard: Gratuit = banner + 1 policy + basic RoPA (existing);
  **PRO = DSAR portal + deadline tracking**; **BUSINESS = breach module + CNP pack** (+ DPIA/vendor
  when S-63 lands). Free tier hitting a paid route → the standard upgrade-message 403.
- **AC:** paid routes tier-gated per the packaging table; disclaimer present on every generated
  document and page; ToS versioned.

## Out of scope (S-63)
GE-DPIA · GE-VENDOR (Art 28 DPA gen, SCC modules, TIA) · GE-TRAIN (LMS reuse) · GE-DATA-ACT ·
CMP hardening (IAB TCF v2.3, Google Consent Mode v2, cookie scanner, geo) · GE-DPO marketplace.

## Definition of Done
tsc + nest build clean; `jest src/gdpr-ext` green (dueAt math incl. extension, ENISA matrix,
Law-190 gate, verification-tier rules) + `src/gdpr` untouched; frontend build clean.
Integration vs throwaway postgres: public DSAR intake org-isolated → verification → discovery export
contains only that org's subject data → erasure restricts fiscal records + writes ErasureLedger →
overdue cron flags; breach 72h + ENISA score + ANSPDCP draft + register export; Law-190 blocks an
active legit-interest+CNP RoPA entry until remedied; tier packaging enforced (FREE→403 on DSAR).
Additive migration only. **Nothing auto-submits to any authority.** Independent verification
(org isolation, erasure semantics, no-auto-submit, tier gating) before deploy.
