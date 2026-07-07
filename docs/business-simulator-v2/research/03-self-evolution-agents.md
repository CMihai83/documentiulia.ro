# Research 03 — Self-Evolution & Autonomous-Research Agent Infrastructure

> Read-only inventory + integration assessment. No trading code was run; `/root/ai_xyz*`, `/root/florin*`, `/root/apex` untouched.

## Part 1 — Installed on this server

### CORAL — multi-agent self-evolution infrastructure ✅
- **Location:** `/root/CORAL/` (git; `github.com/Human-Agent-Society/CORAL`, arXiv 2604.01658). Copies also at `/root/apex/coral`, `/root/ai_xyz_v2/fisher-hft/coral_evolution` (trading — not inspected).
- **Stack:** Python 3.11+, Hatchling, `uv`. Deps: `pyyaml`, `omegaconf`, `httpx`, `litellm[proxy]`, `uvicorn`; optional Starlette UI, Docker, swebench.
- **CLI:** `coral` → `coral.cli:main`; ~17 commands (`init`, `validate`, `start -c task.yaml`, `stop`, `resume`, `status`, `log`, `eval`, `show`, `ui`, `heartbeat`…). Web dashboard `coral ui`.
- **Invocation:** `uv run coral start -c <task.yaml> agents.count=N agents.model=opus`, or import `coral.config.CoralConfig` + `coral.grader`. You supply a **codebase + grading script**; it spawns N coding agents (each own git worktree, shared `.coral/` state: attempts/notes/skills), eval-on-commit loop, leaderboard.
- **Capability:** The true self-evolution engine — competing agents iteratively modify code toward a measurable score, sharing learned "skills." Generic (any codebase + grader).

### AutoResearchClaw / researchclaw — autonomous research agent ✅
- **Location:** `/root/AutoResearchClaw/` (git; `github.com/aiming-lab/AutoResearchClaw`). **Pip-installed globally** as `researchclaw 0.3.1` (`/usr/local/bin/researchclaw`).
- **Stack:** Python 3.11+, Hatchling. Deps: `pyyaml`, `rich`, `arxiv`, `numpy`; optional `scholarly`, `crawl4ai`, `tavily`, `PyMuPDF`, matplotlib/scipy. Sub-packages `researchclaw`, `sibyl`, `arc`. ACP-compatible; OpenClaw + MCP bridges.
- **CLI:** `researchclaw` → `.cli:main`; `run` (23-stage pipeline), `init`, `setup`, `doctor`, `validate`, `report`, **`serve`/`dashboard`**, **`mcp`**, **`trends`**, `skills`, `calendar`, HITL `attach/status/approve/reject/guide`.
- **Invocation:** `researchclaw run --config config.arc.yaml --topic "..." --auto-approve` (or `--mode co-pilot`); Python API; HTTP via `serve`; MCP.
- **Capability:** Topic → full cited research artifact; pulls real literature (OpenAlex/Semantic Scholar/arXiv), sandboxed experiments, self-heals, multi-agent peer review, citation verification (anti-hallucination). Self-learning `evolution/` lessons loop (MetaClaw). **Strongest fit for automated business-case research.**

### Xagent — trading & scouting agent ✅ (DOCS ONLY — not run)
- **Location:** `/root/Xagent/`. **Trading-oriented — not executed.**
- **Stack:** Python (`.venv`). Deps: `ccxt`, `pandas`, `openai` (xAI/Grok), `tavily`, `ddgs`, `snscrape`/`twscrape`, `vaderSentiment`, `rich`, `tenacity`. Grok Live Search data source.
- **CLI:** `python -m xagent <usecase>` — `breakout-curator`, `sentiment-pulse`, `social-alpha`, `chat`. Thin tool-calling LLM loop + pluggable `tools/`/`usecases/`; cron-schedulable.
- **Capability:** Scans Bitget futures + X/Reddit for crypto edges. **Trading-only as shipped — NOT applicable.** Reusable *pattern* only: "scan feeds → score → alert."

### Bonus: Feynman installed locally
- `/root/.feynman/` (agent runtime; skills incl. `autoresearch`; npm-global; sessions) — public repo #5 present as a running install.

## Part 2 — Public repos (integration candidates; not cloned)

| Repo | Purpose | Offers | Stack/License |
|---|---|---|---|
| **NousResearch/hermes-agent** | Self-improving personal agent | Skill learning loop; cron curator grades/consolidates skills; ~18-platform gateway; MCP; model-agnostic | Python / MIT |
| **EvoAgentX/EvoAgentX** | Self-evolving agentic **workflows** | From one prompt auto-builds multi-agent workflows; iterative optimization/evaluation; memory; HITL; LiteLLM | Python / MIT (~3.1k★) |
| **lamm-mit/scienceclaw** | Decentralized autonomous scientific discovery (MIT LAMM) | 300+ scientific skills; artifact/provenance DAG (computational lineage); provenance-aware governance | Python / **Apache-2.0** (~232★) |
| **cosmicstack-labs/mercury-agent** | "Soul-driven" 24/7 personal agent | 31 tools, Kanban, skills; SQLite "Second Brain" persistent memory + full-text search + auto fact extraction; hardened shell; token budgets | TypeScript / MIT (~2.9k★) |
| **getcompanion-ai/feynman** | Open-source research agent (also at `/root/.feynman`) | Source-grounded cited briefs; multi-agent parallel deep research; lit reviews; paper-vs-code audits; every claim → source URL | TypeScript / MIT (~8.2k★) |

(★ counts are soft — verify.)

## Part 3 — Integration recommendations for the Business Simulator

Three hooks: (a) autonomous refresh of market-events + EU-funds/grants data, (b) self-evolving scenarios & difficulty, (c) automated business-case research.

**Server-side (prefer — already installed):**
- **CORAL → (b).** Point at the scenario-generation module with a grader ("scenarios realistic, ANAF-compliant, hit target difficulty distribution / player win-rate"); competing agents evolve scenario logic + difficulty curves, bank reusable skills. Not for (a)/(c) (evolves code, not data).
- **researchclaw → (c), strong for (a).** Expose via `serve`/`mcp`, call from NestJS to auto-generate cited business-case briefs and, via OpenAlex/web/`trends` + `calendar` (repurpose for ANAF/EU deadlines) + citation verification, produce scheduled market-event + EU-funds/PNRR/AFIR reports. `evolution/` loop improves scenario research over time (feeds b).
- **Xagent → TRADING-ONLY, not applicable.** Do not wire crypto usecases. Reuse only its scout *pattern* for an "ANAF/EU-funds/news → score → alert" job.

**Public repos:**
- **EvoAgentX → (b)** lighter alt/complement to CORAL (generate + optimize scenario workflows); also orchestration for (a)/(c).
- **Feynman → (c)** (already installed) — multi-agent deep research with per-claim source URLs = defensible cited business cases; web/paper search supports (a). Ignore GPU experiment-replication.
- **hermes-agent → (a)** always-on scheduled refresh (cron curator + skills), ops alerts.
- **mercury-agent → (a)** where persistent structured memory matters (SQLite Second Brain, Kanban for grants/deadlines/events).
- **scienceclaw → (c)** only if audit-grade provenance becomes a hard requirement (artifact-lineage DAG maps to ANAF/GDPR audit trails). Lowest priority; heavy scientific tooling overkill.

**Bottom line:** lean on **CORAL** (self-evolving scenarios/difficulty) + **researchclaw**/**Feynman** (cited business-case research + market/EU-funds refresh). **Xagent = trading-only/not applicable** (borrow pattern only). Best public adds: **EvoAgentX** + **Feynman**; Hermes/Mercury optional; ScienceClaw niche.

Key paths: `/root/CORAL/`, `/root/AutoResearchClaw/` + `/usr/local/bin/researchclaw`, `/root/Xagent/` (inspected only), `/root/.feynman/`.
