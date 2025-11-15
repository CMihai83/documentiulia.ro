# Decision Trees - Exponential Expansion & Dynamic Update Strategy
## 2025-11-15 16:00

---

## 🎯 Executive Summary

**Goal**: Transform decision tree system from 1 tree → 50+ trees with automated legislation updates

**Current State**:
- ✅ 1 decision tree (TVA Registration)
- ✅ 3 nodes, 9 paths, 6 terminal answers
- ✅ Production-ready infrastructure
- ✅ Rating system, progress indicators, rich content

**Target State** (6 months):
- 🎯 50+ decision trees covering all Romanian business scenarios
- 🎯 Auto-updating content tied to legislation changes
- 🎯 Multi-tier tree complexity (simple → complex branching)
- 🎯 AI-powered content generation for new trees
- 🎯 Version control for all decision logic

---

## 📊 PHASE 1: Foundation for Scalability (Week 1-2)

### 1.1 Create Tree Template System

**Problem**: Creating trees manually is slow and error-prone
**Solution**: Template-driven tree generation

**Implementation**:

```sql
-- New table: decision_tree_templates
CREATE TABLE decision_tree_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    node_count_estimate INTEGER,
    complexity_level VARCHAR(20) CHECK (complexity_level IN ('simple', 'medium', 'complex')),
    json_structure JSONB NOT NULL,  -- Full tree structure as template
    variable_placeholders JSONB,     -- {threshold_amount: "300000", entity_types: ["PFA", "SRL"]}
    created_at TIMESTAMP DEFAULT NOW()
);

-- Example template:
INSERT INTO decision_tree_templates (template_key, template_name, category, complexity_level, json_structure) VALUES
('threshold_based_binary', 'Threshold-Based Binary Decision', 'fiscal', 'simple', '{
  "root_question": "Care este [METRIC_NAME] ta?",
  "branches": [
    {
      "condition": "< [THRESHOLD]",
      "next_question": "[OPTIONAL_QUESTION]",
      "terminal_answer": "[LOW_THRESHOLD_ANSWER]"
    },
    {
      "condition": "> [THRESHOLD]",
      "next_question": "[ENTITY_TYPE_QUESTION]",
      "entity_branches": ["PFA", "SRL", "II", "Altele"]
    }
  ]
}'::jsonb);
```

### 1.2 Legislation Binding System

**Connect decision trees to legislation table**:

```sql
-- Add legislation binding to decision_answers
ALTER TABLE decision_answers ADD COLUMN legislation_ids INTEGER[];
ALTER TABLE decision_answers ADD COLUMN auto_update_rules JSONB;

-- Example binding:
UPDATE decision_answers SET
  legislation_ids = ARRAY[
    (SELECT id FROM fiscal_legislation WHERE article_code = 'Art316_CF'),
    (SELECT id FROM fiscal_legislation WHERE article_code = 'Art325_CF')
  ],
  auto_update_rules = '{
    "threshold_variable": "tva_registration_threshold",
    "update_on_change": ["threshold", "deadline", "penalties"],
    "affected_sections": ["answer_template", "warnings", "next_steps"]
  }'::jsonb
WHERE path_id = 10;
```

### 1.3 Dynamic Variable System

**Store updateable values centrally**:

```sql
-- New table: legislation_variables
CREATE TABLE legislation_variables (
    id SERIAL PRIMARY KEY,
    variable_key VARCHAR(100) UNIQUE NOT NULL,
    variable_name VARCHAR(255) NOT NULL,
    current_value TEXT NOT NULL,
    value_type VARCHAR(50) NOT NULL,  -- 'amount', 'percentage', 'days', 'text'
    unit VARCHAR(20),                  -- 'RON', 'EUR', '%', 'days'
    legislation_id INTEGER REFERENCES fiscal_legislation(id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    source_url TEXT,
    last_verified TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed with current TVA thresholds:
INSERT INTO legislation_variables (variable_key, variable_name, current_value, value_type, unit, effective_from) VALUES
('tva_registration_threshold', 'Prag înregistrare TVA', '300000', 'amount', 'RON', '2016-01-01'),
('tva_registration_deadline_days', 'Termen înregistrare TVA', '10', 'days', 'zile lucrătoare', '2016-01-01'),
('tva_penalty_min', 'Penalitate minimă TVA', '500', 'amount', 'RON', '2016-01-01'),
('tva_penalty_max', 'Penalitate maximă TVA', '1000', 'amount', 'RON', '2016-01-01'),
('microenterprise_threshold', 'Prag microîntreprindere', '500000', 'amount', 'EUR', '2016-01-01'),
('microenterprise_tax_rate', 'Cotă impozit microîntreprindere', '1', 'percentage', '%', '2023-01-01'),
('profit_tax_rate', 'Cotă impozit profit', '16', 'percentage', '%', '2016-01-01');

-- Index for fast lookups
CREATE INDEX idx_legvar_key_effective ON legislation_variables(variable_key, effective_from DESC);
```

### 1.4 Template-Based Answer Generation

**Auto-generate answers from templates**:

```sql
-- New table: answer_templates
CREATE TABLE answer_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    html_template TEXT NOT NULL,  -- Contains {{variable_placeholders}}
    required_variables JSONB,     -- ["tva_threshold", "deadline_days"]
    optional_sections JSONB,      -- ["cost_breakdown", "timeline", "mba_insights"]
    created_at TIMESTAMP DEFAULT NOW()
);

-- Example template:
INSERT INTO answer_templates (template_key, template_name, html_template, required_variables) VALUES
('mandatory_registration_urgent', 'Înregistrare Obligatorie cu Termen', '
<h3>🏢 Înregistrare Obligatorie TVA - {{entity_type}}</h3>

<div class="bg-red-50 border-l-4 border-red-500 p-4 my-4">
  <h4 class="font-bold text-red-900">⏰ URGENT: {{deadline_days}} ZILE!</h4>
  <p>Ai depășit pragul de <strong>{{threshold_amount}} {{threshold_unit}}</strong>.</p>
  <p>Termenul de înregistrare este de <strong>{{deadline_days}} zile lucrătoare</strong> de la depășirea pragului.</p>
</div>

<h4 class="font-bold text-gray-900">📋 Documente Necesare pentru {{entity_type}}:</h4>
{{documents_list}}

{{#if cost_breakdown}}
<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
  <h4 class="font-bold text-blue-900">💰 Costuri Estimate</h4>
  {{cost_breakdown}}
</div>
{{/if}}

{{#if timeline}}
<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
  <h4 class="font-bold text-blue-900">⏱️ Timeline Implementare</h4>
  {{timeline}}
</div>
{{/if}}

<div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
  <h4 class="font-bold text-yellow-900">⚠️ ATENȚIE - Aspecte Critice</h4>
  <ul class="list-disc ml-5 space-y-1">
    <li><strong>TERMEN STRICT:</strong> {{deadline_days}} zile de la depășirea pragului!</li>
    <li><strong>Penalități:</strong> {{penalty_min}}-{{penalty_max}} RON + TVA necolectat.</li>
    <li><strong>Cash-flow:</strong> Trebuie să ai lichidități pentru plata TVA la stat înainte de încasare.</li>
  </ul>
</div>
',
ARRAY['entity_type', 'threshold_amount', 'threshold_unit', 'deadline_days', 'penalty_min', 'penalty_max']::jsonb);
```

---

## 📈 PHASE 2: Rapid Tree Expansion (Week 3-8)

### 2.1 Priority Queue: 25 High-Impact Trees

**Tier 1: Critical Business Decisions** (Week 3-4)

1. ✅ **TVA Registration** (DONE)
2. 🚀 **Microenterprise Eligibility** (500 RON tax vs 16% profit tax)
3. 🚀 **Employee Hiring Process** (CIM contracts, REVISAL, ITM)
4. 🚀 **Deductible Expenses** (What you can deduct, documentation)
5. 🚀 **Dividend Distribution** (SRL profit distribution, taxation)

**Tier 2: Compliance & Reporting** (Week 5-6)

6. **Annual Fiscal Declarations** (D100, D112, when to file)
7. **Intrastat Reporting** (EU trade thresholds)
8. **Fiscal Year Closing** (Inventory, reconciliation)
9. **Asset Depreciation** (Linear vs accelerated)
10. **Loss Carryforward** (How to use fiscal losses)

**Tier 3: Business Formation** (Week 7-8)

11. **Company Registration** (SRL vs PFA vs II)
12. **Trade Registry Steps** (ONRC procedures)
13. **Bank Account Opening** (Requirements for companies)
14. **Fiscal Registration** (ANAF procedures)
15. **VAT Code Requirement** (When you need it)

**Tier 4: Special Situations** (Week 9-12)

16. **Foreign Investment** (Non-resident shareholders)
17. **Intra-EU Transactions** (Reverse charge, VIES)
18. **Real Estate Transactions** (Buying/selling property as company)
19. **Intellectual Property** (Patents, trademarks, deductibility)
20. **Merger & Acquisition** (M&A fiscal implications)

**Tier 5: Employee Management** (Week 13-16)

21. **Payroll Calculations** (Gross to net calculator)
22. **Overtime & Bonuses** (Legal limits, taxation)
23. **Remote Work Setup** (Legal requirements)
24. **Internship Programs** (Student vs graduate interns)
25. **Termination Process** (Notice periods, severance)

### 2.2 Tree Generation Workflow

**Semi-Automated Tree Creation**:

```
Step 1: Admin selects template
        ↓
Step 2: AI generates questions based on legislation
        ↓
Step 3: AI populates variable values from legislation_variables
        ↓
Step 4: Human review & adjustment (30 min per tree)
        ↓
Step 5: Automated testing (all paths traversable)
        ↓
Step 6: Publish & monitor analytics
```

**SQL Function for Tree Generation**:

```sql
-- Function to generate tree from template
CREATE OR REPLACE FUNCTION generate_tree_from_template(
    p_template_key VARCHAR,
    p_tree_key VARCHAR,
    p_tree_name VARCHAR,
    p_variables JSONB
) RETURNS INTEGER AS $$
DECLARE
    v_tree_id INTEGER;
    v_template RECORD;
BEGIN
    -- Get template
    SELECT * INTO v_template FROM decision_tree_templates WHERE template_key = p_template_key;

    -- Create new tree
    INSERT INTO decision_trees (tree_key, tree_name, description, category)
    VALUES (p_tree_key, p_tree_name, v_template.template_name, v_template.category)
    RETURNING id INTO v_tree_id;

    -- Generate nodes from template (recursive logic here)
    -- Populate variables from p_variables JSONB

    RETURN v_tree_id;
END;
$$ LANGUAGE plpgsql;

-- Usage example:
SELECT generate_tree_from_template(
    'threshold_based_binary',
    'microenterprise_eligibility',
    'Eligibilitate Microîntreprindere',
    '{"threshold_amount": "500000", "threshold_unit": "EUR", "entity_types": ["SRL", "SRL-D"]}'::jsonb
);
```

---

## 🔄 PHASE 3: Automated Legislation Update System (Week 9-12)

### 3.1 Legislation Change Detection

**Monitor fiscal_legislation table for updates**:

```sql
-- Trigger on fiscal_legislation updates
CREATE OR REPLACE FUNCTION notify_legislation_change() RETURNS TRIGGER AS $$
BEGIN
    -- Log the change
    INSERT INTO legislation_updates_log (
        legislation_id,
        field_changed,
        old_value,
        new_value,
        change_type,
        requires_tree_update
    ) VALUES (
        NEW.id,
        'content',  -- or 'threshold', 'date', etc.
        OLD.content,
        NEW.content,
        'modification',
        TRUE  -- Flag for decision tree review
    );

    -- Notify admin
    PERFORM pg_notify('legislation_changed', json_build_object(
        'legislation_id', NEW.id,
        'article_code', NEW.article_code,
        'affected_trees', (
            SELECT json_agg(DISTINCT dt.tree_key)
            FROM decision_answers da
            JOIN decision_paths dp ON da.path_id = dp.id
            JOIN decision_nodes dn ON dp.node_id = dn.id
            JOIN decision_trees dt ON dn.tree_id = dt.id
            WHERE NEW.id = ANY(da.legislation_ids)
        )
    )::text);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legislation_update_trigger
AFTER UPDATE ON fiscal_legislation
FOR EACH ROW
WHEN (OLD.content IS DISTINCT FROM NEW.content OR
      OLD.effective_from IS DISTINCT FROM NEW.effective_from)
EXECUTE FUNCTION notify_legislation_change();
```

### 3.2 Variable Update Propagation

**When legislation variables change, update all dependent answers**:

```sql
-- Function to update decision answers when variables change
CREATE OR REPLACE FUNCTION update_answers_on_variable_change(
    p_variable_key VARCHAR,
    p_new_value TEXT
) RETURNS TABLE(affected_answers INTEGER, preview TEXT) AS $$
DECLARE
    v_old_value TEXT;
    v_affected_count INTEGER;
BEGIN
    -- Get old value
    SELECT current_value INTO v_old_value
    FROM legislation_variables
    WHERE variable_key = p_variable_key;

    -- Update variable
    UPDATE legislation_variables
    SET current_value = p_new_value,
        updated_at = NOW(),
        effective_from = CURRENT_DATE
    WHERE variable_key = p_variable_key;

    -- Find all answers that use this variable
    -- Replace {{variable_key}} with new value in templates
    UPDATE decision_answers
    SET answer_template = replace(answer_template, '{{' || p_variable_key || '}}', p_new_value),
        warnings = replace(warnings, '{{' || p_variable_key || '}}', p_new_value),
        updated_at = NOW()
    WHERE answer_template LIKE '%{{' || p_variable_key || '}}%'
       OR warnings LIKE '%{{' || p_variable_key || '}}%';

    GET DIAGNOSTICS v_affected_count = ROW_COUNT;

    RETURN QUERY SELECT v_affected_count,
                        'Updated ' || p_variable_key || ' from ' || v_old_value || ' to ' || p_new_value;
END;
$$ LANGUAGE plpgsql;

-- Usage:
SELECT * FROM update_answers_on_variable_change('tva_registration_threshold', '350000');
-- Result: (5, 'Updated tva_registration_threshold from 300000 to 350000')
```

### 3.3 Update Queue & Review System

**Admin dashboard for reviewing automated changes**:

```sql
-- New table: pending_tree_updates
CREATE TABLE pending_tree_updates (
    id SERIAL PRIMARY KEY,
    tree_id INTEGER REFERENCES decision_trees(id),
    answer_id INTEGER REFERENCES decision_answers(id),
    change_type VARCHAR(50),  -- 'variable_update', 'legislation_change', 'content_improvement'
    trigger_source VARCHAR(100),  -- 'legislation_id:123', 'variable:tva_threshold'
    current_content TEXT,
    proposed_content TEXT,
    diff_html TEXT,  -- HTML diff for admin review
    auto_approved BOOLEAN DEFAULT FALSE,
    reviewed BOOLEAN DEFAULT FALSE,
    approved_by UUID,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Example: Generate update preview
INSERT INTO pending_tree_updates (tree_id, answer_id, change_type, trigger_source, current_content, proposed_content)
SELECT
    dt.id,
    da.id,
    'variable_update',
    'variable:tva_registration_threshold',
    da.answer_template,
    replace(da.answer_template, '300.000 lei', '350.000 lei')
FROM decision_answers da
JOIN decision_paths dp ON da.path_id = dp.id
JOIN decision_nodes dn ON dp.node_id = dn.id
JOIN decision_trees dt ON dn.tree_id = dt.id
WHERE da.answer_template LIKE '%300.000 lei%';
```

---

## 🎯 PHASE 4: Points Requiring Periodic Updates

### 4.1 Critical Update Points Collection

**Table: decision_tree_update_points**

```sql
CREATE TABLE decision_tree_update_points (
    id SERIAL PRIMARY KEY,
    tree_id INTEGER REFERENCES decision_trees(id),
    answer_id INTEGER REFERENCES decision_answers(id),
    update_category VARCHAR(100) NOT NULL,
    data_point_name VARCHAR(255) NOT NULL,
    current_value TEXT NOT NULL,
    value_source VARCHAR(255),  -- 'fiscal_legislation:123', 'ANAF website', 'Manual entry'
    update_frequency VARCHAR(50),  -- 'annual', 'quarterly', 'on_legislation_change'
    last_verified TIMESTAMP,
    next_verification_due DATE,
    verification_url TEXT,
    responsible_person VARCHAR(100),
    criticality VARCHAR(20) CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_update_points_due ON decision_tree_update_points(next_verification_due);
CREATE INDEX idx_update_points_criticality ON decision_tree_update_points(criticality, next_verification_due);
```

### 4.2 Update Point Categories

**Seed with current TVA tree update points**:

```sql
INSERT INTO decision_tree_update_points (
    tree_id,
    answer_id,
    update_category,
    data_point_name,
    current_value,
    value_source,
    update_frequency,
    next_verification_due,
    verification_url,
    criticality
) VALUES
-- Thresholds (CRITICAL - changes = system-wide impact)
(1, 10, 'threshold', 'TVA Registration Threshold', '300.000 RON', 'Codul Fiscal Art. 316', 'annual', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'critical'),
(1, 10, 'threshold', 'Microenterprise Revenue Threshold', '500.000 EUR', 'Cod Fiscal Art. 47', 'annual', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'critical'),

-- Deadlines (HIGH - changes = user penalties)
(1, 10, 'deadline', 'TVA Registration Deadline', '10 zile lucrătoare', 'Codul Fiscal Art. 316 alin. 11', 'on_legislation_change', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'high'),
(1, 10, 'deadline', 'First TVA Declaration Deadline', '25 ale lunii următoare', 'Codul Fiscal Art. 323', 'on_legislation_change', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'high'),

-- Penalties (HIGH - financial impact)
(1, 10, 'penalty', 'Late Registration Penalty Min', '500 RON', 'Codul Fiscal Art. 336', 'annual', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'high'),
(1, 10, 'penalty', 'Late Registration Penalty Max', '1.000 RON', 'Codul Fiscal Art. 336', 'annual', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'high'),

-- Tax Rates (CRITICAL - direct financial impact)
(1, 10, 'tax_rate', 'Standard VAT Rate', '19%', 'Codul Fiscal Art. 291', 'on_legislation_change', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'critical'),
(1, 10, 'tax_rate', 'Reduced VAT Rate', '9%', 'Codul Fiscal Art. 291', 'on_legislation_change', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'critical'),
(1, 10, 'tax_rate', 'Microenterprise Tax Rate', '1%', 'Codul Fiscal Art. 47', 'annual', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_11022020.htm', 'critical'),

-- Costs (MEDIUM - informational, not legal)
(1, 10, 'cost_estimate', 'Accountant Monthly Fee Range', '300-700 RON', 'Market research', 'quarterly', '2026-04-01', NULL, 'medium'),
(1, 10, 'cost_estimate', 'Invoicing Software Monthly Cost', '100-300 RON', 'Market research', 'quarterly', '2026-04-01', NULL, 'medium'),

-- Processing Times (MEDIUM - informational)
(1, 10, 'processing_time', 'ANAF Registration Processing', '3-5 zile lucrătoare', 'ANAF official stats', 'quarterly', '2026-04-01', 'https://www.anaf.ro', 'medium'),
(1, 10, 'processing_time', 'VAT Certificate Issuance', '2-3 zile', 'ANAF official stats', 'quarterly', '2026-04-01', 'https://www.anaf.ro', 'medium'),

-- Forms & Documents (LOW - rarely change, but verify)
(1, 10, 'form_requirement', 'Form 010 Version', 'Versiunea 15.07.2024', 'ANAF Forms Portal', 'quarterly', '2026-04-01', 'https://static.anaf.ro/static/10/Anaf/formulare/', 'low'),
(1, 10, 'form_requirement', 'Form 010 Download URL', 'https://static.anaf.ro/static/10/Anaf/formulare/Declaratii_R010.pdf', 'ANAF Forms Portal', 'quarterly', '2026-04-01', 'https://static.anaf.ro/static/10/Anaf/formulare/', 'low');
```

### 4.3 Automated Verification Reminders

**Daily cron job to check for due verifications**:

```sql
-- View: Overdue update points
CREATE VIEW overdue_update_points AS
SELECT
    up.*,
    dt.tree_name,
    CURRENT_DATE - up.next_verification_due AS days_overdue
FROM decision_tree_update_points up
JOIN decision_trees dt ON up.tree_id = dt.id
WHERE up.next_verification_due < CURRENT_DATE
ORDER BY up.criticality DESC, days_overdue DESC;

-- Function to notify admin of due verifications
CREATE OR REPLACE FUNCTION check_and_notify_due_verifications() RETURNS TABLE(
    category VARCHAR,
    critical_count BIGINT,
    high_count BIGINT,
    total_count BIGINT
) AS $$
BEGIN
    -- Send email notification with overdue items
    PERFORM pg_notify('update_verification_due', json_build_object(
        'critical_overdue', (SELECT COUNT(*) FROM overdue_update_points WHERE criticality = 'critical'),
        'high_overdue', (SELECT COUNT(*) FROM overdue_update_points WHERE criticality = 'high'),
        'items', (SELECT json_agg(row_to_json(overdue_update_points.*)) FROM overdue_update_points LIMIT 20)
    )::text);

    RETURN QUERY
    SELECT
        update_category,
        COUNT(*) FILTER (WHERE criticality = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE criticality = 'high') as high_count,
        COUNT(*) as total_count
    FROM overdue_update_points
    GROUP BY update_category
    ORDER BY critical_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Schedule: Run daily at 9 AM
-- (via pg_cron extension or external cron)
-- SELECT check_and_notify_due_verifications();
```

---

## 📊 PHASE 5: Content Quality Multiplier (Week 13-16)

### 5.1 AI-Powered Content Enhancement

**Use existing AI consultant to enrich answers**:

```sql
-- Function to generate MBA insights for existing answers
CREATE OR REPLACE FUNCTION generate_mba_insights_for_answer(p_answer_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    v_answer RECORD;
    v_ai_prompt TEXT;
    v_mba_insights TEXT;
BEGIN
    -- Get current answer
    SELECT * INTO v_answer FROM decision_answers WHERE id = p_answer_id;

    -- Build AI prompt
    v_ai_prompt := 'Analyze this business decision from an MBA perspective: ' || v_answer.answer_template ||
                   '. Provide: 1) Cash flow impact, 2) Strategic timing, 3) Competitive advantage, 4) Risk mitigation.';

    -- Call AI (pseudo-code - integrate with existing AI consultant API)
    -- v_mba_insights := call_ai_consultant(v_ai_prompt);

    -- Update answer
    UPDATE decision_answers
    SET strategic_advice = v_mba_insights,
        updated_at = NOW()
    WHERE id = p_answer_id;

    RETURN v_mba_insights;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Bulk Content Enhancement

**Script to process all answers**:

```bash
#!/bin/bash
# enhance_all_answers.sh

psql -h 127.0.0.1 -U accountech_app -d accountech_production <<SQL
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM decision_answers WHERE strategic_advice IS NULL OR LENGTH(strategic_advice) < 200
    LOOP
        PERFORM generate_mba_insights_for_answer(r.id);
        PERFORM pg_sleep(2);  -- Rate limiting
    END LOOP;
END \$\$;
SQL
```

---

## 🎛️ PHASE 6: Admin Dashboard for Update Management (Week 17-20)

### 6.1 Update Dashboard Features

**Frontend Component: `/admin/decision-trees/updates`**

```tsx
// UpdateManagementDashboard.tsx

interface UpdatePoint {
  id: number;
  tree_name: string;
  data_point_name: string;
  current_value: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  next_verification_due: string;
  days_overdue?: number;
}

export default function UpdateManagementDashboard() {
  const [overduePoints, setOverduePoints] = useState<UpdatePoint[]>([]);
  const [dueThisWeek, setDueThisWeek] = useState<UpdatePoint[]>([]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Decision Tree Update Management</h1>

      {/* Critical Alerts */}
      {overduePoints.filter(p => p.criticality === 'critical').length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <h2 className="font-bold text-red-900">
            🚨 {overduePoints.filter(p => p.criticality === 'critical').length} CRITICAL Updates Overdue
          </h2>
          <ul className="mt-2 space-y-1">
            {overduePoints.filter(p => p.criticality === 'critical').map(point => (
              <li key={point.id}>
                <strong>{point.tree_name}</strong>: {point.data_point_name}
                <span className="text-red-600 ml-2">({point.days_overdue} days overdue)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Update Categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Critical Overdue" value={overduePoints.filter(p => p.criticality === 'critical').length} color="red" />
        <MetricCard title="High Priority Overdue" value={overduePoints.filter(p => p.criticality === 'high').length} color="orange" />
        <MetricCard title="Due This Week" value={dueThisWeek.length} color="yellow" />
        <MetricCard title="All Current" value={100 - overduePoints.length} color="green" />
      </div>

      {/* Update Queue Table */}
      <table className="w-full bg-white shadow rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">Criticality</th>
            <th className="px-6 py-3 text-left">Tree</th>
            <th className="px-6 py-3 text-left">Data Point</th>
            <th className="px-6 py-3 text-left">Current Value</th>
            <th className="px-6 py-3 text-left">Verification Due</th>
            <th className="px-6 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {overduePoints.map(point => (
            <tr key={point.id} className="border-t hover:bg-gray-50">
              <td className="px-6 py-4">
                <CriticalityBadge level={point.criticality} />
              </td>
              <td className="px-6 py-4">{point.tree_name}</td>
              <td className="px-6 py-4">{point.data_point_name}</td>
              <td className="px-6 py-4 font-mono">{point.current_value}</td>
              <td className="px-6 py-4">
                {point.days_overdue ? (
                  <span className="text-red-600">{point.days_overdue} days overdue</span>
                ) : (
                  point.next_verification_due
                )}
              </td>
              <td className="px-6 py-4">
                <button onClick={() => verifyUpdatePoint(point.id)} className="btn-primary">
                  Verify Now
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 📋 SUMMARY: Complete Update Point Checklist

### By Category

**THRESHOLDS** (Review: Annually, After Budget Law)
- [ ] TVA registration threshold (current: 300.000 RON)
- [ ] Microenterprise revenue ceiling (current: 500.000 EUR)
- [ ] Employee count thresholds (micro: 9, small: 49)
- [ ] Intrastat reporting threshold (current: varies)
- [ ] Cash payment limit (current: varies)

**DEADLINES** (Review: On Legislation Change)
- [ ] TVA registration deadline (current: 10 working days)
- [ ] VAT declaration submission (current: 25th of month)
- [ ] Annual declaration D100 (current: May 25)
- [ ] Annual declaration D112 (current: January 31)
- [ ] Payment deadlines (varies by tax type)

**TAX RATES** (Review: Annually)
- [ ] Standard VAT rate (current: 19%)
- [ ] Reduced VAT rate (current: 9%, 5%)
- [ ] Microenterprise tax (current: 1% or 3%)
- [ ] Profit tax rate (current: 16%)
- [ ] Dividend tax rate (current: 8%)
- [ ] Social contributions (CAS: 25%, CASS: 10%)

**PENALTIES** (Review: Annually)
- [ ] Late registration penalties (current: 500-1000 RON)
- [ ] Late payment interest (current: varies)
- [ ] Late declaration penalties (current: varies)

**COSTS** (Review: Quarterly)
- [ ] Accountant fees (market research)
- [ ] Software costs (market research)
- [ ] Registration fees (official sources)
- [ ] Notary fees (market research)

**FORMS & PROCEDURES** (Review: Quarterly)
- [ ] Form versions (ANAF forms portal)
- [ ] Download URLs (verify links active)
- [ ] Required documents (ANAF requirements)
- [ ] Online platform URLs (SPV, e-Factura)

**PROCESSING TIMES** (Review: Quarterly)
- [ ] ANAF processing times (official stats)
- [ ] ONRC registration times (official stats)
- [ ] Bank account opening (market research)

---

## 🚀 Implementation Timeline

**Month 1-2: Foundation**
- Week 1: Variable system + templates
- Week 2: Legislation binding + auto-update triggers
- Week 3-4: 5 new trees (Microenterprise, Hiring, Expenses, Dividends, Declarations)

**Month 3-4: Expansion**
- Week 5-8: 10 new trees (Business formation, Special situations)
- Week 9-12: Update point catalog + verification system

**Month 5-6: Quality & Automation**
- Week 13-16: AI content enhancement for all trees
- Week 17-20: Admin dashboard + monitoring
- Week 21-24: Analytics + optimization

**Target Metrics (6 months)**:
- ✅ 25+ decision trees live
- ✅ 90%+ update points tracked
- ✅ <5% overdue critical verifications
- ✅ 4.5+ average user rating
- ✅ 80%+ completion rate

---

**READY TO SCALE EXPONENTIALLY** 🚀
