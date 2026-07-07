# Research 02 — GDPR-Compliance-as-a-Service: Market + Feature + Romania Playbook

> Mid-2026 synthesis. Sources cited inline. ⚠️ = confidence caveat.

## 0. Executive thesis
1. **The market is a barbell.** SMBs buy a **cookie banner + policy generator at €5–30/mo per site** (Cookiebot €7, iubenda €5.99, Usercentrics €7, Termly $10, CookieYes $10); the "GDPR back office" (RoPA/DPIA/breach/vendor) sells at **€350–520/mo per legal entity** (GDPR Register) or quote-only. Install counts prove the wedge: Cookiebot 2.1M sites, CookieYes 1.4M sites vs OneTrust ~14,000 customers.
2. **DocumentIulia's edge is the bridge.** An ERP where a tenant already = one company (one CUI) prices the back office on the natural **per-legal-entity axis**, undercuts GDPR Register ~10x by bundling into the Business tier (149 RON ≈ €30), and **seeds the RoPA from data the ERP already holds** (payroll, vendors, customers, retention rules).
3. **Romania is underserved + hard-codable.** No Romanian CMP of scale; local tooling thin (GDPR Manager €450 one-time). Encode the RO-specific rules: **ANSPDCP Decision 174/2018** DPIA list (employee monitoring), **Law 190/2018 Art 4** (CNP-on-legitimate-interest → forces DPO+retention+training) & **Art 5** (employee monitoring, 30-day cap), the ANSPDCP breach/DPO portals, the 5-year retention reforms.
4. **Compliance archives are Vanta-class sticky** — consent logs, RoPA history, DSAR trails can't be abandoned (retention ~85-90%), compounding accounting-ledger lock-in.
5. **Two hard build corrections:** build CMP against **IAB TCF v2.3** (mandatory since 28 Feb 2026, not v2.2); treat **AI HR/ATS features as Annex III high-risk** (deadline deferred to **2 Dec 2027**) but **Art 50 AI-transparency bites 2 Aug 2026**.

## 1. Market
- Privacy-management software ≈ **$6.24B (2026) → $17.63B by 2031, ~23% CAGR** ([Mordor](https://www.mordorintelligence.com/industry-reports/privacy-management-software-market)); consent mgmt = largest slice (30.6% of 2025 rev); SMB fastest-growing (23.2% CAGR). (Analyst range $3.5–7.7B ⚠️.)
- **2025 = consolidation year:** Securiti→Veeam $1.725B; TrustArc→Main Capital; Didomi +€72M (Marlin); Google minority in Usercentrics; OneTrust in >$10B PE talks; iubenda→team.blue.

### Vendor map (verified price points)
| Vendor | Segment | Pricing | Points |
|---|---|---|---|
| OneTrust | Enterprise | quote | ~$10k–500k/yr (est ⚠️) |
| TrustArc / Securiti / Transcend / DataGrail | Enterprise | quote | DataGrail ~$30–100k ⚠️ |
| **Cookiebot** (Usercentrics) | SMB | per domain+subpages | Free/€7/€30/€50/€90 |
| **Usercentrics** | SMB→ent | per sessions+domains | Free/€7/€15/€30/€50 |
| **Osano** | SMB→ent | domains+users+visitors | Free / **$199/mo**; "No-Fines Guarantee" ≤$500k |
| **iubenda** | freelancer/SMB | per site+pageviews | €5.99/€21.99/€89.99 |
| **Termly / CookieYes / Enzuzo** | SMB | per site+views (Enzuzo meters **DSAR volume**) | $10 / $10 / $9-99 |
| **GDPR Register** (EE) | mid/DPO | **per legal entity, unlimited users** | €350–450/mo |
| ECOMPLY / ComplyCloud / DataGuard / PrivIQ | SMB→mid | quote | external-DPO OS |
| **RO: GDPR Manager** (dataconsulting.ro) | RO SMB | **€450 one-time** | on-prem RoPA registry |

**What SMBs buy first:** free cookie banner (wedge, gated by traffic) → policy generator (G2 has a distinct "Privacy Policy Generator — Small Business" category) → DSAR volume. RoPA/DPIA are bought by **DPOs/consultants**, not micro-SMBs.

## 2. Feature set (legal basis → build)
**Spine: make the RoPA the central data model** (OneTrust/Legiscope/CNIL pattern) — notices, retention, DPAs, TIAs, DPIAs all link back to it. For an ERP the RoPA seeds from payroll/CRM/vendor/document data already held.

- **CMP (Must):** ePrivacy Art 5(3) + EDPB 05/2020 (no cookie walls, scrolling≠consent), Planet49, **Orange România C-61/19** (controller bears proof burden). Build: prior-blocking `<head>` script, cookie scanner, **immutable proof-of-consent record** (timestamp/choices/banner-version/visitor-id/TC-string), equal-prominence reject. **⚠️ TCF v2.3 (mandatory 28 Feb 2026)** + IAB CMP registration; **Google Consent Mode v2** (Basic default).
- **DSAR portal (Must):** Art 12 (1 month, +2), EDPB 01/2022 (proportionate ID verification — no ID copy by default), structured Art 20 export. Build: branded intake, tiered verification, clock, cross-module discovery, real erasure incl. backups (2025 EDPB erasure focus), audit trail. Meter DSAR volume.
- **RoPA (Must):** Art 30(1)+(2); <250 exemption rarely applies. Build: seed from ERP, per-industry templates, controller **and** processor configs (accountant use-case).
- **DPIA (Should):** WP248 9 criteria + **ANSPDCP Decision 174/2018** (item (d) = large-scale employee monitoring → near-universal RO need). Build on CNIL PIA model; **Art 5 employee-monitoring wizard** (5 gates + 30-day cap).
- **Breach + incident (Must):** Art 33 72h-from-awareness, Art 33(5) register-all, ENISA severity (SE=DPC×EI+CB). RO: **Decision 128/2018** form via `dataprotection.ro` online portal (⚠️ not the telecom-only 24h/611-2013 path). Differentiator: combine **NIS2/DNSC 24h+72h** + ANSPDCP 72h into one workflow.
- **Policy/notice generator (Must):** Art 13/14 + WP260 layered notices; generate from RoPA; auto-update on legal change (reuse the ANAF-monitoring engine); RO/EN native. (2026 EDPB coordinated enforcement = transparency.)
- **Vendor/processor (Should):** Art 28(3) DPA (2021/915), transfer SCC 2021/914 (4 modules), TIA (EDPB 01/2020), DPF-list lookup **with SCC fallback** (Latombe T-553/23 upheld but appealed C-703/25 P).
- **Data map + retention (Should):** questionnaire-first + a few connectors (Workspace/M365/Stripe) + the ERP's own data. **RO retention defaults: payroll 50→5yr (Law 195/2022), accounting 10→5yr (Law 36/2023)** with legal-hold overrides.
- **Training (Should):** Art 39(1)(b) — **reuse the existing LMS**: role-based micro-courses, quizzes, certs, annual re-assignment, completion evidence.
- **DPO marketplace (Could):** Art 37 triggers; outsourced DPO legal (Art 37(6)) + ANSPDCP online DPO form. **⚠️ Berlin €525k + X-FAB C-453/21 conflict-of-interest:** an ERP/accountant acting as its client's DPO monitors its own processing → offer via a **separate legal entity / independent partners** with conflict screening + counsel sign-off. **Law 190/2018 Art 4 forces a DPO whenever CNP is processed on legitimate interest.**

## 3. Romania specifics
- **ANSPDCP enforcement:** 2023: 73 fines / 2.35M lei. 2024: 83 fines ≈ 1.86M lei (~€373k). 2025: ~85 sanctions, avg ~€6,176 ⚠️, range €200–40k. Notable: Orange €40k (deletion mishandling + excessive ID-scan storage), Raiffeisen €20k (staff leaked data via WhatsApp), UiPath €70k (Art 32), Vodafone €15k (CNP), **accounting firm V&M Contab €10k (REVISAL passwords via WhatsApp)**, Continental €15k (employee medical in shared Excel). **Recurring: Art 32 security (#1), online disclosure, ignored access/erasure, CNP disclosure, unsolicited marketing.**
- **Law 190/2018 encodable rules:** Art 4 CNP-on-legit-interest → DPO+retention+training+Art32 (auto-trigger in product); Art 5 monitoring → 5 cumulative gates + **30-day retention** (monitoring-setup wizard).
- **Accountant pain:** controller-vs-processor confusion (external accountant = usually **processor** for client payroll/HR, needs Art 28 DPA per client; controller for own staff) → support both configs. Local price anchors: externalized DPO **€100–400/mo**; RO is 5–10x cheaper than Western EU.

## 4. Pricing / packaging + liability
**Axes:** per domain, per traffic, per language, **per DSAR volume** (Enzuzo), **per legal entity** (GDPR Register — the ERP-native axis). Free tier = acquisition wedge.
**Recommended for DocumentIulia:**
- **Gratuit:** branded cookie banner (capped) + 1 auto policy (RO/EN) + basic RoPA seeded from ERP.
- **Pro (49 RON):** branding removal, multi-lang, Consent Mode/TCF, DSAR intake w/ deadline tracking (metered), full RoPA + retention, LMS training.
- **Business (149 RON ≈ €30):** full back office — DPIA (174/2018 + Art 5 wizards), breach + ANSPDCP 72h (+NIS2/DNSC), vendor/DPA + SCC/TIA, CNP pack. **Undercuts GDPR Register ~10x.**
- **DPO marketplace add-on:** partner firms €100–300/mo, 15% rev-share, **separate entity**.
**Liability stack (copy CookieYes/Termly):** informational-only → no compliance guarantee → AS-IS → 12-month fee cap → indemnity. **Smartlaw/BGH 2021**: template generators OK *if* "standardized, no individual case assessment" is clear. **⚠️ RO Legea 51/1995** reserves legal consultanță to enrolled avocați (criminal if breached) → lawyer-reviewed templates via a **partner cabinet de avocatură**, refer edge cases to counsel.

## 5. 2025-2026 regulatory context (in-force vs proposed)
- GDPR: ~€1.2bn/yr fines; EDPB coordinated enforcement **2026 = transparency (Arts 12-14)**. Build DSAR access+erasure (incl. backups) + auto notices.
- **EU AI Act:** HR/ATS = **Annex III(4) high-risk** (recruitment/screening — *DocumentIulia is the provider* even wrapping Grok; customers are deployers, Art 26). **High-risk deferred to 2 Dec 2027 (AI Omnibus, not yet in OJ ⚠️)** but **Art 50 transparency LIVE 2 Aug 2026** (chatbot disclosure + mark AI-generated content). OCR/forecasting generally not high-risk.
- **NIS2 in RO (in force):** GEO 155/2024 + Law 124/2025, DNSC. A mid-sized accounting SaaS may itself be in scope; combined 24h-DNSC + 72h-ANSPDCP workflow = differentiator.
- **ePrivacy:** Regulation withdrawn Feb 2025; Directive + **RO Law 506/2004** still govern cookies.
- **⚠️ Digital Omnibus (proposed, trilogue):** cookies→GDPR, breach 72h→96h, AI-training as legit interest, RoPA <750. **Feature-flag; don't hard-code.**
- **EU Data Act (in force 12 Sep 2025):** cloud-switching rights, egress fees banned from 12 Jan 2027 → build switching clauses + full export (doubles as Art 20 portability).

## 6. Epics → stories (MoSCoW) — see the sprint plan for the DocumentIulia mapping
A Consent (Must) · B DSAR (Must) · C RoPA+retention (Must) · D DPIA (Should) · E Breach+incident (Must) · F Policy generator (Must) · G Vendor/processor (Should) · H CNP pack (Must, RO differentiator) · I Training via LMS (Should) · J DPO marketplace (Could, separate entity) · K AI Act + Data Act (Must, deadline-driven) · Cross-cutting liability ToS.

**Load-bearing caveats:** TCF v2.3 not v2.2; AI high-risk deferred Dec 2027 but Art 50 live Aug 2026; Digital Omnibus proposed not law (feature-flag); verify live ANSPDCP portal fields, IAB CMP fee, DPF appeal outcome.
