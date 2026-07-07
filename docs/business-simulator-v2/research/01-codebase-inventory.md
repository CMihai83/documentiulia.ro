# Research 01 — Existing Business Simulator & Adjacent Features (Codebase Inventory)

> Read-only inventory of what already exists in `/root/documentiulia.ro`, to plan an *exponential enhancement* (not greenfield). Monorepo: `backend/` NestJS + Prisma, `frontend/` Next.js App Router.

## 1. Backend simulation module — REAL, substantial (~7,500 LOC)

Path: `backend/src/simulation/` (built as Sprint 25 "World-Class Simulation").

- `simulation.module.ts` — imports PrismaModule; providers `SimulationService`, `AIRecommendationsService`.
- `simulation.service.ts` (1,004 LOC) — orchestrator; persists to Prisma; Decimal↔number via `toNumber()`. Methods: `getScenarios`, `getWhatIfPresets`, `getIndustryScenarios`, `startGame`, `getUserGames`, `getGameDetails`, `deleteGame`, `advanceMonth`, `makeDecision`, `getAvailableDecisions`, `respondToEvent`, `getPendingEvents`, `pauseGame`/`resumeGame`, `endGame`, `getLeaderboard`, `getUserStats`, `getAIRecommendations`, `getLearningPath`.
- `simulation.controller.ts` (325 LOC) — `@Controller('simulation')`, most endpoints `@Public()` (guest/demo, userId falls back to `'guest'`). Endpoints: scenarios, presets/what-if, presets/industry, games CRUD, `games/:id/advance`, `games/:id/decisions`, events respond/pending, pause/resume/end, leaderboard, stats, market-data. JWT-guarded: recommendations, learning-path.
- `business-logic.engine.ts` (697 LOC) — REAL financial engine: `calculateMonthlyRevenue/Expenses/CashFlow/HealthScores/EmployeeProductivity`, `processSimulationMonth`. Monthly-tick sim of cash, revenue, expenses, profit, receivables/payables, inventory, capacity/utilization, quality, morale, market share.
- `decision-matrix.ts` (1,747 LOC) — `DECISIONS` catalog + `applyDecision`. Includes EU funding decisions: `APPLY_PNRR`, `APPLY_AFIR`, `EU_GRANT_MANAGEMENT` (the ONLY funds/AFIR/PNRR logic in the codebase — modeled as simulator decisions, not a standalone module).
- `events.system.ts` (1,785 LOC) — `SIMULATION_EVENTS`, `triggerEvents`, `processEventResponse`.
- `achievements.system.ts` (630 LOC) — `ACHIEVEMENTS`, `checkAchievements`, `PLAYER_LEVELS` (XP/leveling within the sim).
- `romanian-market.model.ts` (232 LOC) — `ROMANIAN_MARKET_2025`: VAT rates (incl. 2025-08-01 change), contributions, corporate tax, minimum wage, industry margins.
- `company-data-import.ts` (601 LOC) — `WHAT_IF_PRESETS`, `INDUSTRY_SCENARIOS`; imports real company data to seed a sim.
- `ai-recommendations.service.ts` (439 LOC) — `AIRecommendationsService`; recs linked to LMS courses/lessons (`relatedCourseId`/`relatedLessonId`).

**Assessment:** Real, DB-backed simulation — not a stub. Minor placeholder estimates in `getAIRecommendations` (hardcoded `averageSalary: 5000`, `morale: 70`, etc.) when reconstructing engine state from persisted `SimulationState`.

## 2. Frontend simulation pages — mixed

Under `frontend/app/[locale]/`:
- `simulation/page.tsx` — REAL (lobby/dashboard; typed client `@/lib/api/simulation`).
- `simulation/[gameId]/page.tsx` — REAL (gameplay).
- `simulator/page.tsx` — MOCK prototype (`// Mock data for demonstration`, not wired). **Retire this.**
- API client `frontend/lib/api/simulation.ts` (451 LOC) — full typed wrapper.
- `dashboard/finance/vat-simulator/` — separate VAT-only calculator (unrelated to the game engine).

## 3. Gamification / LMS — real code, gamification is IN-MEMORY

- Backend LMS: `backend/src/lms/` — `lms.module/controller/service` (DB-backed courses); course-content services `mba-courses`, `excel-vba-courses`, `finance-ops-courses`, `pm-agile-courses`.
- `gamification.service.ts` — points, badges, tiered achievements, streaks (freeze), leaderboard, levels — but **in-memory Maps + EventEmitter2, NO Prisma persistence**. Not durable across restarts → **prime enhancement target**.
- `gamification-analytics.service.ts` — analytics.
- Prisma LMS models (persisted): `LMSCourse`, `LMSCourseModule`, `LMSLesson`, `LMSEnrollment`, `LMSLessonProgress`. NO Prisma models for Badge/Streak/Points/UserAchievement (confirms gamification non-persistent). Only persisted achievement model is `SimulationAchievement`.
- Frontend LMS: `dashboard/lms/` (page, goals, courses/[id], lessons). No dedicated badges/gamification page.
- Course seed: `backend/prisma/seed-data/courses-sprint25-*.ts`.

## 4. EU funds / grants / financing — NO standalone module (greenfield)

No `funds/`, `grants/`, or `financing/` module anywhere. AFIR/PNRR/EU-grant handling exists ONLY as simulator decisions (`decision-matrix.ts`) + text content in blog/forum/LMS/ask-grok/ai.service. **Opportunity for a new module.**

## 5. Sprint plan / backlog / roadmap docs (at repo root unless noted)

`SPRINT_BACKLOG.md` (111 KB, master), `PLATFORM_REVIEW_SPRINT_BACKLOG.md`, `SPRINT_18_PLAN.md`, `sprint-21-test-backlog.md`, `SPRINT-22-DASHBOARD-FUNCTIONALITY.md`, `SPRINT-23-BACKLOG.md`, `SPRINT-24-BACKLOG.md`, `IMPLEMENTATION_SPRINT_41.md`, `GROK_STRATEGY_SPRINT25.md`, `SIMULATION_MODULE_DESIGN.md`, `GROK_SIMULATION_ENHANCE_*.md`, `GROK_WORLDCLASS_SIMULATION_*.md`, gap/planning docs (`DASHBOARD_GAP_ANALYSIS.md`, `PLATFORM_GAP_ANALYSIS.md`, `PRODUCTION_LAUNCH_PLAN.md`, `SCRUM.md`), `frontend/app/[locale]/dashboard/roadmap/page.tsx`. New sprints append to `SPRINT_BACKLOG.md`.

## 6. Document-generation libraries installed

Backend: `exceljs` ^4.4.0, `pdfkit` ^0.17.2, `pdf-lib` ^1.17.1, `puppeteer` 24.34.0 (HTML→PDF). **NOT installed:** `xlsx`, `xlsx-populate`, `pptxgenjs`, `docx`, `handlebars`.
Frontend: `recharts` ^2.15.4. (Server-side generation lives in backend.)
→ PowerPoint (`pptxgenjs`) and formula-preserving Excel (`xlsx-populate`) are **new deps**.

## 7. Prisma conventions (schema at `backend/prisma/schema.prisma`, 3,017 lines)

- IDs `String @id @default(cuid())`; timestamps `createdAt/updatedAt`.
- Money `Decimal @db.Decimal(14,2)` (155 Decimal columns — strong convention).
- Scores/percentages `Float`; flexible payloads `Json?`; string arrays `String[] @default([])`.
- Scoping: `organizationId` (92×) for business modules; **the simulator is scoped by `userId` (+ optional `businessId`), NOT org.** Align new simulator models to `userId`/`businessId`.
- Sim enums: `SimulationStatus`, `SimulationDifficulty`, `SimDecisionCategory`, `SimEventType`, `SimEventSeverity`, `SimScenarioType`.
- Existing sim models (lines 2013–2167): `SimulationGame`, `SimulationState`, `SimulationDecision`, `SimulationEvent`, `SimulationAchievement`, `SimulationScenario`. `@@unique([gameId, month, year])` on state; cascade deletes; `@@index` on FKs.

### Capability summary
- Simulator backend: REAL, deep, DB-persisted, guest-accessible. Monthly tick.
- Simulator frontend: `simulation/` REAL; `simulator/` MOCK.
- LMS: REAL/DB-backed. Gamification: feature-rich but IN-MEMORY (top enhancement candidate).
- EU funds: greenfield.
- Doc-gen: exceljs + pdfkit + pdf-lib + puppeteer present; no PPTX/xlsx-populate.
