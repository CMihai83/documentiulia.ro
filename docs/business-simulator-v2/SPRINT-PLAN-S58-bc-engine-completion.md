# Sprint S-58 — BC Financial-Engine Completion (BC-201..205)

**Epic:** BC (gap remediation — master-plan Musts unshipped in the S-51 compression)
**Duration:** 2026-07-08 → 2026-07-22 · **Capacity:** 29 SP (tech-debt 20%)
**Basis:** `docs/business-simulator-v2/research/02-business-case-methodology.md` §A1/A3 + master plan §BC.
**Queue context (approved 2026-07-08):** S-58 BC engine → S-59 BC analysis+costing (BC-208/209/210,
SIM-11) → S-60 deliverable generators (BC-302..306) → S-61 GDPR-EXT MVP (GE-CMP+GE-POLICY+GE-ROPA).

## Goal
Upgrade the BC engine from the lean S-51 subset to the bank-credible master-plan spec: an
**FCFF/FCFE cash-flow builder** (monthly over 60 periods + annual summaries), the full appraisal
vector (**MIRR, EAC** added), **terminal value**, a **debt schedule with DSCR**, and a
**working-capital sub-model (DSO/DPO/DIO)** — all deterministic, unit-tested against hand/Excel
references to the cent.

## Ground rules
- **Extend `bc.model.ts` — do not break it.** Existing exports (`buildCashflows`, `npv`, `irr`,
  `payback`, `discountedPayback`, `bcr`, `roi`, `appraise`) are consumed by SIM/FND (S-54 FND-6
  calls `appraise()`); every existing test must stay green. New capability = new pure modules
  (`bc.cashflow.ts`, `bc.debt.ts`, `bc.workingcapital.ts`) + extended appraisal.
- Implement calculators **in-house, deterministic** (research note: financejs/formula.js as
  cross-check reference only) — bisection/Newton, auditable, matching Excel semantics.
- DSL additions go through the existing questionnaire system (new economic-case fields with
  `visibleIf`, validation, `mapsTo`) — versioned assumption sets keep working.

## Stories

### BC-201 — Cash-flow builder (FCFF/FCFE) · 8 SP · MUST
- `bc.cashflow.ts`: from P&L drivers (revenue, COGS %, opex, D&A, tax rate) + BS movements +
  working-capital deltas (from BC-205) + capex schedule → **monthly cash-flow rows over up to 60
  periods + annual summaries**. `FCF = EBIT×(1−tax) + D&A − Capex − ΔNWC`; **FCFF vs FCFE**
  (FCFE = FCFF − interest×(1−tax) − principal + new debt, discounted at cost of equity vs WACC —
  wire the financing flows from BC-204).
- DSL: monthly-driver fields (or annual + intra-year profile) added to the economic case.
- **AC:** matches a hand-built Excel reference **to the cent** (commit the reference vector in the
  spec); 60 monthly periods + annual rollups; FCFF and FCFE both produced and labelled.

### BC-202 — Full appraisal vector (add MIRR, EAC; cross-validate) · 8 SP · MUST
- Extend the appraisal: **MIRR** (separate finance rate for outflows + reinvestment rate for
  inflows — single-valued headline metric), **EAC** (equivalent annual cost for unequal-life
  comparisons). Cross-validate the whole vector (NPV/IRR/MIRR/payback/discounted/BCR/ROI/EAC) on
  shared fixtures; negative/multiple-IRR edge cases already handled — keep the null+flag contract.
- **AC:** MIRR matches Excel `MIRR()` semantics on the reference vector to 6dp; EAC hand-validated;
  all metrics consistent on shared fixtures; existing `appraise()` consumers unaffected.

### BC-203 — Terminal value · 3 SP · MUST
- Perpetuity-growth (Gordon) AND exit-multiple methods; user selects via DSL (`visibleIf`).
  TV discounted into NPV and **clearly labelled/separable** in results (NPV with vs without TV).
- **AC:** both methods hand-validated; TV correctly discounted from the final period; results
  expose the TV component separately; g ≥ discount rate rejected with a clear validation error.

### BC-204 — Debt schedule + financing · 5 SP · MUST
- `bc.debt.ts`: loan terms (amount, rate, tenor, **amortizing | interest-only | balloon**, grace
  period) → per-period schedule (interest, principal, closing balance) + **DSCR** and interest
  cover per period. **DSCR < 1.0 triggers a warning** in results. Feeds FCFE (BC-201).
- **AC:** amortizing/balloon/interest-only all hand-validated; DSCR warning fires; schedule totals
  reconcile (sum principal = amount) to the cent.

### BC-205 — Working-capital sub-model · 5 SP · MUST
- `bc.workingcapital.ts`: **DSO/DPO/DIO days** (or % of revenue/COGS fallback) → receivables/
  payables/inventory balances per period → **ΔNWC cash impact** feeding BC-201. Configurable
  improvement assumptions (e.g. DSO 60→45 over 12 months, linear).
- **AC:** NWC swings hit cash in the right periods and directions (DSO↑ absorbs cash, DPO↑ releases);
  improvement glide-path validated; degenerate inputs (zero revenue) safe.

## Integration surface
- `POST :id/compute` gains the extended results (cashflow statement, debt schedule, TV split,
  MIRR/EAC) in `resultsJson` — additive shape, existing consumers (results tab, FND-6) unaffected.
- Frontend: extend the BC results tab — cash-flow table (monthly→annual toggle), debt-schedule
  table with DSCR badge/warning, TV toggle in the questionnaire. RO/EN.
- Prisma: prefer NO new models (results live in `BcResult.resultsJson`); if a column is truly
  needed, additive offline migration as always.

## Out of scope (queued)
BC-208/209/210 + SIM-11 (S-59) · BC-302..306 generators (S-60) · GDPR-EXT (S-61).

## Definition of Done
tsc + `nest build` clean; ALL existing `src/business-case` + `src/funds` tests still green (FND-6
depends on `appraise()`); new unit tests match committed Excel-reference vectors to the cent (BC-201)
/ 6dp (MIRR); integration vs throwaway `postgres:15-alpine`: full compute on a debt-financed 24-month
case persists the extended results keyed to the assumption version, DSCR warning present, FCFF≠FCFE
labelled, TV separable; frontend build clean. Independent verification (hand-recompute one FCFF
period + one debt row + MIRR) before deploy.
