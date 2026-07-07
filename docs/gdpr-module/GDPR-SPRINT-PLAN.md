# GDPR Module — Sprint Plan (two tracks: internal compliance + external service)

**Status:** Draft for review. **Date:** 2026-07-07. **Research:** `docs/gdpr-module/research/01..03`.

Two distinct products share one engine:
- **GDPR-INT** — DocumentIulia's OWN compliance. Some stories are **legal obligations with hard deadlines**, not features. Ship first.
- **GDPR-EXT** — GDPR tooling sold to customers (they are controllers who need it). Revenue + moat.

**Already shipped (security hotfix, PR #22):** GDPR endpoint identity now derives from the JWT (was a client `?userId=` — a broken-access-control vuln letting any user export/erase another's data); secrets stripped from the Art-20 export. This was pulled forward from GDPR-INT because it was an active vulnerability.

**Architectural spine:** the **RoPA is the central data model** — notices, retention, DPAs, TIAs, DPIAs all link back to it. For an ERP this is a gift: the RoPA seeds from payroll/CRM/vendor/document data already held.

---

## ⚠️ Cross-cutting finding that changes existing scope
The **F-3 ATS + freelancer matcher (shipped in S-47) is EU-AI-Act Annex III high-risk** (recruitment/selection). DocumentIulia is the *provider*. And the **S-48 simulator must NOT be trained on real tenant financials** without specific written per-controller authorisation (Art 28(10) role-flip). These are folded in as **GI-AI** stories below and flagged on the Horizon-2 plan.

---

## Track A — GDPR-INT (own compliance)

### Epic GI-SEC — Security baseline (Art 32) · MUST
| ID | Story | AC | SP |
|---|---|---|---|
| GI-SEC-1 | Wire the unused `EncryptionService` + durable key store (KMS/DB-sealed, not in-memory) | keys survive restart; rotation works | 8 |
| GI-SEC-2 | Encrypt PII at rest — CNP, IBAN/bankAccount, mfaSecret, salary (field-level) | grep proves no plaintext CNP/IBAN in DB | 8 |
| GI-SEC-3 | Encrypted, off-box backups + tested restore drills (logs = Art 32(1)(d) evidence) | backups `.enc`; restore drill logged | 5 |
| GI-SEC-4 | Postgres RLS hardening (txn-scoped SET LOCAL, pooler reset, no BYPASSRLS) + Redis namespace isolation doc + **cross-tenant leak test in CI** | leak test passes | 8 |
| GI-SEC-5 | MFA enforced for admin/accountant roles; privileged + DB-access audit logging | admin login requires MFA | 5 |

### Epic GI-AUDIT — Immutable accountability · MUST
| GI-AUDIT-1 | Make `AuditLog` append-only + hash-chained at the persisted layer (port the in-memory `compliance-logging` chain to Prisma) | tamper detectable; survives restart | 8 |

### Epic GI-DSR — Fix erasure & export semantics · MUST
| GI-DSR-1 | Erasure → **anonymize/restrict** (Art 18 archive tier) instead of hard-delete; never delete the audit trail; respect legal holds | retention-bound records restricted, not deleted | 8 |
| GI-DSR-2 | Complete the export (Partners/Contracts/ATS/freelancer) + `scheduled_deletions` table so the 30-day grace deletion actually runs | export complete; grace deletion executes | 5 |
| GI-DSR-3 | Consent unification — mount the cookie banner, persist to the `Consent` table (not localStorage), retire the stub `getConsentLog`/`recordConsent` | cookie consent server-side + auditable | 5 |

### Epic GI-RET — Retention engine · MUST
| GI-RET-1 | Configurable retention (5y docs/registers/payroll, 10y financial statements, 75y personnel, asset-life, litigation hold) computed from the **1-July-of-following-year anchor**; add `deletedAt`/`anonymizedAt`/`retentionExpiresAt` columns | per-type periods enforced + holds | 8 |

### Epic GI-GOV — Governance artefacts · MUST
| GI-GOV-1 | Customer-facing **Art 28 DPA** (8 clauses, specific security level, sub-processor annex, DSR-assist, 24–48h breach window) | DPA covers 28(3)(a)–(h) | 5 |
| GI-GOV-2 | **RoPA** Art 30(1)+(2) generated from ERP data (per-tenant processor register) | both records produced | 8 |
| GI-GOV-3 | **DPO** appointment + ANSPDCP registration + documented analysis | DPO registered | 3 |
| GI-GOV-4 | Sub-processor register + active change-notification (email/subscription, location/function/safeguards) + Stripe-as-independent-controller disclosure | EDPB fn54 satisfied | 5 |

### Epic GI-BREACH — Incident response · MUST
| GI-BREACH-1 | Breach runbook + register — awareness-timestamp, ENISA SE scoring, processor→controller→ANSPDCP chain, Art 33(5) register-all, ANSPDCP Decision 128/2018 portal draft | 72h workflow + register live | 8 |

### Epic GI-AI — AI-Act & transfer compliance · MUST (deadline-driven)
| GI-AI-1 | **xAI transfer package** — route personal-data prompts through **ZDR endpoint**, PII redaction-before-send, xAI DPA (SCC M3) + TIA | no non-ZDR PII to xAI | 8 |
| GI-AI-2 | **Art 28(10) guard** — block simulator/analytics training on tenant data without specific written per-controller authorisation; default anonymised/synthetic | no tenant PII in training absent authorisation | 5 |
| GI-AI-3 | **Art 50 transparency** (live 2 Aug 2026) — chatbot discloses it's AI; mark AI-generated content (Llama3 articles/courses) | disclosure + content marking shipped | 3 |
| GI-AI-4 | **ATS high-risk readiness** (provider) — human-in-the-loop on match-scores (Art 22 + C-634/21), decision logging, bias testing, technical docs; deployer worker-notification templates. *Target 2 Dec 2027 — verify OJ; fall back 2 Aug 2026.* | readiness plan + human-override on scores | 8 |
| GI-AI-5 | Law 190/2018 CNP branching (legal-obligation vs legit-interest → auto DPO+retention+training) + gate timesheet monitoring behind Art 5 (5 conditions, 30-day cap) | CNP LIAs + monitoring gates enforced | 5 |

---

## Track B — GDPR-EXT (sold to customers) · multi-tenant, needs `organizationId` + a data-subject model
The `Consent`/`DSRRequest` models are single-tenant today — Track B's foundation is a multi-tenant data-subject schema.

| Epic | Stories | MoSCoW |
|---|---|---|
| **GE-CMP** Consent Management | cookie scanner + prior-blocking script; banner (equal-prominence reject, RO/EN, geo); immutable proof-of-consent; **IAB TCF v2.3**; Google Consent Mode v2 | Must |
| **GE-DSAR** DSAR portal (multi-tenant) | branded intake; proportionate tiered ID verification; 1-month clock; cross-module discovery; machine-readable export; real erasure incl. backups; audit trail (meter DSAR volume) | Must |
| **GE-ROPA** RoPA + retention | seed from tenant ERP; per-industry templates; controller **and** processor configs (accountant); retention engine w/ RO 5y defaults | Must |
| **GE-DPIA** DPIA | WP248 + **ANSPDCP Decision 174/2018** screening; risk matrix; **Art 5 employee-monitoring wizard** (5 gates + 30-day cap); Art 36 export | Should |
| **GE-BREACH** Breach + incident | 72h countdown; ENISA scoring; ANSPDCP Decision 128/2018 auto-draft; Art 33(5) register; **combined NIS2/DNSC 24h+72h track** | Must |
| **GE-POLICY** Policy/notice generator | clause library RO/EN from RoPA; layered notices; employee notices; auto-update on legal change (reuse ANAF-monitoring engine); versioning | Must |
| **GE-VENDOR** Vendor/processor | register linked to RoPA; Art 28 DPA (2021/915) gen; sub-processor list + objection; transfer SCC 2021/914 modules; TIA questionnaire; DPF-lookup + SCC fallback | Should |
| **GE-CNP** CNP compliance pack (RO differentiator) | detect legit-interest CNP → force DPO + retention + training (Law 190/2018 Art 4) | Must |
| **GE-TRAIN** GDPR training | **reuse the existing LMS** — role-based micro-courses, quizzes, certs, annual re-assignment, completion evidence | Should |
| **GE-DPO** DPO marketplace | partner DPO firms, 15% rev-share, ANSPDCP DPO-form automation, conflict screening — **via a separate legal entity** (Berlin €525k / X-FAB conflict) + counsel sign-off | Could |
| **GE-DATA-ACT** Cloud-switching + full export | EU Data Act switching clauses + full-account export (doubles as Art 20) | Should |
| **Cross-cutting** Liability ToS | informational-only, no guarantee, AS-IS, 12-month cap, indemnity + Smartlaw "no individual case assessment"; lawyer-reviewed templates via partner cabinet (Legea 51/1995) | Must |

**Packaging:** Gratuit (banner + 1 auto policy + basic RoPA) · Pro 49 RON (branding removal, TCF/Consent Mode, DSAR w/ deadline tracking, full RoPA, LMS training) · Business 149 RON (DPIA, breach + ANSPDCP, vendor/DPA/SCC, CNP pack — **undercuts GDPR Register ~10x**) · DPO marketplace add-on.

---

## Suggested sprint sequencing (interleaved with Horizon-2)
- **GDPR-A (compliance blockers, do ASAP):** GI-SEC-1/2 (encryption at rest), GI-AI-1 (xAI ZDR), GI-AI-2 (role-flip guard), GI-DSR-1 (erasure semantics), GI-AUDIT-1 — legal exposure is live now.
- **GDPR-B:** GI-RET-1, GI-GOV-1/2/3/4, GI-BREACH-1, GI-SEC-3/4/5, GI-AI-3/5.
- **GDPR-C (external MVP):** GE-CMP + GE-POLICY + GE-ROPA (the SMB wedge: banner + policy + RoPA) on the multi-tenant schema.
- **GDPR-D:** GE-DSAR, GE-DPIA, GE-BREACH, GE-CNP.
- **GDPR-E:** GE-VENDOR, GE-TRAIN, GE-DPO, GE-DATA-ACT, GI-AI-4.

**Feature-flag (proposed, not law):** Digital Omnibus (breach 72h→96h, cookies→GDPR, RoPA <750). **Verify before shipping:** live ANSPDCP portal fields, IAB CMP fee, DPF appeal (C-703/25 P), AI-Act OJ publication.
