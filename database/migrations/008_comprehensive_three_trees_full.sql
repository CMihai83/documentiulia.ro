-- COMPREHENSIVE MIGRATION: 3 New Decision Trees with Full Features
-- Microenterprise, Hiring, Expenses
-- Includes: Variables, Update Points, Detailed Flows, Rich Content

BEGIN;

-- ============================================================================
-- TREE 1: MICROENTERPRISE ELIGIBILITY (Comprehensive)
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active)
VALUES (
  'microenterprise_full',
  'Regim Microîntreprindere - Ghid Complet',
  'Evaluare eligibilitate micro, alegere cotă impozit, calcul cost real',
  'business',
  true
);

-- Tree 1 Variables
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'microenterprise_full')
INSERT INTO legislation_variables (
  tree_id,
  variable_key,
  variable_name,
  current_value,
  data_type,
  effective_date,
  last_verified,
  verification_frequency_days
)
SELECT t.id, variable_key, variable_name, current_value, data_type, effective_date, last_verified, verification_frequency_days
FROM t, (VALUES
  ('micro_revenue_threshold', 'Prag venit micro', '500000', 'amount_eur', '2024-01-01', CURRENT_DATE, 365),
  ('micro_employee_threshold', 'Prag angajați micro', '9', 'number', '2024-01-01', CURRENT_DATE, 365),
  ('micro_tax_rate_1', 'Cotă micro activități generale', '0.01', 'percentage', '2024-01-01', CURRENT_DATE, 90),
  ('micro_tax_rate_3', 'Cotă micro consultanță >80%', '0.03', 'percentage', '2024-01-01', CURRENT_DATE, 90),
  ('micro_salary_minimum', 'Salariu minim brut', '3300', 'amount_ron', '2024-01-01', CURRENT_DATE, 180),
  ('profit_tax_rate', 'Cotă impozit pe profit', '0.16', 'percentage', '2024-01-01', CURRENT_DATE, 365),
  ('income_tax_rate_pfa', 'Cotă impozit venit PFA', '0.10', 'percentage', '2024-01-01', CURRENT_DATE, 365)
) AS v(variable_key, variable_name, current_value, data_type, effective_date, last_verified, verification_frequency_days);

-- Tree 1 Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'microenterprise_full')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'start_entity',
  'Ce formă juridică are afacerea ta?',
  'Regimul de microîntreprindere este disponibil DOAR pentru SRL-uri. PFA și II au alte regimuri fiscale.',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'microenterprise_full')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'check_revenue', n.id,
  'Ce venit anual (cifră de afaceri) estimezi pentru 2025?',
  'Pragul maxim pentru micro este {{micro_revenue_threshold}} EUR. Peste acest prag, plătești impozit pe profit 16%.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'start_entity';

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'microenterprise_full')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'check_employees', n.id,
  'Câți angajați ai (sau plănuiești să angajezi)?',
  'Micro cere maxim {{micro_employee_threshold}} angajați. Peste acest număr, treci automat la impozit pe profit.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'check_revenue';

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'microenterprise_full')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'check_consulting', n.id,
  'Ce procent din venit va fi consultanță/servicii cu caracter intelectual?',
  'Dacă >80% din venit e consultanță, cota crește de la 1% la 3%. Activități generale = 1%.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'check_employees';

-- Tree 1 Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'start_entity')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'srl', 'SRL (Societate cu Răspundere Limitată)', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'check_revenue';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'start_entity')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'pfa', 'PFA (Persoană Fizică Autorizată)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'start_entity')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'ii', 'II (Întreprindere Individuală)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'check_revenue')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'under_500k', 'Sub {{micro_revenue_threshold}} EUR', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'check_employees';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'check_revenue')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'over_500k', 'Peste {{micro_revenue_threshold}} EUR'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'check_employees')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'under_9_emp', 'Maxim {{micro_employee_threshold}} angajați', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'check_consulting';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'check_employees')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'over_9_emp', 'Peste {{micro_employee_threshold}} angajați'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'check_consulting')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'consulting_low', 'Sub 80% consultanță'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'check_consulting')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'consulting_high', 'Peste 80% consultanță'
FROM n;

-- Tree 1 Answers
WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'pfa')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>❌ Regim Microîntreprindere Indisponibil</h2>

<div class="alert alert-warning">
<strong>Formă juridică incompatibilă:</strong> Ești PFA, iar regimul micro este EXCLUSIV pentru SRL-uri.
</div>

<h3>Regimul Tău Fiscal (PFA):</h3>
<ul>
<li><strong>Impozit pe venit:</strong> {{income_tax_rate_pfa}}% din venitul net (venit brut - cheltuieli)</li>
<li><strong>CAS (pensie):</strong> 25% din venitul net (obligatoriu dacă venit > 12 salarii minime)</li>
<li><strong>CASS (sănătate):</strong> 10% din venitul net</li>
</ul>

<h3>Exemplu Calcul (100.000 RON venit brut, 30.000 RON cheltuieli):</h3>
<pre>
Venit net: 100.000 - 30.000 = 70.000 RON
Impozit (10%): 7.000 RON
CAS (25%): 17.500 RON
CASS (10%): 7.000 RON
──────────────────────────
Total taxe: 31.500 RON (45% din venit net)
</pre>

<h3>Vrei să treci pe SRL?</h3>
<p>Dacă vrei să accesezi micro (1-3% impozit), poți înființa un SRL. Costurile sunt:</p>
<ul>
<li>Certificat constatator: ~100 RON</li>
<li>Capital social minim: 200 RON (depunere în cont)</li>
<li>Taxe înregistrare: ~200 RON</li>
<li>Contabil lunar: 150-300 RON</li>
</ul>',
'["Consultă un contabil autorizat pentru PFA","Evaluează trecerea pe SRL pentru micro","Ține evidență strictă a cheltuielilor deductibile"]',
'{"Codul Fiscal": "Art. 68 - Impozitul pe venit PFA", "OUG 16/2022": "Actualizare cote CAS/CASS"}',
'31500'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'ii')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>❌ Regim Microîntreprindere Indisponibil</h2>

<div class="alert alert-warning">
<strong>Formă juridică incompatibilă:</strong> Ești II (Întreprindere Individuală), iar micro este EXCLUSIV pentru SRL.
</div>

<h3>Regimul Tău Fiscal (II):</h3>
<p>Similar cu PFA, II plătește impozit pe venit + CAS + CASS pe profit net:</p>
<ul>
<li><strong>Impozit pe venit:</strong> {{income_tax_rate_pfa}}% din profit</li>
<li><strong>CAS:</strong> 25% (obligatoriu peste prag)</li>
<li><strong>CASS:</strong> 10%</li>
</ul>

<p><strong>Avantaj II față de PFA:</strong> Patrimoniu separat (limitare răspundere personală parțială)</p>
<p><strong>Dezavantaj:</strong> Proceduri mai complexe decât PFA</p>',
'["Consultă contabil pentru II","Evaluează transformare în SRL pentru acces la micro"]',
'{"Codul Fiscal": "Art. 68 - Regim II"}',
'30000'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'over_500k')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>❌ Venit Peste Prag - Impozit pe Profit Obligatoriu</h2>

<div class="alert alert-danger">
<strong>Depășești pragul:</strong> Cu venit > {{micro_revenue_threshold}} EUR, nu poți aplica micro.
</div>

<h3>Regimul Tău: Impozit pe Profit {{profit_tax_rate}}%</h3>
<ul>
<li><strong>Cotă:</strong> {{profit_tax_rate}}% aplicat pe PROFIT (venit - cheltuieli)</li>
<li><strong>Cheltuieli deductibile:</strong> Salarii, chirie, utilități, materii prime, amortizare</li>
<li><strong>Declarație:</strong> Trimestrială (101) + anuală (100)</li>
</ul>

<h3>Exemplu Calcul (600.000 EUR venit, 400.000 EUR cheltuieli):</h3>
<pre>
Profit: 600.000 - 400.000 = 200.000 EUR
Impozit (16%): 32.000 EUR
──────────────────────────
Profit net: 168.000 EUR
</pre>

<h3>Avantaje Profit vs Micro:</h3>
<ul>
<li>✅ Fără limită venit sau angajați</li>
<li>✅ Deduci TOATE cheltuielile justificate</li>
<li>❌ Contabilitate mai complexă (500-1.500 RON/lună)</li>
<li>❌ Audit fiscal mai riguros</li>
</ul>',
'["Angajează contabil pentru profit (500-1.500 RON/lună)","Organizează evidență cheltuieli (crucial!)","Planifică plăți trimestriale","Evaluează oportunități optimizare (dividende, investiții)"]',
'{"Codul Fiscal": "Art. 17-30 - Impozit pe profit", "HG 1/2016": "Norme aplicare"}',
'60000'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'over_9_emp')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>❌ Peste Pragul de Angajați - Impozit pe Profit</h2>

<div class="alert alert-danger">
<strong>Depășești limita:</strong> Cu > {{micro_employee_threshold}} angajați, treci automat pe profit.
</div>

<h3>Motivul Restricției:</h3>
<p>Regimul micro este destinat afacerilor mici. Peste {{micro_employee_threshold}} angajați, legislația consideră că afacerea e suficient de mare pentru contabilitate profit (mai complexă, dar mai flexibilă).</p>

<h3>Tranziția la Profit:</h3>
<ul>
<li><strong>Data:</strong> Începând cu anul fiscal următor (sau imediat dacă depășești în cursul anului)</li>
<li><strong>Declarație:</strong> 010 actualizare la ANAF</li>
<li><strong>Contabil:</strong> Trebuie experiență profit (nu orice contabil micro poate)</li>
</ul>

<p>Vezi secțiunea anterioară pentru detalii despre impozitul pe profit.</p>',
'["Angajează contabil specializat profit","Actualizează declarația 010","Planifică tranziția (inventar, balanță)"]',
'{"Codul Fiscal": "Art. 48 - Micro, Art. 17 - Profit"}',
'55000'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'consulting_low')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>✅ ELIGIBIL - Microîntreprindere {{micro_tax_rate_1}}%</h2>

<div class="alert alert-success">
<strong>Felicitări!</strong> Îndeplinești toate condițiile pentru regimul micro cu cotă {{micro_tax_rate_1}}%.
</div>

<h3>Condițiile Tale:</h3>
<ul>
<li>✅ Formă juridică: SRL</li>
<li>✅ Venit estimat: < {{micro_revenue_threshold}} EUR</li>
<li>✅ Angajați: ≤ {{micro_employee_threshold}}</li>
<li>✅ Consultanță: < 80% (activități generale)</li>
</ul>

<h3>Ce Înseamnă Micro {{micro_tax_rate_1}}%?</h3>
<ul>
<li><strong>Impozit:</strong> {{micro_tax_rate_1}}% din VENIT (nu profit!)</li>
<li><strong>Fără deduceri cheltuieli</strong> la calculul impozitului</li>
<li><strong>Simplitate:</strong> Doar registru incasări-plăți</li>
<li><strong>Contabilitate:</strong> Minimă (150-300 RON/lună)</li>
</ul>

<h3>Calcul Real - Exemplu 200.000 RON venit anual:</h3>
<pre>
Impozit micro (1%): 2.000 RON/an (167 RON/lună)
Contabil: 2.400 RON/an (200 RON/lună)
Salariu minim partener (obligatoriu): 39.600 RON/an
  - brut: 3.300 RON/lună
  - net: ~2.145 RON/lună
  - CAS angajator (4%): 132 RON/lună
──────────────────────────────────────────
Total costuri fixe: ~44.000 RON/an
Profit disponibil: 156.000 RON
Impozit dividend (8%): 12.480 RON
──────────────────────────────────────────
PROFIT NET FINAL: 143.520 RON (71.7% din venit)
</pre>

<h3>Cum Optezi pentru Micro?</h3>
<ol>
<li><strong>La înființare:</strong> Bifezi opțiunea în declarația 010</li>
<li><strong>Dacă SRL existent:</strong> Depui 010 actualizare până pe <strong>31 ianuarie</strong> pentru anul curent</li>
<li><strong>Condiție obligatorie:</strong> Minim 1 angajat (poate fi asociatul unic)</li>
</ol>

<div class="alert alert-warning">
<strong>ATENȚIE:</strong> Dacă în cursul anului depășești {{micro_revenue_threshold}} EUR sau {{micro_employee_threshold}} angajați, treci AUTOMAT pe profit de la trimestrul următor!
</div>',
'["Depune declarația 010 cu opțiune micro (deadline: 31 ianuarie)","Angajează contabil micro (150-300 RON/lună)","Asigură-te că ai minim 1 angajat contractat","Monitorizează pragurile (venit + angajați) lunar","Plătește impozit micro trimestrial (declarația 100)"]',
'{"Codul Fiscal": "Art. 48-52 - Micro", "OUG 16/2022": "Actualizare cote și praguri"}',
'44000'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'consulting_high')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>✅ ELIGIBIL - Microîntreprindere {{micro_tax_rate_3}}%</h2>

<div class="alert alert-success">
<strong>Eligibil micro, dar cotă MAJORATĂ!</strong> Activitatea ta e preponderent consultanță (>80%), deci cota e {{micro_tax_rate_3}}%.
</div>

<h3>Condițiile Tale:</h3>
<ul>
<li>✅ Formă juridică: SRL</li>
<li>✅ Venit estimat: < {{micro_revenue_threshold}} EUR</li>
<li>✅ Angajați: ≤ {{micro_employee_threshold}}</li>
<li>⚠️ Consultanță: > 80% → cotă {{micro_tax_rate_3}}%</li>
</ul>

<h3>De Ce Cotă Mai Mare?</h3>
<p>Legislația presupune că serviciile intelectuale (consultanță, IT, design, contabilitate) au marje mari și cheltuieli mici, deci cotă majorată pentru echitate fiscală.</p>

<h3>Ce e Considerată "Consultanță"?</h3>
<ul>
<li>Servicii IT (dezvoltare software, consultanță tehnologică)</li>
<li>Servicii financiar-contabile</li>
<li>Consultanță management/juridică</li>
<li>Servicii marketing/publicitate</li>
<li>Arhitectură, design</li>
</ul>

<p><strong>Excepție:</strong> Dacă poți dovedi că <80% e consultanță (ex: vinzi și produse), cota scade la {{micro_tax_rate_1}}%.</p>

<h3>Calcul Real - Exemplu 200.000 RON venit anual:</h3>
<pre>
Impozit micro (3%): 6.000 RON/an (500 RON/lună)
Contabil: 2.400 RON/an (200 RON/lună)
Salariu minim partener: 39.600 RON/an
  - brut: 3.300 RON/lună
  - net: ~2.145 RON/lună
  - CAS angajator (4%): 132 RON/lună
──────────────────────────────────────────
Total costuri fixe: ~48.000 RON/an
Profit disponibil: 152.000 RON
Impozit dividend (8%): 12.160 RON
──────────────────────────────────────────
PROFIT NET FINAL: 139.840 RON (69.9% din venit)
</pre>

<h3>Comparație Micro 3% vs Profit 16%:</h3>
<table>
<tr><th>Regim</th><th>Impozit/an</th><th>Contabil</th><th>Profit net</th></tr>
<tr><td>Micro 3%</td><td>6.000 RON</td><td>2.400 RON</td><td>139.840 RON</td></tr>
<tr><td>Profit 16%</td><td>~9.600 RON*</td><td>6.000 RON</td><td>~138.000 RON</td></tr>
</table>
<p><em>*Presupunând 60.000 RON cheltuieli deductibile</em></p>

<p><strong>Concluzie:</strong> Micro 3% e tot avantajos dacă cheltuielile tale sunt mici!</p>',
'["Depune 010 cu micro 3% (mențiune consultanță >80%)","Contabil micro (150-300 RON/lună)","Minim 1 angajat obligatoriu","Monitorizare praguri lunar","Plată impozit trimestrial"]',
'{"Codul Fiscal": "Art. 52 alin. 2 - Cotă 3% consultanță", "OUG 16/2022": "Actualizare"}',
'48000'
FROM p;

-- Tree 1 Update Points
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'microenterprise_full')
INSERT INTO update_points (
  tree_id,
  update_key,
  data_point,
  current_value,
  source,
  criticality,
  verification_frequency_days,
  next_verification_date,
  category,
  auto_updateable
)
SELECT t.id, update_key, data_point, current_value, source, criticality, verification_frequency_days, next_verification_date, category, auto_updateable
FROM t, (VALUES
  ('micro_rev_threshold', 'Prag venit maxim micro', '500.000 EUR', 'Codul Fiscal Art. 48', 'critical', 365, CURRENT_DATE + 365, 'threshold', true),
  ('micro_emp_threshold', 'Prag angajați maxim micro', '9', 'Codul Fiscal Art. 48', 'critical', 365, CURRENT_DATE + 365, 'threshold', true),
  ('micro_rate_1', 'Cotă impozit micro general', '1%', 'Codul Fiscal Art. 52', 'critical', 90, CURRENT_DATE + 90, 'tax_rate', true),
  ('micro_rate_3', 'Cotă impozit micro consultanță', '3%', 'Codul Fiscal Art. 52', 'critical', 90, CURRENT_DATE + 90, 'tax_rate', true),
  ('profit_rate', 'Cotă impozit pe profit', '16%', 'Codul Fiscal Art. 17', 'high', 365, CURRENT_DATE + 365, 'tax_rate', true),
  ('min_salary', 'Salariu minim brut', '3.300 RON', 'HG Guvern', 'high', 180, CURRENT_DATE + 180, 'threshold', true),
  ('micro_deadline', 'Deadline optare micro', '31 ianuarie', 'Procedură ANAF', 'critical', 365, CURRENT_DATE + 365, 'deadline', false)
) AS v(update_key, data_point, current_value, source, criticality, verification_frequency_days, next_verification_date, category, auto_updateable);

-- ============================================================================
-- TREE 2: HIRING PROCESS (Comprehensive)
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active)
VALUES (
  'hiring_full',
  'Angajare Salariat - Proceduri Complete',
  'Ghid pas-cu-pas angajare: primul angajat vs suplimentar, costuri reale, termene',
  'hr',
  true
);

-- Tree 2 Variables
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'hiring_full')
INSERT INTO legislation_variables (
  tree_id,
  variable_key,
  variable_name,
  current_value,
  data_type,
  effective_date,
  last_verified,
  verification_frequency_days
)
SELECT t.id, variable_key, variable_name, current_value, data_type, effective_date, last_verified, verification_frequency_days
FROM t, (VALUES
  ('min_gross_salary', 'Salariu minim brut', '3300', 'amount_ron', '2024-01-01', CURRENT_DATE, 180),
  ('cas_employee', 'CAS angajat', '0.25', 'percentage', '2024-01-01', CURRENT_DATE, 180),
  ('cass_employee', 'CASS angajat', '0.10', 'percentage', '2024-01-01', CURRENT_DATE, 180),
  ('cas_employer', 'CAS angajator', '0.04', 'percentage', '2024-01-01', CURRENT_DATE, 180),
  ('income_tax', 'Impozit pe venit salariat', '0.10', 'percentage', '2024-01-01', CURRENT_DATE, 180)
) AS v(variable_key, variable_name, current_value, data_type, effective_date, last_verified, verification_frequency_days);

-- Tree 2 Nodes (more detailed)
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'hiring_full')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'first_or_additional',
  'Este primul angajat al firmei?',
  'Primul angajat necesită proceduri administrative suplimentare (cont REVISAL, declarație 010). Angajații suplimentari au proceduri simplificate.',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'hiring_full')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'contract_type', n.id,
  'Ce tip de contract vrei să folosești?',
  'Contractul individual de muncă (CIM) standard e nelimitat. Contractul determinat (CDD) e limitat în timp (max 3 ani cu prelungiri).',
  false
FROM t, decision_nodes n WHERE n.node_key = 'first_or_additional';

-- Tree 2 Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'first_or_additional')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'first_employee', 'Da - Primul angajat', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'contract_type';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'first_or_additional')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'additional_employee', 'Nu - Angajat suplimentar', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'contract_type';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'contract_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'cim_unlimited', 'Contract nelimitat (CIM)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'contract_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'cdd_limited', 'Contract determinat (CDD)'
FROM n;

-- Tree 2 Answers (comprehensive)
WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'first_or_additional' AND dp.path_key = 'first_employee'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>👥 PRIMUL ANGAJAT - Proceduri Complete</h2>

<div class="alert alert-info">
<strong>Felicitări pentru extinderea echipei!</strong> Primul angajat necesită pași administrativi importanți, dar procesul e bine definit.
</div>

<h3>📋 CHECKLIST COMPLETĂ (cu termene):</h3>

<h4>1. ANAF - Declarație 010 Actualizare (-20 zile lucrătoare)</h4>
<ul>
<li><strong>Ce:</strong> Înregistrare calitate angajator la ANAF</li>
<li><strong>Unde:</strong> Online (spațiul privat virtual) sau la sediul ANAF</li>
<li><strong>Documente:</strong>
  <ul>
  <li>Declarație 010 (secțiunea D - angajator)</li>
  <li>Hotărâre AGA (dacă e asociat angajat)</li>
  <li>Act identitate reprezentant legal</li>
  </ul>
</li>
<li><strong>Termen:</strong> Cu minim 20 zile înainte de încheierea contractului</li>
</ul>

<h4>2. REVISAL - Cont Angajator (-10 zile)</h4>
<ul>
<li><strong>Ce:</strong> Registrul electronic de evidență a salariaților</li>
<li><strong>Unde:</strong> <a href="https://www.revisal.ro" target="_blank">www.revisal.ro</a></li>
<li><strong>Procedură:</strong>
  <ol>
  <li>Creare cont cu certificat digital</li>
  <li>Înregistrare firma ca angajator</li>
  <li>Validare de către ITM (2-3 zile)</li>
  </ol>
</li>
<li><strong>Cost certificat digital:</strong> ~150 RON/an</li>
</ul>

<h4>3. Control Medical Pre-Angajare (-3 zile)</h4>
<ul>
<li><strong>Ce:</strong> Fișă aptitudine medicală pentru post</li>
<li><strong>Unde:</strong> Medicina muncii autorizată</li>
<li><strong>Cost:</strong> 100-200 RON</li>
<li><strong>Valabilitate:</strong> Variază per post (6 luni - 2 ani)</li>
</ul>

<h4>4. Contract Individual de Muncă (Ziua 0)</h4>
<ul>
<li><strong>Conținut obligatoriu:</strong>
  <ul>
  <li>Date părți (angajator + angajat)</li>
  <li>Funcție, atribuții, loc muncă</li>
  <li>Salariu brut (minim {{min_gross_salary}} RON)</li>
  <li>Program lucru, concediu (21 zile/an minim)</li>
  <li>Durata (nedeterminată sau determinată)</li>
  </ul>
</li>
<li><strong>Semnare:</strong> 2 exemplare (angajat + angajator)</li>
</ul>

<h4>5. Înregistrare REVISAL Contract (Ziua 0)</h4>
<ul>
<li><strong>Termen:</strong> ÎNAINTE de începerea activității (același ziua sau cu o zi înainte)</li>
<li><strong>Procedură:</strong> Încarci contract PDF în REVISAL</li>
<li><strong>ATENȚIE:</strong> Întârzieri = AMENZI (1.500-3.000 RON/angajat)</li>
</ul>

<h3>💰 COST REAL - Calcul Detaliat (Salariu Minim):</h3>

<h4>La salariu brut {{min_gross_salary}} RON:</h4>
<pre>
COSTURI ANGAJATOR:
──────────────────────────────────────
Salariu brut:           3.300 RON
CAS angajator (4%):       132 RON
──────────────────────────────────────
TOTAL COST ANGAJATOR:   3.432 RON/lună

DEDUCERI ANGAJAT:
──────────────────────────────────────
CAS angajat (25%):      - 825 RON
CASS angajat (10%):     - 330 RON
                        ─────────
Bază impozabilă:        2.145 RON
Impozit venit (10%):    - 214,5 RON
──────────────────────────────────────
SALARIU NET ANGAJAT:    1.930,5 RON
</pre>

<h4>Costuri administrative inițiale (ONE-TIME):</h4>
<ul>
<li>Certificat digital REVISAL: 150 RON</li>
<li>Control medical: 150 RON</li>
<li>Taxe administrative: ~50 RON</li>
<li><strong>Total setup:</strong> ~350 RON</li>
</ul>

<h4>Costuri lunare recurente:</h4>
<ul>
<li>Salariu brut + CAS: 3.432 RON</li>
<li>Contabil salarizare: 150-300 RON</li>
<li><strong>Total lunar:</strong> ~3.600 RON</li>
</ul>

<h3>📄 Obligații Lunare După Angajare:</h3>
<ol>
<li><strong>Declarație 112</strong> (până pe 25 a lunii următoare):
  <ul>
  <li>Raportare salarii + CAS/CASS/impozit</li>
  <li>Depunere online (spațiu privat ANAF)</li>
  </ul>
</li>
<li><strong>Plată contribuții</strong> (până pe 25):
  <ul>
  <li>CAS angajat + angajator</li>
  <li>CASS angajat</li>
  <li>Impozit pe venit angajat</li>
  </ul>
</li>
<li><strong>Evidență pontaj</strong>:
  <ul>
  <li>Foaie pontaj sau sistem electronic</li>
  <li>Obligatorie pentru ITM</li>
  </ul>
</li>
</ol>

<div class="alert alert-warning">
<strong>CONDIȚIE MICRO:</strong> Dacă ești pe micro, TREBUIE să ai minim 1 angajat pentru a păstra regimul!
</div>',
'["Depune declarația 010 ANAF cu minim 20 zile înainte","Creează cont REVISAL (certificat digital necesar)","Programează control medical angajat","Pregătește contract individual de muncă","Înregistrează contract în REVISAL înainte de ziua 1","Angajează contabil pentru salarizare (150-300 RON/lună)","Configurează plăți automate contribuții (pentru a evita întârzieri)"]',
'{"Codul Muncii": "Art. 16-40 - CIM", "OUG 53/2017": "REVISAL obligatoriu", "Codul Fiscal": "Art. 137-168 - Contribuții sociale"}',
'3600'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'first_or_additional' AND dp.path_key = 'additional_employee'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>👥 ANGAJAT SUPLIMENTAR - Procedură Simplificată</h2>

<div class="alert alert-success">
<strong>Veste bună:</strong> Deja ai cont angajator, procedura e mult mai simplă decât pentru primul angajat!
</div>

<h3>📋 CHECKLIST SIMPLIFICATĂ:</h3>

<h4>1. Control Medical Pre-Angajare (-3 zile)</h4>
<ul>
<li>Fișă aptitudine medicală</li>
<li>Cost: 100-200 RON</li>
</ul>

<h4>2. Contract Individual de Muncă (Ziua 0)</h4>
<ul>
<li>Același format ca primul angajat</li>
<li>Salariu minim {{min_gross_salary}} RON (sau mai mult)</li>
<li>2 exemplare semnate</li>
</ul>

<h4>3. Înregistrare REVISAL (Ziua 0 - ÎNAINTE de începerea activității)</h4>
<ul>
<li>Încărcare contract în REVISAL</li>
<li><strong>ATENȚIE:</strong> Obligatoriu înainte de ziua 1!</li>
</ul>

<h3>💰 COST LUNAR PER ANGAJAT:</h3>
<pre>
La salariu minim {{min_gross_salary}} RON:
──────────────────────────────────────
Cost angajator:   3.432 RON
Contabil (+1 pers): +50 RON (creștere marginală)
──────────────────────────────────────
TOTAL INCREMENTAL: 3.482 RON/lună
</pre>

<h3>Diferențe față de Primul Angajat:</h3>
<table>
<tr><th>Procedură</th><th>Primul Angajat</th><th>Angajat Suplimentar</th></tr>
<tr><td>Declarație 010 ANAF</td><td>✅ Obligatoriu</td><td>❌ Nu</td></tr>
<tr><td>Cont REVISAL</td><td>✅ Creare</td><td>❌ Ai deja</td></tr>
<tr><td>Certificat digital</td><td>✅ 150 RON</td><td>❌ Folosești existentul</td></tr>
<tr><td>Declarație 112</td><td>✅ Lunară</td><td>✅ Lunară (toți angajații)</td></tr>
</table>

<h3>📄 Obligații Lunare (Toți Angajații):</h3>
<ol>
<li><strong>Declarație 112 consolidată</strong> (până pe 25):
  <ul>
  <li>Include TOȚI angajații</li>
  <li>Salarii individuale + contribuții</li>
  </ul>
</li>
<li><strong>Plată contribuții totale</strong> (până pe 25):
  <ul>
  <li>Suma CAS/CASS/impozit pentru toți angajații</li>
  </ul>
</li>
</ol>

<div class="alert alert-info">
<strong>SFAT:</strong> Contabilul va gestiona automat 112 consolidat. Tu doar asigură-te că transmiti corect:
<ul>
<li>Pontajul lunar (zile lucrate, concedii, absențe)</li>
<li>Salarii și bonusuri</li>
<li>Deduceri personale (dacă există)</li>
</ul>
</div>',
'["Control medical angajat nou","Pregătește contract de muncă","Înregistrează în REVISAL înainte de ziua 1","Actualizează declarația 112 cu noul angajat","Informează contabilul despre angajarea nouă"]',
'{"Codul Muncii": "Art. 16-40 - CIM", "OUG 53/2017": "REVISAL"}',
'3482'
FROM p;

-- Tree 2 Update Points
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'hiring_full')
INSERT INTO update_points (
  tree_id,
  update_key,
  data_point,
  current_value,
  source,
  criticality,
  verification_frequency_days,
  next_verification_date,
  category,
  auto_updateable
)
SELECT t.id, update_key, data_point, current_value, source, criticality, verification_frequency_days, next_verification_date, category, auto_updateable
FROM t, (VALUES
  ('min_salary_hiring', 'Salariu minim brut', '3.300 RON', 'HG Guvern', 'critical', 180, CURRENT_DATE + 180, 'threshold', true),
  ('cas_employee_rate', 'CAS angajat', '25%', 'Codul Fiscal Art. 137', 'critical', 180, CURRENT_DATE + 180, 'tax_rate', true),
  ('cass_employee_rate', 'CASS angajat', '10%', 'Codul Fiscal Art. 156', 'critical', 180, CURRENT_DATE + 180, 'tax_rate', true),
  ('cas_employer_rate', 'CAS angajator', '4%', 'Codul Fiscal Art. 137', 'critical', 180, CURRENT_DATE + 180, 'tax_rate', true),
  ('income_tax_rate', 'Impozit pe venit salariat', '10%', 'Codul Fiscal Art. 68', 'high', 180, CURRENT_DATE + 180, 'tax_rate', true),
  ('revisal_deadline', 'Termen REVISAL', 'Înainte de începere activitate', 'OUG 53/2017', 'critical', 365, CURRENT_DATE + 365, 'deadline', false),
  ('d112_deadline', 'Termen declarație 112', 'Ziua 25 luna următoare', 'Cod procedură fiscală', 'critical', 365, CURRENT_DATE + 365, 'deadline', false)
) AS v(update_key, data_point, current_value, source, criticality, verification_frequency_days, next_verification_date, category, auto_updateable);

-- ============================================================================
-- TREE 3: DEDUCTIBLE EXPENSES (Comprehensive)
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active)
VALUES (
  'expenses_full',
  'Cheltuieli Deductibile - Ghid Fiscal',
  'Regulamente cheltuieli deductibile: protocol, deplasări, utilități, limite legale',
  'accounting',
  true
);

-- Tree 3 Variables
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'expenses_full')
INSERT INTO legislation_variables (
  tree_id,
  variable_key,
  variable_name,
  current_value,
  data_type,
  effective_date,
  last_verified,
  verification_frequency_days
)
SELECT t.id, variable_key, variable_name, current_value, data_type, effective_date, last_verified, verification_frequency_days
FROM t, (VALUES
  ('protocol_limit', 'Limită cheltuieli protocol', '0.025', 'percentage', '2024-01-01', CURRENT_DATE, 180),
  ('gift_max_value', 'Valoare maximă cadou', '300', 'amount_ron', '2024-01-01', CURRENT_DATE, 180),
  ('diurna_romania', 'Diurnă România', '25', 'amount_ron', '2024-01-01', CURRENT_DATE, 180),
  ('diurna_eu', 'Diurnă medie UE', '50', 'amount_eur', '2024-01-01', CURRENT_DATE, 180)
) AS v(variable_key, variable_name, current_value, data_type, effective_date, last_verified, verification_frequency_days);

-- Tree 3 Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'expenses_full')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'expense_category',
  'Ce tip de cheltuială vrei să deduci fiscal?',
  'Fiecare categorie are reguli specifice de documentare și limite legale pentru deductibilitate.',
  false
FROM t;

-- Tree 3 Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'expense_category')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'protocol', 'Cheltuieli de protocol (mese afaceri, cadouri, recepții)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'expense_category')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'travel', 'Deplasări în interes de serviciu'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'expense_category')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'utilities', 'Utilități și chirie spațiu'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'expense_category')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'marketing', 'Marketing și publicitate'
FROM n;

-- Tree 3 Answers (ultra-comprehensive)
WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'protocol')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>🍽️ CHELTUIELI DE PROTOCOL - Ghid Complet</h2>

<div class="alert alert-warning">
<strong>ATENȚIE - Limită strictă:</strong> Maxim {{protocol_limit}}% (2,5%) din cheltuielile cu salariile!
</div>

<h3>Ce Intră în Protocol?</h3>
<ul>
<li><strong>Mese de afaceri:</strong> Restaurante cu clienți, parteneri, furnizori</li>
<li><strong>Cadouri:</strong> Maxim {{gift_max_value}} RON/bucată (cu TVA)</li>
<li><strong>Recepții:</strong> Evenimente corporate, cocktail-uri, lansări produse</li>
<li><strong>Materiale promoționale branduite:</strong> Pixuri, agende, șepci cu logo</li>
</ul>

<h3>Ce NU Intră în Protocol?</h3>
<ul>
<li>❌ Mese între angajați (fără client extern)</li>
<li>❌ Cadouri nepersonalizate (fără logo firmă)</li>
<li>❌ Cheltuieli personale (chiar dacă plătite de firmă)</li>
<li>❌ Alcool excesiv (peste limitele rezonabile)</li>
</ul>

<h3>📊 Calcul Limită - Exemplu Real:</h3>
<pre>
Cheltuieli salarii anuale: 200.000 RON
  (include: salarii brute + CAS angajator)

Limită protocol (2,5%): 200.000 × 0.025 = 5.000 RON/an
──────────────────────────────────────────────────
Buget lunar protocol: ~417 RON

Exemple cheltuieli în limită:
- 2 mese afaceri × 200 RON = 400 RON ✅
- 5 cadouri × 80 RON = 400 RON ✅
Total lună: 800 RON ❌ DEPĂȘIRE!
</pre>

<div class="alert alert-danger">
<strong>Consecințe depășire limită:</strong>
<ul>
<li>Partea peste 2,5% = nedeductibilă fiscal</li>
<li>Impozitare la profit 16% pe suma nedeductibilă</li>
<li>Posibile sancțiuni la control ANAF</li>
</ul>
</div>

<h3>📄 Documentare Obligatorie (CUMULATIV!):</h3>

<h4>1. Factură/bon fiscal</h4>
<ul>
<li>Cu datele firmei</li>
<li>Detalii produse/servicii</li>
<li>TVA separat</li>
</ul>

<h4>2. Proces verbal de protocol</h4>
<ul>
<li><strong>Conținut:</strong>
  <ul>
  <li>Data și locul evenimentului</li>
  <li>Participanți (nume, funcții, firme)</li>
  <li>Scopul economic (ex: "Întâlnire comercială contract X")</li>
  <li>Detalii cheltuieli (ce s-a consumat/oferit)</li>
  </ul>
</li>
<li><strong>Semnături:</strong> Reprezentant firmă + minim 1 participant</li>
</ul>

<h4>3. Justificare scop economic</h4>
<ul>
<li>Legătură cu activitatea firmei</li>
<li>Dovezi contract/ofertă/negociere</li>
<li>Email-uri, corespondență cu clientul</li>
</ul>

<h3>🎁 Reguli Speciale Cadouri:</h3>

<table>
<tr><th>Tip cadou</th><th>Valoare max</th><th>Condiții</th><th>Deductibil</th></tr>
<tr>
  <td>Cadou branduit</td>
  <td>300 RON</td>
  <td>Logo firmă vizibil</td>
  <td>✅ DA (în limita 2,5%)</td>
</tr>
<tr>
  <td>Cadou fără logo</td>
  <td>Orice</td>
  <td>-</td>
  <td>❌ NU</td>
</tr>
<tr>
  <td>Cadou angajat</td>
  <td>150 RON</td>
  <td>Crăciun, Paște, 1 Martie/8 Martie</td>
  <td>✅ DA (limitat)</td>
</tr>
<tr>
  <td>Cadou copil angajat</td>
  <td>300 RON</td>
  <td>1 Iunie, Crăciun</td>
  <td>✅ DA</td>
</tr>
</table>

<h3>✅ BUNE PRACTICI:</h3>
<ol>
<li><strong>Evidență separată protocol:</strong> Dosar special cu toate PV-uri și facturi</li>
<li><strong>Planificare buget:</strong> Monitorizează lunar vs limită 2,5%</li>
<li><strong>Fotografii evenimente:</strong> Dovezi suplimentare (recepții, lansări)</li>
<li><strong>Agendă întâlniri:</strong> Note despre scopul întâlnirilor de afaceri</li>
<li><strong>Evită excesele:</strong> Mesele >500 RON/persoană pot fi problematice la control</li>
</ol>

<div class="alert alert-info">
<strong>SFAT FISCAL:</strong> Dacă ai buget mare protocol (ex: industrie luxury, evenimente), discută cu contabilul despre:
<ul>
<li>Clasificare parțială în marketing (dacă e promotional)</li>
<li>Sponsorizări (reguli diferite)</li>
<li>Evenimente de team building (pot fi 100% deductibile ca formare profesională)</li>
</ul>
</div>',
'["Creează dosar \"Protocol\" pentru evidență","Calculează limita 2,5% din salarii anual","Redactează proces verbal după fiecare masă/cadou","Păstrează corespondență cu clienții (proof of business purpose)","Verifică lunar: protocol cumulat vs limită","Consultă contabilul pentru clasificare corectă cheltuieli borderline"]',
'{"Codul Fiscal": "Art. 25 alin. 3 - Limită protocol", "Normele Cod Fiscal": "Art. 25 - Detalii protocol"}',
'5000'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'travel')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>✈️ DEPLASĂRI ÎN INTERES DE SERVICIU - Ghid Complet</h2>

<div class="alert alert-success">
<strong>Veste bună:</strong> 100% deductibile fiscal cu documentare corectă!
</div>

<h3>Ce Intră în Deplasări?</h3>
<ul>
<li>✅ Transport (avion, tren, autocar, taxi, mașină personal/firmă)</li>
<li>✅ Cazare (hotel, Airbnb cu factură)</li>
<li>✅ Diurnă (indemnizație zilnică - FĂRĂ factură)</li>
<li>✅ Parcare, taxe drum, roviniete</li>
<li>✅ Mese în limita diurnei (sau separate dacă sunt peste)</li>
</ul>

<h3>📄 Documentare Obligatorie:</h3>

<h4>1. ORDIN DE DEPLASARE (ÎNAINTE de plecare!)</h4>
<p><strong>Model:</strong></p>
<pre>
ORDIN DE DEPLASARE Nr. ___ / [Data]

Angajat: [Nume, Funcție]
Destinație: [Oraș, Țară]
Perioada: [Data plecare] - [Data întoarcere]
Scop: [Descriere detaliată: "Întâlnire client X pentru contract Y",
       "Participare conferință Z", "Vizită furnizor W"]
Mijloc transport: [Avion / Tren / Mașină personal/firmă]

Cheltuieli autorizate:
- Transport: max [suma] RON/EUR
- Cazare: max [suma] RON/EUR
- Diurnă: [valoare] RON/EUR/zi × [nr zile]

Director: _______________    Angajat: _______________
</pre>

<h4>2. DOCUMENTE TRANSPORT</h4>
<ul>
<li><strong>Avion:</strong> Boarding pass + factură bilet</li>
<li><strong>Tren:</strong> Bilet + factură</li>
<li><strong>Mașină personală:</strong>
  <ul>
  <li>Foaie de parcurs (km început/final, rută)</li>
  <li>Decontare: 2,5 RON/km (sau costuri reale combustibil)</li>
  <li>Bonuri benzinărie (dacă decontezi real)</li>
  </ul>
</li>
<li><strong>Taxi:</strong> Bon fiscal de la firmă autorizată</li>
</ul>

<h4>3. CAZARE</h4>
<ul>
<li>Factură hotel (cu date firmă)</li>
<li>Confirmare rezervare</li>
<li>Pentru Airbnb: Factură + chitanță plată</li>
</ul>

<h4>4. RAPORT DE DEPLASARE (La întoarcere!)</h4>
<p><strong>Model:</strong></p>
<pre>
RAPORT DEPLASARE - [Destinație] [Date]

Angajat: [Nume]
Scop deplasare: [Descriere]

Activități desfășurate:
- [Data 1]: [Activitate - ex: "Întâlnire client X, negociere contract"]
- [Data 2]: [Activitate]

Rezultate:
- [Contract semnat / Ofertă trimisă / Parteneriat stabilit / etc]

Cheltuieli efectuate:
- Transport: [suma] RON (anexă: bilet/bon)
- Cazare: [suma] RON (anexă: factură hotel)
- Diurnă: [suma] RON ([zile] × [tarif])
- Altele: [suma] RON (detalii)
──────────────────────
TOTAL: [suma] RON

Semnătură angajat: ___________    Data: ___________
Aprobat director: ___________      Data: ___________
</pre>

<h3>💰 DIURNĂ - Tarife Legale Maxime Deductibile:</h3>

<table>
<tr><th>Destinație</th><th>Diurnă maximă deductibilă</th><th>Obs</th></tr>
<tr><td>România</td><td>{{diurna_romania}} RON/zi</td><td>Fără limită superioară legală</td></tr>
<tr><td>Țări UE (medie)</td><td>~{{diurna_eu}} EUR/zi</td><td>Variază per țară*</td></tr>
<tr><td>SUA</td><td>~70 USD/zi</td><td>Orașe mari: până la 100 USD</td></tr>
</table>

<p><em>*Diurne specifice per țară disponibile la <a href="https://static.anaf.ro/static/10/Anaf/legislatie/diurne.htm" target="_blank">ANAF - Tarife diurnă</a></em></p>

<div class="alert alert-info">
<strong>Diurna NU se justifică cu bonuri!</strong> E indemnizație forfetară pentru mese + mici cheltuieli. Angajatul o primește integral, iar firma o deduce fiscal 100%.
</div>

<h3>🚗 Mașină Personală - Calcul Decontare:</h3>

<h4>Opțiunea 1: Tarif fix (RECOMANDAT)</h4>
<pre>
Exemplu: Deplasare București - Cluj (450 km dus-întors)
450 km × 2,5 RON/km = 1.125 RON deductibil
──────────────────────────────────────────
Avantaj: Simplu, fără bonuri combustibil
Dezavantaj: Dacă consumul e mare, poți pierde bani
</pre>

<h4>Opțiunea 2: Costuri reale</h4>
<pre>
Combustibil: 300 RON (bonuri benzinărie)
Roviniete: 20 RON
Parcare: 50 RON
──────────────────────────────────────────
TOTAL: 370 RON deductibil
</pre>

<h3>✅ CHECKLIST Deplasare Completă:</h3>
<ol>
<li>☐ Ordin deplasare semnat ÎNAINTE de plecare</li>
<li>☐ Păstrare TOATE biletele (transport, cazare, parcare)</li>
<li>☐ Foaie parcurs completată (dacă mașină personală)</li>
<li>☐ Raport deplasare în max 3 zile de la întoarcere</li>
<li>☐ Anexare documente la raport (scanate/originale)</li>
<li>☐ Decontare în max 10 zile (procedură internă)</li>
</ol>

<h3>❌ ERORI FRECVENTE (Evită-le!):</h3>
<ul>
<li>❌ Ordin de deplasare semnat DUPĂ întoarcere (nedoductibil!)</li>
<li>❌ Bonuri fără date firmă (neconform)</li>
<li>❌ Diurnă mai mare decât tarifele ANAF (excesul e impozabil la angajat)</li>
<li>❌ Lipsă raport deplasare (ANAF îl cere la control)</li>
<li>❌ Scop vag ("deplasare de serviciu" fără detalii)</li>
</ul>

<div class="alert alert-warning">
<strong>ATENȚIE CONTROALE ANAF:</strong> Deplasările sunt supuse verificării amănunțite. ANAF verifică:
<ul>
<li>Corelație ordin ↔ activitate firmă</li>
<li>Justificare economică (de ce era necesară deplasarea?)</li>
<li>Prețuri realiste (nu se admit excese nejustificate)</li>
</ul>
</div>',
'["Creează template ordin deplasare (Word/PDF editabil)","Instruiește angajații: păstrare TOATE bonurile","Implementează proces: Ordin → Deplasare → Raport (max 3 zile)","Dosar \"Deplasări\" cu toate documentele pe anul","Verifică tarife diurnă ANAF anual (se pot actualiza)","Configurare app/Excel pentru foaie parcurs automată"]',
'{"Codul Fiscal": "Art. 25 alin. 4 - Cheltuieli deplasare", "ANAF - Tarife diurnă": "Actualizate periodic", "Codul Muncii": "Art. 162-164 - Delegare/detașare"}',
'15000'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'utilities')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>💡 UTILITĂȚI & CHIRIE - Deductibilitate Fiscală</h2>

<div class="alert alert-success">
<strong>Regula generală:</strong> 100% deductibile pentru spații cu destinație exclusiv business!
</div>

<h3>Ce Intră în Utilități?</h3>
<ul>
<li>✅ Chirie birou/spațiu comercial/depozit</li>
<li>✅ Energie electrică</li>
<li>✅ Apă/canal</li>
<li>✅ Încălzire/gaz</li>
<li>✅ Internet + telefonie fixă</li>
<li>✅ Salubritate</li>
<li>✅ Securitate/pază (dacă e pentru birou)</li>
<li>✅ Întreținere clădire (la apartament/spațiu închiriat)</li>
</ul>

<h3>📍 SITUAȚII DIFERITE:</h3>

<h4>Caz 1: Birou Închiriat (Spațiu Dedicat Business)</h4>
<div class="alert alert-success">
<strong>Deductibilitate: 100%</strong>
</div>
<p><strong>Condiții:</strong></p>
<ul>
<li>Contract de închiriere PE FIRMĂ (nu pe persoană fizică!)</li>
<li>Spațiu folosit exclusiv pentru activitate comercială</li>
<li>Factură utilități pe firmă (sau repartizare din chirie)</li>
</ul>
<p><strong>Documente:</strong></p>
<ul>
<li>Contract închiriere (firmă = chiriaș)</li>
<li>Factură chiriei (lunară)</li>
<li>Facturi utilități (direct sau incluse în chirie)</li>
</ul>

<h4>Caz 2: Birou în Spațiu Propriu (Firmă Deține Imobilul)</h4>
<div class="alert alert-success">
<strong>Deductibilitate: 100% utilități business</strong>
</div>
<p><strong>Situație:</strong> SRL deține imobilul (pe bilanț)</p>
<p><strong>Deductibile:</strong></p>
<ul>
<li>✅ Toate utilitățile (electric, apă, încălzire, etc)</li>
<li>✅ Amortizare imobil (deductibil treptat în ani)</li>
<li>✅ Reparații, întreținere, renovări</li>
<li>❌ Chiria nu există (firmă = proprietar)</li>
</ul>

<h4>Caz 3: Birou ACASĂ (Home Office) - ATENȚIE!</h4>
<div class="alert alert-warning">
<strong>Deductibilitate: PRORATA suprafață business</strong>
</div>
<p><strong>Situație:</strong> Lucrezi de acasă (apartament personal/chirie pe PF)</p>
<p><strong>Regula fiscală:</strong></p>
<pre>
Suprafață apartament: 80 mp
Suprafață birou (cameră dedicată): 12 mp
Prorata: 12/80 = 15%
──────────────────────────────────────────
Utilități lunare totale: 500 RON
Deductibil fiscal: 500 × 15% = 75 RON
</pre>

<p><strong>Condiții esențiale:</strong></p>
<ul>
<li>Cameră/spațiu EXCLUSIV pentru business (nu dormitor comun!)</li>
<li>Contract închiriere sau dovadă proprietate</li>
<li>Calcul prorata documented (plan apartament + justificare)</li>
<li>Facturi utilități pe nume personal (firma decontează prorata)</li>
</ul>

<div class="alert alert-danger">
<strong>RISC MARE LA CONTROL ANAF:</strong>
<ul>
<li>ANAF verifică cu atenție home office (risc abuz)</li>
<li>Trebuie dovezi: poze birou, clienți nu vin acasă, etc</li>
<li>Prorata >50% e suspectă (cum jumătate din casă e birou?)</li>
<li>Recomandat: prorata 10-25% maxim</li>
</ul>
</div>

<h3>📱 Telefonie & Internet - Reguli Speciale:</h3>

<table>
<tr><th>Tip</th><th>Deductibilitate</th><th>Condiții</th></tr>
<tr>
  <td>Internet fix birou</td>
  <td>100%</td>
  <td>Contract pe firmă</td>
</tr>
<tr>
  <td>Telefonie fixă birou</td>
  <td>100%</td>
  <td>Contract pe firmă</td>
</tr>
<tr>
  <td>Telefon mobil angajat</td>
  <td>100%</td>
  <td>Abonament pe firmă, folosit profesional</td>
</tr>
<tr>
  <td>Telefon mobil personal</td>
  <td>50% maxim</td>
  <td>Decontare parțială, justificare business</td>
</tr>
</table>

<h3>💰 EXEMPLU CALCUL COMPLET - Birou Închiriat:</h3>
<pre>
COSTURI LUNARE:
────────────────────────────────────────
Chirie birou (40 mp, centru):  2.500 RON
Energie electrică:               150 RON
Internet + telefon fix:          100 RON
Încălzire (iarnă):               200 RON
Apă:                              50 RON
Salubritate:                      40 RON
Securitate clădire:               80 RON
────────────────────────────────────────
TOTAL LUNAR:                   3.120 RON
TOTAL ANUAL:                  37.440 RON

DEDUCTIBIL FISCAL: 100% = 37.440 RON
Economie impozit (la profit 16%): 5.990 RON/an
</pre>

<h3>📄 Documentare Necesară:</h3>

<h4>Pentru Chirie:</h4>
<ul>
<li>Contract închiriere (firmă = chiriaș)</li>
<li>Factură chiriei (lunară, cu TVA dacă proprietarul e firmă)</li>
<li>Dovadă plată (extras bancar)</li>
<li>Declarație 205 la ANAF (reținere impozit 10% din chirie pentru proprietar PF)</li>
</ul>

<h4>Pentru Utilități:</h4>
<ul>
<li>Facturi lunare pe firmă (curent, apă, gaz, etc)</li>
<li>Contracte utilități pe firmă</li>
<li>Dovezi plată</li>
</ul>

<h3>✅ BUNE PRACTICI:</h3>
<ol>
<li><strong>Contract chirie pe firmă:</strong> Evită decontări personale (complicații)</li>
<li><strong>Centralizeaz facturi:</strong> E-mail unic pentru toate utilitățile</li>
<li><strong>Automatizare plăți:</strong> Debit direct pentru utilități (nu uiți termene)</li>
<li><strong>Evită home office:</strong> Dacă poți, închiriază birou mic (100% deductibil, zero bătăi cap)</li>
<li><strong>Păstrează contracte:</strong> ANAF le cere la control (dovadă folosință business)</li>
</ol>

<div class="alert alert-info">
<strong>SFAT FISCAL - Home Office vs Birou Închiriat:</strong>

<strong>Home office (15% din 500 RON utilități):</strong>
- Deductibil: 75 RON/lună = 900 RON/an
- Economie impozit: 144 RON/an
- Risc: MARE la control ANAF

<strong>Birou mic închiriat (500 RON chirie + 200 RON utilități):</strong>
- Deductibil: 700 RON/lună = 8.400 RON/an
- Economie impozit: 1.344 RON/an
- Risc: ZERO (100% legitim)
- Bonus: Imagine profesională pentru clienți!

<strong>Diferența:</strong> 1.200 RON/an (100 RON/lună) pentru ZERO risc + profesionalism
</div>',
'["Dacă birou închiriat: Contract pe firmă (nu pe PF!)","Transferă toate contracte utilități pe firmă","Configurează plăți automate utilități","Dacă home office: Calculează prorata corect (max 25%)","Documentează home office (poze, plan, justificare)","Păstrează TOATE facturile (minim 10 ani!)"]',
'{"Codul Fiscal": "Art. 25 - Cheltuieli deductibile", "Normele Cod Fiscal": "Art. 25 - Detalii utilități"}',
'37440'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'marketing')
INSERT INTO decision_answers (path_id, answer_template, next_steps, legislation_refs, estimated_cost)
SELECT p.id,
'<h2>📢 MARKETING & PUBLICITATE - 100% Deductibil</h2>

<div class="alert alert-success">
<strong>Veste excelentă:</strong> Cheltuielile de marketing sunt integral deductibile, fără limite!
</div>

<h3>Ce Intră în Marketing/Publicitate?</h3>
<ul>
<li>✅ Google Ads, Facebook Ads, LinkedIn Ads</li>
<li>✅ SEO, Social Media Management</li>
<li>✅ Creare site web, aplicații, design grafic</li>
<li>✅ Materiale printate (flyere, bannere, roll-up-uri)</li>
<li>✅ Panouri publicitare, reclame TV/radio</li>
<li>✅ Influencer marketing, sponsorizări</li>
<li>✅ Expoziții, târguri, standuri</li>
<li>✅ Materiale promoționale cu logo (diferit de protocol!)</li>
</ul>

<h3>Diferența Marketing vs Protocol:</h3>
<table>
<tr><th>Aspect</th><th>Marketing</th><th>Protocol</th></tr>
<tr><td>Limită deductibilitate</td><td>❌ FĂRĂ limită</td><td>✅ Max 2,5% salarii</td></tr>
<tr><td>Publicul țintă</td><td>Masă (clienți potențiali)</td><td>Relații directe (client specific)</td></tr>
<tr><td>Exemplu</td><td>Reclamă Facebook</td><td>Masă cu client X</td></tr>
</table>

<h3>📄 Documentare Necesară:</h3>
<ul>
<li>Factură furnizor (agenție marketing, Google, etc)</li>
<li>Contract servicii (dacă e recurent)</li>
<li>Brief/descripție campanie (ce promovezi)</li>
<li>Dovadă plată</li>
</ul>

<p><strong>Bonus:</strong> Dacă ai materiale promoționale (pixuri, tricouri) care depășesc 300 RON, clasifică în marketing (nu protocol) pentru deductibilitate 100%!</p>',
'["Păstrează toate facturile marketing","Separă clar marketing vs protocol în contabilitate","Solicită facturi cu TVA (recuperezi TVA!)","Monitorizează ROI campanii (chiar dacă fiscal e ok, business-wise trebuie să merite)"]',
'{"Codul Fiscal": "Art. 25 - Cheltuieli deductibile"}',
'20000'
FROM p;

-- Tree 3 Update Points
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'expenses_full')
INSERT INTO update_points (
  tree_id,
  update_key,
  data_point,
  current_value,
  source,
  criticality,
  verification_frequency_days,
  next_verification_date,
  category,
  auto_updateable
)
SELECT t.id, update_key, data_point, current_value, source, criticality, verification_frequency_days, next_verification_date, category, auto_updateable
FROM t, (VALUES
  ('protocol_limit_pct', 'Limită protocol % din salarii', '2,5%', 'Codul Fiscal Art. 25', 'critical', 180, CURRENT_DATE + 180, 'threshold', true),
  ('gift_max', 'Valoare maximă cadou protocol', '300 RON', 'Normele Cod Fiscal', 'high', 180, CURRENT_DATE + 180, 'threshold', true),
  ('diurna_ro', 'Diurnă România', '20-30 RON/zi', 'ANAF tarife', 'medium', 90, CURRENT_DATE + 90, 'threshold', true),
  ('km_rate', 'Decontare km mașină personală', '2,5 RON/km', 'Practică fiscală', 'medium', 180, CURRENT_DATE + 180, 'threshold', false)
) AS v(update_key, data_point, current_value, source, criticality, verification_frequency_days, next_verification_date, category, auto_updateable);

COMMIT;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

SELECT '═══════════════════════════════════════' as separator;
SELECT 'COMPREHENSIVE MIGRATION COMPLETE' as status;
SELECT '═══════════════════════════════════════' as separator;

SELECT 'TREES:' as metric, COUNT(*) as count FROM decision_trees;
SELECT 'NODES:' as metric, COUNT(*) as count FROM decision_nodes;
SELECT 'PATHS:' as metric, COUNT(*) as count FROM decision_paths;
SELECT 'ANSWERS:' as metric, COUNT(*) as count FROM decision_answers;
SELECT 'VARIABLES:' as metric, COUNT(*) as count FROM legislation_variables;
SELECT 'UPDATE POINTS:' as metric, COUNT(*) as count FROM update_points;

SELECT '═══════════════════════════════════════' as separator;
SELECT 'BREAKDOWN BY TREE:' as section;
SELECT '═══════════════════════════════════════' as separator;

SELECT
  dt.tree_name,
  COUNT(DISTINCT dn.id) as nodes,
  COUNT(DISTINCT dp.id) as paths,
  COUNT(DISTINCT da.id) as answers,
  COUNT(DISTINCT lv.id) as variables,
  COUNT(DISTINCT up.id) as update_points
FROM decision_trees dt
LEFT JOIN decision_nodes dn ON dt.id = dn.tree_id
LEFT JOIN decision_paths dp ON dn.id = dp.node_id
LEFT JOIN decision_answers da ON dp.id = da.path_id
LEFT JOIN legislation_variables lv ON dt.id = lv.tree_id
LEFT JOIN update_points up ON dt.id = up.tree_id
GROUP BY dt.tree_name
ORDER BY dt.tree_name;
