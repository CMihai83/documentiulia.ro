# AGENT 1: Funding & Finance Trees
**Task ID**: AGENT-1-FUNDING
**Dependencies**: None (can start immediately)
**Estimated Time**: 30-40 minutes
**Output**: Migration file 017_funding_trees.sql

---

## YOUR MISSION

Create 4 comprehensive decision trees about funding and finance for Romanian businesses.

**IMPORTANT**: Mark this task as DONE when you finish by updating `/var/www/documentiulia.ro/AGENT_COORDINATION.md` - change status from "in_progress" to "completed" for AGENT-1.

---

## CONTEXT

You are working on the Documentiulia platform - a comprehensive business education platform for Romanian entrepreneurs. The platform already has:

- 10 existing decision trees (check `/var/www/documentiulia.ro/database/migrations/010-012_*.sql` for reference)
- Database schema with tables: `decision_trees`, `decision_nodes`, `decision_paths`, `decision_answers`, `decision_tree_update_points`, `legislation_variables`
- All content must be in **Romanian language**
- Use **RON (lei)** for all financial examples
- Reference **Codul Fiscal**, **OUG**, **HG** where applicable

---

## DATABASE SCHEMA REFERENCE

```sql
-- decision_trees table
CREATE TABLE decision_trees (
  id SERIAL PRIMARY KEY,
  tree_key VARCHAR(100) UNIQUE NOT NULL,
  tree_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Use CTE pattern for clean SQL:
WITH t AS (
  INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, priority)
  VALUES ('eu_grants', 'Fonduri Europene & Granturi', 'Ghid complet...', 'finance', 'euro', 11)
  RETURNING id
)
-- Then insert nodes, paths, answers referencing t.id
```

---

## TREES TO CREATE

### Tree 1: EU Grants & Fonduri Europene
**tree_key**: `eu_grants`
**tree_name**: `Fonduri Europene & Granturi UE`

**Decision Flow**:
1. **Node 1**: Ce tip de business ai?
   - Startup (nou, sub 2 ani)
   - Companie existentă (peste 2 ani)
   - ONG / Asociație

2. **Node 2**: Ce domeniu de activitate?
   - Producție / Manufacturing
   - IT / Tehnologie / Inovare
   - Agricultură / Rural
   - Servicii / Comerț
   - Turism / HoReCa

3. **Terminal Answers** (one per combination, at least 3 comprehensive answers):
   - Startup IT → **POR / PNDR pentru start-up inovator**
   - Companie existentă Producție → **Modernizare echipamente / Eficiență energetică**
   - Agricultură → **PNDR - Fonduri pentru agricultură și dezvoltare rurală**

**Answer Content Requirements** (1500-2000 words each):
- Program details (POR, PNDR, POCU, etc.)
- Eligibility criteria (praguri venit, vechime, angajați)
- Funding amounts (minimum/maximum în RON)
- Application procedure step-by-step
- Required documents checklist
- Deadlines and timeline (sesiuni de finanțare)
- Success rate statistics
- Consultant recommendations (when to hire specialist)
- Practical example with RON calculations
- Next steps (actionable checklist)

---

### Tree 2: Angel Investors vs Venture Capital
**tree_key**: `angel_vs_vc`
**tree_name**: `Angel Investors vs Venture Capital`

**Decision Flow**:
1. **Node 1**: Cât capital cauți?
   - Sub 100.000 EUR
   - 100.000 - 500.000 EUR
   - Peste 500.000 EUR

2. **Node 2**: În ce stadiu e business-ul?
   - Pre-revenue (doar idee/prototip)
   - Primii clienți (revenue sub 100k EUR/an)
   - Traction (revenue peste 100k EUR/an)

3. **Terminal Answers**:
   - Sub 100k + Pre-revenue → **Angel Investors (70k-100k EUR typical)**
   - 100-500k + Traction → **Seed VC sau Angel Syndicate**
   - Peste 500k + Traction → **Series A Venture Capital**

**Answer Content**:
- Equity dilution recommendations (10-25% pentru angel, 20-30% pentru VC)
- Valuation methods for Romanian startups
- Term sheet basics (liquidation preference, anti-dilution, vesting)
- Where to find angels/VCs în România (Seed Blink, How to Web, accelerators)
- Pitch deck requirements
- Due diligence process timeline
- Legal costs (10k-30k RON pentru lawyer)
- Practical example: "Cum să evaluezi dacă 20% equity pentru 200k EUR e fair deal"

---

### Tree 3: Crowdfunding (Equity vs Reward-based)
**tree_key**: `crowdfunding`
**tree_name**: `Crowdfunding - Equity vs Reward-based`

**Decision Flow**:
1. **Node 1**: Ce tip de produs/serviciu ai?
   - Produs fizic (gadget, îmbrăcăminte, food)
   - Software / App / SaaS
   - Serviciu / Experience
   - Social cause / ONG

2. **Node 2**: Cât capital cauți?
   - Sub 50.000 EUR
   - 50.000 - 200.000 EUR
   - Peste 200.000 EUR

3. **Terminal Answers**:
   - Produs fizic + Sub 50k → **Reward-based (Kickstarter-style)**
   - Software + 50-200k → **Equity crowdfunding (SeedBlink România)**
   - Peste 200k → **Equity crowdfunding cu lead investor**

**Answer Content**:
- Platforme în România (SeedBlink pentru equity, Kickstarter/Indiegogo pentru reward)
- CSSF regulations pentru equity crowdfunding în România
- Campaign structure (video, rewards tiers, milestones)
- Marketing strategy (pre-launch list building, PR, ads budget 10-20% of goal)
- Fees (5-7% platform fee + 3% payment processing)
- Legal requirements (prospectus pentru equity)
- Timeline (30-60 zile campanie)
- Success rates (doar 30-40% campaigns reach goal)
- Practical example cu RON calculations

---

### Tree 4: Bank Loan vs Leasing vs Renting
**tree_key**: `financing_options`
**tree_name**: `Credit Bancar vs Leasing vs Închiriere`

**Decision Flow**:
1. **Node 1**: Ce tip de activ vrei să achiziționezi?
   - Vehicul (mașină, camion, utilaj)
   - Echipament (IT, producție, mobilier)
   - Spațiu comercial (birou, depozit, magazin)

2. **Node 2**: Cât timp planifici să folosești acest activ?
   - Peste 5 ani (lung termen)
   - 2-5 ani (mediu termen)
   - Sub 2 ani (scurt termen)

3. **Terminal Answers**:
   - Orice activ + Peste 5 ani → **Credit Bancar (ownership + depreciere)**
   - Vehicul/Echipament + 2-5 ani → **Leasing Operațional/Financiar**
   - Orice + Sub 2 ani → **Închiriere (rent)**

**Answer Content**:
- Total cost comparison cu exemple RON (vehicul 100.000 RON pe 5 ani)
- Deductibilitate fiscală (dobândă credit vs rată leasing vs chirie)
- Avans requirements (30% credit, 10-20% leasing, 0% închiriere)
- Garanții cerute (ipotecă, gaj, garanție personală)
- Proceduri aplicare (documente necesare, timeline aprobare)
- ROBOR impact pe credite (6-8% dobândă în 2025)
- Leasing Financiar vs Operațional differences
- Practical example cu calculations (cost net după economie fiscală)

---

## UPDATE POINTS TO CREATE

For each tree, add 2-4 update points:

```sql
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'eu_grants')
INSERT INTO decision_tree_update_points (
  tree_id, update_category, data_point_name, current_value, value_source,
  update_frequency, next_verification_due, criticality, auto_updateable
)
SELECT t.id, 'deadline', 'Sesiuni finanțare POR 2024-2025', 'Aprilie 2025', 'Ministerul Fondurilor Europene',
  'monthly', CURRENT_DATE + INTERVAL '30 days', 'high', false
FROM t;
```

---

## OUTPUT FILE

Create file: `/var/www/documentiulia.ro/database/migrations/017_funding_trees.sql`

**File structure**:
```sql
BEGIN;

-- Tree 1: EU Grants
WITH t AS (...) INSERT INTO decision_trees ...;
WITH n1 AS (...) INSERT INTO decision_nodes ...;
-- ... all nodes, paths, answers

-- Tree 2: Angel vs VC
WITH t AS (...) INSERT INTO decision_trees ...;
-- ...

-- Tree 3: Crowdfunding
-- ...

-- Tree 4: Bank Loan vs Leasing
-- ...

-- Update points for all 4 trees
-- ...

COMMIT;
```

---

## EXECUTION INSTRUCTIONS

After creating the migration file:

```bash
# Test the migration
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f /var/www/documentiulia.ro/database/migrations/017_funding_trees.sql

# Verify trees created
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT COUNT(*) FROM decision_trees WHERE tree_key IN ('eu_grants', 'angel_vs_vc', 'crowdfunding', 'financing_options');"

# Should return: 4
```

---

## MARK TASK COMPLETE

When done, update `/var/www/documentiulia.ro/AGENT_COORDINATION.md`:

Change:
```
- **AGENT-1** (Funding & Finance): in_progress
```

To:
```
- **AGENT-1** (Funding & Finance): ✅ completed (4 trees created in migration 017)
```

---

## QUALITY CHECKLIST

Before marking done, verify:

- ✅ All 4 trees use correct schema (tree_key, tree_name, description, category, icon, priority)
- ✅ Each tree has 2-3 decision nodes minimum
- ✅ Each tree has at least 3 comprehensive terminal answers (1500-2000 words HTML)
- ✅ All content in Romanian language
- ✅ Practical examples with RON amounts
- ✅ Legislation references (Codul Fiscal, OUG, etc.)
- ✅ Next steps checklist in each answer
- ✅ Update points created for each tree
- ✅ Migration executes without errors
- ✅ Total trees in DB = 14 (10 original + 4 new)

---

**START IMMEDIATELY - No dependencies, you can begin now!**
