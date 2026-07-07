# Transfer Impact Assessment — xAI (Grok) LLM API

**Transfer:** DocumentIulia.ro (processor, in the EU/Romania) → xAI, LLC (sub-processor, United States).
**Basis:** SCC Module 3 (processor → sub-processor), per Implementing Decision 2021/914.
**Framework:** EDPB Recommendations 01/2020, six steps. **Status:** implemented in code (GI-AI-1); ⚠️ contract + ZDR items are operational actions for the DPO/ops to confirm before relying on this TIA.

## Step 1 — Map the transfer
- **Data exported:** natural-language prompts and RAG company context sent to `api.x.ai/v1/chat/completions`, and the model's responses.
- **Categories (before mitigation):** could include CNP, IBAN, email, phone, and business figures drawn from tenant accounting/HR data.
- **Data subjects:** the tenant's employees, customers, contacts.
- **Frequency:** per user AI query (on demand).
- **Onward transfers:** xAI's own infrastructure/sub-processors (US).

## Step 2 — Identify the transfer tool
SCC Module 3 (processor→sub-processor), incorporated by xAI's Data Processing Addendum. **xAI is NOT certified under the EU-US Data Privacy Framework**, so the DPF adequacy route is unavailable — SCCs + supplementary measures are required.

## Step 3 — Assess the law/practice of the destination (US)
US surveillance law (FISA 702, EO 12333) can compel electronic-communications service providers. The EU-US DPF exists (adequacy) but xAI is not on the list, and the DPF itself is under CJEU appeal (C-703/25 P) and post-*Slaughter* repeal pressure — so we do **not** rely on it. Residual government-access risk is therefore treated as material and mitigated at the data level (Step 4).

## Step 4 — Supplementary measures (the load-bearing controls)
1. **Pseudonymisation before export (implemented — `pii-redaction.service.ts`).** CNP (checksum-validated), IBAN, email and RO phone numbers are replaced with per-request placeholders before any prompt leaves; the response is re-hydrated for the user only. The map is never persisted. → Reduces the exported data's identifiability in xAI's hands (supported by CJEU C-413/23 P's contextual test).
   - **Limitation:** free-text person names and postal addresses are **not** detected (name matching is too error-prone to be safe). This is why measure (2) is also required, not optional.
2. **Zero-Data-Retention (operational — must be confirmed).** xAI offers ZDR (deletion within ~1 hour, no training on API data). ZDR is an **account/enterprise-level** setting, not a per-request header on the standard API. The code exposes `AI_ZDR_CONFIRMED`: while it is not `true`, **redaction is forced on every call regardless of the debug flag**, so we never depend on retention promises we haven't verified. → **Action: confirm ZDR is enabled on the signed xAI account, then set `AI_ZDR_CONFIRMED=true`.**
3. **No-training warranty (contractual — must be confirmed).** xAI's Enterprise ToS warrant no training on API data and no personal data except via ZDR. → **Action: confirm these clauses in the signed contract; store a copy.**
4. **Local minimisation.** `aIQuery` rows store the **pseudonymised** prompt/response, so no raw PII is retained in our own database either.

## Step 5 — Procedural steps
- SCC Module 3 executed as part of the xAI DPA; keep on file with the sub-processor register.
- `AI_ZDR_CONFIRMED` and `AI_PII_REDACTION` documented in the ops runbook; redaction is on by default and cannot be silently disabled while ZDR is unconfirmed.

## Step 6 — Re-evaluate
- Re-assess on: any change to xAI's terms/ZDR offering, the outcome of DPF appeal C-703/25 P, or a change in US surveillance law. **Cadence: at least annually, and on any sub-processor-material change.**

## Residual risk (honest)
With redaction forced + ZDR confirmed + no-training warranty, residual risk is **low but not zero** — undetected free-text names/addresses remain the main gap, and government-access risk is mitigated (not eliminated) by pseudonymisation. Do **not** send special-category data (health, etc.) to the API pending a dedicated assessment. Per-tenant opt-in for AI features is recommended for the controller-side (own-user) processing.
