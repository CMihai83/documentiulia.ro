# Market Research — invoicing-efactura standalone module

**Method:** deep-research workflow (REQ-044), 104 agents, 5 search angles, 22 sources
fetched, 106 claims extracted, top 25 adversarially verified by 3-vote panels →
**20 confirmed, 5 refuted**. Run 2026-07-23. All pricing fetched live July 2026.

## Executive summary

Romania's regulatory calendar has closed the last escape hatches: the e-Factura
grace period for SMEs under €500k turnover expired **1 July 2026**, and SAF-T
D406 grace periods for small taxpayers wound down through 2025 — compliant
software is now effectively mandatory for every B2B seller, producing a
laggard-conversion demand wave **right now**. The market is barbell-shaped:
SmartBill gates compliance features behind tier upsells at the premium end;
Oblio bundles e-Factura + e-Transport + SAF-T *export* free at €29/year with
150k+ claimed users; SoftFactura (17 RON/mo) and factureaza.ro (public SPV API)
attack from below. The verified wedge: **bundle in one plan what incumbents
unbundle** — recurring invoicing + automated e-Factura B2B/B2C + **full SAF-T
D406 generation (not just export)** + e-Transport + ungated API — and sell to
**accountants managing multiple small-taxpayer clients** as the beachhead,
because SAF-T cannot be produced manually and accountants, not entrepreneurs,
are the prepared buyers.

## Verified findings

### Regulatory demand drivers (all high confidence)

1. **e-Factura enforcement fully live for the smallest firms** (11-1 across 4
   claims): SME grace expired 1 Jul 2026 (GEO 89/2025); scope expanded 1 Jan
   2026; 5-working-day transmission deadline; tiered late fines RON 1,000–2,500
   (small) to 5,000–10,000 (large) **plus 15% of invoice value** for invoicing
   outside the platform (issuer AND recipient). Law 88/2026 partially narrowed
   scope for CNP-identified individuals.
2. **SAF-T D406 phase-in complete** (9-0): small taxpayers mandated from 1 Jan
   2025 (Order 1.783/2021); degressive grace (6/5/4/3 months) expired through
   2025; late filing 1,000–5,000 lei, incorrect filing 500–1,500 lei (art.
   337^1, Legea 207/2015; waived if corrected before next deadline).
3. **SAF-T cannot be authored manually** (3-0): 390+ mandatory XML fields;
   DUKIntegrator is a validator, not an authoring path. Accountants are the
   prepared buyers (CCF president statement; medium confidence — predates the
   2025 phase-in).

### Competitive landscape (verified against live vendor pages, July 2026)

| Vendor | Price | What's verified |
|---|---|---|
| **SmartBill** (premium incumbent) | tiers ~€6–20/mo | Recurring invoicing + automated e-Factura = Gold+; API = Platinum-only (700 docs incl., €0.017/extra); e-Transport = €1.99/mo add-on; SAF-T stock = Gestiune tier €16.32/mo+. 30-day trial, no permanent free tier. PFA promo 50% off year 1 (to Dec 2026) — freelancers are contested. Entry price "€5.84/mo" REFUTED (0-3) |
| **SmartBill Conta** (accountant channel) | 25€ + 2€/CIF/mo (firms) | Free plan caps SAF-T at 10 transactions (unusable); paid tiers bundle SPV, declarations (D100/300/394), unlimited SAF-T. **This defines the accountant-channel price benchmark** |
| **Oblio** (volume leader) | €29/year unlimited | First year free; ≤3 docs/mo free forever; e-Factura + e-Transport UIT + SAF-T **export** bundled free; 150k+ claimed firms (registered, not paying), 40M+ invoices/yr, revenue 10.5M lei 2025 (2×). Gap: SAF-T is data export, NOT full D406 generation |
| **SoftFactura** (low-cost challenger) | Pro 17 RON/mo; API tier 197 RON/mo | Free tier 10 invoices+10 expenses/mo; pay-1-get-3 promo to Jan 2027. Its "full bundle incl. automatic SAF-T + SDKs" claim REFUTED (0-3) — pricing confirmed, feature depth not |
| **factureaza.ro** | public API | OAuth2 API generating + transmitting e-invoices to SPV, UBL CIUS-RO validation, automatic status retrieval |

### Pricing & GTM synthesis (medium confidence — inference from confirmed claims)

- **Self-serve pricing corridor:** between Oblio's €29/yr floor and SmartBill's
  €6–20/mo ladder → **~15–30 RON/mo** with a genuinely usable free tier
  (beat SmartBill Conta's 10-transaction SAF-T cripple).
- **Beachhead = accountant multi-client channel** at firm-base + per-CIF
  (benchmark 25€ + 2€/CIF/mo). Accountants are the prepared SAF-T buyers.
- **Differentiation bundle (one plan, no gates):** recurring invoicing,
  automated e-Factura B2B/B2C, **full SAF-T D406 generation**, e-Transport UIT,
  ungated API — exactly the set SmartBill tier-gates and Oblio half-covers.

## Refuted claims (do NOT build on these)

- SmartBill Facturare entry at €5.84/mo (0-3) — low-end anchor unknown
- SoftFactura full compliance bundle w/ automatic SAF-T + SDKs (0-3)
- SAF-T small/micro wave starting only Q3 2026 (0-3) — it started Jan 2025
- B2C e-Factura mandatory Jan 2025 + RO e-TVA details as stated (1-2) — B2C/PFA
  timeline is in flux after Law 88/2026; freelancer obligation partially deferred
- e-Factura late-transmission fine as flat RON 1,000–2,500 (0-3) — fines are
  tiered by taxpayer size

## Open questions / next research

1. Real TAM: how many companies in scope still lack compliant software (ANAF/ONRC data)
2. B2C + PFA obligation status after Law 88/2026 — when does the freelancer segment become compulsory
3. Unexamined competitors: FGO, Facturis, ContApp, Keez, bank offerings (no surviving claims)
4. Accountant-channel economics beyond list price: reseller margins, volume per-CIF discounts, switching willingness
5. Legea 141/2025 VAT-rate impact (21%/11%) — not covered by any surviving claim

## Product decisions for the module (actionable)

1. **Ship full SAF-T D406 generation** (authoring, not export) — the single
   clearest verified gap vs Oblio at the low end.
2. **No feature gates**: recurring invoicing, e-Factura automation, e-Transport,
   API all in every paid tier; API-first with docs (vs SmartBill Platinum-gating).
3. **Accountant workspace**: multi-CIF management priced firm-base + per-CIF
   (~25€ + ~2€/CIF), white-label option — beachhead channel.
4. **Free tier that's actually usable** (e.g., unlimited invoices, limited
   volume/mo) — conversion driven by SAF-T generation + automation, not caps.
5. **Compliance-deadline automation** (5-day transmission alerts, penalty
   calculator using verified fine tiers) as retention surface.
