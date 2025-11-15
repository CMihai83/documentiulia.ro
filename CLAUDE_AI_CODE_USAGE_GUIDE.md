# How to Use https://claude.ai/code for Parallel Decision Tree Creation
## Step-by-Step Guide to Maximize Your $991 Credit

**Goal**: Create 20 decision trees in 2-3 hours using parallel agents (vs 2-3 days sequential)

---

## 🚀 STEP 1: Access Claude.ai/code

1. Go to **https://claude.ai/code** in your browser
2. Sign in with your Anthropic account (same one with $991 credit)
3. Verify your credit balance shows **$991** (or close to it)

---

## 🔗 STEP 2: Connect GitHub Repository

1. Click **"Connect Repository"** or **"New Project"**
2. Authorize GitHub access if prompted
3. Select repository: **documentiulia**
4. Choose branch: **main** (or your working branch)
5. Set working directory: `/var/www/documentiulia.ro`

**This allows Claude to**:
- Read your existing code/database schema
- Create files directly in your repo
- Make automated commits
- Push changes to GitHub

---

## 📋 STEP 3: Prepare Task Definitions

Create **5 separate tasks** (one for each parallel agent). Copy these prompts:

### **AGENT 1: Funding & Finance Trees (4 trees)**

```
Create 4 decision trees for Romanian businesses about funding and finance. Use the existing database schema from /var/www/documentiulia.ro/database/migrations/*.sql files as reference.

Trees to create in migration file 017_funding_trees.sql:

1. EU Grants & Fonduri Europene
   - Which EU program matches my business? (POR, PNDR, POCU, etc.)
   - Am I eligible for EU funding?
   - What are the steps to apply?
   - Comprehensive answers with application procedures, deadlines, required documents

2. Angel Investors vs Venture Capital
   - How much equity should I give up?
   - At what business stage should I seek each type?
   - What do they expect in return?
   - Term sheet basics explained

3. Crowdfunding (Equity vs Reward-based)
   - Which crowdfunding type fits my business?
   - Legal requirements in Romania (CSSF rules)
   - Platform comparison (SeedBlink, Kickstarter equivalents)
   - Marketing campaign tips for success

4. Bank Loans vs Leasing vs Renting
   - Best option for equipment/vehicle financing
   - Total cost comparison with RON examples
   - Deductibility implications (Codul Fiscal)
   - Application procedures and documents needed

Requirements:
- Use schema: decision_trees (tree_key, tree_name, description, category, icon, priority)
- Create decision_nodes with proper foreign keys
- Create decision_paths linking nodes
- Create decision_answers with comprehensive HTML content (1500-2000 words each)
- Add decision_tree_update_points for each tree (link to legislation variables where applicable)
- Use Romanian language for all content
- Include practical examples with RON amounts
- Reference Codul Fiscal, OUG, HG where applicable
- Follow the same pattern as existing trees in migrations 010-012

After creating the migration file, execute it against the database to verify it works.
```

---

### **AGENT 2: Growth & Scaling Trees (4 trees)**

```
Create 4 decision trees for Romanian businesses about growth and scaling. Use existing schema as reference.

Trees to create in migration file 018_growth_trees.sql:

1. Export - First Steps (Cum să exporți)
   - Which countries are easiest to export to? (EU vs non-EU)
   - Intrastat vs customs procedures
   - VAT implications for exports
   - EORI registration process

2. Franchising (Deschide franciză vs Creează franciză)
   - Should I buy a franchise or create one?
   - Franchise contracts explained (Romanian legal requirements)
   - Cost breakdown (initial fee, royalties, marketing fee)
   - Success rates and risks

3. Scaling Team (10 → 50 → 100 employees)
   - When to hire HR manager vs outsource?
   - Organizational structure evolution
   - Payroll systems (SalariuOK, Salarium, SAP)
   - Legal compliance at each growth stage (ITM inspections)

4. Multi-Location Expansion
   - Own vs franchise vs partner locations
   - Operational systems needed (inventory, POS, accounting)
   - Legal structure (sucursale vs sedii secundare vs separate SRLs)
   - Cash flow management for multi-location

Requirements: Same as Agent 1 (Romanian language, HTML content, 1500-2000 words, Codul Fiscal references, practical RON examples)
```

---

### **AGENT 3: Operational Trees (4 trees)**

```
Create 4 decision trees for Romanian businesses about operational topics.

Trees to create in migration file 019_operational_trees.sql:

1. Business Licenses & Permits (Autorizații necesare)
   - Which licenses does my business type need?
   - ANPC, DSP, ISU, Garda de Mediu requirements
   - Application procedures and timelines
   - Costs and renewal schedules

2. Contract Types (B2B, B2C, B2G)
   - What contract clauses are mandatory? (Romanian Civil Code)
   - Payment terms best practices (30, 60, 90 days)
   - Penalty clauses and guarantees
   - Template recommendations

3. Insurance (What insurance do I need?)
   - Mandatory vs optional insurance by business type
   - RCA, CASCO, insurance profesională, property insurance
   - Cost estimates by industry
   - Claims procedures

4. Intellectual Property (Trademark, Patent, Copyright)
   - What can I protect and how? (OSIM procedures)
   - Trademark registration step-by-step
   - Costs (OSIM fees + lawyer fees)
   - International protection (Madrid Protocol)

Requirements: Same as previous agents (Romanian, HTML, 1500-2000 words, legislation references, RON examples)
```

---

### **AGENT 4: Industry-Specific Trees (4 trees)**

```
Create 4 decision trees for specific Romanian industries.

Trees to create in migration file 020_industry_trees.sql:

1. E-commerce Setup (Magazin online de la zero)
   - Hosted (Shopify) vs Self-hosted (WooCommerce, Magento)
   - Legal requirements (terms & conditions, GDPR, return policy)
   - Payment gateway comparison (Netopia, PayU, Stripe)
   - Logistics partners (Fan Courier, DPD, Cargus, Sameday)

2. HoReCa Specific (Restaurant/Cafe/Bar)
   - Licenses needed (sanitary authorization, alcohol license, ANPC)
   - POS and fiscal equipment (casa de marcat, e-factura)
   - Supplier contracts and food safety (HACCP)
   - Staffing requirements (chef, waiters, dishwashers)

3. Construction Business Specific
   - ANRE registration for construction companies
   - Work permits and building permits
   - Subcontractor contracts
   - Liability insurance and warranties

4. IT/Software Business Specific
   - Microîntreprindere vs Profit tax for IT services
   - Contracts with foreign clients (B2B invoicing, VAT reverse charge)
   - Freelancer vs Employee vs Contractor classification
   - Open-source licensing and IP ownership

Requirements: Same pattern (Romanian, HTML, 1500-2000 words, industry-specific examples with RON)
```

---

### **AGENT 5: Crisis Management Trees (4 trees)**

```
Create 4 decision trees for businesses facing crises.

Trees to create in migration file 021_crisis_trees.sql:

1. Insolvency (When and how to file)
   - Pre-insolvency vs insolvency vs bankruptcy differences
   - Ad-hoc mandate vs reorganization plan
   - Creditor protection and procedures
   - Timeline and costs

2. Business Restructuring
   - When to restructure vs when to close?
   - Debt renegotiation strategies
   - Staff reduction procedures (concedieri colective)
   - Asset sales and liquidation

3. Selling Your Business (Exit strategy)
   - Business valuation methods (multiples, DCF)
   - Finding buyers (strategic vs financial)
   - Due diligence preparation
   - Tax implications of sale (dividend vs asset sale)

4. Closing Company Properly (Radierea SRL)
   - Voluntary vs mandatory dissolution
   - ONRC procedures step-by-step
   - Final tax declarations (D101, D112, D300, D394)
   - Timeline (6-12 months for proper closure)

Requirements: Same pattern (Romanian, HTML, 1500-2000 words, legal references, procedures)
```

---

## ⚡ STEP 4: Launch Parallel Agents

**In Claude.ai/code interface:**

1. Click **"New Chat"** or **"New Task"** 5 times (creates 5 separate agent windows)
2. Paste **Agent 1 prompt** into Chat 1 → Press Enter
3. Paste **Agent 2 prompt** into Chat 2 → Press Enter
4. Paste **Agent 3 prompt** into Chat 3 → Press Enter
5. Paste **Agent 4 prompt** into Chat 4 → Press Enter
6. Paste **Agent 5 prompt** into Chat 5 → Press Enter

**All 5 agents will work simultaneously!**

---

## 👀 STEP 5: Monitor Progress

Watch each agent:
- Create migration files (017-021)
- Generate SQL with decision trees, nodes, paths, answers
- Execute migrations against database
- Report success/errors

**Typical timeline**:
- Agent starts: 0 minutes
- Migration file created: 15-20 minutes per agent
- Database execution: 22-25 minutes per agent
- All done: **~30 minutes total** (vs 10+ hours sequential!)

---

## ✅ STEP 6: Verify Results

After all agents complete:

```bash
# SSH to your server
ssh root@95.216.112.59

# Check total decision trees
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT COUNT(*) FROM decision_trees;"

# Should show 30 trees (10 original + 20 new)

# Check migration files created
ls -la /var/www/documentiulia.ro/database/migrations/01[7-9]_*.sql
ls -la /var/www/documentiulia.ro/database/migrations/02[0-1]_*.sql
```

---

## 🔄 STEP 7: Review and Commit to GitHub

If agents didn't auto-commit:

```bash
cd /var/www/documentiulia.ro
git status
git add database/migrations/017_*.sql
git add database/migrations/018_*.sql
git add database/migrations/019_*.sql
git add database/migrations/020_*.sql
git add database/migrations/021_*.sql

git commit -m "Add 20 decision trees via claude.ai/code parallel agents

- Funding & Finance (4 trees)
- Growth & Scaling (4 trees)
- Operational (4 trees)
- Industry-Specific (4 trees)
- Crisis Management (4 trees)

Total: 30 trees in database (10 + 20 new)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

---

## 💰 Budget Usage Estimation

**Each agent (4 trees)**:
- Complexity: High (comprehensive content, SQL generation, execution)
- Estimated cost: ~$40/agent
- **Total for 5 agents**: ~$200

**Remaining credit after 20 trees**: $991 - $200 = $791

---

## 🎯 What to Do After 20 Trees Are Created

With 30 total trees (10 + 20 new), you'll have:

### Coverage:
- ✅ Fiscal (TVA, Micro, Profit tax, Dividends)
- ✅ Legal (PFA vs SRL, GDPR, Contracts, IP)
- ✅ HR (Hiring, Termination, Scaling teams)
- ✅ Funding (Loans, Leasing, EU Grants, Investors, Crowdfunding)
- ✅ Growth (Export, Franchising, Multi-location)
- ✅ Operational (Licenses, Insurance)
- ✅ Industry (E-commerce, HoReCa, Construction, IT)
- ✅ Crisis (Insolvency, Restructuring, Selling, Closing)

### Next Priorities (use remaining $791):
1. **Frontend pages** ($200):
   - Decision tree catalog
   - Tree navigation interface
   - Course catalog
   - Course player
   - Forum interface
   - Mentorship profiles

2. **API endpoints** ($150):
   - REST APIs for all features
   - Authentication (JWT)
   - Rate limiting
   - API documentation

3. **Admin dashboard** ($100):
   - Manage trees
   - Manage courses
   - User management
   - Analytics dashboard

4. **Testing & refinement** ($100):
   - User acceptance testing
   - Bug fixes
   - Performance optimization
   - Security hardening

5. **Launch preparation** ($150):
   - Payment integration (Stripe/PayPal)
   - Email notifications (SendGrid/Mailgun)
   - Analytics (Google Analytics, Mixpanel)
   - SEO optimization

6. **Buffer for changes** ($91)

---

## 🚨 Troubleshooting

### If an agent fails:

**Error: "Cannot connect to database"**
→ Make sure your database is accessible from the agent
→ Check firewall rules allow connections
→ Verify PGPASSWORD in .env file

**Error: "Schema mismatch"**
→ Agent might be using wrong column names
→ Show it the output of `\d decision_trees` to use correct schema
→ Remind it: `tree_name` not `name`, no `difficulty` or `estimated_time_minutes` columns

**Error: "Duplicate tree_key"**
→ Check if tree already exists
→ Use unique tree_keys for each tree

### If agents work too slowly:

**Optimize prompts**:
- Ask for "efficient SQL using CTEs"
- Request "batch insert where possible"
- Specify "execute migration after creation to verify"

---

## 📊 Expected Timeline

| Time | Activity |
|------|----------|
| **0:00** | Start 5 agents with prompts |
| **0:15** | Agents start generating SQL |
| **0:25** | First migrations complete |
| **0:30** | All 5 migrations created |
| **0:35** | Agents execute migrations |
| **0:40** | **ALL 20 TREES COMPLETE** ✅ |

**Total time: ~40 minutes** (vs 2-3 days doing it sequentially!)

---

## 🎓 Learning from This Approach

**Why this works**:
1. **Clear task boundaries**: Each agent has 4 trees, no overlap
2. **Same context**: All agents see same database schema
3. **Independent execution**: Migrations don't conflict (different tree_keys)
4. **Verifiable**: Each agent tests its own migration
5. **Parallelization**: 5x speed improvement minimum

**Apply this pattern to**:
- Creating 50 Excel templates (5 agents × 10 templates)
- Recording course videos (split lessons across days with different agents drafting scripts)
- Writing blog posts (each agent writes 4-5 posts on different topics)
- Creating API endpoints (each agent handles different resource types)

---

## ✅ Success Criteria

After completing this process, you should have:

- ✅ **30 decision trees** in database (10 original + 20 new)
- ✅ **5 migration files** (017-021_*.sql)
- ✅ **~100 update points** tracked across all trees
- ✅ **~60,000-80,000 words** of Romanian content
- ✅ **Comprehensive coverage** of all business stages and scenarios
- ✅ **$791 remaining** for frontend, APIs, testing, launch

**You'll have the most comprehensive Romanian business decision tree platform ever built.** 🚀

---

**Ready to start? Go to https://claude.ai/code now!**

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Estimated Time to Complete**: 40 minutes
**Estimated Cost**: $200 of $991 credit
