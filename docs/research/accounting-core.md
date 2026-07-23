# Market Research — accounting-core standalone module

**Method:** deep-research workflow (REQ-044), 102 agents, 5 search angles,
3-vote adversarial verification → **9 confirmed findings, 3 refuted claims**.
Run 2026-07-23. All pricing verified live as of that date.

## Executive summary

The Romanian SME accounting market is **sharply bifurcated**: a dominant,
near-free legacy desktop base (Saga C — used by the majority of accounting
firms; WinMentor ~€416 one-time) versus a fast-growing but invoicing-centric
cloud tier (SmartBill €5.5–16/mo), with Romanian cloud adoption the
**second-lowest in the EU** (24.9% of enterprises, 2025, vs 52.7% EU average).
Regulation is the demand engine: SAF-T D406 monthly/quarterly for small
taxpayers since Jan 2025, e-Factura B2C since Jan 2025, electronic-only annual
filings from FY2025, and a legally mandated **monthly trial balance**. Verified
willingness-to-pay exists well above Saga's anchor when automation is bundled:
Keez charges €69–179/mo (service+software), and Pennylane (FR) prices its
accounting/close module at €79/mo — **5.6× its invoicing tier**. The wedge:
**multi-client cloud accounting for the ~20,500 active practicing accountants**,
led by e-Factura auto-booking, native SAF-T D406 generation from the GL, and
true PSD2 bank feeds — the three capabilities incumbents lack, meter, or bolt
on — priced per-company at **€10–30/mo**, not competing with Saga on price.

## Verified findings

### Market structure
1. **Addressable accountant base ~20,500 active** (18,851 active expert +
   1,662 active licensed; 2-1 vote; figures from the 2020 profession-structure
   update — label as such). The 33,278 headline CECCAR membership as
   addressable market was **refuted 0-3**.
2. **Bifurcation confirmed** (3-0): Saga C dominant among accounting firms
   (qualitative consensus — *no primary market-share number exists*),
   WinMentor legacy ERP, SmartBill leading cloud. Cloud adoption 24.9% (2025,
   Eurostat) — second-lowest in EU.

### Regulatory drivers (all high confidence, 3-0)
3. **OMFP 1802/2014 + Law 82/1991 = mandatory RO GAAP baseline**, in force
   as of 2026; IFRS only for listed/banks — RO chart of accounts is table
   stakes, IFRS secondary for SME segment.
4. **SAF-T D406 small-taxpayer obligation since 1 Jan 2025** (ANAF's own D406
   guide verbatim), monthly/quarterly per VAT period, grace expired mid-2026,
   fines to 5,000 lei. PFA/single-entry exempt.
5. **D406 requires transaction-level GL data keyed to the OMFP 1802 chart**:
   GeneralLedgerAccounts, GeneralLedgerEntries (incl. analytics),
   SourceDocuments (invoices, payments, stock, assets) — i.e. exactly this
   module's scope; **native D406 generation from the GL is the product**.
6. **Compounding 2025-26 drivers**: e-Factura B2C mandatory Jan 2025;
   electronic-only annual statements from FY2025; **monthly trial balance
   legally mandated** — directly mandating this module's trial-balance and
   period-closing features.

### Competitive pricing (high confidence, live-verified)
7. **SmartBill tiers €5.84–16.32/mo** — but its "bank import" is **manual
   CSV/Excel upload** (~11 banks auto-match), NOT live PSD2 feeds, and
   **incoming e-Factura ingestion is metered** (15/mo Gold, 50 Platinum,
   100 Gestiune). Both gaps are exploitable differentiators.
8. **Keez €69–179/mo per company** — bundles a human CECCAR accountant
   (service-plus-software, not comparable SaaS); WinMentor ~€416 one-time.
9. **European premium benchmark**: Pennylane (FR) accounting/close module at
   €79/mo = 5.6× its €14 invoicing tier — accounting/close commands a large
   premium over invoicing when automation justifies it.

## Refuted claims (do not build on)
- CECCAR 33,278 members as addressable market (0-3) — use ~20,500 active
- SmartBill Silver at exactly €5.84/mo as verified anchor (1-2)
- Pennylane Basic at ~€14/mo as verified anchor (1-2)

## Key caveats
- **Saga's own pricing was never primary-verified** — the "near-free anchor"
  is repeated consensus, not a confirmed price point (top open question).
- Accountant counts are 2020-vintage; cloud stat is general paid-cloud, not
  accounting-specific.

## Open questions / next research
1. Saga C's actual licensing model, price, and installed base (the anchor)
2. Does ANY Romanian incumbent offer true live PSD2 bank feeds; RO open-banking
   aggregator options (Smart Fintech, Finqware) and their pricing
3. In-house vs outsourced bookkeeping split among Romanian SMBs (decides
   per-company self-serve vs per-accountant GTM weighting)
4. SmartBill Conta's real feature depth (close, fixed assets, SAF-T) and
   adoption among firms — the closest direct competitor

## Product decisions for the module (actionable)

1. **Native SAF-T D406 generation from the GL** (transaction-level, OMFP 1802
   chart, analytics included) — the compliance feature the module scope maps
   onto 1:1; pairs with the invoicing module's D406 finding.
2. **e-Factura auto-booking, unmetered** — ingest received e-invoices and
   auto-post journal entries (SmartBill meters this; Saga can't cloud it).
3. **True PSD2 bank-feed reconciliation** (via RO aggregator) — no incumbent
   verified to have it; single strongest willingness-to-pay lever.
4. **Monthly trial balance + period close as first-class flows** — now legally
   mandated monthly, not just year-end.
5. **Accountant multi-client workspace** as beachhead (per-company €10–30/mo,
   volume discounts per CIF); don't fight Saga on price — sell the automation
   Saga structurally cannot deliver.
6. RO GAAP (OMFP 1802) chart complete first; IFRS 16/full IFRS deferred to the
   Europe stage.

> **Update (hr-payroll research, 2026-07-23):** Saga pricing now primary-verified — official sagasoft.ro: 500-2,500 lei/YEAR (VAT incl.), payroll bundled in the single license. The "near-free anchor" is confirmed fact, resolving open question #1. See [hr-payroll.md](hr-payroll.md) §4.
