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
