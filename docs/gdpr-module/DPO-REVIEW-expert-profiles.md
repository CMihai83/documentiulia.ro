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
