# Sprint S-54 — FND Funds Advisory (dossier · business-plan · co-fin/VAT · marketplace · durability)

**Epic:** FND (Funds & Financing Advisory) · **Horizon-2 order:** SIM → BC → **FND** → EXP
**Duration:** TBD (starts after S-53 deploys) · **Capacity:** 29 SP (tech-debt 20%)
**Basis:** `docs/business-simulator-v2/research/05-eu-funds-financing.md` (Part 3 workflow steps 3–9).
**Depends on S-53:** `FundingProgram`, `FundingProfile`, the 7-filter engine, `DeMinimisAid`, `FundingLead`.
**Master-plan phase:** "S-55 Funds advisory" = FND-5/6/7/8/9 (renumbered S-54 in our sequence).

## Goal
Take a matched applicant from "eligible" to "application-ready and durability-safe": a per-call
**dossier checklist**, a **business-plan + multi-year projection** (reusing the BC engine), a
**co-financing / VAT-eligibility calculator**, a **financing marketplace** for the reimbursement
cash-flow gap, and an **implementation + durability tracker** with deadline alerts.

## Reuse (do NOT rebuild)
- **BC financial engine** (`backend/src/business-case/bc.model.ts`: `buildCashflows/npv/irr/appraise`;
  `bc.deliverable.ts`) → FND-6 projections + export to a BC deliverable.
- **VAT calc** (`backend/src/vat/services/vat-calculation.service.ts`) → FND-7.
- **Notifications** module (`backend/src/notifications/`) → FND-9 deadline alerts. (No dedicated
  calendar module exists — FND-9 adds a durability-calendar model and drives alerts via notifications.
  Worker: grep for any existing deadline/reminder surface first and reuse it if present.)
- **Consulting bookings** (`backend/src/consulting/`) → optional "book an expert" CTA (not in scope to modify).

## Stories

### FND-5 — Dossier checklist generator · 5 SP · SHOULD
- Per-`FundingProgram` document checklist (Cerere de finanțare, plan de afaceri, situații financiare,
  declarații: eligibilitate / IMM / întreprindere unică / dublă finanțare / ajutor de stat / cofinanțare,
  buget-deviz + oferte, certificat constatator ONRC, act constitutiv, certificate fiscale). A checklist
  **template per legal basis / program type**, instantiated per application; each item status
  `missing|uploaded|verified` with upload tracking (reuse the documents/storage surface).
- **AC:** checklist generated per program; per-document status transitions; completeness % shown.

### FND-6 — Business-plan + financial-projection builder · 8 SP · SHOULD
- Multi-year P&L / cash-flow over the **durability horizon (implementation + 3–5 yr)** with
  **indicatori de rezultat/realizare** targets — built on `bc.model.ts` (do not reimplement NPV/IRR).
  Aligns projection years to the program's scoring grid; **exports to a BC deliverable** (`bc.deliverable.ts`).
- **AC:** projection spans impl.+durability; indicator targets captured; NPV/IRR via the BC engine;
  one-click export produces a BC deliverable for the funding application.

### FND-7 — Co-financing / VAT-eligibility calculator · 3 SP · SHOULD
- Beneficiary contribution = total − grant (grant ≤ program co-fin %, ≤~90%); split eligible vs
  ineligible costs. **VAT rule (COMPLIANCE-CRITICAL):** VAT is eligible **only if genuinely,
  definitively borne and non-recoverable** — a VAT-registered payer's deductible VAT is **INELIGIBLE
  even if not actually reclaimed**. Use the VAT service to classify.
- **AC:** contribution + eligible/ineligible split correct; VAT-payer path marks VAT ineligible;
  non-VAT-payer path allows it; unit tests both.

### FND-8 — Financing marketplace · 5 SP · COULD
- Instruments matched to the grant's reimbursement cash-flow gap: IMM Plus sub-schemes, **bridge
  credit / scrisoare de garanție bancară (FNGCIMM ≤~80%)**, leasing, factoring, VC/crowdfunding.
  Ranked to the funding need (grant is reimbursement-based → advance/bridge need), each with an
  eligibility snippet. Catalog + a simple ranking against the projected cash-flow gap from FND-6.
- **AC:** instruments ranked to the need; each carries an eligibility snippet; reimbursement gap
  drives the bridge-credit recommendation.

### FND-9 — Implementation & durability tracker · 8 SP · COULD
- Post-award tracker: **cereri de rambursare / plată** cadence, **Ordin MFE 1284/2016** procurement
  (private ≥2 bidders) checklist, and a **3–5 yr durability calendar** (min **3 yr SMEs / 5 yr large &
  public** from final payment) with reporting cadence. **Alert 30 days before each deadline** via the
  notifications module. Durability breach warning (asset disposal / indicator miss → financial correction).
- **AC:** durability calendar generated from final-payment date with correct 3/5-yr horizon; reporting
  cadence entries; alert fires 30 days out; procurement checklist enforces ≥2 bidders for private.

## Compliance items to VERIFY before deploy (romanian_tax_specialist gate)
- VAT eligibility: **deductible VAT is ineligible even if unclaimed** (FND-7) — the classic trap.
- Durability horizon **3 yr SME / 5 yr large & public** from final payment (FND-9).
- Grant intensity cap **≤~90%** co-financing; success-fee consultancy model is out of product scope.
- **Ordin 1284/2016** private-procurement ≥2 bidders (FND-9).
- All program-specific figures are point-in-time — keep them sourced (ties to future AI-1 auto-refresh).

## Out of scope
FND-10 MySMIS2021/AFIR live integration (confirm API first — "Won't, this horizon"); AI-1 auto-refresh;
EXP epic.

## Definition of Done
tsc + `nest build` clean; `npx jest src/funds --silent` green (VAT-payer vs non-payer, durability
horizon 3 vs 5 yr, checklist completeness); frontend build clean; integration vs throwaway
`postgres:15-alpine`: matched applicant → dossier checklist → projection built on BC engine + exported →
co-fin/VAT split (both VAT paths) → financing instruments ranked → durability calendar with a 30-day
alert. Additive migrations only. Independent verification incl. the two compliance cases before deploy.
