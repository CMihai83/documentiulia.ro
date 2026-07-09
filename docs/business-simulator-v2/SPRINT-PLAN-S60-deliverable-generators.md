# Sprint S-60 — Deliverable Generator Suite (BC-302..306)

**Epic:** BC (gap remediation part 3/3 — final queued sprint)
**Capacity:** 26 SP · **Basis:** research 02 Part B (Excel/PPTX/PDF generation) + master plan §BC.
**Builds on:** S-58 extended engine (cashflow/debt/TV), S-59 (RFQ/UE/break-even), S-51 deliverable
(`bc.deliverable.ts` HTML), ChartService (F-5), existing deps: exceljs? xlsx-populate? pptxgenjs?
puppeteer 24.x (present). **Check package.json first** — add ONLY missing libs (exceljs, pptxgenjs)
as prod deps; justify each.

## Stories

### BC-301 — ChartService integration · 3 SP · MUST *(mostly done — verify + close)*
- BC-107/S-51 already embeds ChartService PNGs in the HTML deliverable. Story = ensure ALL model
  charts (NPV bridge, tornado, MC histogram, cash-flow trajectory, debt/DSCR) come via ChartService
  and render in every output format without duplicated chart code.
- **AC:** one chart-config builder shared by HTML/PDF/PPTX paths; no per-format chart code.

### BC-302 — Excel template path (xlsx-populate or exceljs templating) · 5 SP · MUST
- Populate a **branded workbook template** (commit a reference `.xlsx` template under
  `backend/assets/bc/`): named fields for assumptions/appraisal, tables for cashflow/debt.
- **AC:** fields replaced; tables land on the right sheets; no broken references (file opens clean
  — validate by re-reading the generated workbook with the same lib and asserting cell values).

### BC-303 — Excel generative path (ExcelJS, live formulas) · 8 SP · MUST
- Build a workbook from scratch: sheets **Assumptions / Cash Flow / Appraisal / Ratios**, where
  Appraisal cells contain **live Excel formulas** (=NPV(...), =IRR(...), =MIRR(...)) referencing
  the Cash Flow sheet — so the exported model recalculates when a bank analyst edits assumptions.
- **AC:** formulas present as formulas (not baked values) and reference the right ranges; a
  re-read of the file asserts formula strings; computed fallback values match the engine to the
  cent (Excel's stored cached values = engine outputs).

### BC-304 — PPTX board deck (PptxGenJS) · 5 SP · SHOULD
- 10–15 slides: exec summary, key metrics tiles (NPV/IRR/MIRR/payback/DSCR), cash-flow chart,
  tornado, MC histogram, risks, recommendation — populated from the case + results, maturity-aware
  (SOC = shorter deck).
- **AC:** deck generates with charts rendered (ChartService PNGs) + populated text; slide count
  10–15; RO/EN.

### BC-305 — Real PDF report (Puppeteer + the existing handlebars HTML) · 5 SP · SHOULD
- Replace the ~111-byte `fromHTML` text-stub path for BC deliverables with a **real Puppeteer
  render** of the S-51 maturity-aware HTML: TOC, page numbers (header/footer template), embedded
  charts, A4. Reuse the existing `bc.deliverable.ts` HTML — do NOT rewrite the content layer.
  Puppeteer already ships in the image (verify chromium availability in Docker; if the container
  lacks deps, document the Dockerfile addition needed and implement it).
- **AC:** PDF is a real multi-page render (size >> stub, `%PDF` + page count ≥ 3 for FBC); TOC +
  page numbers present; SOC still omits sections FBC includes (regression).

### BC-306 — Tenant branding config · 3 SP · SHOULD *(cut from 3→scope-tight if needed)*
- Org-level branding (logo URL/base64, primary/accent colors, footer text) stored on Organization
  settings Json (NO new model); applied across HTML/PDF/PPTX/Excel outputs.
- **AC:** logo + colors appear in all four formats; default (no branding) unchanged.

## Ground rules
Module ownership: `backend/src/business-case/**` + `backend/assets/bc/**` + Dockerfile (only if
puppeteer deps needed) + the BC results tab download buttons. Zero schema changes (branding lives
in Organization.settings). Compat gate: all business-case/funds suites stay green. Generated files
stream with correct MIME; size caps; RO diacritics correct in every format.

## Definition of Done
tsc + nest build clean; compat suites green; per-format integration proofs (re-read Excel asserts
formulas+values; PPTX slide count; PDF page count + SOC/FBC regression; branding applied);
frontend build clean. Independent verification incl. opening/parsing each generated artifact
before deploy.
