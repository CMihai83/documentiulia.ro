# Market Research — hr-payroll standalone module

**Method:** deep-research workflow (REQ-044), 104 agents (74 first pass +
resumed after usage-limit reset), 3-vote adversarial verification →
**12 confirmed findings, 3 refuted claims**. Run 2026-07-23.

## Executive summary

The market's dominant 2025-26 dynamic is the **REGES-Online transition**:
on 1 April 2025 Inspecția Muncii replaced the REVISAL desktop app with a fully
web-based portal; migration was mandatory by 31 Dec 2025 and **legacy REVISAL
has been dead since 1 Jan 2026**. Registration deadlines are hard (contract
transmitted the *calendar* day before start — a Monday start means Sunday
transmission — fined 20,000 lei/person) and there is an **official REST API**
for third-party software. But bare REGES automation is a **contested wedge** —
SAGA (v3.0.598) and Nexus Salarii already ship it — and D112/D205/INS/bank-file
generation is table stakes. Pricing is crushed downward by SAGA bundling
payroll into every license at **500–2,500 lei/YEAR per firm**. The defensible
plays: **(1) white-label multi-client payroll for bureaus/accounting firms**
(their 30–40 RON/employee/mo revenue leaves a few-RON-per-payslip software
ceiling; SAGA's REGES connection is desktop-first and *exclusive-mode*,
locking out portal edits — a real multi-client pain point), and **(2) a
cloud-native full HR suite** (ATS, self-service portal, shift scheduling, SSM
records) that SAGA structurally lacks.

## Verified findings

### REGES-Online (all high confidence, 3-0, official sources)
1. **REGES-Online fully replaced REVISAL** (HG 295/2025): web-based, no .rvs
   files; migration deadline extended to 31 Dec 2025 (OUG 46/2025 — only ~23%
   had migrated by Sept 2025); sole legal channel since 1 Jan 2026;
   non-enrollment fines 15,000–20,000 lei.
2. **Calendar-day-before-start transmission deadline**, verified as deliberate
   ("ziua anterioară", no working-day qualifier), fine 20,000 lei/person
   (capped 200,000 lei cumulative). The single most automatable deadline.
3. **Official REST API** (api.inspectiamuncii.ro, token per CUI/CIF, docs at
   github.com/reges-ro/integrare) — API integration is technical table stakes.
   → Our module must integrate this API, not legacy .rvs.
4. **The wedge is contested**: SAGA C v3.0.598 ships REGES support
   (desktop-only, exclusive-mode connection that locks out direct portal
   edits); Nexus Salarii has full API connection + migration assistants.

### Competition & pricing
5. **SAGA price anchor** (3-0, official pricing page): payroll bundled in every
   license, 500–2,500 lei/YEAR (VAT incl.) covering an entire accounting firm
   with up to 50 client web codes. Per-employee SaaS pricing must not compete
   head-on with this.
6. **SD Worx** (acquired colorful.hr Apr 2024): localized enterprise incumbent
   doing software AND outsourcing; pricing now quote-based only.
7. **Statutory outputs are table stakes** (3-0): Nexus auto-generates
   D112/D205/REGES; TrueHR workTeam covers D112, INS reporting, accounting
   notes, bank payment files for all Romanian banks. Match on day one.
8. **TrueHR/dp-Payroll (UCMS by AROBS)**: full HR suite overlapping our scope
   (personnel admin, e-timekeeping, recruitment, training, performance,
   employee portal, Web API), payroll serving 1,500+ companies.
9. **Western benchmark**: Factorial from $8/user/mo published (~$4.50 street);
   **no evidence Factorial/Personio ship Romanian statutory payroll** —
   internationals likely enter via partner models, leaving localization moat.

### Bureau economics (medium confidence, 3-0)
10. **Firma HRomania: 40 RON/employee/mo** core payroll (+10 lei payslip
    delivery, 15 lei/mo D112 submission, 20 lei/employee/yr tax forms);
    adasconsult.ro from 30 lei/employee/mo — brackets end-client pricing and
    caps white-label software at a few RON/payslip.
11. **Smartree ~900k payslips/yr across 350+ clients** (~75k/mo) — top-bureau
    volume concentration sizes the white-label opportunity per account.
    (Claim that its clients are "mostly multinationals" was refuted 0-3.)

### GTM synthesis (analytical inference)
12. Beachhead = **payroll bureaus + accounting firms adding payroll**, with
    cloud-native multi-client REGES/D112 workflows exploiting SAGA's
    exclusive-mode desktop limitation; second motion = SMB self-serve full HR
    suite (ATS/ESS/scheduling/SSM) where SAGA doesn't play at all.

## Refuted claims (do not build on)
- "Nexus has no public pricing" as a fact (0-3 — pricing may exist; recheck)
- "6-month REGES transition window / REVISAL still active" (0-3 — dead Jan 2026)
- "Smartree serves mostly multinationals" (0-3)

## Coverage gaps — do NOT rely on this report for:
- Market size (employer counts, HR-software adoption, outsourcing split — the
  "37% outsource" figure was never adversarially verified)
- 2025-26 payroll-tax changes (CASS/CAS, IT/construction exemption removals) —
  zero verified claims
- SSM/PSI training obligations, ITM digitalization — unverified
- Personio Romania localization — unverified

## Open questions / next research
1. Active employer counts in REGES-Online; in-house vs outsourced split (TAM)
2. Actual street pricing of Nexus, dp-Payroll/workTeam, SD Worx
3. Personio/Factorial Romanian statutory localization status
4. SAGA WEB REGES support status; is exclusive-mode still a pain point

## Product decisions for the module (actionable)

1. **REGES-Online REST API integration** (api.inspectiamuncii.ro, per-CUI/CIF
   tokens, github.com/reges-ro/integrare docs) — replace any legacy REVISAL
   .rvs code in `hr-contracts`/`payroll-saga`.
2. **Non-exclusive, cloud-native, multi-client REGES workspace** — the direct
   counter to SAGA's desktop exclusive-mode; delegated-user model for bureaus.
3. **Day-before-start automation**: registration wizard + calendar-day deadline
   alerts (Sunday transmissions!) with the 20,000 lei/person fine surfaced.
4. **D112 + INS + bank-file generation at parity from day one** (table stakes).
5. **White-label bureau pricing**: per-payslip few-RON model aligned to bureau
   30–40 RON/employee/mo revenue; SMB self-serve as second motion.
6. **Lead the SMB pitch with what SAGA lacks**: ATS, employee self-service,
   shift scheduling, SSM training records — not payroll price.
7. Defer payroll-tax rule marketing claims until the tax-change gap (CASS/CAS,
   exemption removals) is separately verified.
