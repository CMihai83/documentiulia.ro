-- ENHANCEMENT MIGRATION: Add Full Content to 3 Existing Trees
-- Updates answers with comprehensive content, adds variables and update points

BEGIN;

-- First, check we have the trees
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM decision_trees WHERE tree_key IN ('microenterprise', 'hiring', 'expenses')) THEN
    RAISE EXCEPTION 'Required trees not found. Run migration 007 first.';
  END IF;
END $$;

-- ============================================================================
-- ADD GLOBAL LEGISLATION VARIABLES
-- ============================================================================

-- Microenterprise variables
INSERT INTO legislation_variables (
  variable_key, variable_name, current_value, value_type, effective_from, last_verified
) VALUES
  ('micro_revenue_threshold_eur', 'Prag venit maxim microîntreprindere', '500000', 'amount', '2024-01-01', CURRENT_DATE),
  ('micro_employee_threshold', 'Prag angajați maxim micro', '9', 'text', '2024-01-01', CURRENT_DATE),
  ('micro_tax_rate_general', 'Cotă impozit micro activități generale', '1', 'percentage', '2024-01-01', CURRENT_DATE),
  ('micro_tax_rate_consulting', 'Cotă impozit micro consultanță >80%', '3', 'percentage', '2024-01-01', CURRENT_DATE)
ON CONFLICT (variable_key) DO UPDATE SET
  current_value = EXCLUDED.current_value,
  last_verified = EXCLUDED.last_verified;

-- Hiring variables
INSERT INTO legislation_variables (
  variable_key, variable_name, current_value, value_type, unit, effective_from, last_verified
) VALUES
  ('minimum_gross_salary_2024', 'Salariu minim brut', '3300', 'amount', 'RON', '2024-01-01', CURRENT_DATE),
  ('cas_employee_rate', 'CAS angajat (pensie)', '25', 'percentage', '%', '2024-01-01', CURRENT_DATE),
  ('cass_employee_rate', 'CASS angajat (sănătate)', '10', 'percentage', '%', '2024-01-01', CURRENT_DATE),
  ('cas_employer_rate', 'CAS angajator', '4', 'percentage', '%', '2024-01-01', CURRENT_DATE),
  ('income_tax_employee', 'Impozit pe venit salariat', '10', 'percentage', '%', '2024-01-01', CURRENT_DATE)
ON CONFLICT (variable_key) DO UPDATE SET
  current_value = EXCLUDED.current_value,
  last_verified = EXCLUDED.last_verified;

-- Expenses variables
INSERT INTO legislation_variables (
  variable_key, variable_name, current_value, value_type, unit, effective_from, last_verified
) VALUES
  ('protocol_limit_percentage', 'Limită cheltuieli protocol', '2.5', 'percentage', '% din salarii', '2024-01-01', CURRENT_DATE),
  ('protocol_gift_max_value', 'Valoare maximă cadou protocol', '300', 'amount', 'RON', '2024-01-01', CURRENT_DATE),
  ('diurna_romania_daily', 'Diurnă România', '25', 'amount', 'RON/zi', '2024-01-01', CURRENT_DATE),
  ('km_reimbursement_rate', 'Decontare km mașină personală', '2.5', 'amount', 'RON/km', '2024-01-01', CURRENT_DATE)
ON CONFLICT (variable_key) DO UPDATE SET
  current_value = EXCLUDED.current_value,
  last_verified = EXCLUDED.last_verified;

-- ============================================================================
-- ENHANCE MICROENTERPRISE TREE ANSWERS
-- ============================================================================

-- Update "other" (PFA/II) answer
UPDATE decision_answers SET
  answer_template = '<h2>❌ Regim Microîntreprindere Indisponibil</h2>

<div class="alert alert-warning">
<strong>Formă juridică incompatibilă:</strong> Regimul micro este EXCLUSIV pentru SRL-uri. Ca PFA/II, ai alt regim fiscal.
</div>

<h3>Regimul Tău Fiscal (PFA/II):</h3>
<ul>
<li><strong>Impozit pe venit:</strong> 10% din venit net (venit brut - cheltuieli deductibile)</li>
<li><strong>CAS (pensie):</strong> 25% din venit net (obligatoriu dacă venit > 12 × salariul minim)</li>
<li><strong>CASS (sănătate):</strong> 10% din venit net</li>
</ul>

<h3>Exemplu Calcul (100.000 RON venit brut, 30.000 RON cheltuieli):</h3>
<pre>
Venit net: 70.000 RON
Impozit (10%): 7.000 RON
CAS (25%): 17.500 RON
CASS (10%): 7.000 RON
──────────────────────
Total taxe: 31.500 RON (45%)
</pre>

<h3>Vrei să treci pe SRL pentru micro?</h3>
<p>Costurile înființare SRL:</p>
<ul>
<li>Capital social: 200 RON (depunere în cont)</li>
<li>Taxe înregistrare: ~200 RON</li>
<li>Contabil: 150-300 RON/lună</li>
</ul>',
  next_steps = '["Consultă contabil pentru optimizare fiscală PFA/II","Evaluează trecerea pe SRL pentru acces la micro","Ține evidență strictă cheltuieli deductibile"]'
WHERE id IN (
  SELECT da.id FROM decision_answers da
  JOIN decision_paths dp ON da.path_id = dp.id
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'micro_entity' AND dp.path_key = 'other'
);

-- Update "under 500k" answer
UPDATE decision_answers SET
  answer_template = '<h2>✅ ELIGIBIL - Microîntreprindere 1-3%</h2>

<div class="alert alert-success">
<strong>Felicitări!</strong> Îndeplinești condițiile pentru regimul micro.
</div>

<h3>Cotele Disponibile:</h3>
<ul>
<li><strong>1%</strong> - Activități generale (comerț, producție, servicii diverse)</li>
<li><strong>3%</strong> - Consultanță și servicii cu caracter intelectual >80% din venit</li>
</ul>

<h3>Exemple Activități pe Cote:</h3>
<table>
<tr><th>Cotă 1%</th><th>Cotă 3%</th></tr>
<tr><td>Comerț<br>Producție<br>HoReCa<br>Transport<br>Construcții</td><td>IT/Software<br>Consultanță<br>Marketing<br>Design<br>Contabilitate</td></tr>
</table>

<h3>Calcul Cost Real (200.000 RON venit anual):</h3>

<h4>Cotă 1%:</h4>
<pre>
Impozit micro (1%): 2.000 RON/an
Salariu minim obligatoriu: 39.600 RON/an
  (3.300 RON/lună × 12)
Contribuții angajator (4%): 1.584 RON/an
Contabil: 2.400 RON/an
──────────────────────────────
Total costuri: ~45.600 RON/an
Profit disponibil: 154.400 RON
Dividend (8% impozit): 12.352 RON
──────────────────────────────
PROFIT NET: 142.048 RON (71%)
</pre>

<h4>Cotă 3%:</h4>
<pre>
Impozit micro (3%): 6.000 RON/an
Alte costuri: identice
──────────────────────────────
PROFIT NET: 138.048 RON (69%)
</pre>

<h3>Cum Optezi pentru Micro?</h3>
<ol>
<li>Depui declarația 010 la ANAF cu opțiune micro</li>
<li>Deadline: <strong>31 ianuarie</strong> pentru anul curent</li>
<li>Condiție: Minim 1 angajat (poate fi asociatul)</li>
</ol>

<div class="alert alert-warning">
<strong>ATENȚIE:</strong> Dacă depășești 500.000 EUR sau 9 angajați, treci automat pe profit 16%!
</div>',
  next_steps = '["Depune 010 cu opțiune micro până 31 ianuarie","Angajează contabil micro (150-300 RON/lună)","Asigură-te că ai minim 1 angajat","Monitorizează praguri lunar","Plătește impozit trimestrial"]'
WHERE id IN (
  SELECT da.id FROM decision_answers da
  JOIN decision_paths dp ON da.path_id = dp.id
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'micro_revenue' AND dp.path_key = 'under'
);

-- Update "over 500k" answer
UPDATE decision_answers SET
  answer_template = '<h2>❌ Venit Peste Prag - Impozit pe Profit 16%</h2>

<div class="alert alert-danger">
<strong>Depășești pragul:</strong> Cu venit > 500.000 EUR, nu poți aplica micro.
</div>

<h3>Regimul Tău: Impozit pe Profit 16%</h3>
<ul>
<li><strong>Cotă:</strong> 16% pe PROFIT (venit - cheltuieli deductibile)</li>
<li><strong>Avantaj:</strong> Deduci TOATE cheltuielile justificate</li>
<li><strong>Dezavantaj:</strong> Contabilitate complexă (500-1.500 RON/lună)</li>
</ul>

<h3>Exemplu (600.000 EUR venit, 400.000 EUR cheltuieli):</h3>
<pre>
Profit: 200.000 EUR
Impozit (16%): 32.000 EUR
──────────────────────
Profit net: 168.000 EUR
</pre>

<h3>Cheltuieli Deductibile:</h3>
<ul>
<li>✅ Salarii + contribuții</li>
<li>✅ Chirie, utilități</li>
<li>✅ Materii prime, mărfuri</li>
<li>✅ Amortizare echipamente</li>
<li>✅ Servicii externe</li>
</ul>',
  next_steps = '["Angajează contabil pentru profit (500-1.500 RON/lună)","Organizează evidență cheltuieli","Planifică plăți trimestriale","Evaluează optimizări fiscale"]'
WHERE id IN (
  SELECT da.id FROM decision_answers da
  JOIN decision_paths dp ON da.path_id = dp.id
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'micro_revenue' AND dp.path_key = 'over'
);

-- ============================================================================
-- ADD UPDATE POINTS FOR MICROENTERPRISE
-- ============================================================================

INSERT INTO decision_tree_update_points (
  tree_id,
  update_category,
  data_point_name,
  current_value,
  value_source,
  linked_variable_key,
  update_frequency,
  next_verification_due,
  criticality,
  auto_updateable,
  verification_instructions
)
SELECT
  t.id,
  'threshold',
  'Prag venit maxim microîntreprindere',
  '500.000 EUR',
  'Codul Fiscal Art. 48',
  'micro_revenue_threshold_eur',
  'annual',
  CURRENT_DATE + INTERVAL '365 days',
  'critical',
  true,
  'Verifică Codul Fiscal actualizat anual pentru pragul de venit micro'
FROM decision_trees t WHERE t.tree_key = 'microenterprise'

UNION ALL

SELECT
  t.id,
  'threshold',
  'Prag angajați maxim micro',
  '9 angajați',
  'Codul Fiscal Art. 48',
  'micro_employee_threshold',
  'annual',
  CURRENT_DATE + INTERVAL '365 days',
  'critical',
  true,
  'Verifică pragul maxim de angajați pentru menținerea regimului micro'
FROM decision_trees t WHERE t.tree_key = 'microenterprise'

UNION ALL

SELECT
  t.id,
  'tax_rate',
  'Cotă impozit micro activități generale',
  '1%',
  'Codul Fiscal Art. 52',
  'micro_tax_rate_general',
  'quarterly',
  CURRENT_DATE + INTERVAL '90 days',
  'critical',
  true,
  'Verifică cota impozitului micro pentru activități generale'
FROM decision_trees t WHERE t.tree_key = 'microenterprise'

UNION ALL

SELECT
  t.id,
  'tax_rate',
  'Cotă impozit micro consultanță',
  '3%',
  'Codul Fiscal Art. 52',
  'micro_tax_rate_consulting',
  'quarterly',
  CURRENT_DATE + INTERVAL '90 days',
  'critical',
  true,
  'Verifică cota impozitului micro pentru consultanță >80%'
FROM decision_trees t WHERE t.tree_key = 'microenterprise'

UNION ALL

SELECT
  t.id,
  'deadline',
  'Deadline optare micro',
  '31 ianuarie',
  'Procedură ANAF',
  NULL,
  'annual',
  CURRENT_DATE + INTERVAL '365 days',
  'critical',
  false,
  'Verifică termenul de depunere declarație 010 pentru optare micro'
FROM decision_trees t WHERE t.tree_key = 'microenterprise';

-- ============================================================================
-- ADD UPDATE POINTS FOR HIRING
-- ============================================================================

INSERT INTO decision_tree_update_points (
  tree_id,
  update_category,
  data_point_name,
  current_value,
  value_source,
  linked_variable_key,
  update_frequency,
  next_verification_due,
  criticality,
  auto_updateable,
  verification_instructions
)
SELECT
  t.id,
  'threshold',
  'Salariu minim brut',
  '3.300 RON',
  'HG Guvern',
  'minimum_gross_salary_2024',
  'quarterly',
  CURRENT_DATE + INTERVAL '180 days',
  'critical',
  true,
  'Verifică Hotărârea de Guvern pentru salariul minim actualizat'
FROM decision_trees t WHERE t.tree_key = 'hiring'

UNION ALL

SELECT
  t.id,
  'tax_rate',
  'CAS angajat (pensie)',
  '25%',
  'Codul Fiscal Art. 137',
  'cas_employee_rate',
  'quarterly',
  CURRENT_DATE + INTERVAL '180 days',
  'critical',
  true,
  'Verifică cota CAS pentru angajați'
FROM decision_trees t WHERE t.tree_key = 'hiring'

UNION ALL

SELECT
  t.id,
  'tax_rate',
  'CAS angajator',
  '4%',
  'Codul Fiscal Art. 137',
  'cas_employer_rate',
  'quarterly',
  CURRENT_DATE + INTERVAL '180 days',
  'critical',
  true,
  'Verifică cota CAS pentru angajator'
FROM decision_trees t WHERE t.tree_key = 'hiring'

UNION ALL

SELECT
  t.id,
  'deadline',
  'Termen REVISAL',
  'Înainte de începerea activității',
  'OUG 53/2017',
  NULL,
  'annual',
  CURRENT_DATE + INTERVAL '365 days',
  'critical',
  false,
  'Verifică termenul legal de înregistrare în REVISAL'
FROM decision_trees t WHERE t.tree_key = 'hiring'

UNION ALL

SELECT
  t.id,
  'deadline',
  'Termen declarație 112',
  'Ziua 25 luna următoare',
  'Cod procedură fiscală',
  NULL,
  'annual',
  CURRENT_DATE + INTERVAL '365 days',
  'critical',
  false,
  'Verifică termenul de depunere declarație 112'
FROM decision_trees t WHERE t.tree_key = 'hiring';

-- ============================================================================
-- ADD UPDATE POINTS FOR EXPENSES
-- ============================================================================

INSERT INTO decision_tree_update_points (
  tree_id,
  update_category,
  data_point_name,
  current_value,
  value_source,
  linked_variable_key,
  update_frequency,
  next_verification_due,
  criticality,
  auto_updateable,
  verification_instructions
)
SELECT
  t.id,
  'threshold',
  'Limită protocol % din salarii',
  '2,5%',
  'Codul Fiscal Art. 25',
  'protocol_limit_percentage',
  'quarterly',
  CURRENT_DATE + INTERVAL '180 days',
  'critical',
  true,
  'Verifică limita legală cheltuieli de protocol'
FROM decision_trees t WHERE t.tree_key = 'expenses'

UNION ALL

SELECT
  t.id,
  'threshold',
  'Valoare maximă cadou protocol',
  '300 RON',
  'Normele Codului Fiscal',
  'protocol_gift_max_value',
  'quarterly',
  CURRENT_DATE + INTERVAL '180 days',
  'high',
  true,
  'Verifică valoarea maximă pentru cadouri deductibile'
FROM decision_trees t WHERE t.tree_key = 'expenses'

UNION ALL

SELECT
  t.id,
  'threshold',
  'Diurnă România',
  '20-30 RON/zi',
  'Tarife ANAF',
  'diurna_romania_daily',
  'quarterly',
  CURRENT_DATE + INTERVAL '90 days',
  'medium',
  true,
  'Verifică tarifele actualizate pentru diurnă pe site ANAF'
FROM decision_trees t WHERE t.tree_key = 'expenses'

UNION ALL

SELECT
  t.id,
  'threshold',
  'Decontare km mașină personală',
  '2,5 RON/km',
  'Practică fiscală',
  'km_reimbursement_rate',
  'quarterly',
  CURRENT_DATE + INTERVAL '180 days',
  'medium',
  false,
  'Verifică tariful acceptat fiscal pentru decontare km'
FROM decision_trees t WHERE t.tree_key = 'expenses';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT '═══════════════════════════════════════' as separator;
SELECT 'ENHANCEMENT MIGRATION COMPLETE' as status;
SELECT '═══════════════════════════════════════' as separator;

SELECT 'NEW VARIABLES:' as metric, COUNT(*) as count
FROM legislation_variables
WHERE variable_key IN (
  'micro_revenue_threshold_eur', 'micro_employee_threshold', 'micro_tax_rate_general', 'micro_tax_rate_consulting',
  'minimum_gross_salary_2024', 'cas_employee_rate', 'cass_employee_rate', 'cas_employer_rate', 'income_tax_employee',
  'protocol_limit_percentage', 'protocol_gift_max_value', 'diurna_romania_daily', 'km_reimbursement_rate'
);

SELECT 'UPDATE POINTS BY TREE:' as section;
SELECT
  dt.tree_name,
  COUNT(up.id) as update_points
FROM decision_trees dt
LEFT JOIN decision_tree_update_points up ON dt.id = up.tree_id
WHERE dt.tree_key IN ('microenterprise', 'hiring', 'expenses')
GROUP BY dt.tree_name
ORDER BY dt.tree_name;

SELECT '═══════════════════════════════════════' as separator;
