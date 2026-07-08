# Sprint S-57 — Marketplace + Monetization (career coaching · expert-for-hire · funds auto-refresh)

**Epic:** EXP + AI · **Horizon-2 order:** SIM → BC → FND → EXP (final planned phase)
**Duration:** 2026-07-08 → 2026-07-22 · **Capacity:** 21 SP (tech-debt 20%)
**Master-plan phase:** "S-58 Marketplace + monetization" = EXP-11/EXP-12/AI-1 (renumbered S-57).
**Builds on:** S-55/S-56 expertise stack (gap, paths, credentials, reputation, ExpertProfile),
S-53/S-54 funds stack (FundingProgram catalog with sourceUrl), consulting bookings.

## Goal
Monetize the mastery loop: a **career-coaching engine** (gap + market demand → next occupations,
salary ranges, upskilling paths), an **expert-for-hire marketplace** (search consented experts,
book via the existing consulting flow, post-session rating feeds reputation), and the **funds-catalog
auto-refresh** (scheduled fetch of program source pages → field diff → human-approve queue).

## Honest constraints (design around, do not fake)
- **No live payments** (Stripe DOC-44-2 blocked on keys): bookings carry a `paymentStatus`
  hold/escrow placeholder (`pending_hold|held|released|refunded`) with an honest "payment
  processing coming soon" note. NO simulated charges.
- **DPO gate stands**: the S-56 public (unauthenticated) profile stays behind `EXPERT_PROFILES_PUBLIC`
  (OFF). The marketplace is different: **authenticated PRO users only**, and an expert appears ONLY
  after a **separate, explicit marketplace opt-in** (`marketplaceOptIn`, consent-logged, withdrawable).
  Consent for this specific purpose = the lawful basis; document in the DPO note.
- **Salary ranges are indicative**: seed static RO ranges per occupation (marked `source: 'indicative
  2025-26 market estimate'`); flag live salary-data integration as a follow-up.
- **AI-1 without LLM dependency**: the refresh engine is fetch+diff+approve (deterministic).
  Grok enrichment optional and OFF (XAI key is a test key; S-52 parked).

## Stories

### EXP-11 — Career-coaching engine · 5 SP · COULD→SHOULD
- Pure `coaching.logic.ts`: from the user's skill vector + gap analysis (S-55) + a seeded
  **occupation-demand table** (RO market: demand score + indicative salary range per seeded
  occupation) → ranked **next-move suggestions**: target occupations with readiness % (from gap),
  salary range, demand, and the upskilling path to close the gap (reuse the S-55 path builder —
  do NOT re-sequence).
- `POST expertise/coach` → suggestions; frontend coaching card on the expertise page.
- **AC:** suggestions ranked by (readiness × demand); each carries salary range + a click-through
  generated path; deterministic + unit-tested; salary marked indicative.

### EXP-12 — Expert-for-hire marketplace · 8 SP · SHOULD
- `ExpertProfile.marketplaceOptIn` (default false, consent-logged both ways) + `hourlyRateEur?`,
  `sessionTypes[]` (mentoring, business-plan review, sim debrief).
- **Search** (`GET expertise/marketplace`, JWT+PRO): only opted-in experts; card = headline,
  reputation, verified/assessed skills, credentials count, rate — ranked by reputation (research
  B.5: verified skills weighted above self-declared).
- **Booking**: `ExpertEngagement` model (expertUserId, clientUserId, sessionType, slot, status
  requested|confirmed|completed|cancelled, paymentStatus placeholder) — slot picking reuses the
  consulting availability pattern; do NOT build a second calendar.
- **Post-session rating** (1–5 + comment) → feeds `reputation.logic.ts` (extend the peer-review
  term or add an engagement-rating term; keep deterministic + retest exact values).
- Frontend: marketplace tab (search/cards/book) + my-engagements list. RO/EN.
- **AC:** only opted-in experts listed; booking lifecycle works; rating updates reputation
  deterministically; self-booking forbidden; consent trail on opt-in/out; payment honestly stubbed.

### AI-1 — Funds-catalog auto-refresh · 8 SP · SHOULD
- `FundingProgramRevision` model (programId, fetchedAt, sourceUrl, rawExcerpt, proposedChanges Json
  {field, old, new}[], status pending|approved|rejected, reviewedBy?, reviewedAt?).
- Refresh service: for each catalog program, HTTP-fetch `sourceUrl` (timeout 10s, polite UA, failures
  logged not fatal), extract candidate facts (regex/heuristics for deadlines, budgets, status
  open/closed keywords — deterministic, no LLM), diff vs the stored program → create a **pending
  revision** (never auto-apply). Idempotent per (program, content-hash).
- **Human-approve gate**: `GET funds/revisions` (diff view: field/old/new/excerpt), `POST
  funds/revisions/:id/approve` (applies the change + audit-chain entry), `/reject`. Schedule:
  weekly via the existing scheduler if `@nestjs/schedule` is present, else a `POST funds/refresh`
  manual trigger + a cron-wrapper script (mirror backup-cron.sh) — check first.
- Frontend: revisions review panel on the funds page (pending diffs, approve/reject).
- **AC:** refresh creates pending revisions with per-field diffs + source excerpt; nothing applies
  without approval; approval applies + audit-logs; re-fetch of unchanged content creates no dupes;
  fetch failure of one program doesn't stop the sweep.

## Out of scope
Real payment processing (Stripe keys); public (unauthenticated) marketplace exposure; LLM-based
extraction (parked with S-52); live salary-data APIs; EXP-13 (= F-2, delivered).

## Definition of Done
tsc + `nest build` clean; `npx jest src/expertise src/funds --silent` green (coaching ranking,
reputation-with-ratings exact values, revision diff/idempotency); frontend build clean; integration
vs throwaway `postgres:15-alpine`: coach suggestions ranked with paths → opt-in → listed in
marketplace (non-opted expert absent) → book → complete → rate → reputation moves deterministically →
refresh against a LOCAL mock HTTP server (do not depend on live gov sites in tests) creates pending
revisions → approve applies + audit entry → re-fetch no dupes. Additive migrations only. Independent
verification (opt-in gating + no-auto-apply are the two critical checks) before deploy.
