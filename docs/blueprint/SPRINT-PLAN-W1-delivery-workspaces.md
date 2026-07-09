# Sprint W-1 — Delivery Workspaces (the VM module) · Horizon W

**Recovered requirement:** REQ-003 / Blueprint §09 "Delivery workspaces" (W-3 in the blueprint,
run as our W-1). Per-project **dev container / shared VM / GPU pod** where client + freelancers
build together, closing the loop: match → contract → **workspace provisioned** → collaborate →
deliver → milestone approved → **escrow release + e-Factura** → income/tax tracked.
**Capacity:** ~29 SP. **Depends on:** W-0 merged; reuses `ExpertEngagement` (marketplace), the
consulting/booking + invoice/e-Factura + audit-chain modules.

## Honest scope boundary (READ FIRST)
This env has **no RunPod key and cannot provision live pods**, and running arbitrary customer code
carries real isolation/IP risk (blueprint flags a **security-engineer ◆ veto**). Therefore W-1
ships the **orchestration, lifecycle, billing and delivery layer** — fully testable — behind a
**driver abstraction**, NOT live GPU provisioning:
- `WorkspaceDriver` interface: `provision(spec) / status(id) / stop(id) / destroy(id) / connectInfo(id)`.
- **MockDriver** (deterministic, default in tests) + **LocalDockerDriver** (real `docker run` of a
  sandboxed dev container on the host, resource-capped) — proves the loop end-to-end today.
- **RunPodDriver** implemented against `runpodctl`/REST but **gated behind `RUNPOD_API_KEY`**; if
  unset it registers as unavailable and the API returns a clear "GPU pods not configured" — never a
  fake pod. Real GPU provisioning + the security review are an explicit follow-up (W-1.5).
- **NOTHING runs customer code unsandboxed.** Local driver: no host mounts, dropped caps,
  `--network` restricted, CPU/mem/pids limits, read-only rootfs where possible, auto-stop timer.

## Stories
### W1-1 — Workspace domain + driver abstraction · 8 SP · MUST
- Prisma (additive, offline migration): `Workspace` (orgId, engagementId?, kind
  dev_container|vm|gpu_pod, driver, status requested|provisioning|running|stopped|destroyed|error,
  spec Json, connectInfo Json?, budgetCapEur, spentEur, autoStopMinutes, lastActiveAt, createdBy),
  `WorkspaceEvent` (workspaceId, type, payload, at — immutable lifecycle log).
- `WorkspaceDriver` interface + `MockDriver` + `LocalDockerDriver` (sandbox flags above);
  `RunPodDriver` behind the key flag. A `WorkspaceService` that picks the driver by `kind`+config.
- **AC:** provision→running→stop→destroy lifecycle works on Mock and LocalDocker; every transition
  writes a WorkspaceEvent; LocalDocker container has the sandbox limits (assert the run args);
  RunPod unavailable without key returns a clear error, not a crash.

### W1-2 — Access, isolation & lifecycle guards · 5 SP · MUST (security ◆)
- Per-project isolation: only the engagement's client + assigned freelancer(s) can access a
  workspace (authz check on every workspace route); membership derived from `ExpertEngagement`.
- **Auto-stop** (idle > autoStopMinutes → stop; @Cron sweep) and **teardown wipes data**
  (destroy removes the container/volume; WorkspaceEvent records the wipe). Hard **budget cap**:
  when spentEur ≥ budgetCapEur → auto-stop + alert (the RunPod idle-cost lesson).
- **AC:** non-member gets 403; idle workspace auto-stops; destroy leaves no residual
  container/volume (assert); exceeding budget stops it; all consent/audit-logged.

### W1-3 — Delivery gate → escrow → e-Factura loop · 8 SP · MUST
- `Milestone` (engagementId, title, amountEur, status pending|submitted|approved|released,
  workspaceId?): freelancer submits deliverable (from the workspace) → client approves →
  **escrow release** (reuse the `ExpertEngagement.paymentStatus` placeholder: held→released;
  real charge still stubbed pending Stripe) → **auto-generate an e-Factura draft** via the existing
  invoice/e-Factura generator (RO_CIUS UBL 2.1) → income/tax tracked on the tenant.
- **AC:** submit→approve→release transitions gated to the right party; release produces an
  e-Factura draft record; nothing releases without approval; full audit trail; self-approval blocked.

### W1-4 — Workspace UI + billing meter · 5 SP · SHOULD
- Frontend `frontend/app/[locale]/dashboard/workspaces/**`: list, create (kind + budget +
  auto-stop), status/connect card (connectInfo), start/stop, live spend vs cap meter, milestone
  submit/approve panel, "compute is pass-through — coming soon for GPU" honest note. PRO-gated;
  sidebar link. RO/EN.
- **AC:** create→see status→stop from UI; spend meter + cap; milestone actions reflect state;
  GPU option shows the not-configured note when RunPod key absent.

### W1-5 — Pricing / pass-through billing model · 3 SP · SHOULD
- Pure `workspace-billing.logic.ts`: compute pass-through cost from driver usage
  (runtime × rate by kind) + platform fee %; write `spentEur` incrementally; feeds the cap.
  Deterministic + unit-tested. (Real metered charging waits on Stripe — placeholder ledger now.)
- **AC:** cost math hand-validated; fee applied; cap interaction correct.

## Out of scope (explicit follow-ups)
Live RunPod GPU provisioning + its security review (W-1.5, needs key + security-engineer sign-off);
real Stripe metered billing (blocked on keys); real-time collaborative editing / in-browser IDE
(a later workspace-v2); VNC/SSH gateway hardening beyond the driver's connectInfo.

## Definition of Done
tsc + nest build clean; `jest src/workspaces` green (lifecycle on Mock, sandbox-args assertion,
budget/auto-stop logic, billing math, milestone state machine) + existing suites untouched;
frontend build clean. Integration vs throwaway postgres: full provision→running→milestone
submit→approve→escrow release→e-Factura draft on the **Mock driver**; non-member 403; destroy
leaves no residue; RunPod-absent path returns the clear error. Additive migration only.
Independent verification (isolation + no-residual-on-destroy + no-release-without-approval are the
critical checks) before deploy. **Do NOT enable any live/paid provisioning.**
