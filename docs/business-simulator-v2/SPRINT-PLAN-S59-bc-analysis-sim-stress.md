# Sprint S-59 — BC Analysis + Costing + SIM Budget Stress (BC-208/209/210, SIM-11)

**Epic:** BC + SIM (gap remediation part 2/3 of the approved queue S-58→S-61)
**Duration:** 2026-07-09 → 2026-07-23 · **Capacity:** 19 SP (tech-debt 20%)
**Builds on:** S-58 engine (bc.cashflow/debt/workingcapital, extended compute), S-51 sensitivity
(tornado/monteCarlo), S-49 mirror-mode calibration, S-50 sim scoring.

## Stories

### BC-208 — Break-even & goal-seek · 3 SP · SHOULD
- Pure `bc.goalseek.ts`: **break-even points** (units/revenue where NPV=0 or contribution covers
  fixed costs — both, labelled) and **reverse-solve** (bisection over a single chosen driver:
  price, volume, capex, or discount rate) for a target NPV or IRR, **within 0.1%**.
- Results show the required assumption change ("price must rise 7.3% to reach IRR 15%").
- **AC:** goal-seek converges within 0.1% on reference cases; non-solvable targets return a clear
  null+reason (never hang); break-even hand-validated.

### BC-209 — RFQ costing engine · 5 SP · SHOULD
- The RFQ questionnaire template exists (S-50: `rfq.*` fields) — build the missing engine
  `bc.rfq.ts`: **cost sheet** (direct labour/materials/overhead → full cost), pricing by
  **cost-plus** (markup) and **target-margin**, a **should-cost** comparison (user-supplied
  benchmark), and **bid/no-bid scoring** (weighted: margin vs threshold, capacity fit, strategic
  fit — DSL fields for the weights/threshold).
- `compute()` on an RFQ-template case produces the cost sheet + price + bid score in resultsJson
  (additive); results tab renders it for RFQ cases.
- **AC:** cost sheet reconciles; both pricing methods hand-validated; bid score vs threshold with
  a recommendation; existing RFQ template validation untouched.

### BC-210 — Unit economics · 3 SP · COULD
- Pure `bc.uniteconomics.ts`: **CAC, LTV (contribution-margin based), LTV/CAC, CAC payback
  months, contribution margin per unit** from DSL inputs (optional section, FIVE_CASE).
- Summary tiles on the results dashboard.
- **AC:** hand-validated; degenerate inputs safe (zero churn → capped/flagged LTV, not Infinity).

### SIM-11 — Monte-Carlo stress test of the real budget · 8 SP · COULD→SHOULD
- `POST simulation/v2/stress` (JWT+PRO): mirror-calibrate from the org's real data (S-49 path,
  same service-delivery stance + scrubbing), then run **≥500 seeded sim iterations** (perturb
  demand/costs/receivable-delay via the existing seeded RNG; deterministic per seed) over a
  chosen horizon → **P10/P50/P90 cash/equity trajectories + risk flags** (insolvency probability,
  min-cash month, worst event) + **risk-factor breakdown** (which perturbation drives the tail).
- **ERP recommendations + calendar hedges**: plain-language suggestions (e.g. "buffer 3 months
  opex by month 4", "DSO reduction covers the P10 gap") + suggested calendar entries returned in
  the response (wiring into the notifications module optional — do NOT block on it).
- Frontend: a "Stress test" card on the sim-v2 dashboard (fan chart P10/P50/P90 + flags). RO/EN.
- **AC:** ≥500 iterations deterministic per seed; percentiles monotonic; risk-factor breakdown
  present; runs entirely per-tenant (no cross-tenant data); does NOT mutate any real ERP data;
  practice-only semantics (no gamification/evidence side-effects).

## Ground rules
- All pure logic in new `.ts` modules + unit tests; compat gate: ALL existing src/business-case,
  src/funds, src/simulation tests stay green. resultsJson stays additive. Prefer zero migrations.
- SIM-11 must reuse `simv2.calibration` + the engine's seeded RNG — no new randomness source.

## Definition of Done
tsc + nest build clean; compat suites green; new unit tests hand-validated; integration vs
throwaway postgres: goal-seek on a stored case, RFQ compute persists cost sheet + bid score,
stress endpoint deterministic same-seed with monotonic percentiles + no ERP mutation (assert row
counts unchanged); frontend build clean. Independent verification before deploy.
