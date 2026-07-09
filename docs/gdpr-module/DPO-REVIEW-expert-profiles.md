# DPO Review Required — Public Expert Profiles (EXP-10, S-56)

**Status: BLOCKED pending DPO review. `EXPERT_PROFILES_PUBLIC` stays unset/false in production.**

## What was built (S-56)
`ExpertProfile` aggregates a user's verified/assessed skills, issued credentials, peer-review
outcomes and simulator history into a profile card with a reputation score. A public route
(`GET /api/v1/expertise/experts/:userId`, unauthenticated) exists but is **double-gated**:

1. **User opt-in** — `isPublic` defaults `false`; the toggle is an explicit consent action,
   recorded on the hash-chained audit log (`expertise.profile.visibility`, consent:
   `explicit_opt_in` / `withdrawn`).
2. **`EXPERT_PROFILES_PUBLIC` env flag** — unset/false at deploy. With it off, the public route
   404s **even for opted-in users**.

## Data exposed IF both gates open (review scope)
- Headline + bio (user-authored), reputation score (derived),
- skills at `assessed`/`verified` tier (label + ESCO URI + proficiency),
- non-revoked credential names + public verify codes.
- NOT exposed: email, internal ids beyond the URL slug, activity timestamps, self-declared skills,
  peer-review contents, endorser identities.

## Points for the DPO
- **Lawful basis** for the public card: consent (Art. 6(1)(a)) via the opt-in; withdrawal is
  one click and takes effect immediately (gate 1 closes).
- **Art. 17**: existing GDPR erasure flow anonymises the user; verify whether issued VCs (which
  embed a hashed subject identifier only) need revocation-on-erasure — recommended: auto-revoke
  credentials on account erasure (follow-up task).
- Peer reviewers are anonymised by HMAC ref; reviewees never see reviewer identity.
- Credential verify endpoint is public by design but exposes only the credential JSON.
- URL uses the internal userId as the public slug — consider a random slug before go-live
  (recommendation, not a blocker while the flag is off).

## Go-live checklist
- [ ] DPO sign-off on the exposed field list above
- [ ] Random public slug instead of userId (recommended)
- [ ] Auto-revoke credentials on Art. 17 erasure
- [ ] Privacy-policy section for public profiles + credential verification
- [ ] Then set `EXPERT_PROFILES_PUBLIC=true`

## S-57 addendum — marketplace listing (separate lawful basis)

The expert-for-hire marketplace (S-57 EXP-12) is DISTINCT from the public profile above:

- **Audience:** authenticated PRO users only — never the public internet. The
  `EXPERT_PROFILES_PUBLIC` flag does NOT govern the marketplace and stays OFF.
- **Lawful basis:** consent (Art. 6(1)(a)) for the specific purpose of being listed
  to other authenticated users as available for hire. Captured via an explicit,
  withdrawable `marketplaceOptIn` toggle; both opt-in and withdrawal are logged to
  the hash-chained audit trail with the stated purpose.
- **Data exposed to other authenticated users on opt-in:** headline, reputation
  score, assessed/verified skill labels, credential count, hourly rate, session
  types. No email/CNP/contact data; contact happens through in-app bookings.
- **Client ratings** (1–5 on completed sessions) feed the expert's reputation
  score; the client's identity is visible to the expert on the engagement itself
  (contractual necessity for the booked session, Art. 6(1)(b)).
- **Payments:** none processed yet — `paymentStatus` is a placeholder; no financial
  data is collected by this feature until the Stripe integration ships.

Marketplace go-live does NOT require the public-profile flag; the consent gate above
is the control. DPO review of this addendum recommended before marketing pushes.

---

## S-62 addendum — GDPR-EXT MUST epics (DSAR / Breach / CNP / Liability)

- **DSAR portal**: public intake resolves the org from the URL slug only; the immutable
  `DsarEvent` trail covers the public step (data subjects have no user account, so the
  hash-chain audit — which FKs to User — covers only authenticated tenant actions).
- **Erasure is honest**: fiscal records are RESTRICTED (10y RO retention, Art 17(3)(b)),
  person records anonymized; an `ErasureLedger` row records the request + a backup-expiry
  date. We do NOT rewrite encrypted backups — the DSAR response text says so.
- **Breach**: ANSPDCP (Decision 128/2018) and Art 34 subject notifications are DRAFTS only;
  nothing auto-submits (integration asserts zero outbound HTTP in the breach path). The
  Art 33(5) register keeps non-notified incidents with their justification.
- **CNP (Law 190/2018 Art 4)**: legitimate-interest + CNP RoPA entries are blocked from
  going `active` server-side until DPO + retention + training + safeguards are all set.
- **Liability**: every generated artifact carries `lawyerReviewed:false` + the "nu constituie
  consultanță juridică" disclaimer; `LEGAL_TERMS` is versioned (AS-IS, 12-month cap).
- **Packaging enforced by TierGuard**: PRO = DSAR portal; BUSINESS = breach + CNP.
- **Still needed before go-live**: lawyer-reviewed ANSPDCP/DSAR templates; real backup-expiry
  automation; S-63 epics (DPIA, VENDOR/DPA/SCC, TRAIN, DATA-ACT, CMP hardening).

---

## S-63 GDPR-EXT Shoulds — DPO go-live notes (added 2026-07-09)

The Track-B "Should" epics are now implemented; before selling the Business/Pro tiers on them:
- **DPIA/DPA/TIA templates** are generated content marked `lawyerReviewed:false` — a partner-cabinet
  review is required (REQ-029) before customers rely on them.
- **TCF v2.3**: the TC-string codec + `__tcfapi` stub are spec-shaped but the CMP is **not IAB-registered**
  (`cmpId=0`, labelled "IAB registration pending"). IAB CMP registration is a separate business step.
- **DPF check** stores the vendor's self-claim + evidence link only — no automatic DPF-list scrape; the DPO
  verifies listing manually and SCC remains the recommended fallback.
- **Cookie scanner** is a static single-page fetch (signature match), not a headless-browser crawl.
- **Full export** excludes security material (passwords/MFA/tokens/CNP/IBAN) per the internal export rules.
- Nothing in DPIA/breach/vendor auto-submits to ANSPDCP — all outputs are drafts for manual filing.
