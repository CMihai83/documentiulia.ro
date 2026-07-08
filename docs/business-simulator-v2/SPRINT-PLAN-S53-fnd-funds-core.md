# Sprint S-53 — FND Funds Core (program catalog + 7-filter matching + de minimis + pre-check)

**Epic:** FND (Funds & Financing Advisory) · **Horizon-2 order:** SIM → BC → **FND** → EXP
**Duration:** 2026-07-08 → 2026-07-22 · **Capacity:** 31 SP (tech-debt 20%)
**Basis:** `docs/business-simulator-v2/research/05-eu-funds-financing.md` (Parts 4–5 + Verification flags).
**Master-plan phase:** "S-54 Funds core" = FND-1/2/3/4 (renumbered S-53 in our actual sequence).

## Goal
Stand up the funds core: a maintainable **program catalog**, the **7-filter matching engine**
(ranked eligible calls + estimated max grant + co-financing, every filter explained), the
**de minimis ledger** (€300k rolling 3-year headroom), and a free **eligibility pre-check wizard**.

## Data reality (what exists vs. what to add)
- `Organization` has `county` (→ NUTS region), `cui`, `regCom` — but **no CAEN code, headcount,
  turnover, balance-sheet, or founding date**. Add a **`FundingProfile`** model (org's fund-relevant
  snapshot). **Auto-derive where possible** (like BC calibration did): headcount from `Employee`
  count, turnover from `Invoice` aggregate; the rest (CAEN primary/secondary, founding date,
  balance-sheet total, partner/linked enterprises) are profile inputs.
- Reuse the **F-3 matching pattern**: pure scoring logic in a `.logic.ts` file, thin service wrapper
  (see `backend/src/matching/`). Reuse `ChartService` if any viz is needed.

## Mandatory sub-tasks (from the research, non-negotiable)
- **CAEN Rev.2 ↔ Rev.3 map** (transition through 25 Sep 2026 — evaluate both antecedents).
- **GBER Art. 2(18) "firm in difficulty"** check (from equity/accumulated-loss ratios).
- **Do NOT surface PNRR digitalizare as open** (it is CLOSED — exclude from any seed/catalog).
- De minimis ceiling **€300,000** rolling 3-year (per single undertaking).

## Stories

### FND-1 — Program catalog / registry · 8 SP · MUST
- Prisma `FundingProgram`: name, authority, purpose, beneficiaryType, sizeEligibility[],
  coFinancingPct (or region-driven), legalBasis (`de_minimis`|`gber_<article>`|`notified`),
  gberArticle?, aidIntensityPct?, ceilingEur?, deadlines (open/close), `caenWhitelist[]`,
  `caenBlacklist[]`, `regions[]` (NUTS), interventionField, status (open/closed/upcoming), source URL.
- CRUD (JWT + `@RequiresTier(Tier.PRO)`) + validation rejecting overlapping CAEN in white∩blacklist.
- **Seed** a handful of *real, currently-open* 2025–2026 programs from research Part 1 (Start-Up Nation,
  regional POR/PR calls, Horizon/EIC direct — **exclude PNRR digitalizare**), each with a source URL.
- **AC:** CRUD works; seed loads; white/blacklist overlap rejected; closed programs flagged, not deleted.

### FND-2 — 7-filter matching engine · 13 SP · MUST
- Pure `funds-matching.logic.ts`: `matchProgram(profile, program)` → `{ eligible, perFilter:
  {filter, pass, reason}[], estMaxGrantEur, coFinPct, deMinimisImpact }`, and `rankMatches(profile,
  programs[])` sorted by eligibility then est. grant. The seven filters exactly per research Part 4:
  1. **CAEN** (Rev.3 + Rev.2 antecedents; whitelist AND not blacklist),
  2. **NUTS region** (county→NUTS-2; drives co-fin %, București-Ilfov RO32 ≈ 40%),
  3. **Enterprise size** (Rec. 2003/361 / Legea 346/2004; headcount+turnover+balance, **consolidated
     over partner 25–50% pro-rata / linked >50% at 100% — never evaluate the applicant in isolation**;
     micro/small/medium + SME intensity bonus +20pp small / +10pp medium),
  4. **Project type** → intervention field / GBER article,
  5. **Age / profitability / firm-in-difficulty** (≥1 fiscal year, positive equity, GBER Art.2(18),
     no ANAF debt/insolvency),
  6. **De minimis headroom** (from FND-3: €300k − rolling-3yr ≥ requested),
  7. **Legal basis** (de minimis €300k check vs GBER ceiling+intensity; max grant = eligible costs ×
     intensity, capped by ceiling & headroom).
- Service + `POST funds/match` (profile from the org's FundingProfile; body: requested cost/type).
- **AC:** ranked eligible calls + est. max grant + co-fin + a per-filter explanation for each;
  a București-Ilfov medium enterprise gets the correct reduced intensity; **<2s for 500 programs**
  (perf test); unit tests cover each filter's pass and fail branch incl. the Rev.2↔Rev.3 map.

### FND-3 — De minimis ledger · 5 SP · MUST
- Prisma `DeMinimisAid`: orgId, grantorProgram, amountEur, awardedDate, source. Service:
  `rollingTotal(orgId, asOf)` (trailing 3 years per single undertaking), `headroom(orgId)` =
  300000 − rollingTotal, `wouldExceed(orgId, requested)`. Headroom alert at **80% used**;
  a requested aid that would breach €300k **blocks** the FND-2 match (filter 6 fails with reason).
- **AC:** rolling-3yr total correct across a date boundary; headroom + 80% alert; over-ceiling blocks.

### FND-4 — Eligibility pre-check wizard · 5 SP · SHOULD
- `POST funds/precheck` — runs the eligibility criteria (size, age, firm-in-difficulty, ANAF-debt
  self-declare, de minimis headroom) against the org's data/profile → pass/fail per criterion **with
  a plain-language reason each**. Result savable as a **lead** (persist a `FundingLead`).
- Frontend page `frontend/app/[locale]/dashboard/funds/page.tsx`: profile form (auto-filled where ERP
  allows) → pre-check results (pass/fail per criterion) → ranked matches from FND-2. RO/EN, PRO-gated.
- **AC:** free-screening front door returns per-criterion pass/fail + reasons; savable as a lead;
  page renders matches with per-filter explanations.

## Out of scope (later FND sprint / master "S-55")
FND-5 dossier checklist, FND-6 business-plan builder (reuses BC engine), FND-7 co-fin/VAT calc,
FND-8 financing marketplace, FND-9 durability tracker, FND-10 MySMIS/AFIR integration, AI-1 auto-refresh.

## Definition of Done
tsc + `nest build` clean; `npx jest src/funds --silent` green (each filter pass/fail + rolling-3yr +
perf <2s/500); frontend build clean; integration vs throwaway `postgres:15-alpine`: seed catalog →
create a FundingProfile → match returns ranked eligible calls with per-filter reasons and est. grant →
de minimis over-ceiling blocks a match → pre-check saves a lead. One additive migration. Independent
verification (incl. the București-Ilfov intensity case + a firm-in-difficulty rejection) before deploy.
