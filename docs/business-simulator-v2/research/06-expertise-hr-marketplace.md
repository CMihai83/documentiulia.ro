# Research 06 — "Become an Expert in Your Field" + HR-Marketplace Linkage

## PART A — CODEBASE INVENTORY

**Headline:** The building blocks for an expertise engine largely exist, but most are **in-memory (volatile `Map`) prototypes with real algorithmic logic but no Prisma persistence**. Only the **Simulator** is fully DB-backed/production-grade. There is **no** career-path / competency / skill-gap / mentoring / verifiable-credential code.

### A.1 Talent / HR / Marketplace modules
| Module | Path | Persistence | Capability |
|---|---|---|---|
| **ATS** | `backend/src/ats/` (43KB) | In-memory (0 prisma) | **Real weighted matcher, stub storage.** `calculateMatchScore()` (`ats.service.ts:1017`): skills 40/exp 30/edu 15/culture 15 + strengths/gaps/recommendation; real `detectBias()`, `parseCV()`. 35 routes incl. `POST ats/ai/match`. Strongest existing matcher. |
| **Freelancer** | `backend/src/freelancer/` (49KB + 6 sub) | In-memory (0 prisma) despite `FreelancerProfile/Contract` models | **Real matcher, stub storage.** `matchFreelancersToProject()` (`:482`) + `calculateMatchBreakdown()` (`:520`): skill 40 (verified bonus + level-gap)/exp 20/rate 15/avail 10/loc 10/rating 5. ~130 routes. |
| **HR** | `backend/src/hr/` (30KB) | **DB (28 prisma)** | REAL. CRUD, payroll, timesheets, detect-changes, generate-act-aditional. |
| **HR-Contracts** | `backend/src/hr-contracts/` | **DB (19 prisma)** | REAL DB CRUD; ANAF/REVISAL e-submit mocked. |
| **HR-Forms** | `backend/src/hr-forms/` (57KB) | In-memory | Stub storage, real templates. ~40 routes. |
| **Employee-Portal** | `backend/src/employee-portal/` | **DB (20 prisma)** | REAL. Dashboard, leave, payslips, notifications. |
| **Consulting** | `backend/src/consulting/` | **DB (9 prisma)** | REAL bookings + package catalog; full lifecycle. |
| **Onboarding** | `backend/src/onboarding/` (+ gamification 29KB) | **DB (9 prisma)** | REAL + **live wired gamification** (achievements/steps/leaderboard). |
| **Reseller** | `backend/src/reseller/` | In-memory + Math.random | STUB/DEMO. |

**Matching engine:** only two real matchers (ATS `:1017`, Freelancer `:482`+`project-bidding`). **No** separate matching-engine module; **no** career/competency/gap/trajectory code.
**Prisma models exist:** `Employee, Partner, FreelancerProfile, FreelancerContract, Contract, ConsultingBooking`. **Missing** (ATS/Freelancer use TS interfaces only): `Job, JobPosting, Candidate, Application, Skill, Competency, Match, Career, Mentor`.
**Frontend:** real pages for hr/ (1272), freelancer/ (760), ats/ (906), consulting/ (261), employee-portal/ (500), onboarding/, partners/, contracts/. **No** career/marketplace/jobs/skills/talent/matching/mentor dirs.

### A.2 LMS / Simulator / Gamification / Credentials (the substrate)
| Component | Path | Persistence | Capability |
|---|---|---|---|
| **LMS** | `backend/src/lms/` (1479 + 4 generators) | **In-memory — 0 prisma** despite `LMSCourse/Module/Lesson/Enrollment/LessonProgress` models | Rich logic, stub storage: CRUD, enrollments + progress %, **assessments w/ auto-scoring**, certificates + verify, **badges w/ tiers**, leaderboard, paths. ~50 endpoints. Resets on restart. |
| **MBA micro-credentials** | `lms/mba-courses.service.ts` (2821) | In-memory | Closest existing graded/capstone flow: credential lifecycle NOT_STARTED→…→APPROVED, eligibility gating, verify/:code, executive coaches. |
| **LMS Gamification** | `lms/gamification.service.ts` (1072) | In-memory | Full engine (points/badges/achievements/levels/streaks/challenges) but **UNWIRED — registered in no module = dead code.** |
| **Onboarding Gamification** | `onboarding/onboarding-gamification.service.ts` | DB | Live but onboarding-scoped. |
| **Business SIMULATOR** ⭐ | `backend/src/simulation/` | **DB — 33 prisma** | Most production-complete asset. Real financial engine, 9 decision categories (incl. EU_FUNDS), month advance, events, scoring/leaderboard, achievements, AI recs. Already links `LMSCourse` + `:gameId/learning-path`. |
| **Content (DB catalog)** | `backend/src/content/` (366) | **DB** | Serves `@Controller('courses')` from seeded `LMSCourse` rows. **DB catalog and interactive LMS are two disconnected halves.** |

**Credentials:** LMS in-memory certs + MBA micro-credentials + persisted `simulationAchievement`. **No W3C VC / Open Badge** implementation.

**Bottom line:** Reusable now — Simulator (DB), HR/Employee-Portal/Consulting/Contracts (DB). Needs persistence migration — LMS, ATS, Freelancer matchers. Build from scratch — skills taxonomy, competency/gap, career trajectory, verifiable credentials, mentoring, and wiring the dead gamification engine.

## PART B — DOMAIN RESEARCH

### B.1 Skills taxonomies
- **ESCO** (most relevant, RO/EU): 3,008 occupations, ~13,900 skills/competences, 28 languages, two linked pillars, RDF/OWL/SKOS + public Web Services API + downloads. Canonical skill vocabulary + occupation→required-skills graph; supports gap analysis, recruitment, training, person↔job matching. ([API](https://esco.ec.europa.eu/en/about-esco/escopedia/escopedia/esco-api), [download](https://esco.ec.europa.eu/en/use-esco/download))
- **SFIA** (IT/digital): 7 responsibility levels × generic attributes → granular seniority leveling + gap analysis for IT.
- **O*NET** (US): broader cross-reference/enrichment, US-centric.
- **App pattern:** `Skill` + `Occupation` keyed to ESCO URIs (+ optional SFIA level). Gap = set-difference between user proficiency vector and occupation essential-skills vector, weighted by essential/optional + SFIA-level distance.

### B.2 Mastery-based / adaptive paths + deliberate practice
Diagnostic → AI builds pathway prioritizing foundational gaps → advance **by mastery, not time** → next-best-resource recommender → feedback loops. **Spaced repetition** widens review intervals as mastery grows. **Deliberate practice** (Ericsson): focused practice on identified weaknesses + immediate feedback + reflective cycles isolating one aspect; routine practice → "arrested development." ([pathways](https://skillpanel.com/blog/personalized-learning-pathways/), [ALIGNAgent](https://arxiv.org/html/2601.15551), [Ericsson](https://pmc.ncbi.nlm.nih.gov/articles/PMC4935723/))

### B.3 Verifiable micro-credentials
- **Open Badges 3.0** = a profile of the **W3C Verifiable Credentials** model (1EdTech): cryptographically signed at issuance, held in recipient's wallet → tamper-evident + portable. ([1EdTech](https://www.1edtech.org/1edtech-article/new-open-badges-30-standard-provides-enhanced-security-and-mobility/411060))
- **Europass / ELM** aligns with the same W3C VC model → OB 3.0 badge verifiable in a Europass wallet (RO/EU portability target).
- **App usage:** issue each competency/level attainment as OB 3.0 VC (issuer=DocumentIulia, subject=user DID/email, evidence=assessment/simulator results, alignment=ESCO URI); public `verify/:id` + wallet export. Upgrades the in-memory LMS "certificates" into real portable credentials.

### B.4 Skills assessment credibility — evidence tiers
Combine signals: self-assessment + validated instruments + peer review + observation + work-sample; weight verified above self-declared. **Evidence-tier credibility multiplier:** self-declared (0.2) < course completion (0.5) < auto-graded quiz (0.7) < **work-sample/simulator performance (0.9)** < proctored/peer-reviewed capstone (1.0). Store each proficiency with its evidence tier; matching weights higher tiers.

### B.5 Expertise → marketplace linkage
- **Skill-based matching** on verified competencies, not resumes (verified skills weighted far higher).
- **Reputation/trust scoring** (reviews + verified skills + delivery history) boosts match visibility.
- **Career trajectory / "career DNA"**: verified skills + aspirations + agility → target-role paths showing required competencies + linked learning.
- **Mentoring marketplaces**; **expert-for-hire** archetypes: **GLG** (paid expert calls, vetted network), **Catalant** (project execution, $150–450/hr, 20–30% platform fee), **Toptal** (vetted freelancers). Monetize via % billable + contracting/invoicing.

## PART C — PROPOSED "EXPERTISE / MASTERY" MODULE

New Prisma-first module `backend/src/expertise/` orchestrating existing assets into one novice→expert→for-hire pipeline (do NOT repeat the LMS in-memory mistake).

```
ESCO skills profile → Gap analysis → Personalized path (over LMS)
                                          → Deliberate practice (SIMULATOR + MBA capstone)
                                          → Validated assessment (LMS + peer + work-sample)
                                          → Verifiable credential (OB 3.0 / VC — NEW)
                                          → Verified expert profile
                                          → HR MARKETPLACE matching (reuse ATS/Freelancer, → Prisma)
                                          → career coaching + expert-for-hire (reuse Consulting bookings)
```

**Reuse:** gap/path reuses LMS logic but persists; graded practice = DB Simulator (tier-0.9) + MBA capstone (tier-1.0); credentials upgrade LMS certs to OB 3.0 VCs; matching extracts ATS `:1017` + Freelancer `:520` into a shared `MatchingService` (migrated to Prisma); expert sessions reuse `consulting.service.ts`; wire the dead `lms/gamification.service.ts`.

**New models:** `Skill` (ESCO URI + optional SFIA), `Occupation`, `UserSkill` (proficiency 0–5, evidenceTier, verified), `SkillAssessment`/`AssessmentItem`/`AssessmentAttempt`, `PeerReview`, `LearningPath`/`LearningPathStep`, `Credential` (VC JSON, verifyCode, ESCO alignment, revoked), `CareerGoal`, `ExpertProfile` (reputationScore, hourlyRate), `ExpertEngagement`; + `Candidate`/`JobPosting`/`Application`.

### Sprint stories (Epic: Expertise & Mastery Engine) — MoSCoW / SP
- **[Must] EXP-1** ESCO taxonomy ingestion (`Skill`/`Occupation` models + import + seed). SP5
- **[Must] EXP-2** User skills profile + evidence tiers (auto-infer from LMS/Simulator). SP5
- **[Must] EXP-3** Skill-gap analysis vs target occupation (weighted vector + radar). SP5
- **[Must] EXP-4** Migrate LMS from in-memory Maps → Prisma (unify with Content catalog). SP8 *(prerequisite)*
- **[Should] EXP-5** Mastery-based personalized path (recommender + spaced repetition). SP8
- **[Should] EXP-6** Simulator + MBA capstone as graded practice (tier-0.9/1.0 evidence). SP5
- **[Should] EXP-7** Validated assessments + peer review (credibility-weighted). SP8
- **[Must] EXP-8** Open Badges 3.0 / W3C VC issuance + verify + Europass export. SP8
- **[Must] EXP-9** Persist ATS/Freelancer + shared `MatchingService` (verified-tier weighting). SP8
- **[Should] EXP-10** Verified expert profile + reputation. SP5
- **[Could] EXP-11** Career-trajectory coaching (skills-to-acquire-next + Consulting). SP5
- **[Could] EXP-12** Expert-for-hire engagements (book/pay via billing/contracts). SP8
- **[Should] EXP-13** Wire the dead LMS gamification engine (XP/levels/streaks → mastery). SP3

**GDPR:** credential/skill data is personal — consent logging, anonymize AI training data, align to Europass/ELM.

**Sequencing:** P1 foundations (EXP-1/2/4) → P2 mastery loop (3/5/6/7) → P3 credential+marketplace (8/9/10) → P4 monetization (11/12/13). The single most leverageable asset is the **DB-backed Simulator** — anchor "graded practice" on it, don't rebuild.
