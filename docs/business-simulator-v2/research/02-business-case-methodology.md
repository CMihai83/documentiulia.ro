# Research 02 — Business-Case Submodule: Methodology + Output Generation

## PART A — METHODOLOGY

### A0. Document structure — HM Treasury Five Case Model
The UK/global public-investment standard (Green Book). Maps cleanly onto commercial cases.

| Case | Question | Module generates |
|------|----------|------------------|
| **Strategic** | Compelling case for change? | Problem, drivers, objectives, scope, strategic fit, SMART benefits |
| **Economic** | Best value for money? | Long-list → short-list options, NPV/BCR appraisal, sensitivity, non-monetary scoring |
| **Commercial** | Deal attractive & achievable? | Procurement/RFQ route, pricing, contract structure, supplier risk |
| **Financial** | Affordable? | Funding sources, budget impact, cash flow, financing (debt/equity) |
| **Management** | Deliverable? | Governance, plan/milestones, risk register, benefits realisation, assurance |

Staged maturity: **SOC → OBC → FBC** (model as a status flag). Offer **PRINCE2/lean** as a lighter template (Exec summary, Reasons, Business Options [do nothing/minimum/something], Benefits, Dis-benefits, Timescale, Costs, Investment Appraisal, Risks). RFQ costing = a third template. Exec deck order: Exec summary → Strategic context → Options → Commercial → Financial → Risks → Recommendation.

### A1. Investment appraisal — with required questionnaire inputs
- **NPV** — Σ discounted net cash flows − outlay; accept if >0. Inputs: t0 capex, per-period net cash flows (or drivers: revenue/opex/tax), #periods, discount rate, period convention, timing.
- **IRR** — rate where NPV=0; accept if > hurdle/WACC. Inputs: cash-flow vector with sign change. Watch multiple/no-IRR.
- **MIRR** (preferred headline) — separate finance rate (outflows) + reinvestment rate (inflows). Single-valued, defensible.
- **Payback / Discounted payback** — time to recover outlay (undiscounted / discounted).
- **Terminal value** — Gordon growth `TV=FCF·(1+g)/(WACC−g)` (g<WACC) or exit multiple `metric×multiple`; discount back.
- **WACC/discount rate** (make it a first-class guided step) — `WACC=E/V·Re+D/V·Rd·(1−Tax)`, `Re=Rf+β·(Rm−Rf)`. Inputs: risk-free rate, ERP/market return, beta, cost of debt, tax rate, D/E weights. SMB simplified path: pick hurdle directly. Store rate + justification (audit).
- **Also free from same vector:** BCR (PV benefits/PV costs), ROI, EAC.
- **Library note:** `financejs`/`formula.js` as reference/cross-check only; implement deterministic, tested in-house calculators (IRR/MIRR via bisection/Newton, XIRR for irregular dates) so results are auditable and identical to exported Excel formulas.

### A2. Risk & analysis — with inputs
- **Sensitivity (tornado)** — vary one input ±X%, rank by NPV swing. Inputs: variable list, ± range, output metric.
- **Scenario (base/best/worst)** — coherent bundles of driver deltas.
- **Monte Carlo** — distributions per uncertain input (triangular [min/mode/max] most user-friendly; normal/uniform/PERT/lognormal), correlations, N iterations → P10/P50/P90, P(NPV<0). Node: seeded PRNG + samplers (`d3-random`/`@stdlib/random`), server-side.
- **Break-even** — units = FC/(price−VC); for NPV break-even, goal-seek the driver giving NPV=0.

### A3. Unit economics / cash flow / financing — with inputs
- **Unit economics** — price/unit, VC/unit → contribution margin; +FC → break-even, operating leverage; subscription: CAC/LTV/churn/gross margin.
- **Working capital** (where naïve models lie about cash) — DSO/DPO/DIO (or % of revenue/COGS) → ΔNWC each period.
- **Cash flow** — `FCF = EBIT×(1−tax) + D&A − Capex − ΔNWC`. FCFF vs FCFE (→ discount at WACC vs cost of equity; financing flows appear or not).
- **Financing** — funding need, debt amount/rate/tenor, repayment (bullet/amortizing/interest-only), grace, equity, dividend policy → debt schedule, DSCR/interest cover.

### A4. RFQ / tender costing & pricing — with inputs
- **Cost-plus** — `price = fully-loaded cost × (1+markup%)`.
- **Target-margin** — `price = cost/(1−margin%)` (margin ≠ markup — capture which).
- **Should-cost** — bottom-up: BOM (materials×qty×unit), process (cycle time×labor rate), machine rate, overhead %, supplier margin, logistics/tooling/NRE.
- **Bid/No-bid** — weighted criteria (strategic fit, win prob, capability, competition, margin, delivery risk, relationship, resources) → score vs threshold.
- Output: priced bid with unit cost breakdown, contingency %, margin, one-off vs recurring, payment milestones, win-margin sensitivity (the Commercial case in practice).

## PART B — OUTPUT GENERATION (Node/NestJS)

### B1. Excel (formulas + charts + multi-sheet)
| Library | Formulas | Charts | Verdict |
|---|---|---|---|
| **ExcelJS** | ✅ writes formula strings + cached results (doesn't compute) | ❌ no native charts (issue #141) → embed rendered image | **Primary** for building from scratch (styling, multi-sheet, streaming, validation, conditional formatting) |
| **xlsx-populate** | ✅ best formula + **template preservation** | ⚠️ preserves template charts | **Template path** — ship branded .xlsx with real charts+formulas, inject values |
| **SheetJS (xlsx)** | limited (Pro adds calc) | weak | best for parsing/simple dumps |

**Hybrid strategy:** (1) Template path (default polished) — branded `.xlsx` w/ native charts+live formulas → xlsx-populate injects numbers → charts recalc live. (2) Generative path — ExcelJS with real `=NPV(...)`/`=IRR(...)` formula cells (sheets: Assumptions/Model/Cash Flow/Appraisal/Sensitivity/Scenarios). **Write real formulas, not just values**; cross-check ExcelJS cached result vs engine.

### B2. PowerPoint
**PptxGenJS** — the serious choice. Zero deps, ESM/CJS, native editable charts, tables, shapes, images, **Slide Masters** for branding. Ideal for the auto board deck.

### B3. PDF
- **Puppeteer (HTML→PDF)** — rich/branded, reuse CSS + Chart.js; ~1–3s/doc, needs Chromium. **Recommended** with HTML/Handlebars template following Five Case / PRINCE2.
- **PDFKit** — programmatic, high-volume, fine control; lower-level. Keep in reserve.

**Shared charting:** render once with **Chart.js + chartjs-node-canvas** → image in ExcelJS/PDFKit, native in PptxGenJS, `<img>` in Puppeteer HTML. One definition, four outputs.

## PART C — FEATURES → SPRINT STORIES (module `src/business-case/`)

**Engine 1 — Questionnaire Engine**
- BC-101 Question schema/DSL (JSON question sets, types incl. distribution/driver-table, conditional visibility, validation ranges).
- BC-102 Template selector (Five Case SOC/OBC/FBC vs PRINCE2/lean vs RFQ).
- BC-103 WACC/discount-rate wizard (CAPM + simplified) with stored justification.
- BC-104 Scenario & distribution capture (deltas; triangular/normal params).
- BC-105 Versioned assumption sets (audit trail; ties to 10-yr immutable-log rule).

**Engine 2 — Financial Model Engine (deterministic, tested)**
- BC-201 Cash-flow builder (FCFF & FCFE, multi-year monthly/annual).
- BC-202 Appraisal calculators (NPV/IRR/MIRR/payback/discounted payback/BCR/ROI/EAC) — unit-tested to match Excel to the cent (>90% coverage).
- BC-203 Terminal value (Gordon + exit multiple).
- BC-204 Debt schedule & financing (DSCR, interest cover).
- BC-205 Working-capital sub-model (DSO/DPO/DIO).
- BC-206 Sensitivity (tornado) + scenario engine.
- BC-207 Monte Carlo (seeded PRNG, samplers, P10/P50/P90, P(loss), correlations).
- BC-208 Break-even / goal-seek solver.
- BC-209 RFQ costing (cost-plus, target-margin, should-cost, bid/no-bid).
- BC-210 Unit economics / contribution margin.

**Engine 3 — Deliverable Generator**
- BC-301 Shared chart service (Chart.js + chartjs-node-canvas).
- BC-302 Excel — template path (xlsx-populate).
- BC-303 Excel — generative path (ExcelJS real formulas, multi-sheet).
- BC-304 PPTX board deck (PptxGenJS + Slide Master).
- BC-305 PDF business-case doc (Puppeteer + Handlebars, Five Case/PRINCE2).
- BC-306 Branding/theming config shared across generators.

**Cross-cutting:** immutable audit record per output; RO localization (diacritics, RON, VAT); Redis-cache heavy Monte Carlo. **Architectural rule: the model engine is the single source of truth — Excel mirrors it with real formulas (test-verified), PPT/PDF get engine values + charts. Never let generators compute independently.**

## Sources
Five Case Model: [APMG](https://apmg-international.com/article/five-case-model-global-standard-smarter-public-investment), [Knowledge Train](https://www.knowledgetrain.co.uk/project-management/business-cases/five-case-model), [Green Book guide](https://assets.publishing.service.gov.uk/media/5fb25e83e90e0709e50ce25a/Green_Book_guidance_short_plain_English_guide_to_assessing_business_cases.pdf). Excel: [mfyz](https://mfyz.com/nodejs-excel-library-comparison/), [ExcelJS #141](https://github.com/exceljs/exceljs/issues/141), [npm-compare](https://npm-compare.com/exceljs,xlsx,xlsx-populate). PPTX: [PptxGenJS](https://www.npmjs.com/package/pptxgenjs). PDF: [LogRocket](https://blog.logrocket.com/best-html-pdf-libraries-node-js/). Finance: [FinanceJS](https://financejs.org/), [Formula.js](https://formulajs.info/functions/).
