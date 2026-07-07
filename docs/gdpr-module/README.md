# GDPR Module — Research + Sprint Plan (two tracks)

Deep research (codebase + regulatory + market) and a two-track sprint plan for a full GDPR module: **internal compliance** (DocumentIulia's own obligations, some are hard-deadline legal duties) and **external GDPR-as-a-service** (tooling sold to customers). Draft for review.

## The plan
- [GDPR-SPRINT-PLAN.md](./GDPR-SPRINT-PLAN.md) — Track A (GDPR-INT) + Track B (GDPR-EXT), epics/stories/MoSCoW/SP, sequencing, packaging.

## Research (evidence base)
| # | Doc | Covers |
|---|---|---|
| 01 | [Codebase inventory](./research/01-codebase-inventory.md) | Existing gdpr module (~70% real), audit/security/backup gaps, PII models, frontend, the 2 vulns (now hotfixed) |
| 02 | [External GDPaaS market](./research/02-external-gdpaas-market.md) | OneTrust/Osano/iubenda/Cookiebot pricing, feature set, Romania (ANSPDCP, Law 190/2018), packaging, liability, AI Act/TCF v2.3 |
| 03 | [Internal compliance](./research/03-internal-compliance.md) | Dual controller/processor role, Art 28 + sub-processors (xAI/DPF), 10→5yr RO retention, AI Act Annex III (ATS = high-risk), Art 32 security, breach runbook |

## Two review artifacts
- **External** — GDPR-as-a-Service blueprint (the sellable product)
- **Internal** — DocumentIulia's own compliance blueprint (obligations + gaps)

## Already shipped
Security hotfix (PR #22): JWT-derived identity on all GDPR endpoints + secrets stripped from export — pulled forward because it was an active broken-access-control vulnerability.

Generated from 3 parallel research agents + a codebase inventory on 2026-07-07.
