# LMS Exponential Enhancement — Content & Method Plan

**Status**: PLAN ONLY — implementation assigned to the active implementation session via backlog EPIC-DOCRO-006 (see `/root/project-ledger/ledger/documentiulia/backlog.yaml`).
**Author session**: SES-20260707-001 | **Date**: 2026-07-07
**Expert roles consulted**: `frontend_engineer` (delivery UX), `erp_architect` (schema/API), `romanian_tax_specialist` (compliance content — VETO holder on tax facts)

---

## 0. Ground truth (measured 2026-07-07, live DB `documentiulia-db:5434`)

| Metric | Value | Problem |
|---|---|---|
| Courses | 67 (all published) | Catalog OK in breadth, weak in depth |
| Modules / Lessons | 96 / 466 | Only ~1.4 modules per course avg — flat structure |
| **Thin lessons (<500 chars)** | **382 / 466 (82%)** | Most lessons are stubs, not teachable content |
| Rich lessons (>3000 chars) | 53 (11%) | |
| `contentJson` (structured) | 0 | No structured blocks — plain text only |
| Quizzes | 31 | 65 of 96 modules have **no** assessment |
| Video / audio lessons | 0 | Text-only delivery |
| Lesson types actually used | TEXT, QUIZ | Schema supports 8: VIDEO, TEXT, QUIZ, EXERCISE, SIMULATION, DOWNLOAD, ASSIGNMENT, LIVE_SESSION |
| Enrollments | 67 | Delivery loop untested at scale |

Category split: FINANCE_OPS 13, EXCEL_VBA 12, SOFT_SKILLS 11, HR_COMPLIANCE 8, TAX_COMPLIANCE 6, LEAN_OPERATIONS 5, PROJECT_MANAGEMENT 5, HSE_SAFETY 4, MBA_STRATEGY 3.

**Diagnosis**: the bottleneck is not the number of courses — it is (a) content depth, (b) assessment coverage, (c) delivery modality (read-only text, no retention mechanism, no audio, no offline). "Exponential" gains come from a **generation pipeline + retention engine**, not from hand-writing more stubs.

---

## 1. The three multipliers

```
CONTENT  ×  METHOD  ×  DELIVERY
(what)      (how it's made)   (how it reaches the learner)
```

### Multiplier A — CONTENT: deep, compliance-verified, structured

**A1. Structured lesson format (`contentJson`)** — every lesson becomes typed blocks instead of a text blob:

```json
{
  "version": 1,
  "blocks": [
    {"type": "theory",    "md": "..."},
    {"type": "example",   "title": "Factura cu TVA 21% (Legea 141/2025)", "md": "..."},
    {"type": "legal_ref", "act": "Legea 141/2025", "article": "art. 291", "effective": "2025-08-01", "md": "..."},
    {"type": "warning",   "md": "Termenul de încărcare e-Factura: 5 zile lucrătoare"},
    {"type": "exercise",  "md": "...", "solution_md": "..."},
    {"type": "quiz_inline", "q": "...", "choices": [...], "answer": 1, "explain": "..."},
    {"type": "flashcard_seed", "front": "...", "back": "..."}
  ]
}
```

Frontend renders blocks (callouts, collapsible solutions, inline quiz checks). `flashcard_seed` blocks feed Multiplier C directly. Keep `content` (plain text) populated as fallback/SEO.

**A2. Deep-content generation pipeline (Workflow multi-agent, per lesson)** — this is the method that scales to 382 lessons:

```
Stage 1  WRITER      one agent per lesson: expand stub → full structured lesson
                     (1500–3500 words RO, blocks per A1, correct diacritics ș/ț U+0219/U+021B)
Stage 2  COMPLIANCE  romanian_tax_specialist agent: verify every tax fact —
                     date-aware VAT (19/9/5 pre-Aug-2025, 21/11 post), D406 monthly,
                     e-Factura 5-working-day rule, RO_CIUS UBL 2.1, CIF/CUI rules.
                     REJECT → back to writer with correction notes (max 2 loops)
Stage 3  PEDAGOGY    editor agent: learning outcomes present, example per concept,
                     exercise per lesson, ≥1 quiz_inline per 1000 words, ≥5 flashcard_seeds
Stage 4  COMMIT      write contentJson + regenerated plain-text content to DB (idempotent by lesson id)
```

Run as a `pipeline()` Workflow, ~20 lessons per batch, resumable. Grounding facts for TAX/HR categories come from a **fact sheet** compiled once per category (A3) and injected into the writer prompt, so hallucinated law numbers can't slip in.

**A3. Research grounding (researchclaw / WebSearch)** — before generating TAX_COMPLIANCE and HR_COMPLIANCE content, run a research pass producing dated fact sheets (`docs/lms-fact-sheets/{category}.md`): current VAT rates and transition rules, e-Factura B2C timeline, e-TVA prepopulated returns, e-Transport, D406 grace exhausted during 2025 (standard deadlines apply in 2026 — verified, corrects earlier project docs), 2026 PFA/micro-enterprise tax changes, minimum wage/CAS/CASS 2026. Every fact carries source URL + retrieval date. Fact sheets are the single source of truth for the writer stage and get refreshed by the update loop (Multiplier D).

**A4. Catalog expansion 67 → ~110 courses** — priority order (MoSCoW):

*Must (compliance-driven, RO market, high SEO intent):*
1. e-Factura B2C — obligații 2026 (mandatory since Jan 2025, heavily searched)
2. SAF-T D406 practic pentru contribuabili mici — fără grație în 2026, termene standard (urgent, timely)
3. e-TVA și decontul precompletat — reconciliere RO e-TVA
4. e-Transport — cod UIT, sancțiuni, integrare
5. Fiscalitate PFA/II 2026 (praguri, CASS, norme de venit)
6. Micro-întreprindere 2026 — praguri noi, condiții
7. Înființare SRL 2026 pas cu pas (ONRC online)
8. Dividende, impozit și optimizare legală 2026

*Should (platform-synergy):*
9. AI pentru contabili (folosind chiar platforma — dogfooding)
10. Fonduri PNRR/EU pentru IMM 2026
11. Contabilitate primară pentru antreprenori (funnel-entry, free)
12. Salarizare completă 2026 (REVISAL, contribuții, concedii)
13. GDPR pentru firme mici
14. Cash-flow și previziune financiară (leagă de modulul Prophet)

*Could:* NIS2/securitate pentru IMM, ESG/CSRD raportare, curs SAGA→DocumentIulia migrare (conversion tool!), Excel financiar avansat RO.

Each new course: 5–8 modules × 4–6 lessons, generated through the same A2 pipeline. New-course specs (outline, outcomes, audience) drafted by a curriculum-architect agent, approved against the fact sheets before generation.

### Multiplier B — METHOD: self-evolving quality (CORAL)

Content generation prompts should not be static. Use **CORAL** (`/root/CORAL`, multi-agent self-evolution — give it a codebase + grading script):

- **Evolvable artifact**: the writer/compliance/pedagogy prompt set + block-schema instructions (a small repo `lms-content-genome/`).
- **Grading script** (deterministic, no LLM needed for most checks):
  - diacritics correctness (U+0219/U+021B, never cedilla ş/ţ) — regex
  - length + block-coverage (has example, exercise, ≥5 flashcard_seeds, quiz density) — parser
  - tax-fact assertions vs fact sheet (rate mentions must match date context) — rule table
  - readability score for RO + terminology check (uses ANAF terms: "e-Factura", "D406", "CUI")
  - LLM-judge (Grok API, key in `backend/.env`) for pedagogy score 0–10
- CORAL evolves the prompt genome against a held-out set of 20 stub lessons; winning genome becomes the production pipeline prompt. Re-run monthly or when the grader is extended.

**Continuous improvement loop (production feedback → regeneration):** quiz-failure rate per lesson, flashcard lapse rate (FSRS `lapses`), completion drop-off, and user ratings feed a weekly job that flags the worst-decile lessons for regeneration through the A2 pipeline. This is the "exponential" part: the corpus improves itself from usage data.

### Multiplier C — DELIVERY: graft flashcard_forge into the LMS

`/root/flashcard_forge.7z` (extracted for reference at scratchpad `fforge/`) is a complete, working retention engine: **FSRS-4.5 spaced repetition + Piper TTS narration + offline single-file HTML player + Anki export**. Graft its methods (port, don't run Flask in prod):

**C1. Spaced-repetition flashcards (biggest retention win)**
- New tables: `LMSFlashcard` (lessonId, front, back, clozeText?, audioFrontUrl, audioBackUrl) and `LMSFlashcardReview` (userId, cardId, FSRS state: stability, difficulty, due, lapses, reps, lastRating).
- Port `forge/fsrs.py` (FSRS-4.5, ~90 lines of math) to TypeScript in the NestJS LMS module — faithful formulas, day-granular is fine.
- Cards come free from `flashcard_seed` blocks (A2 stage 3): 466 lessons × ≥5 = **2300+ cards** at launch, zero extra generation cost.
- UX: "Recapitulare" tab per course + a global daily-review queue ("15 carduri scadente azi") on the dashboard; keyboard `space`/`1–4` like forge's player. Daily-due count in the existing alerts/calendar system ("Ai 23 de carduri scadente — 7 min").

**C2. Audio narration (Piper TTS — CPU-only, offline, no API cost)**
- `pip install piper-tts`; voice `ro_RO-mihai-medium` from huggingface.co/rhasspy/piper-voices (plus `en_US-lessac-medium`, already in the archive, for EN courses).
- Batch job: narrate every lesson (theory blocks) → MP3/OGG to Bunny.net storage → `LMSLesson.attachments`/audioUrl. Also narrate flashcard fronts/backs (forge does exactly this — see `forge/tts.py`).
- Result: every course becomes a **podcast** ("ascultă lecția") — commute-friendly delivery, near-zero marginal cost. Port forge's driving mode (auto-play Q → A → next) for hands-free review.

**C3. Offline course player**
- Port forge's `templates/player.html` pattern: single self-contained HTML per course (lessons + quiz + cards + audio base64-embedded), downloadable Pro/Business perk. Works 100% offline on any phone — no PWA/service-worker HTTPS headaches (forge's README documents why).
- Anki CSV export per course (`forge/exporters.py` pattern) — free-tier hook that markets the platform inside Anki decks.

**C4. Use the other 6 lesson types**
- `QUIZ`: generated so **every module** ends with a 10-question graded quiz (65 modules currently missing) — certificate gate: ≥80%.
- `EXERCISE`/`ASSIGNMENT`: practical tasks executed *inside the platform* ("emite această e-Factura de test", "importă acest extras") — dogfooding tutorials that double as product onboarding.
- `SIMULATION`: wire TAX/FINANCE/MBA courses to the just-shipped **Simulator v2** (S-48/S-49) — scenario lessons ("condu firma 12 luni cu noile cote TVA"). This is a differentiator no RO competitor has.
- `DOWNLOAD`: generated templates (contract models, decision templates, checklists PDF) per course.
- `VIDEO` (phase 2, optional): slide-render + Piper narration → cheap MP4s via ffmpeg; only where audio+text underperforms.

### Multiplier D — LIFECYCLE: keep it current automatically

- Monthly researchclaw/WebSearch job re-validates every `legal_ref` block against current law; changed facts → affected lessons flagged → regenerated via A2 → changelog note shown on the course ("Actualizat: cote TVA 2026").
- "Actualitate fiscală" auto-course: rolling monthly module generated from the fact-sheet diff — perpetual freshness signal + SEO.

---

## 2. Quality gates (hard, enforced in pipeline stage 4 — never skip)

1. Romanian diacritics: comma-below only (U+0219/U+021B) — reject cedilla forms.
2. Tax facts date-aware: any VAT mention must state the applicable period; post-Aug-2025 content uses 21%/11%.
3. Every legal claim has a `legal_ref` block with act + article.
4. No lesson under 1200 words (except QUIZ/DOWNLOAD types).
5. ≥1 quiz per module; ≥5 flashcards per lesson; learning outcomes on every course.
6. All generated content in `language='ro'` unless the course is EN; native-quality register (verified by grader).
7. Audit: every generated/updated lesson logs generator version + fact-sheet version (traceability).

---

## 3. Sequencing & estimates (for sprint planning)

| Phase | Work | SP | Depends on |
|---|---|---|---|
| P1 | contentJson schema + block renderer (FE) + fact sheets (research) | 8 | — |
| P2 | Generation pipeline (Workflow) + quality grader; enrich all 382 thin lessons | 13 | P1 |
| P3 | Quiz coverage: 65 missing module quizzes + certificate gating | 5 | P2 |
| P4 | FSRS flashcards: schema, TS port, review UI, seeds from P2 | 8 | P2 |
| P5 | Piper TTS narration (lessons + cards), Bunny storage, audio player UI | 8 | P2 |
| P6 | Offline player + Anki export | 5 | P4, P5 |
| P7 | Catalog expansion: 8 Must courses via pipeline | 8 | P2 |
| P8 | CORAL prompt-evolution loop + usage-feedback regeneration job | 8 | P2, telemetry |
| P9 | Simulator-linked SIMULATION lessons + in-platform EXERCISE lessons | 8 | P2, SIM v2 |

Total ≈ 71 SP ≈ 3 sprints. Recommended sprint cut: **S-50 = P1+P2+P3** (26 SP, transforms existing catalog), S-51 = P4+P5+P6 (retention engine), S-52 = P7+P8+P9 (expansion + self-evolution).

Registered in backlog as **EPIC-DOCRO-006 "LMS Exponential Enhancement"**, stories LMS-P1…LMS-P9.

---

## 4. Assets inventory (for the implementing session)

| Asset | Location | Use |
|---|---|---|
| flashcard_forge source | `/root/flashcard_forge.7z` (FSRS `forge/fsrs.py`, TTS `forge/tts.py`, player `templates/player.html`, exporters) | Port to LMS module |
| CORAL | `/root/CORAL` (uv sync; Claude Code runtime supported) | Prompt-genome evolution |
| researchclaw | `/usr/local/bin/researchclaw` (23-stage pipeline; or plain WebSearch for lighter passes) | Fact sheets + monthly re-validation |
| Grok API key | `backend/.env` `GROK_API_KEY` (⚠ flagged for rotation — rotate first) | LLM-judge in grader |
| Piper voices | huggingface.co/rhasspy/piper-voices → `ro_RO-mihai-medium`; `en_US-lessac-medium` inside the 7z | TTS narration |
| Simulator v2 | shipped S-48/S-49 | SIMULATION lessons |
| Existing seeds | `backend/prisma/seed-data/courses-*.ts` | Source of current 67 courses |

---

# 5. CONSORTIUM REVIEW — 10+ Year Horizon (2026 → 2036+)

Convened as an elite cross-disciplinary consortium. Each seat reviewed sections 1–4 against a 10-year-plus outlook. Verdict up front: **sections 1–4 are the right 3-sprint move, but only if built on the architecture in 5.7 — otherwise we are polishing a format (the "course") that will not be the dominant learning unit by 2030.**

## 5.1 Learning Scientist — the death of the static course

- 2026: completion rates for self-paced online courses are ~5–15% industry-wide. Retention without spaced repetition ≈ 20% after a month (Ebbinghaus). Multiplier C (FSRS) is the single highest-leverage item in the whole plan — it attacks the actual failure mode.
- 2028–2030: the dominant pattern becomes the **AI tutor loop** — learn-by-dialogue, assessed continuously, curriculum re-planned per learner per session. "Course" survives as a *syllabus contract* (scope + credential), not as a fixed sequence of lessons. 1-to-1 tutoring produces ~2σ learning gains (Bloom, 1984) — AI makes it marginal-cost-zero; every serious platform will have it.
- 2030–2036: learning collapses into **doing with supervision**. For our domain: the accountant doesn't take an "e-Factura course" — the ERP's agent coaches them *inside the live workflow*, and the LMS records mastery evidence from real work (see 5.5 on credentials). The winning asset is not lessons — it is the **domain knowledge graph + the learner's mastery model**.
- **Directive to the plan**: treat every lesson generated in P2 as *structured knowledge first, prose second*. `contentJson` blocks with typed `legal_ref`, `example`, `flashcard_seed` are exactly right — they are graph nodes wearing a lesson costume. Do not generate monolithic prose.

## 5.2 Regulatory Futurist (romanian_tax_specialist seat, VETO holder) — compliance content has a decaying half-life, and that is our moat

- Locked EU trajectory: **ViDA (VAT in the Digital Age)** — digital reporting & mandatory structured e-invoicing for intra-EU B2B by **2030**, member-state alignment by **2035**. Romania (e-Factura, e-TVA, e-Transport, SAF-T) is *ahead* of most of the EU — meaning our Romanian compliance corpus becomes the **template for 26 other markets** as they converge. Course content architected per A1/A3 (fact-sheets + `legal_ref` blocks + date-aware rules) is mechanically translatable to each country's implementation as it lands.
- 2026–2028 (near-certain RO pipeline): SAF-T D406 now at standard deadlines for all (grace exhausted 2025); e-TVA pre-populated returns tighten; expect e-Factura B2C enforcement waves. Every one of these is a content event → the Multiplier D lifecycle loop is not a nice-to-have, it is the product.
- 2030+: real-time transaction-level reporting makes "how to file" content obsolete — filing is machine-to-machine. The teachable skill shifts to **supervising, auditing and challenging automated compliance** ("de ce a clasificat AI-ul această factură la 11%?"). Plan course lines accordingly from P7 onward: every Must-course gets a final module "automatizare și supraveghere" that teaches the platform's own automation.
- **VETO condition carried forward**: no generated tax statement ships without a dated `legal_ref` + fact-sheet provenance (§2 gates). In a 2030 world of machine-generated content floods, *verifiable provenance is the entire brand*.

## 5.3 AI Systems Architect — content stops being an artifact and becomes a query

- Cost curve: LLM inference cost per token has fallen ~10× every ~18–24 months since 2023. Extrapolated even conservatively, by ~2030 generating a full bespoke course costs less than serving today's stored one. **Implication: the corpus we generate in P2 is not the asset — the *generator + grader + fact-graph* is the asset.** Version and treasure the pipeline (CORAL genome, grading rules, fact sheets) like production code; treat lesson rows as a cache.
- Architecture consequence (see 5.7): put a **Knowledge Graph** (concepts, legal acts, procedures, examples, dependencies) at the center. Courses, flashcards, audio, tutor answers, simulator scenarios are all *projections* of the graph. When Legea X changes, you update one graph node and re-project — not hunt through 466 prose blobs. P1's `contentJson` is the migration path: blocks are proto-graph-nodes.
- 2027–2029: **on-prem/open-weight models close the gap** for domain tasks. The Hertzener GPU + a fine-tuned open model on our graph → zero-marginal-cost RO-fiscal tutor with no per-token API dependency and clean GDPR posture. Budget a fine-tune/RAG evaluation in 2027 planning.
- Voice: Piper (P5) is the 2026 answer; by 2028 real-time conversational speech models make the **audio tutor** (talk to your fiscal coach while driving) the premium delivery. P5's narration pipeline and the driving-mode player are the stepping stones — keep audio generation abstracted behind an interface so the TTS engine is swappable.

## 5.4 Product Strategist — from course catalog to learning moat

- The catalog (P7) is SEO surface and funnel, not the business. The durable moats, in order: (1) **the learner's mastery model** (switching cost — your FSRS history and competence profile live here), (2) **provenance-verified compliance graph** (trust), (3) **learn-inside-the-tool** (E XERCISE/SIMULATION lessons that are simultaneously product onboarding — no competitor that is only-an-LMS or only-an-ERP can copy this).
- Pricing evolution: 2026 freemium tiers → 2028 **"competence subscription"** (company pays per-seat for *proven, audited team competence* — reports for management/HRDA/audit) → 2030+ the tutor is bundled into ERP seats; standalone course sales fade. Design the schema now so mastery evidence is per-user-per-concept (not per-course-completion) — that is what a competence report needs.
- B2B is the 10-year revenue center: accounting firms training juniors, corporates proving compliance training (HSE, GDPR — already legally mandated). The offline player + Anki export (P6) are consumer delights; the **team competence dashboard** is the enterprise product. Add it to the roadmap after P4 telemetry exists.

## 5.5 Credentials & Identity Expert — verifiable micro-credentials

- EU Digital Identity Wallet (eIDAS 2.0) obligations land **2026–2027**; the **European Learning Model / Europass verifiable credentials** standard is live. By 2030, a PDF certificate is decorative; a **W3C Verifiable Credential** in the citizen's EUDI wallet is the real thing.
- Roadmap: 2026 keep PDF certificates (exists) → 2027 issue **Open Badges 3.0 / ELM-compliant VCs** per micro-credential (module-level, not course-level — aligns with the mastery model in 5.4) → 2029+ EQF-referenced micro-credentials per the 2022 EU Council Recommendation, making them employer-legible across the EU.
- Cheap now: mint credential IDs as stable URIs with issuance metadata (issuer key, evidence pointer to quiz/assignment results). Adds one table; makes the 2027 VC upgrade a serializer, not a migration.

## 5.6 Security / EU AI Act Officer — compliance for the machine that teaches compliance

- **EU AI Act, Annex III**: AI systems used to *evaluate learning outcomes* or *steer the learning process* in education/vocational training are **high-risk**. GPAI obligations already apply (Aug 2025), high-risk obligations phase in **Aug 2026–2027** — i.e., during this roadmap. Adaptive assessment (P4 FSRS is fine — it's scheduling, not judgment; but AI-graded assignments and the future tutor **are** in scope).
- Do now, cheaply: (1) log model+prompt+genome version for every generated artifact (§2 gate 7 already says this — keep it), (2) human-review sampling on AI-graded assessments, (3) a one-page AI-system register per feature (purpose, risk class, oversight), (4) learner-facing disclosure ("conținut generat AI, verificat la data X"). Retrofit in 2028 would cost 10× more.
- GDPR: mastery models are personal data of increasing sensitivity (they predict employability). Data-minimization + export/delete per user from day one of P4 schema.

## 5.7 Chief Architect — the 10-year target architecture (build P1–P9 as its first increment)

```
                    ┌─────────────────────────────────────────────┐
                    │   FISCAL-BUSINESS KNOWLEDGE GRAPH            │
                    │   concepts · legal acts (dated) · procedures │
                    │   examples · dependencies · provenance       │
                    └──────┬───────────────┬──────────────┬───────┘
                 generators│(CORAL-evolved)│              │
              ┌────────────▼──┐  ┌─────────▼────┐  ┌──────▼────────┐
              │ COURSE VIEWS  │  │ RETENTION    │  │ TUTOR/AGENT    │
              │ lessons/quiz/ │  │ FSRS cards   │  │ (2027+) RAG    │
              │ audio/offline │  │ audio review │  │ voice, in-app  │
              └───────┬───────┘  └──────┬───────┘  └──────┬────────┘
                      └────────┬────────┴─────────────────┘
                     ┌─────────▼──────────┐     ┌────────────────────┐
                     │ LEARNER MASTERY    │────▶│ VERIFIABLE          │
                     │ MODEL (per concept)│     │ MICRO-CREDENTIALS   │
                     └─────────▲──────────┘     │ (EUDI wallet 2027+) │
                               │                └────────────────────┘
                  usage telemetry · quiz/lapse rates · ERP work evidence
                  (feeds CORAL regeneration loop + Multiplier D lifecycle)
```

- **P1–P9 map cleanly onto this**: contentJson blocks = graph nodes v0; fact sheets = legal-act nodes v0; FSRS reviews = mastery model v0; the generation pipeline = the generator layer; CORAL loop = generator evolution. Nothing in sections 1–4 is throwaway *if* block/`legal_ref` discipline is enforced.
- **Two schema decisions to take in S-50 so the future is cheap**: (1) every contentJson block gets a stable `blockId` + optional `conceptKey` (string, no FK yet) — this is the graph handle; (2) flashcards and quiz questions reference `conceptKey` too — this is the mastery-model handle. Cost now: two string columns. Cost to retrofit in 2028: a re-generation of the entire corpus.

## 5.8 Consortium resolutions (binding on implementation)

1. **APPROVE** sections 1–4 and the S-50/51/52 cut, with amendments below.
2. **AMEND P1**: add `blockId` + `conceptKey` to the block schema (5.7).
3. **AMEND P4**: mastery evidence recorded per-concept, not only per-lesson; user data export/delete included (5.6).
4. **AMEND P7**: every Must-course ends with an "automatizare și supraveghere" module teaching the platform's own automation of that topic (5.2).
5. **ADD backlog (2027 horizon, not in S-50–52)**: LMS-H2-1 AI tutor (RAG over knowledge graph, text first, voice later); LMS-H2-2 Open Badges 3.0 / ELM verifiable credentials; LMS-H2-3 team competence dashboard (B2B); LMS-H2-4 EU AI Act high-risk conformity pack for AI-graded assessment; LMS-H2-5 knowledge-graph extraction from the P2 corpus (blocks → typed graph).
6. **Standing rule**: the generator pipeline, grader, fact sheets and CORAL genome are production code — versioned, reviewed, backed up like the ERP itself. Lesson rows are cache.

---

# 6. NORTH STAR — the LMS as a professional life & career coach

**Owner directive (2026-07-07): "think of the courses module to be a professional life/career coach to the user."** The consortium adopts this as the product identity that everything in sections 1–5 serves. The LMS is not a course catalog; it is a **longitudinal career companion** that knows where the user is professionally, where they want to go, and closes the gap — with courses as one of several instruments.

## 6.1 The coach loop (replaces "browse catalog → enroll")

```
KNOW the user  →  AGREE the goal  →  PLAN the path  →  COACH weekly  →  PROVE progress
(career profile)  (target role/     (personalized     (nudges, reviews, (mastery model,
 + real ERP work   income/exam/      sequence of       due flashcards,   micro-credentials,
 evidence)         business goal)    lessons/cards/    check-ins,        competence report,
                                     sims/exercises)   course corrections) CV/portfolio)
```

- **KNOW**: onboarding interview (role, experience, goals: e.g. "devin expert contabil CECCAR", "îmi cresc PFA-ul la 100k", "angajez primul salariat") + — uniquely, because we are inside the ERP — *observed work evidence*: the platform sees the user issues invoices but never touched payroll, struggles with D406 validation errors, just registered their first employee. **No ERP-data use without explicit opt-in consent (GDPR + the 5.6 register); the role-flip guard from S-49 applies.**
- **AGREE**: the coach proposes 1–3 concrete career objectives with timelines (SMART), user confirms. Objectives are first-class DB entities, not vibes.
- **PLAN**: skills-gap analysis = target-role competence profile (graph concepts, 5.7) minus current mastery model → a **personal path**: ordered mix of lessons, flashcard tracks, Simulator scenarios, in-app exercises. Path re-plans as mastery evolves — the FSRS/mastery data from P4 is the coach's memory.
- **COACH**: weekly cadence via the existing alerts/calendar system: "Săptămâna asta: 2 lecții SAF-T (termenul D406 se apropie!), 40 de carduri, 1 simulare. Ai 12 min azi — începem cu recapitularea?" Life-event triggers from the ERP: first employee registered → payroll & contracts track offered; revenue nears micro-enterprise threshold → tax-regime course + simulator scenario proposed. Deadlines coached, not just alerted: D406 due date arrives *with* the refresher lesson.
- **PROVE**: living competence portfolio — per-concept mastery, credentials (5.5), a generated professional summary ("CV fiscal") the user can export; for B2B, the team competence report (5.4).

## 6.2 Why this wins (and only we can build it)

An LMS coaches from quiz scores. A generic AI coach has no ground truth. **We coach from the user's real business telemetry**: actual filings, actual errors, actual growth events. The coach's advice is falsifiable against outcomes visible in the same platform ("after the cash-flow track, your DSO dropped 9 days"). That closed evidence loop is the 10-year moat — it compounds and cannot be copied by anyone who doesn't run the user's back office.

## 6.3 Career-coach roadmap increments

| Increment | What ships | When |
|---|---|---|
| CC-0 (inside S-50–52) | Career profile + objectives schema; onboarding interview; static path templates per goal (8–10 curated goal→path mappings); weekly digest nudge using P4 due-cards + path position | with P4 |
| CC-1 (2026 H2) | Skills-gap engine on conceptKeys; ERP life-event triggers (opt-in) — employee hired, threshold approaching, new obligation detected → path insertion; deadline-coupled refreshers | after S-52 |
| CC-2 (2027) | Conversational coach = the 5.7 tutor with the career context in its system prompt; voice check-ins (driving mode); competence portfolio export + verifiable credentials (LMS-H2-2) | H2 stack |
| CC-3 (2027+) | B2B team coaching (manager dashboards, HRDA/mandated-training auto-plans); marketplace bridge — proven mastery unlocks freelancer-marketplace listing (Horizon-2 synergy) | with marketplace |

**Amendment to §3**: CC-0 (+3 SP, rides with P4 in S-51). Backlog gains LMS-CC-1…3 for the horizon items.

**Guardrails (binding)**: coach never gives regulated financial/legal *advice* — it teaches, simulates, and points to the platform's compliant tooling or a human consultant (the S-46 consultancy module is the escalation path: coach → course → simulator → book a human). Career-profile data: explicit consent, exportable, deletable, never used for training (GI-AI-2 guard), AI-Act-registered (5.6).

