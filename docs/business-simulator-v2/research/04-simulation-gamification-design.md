# Research 04 — Business Simulation Engine: Design Spec

A serious "run-your-business" simulation that teaches day-to-day decision-making, grounded in the user's real ERP financials.

## Design north-star
Proven serious sims share one loop: **decide → advance time → see consequences → reflect → decide again**. Capsim = 8 rounds (1 year each) + mid-game "Case Modules"; SimVenture Evolution = 40 quarters (10 yr) tracking money/time/morale/skills/sustainability + rewind; MonsoonSIM = 13+ interconnected departments rippling in real time; GoVenture = explicit lever trade-offs.

Core teaching insight (Sterman Beer Game): people run **open-loop, event-based mental models** — ignore feedback, underweight delays, misread stocks vs flows (players generate 10× optimal costs purely from delay misperception). **The pedagogical value is deliberately engineering delays and feedback loops** so the "daily grind" visibly costs the player their strategy.

## 1. Decision cadence / time model

**Three-tier tick engine:**
- **Daily (operational):** approve PO, chase overdue invoice, authorize overtime, discount to close a sale. Cheap individually; consume the scarce **Attention/Focus budget**.
- **Weekly (tactical):** staffing, pricing tweaks, marketing spend, reorder points.
- **Monthly/Quarterly (strategic):** hire/fire, capacity investment, debt, new market/product, big campaigns.

Each login advances one+ ticks. Compress so **one strategic quarter ≈ one 5–10 min session**, a fiscal year plays over ~2–4 weeks real-life → many short sessions.

**The Attention/Focus budget (the mechanic that teaches strategic drift):** fixed Focus pool per tick (e.g. 5). Fire-fighting spends Focus; strategic work (planning, delegation, process improvement) spends Focus but pays back later. Spend every tick fire-fighting → never fund strategic loops → 3 months later compounding shows flat growth/eroding margin. Forces **opportunity cost** onto every screen. **Delegation** is the release valve: hire/train or enable ERP automation to auto-resolve classes of daily decisions (e.g. auto-approve POs < X RON) → frees Focus, but costs cash + small error rate.

**"Decision today, consequence in 3 months" — DeferredEffect / delay queues:**
```
DeferredEffect { id, source_decision, resolve_at_tick, target_state,
                 fn(state) -> delta, description, visible_hint }
```
Examples: hire engineer → salary now, productivity after 8-week ramp; cut marketing → sales dip 6–12 weeks later; defer maintenance → hidden breakdown probability manifests weeks later. Surface via a **"Pending Consequences" ledger** + calendar so players *can* anticipate → think in loops, not events.

**Save/resume & compounding:** fully server-side state (Postgres row per `sim_run`, Redis hot state); sim = versioned state advanced by pure `applyTick(state, decisions) -> state'`. Growth applies multiplicatively per tick → small sustained edges compound over 40+ ticks. **Rewind/branch** (snapshot each strategic tick); cap rewinds or mark rewound runs "practice, not scored" to preserve stakes.

**Sprint stories (engine):** pure `applyTick` reducer w/ tick_type∈{day,week,month}; DeferredEffect queue; Focus budget + delegation-to-automation sinks; snapshot/rewind + practice/scored flag; calendar integration surfacing pending consequences + deadlines.

## 2. Market cycles & events

**Layered perturbation model:**
```
effective_demand = base_demand × macro_cycle(t) × seasonality(t) × trend(t)
                   × Σ active_event_modifiers + noise(σ)
```
- **Macro cycle** — finite-state machine `EXPANSION → PEAK → RECESSION → TROUGH → RECOVERY` with stochastic dwell times (not a gameable sine). Each state sets multipliers on demand, credit/interest, input costs, hiring market.
- **Seasonality** — per-industry 12-month vector; seed from the user's real monthly revenue (§5).

**Discrete event system — data-driven table (designers/Grok author rows, not code):**
```
Event { id, title, category (supply|competitor|regulatory|demand|hr|fx|finance),
        trigger { type: random|scripted|conditional, base_prob_per_tick, conditions[] },
        choices [ { label, cost, effects[], deferred_effects[] } ],
        modifiers [ {target_kpi, mult/add, duration_ticks} ],
        weight_by_cycle {EXPANSION,RECESSION,...}, cooldown_ticks }
```
Seed catalog: supply shock (↑prob in recession), new competitor (when market share >30%), VAT/tax change (scripted date — Legea 141 19→21%), demand spike (viral/tender win), key employee quits (↑prob when morale<40), FX move (random walk), interest-rate hike (tied to macro FSM), ANAF audit / D406 deadline (scripted monthly).

**Probability design (avoid "RNG feels unfair"):** telegraph bad events 1–2 ticks early → reward preparedness (buffers/insurance/diversification), not luck; conditional triggers for teaching moments (competitor enters when you're fat/complacent — punishes drift); cap simultaneous events; cooldowns; scale severity to player size (setback not wipeout).

**Sprint stories (events):** macro-cycle FSM + per-state multipliers; seasonality vector per industry; data-driven Event table + trigger evaluator each tick; telegraph/hint system; Grok event generator constrained to schema.

## 3. State model (KPIs + propagation)

- **Stocks** (accumulate): cash, inventory_units, receivables, payables, debt, equity, fixed_capacity, headcount, backlog_orders, customer_base, brand_equity, cumulative_reputation.
- **Flows** (per-tick rates): revenue, COGS, opex, marketing_spend, hires/attrition, production_rate, order_inflow, cash_in/out, interest_expense.
- **Auxiliaries** (0–1/0–100 indices): morale, productivity, service_quality, price_index, market_share, utilization, churn_rate.

**Five core feedback loops (system-dynamics heart), coupled difference equations per tick:**
1. **R1 growth (reinforcing):** marketing → brand_equity → customer_inflow → revenue → reinvest → marketing (compounds).
2. **B1 capacity/backlog (balancing):** orders → backlog; backlog>capacity → lead_time↑ → churn↑ → orders↓ (Beer Game lesson).
3. **R2/B2 morale/productivity:** overtime → output↑ but morale↓ → productivity↓ → attrition↑ → capacity↓ (delayed — overwork feels free at first).
4. **Price/margin/volume:** price↑ → margin↑ but volume↓ (demand elasticity).
5. **B3 cash/solvency guardrail:** negative cash → forced borrow at penalty rate → interest drag → death spiral (fail state).

**Propagation example:** "Cut price 10% this week" → price_index↓ → (now) margin↓ → (delay 2–4 ticks) demand↑ → order_inflow↑ → backlog↑ → if backlog>capacity: lead_time↑ → churn↑ (delay) → brand_equity↓ (slow). Net cash positive short-term, negative by tick 12 — exactly "consequences 3 months later."

Keep math **transparent and tunable** — every coefficient in a `sim_params` config seeded per industry (§5), not hardcoded. Log every KPI each tick to `sim_timeseries` for Recharts evolution + after-action review (the essential reflection step).

**Sprint stories (state):** stock/flow/aux schema + difference-equation update; the 5 loops w/ tunable coefficients; elasticity + delayed propagation via DeferredEffect; sim_timeseries logging + Recharts KPI dashboard; solvency guardrail + fail/turnaround states.

## 4. Gamification (reinforce learning, don't trivialize)

**Octalysis 8 core drives** — weight the White Hat / intrinsic drives: Development & Accomplishment (score, levels, mastery badges), Empowerment/Feedback (the sim itself — many valid strategies, instant feedback), Epic Meaning (narrative "save the family firm through the recession"). Use Black Hat (Scarcity/Unpredictability/Loss-avoidance) **sparingly** (streaks, event risk) — it causes burnout.

**Self-Determination Theory** — design for autonomy (multiple viable strategies, player-set goals), competence (difficulty ramps, scaffolding), relatedness (opt-in leaderboards/co-op). Beware overjustification effect + competition undermining motivation → leaderboards opt-in, reward *learning behaviors*.

**Concrete mechanics:**
- **Score = weighted KPI basket** (profitability + solvency + growth + resilience[survived events] + compliance) — prevents single-number gaming.
- **XP/levels = maturity tiers** (Lemonade → Kiosk → Full firm), unlock modules/decisions as competence grows.
- **Missions = scenario challenges** tied to learning goals ("survive a recession without layoffs", "pass D406 while scaling", "recover from a supply shock").
- **Achievements = behavioral** ("delegated 3 operational decisions to free strategic focus", "built a 3-month cash buffer before the downturn") — rewards the habit to teach.
- **Streaks = light habit hook** (Fogg B=MAP; gentle, freeze tokens).
- **Narrative feedback** = in-sim Grok "advisor" explaining *why* KPIs moved, naming the feedback loop (the reflection step).
- **Leaderboards** = opt-in, segmented by industry/size, rank on composite + resilience.

**Sprint stories (gamify):** composite score; maturity-tier XP/levels; mission/scenario engine + behavioral achievements; gentle streaks w/ freeze tokens + daily prompt; Grok advisor post-tick explanations; opt-in segmented leaderboard.

## 5. Grounding in real ERP data (the differentiator)

No generic sim owns the user's real financials.

**A. Seed & calibrate** — on start, a calibration job reads tenant data and fits `sim_params` + initial stocks: initial state = latest balance sheet + P&L (cash/receivables/payables/debt/inventory/headcount); baseline flows = trailing-12-month averages (revenue run-rate, COGS %, opex, avg invoice, DSO → receivables delay, churn); seasonality = normalized real monthly revenue over 2–3 yr; margins from real COGS; customer/market state = real count/concentration; **compliance calendar = real ANAF deadlines (D406 monthly, e-Factura 5-day) become scripted in-sim events**. Store versioned `sim_calibration`. Respect **GDPR**: runs within tenant boundary, no cross-tenant leakage, anonymize before benchmark/leaderboard.

**B. Two modes** — **Mirror mode** (digital twin: sim tracks the real business 1:1; what-if overlays as branches) and **Scenario mode** (abstracted firm calibrated to their industry — safe skill-building).

**C. Sim insights → real decisions** — promote robustly-better sim findings to ERP recommendations (with confidence); **Monte-Carlo stress-test their real budget** 500× → "P10/P50/P90 cash; 12% chance of covenant breach in a recession"; feed pending consequences + deadlines to calendar/alerts; coach the gap between sim and real decisions.

**Sprint stories (grounding):** read tenant P&L/BS/customers → initial stocks + baseline flows; seasonality vector from real revenue history; ANAF deadlines → scripted events; mirror vs scenario mode; Monte-Carlo stress test of real budget → P10/P50/P90 + risk flags; promote robust findings to ERP recommendations + calendar; tenant-boundary isolation + anonymized benchmarks.

## Architecture (NestJS/Python/Next.js)
- `sim-engine` (NestJS): `applyTick` reducer, DeferredEffect queue, Focus budget, snapshot/rewind; Postgres (`sim_run`, `sim_state`, `sim_timeseries`, `sim_calibration`) + Redis hot state.
- `sim-events`: macro FSM + seasonality + JSON event table + trigger evaluator.
- `sim-state`: difference-equation model w/ 5 loops, tunable `sim_params`.
- `sim-gamify`: scoring, XP, missions, achievements, streaks, leaderboard.
- AI (Python/Grok): advisor explanations, schema-constrained event authoring, Monte-Carlo, calibration fitting.
- Frontend (Next.js/Recharts): tick dashboard, KPI evolution charts, decision screens with explicit trade-offs, pending-consequences ledger, calendar.

## Guardrails
1. Build delays + feedback loops on purpose (Sterman). 2. Every decision screen shows an explicit trade-off + opportunity cost (Focus). 3. Telegraph bad events; reward preparedness. 4. Score a KPI basket, not profit; behavioral achievements. 5. Lean White-Hat/intrinsic (Octalysis+SDT); opt-in competition. 6. Many short sessions via save/resume + rewind.

## Sources
[Capsim](https://www.capsim.com/business-simulations/features) · [SimVenture Evolution](https://simventure.com/products/evolution/) · [MonsoonSIM](https://www.monsoonsim.com/) · [GoVenture](https://www.goventure.net/post/user-guide) · [Sterman/Beer Game](https://www.eolss.net/sample-chapters/c15/E6-63-01-02.pdf) · [System dynamics](https://umbrex.com/resources/frameworks/organization-frameworks/system-dynamics-feedback-loop-models/) · [Octalysis](https://yukaichou.com/gamification-examples/octalysis-gamification-framework/) · [SDT in gamification](https://link.springer.com/article/10.1007/s11528-024-00968-9) · [Fogg Behavior Model](https://www.behaviormodel.org/) · [Virtonomics](https://en.wikipedia.org/wiki/Virtonomics)
