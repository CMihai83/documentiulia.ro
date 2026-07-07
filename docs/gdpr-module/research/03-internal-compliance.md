# Research 03 — DocumentIulia's OWN Internal GDPR & AI-Act Compliance

> Engineering-grade compliance analysis (not legal advice). Sourced across EDPB, EUR-Lex, CJEU, ANSPDCP, ENISA, CNIL + concordant law-firm analyses, July 2026. Three findings are time-sensitive — re-check before acting: (a) EU-US DPF under live CJEU appeal; (b) AI Act "Digital Omnibus" postponement agreed but **not yet in the OJ**; (c) xAI contract terms read from Wayback — confirm the signed version.

## 1. The dual-hat architecture
Role is **functional per-processing-activity** (EDPB 07/2020 §82), not per-company.
- **PROCESSOR** (customer decides purpose/means): tenant accounting/invoices/payroll/HR/timesheets/ATS-candidates/freelancer profiles. A standardised SaaS is a processor *provided you don't process for your own purposes*.
- **CONTROLLER** (you decide): your own user accounts, auth, billing, marketing, platform/security telemetry, own-learner LMS, the marketplace.
- **THE TRAP — Art 28(10) role-flip:** the moment you process *tenant* data for *your own* purpose (**training the AI simulator on real financials**, product analytics, benchmarking) you become controller for that processing. CNIL 12 Jan 2022 requires **specific written per-controller authorisation** (not a blanket DPA clause) + an Art 6(4) compatibility test. **This is the single biggest architectural risk in the product vision.**

## 2. Art 28 duties, sub-processors, transfers
- **DPA content (Art 28(3)):** the 8 mandatory clauses + duty to flag infringing instructions; must NOT merely restate GDPR (EDPB 07/2020 §112).
- **Sub-processor chain:** Hetzner (DE), Cloudflare (US), xAI (US), Stripe (US), Bunny.net (SI), Clerk (US). A public webpage alone is **non-compliant** — you must actively inform controllers of each new sub-processor with location/function/safeguards (EDPB 07/2020 fn54). Market convention: 30-day notice + objection + terminate-without-penalty.
- **Transfers — DPF status (verify live at dataprivacyframework.gov/list):**

| Vendor | Loc | DPF? | Mechanism |
|---|---|---|---|
| Hetzner | DE | N/A | Art 28 DPA, ISO 27001, EU-only DCs |
| Bunny.net | SI | N/A | DPA + enable **EU-only routing filters** |
| Stripe | US | **Yes** | DPF + SCC; **independent controller** for fraud/AML/Link (§2.4) |
| Cloudflare | US | **Yes** | DPF + SCC + Data Localization Suite |
| Clerk | US | **Yes** | DPF + SCC; **no EU residency — auth data in US** |
| **xAI** | US | **NO** | **SCC-only (Module 2/3) — requires a documented TIA** |

- **DPF is wobbling:** upheld in Latombe (T-553/23, 3 Sep 2025) but **appealed — C-703/25 P pending**; PCLOB lost quorum; post-*Slaughter* (June 2026) noyb demands repeal. **Every DPF-reliant contract needs an SCC fallback clause.**
- **Stripe is NOT a plain processor** — processor for payment execution, **independent controller** for fraud/AML/KYC/Link → your notice + RoPA need a C2C stream.

## 3. Records, DPO, Law 190/2018
- **RoPA — need BOTH** Art 30(1) controller record + Art 30(2) processor record (per-tenant register). **The <250-employee exemption does NOT apply** — processing is non-occasional + touches Art 9 (health via sick leave).
- **DPO — very likely MANDATORY.** Art 37(1)(c) large-scale Art 9 processing: for an outsourced payroll/HR processor, that IS the core activity, and "large scale" **aggregates across the whole customer base** (WP243). Plus Art 37(1)(b) systematic monitoring (AI anomaly scoring). Plus **Law 190/2018 Art 4** forces a DPO for any legitimate-interest CNP use. → **Appoint one, register with ANSPDCP, document the analysis.**
- **Law 190/2018 CNP (CRITICAL):** "national ID number" = CNP + ID series + passport + licence + health-insurance number. Allowed on **legal-obligation basis** (Art 6(1)(c) — invoicing/payroll/tax; incl. B2C e-Factura CNP since OUG 69/2024 Jan 2025) with no extra conditions; on **legitimate-interest basis** requires **4 cumulative safeguards** (Art 32 + **DPO** + defined retention/deletion + periodic training). **Employee monitoring (Art 5):** if timesheets cross into monitoring, 5 conditions incl. **prior consultation of employee reps + 30-day retention cap**. Plain hours-logging = ordinary Art 6(1)(b)/(c), no Art 5. (Employee-monitoring was a top-5 ANSPDCP fine driver in 2025.)

## 4. Data lifecycle, retention collision, erasure
- **Lawful bases:** invoicing/accounting/payroll/tax → Art 6(1)(c); service delivery → 6(1)(b); marketing → consent; security/fraud → 6(1)(f) LIA; AI training on personal data → legit interest with LIA + prior opt-out (CNIL June 2025) or consent.
- **Retention collision — RESOLVED via Art 6(1)(c) + Art 17(3)(b).** **Key finding: Romania cut most accounting retention 10→5 years** (Law 195/2022, eff 1 Jan 2023):

| Document | Period | Anchor |
|---|---|---|
| Accounting registers / invoices / supporting docs | **5 years** (was 10) | 1 July of following year |
| Payroll statements (state de salarii) | **5 years** (was 50) | same |
| Annual financial statements | **10 years** | — |
| Personnel files (dosare personale) | **75 years** (Archives Law 16/1996) | — |
| Assets useful life >5y | entire useful life | — |

Fiscal prescription: 5 yr normal / 10 yr criminal-origin. ⚠️ Many advisers still keep 10y for litigation safety; retroactivity of the 5-yr payroll rule is disputed. **Build a configurable retention engine** anchored to 1-July-of-following-year with a litigation-hold flag.
- **Erasure with legal holds:** refuse retention-bound erasure with a reasoned Art 17(3)(b) response; use **Art 18 restriction / locked archive tier** (compliance-only RBAC, auto-delete at term) instead of deletion.
- **e-Factura can't be un-sent:** ANAF SPV invoices can't be deleted (corrections via credit notes); SPV keeps 60 days then archives. **DSR template must state we cannot erase the ANAF-held copy.**
- **Anonymous vs pseudonymous:** pseudonymised = still personal (EDPB 01/2025). CJEU C-413/23 P (Sep 2025) = relative/contextual test → supports redact-before-LLM. **SRL financials aren't per-se personal, but PFA/freelancer/payroll-line data IS** → simulator calibrated on those needs a lawful basis + can't reuse processor-held tenant data without becoming controller (§1).

## 5. AI-specific
- **EDPB Opinion 28/2024:** AI models trained on personal data not automatically anonymous — case-by-case; unlawfully-trained models can face erasure/bans.
- **Sending customer docs to xAI (US LLM)** = processor→sub-processor transfer needing Art 28 DPA + **SCC Module 3 + TIA** (xAI not DPF-certified). xAI: no training on API data; default 30-day retention; **Zero Data Retention (ZDR) option deletes within 1h**. **CRITICAL clause (verify in signed version): xAI's Enterprise ToS warrants no personal data/PHI except through the ZDR endpoint → invoice/HR PII must go through ZDR or you breach xAI's own terms.** Design: **redact/pseudonymise → ZDR endpoint → SCC M3 + TIA + DPA**, per-tenant opt-in.
- **EU AI Act — the ATS/freelancer matcher is HIGH-RISK** (Annex III pt 4(a): recruitment/selection/evaluation). *DocumentIulia is the provider.* Provider obligations (Arts 9–15,17,43,47–49): risk mgmt, data governance + bias testing, technical docs, logging, transparency, human-oversight design, accuracy, QMS, conformity assessment (Annex VI), CE marking, EU-DB registration. Deployer (customer) Art 26(7): **inform workers' reps before workplace use.** **Timeline: Omnibus postpones Annex III to 2 Dec 2027 — but NOT yet in OJ; until published the deadline is legally 2 Aug 2026.** Art 50 transparency (chatbot discloses it's AI; mark AI-generated content) from **2 Aug 2026**.
- **Art 22 + CJEU C-634/21 (SCHUFA):** if ATS match-scores effectively determine who advances → automated decision → needs meaningful human-in-the-loop (competence + authority to override), right to contest, logic explanation.
- **Simulator** ("simulate pay increase") = NOT high-risk unless it scores creditworthiness (Annex III 5(b)) → currently limited-risk, Art 50 disclosure only.

## 6. Security (Art 32) + breach
- **Baselines from enforcement:** encryption at rest is baseline (ICO Marriott £18.4M faulted un-encrypted passport numbers *despite* PCI card encryption — matches our plaintext-CNP gap); MFA (BA £20M); privileged-account + DB logging; **CNIL Dedalus €1.5M** (a software-vendor **processor** fined for no encryption at rest, no post-migration deletion, shared accounts) = closest precedent. Pen-testing: GDPR says only "regularly" (no annual mandate unless NIS2 scope). ISO/SOC2 = evidence, not safe harbour.
- **Multi-tenant isolation is an Art 32 obligation.** Postgres RLS with care: transaction-scoped `SET LOCAL` + pooler `DISCARD ALL` (PgBouncer/Prisma context-leak risk), no app-owner `BYPASSRLS`. **Redis has no RLS** — key-namespace + ACL only; document as a deliberate design decision. Cloudflare↔Hetzner origin must be **Full (strict)** SSL, not Flexible.
- **Breach runbook:** 72h from *awareness* (log the timestamp); **as processor, Art 33(2) gives no cushion** — notify each tenant-controller "without undue delay" (contract 24–48h). Art 33(5) register ALL breaches. Art 34 to subjects at high risk; encryption exemption (34(3)(a)). **ENISA SE = DPC×EI + CB** — our data: DPC 3–4, EI ≈1.0 → a cross-tenant accounting/payroll leak = SE ≥4.5 Very High → notify DPA + subjects. **Encrypted backups + tested restore drills are Art 32(1)(d) evidence** that *reduce* legal exposure (EDPB 01/2021).
- **NIS2:** likely out of scope today (size cap ≥50 staff / >€10M) — but RO expanded scope; run the DNSC self-assessment before concluding.

## 7. Subject rights: processor vs controller
- **Processor (tenant data):** don't answer subjects directly — Art 28(3)(e) assist the controller; forward requests + give self-service extract/delete. **The controller's 1-month clock can't be extended for your slowness** → DSR tooling must be fast.
- **Controller (own users/LMS/marketing):** fulfil Arts 12–22 directly in 1 month (+2 complex), free. Portability = structured machine-readable (CSV/XML/JSON).
- **Multi-tenant:** per-tenant isolation/export/deletion = the technical embodiment of documented-instructions + Art 28(3)(g). e-Factura XMLs at ANAF can't be erased; retention-bound records → refuse + restrict.

## Prioritized compliance-gap checklist (→ GDPR-INT sprint stories)
**MUST — legal-exposure blockers:**
1. Customer-facing **Art 28 DPA** (8 clauses, specific security level, sub-processor annex, DSR-assistance annex, 24–48h breach-notice window).
2. **xAI transfer package** — route all personal-data prompts through **ZDR**, xAI DPA (SCC M3), TIA, PII redaction-before-send. *(highest AI risk)*
3. **Prevent Art 28(10) role-flip** — no simulator training on tenant data without specific written per-controller authorisation + Art 6(4); default to anonymised/aggregated/synthetic.
4. **Appoint a DPO** + register with ANSPDCP.
5. **Build Art 30(1)+(2) RoPA** (per-tenant processor register).
6. **Encryption at rest for ALL PII** (CNP/CUI/salary/invoices — not just payments), durable key store (KMS), MFA admin roles, privileged + DB audit logging, **encrypted off-box backups + tested restore drills**.
7. **Harden Postgres RLS** + document Redis namespace isolation; per-tenant leak test in CI.
8. **Breach runbook** — awareness-timestamp, ENISA scoring, processor→controller→ANSPDCP chain, Art 33(5) register.
9. **Configurable retention engine** — 5y docs/registers/payroll, 10y statements, 75y personnel, litigation hold, 1-July anchor; Art 18 archive-tier instead of erasure.
10. **Law 190/2018 CNP handling** — legal-obligation vs legit-interest branching + the 4 safeguards.

**SHOULD:** 11 multi-tenant DSR tooling; 12 active sub-processor change-notification; 13 disclose Stripe as independent controller; 14 Art 50 AI disclosure (live Aug 2026); 15 gate timesheet "monitoring" behind Law 190/2018 Art 5.

**COULD/WATCH:** 16 treat ATS matcher as high-risk provider (target Dec 2027, confirm OJ; fall back Aug 2026); 17 SCC fallback in every US-vendor contract + Cloudflare/Bunny EU routing; 18 NIS2 self-assessment.
