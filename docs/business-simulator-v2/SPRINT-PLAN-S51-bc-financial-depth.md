# Sprint S-51 — Business-Case Financial-Model Depth + Deliverable Generator

**Epic:** BC (Business Case) · **Horizon-2 order:** SIM → **BC** → FND → EXP
**Duration:** 2026-07-07 → 2026-07-21 · **Capacity:** 29 SP (tech-debt 20%)
**Builds on:** S-50 BC-101/102/103 studio (`backend/src/business-case/`: questionnaire DSL,
FIVE_CASE/PRINCE2_LEAN/RFQ templates, `bc.finance.ts` WACC/CAPM, versioned
`BusinessCase`+`BcAssumptionSet`, PRO-gated controller, frontend studio page).

## Goal
Turn a completed assumption set into a real investment appraisal — NPV/IRR/payback,
one-way sensitivity (tornado) and seeded Monte-Carlo — and generate the SOC/OBC/FBC
deliverable document (HM-Treasury Five-Case maturity levels) as a PDF.

## Reuse (do NOT rebuild)
- `bc.finance.ts` → `resolveDiscountRate()` already turns answers into the discount rate.
- `ChartService.renderToDataUri()` (`backend/src/charts/`) → charts as `data:` URIs for PDF embedding.
- `PDFGeneratorService.fromHTML()` (`backend/src/document-generation/`) → HTML→PDF (puppeteer).
- `handlebars` (already a dep) → deliverable templating.
- Determinism pattern from sim v2: seeded `mulberry32` PRNG carried in inputs, pure reducers.

## Stories

### BC-104 — Economic-case cashflow model (NPV/IRR/payback) · 8 SP · MUST
- Extend the DSL: add an **economic-case driver-table** to FIVE_CASE (annual `benefit`
  and `opex` streams over `model.years`; `mapsTo: 'model.benefits[]' / 'model.opex[]'`).
  `driver-table` field type already exists — wire validation (row count == horizon).
- Pure `bc.model.ts`:
  - `buildCashflows(assumptions)` → `{ year, capex, benefit, opex, net }[]` (year 0 = −capex).
  - `npv(rate, cashflows)`, `irr(cashflows)` — robust: sign-change scan + bisection,
    return `{ irr: number|null, multipleRoots: boolean }` (flag, don't crash).
  - `payback(cashflows)` + `discountedPayback(rate, cashflows)` (fractional year), `bcr`, `roi`.
- **AC:** hand-computed unit tests (NPV, IRR, payback to 4dp); IRR returns null+flag when no root.

### BC-105 — Sensitivity (tornado) + Monte-Carlo · 8 SP · MUST
- Pure `bc.sensitivity.ts`:
  - `tornado(assumptions, drivers, ±pct)` → per-driver `{ key, lowNpv, highNpv, swing }` ranked by swing.
  - `monteCarlo(assumptions, { iterations, seed })` — distributions from the `distribution`
    DSL field (triangular/normal/uniform/PERT); seeded `mulberry32`; returns NPV distribution
    `{ p10, p50, p90, mean, probNpvPositive, probIrrAboveHurdle, histogram }`.
- **AC:** same seed → identical results (deterministic); tornado ranks by |swing|;
  MC percentiles monotonic (P10≤P50≤P90); tests with a fixed seed asserting exact P50.

### BC-106 — Compute endpoints + results dashboard · 5 SP · SHOULD
- `POST :id/compute` → runs BC-104/105 against the latest assumption-set version, persists a
  `BcResult` snapshot (additive model: `bcId`, `assumptionVersion`, `resultsJson`, `createdAt`,
  `@@unique([bcId, assumptionVersion])`; additive offline migration). `GET :id/results` (latest).
- Frontend results tab on the studio page: NPV/IRR/payback cards, a **tornado** bar chart and a
  **Monte-Carlo NPV histogram** (Recharts), prob(NPV>0) gauge. RO/EN.
- **AC:** compute persists a snapshot keyed to the version; recompute after a new answer version
  produces a new snapshot; dashboard renders all three visuals.

### BC-107 — SOC/OBC/FBC deliverable generator · 8 SP · SHOULD
- `bc.deliverable.ts` — assemble an HTML deliverable from the template `skeleton` +
  assumptions + BC-104/105 results + embedded charts (`ChartService`), rendered via handlebars.
- **Maturity-aware** (HM-Treasury Five-Case): `SOC` = strategic + economic summary; `OBC` =
  + commercial/financial/management cases; `FBC` = full detail + sensitivity annex. Maturity
  drives which skeleton sections render and the depth.
- `GET :id/deliverable?maturity=SOC|OBC|FBC` → PDF (via `PDFGeneratorService.fromHTML`), PRO-gated.
  Set `BusinessCase.status` to the generated maturity.
- **AC:** each maturity produces a valid non-empty PDF; SOC omits the commercial/management
  cases that FBC includes; embedded NPV/tornado charts present; RO or EN by locale param.

## Out of scope (later sprints)
Grok AI advisor/narrative generation (S-52); real-time collaborative editing; e-signature;
FND/EXP epics. Keep the generator deterministic and template-driven this sprint.

## Definition of Done
tsc + `nest build` clean; `npx jest src/business-case` green; frontend build clean;
integration vs throwaway `postgres:15-alpine`: compute→persist→recompute→new snapshot,
deterministic MC (same seed), and a real PDF produced per maturity. One additive migration.
Independent verification by the coordinator before deploy.
