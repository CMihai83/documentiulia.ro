# Market Research — compliance-hub standalone module

**Method:** deep-research workflow (REQ-044), 157 agents launched / 140 completed
(salvaged from journal after host restarts; synthesis performed from the full
verified-claims corpus). 3-vote adversarial verification: **76 of 81 verifier
votes upheld, 5 refuted**. Run 2026-07-25. Pricing verified live.

## Executive summary — the verdict is a split product

**The fiscal compliance-calendar is NOT a viable standalone product** — it is
already commoditized and embedded everywhere in the Romanian market: SmartBill
gives ManagerConta (declaration submission + management) away **100% free to
every accountant regardless of platform**; eConta bundles 30–60-day deadline
alerts with a per-client obligation engine at €15/mo + €0.75–1.25/firm;
FiscalMind (ex-ANAF-inspector founded) bundles a declaration calendar with
alerts at 25–150 RON/mo; iSpv sells calendar+alerting with multi-company
accountant tiers; Lege5 gates personalized alerts behind login; contzilla and
CECCAR publish free editorial calendars. **Verdict: build the calendar as an
embedded retention layer across invoicing/accounting/hr modules, not as a SKU.**

**The GDPR toolkit is the differentiated half.** No Romanian fiscal-tool
competitor ships GDPR features (FiscalMind explicitly lacks GDPR, REGES
tracking, and retention). The price gap is wide open: international self-serve
tools (iubenda €5–20/mo, Usercentrics from $8/mo) cover only cookie/policy
basics with no Romanian workflow, while local human consultancy runs
€79–350/mo retainers (external DPO from €250–350/mo, one-time setup from
€700). ANSPDCP enforcement is broad, continuous, and **SMB-scale**: ~84
sanctions in 2025 (~€520k total, median ~€4k, 56 of 82 monetary fines ≤€5k),
hitting PFAs (€2,000), solo law offices (€4,000) and — notably — **accounting
firms themselves** (four fined €3k–10k in 2025, one after a data breach).

## Verified findings

### Demand drivers (fiscal)
1. **Deadline density is real**: ~293 distinct deadline entries Jan–Aug 2026
   (~36/month), each scoped by taxpayer category; D112/D300/D100/D394 all due
   by the 25th monthly — virtually every active firm has at least one ANAF
   deadline every month.
2. **Fine exposure is material and recurring**: ANAF 2024 — 64,471 inspections,
   16,108 contraventional fines totaling 153.2M lei; late filing fines
   500–5,000 RON by size; SAF-T late filing 1,000–5,000 RON; e-Factura 5-day
   breaches up to 10,000 RON + 15% of invoice value.
3. **Voluntary filing compliance was 94.4% in 2024** (ANAF's own KPI, below its
   96% target) — a 5–6% miss rate is the addressable pain.
4. **New cohorts keep arriving**: small taxpayers' first full SAF-T due
   2 Jun 2026; REGES transition fines 5,000–10,000 lei (erroneous data
   3,000–8,000 lei); minimum-wage REGES update deadline Jul 2026.
5. **e-TVA notices — TIME-SENSITIVE, CONTESTED**: mandatory 20-day responses
   with fines (1,000–10,000 lei by size) ran from 1 Jul 2025 (OUG 70/2024;
   2.14M pre-filled returns and 93,917 notices in H2-2024 alone), BUT a
   verified claim states the response obligation and sanctions are
   **eliminated from 1 Jan 2026** by new ordinance, with a separate suspension
   to 30 Sep 2026 for VAT-on-cash firms. Do NOT build marketing on the e-TVA
   response deadline without re-verifying the current ordinance text.

### Demand drivers (GDPR)
6. **ANSPDCP is active at SMB scale**: 5,300+ complaints and ~500
   investigations in 2024 (1.85M lei fines); ~84 sanctions through 2025
   (~€520k; €200–€40,000 range; median ~€4k). Enforcement is broadening —
   more fines, smaller average.
7. **Sanction grounds map 1:1 onto toolkit features**: insufficient security,
   missing legal basis, incomplete notices, invalid consent, uncontrolled
   processors, deficient DSR/incident handling.
8. **Accountants are both channel and customer**: multiple accounting firms +
   a PFA expert contabil fined in 2025 — the module's beachhead segment has
   personal fine exposure.

### Competitive pricing (live-verified)
| Offering | Price | Note |
|---|---|---|
| SmartBill ManagerConta | **free** for all accountants | declaration submission/management — kills paid standalone calendar |
| eConta (accountant platform) | €15/mo + €0.75–1.25/client firm | per-client obligation engine + 30–60d alerts embedded |
| FiscalMind | 25–150 RON/mo (launch; list 50–300) | calendar+alerts+SAF-T validation+ANAF checklist; NO GDPR/REGES/retention |
| iSpv | freemium, 60-day trial, multi-company tiers | D100/D101/D112/D300/D390/D394 calendar, status colors |
| PortalContabilitate (R&S) | ~126 lei/mo (~€25) | human-expert Q&A + calendar; "AI-free" positioning |
| iubenda | €5–€80/mo/site | cookie/policy tooling, no RO workflows |
| Usercentrics | from $8/mo | consent CMP only |
| RO GDPR consultancies | €79–350/mo retainers; €700+ one-time setup | human DPO bundled; the ceiling a toolkit undercuts |
| In-house DPO / DPIA / DSAR | €50–120k/yr; €688–2,236/DPIA; €3–7k/yr DSAR | the cost baseline for larger SMBs |

## Refuted claims (do not build on)
- Reconciliation-of-registers as a legal obligation sourced to KPMG material
  (0-3 twice — it was a training-seminar agenda, not law)
- LegalUp page-title pricing claim (title carries no price)
- One ManagerConta scope over-generalization (feature list confirmed; framing
  overreached)

## Product decisions (actionable)

1. **Do not ship compliance-calendar as a paid standalone.** Embed the
   deadline engine (fiscal-vector-aware, per-taxpayer-type, like eConta's) in
   invoicing/accounting/hr modules as a retention feature, free.
2. **Ship the GDPR toolkit as the paid compliance-hub product**: Romanian-
   language DPA/policy/notice templates, consent registry, DSR workflow with
   statutory clocks, processor register, breach-notification helper (72h),
   ANSPDCP-fine-grounds self-audit checklist. Price between iubenda and
   consultancy: **~49–99 RON/mo self-serve**, accountant/white-label
   multi-client tier (their own 2025 fines are the sales pitch).
3. **Wire the deadline engine to real system state** (our differentiator vs
   editorial calendars): e-Factura 5-day clocks from actual invoices, D406
   generation status, REGES day-before-start alerts (already shipped in
   hr-payroll REQ-047) — alerts driven by the customer's own data, not a
   generic list.
4. **Re-verify the e-TVA 2026 ordinance** before using notice-response
   deadlines in product or marketing (claim conflict flagged above).
5. Retention/e-audit module: defer — no verified willingness-to-pay signal
   surfaced.

## Open questions
1. Current text of the 2026 e-TVA ordinance (response obligation eliminated?)
2. iSpv/eConta traction numbers (users/revenue — none published)
3. ANSPDCP 2026 YTD enforcement trend
4. Whether Romanian SMBs buy GDPR tooling self-serve at all, or only under
   consultancy pressure (no direct conversion data surfaced)
