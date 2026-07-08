# Sprint S-55 — EXP Foundations (ESCO skills · evidence tiers · gap analysis · mastery path)

**Epic:** EXP (Expertise & Mastery + Marketplace) · **Horizon-2 order:** SIM → BC → FND → **EXP**
**Duration:** TBD (after S-54 deploys) · **Capacity:** 20 SP (tech-debt 20%)
**Basis:** `docs/business-simulator-v2/research/06-expertise-hr-marketplace.md` (Part C).
**Master-plan phase:** "S-56 Expertise foundations" = EXP-1/2/3/5 (renumbered S-55 in our sequence).
**Already delivered as Foundation:** EXP-4 = F-1 (LMS→Prisma), EXP-9 = F-3 (MatchingService), EXP-13 = F-2 (gamification), all in S-47.

## Goal
Stand up the novice→expert substrate: an **ESCO skills/occupations taxonomy**, a **user skills
profile with evidence tiers** (auto-inferred from LMS + Simulator), **skill-gap analysis** vs a
target occupation, and a **mastery path builder** that sequences existing LMS courses + simulator
scenarios to close the gap. New module `backend/src/expertise/`.

## Reuse (do NOT rebuild — orchestrate existing assets, per research Part C)
- **LMS (F-1, `backend/src/lms/`, Prisma-persisted)** → learning resources for gaps + path steps;
  enrollments/completions feed the `course` evidence tier.
- **Simulator v2 (S-48/50) scored runs + SIM-12 composite** → the `assessed` evidence tier (tier-0.9).
- **MatchingService (F-3, `backend/src/matching/`)** pattern → gap = weighted skill-vector distance
  (pure logic in a `.logic.ts`, thin service; do not fork a second matcher).
- **Gamification (F-2, `lms/gamification.service.ts`)** → award XP/badges on path milestones.

## GDPR (credential/skill data is personal — carry through the whole module)
- **Consent logging on every skill/evidence write** (reuse the GDPR-A consent/audit surface).
- Skill/evidence data is PII-adjacent: keep it org/user-scoped; never send raw to xAI without redaction.
- DPO review gates **EXP-10 expert profile go-live** (later sprint) — flag, not this sprint.

## Data reality
No `Skill`/`Occupation`/`UserSkill` models exist yet (only `Employee`, `AtsCandidate`). All new.
**ESCO v1.2 is ~13k skills / ~3k occupations and ships as an external download** — a full import
needs that file (likely no network in the worker env). So: build a **general CSV/JSON importer**
AND **seed a curated domain slice** (accounting, finance, ERP, tax/ANAF, entrepreneurship, digital
skills — the platform's actual domains), each with its real ESCO URI. Flag full ingestion as a
follow-up requiring the ESCO dataset.

## Stories

### EXP-1 — ESCO taxonomy import & indexing · 5 SP · MUST
- Prisma `Skill` (escoUri unique, preferredLabel, altLabels[], description, skillType
  skill|knowledge|competence, reuseLevel, parentUri?, optional sfiaCode), `Occupation` (escoUri,
  label, iscoGroup, description), `OccupationSkill` (occupation↔skill, `essential|optional`, level).
- A general importer (CSV/JSON) preserving hierarchy + version, idempotent by escoUri; **seed a
  curated domain slice** (see Data reality) with real URIs and occupation↔skill links.
- Searchable skill tree endpoint (JWT + `@RequiresTier(Tier.PRO)`); version tracking.
- **AC:** import loads skills+occupations with hierarchy preserved + version; search returns a
  subtree; re-import is idempotent (no dupes); seed covers the platform's domains.

### EXP-2 — User skills profile + evidence tiers · 5 SP · MUST
- Prisma `UserSkill` (userId, skillId, proficiency 0–5, `evidenceTier`
  self_declared|course|assessed|verified, evidence Json[], validFrom, validUntil?, verified Bool).
- Self-assess + proof upload; **auto-infer** evidence: an LMS completion → `course` tier; a scored
  simulator run tagged to a skill → `assessed` tier (tier-0.9). Expirable skills flagged when past
  `validUntil`. Consent-logged on every write.
- **AC:** each skill carries an evidence list + validity; LMS completion auto-creates/raises a
  `course`-tier UserSkill; expired skills flagged; consent entry per write.

### EXP-3 — Skill-gap analysis · 5 SP · MUST
- Pure `gap.logic.ts`: user's UserSkill vector vs a target `Occupation`'s essential/optional skills
  → prioritised gap list ranked by criticality (essential > optional, weighted by required level −
  current proficiency). Each gap links to LMS learning resources for that skill. Radar-chart data.
- `POST expertise/gap` (target occupation escoUri or custom skill set).
- **AC:** ranked gap list (essential first, by level deficit); each gap → learning resources;
  radar data returned; unit tests on the weighting.

### EXP-5 — Mastery path builder · 5 SP · MUST *(SP5 per master table)*
- Prisma `LearningPath` (userId, targetOccupation?, status), `LearningPathStep` (pathId, order,
  kind `course|sim_scenario|assessment`, refId, estMinutes, prerequisiteStepId?). From a gap list,
  sequence LMS courses + simulator scenarios (+ assessment placeholders) to close it, **respecting
  prerequisites**, with estimated duration and an adjustable difficulty knob.
- Frontend `frontend/app/[locale]/dashboard/expertise/page.tsx`: skills profile + gap radar +
  generated path (steps with duration). RO/EN, PRO-gated; sidebar link + `minTierByHref` PRO entry.
- **AC:** path respects prerequisites (topological order); shows estimated total duration; difficulty
  adjusts the sequence; page renders profile → gap → path.

## Out of scope (later EXP sprints)
EXP-6 graded-practice wiring, EXP-7 assessments+peer review, EXP-8 Open Badges 3.0 / VC + Europass,
EXP-10 expert profile (DPO-gated), EXP-11 coaching, EXP-12 expert-for-hire, AI-1 auto-refresh.

## Definition of Done
tsc + `nest build` clean; `npx jest src/expertise --silent` green (gap weighting, prerequisite
ordering, evidence auto-infer); frontend build clean; integration vs throwaway `postgres:15-alpine`:
import seed → user gains a `course`-tier skill from an LMS completion → gap vs a target occupation
returns essential-first ranked gaps → path builder emits a prerequisite-respecting sequence with
duration; consent logged per skill write. Additive migrations only. Independent verification
(prerequisite topological order + evidence-tier auto-infer) before deploy.
