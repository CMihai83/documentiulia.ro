# Sprint S-56 — EXP Mastery + Credentials (graded practice · assessments · OB 3.0 VCs · expert profile)

**Epic:** EXP · **Horizon-2 order:** SIM → BC → FND → EXP (continuation)
**Duration:** 2026-07-08 → 2026-07-22 · **Capacity:** 23 SP (tech-debt 20%)
**Basis:** `docs/business-simulator-v2/research/06-expertise-hr-marketplace.md` (B.3–B.5, Part C).
**Master-plan phase:** "S-57 Expertise mastery + credentials" = EXP-6/7/8/10 (renumbered S-56).
**Builds on S-55:** `Skill`/`Occupation`/`UserSkill` evidence tiers, `POST me/evidence/sim-run`,
gap/path logic, the expertise page.

## Goal
Close the mastery loop: simulator runs become **graded practice** tied to ESCO skills, **validated
assessments** (auto-graded + anonymised peer review) feed higher evidence tiers, mastery earns a
**cryptographically signed Open Badges 3.0 / W3C VC** (Europass-alignable, publicly verifiable),
and everything aggregates into an **expert profile with a reputation score** — private by default.

## Evidence-credibility ladder (research B.4 — use these multipliers)
self_declared 0.2 < course 0.5 < auto-graded quiz 0.7 < simulator/work-sample 0.9 < peer-reviewed capstone 1.0.
S-55's `UserSkill.evidenceTier` stays the source of truth; add `assessed_quiz` between course and
assessed if needed, or map quiz→assessed with the 0.7 weight in matching (pick the additive option).

## GDPR (hard requirements)
- **EXP-10 public visibility is DPO-GATED**: build the full profile but `isPublic` defaults FALSE;
  making it public requires explicit user opt-in (consent-logged) AND a `EXPERT_PROFILES_PUBLIC`
  feature flag that stays OFF at deploy. Ship private-only; flag the DPO review as the go-live gate.
- Peer reviews are **anonymised** (reviewer identity never exposed to the reviewee; stored hashed/ref-only).
- Every credential issuance / profile change consent-logged via the existing audit chain.

## Stories

### EXP-6 — Simulator as graded practice · 5 SP · MUST
- `ScenarioSkill` link model: map ≥3 sim-v2 `SCENARIO_PRESETS` scenarios to ESCO skills (seed the
  links: e.g. services→cash-flow management, retail→inventory/procurement, manufacturing→capacity
  planning + the SIM-12 composite dimensions).
- On run END (scored mode), auto-call the existing `me/evidence/sim-run` path for each linked skill,
  proficiency scaled from the SIM-12 composite → `assessed` tier (0.9 credibility).
- **AC:** ≥3 scenarios linked; a completed scored run raises the linked skills' evidence tier;
  practice-mode runs do NOT (stakes preserved).

### EXP-7 — Validated assessments + peer review · 5 SP · SHOULD
- `SkillAssessment` (skillId, kind auto_quiz|work_sample|capstone, items Json), `AssessmentAttempt`
  (userId, score, passedAt — **immutable once passed**: no update/delete path), `PeerReview`
  (attemptId, reviewerRef hashed, rubric Json, score, **anonymised**).
- Auto-graded quiz: pure grading logic + seedable item selection; pass → quiz-tier evidence (0.7).
  Optional rubric peer review on work-samples/capstones → on completion, `verified`-adjacent tier (1.0 weight).
- **AC:** attempts permanently recorded (no mutation path); quiz pass raises evidence; peer review
  anonymised (reviewee cannot see reviewer identity); rubric scores aggregate.

### EXP-8 — Open Badges 3.0 / W3C VC + Europass export · 8 SP · SHOULD
- `Credential` model (userId, skillId/occupationId, vcJson, issuedAt, verifyCode unique, revoked,
  escoAlignment). Issue on mastery (e.g. `assessed`+ tier at proficiency ≥ threshold, or path
  completion): build an **OB 3.0-shaped W3C VC** JSON (issuer=DocumentIulia DID/URL, subject=user,
  evidence=the attempt/run refs, alignment=ESCO URI), **signed Ed25519** (node crypto; keypair from
  env `CREDENTIAL_SIGNING_KEY`, generated+printed once like the encryption key, NOT committed).
- Public **`GET verify/:verifyCode`** (unauthenticated by design — verification must be public;
  exposes ONLY the credential JSON, no other user data) + signature check endpoint. Revocation flips
  `revoked` and verify reports it. **Europass/ELM export**: ELM-aligned JSON download (full
  wallet-grade Europass compliance validation flagged as follow-up — do not claim it untested).
- **AC:** badge issued on mastery; VC signature verifies (and fails on tampered payload); public
  verify works logged-out; revoked credential reported as revoked; ELM-aligned export downloads.

### EXP-10 — Expert profile + reputation · 5 SP · SHOULD
- `ExpertProfile` (userId unique, headline, bio, **isPublic default FALSE**, endorsements,
  reputationScore) aggregating: verified/assessed skills, credentials, sim composite history,
  peer-review outcomes. Reputation = weighted blend (research B.5: verified skills + reviews +
  delivery history; pure logic + unit tests). Endorsements consent-logged. Activity feed from
  existing events (path milestones, credentials, badges).
- Frontend: profile tab on the expertise page (own view always; public route exists but returns 404
  unless `isPublic` AND the `EXPERT_PROFILES_PUBLIC` flag — which stays OFF).
- **AC:** profile card aggregates credentials/ratings/history; reputation deterministic + unit-tested;
  public exposure double-gated (user opt-in + feature flag, default OFF); DPO-review note in docs/gdpr-module.

## Out of scope
EXP-11 career coaching, EXP-12 expert-for-hire (marketplace/monetization sprint), AI-1 auto-refresh,
S-52 Grok advisor (parked). Full Europass wallet certification.

## Definition of Done
tsc + `nest build` clean; `npx jest src/expertise --silent` green (grading, reputation, VC
sign/verify/tamper/revoke); frontend build clean; integration vs throwaway `postgres:15-alpine`:
scored sim run raises linked skills (practice doesn't) → quiz pass raises to 0.7-tier → credential
issued + verifies publicly + tamper fails + revocation reported → profile aggregates with
reputation; public profile 404s with the flag off. Additive migrations only; signing key handled
like ENCRYPTION_MASTER_KEY (env-provisioned, printed once, never committed). Independent
verification before deploy.
