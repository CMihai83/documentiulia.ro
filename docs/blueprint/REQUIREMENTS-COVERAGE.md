# Blueprint v3.1 → Implementation Coverage (recovered 2026-07-09)

Source of truth: `PLATFORM-BLUEPRINT-v3.1.html` (recovered from the claude.ai artifact of
2026-07-06 — it had never been committed; ALL future requirement documents must land in-repo).
Artifact URL: https://claude.ai/code/artifact/b0c9eddc-06bb-4736-9d25-2f4e10c59c16

## Horizon W — Work & Delivery Platform (§09) — LARGELY UNBUILT
The closed loop: match → contract auto-draft → **delivery workspace (dev container / shared VM /
GPU pod, RunPod-provisioned, compute pass-through)** → collaborate → milestone approval → escrow
release + e-Factura → income/tax tracked.
- DONE: matching (F-3), career/training/coaching (EXP epic), profiles (ATS/freelancer).
- NOT BUILT: gig board; **delivery workspaces (VMs)** w/ per-project isolation + teardown-wipe +
  EU residency + auto-stop/budget caps (premium tier only); contract auto-draft for gigs;
  milestones + escrow + payment release + auto e-Factura; compute pass-through billing.

## Other unbuilt blueprint requirements
- Financial consolidation (OneStream pillar; win-table "Horizon 2").
- Accountant-channel GTM: multi-client filing + white-label for firms (the declared #1 wedge).
- Horizon S: SOC 2 / ISO 27001 / pen-test track.
- Compute §05: local CPU models (Qwen2.5/bge-m3 via Ollama) for OCR/PII/embeddings; pgvector.
- Horizon E: governed self-evolution layer (CORAL/researchclaw; staged autonomy) — only AI-1 shipped.
- Horizons 3–5: DE/FR/ES, enterprise multi-entity, agentic close, predictive compliance.
- Process: risk-register review each sprint (AI-liability firewall, bus-factor, owners).

## Shipped since the blueprint (Jul 6–9)
S-41..S-46 Horizon-1 promotions · S-47 foundations · SIM (S-48/49/50) · BC (S-50/51/58/59/60) ·
FND (S-53/54) · EXP (S-55/56/57) · GDPR-A + GDPR-EXT MVP (S-61) · tier access control ·
live error logger. S-52 Grok advisor parked by user decision.

## Addendum (2026-07-09): missed items recovered from the Sprint Execution Plan artifact
Source: docs/blueprint/SPRINT-EXECUTION-PLAN-S41-46-W0.html

### W-0 — Free-Tools Funnel (~22 pts) — ENTIRELY UNBUILT (verified: no /tools pages)
- DOC-W0-1 public CUI/VAT validator + SEO page /[locale]/tools/verificare-cui (AnafLookupService backend EXISTS from DOC-44-4 — only the public page is missing)
- DOC-W0-2 public VAT calculator (date-aware 21/11/9, reverse-charge, shareable URL)
- DOC-W0-3 net↔gross salary calculator (CAS 25/CASS 10/impozit 10 + deduction)
- DOC-W0-4 FREE invoice + e-Factura UBL 2.1 XML generator (capped anonymous 3/mo, signup CTA)
- DOC-W0-5 public SAF-T/e-Factura XML validator (the accountant-acquisition tool; no data stored)

### Other unbuilt/unverified from S-41..46 detail
- DOC-44-2 Stripe checkout + signed idempotent webhook + refund + auto e-Factura draft (blocked on keys)
- DOC-44-3 consultant-side portal (bookings/availability/deliverables/mark-complete) — no page found
- DOC-41-3 local LLM + embeddings baseline (qwen2.5 + bge-m3 + FastAPI embeddings + pgvector) — not wired
- Global DoD deltas: reversible-migration requirement (we ship additive-only, no down-migrations),
  staging environment (we deploy straight to prod), CI PR gate (workflow still uncommitted)

### Blueprint v3.1 non-roadmap sections (now mined; in-repo via PLATFORM-BLUEPRINT-v3.1.html)
- §08 GTM: accountant-channel wedge (multi-client filing + white-label), free-compliance/paid-control
  packaging, NRR >120% expansion model — product features unbuilt
- §11 KPI baselines: activation >40% signup→first-filing-in-7-days, WAU, 100% on-time filing guardrail,
  time-to-close −70%, NRR >120% — measurement not instrumented
- §10 Risk register w/ owners, reviewed every sprint — process not systematized
- §13 Governance: expert vetoes (tax ◆, security ◆) — followed informally, not enforced tooling
