# Sprint S-52 — Grok Advisor (simulator coaching + Business-Case narrative)

**Epic:** SIM + BC (AI advisory layer) · **Horizon-2 order:** SIM → BC → FND → EXP
**Duration:** 2026-07-08 → 2026-07-22 · **Capacity:** 29 SP (tech-debt 20%)
**Builds on:** S-50 SIM-12 (deferred "Grok advice per 5 ticks"), S-51 BC-107 (deferred
deliverable narrative). Basis: `docs/business-simulator-v2/research/03-self-evolution-agents.md`.

## Goal
Add an AI advisor that coaches simulator players on their KPI trajectory and writes the
narrative sections of the SOC/OBC/FBC deliverable — reusing the existing Grok plumbing and
routing every payload through the PII-redaction guard, with a deterministic fallback so the
advisor NEVER blocks a tick or a deliverable when the model is unavailable.

## Reuse (do NOT rebuild — these already exist)
- `GrokConversationService.processQuery(query, userId, locale, companyContext)` (`backend/src/ai/`)
  — already talks to x.ai (`api.x.ai/v1`, model in `modelName`) and already redacts unless
  `AI_ZDR_CONFIRMED=true`. Wrap it; do not create a new xAI client.
- `PiiRedactionService`: `redact(input)→{text,map,counts}`, `rehydrate(text,map)`, `hasPii(counts)`.
- `DataUseGuardService`: `isTrainingAllowed(orgId)`, `scrubForCalibration(data)`.
- `AuditChainService` (GI-AUDIT-1) for the audit trail.
- Sim v2 `POST runs/:id/advance` (S-48), BC-107 handlebars deliverable (`bc.deliverable.ts`).

## Compliance stance (settled earlier this program)
Advisor = **service delivery to the tenant** (like S-49 mirror-mode calibration), so it does
NOT require training authorization. The relevant control for sending data to xAI (a US
sub-processor) is **PII redaction (GI-AI-1)** — redact BEFORE the call, rehydrate placeholders
only in the response shown to the same tenant. Never send raw CNP/IBAN/names/emails.

## Stories

### ADV-1 — Advisor core service + deterministic fallback · 8 SP · MUST
- `backend/src/ai/advisor.service.ts`: `advise(kind, context, {userId, orgId, locale})` →
  structured `{ summary, risks[], recommendations[], confidence, source: 'grok'|'fallback' }`.
- Redact `context` via `PiiRedactionService` before building the prompt; rehydrate the response.
- **Graceful fallback (MANDATORY):** if `XAI_API_KEY` is unset/test-key, the call errors, times
  out (>8s), or returns malformed JSON → return a **deterministic rule-based** advice object
  (`source:'fallback'`), never throw. Feature flag `ADVISOR_ENABLED` (default on; off → always fallback).
- **AC:** unit tests with a mocked Grok client for success + each failure mode all return a valid
  object; fallback path asserts NO network call; redaction asserted (no raw PII in the outbound prompt).

### ADV-2 — Simulator coaching (SIM-12 deferred) · 8 SP · MUST
- `GET simulation/v2/runs/:id/advice` — builds context from the run's KPI trajectory + pending
  consequences + telegraphed events, calls `advise('sim-coaching', …)`. **On-demand, never blocks
  the tick.** Cache per `run:id:tick` in Redis (TTL 1h); recompute when the tick advances.
- Frontend: an "Advisor" panel on the sim-v2 dashboard — summary + top risks + next-move
  recommendations + a confidence chip and an "AI-generated · verify" disclaimer. RO/EN.
- **AC:** advice returned within budget; identical tick → cache hit (no second model call);
  advancing invalidates; panel renders fallback gracefully when `ADVISOR_ENABLED=false`.

### ADV-3 — BC deliverable narrative (S-51 BC-107 deferred) · 8 SP · MUST
- Generate the executive-summary + strategic-case narrative from assumptions + BC-104/105 results
  via `advise('bc-narrative', …)`, injected into the handlebars deliverable (SOC/OBC/FBC).
- **Deterministic fallback template** (facts-only prose from the numbers) when AI off/unavailable,
  so the deliverable is always complete.
- **AC:** deliverable includes an AI-or-fallback narrative section; fallback produces coherent
  numeric prose; PII redacted before any xAI call; narrative depth scales with maturity.

### ADV-4 — Guardrails: audit, rate-limit, disclaimer · 5 SP · SHOULD
- Every advisor call → `AuditChainService` entry: prompt hash, redacted-PII counts, model,
  latency, `source`, tokens. Per-tier rate limit (reuse the RateLimit guard). Response always
  carries `confidence` + an `aiGenerated:true` disclaimer flag the UI must show.
- **AC:** audit entry per call (verifiable in the chain); over-limit → 429; disclaimer present on
  every advisor response; a runbook note in `docs/gdpr-module` on the xAI sub-processor + redaction.

## Out of scope
Self-evolution/auto-feature agents (research 03 later phases); fine-tuning; FND/EXP epics.
Keep the advisor read-only advice — it never mutates sim state or BC assumptions.

## Definition of Done
tsc + `nest build` clean; `npx jest src/ai src/simulation src/business-case` green; frontend build
clean; integration vs throwaway `postgres:15-alpine` + a MOCKED Grok client: coaching cache
hit/miss, fallback-when-disabled produces valid advice with zero network calls, deliverable
narrative present in both AI and fallback modes, audit entry written per call, PII never leaves
raw. One migration only if a new model is needed (prefer none). Independent verification before deploy.
