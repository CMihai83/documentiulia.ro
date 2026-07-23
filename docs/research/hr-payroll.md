# Market Research — hr-payroll standalone module (PARTIAL)

**Method:** deep-research workflow (REQ-044), 102 agents planned; **74 completed
before the session usage limit hit** (reset 7pm Berlin) — 14 claims fully
verified (3-0 panels), 28 verifications + synthesis pending. Resume scheduled;
this document will be finalized from the completed run. Run 2026-07-23.

## Verified findings so far (all 3-0)

### REVISAL → REGES-Online: the compliance landscape shifted in 2025

1. **From 1 April 2025 Inspecția Muncii replaced the REVISAL desktop workflow
   with REGES-Online** (reges.inspectiamuncii.ro) — fully web-based, no
   dedicated app install, **.rvs file generation no longer mandatory**
   (verified against Inspecția Muncii's own portal AND its official PDF).
   → **Product implication: our "REVISAL integration" must target the new
   REGES-Online system, not the legacy .rvs format.**
2. **Hard statutory deadline**: each employment contract must be registered and
   transmitted **at the latest the day before the employee starts work**,
   working day or not — a deadline any HR module must automate.
3. **Enrollment mechanics favor bureaus**: REGES-Online enrollment needs RoeID
   or a qualified certificate on the legal representative's CNP, and operation
   can be **delegated to an accounting firm with multiple delegated users** —
   a structural opening for the accountant/bureau channel (same beachhead as
   the invoicing and accounting modules).

### Competitive landscape

4. **Saga's pricing primary-verified at last** (also resolves the top open
   question in [accounting-core.md](accounting-core.md)): official
   sagasoft.ro pricing is **500–2,500 lei/YEAR** (SAGA WEB 1 → WEB 50, VAT
   incl.) — and **payroll (Salarii) is not a separately priced module; all
   functionality is bundled in the single license**. The near-free anchor is
   real: a standalone HR/payroll product competes against payroll at ~zero
   marginal cost for Saga users.
5. **colorful.hr (Romanian Software) now operates under SD Worx Romania** —
   public pricing no longer listed (former pricing page 301-redirects).
   Consolidation removed a price-transparent local competitor.
6. **Nexus Salarii already ships the compliance basics**: REGES-Online
   transmission, D112 + D205 generation, REVISAL data model — pricing
   quote-based (not public). → D112 generation is **table stakes**, not a
   differentiator; REGES-Online integration is expected.

### Bureau economics (the per-payslip benchmark)

7. **Firma HRomania publicly prices core payroll processing at 40 RON
   (~€8) per employee per month** — the concrete Romanian bureau benchmark.
8. **Smartree processes ~900,000 payslips/year** — the scale a single leading
   Romanian payroll outsourcer reaches; the bureau market is real and large.

## Pending (resume after limit reset)

28 claims still unverified, covering: employer counts under REGES obligation
(HG 295/2025 fines), D112 2025-26 structural changes (Order 605/95/928),
payroll-tax changes (CASS/CAS, IT/construction exemption removals), EY payroll
survey outsourcing split (44% figure unverified), Personio/Factorial
localization, SSM/SSM training obligations, and the synthesis/GTM
recommendation.

## Provisional product implications (to confirm at resume)

1. **REGES-Online API integration** replaces legacy REVISAL .rvs handling —
   check what our `hr-contracts`/`payroll-saga` modules currently emit.
2. **Day-before-start registration automation** with deadline alerts — the
   sharpest single compliance hook.
3. **Bureau/accountant delegated-user workspace** — multi-company payroll
   priced against the 40 RON/employee/month bureau benchmark (software should
   undercut the service price meaningfully).
4. D112 generation required for parity; differentiation must come from
   REGES automation depth, self-service portal, and SSM training records
   (pending verification of SSM obligations).
