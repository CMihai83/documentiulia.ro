# Blueprint v3.1 — All Horizons & Sprints (extracted 2026-07-09)

Source: docs/blueprint/PLATFORM-BLUEPRINT-v3.1.html (§07 Delivery roadmap)

## HORIZON 0 — Ground Truth
*Aug 2026 · Sprint 41*

> Before building on 130 modules, find out which of them are real. No new features until the ground is mapped.

### S-41 — Module maturity audit + compute baseline
- **[Must]** Classify every module: production / stub / empty; publish a heatmap
- **[Must]** Verify backend boots clean + Swagger inventory of real endpoints
- **[Must]** Stand up local Qwen2.5 via Ollama; wire embeddings + RAG smoke test
- **[ANAF]** Audit live coverage of e-Factura B2C (already mandatory) & SAF-T
- └ *Foundation erp-architect · devops*


## HORIZON 1 — Foundation & Controlling
*Q3–Q4 2026 · Sprints 42–46*

> Ship management accounting, the advisory marketplace and productised migration on a verified compliance core.

### S-42 — Controlling core → production
- **[Must]** Promote PoC: persist CO model to Prisma, add tests
- **[Must]** CO-CCA + EC-PCA hierarchy & variance engine
- **[Should]** Cost elements mapped to RO class-6 accounts
- **[ANAF]** SAF-T D406 XSD validator refresh (monthly + quarterly)
- └ *Must≈21 erp-architect · financial-accountant*

### S-43 — CO-PA, internal orders, allocation
- **[Must]** Contribution-margin (CO-PA) by segment/product
- **[Must]** Internal orders + assessment/distribution cycles
- **[Should]** Post allocations as secondary CO entries
- **[ANAF]** Close any e-Factura B2C coverage gaps found in S-41
- └ *Must≈26 financial-accountant · erp-architect*

### S-44 — SAP/ERP consultancy marketplace
- **[Must]** Booking → Stripe → consultant portal flow
- **[Must]** 10 SAP/ERP service types live incl. fractional-CFO
- **[Could]** Consultant availability & calendar sync
- **[ANAF]** CIF/CUI validation hardening + rate-limit backoff
- └ *Must≈23 erp-architect · frontend*

### S-45 — Controlling cockpit (frontend)
- **[Must]** KPI cockpit + variance RAG dashboards (Recharts)
- **[Must]** Executive summary + alerts, RO/EN
- **[ANAF]** VAT 21/11/9-housing date-aware engine audit + tests
- └ *Must≈24 frontend · romanian-tax-specialist*

### S-46 — Data-migration studio
- **[Must]** SAGA import + field-mapping studio + dry-run validation
- **[Should]** Reconciliation report pre/post migration
- **[ANAF]** Migrated data re-validates against SAF-T schema
- └ *Must≈25 erp-architect · financial-accountant*


## HORIZON 2 — AI-Native & Consolidation
*Q1 2027 · Sprints 47–51*

> Turn data into decisions — consolidation (multi-sprint), a grounded copilot, and forecasting. GPU provisioned here.

### S-47/48 — Multi-entity consolidation (2 sprints)
- **[Must]** Group ledger + intercompany elimination
- **[Must]** Minority interest + multi-currency translation (CTA)
- **[ANAF]** Consolidated SAF-T submission chaining
- └ *Epic · re-scoped financial-accountant*

### S-49 — Grounded financial copilot GA
- **[Must]** RAG over ledger + docs; cites source postings
- **[Must]** Guardrails + mandatory "not tax advice" gate
- **[ANAF]** Answers grounded in current 21/11/9 rules
- └ *Must≈25 erp-architect · security*

### S-50 — Forecasting & anomaly
- **[Must]** Prophet cash-flow forecast w/ confidence bands
- **[Should]** Anomaly alerts into cockpit
- **[ANAF]** Deadline auto-alerts (D406, e-Factura)
- └ *Must≈22 ml · financial-accountant*

### S-51 — OCR & document intelligence
- **[Must]** Invoice extraction >95% RO formats (GPU fine-tune)
- **[Could]** Auto-posting suggestions, human-in-loop
- **[ANAF]** Extracted data → e-Factura UBL 2.1 draft
- └ *Must≈24 ml · erp-architect*


## HORIZON S — Security & Certification
*Parallel · Q1–Q2 2027*

> Runs alongside H2. Enterprises will not buy an unaudited financial system — this is a sales gate, not a nicety.

### S-SEC1 — SOC 2 Type II readiness
- **[Must]** Control mapping, access reviews, evidence automation
- **[Must]** External pen-test + remediation
- **[ANAF]** Audit-log immutability meets 10yr tax retention
- └ *Sales gate security-engineer ◆*

### S-SEC2 — ISO 27001 + GDPR hardening
- **[Must]** ISMS, encryption at rest/in transit, RBAC least-priv
- **[Should]** DPA templates + data-residency (EU) controls
- **[ANAF]** SPV credential vaulting + rotation
- └ *Sales gate security-engineer ◆*


## HORIZON 3 — Enterprise & Global
*Q2–Q3 2027 · Sprints 52–55*

> Cross the border: IFRS, multi-jurisdiction tax, and the SAP connector that lets us sit next to incumbents.

### S-52 — IFRS & multi-GAAP ledger
- **[Must]** Parallel ledgers (RO stat + IFRS)
- **[Should]** Automated GAAP adjustment postings
- **[ANAF]** Statutory ↔ IFRS reconciliation report
- └ *Must≈27 financial-accountant*

### S-53 — SAP connector
- **[Must]** OData/RFC bi-directional sync (FI/CO)
- **[Could]** S/4HANA migration templates
- **[ANAF]** Map SAP tax codes → RO VAT scheme
- └ *Must≈26 erp-architect · integration*

### S-54 — International tax packs
- **[Must]** EU VAT/OSS, reverse-charge auto-detect
- **[Should]** DE/FR/ES localisation packs
- **[ANAF]** Intrastat + VIES validation
- └ *Must≈25 romanian-tax-specialist*

### S-55 — e-Transport & logistics compliance
- **[Must]** e-Transport UIT generation + geo tracking
- **[Could]** Tachograph AI analysis
- **[ANAF]** e-Transport API submission + status poll
- └ *Must≈23 integration · operations*


## HORIZON E — Self-Evolution (governed R&D)
*Continuous · gated from Q4 2026*

> Runs as a firewalled side-track, never on the critical path. Autonomy earned in stages, never granted.

### E-1 — Gate 1 — read-only
- **[Must]** AutoResearchClaw regulatory radar → tax-specialist inbox
- **[Must]** Xagent ops sentinel: cost/perf/health reports
- **[ANAF]** Rule-change diffs ratified by human before use
- └ *No write access ml · security ◆*

### E-2 — Gate 2 — PR-proposing
- **[Must]** CORAL + EvoAgentX draft modules/tests as PRs only
- **[Must]** Fitness eval: tests+coverage+lint gate every PR
- **[ANAF]** Compliance-touching PRs auto-flagged for veto
- └ *Human merges erp-architect · security ◆*

### E-3 — Gate 3 — auto-merge-behind-tests
- **[Must]** Auto-merge only for non-statutory, fully-tested changes
- **[Should]** Nightly self-improvement loop w/ rollback
- **[ANAF]** Statutory path remains human-only, forever
- └ *Scoped autonomy full consortium ◆*


## HORIZON W — Work & Delivery Platform
*Parallel · tools now → marketplace H2 → workspaces H2–H3*

> The acquisition & retention engine: free tools pull members in, the marketplace puts them to work, delivery workspaces close the loop.

### W-0 — Free-tools funnel (now)
- **[Must]** CUI/VAT validator (free ANAF WS) + VAT/payroll calculators
- **[Must]** Free invoice + e-Factura XML generator (capped)
- **[ANAF]** SAF-T / e-Factura validator (lands accountants)
- └ *Top of funnel frontend · erp-architect*

### W-1 — Talent marketplace MVP
- **[Must]** Jobs/gigs + profiles (resume, availability, rates) — reuse ats/freelancer
- **[Must]** Matching v1: hard filters + local embeddings
- **[ANAF]** Gig accept → contract + e-Factura wiring
- └ *Finance niche first erp-architect · frontend*

### W-2 — Growth layer
- **[Must]** Career trajectory + LMS training recommendations
- **[Should]** Coaching booking (reuse consulting engine)
- **[ANAF]** Coach/training invoices via e-Factura
- └ *Retention / LTV ml · frontend*

### W-3 — Delivery workspaces
- **[Must]** v1 dev container + collaboration + delivery gate
- **[Should]** v2 GPU pod via RunPod (pass-through billing)
- **[ANAF]** Delivery approved → escrow release → e-Factura
- └ *Premium · security ◆ devops · security*


## HORIZON 4–5 — Autonomous Ops → Ecosystem & Scale
*H2 2027 → 2030*

> Agentic close, predictive compliance, self-serve integration hub; then marketplace, reseller/accountant network, EU expansion & 10k-concurrent scale.

### H4 — Autonomous operations
- **[Must]** Agentic month-end close (human approval gates)
- **[Must]** Predictive compliance calendar + escalations
- **[Should]** Self-serve integration hub; 1,000 concurrent <5%
- └ *Epic train ml · devops*

### H5 — Ecosystem & scale
- **[Must]** API platform GA + app marketplace (rev-share)
- **[Must]** Accountant reseller / white-label tiers
- **[Should]** EU compliance packs; 10,000 concurrent
- └ *Epic train developer · partners*


