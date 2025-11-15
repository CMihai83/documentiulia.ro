-- BATCH 1: 5 High-Priority Decision Trees
-- PFA vs SRL vs II, Dividend Distribution, VAT Regimes, Tax Calendar, Termination

BEGIN;

-- ============================================================================
-- TREE 1: PFA vs SRL vs II - Which Legal Form?
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'legal_form_choice',
  'PFA vs SRL vs II - Alegerea Formei Juridice',
  'Ghid complet pentru alegerea formei juridice optime: analiză costuri, fiscalitate, răspundere',
  'business',
  true,
  10
);

-- Variables
INSERT INTO legislation_variables (variable_key, variable_name, current_value, value_type, unit, effective_from, last_verified)
VALUES
  ('pfa_min_revenue_cas', 'Venit minim PFA pentru CAS obligatoriu', '39600', 'amount', 'RON', '2024-01-01', CURRENT_DATE),
  ('srl_min_capital', 'Capital social minim SRL', '200', 'amount', 'RON', '2024-01-01', CURRENT_DATE),
  ('dividend_tax_rate', 'Impozit dividend', '8', 'percentage', '%', '2024-01-01', CURRENT_DATE)
ON CONFLICT (variable_key) DO UPDATE SET current_value = EXCLUDED.current_value, last_verified = EXCLUDED.last_verified;

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'legal_form_choice')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'annual_revenue',
  'Ce venit anual estimezi pentru primul an?',
  'Venitul influențează fiscalitatea: PFA plătește impozit pe venit net, SRL poate opta pentru micro (1-3% din venit brut).',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'legal_form_choice')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'liability_concern', n.id,
  'Cât de important e să-ți protejezi patrimoniul personal?',
  'SRL limitează răspunderea la capitalul social. PFA/II răspund cu tot patrimoniul personal.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'annual_revenue';

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'legal_form_choice')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'investors_needed', n.id,
  'Plănuiești să ai investitori sau parteneri?',
  'SRL permite multiple asociate și intrări/ieșiri de parteneri. PFA e strict personal.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'liability_concern';

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'annual_revenue')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'under_100k', 'Sub 100.000 RON', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'liability_concern';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'annual_revenue')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'over_100k', 'Peste 100.000 RON', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'liability_concern';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'liability_concern')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'high_concern', 'Foarte important (activitate cu risc)', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'investors_needed';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'liability_concern')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'low_concern', 'Puțin important (activitate low-risk)', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'investors_needed';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'investors_needed')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'yes_investors', 'Da - vreau să atrag investitori'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'investors_needed')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'no_investors', 'Nu - business solo sau cu 1-2 parteneri apropiați'
FROM n;

-- Answers
WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'investors_needed' AND dp.path_key = 'yes_investors'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🏢 RECOMANDARE: SRL</h2>

<div class="alert alert-success">
<strong>Forma juridică optimă pentru tine:</strong> Societate cu Răspundere Limitată (SRL)
</div>

<h3>De ce SRL?</h3>
<ul>
<li>✅ <strong>Atrage investitori ușor:</strong> Poți vinde acțiuni fără a dizolva compania</li>
<li>✅ <strong>Structură flexibilă:</strong> Multiple asociate, AGA pentru decizii importante</li>
<li>✅ <strong>Credibilitate:</strong> Clienți B2B preferă SRL (seriozitate)</li>
<li>✅ <strong>Protecție patrimoniu:</strong> Răspundere limitată la capitalul social</li>
<li>✅ <strong>Regim micro:</strong> La venit <500k EUR, taxă doar 1-3%</li>
</ul>

<h3>Costuri Inițiale SRL:</h3>
<pre>
Capital social minim: 200 RON (rămâne în cont)
Certificat constatator: ~100 RON
Taxe înregistrare ONRC: ~200 RON
Statut + acte constitutive: 0 RON (template online) sau 500-1.500 RON (avocat)
────────────────────────────
TOTAL SETUP: 500-2.000 RON
</pre>

<h3>Costuri Lunare SRL pe Micro:</h3>
<pre>
Contabil: 150-300 RON
Impozit micro (1%): depinde de venit (ex: 100 RON la 10.000 RON venit)
Salariu minim obligatoriu: 3.300 RON brut (opțional dacă nu ai angajați)
────────────────────────────
TOTAL LUNAR: 250-600 RON (fără salarii) sau 3.500-4.000 RON (cu salariu)
</pre>

<h3>Pași Înființare:</h3>
<ol>
<li>Rezervă denumire firmă (ONRC online - gratuit)</li>
<li>Deschide cont bancar și depune capital social (200 RON)</li>
<li>Pregătește acte: statut, declarație pe proprie răspundere, hotărâre asociați</li>
<li>Depune dosarul la ONRC (online sau la ghișeu)</li>
<li>Primești certificat înregistrare (2-5 zile)</li>
<li>Obține cod fiscal (ANAF - automat sau separat)</li>
<li>Angajează contabil</li>
</ol>',
'["Rezervă denumire SRL pe portalul ONRC","Deschide cont bancar pentru capital social","Pregătește acte constitutive (template sau avocat)","Depune dosarul la ONRC","Angajează contabil înainte de prima factură"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'investors_needed' AND dp.path_key = 'no_investors'
), combined AS (
  SELECT dp2.path_key FROM decision_paths dp2
  JOIN decision_nodes dn2 ON dp2.node_id = dn2.id
  WHERE dn2.node_key = 'annual_revenue'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>💼 RECOMANDARE: PFA (pentru venit <100k) sau SRL pe Micro (pentru venit >100k)</h2>

<div class="alert alert-info">
<strong>Decizia finală depinde de venit:</strong>
</div>

<h3>Dacă estimezi venit <100.000 RON/an → PFA</h3>

<h4>Avantaje PFA:</h4>
<ul>
<li>✅ Setup ultra-rapid (2-3 zile, online)</li>
<li>✅ Cost setup: 0 RON (gratuit!)</li>
<li>✅ Cost lunar: 50-150 RON contabil</li>
<li>✅ Fără capital social necesar</li>
<li>✅ Regim fiscal simplu (norma de venit sau real)</li>
</ul>

<h4>Dezavantaje PFA:</h4>
<ul>
<li>❌ Răspundere nelimitată (riști patrimoniul personal)</li>
<li>❌ Nu poți avea parteneri/investitori</li>
<li>❌ Taxe: 10% impozit + 25% CAS + 10% CASS (total ~40-45% din venit net)</li>
<li>❌ Imagine mai puțin profesională pentru B2B</li>
</ul>

<h4>Pași Înființare PFA:</h4>
<ol>
<li>Verifică disponibilitate denumire (ONRC)</li>
<li>Completează formular înregistrare (online pe onrc.ro)</li>
<li>Plătește taxă înregistrare: 0 RON (gratuit din 2021!)</li>
<li>Primești certificat în 2-3 zile</li>
<li>Înregistrare la ANAF pentru CIF (cod fiscal)</li>
</ol>

<h3>Dacă estimezi venit >100.000 RON/an → SRL pe Micro</h3>

<h4>De ce SRL devine mai avantajos la venit mare?</h4>
<p>La 150.000 RON venit anual:</p>

<table>
<tr><th>Formă</th><th>Taxe/an</th><th>Cost contabil</th><th>Profit net</th></tr>
<tr><td>PFA</td><td>~60.000 RON (40%)</td><td>1.800 RON</td><td>~88.000 RON</td></tr>
<tr><td>SRL Micro 1%</td><td>1.500 RON</td><td>3.600 RON</td><td>~140.000 RON*</td></tr>
</table>

<p><em>*După impozit dividend 8%</em></p>

<p><strong>Diferență: +52.000 RON/an în favoarea SRL!</strong></p>

<h4>Concluzie:</h4>
<p>Dacă ești solo, venit mic (<100k), activitate low-risk → <strong>PFA</strong></p>
<p>Dacă vrei să crești rapid, venit >100k, activitate cu risc → <strong>SRL</strong></p>',
'["Calculează venit estimat realist (an 1)","Dacă <100k: înregistrează PFA online","Dacă >100k: urmează pașii SRL","Consultă contabil pentru confirmarea alegerii"]'
FROM p;

-- Update Points
INSERT INTO decision_tree_update_points (
  tree_id, update_category, data_point_name, current_value, value_source,
  linked_variable_key, update_frequency, next_verification_due, criticality, auto_updateable
)
SELECT t.id, 'threshold', 'Venit minim PFA pentru CAS', '39.600 RON (12 × salariu minim)', 'Codul Fiscal',
  'pfa_min_revenue_cas', 'quarterly', CURRENT_DATE + 180, 'critical', true
FROM decision_trees t WHERE t.tree_key = 'legal_form_choice'
UNION ALL
SELECT t.id, 'threshold', 'Capital social minim SRL', '200 RON', 'Legea 31/1990',
  'srl_min_capital', 'annual', CURRENT_DATE + 365, 'high', true
FROM decision_trees t WHERE t.tree_key = 'legal_form_choice'
UNION ALL
SELECT t.id, 'tax_rate', 'Impozit dividend', '8%', 'Codul Fiscal Art. 97',
  'dividend_tax_rate', 'quarterly', CURRENT_DATE + 90, 'critical', true
FROM decision_trees t WHERE t.tree_key = 'legal_form_choice';

-- ============================================================================
-- TREE 2: Dividend Distribution - Tax Optimization
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'dividend_distribution',
  'Distribuire Dividende - Optimizare Fiscală',
  'Ghid pentru distribuirea optimă a profitului: impozite, contribuții, timing',
  'business',
  true,
  9
);

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'dividend_distribution')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'srl_profit_available',
  'Cât profit net ai disponibil în SRL după impozitul pe profit/micro?',
  'Profitul disponibil = Venit - Cheltuieli - Impozit (micro sau profit). Acesta poate fi distribuit ca dividend.',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'dividend_distribution')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'shareholder_income', n.id,
  'Cât venit personal (din alte surse) vei avea în anul distribuirii?',
  'Dacă venitul personal anual depășește 12 × salariul minim, plătești CASS 10% pe dividende.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'srl_profit_available';

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'dividend_distribution')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'distribution_timing', n.id,
  'Când vrei să distribui dividendele?',
  'Timing afectează cash flow și planificarea fiscală. Poți distribui anual sau la nevoie.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'shareholder_income';

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'shareholder_income')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'under_threshold', 'Sub 39.600 RON (12 × minim)', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'distribution_timing';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'shareholder_income')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'over_threshold', 'Peste 39.600 RON', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'distribution_timing';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'distribution_timing')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'annual', 'O dată pe an (la sfârșitul anului fiscal)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'distribution_timing')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'quarterly', 'Trimestrial (cash flow regulat)'
FROM n;

-- Answers
WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'distribution_timing' AND dp.path_key = 'annual'
), parent_path AS (
  SELECT dp2.id, dp2.path_key FROM decision_paths dp2
  JOIN decision_nodes dn2 ON dp2.node_id = dn2.id
  WHERE dn2.node_key = 'shareholder_income'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>💰 STRATEGIE: Distribuire Anuală de Dividende</h2>

<div class="alert alert-success">
<strong>Timing recomandat:</strong> Decembrie-Ianuarie (după închiderea bilanțului)
</div>

<h3>Calcul Impozit Dividend:</h3>

<h4>Dacă venit personal <39.600 RON:</h4>
<pre>
Profit SRL disponibil: 100.000 RON
Impozit dividend (8%): 8.000 RON
CASS sănătate (10%): 0 RON (sub prag)
────────────────────────────
Dividend NET primit: 92.000 RON
Taxare efectivă: 8%
</pre>

<h4>Dacă venit personal >39.600 RON:</h4>
<pre>
Profit SRL disponibil: 100.000 RON
Impozit dividend (8%): 8.000 RON
CASS sănătate (10%): 10.000 RON
────────────────────────────
Dividend NET primit: 82.000 RON
Taxare efectivă: 18%
</pre>

<h3>Procedură Distribuire:</h3>
<ol>
<li><strong>AGA (Adunarea Generală Asociați):</strong>
  <ul>
  <li>Convoacă toți asociații</li>
  <li>Redactează hotărâre AGA: "Distribuire dividend X RON"</li>
  <li>Toți asociații semnează hotărârea</li>
  </ul>
</li>
<li><strong>Declarație 100 (dividend):</strong>
  <ul>
  <li>Depune la ANAF până pe 25 a lunii următoare distribuirii</li>
  <li>Include: sumă dividend, beneficiar, impozit calculat</li>
  </ul>
</li>
<li><strong>Plată impozit:</strong>
  <ul>
  <li>Societatea plătește impozitul 8% + CASS (dacă aplicabil)</li>
  <li>Termen: până pe 25 a lunii următoare</li>
  </ul>
</li>
<li><strong>Transfer bani:</strong>
  <ul>
  <li>După plata impozitului, transferă dividendul net în contul personal</li>
  <li>Ordinul de plată: "Dividend conform HGA nr X din [data]"</li>
  </ul>
</li>
</ol>

<h3>Optimizare Fiscală - Strategii Avansate:</h3>

<h4>1. Dividende vs Salariu:</h4>
<table>
<tr><th>Metodă</th><th>Taxare</th><th>Când folosi</th></tr>
<tr><td>Salariu (admin SRL)</td><td>~40% (CAS+CASS+impozit)</td><td>Dacă vrei vechime pensie</td></tr>
<tr><td>Dividend</td><td>8-18%</td><td>Maximizare profit net</td></tr>
<tr><td>Mix (50/50)</td><td>~25%</td><td>Echilibru pensie + profit</td></tr>
</table>

<h4>2. Timing Fiscal:</h4>
<p><strong>Distribuie în ianuarie (nu decembrie):</strong></p>
<ul>
<li>Închizi bilanțul 2024 în decembrie</li>
<li>Distribui dividend în ianuarie 2025</li>
<li><strong>Avantaj:</strong> Amâni plata CASS cu 1 an (dacă ești aproape de prag)</li>
</ul>

<h4>3. Reinvestiție vs Distribuire:</h4>
<p>Dacă ai nevoie să crești business-ul:</p>
<ul>
<li>Păstrează profitul în SRL (nu distribui tot)</li>
<li>Folosește pentru: echipamente, angajări, marketing</li>
<li>Distribui doar ce-ți trebuie pentru trai</li>
<li><strong>Avantaj:</strong> Cash în business pentru creștere</li>
</ul>',
'["Calculează profit net disponibil (după impozit SRL)","Verifică venitul personal total (pentru CASS)","Organizează AGA pentru aprobare dividend","Depune declarația 100 la ANAF","Plătește impozitul înainte de transfer","Transferă dividendul net în cont personal"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'distribution_timing' AND dp.path_key = 'quarterly'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>💰 STRATEGIE: Distribuire Trimestrială</h2>

<div class="alert alert-info">
<strong>Cash Flow Regulat:</strong> Distribuie dividend la fiecare 3 luni
</div>

<h3>Avantaje Distribuire Trimestrială:</h3>
<ul>
<li>✅ <strong>Cash flow previzibil:</strong> Venit personal constant</li>
<li>✅ <strong>Flexibilitate:</strong> Ajustezi suma în funcție de profit trimestrial</li>
<li>✅ <strong>Evită blocarea cash:</strong> Nu aștepți până la sfârșitul anului</li>
</ul>

<h3>Dezavantaje:</h3>
<ul>
<li>❌ <strong>Administrative overhead:</strong> 4 AGA pe an (vs 1)</li>
<li>❌ <strong>4 declarații 100:</strong> Mai multe interacțiuni cu ANAF</li>
<li>❌ <strong>Planificare complexă:</strong> Trebuie să estimezi profitul corect</li>
</ul>

<h3>Calendar Distribuire Trimestrială:</h3>
<pre>
Q1 (Ian-Mar): AGA în aprilie → Dividend din profitul Q1
Q2 (Apr-Iun): AGA în iulie → Dividend din profitul Q2
Q3 (Iul-Sep): AGA în octombrie → Dividend din profitul Q3
Q4 (Oct-Dec): AGA în ianuarie → Dividend din profitul Q4
</pre>

<h3>Exemplu Calcul (Profit anual 120.000 RON):</h3>
<pre>
Q1: Profit 25.000 RON → Dividend 23.000 RON (după 8% impozit)
Q2: Profit 30.000 RON → Dividend 27.600 RON
Q3: Profit 35.000 RON → Dividend 32.200 RON
Q4: Profit 30.000 RON → Dividend 27.600 RON
────────────────────────────────────────────────
TOTAL AN: 120.000 RON profit → 110.400 RON dividend net
</pre>

<h3>ATENȚIE - Risc:</h3>
<div class="alert alert-warning">
<p>Dacă distribui trimestrial și la final de an bilanțul arată <strong>pierdere</strong>, ai distribuit ilegal!</p>
<p><strong>Soluție:</strong> Păstrează buffer 20% nedistribuit în fiecare trimestru, distribui totalul în Q4 după bilanț final.</p>
</div>

<h3>Procedură Trimestrială Simplificată:</h3>
<ol>
<li>Închide evidența contabilă trimestrial (cu ajutorul contabilului)</li>
<li>Calculează profitul net trimestrial</li>
<li>AGA: hotărâre distribuire dividend (max 80% din profit trimestru - buffer 20%)</li>
<li>Declarație 100 la ANAF (până pe 25 a lunii următoare)</li>
<li>Plată impozit + transfer dividend</li>
</ol>

<h3>Recomandare:</h3>
<p>Distribuire trimestrială e bună dacă:</p>
<ul>
<li>✅ Ai nevoie de cash flow personal constant</li>
<li>✅ Profitul e previzibil (activitate stabilă)</li>
<li>✅ Ai contabil organizat care poate face bilanț trimestrial</li>
</ul>

<p>Altfel, distribuire anuală e mai simplă!</p>',
'["Discută cu contabilul despre închideri trimestriale","Stabilește calendar fix (ex: AGA pe 15 aprilie, 15 iulie, etc)","Păstrează buffer 20% nedistribuit","Ajustează sumele în funcție de performanță real","Distribuie bufferul în Q4 după bilanț anual"]'
FROM p;

-- Update Points
INSERT INTO decision_tree_update_points (
  tree_id, update_category, data_point_name, current_value, value_source,
  linked_variable_key, update_frequency, next_verification_due, criticality, auto_updateable
)
SELECT t.id, 'tax_rate', 'Impozit dividend', '8%', 'Codul Fiscal Art. 97',
  'dividend_tax_rate', 'quarterly', CURRENT_DATE + 90, 'critical', true
FROM decision_trees t WHERE t.tree_key = 'dividend_distribution'
UNION ALL
SELECT t.id, 'threshold', 'Prag venit pentru CASS pe dividende', '39.600 RON', 'Codul Fiscal',
  'pfa_min_revenue_cas', 'quarterly', CURRENT_DATE + 180, 'critical', true
FROM decision_trees t WHERE t.tree_key = 'dividend_distribution'
UNION ALL
SELECT t.id, 'deadline', 'Termen declarație 100 dividend', 'Ziua 25 luna următoare', 'Cod procedură fiscală',
  NULL, 'annual', CURRENT_DATE + 365, 'critical', false
FROM decision_trees t WHERE t.tree_key = 'dividend_distribution';

-- ============================================================================
-- TREE 3: VAT Regimes (Standard, Cash, Exempt)
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'vat_regimes',
  'Regimuri TVA - Standard, Casa, Scutit',
  'Alegerea regimului de TVA optim: standard (exigibilitate), casa (încasare), scutiri',
  'fiscal',
  true,
  8
);

-- Variables
INSERT INTO legislation_variables (variable_key, variable_name, current_value, value_type, unit, effective_from, last_verified)
VALUES
  ('vat_standard_rate', 'Cota standard TVA', '19', 'percentage', '%', '2024-01-01', CURRENT_DATE),
  ('vat_reduced_rate', 'Cota redusă TVA', '9', 'percentage', '%', '2024-01-01', CURRENT_DATE),
  ('vat_cash_accounting_limit', 'Plafon regim casa TVA', '4500000', 'amount', 'RON', '2024-01-01', CURRENT_DATE)
ON CONFLICT (variable_key) DO UPDATE SET current_value = EXCLUDED.current_value, last_verified = EXCLUDED.last_verified;

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'vat_regimes')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'vat_registered',
  'Ești deja înregistrat ca plătitor de TVA?',
  'Înregistrarea TVA e obligatorie la >300.000 RON venit anual sau opțională sub acest prag.',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'vat_regimes')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'annual_revenue_vat', n.id,
  'Ce venit anual ai/estimezi?',
  'Plafonul pentru regim casa este 4.500.000 RON. Peste acest prag, doar regim standard.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'vat_registered';

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'vat_regimes')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'cash_flow_issue', n.id,
  'Ai probleme de cash flow? (clienții plătesc târziu)',
  'Regimul casa permite plata TVA doar când primești banii, nu când emiti factura.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'annual_revenue_vat';

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'vat_registered')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'yes_registered', 'Da - sunt plătitor TVA', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'annual_revenue_vat';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'vat_registered')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'no_not_registered', 'Nu - nu sunt înregistrat TVA'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'annual_revenue_vat')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'under_4_5m', 'Sub 4.500.000 RON', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'cash_flow_issue';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'annual_revenue_vat')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'over_4_5m', 'Peste 4.500.000 RON'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'cash_flow_issue')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'yes_cash_problem', 'Da - plăți întârziate frecvente'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'cash_flow_issue')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'no_cash_ok', 'Nu - încasez prompt'
FROM n;

-- Answers
WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'vat_registered' AND dp.path_key = 'no_not_registered'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>📊 Înregistrare TVA - Ai Nevoie?</h2>

<div class="alert alert-info">
<strong>Status:</strong> Nu ești plătitor TVA. Să vedem dacă trebuie sau e avantajos să te înregistrezi.
</div>

<h3>Înregistrare TVA Obligatorie dacă:</h3>
<ul>
<li>✅ Venit anual > 300.000 RON (88.500 EUR)</li>
<li>✅ Faci operațiuni intracomunitare (cumperi/vinzi în UE)</li>
<li>✅ Clienții tăi cer facturi cu TVA (B2B, deductibilitate)</li>
</ul>

<h3>Înregistrare TVA Opțională (chiar sub 300k) dacă:</h3>
<ul>
<li>✅ Furnizorii tăi au TVA → poți deduce TVA la achiziții</li>
<li>✅ Clienții sunt firme mari care preferă facturi cu TVA</li>
<li>✅ Vrei imagine mai profesională</li>
</ul>

<h3>Cum Te Înregistrezi?</h3>
<p>Vezi arborele nostru complet: <strong>"Înregistrare TVA"</strong> pentru procedură pas-cu-pas.</p>

<h3>Dacă Nu Te Înregistrezi:</h3>
<ul>
<li>✅ Simplitate: nu colectezi/plătești TVA</li>
<li>✅ Costuri mai mici pentru clienți (prețuri fără TVA)</li>
<li>❌ Nu poți deduce TVA la achiziții (tot costul e al tău)</li>
<li>❌ Limitat la clienți B2C sau B2B mici</li>
</ul>

<h3>Recomandare:</h3>
<p><strong>Sub 150.000 RON venit + clienți B2C:</strong> Nu te înregistra (nu merită complexitatea)</p>
<p><strong>Peste 200.000 RON sau clienți B2B:</strong> Înregistrează-te (beneficii > costuri)</p>',
'["Calculează venit estimat anual","Analizează: clienți B2B (vor TVA?) sau B2C (preferă fără TVA?)","Dacă >300k sau B2B majoritar: înregistrează-te","Dacă <150k și B2C: stai fără TVA","Zona gri 150-300k: consultă contabil"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'cash_flow_issue' AND dp.path_key = 'yes_cash_problem'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>💵 REGIM RECOMANDAT: TVA în Sistem CASA</h2>

<div class="alert alert-success">
<strong>Perfect pentru tine!</strong> Regimul casa rezolvă problema cash flow-ului.
</div>

<h3>Ce Înseamnă Regim Casa (TVA la încasare)?</h3>
<ul>
<li>✅ <strong>Plătești TVA doar când primești banii</strong> (nu când emiti factura!)</li>
<li>✅ <strong>Deduci TVA când plătești furnizorilor</strong> (nu când primești factura)</li>
<li>✅ <strong>Zero risc:</strong> Nu avansezi TVA din buzunarul tău</li>
</ul>

<h3>Exemplu Concret:</h3>
<pre>
Data         | Eveniment                    | TVA Standard | TVA Casa
─────────────────────────────────────────────────────────────────────
1 Ian        | Emiți factură 11.900 RON     |              |
             | (10.000 + 1.900 TVA)         |              |
15 Ian       | ANAF cere TVA-ul             | PLĂTEȘTI     | NU plătești
             |                              | 1.900 RON    | (n-ai primit banii)
1 Feb        | Clientul plătește            | -            | -
15 Feb       | Declari TVA                  | -            | PLĂTEȘTI 1.900 RON
─────────────────────────────────────────────────────────────────────
</pre>

<p><strong>Diferență:</strong> În regim standard, avansezi TVA 1 lună. În regim casa, plătești doar după încasare!</p>

<h3>Condițiile Regim Casa:</h3>
<ul>
<li>✅ Cifră afaceri anuală < 4.500.000 RON</li>
<li>✅ Nu ai restanțe la bugetul de stat</li>
<li>✅ Aplici DOAR cu clienți/furnizori din România (nu UE!)</li>
</ul>

<h3>Cum Optezi?</h3>
<ol>
<li>Depui declarație 087 la ANAF (formular de opțiune)</li>
<li>Menționezi data de la care aplici (min 1 trimestru întreg)</li>
<li>Specifici în facturi: "TVA la încasare conform art. 134^2 Cod fiscal"</li>
</ol>

<h3>Limitări Regim Casa:</h3>
<ul>
<li>❌ <strong>NU funcționează pentru operațiuni intracomunitare</strong> (achiziții/livrări UE)</li>
<li>❌ Necesită sistem contabil care să urmărească încasările/plățile (nu doar facturile)</li>
<li>❌ Dacă depășești 4.500.000 RON, treci automat pe standard de la trimestrul următor</li>
</ul>

<h3>Concluzie:</h3>
<p><strong>Dacă:</strong> Ai clienți cu plăți întârziate (30-90 zile) și venit <4.5M RON → <strong>Regim Casa e salvarea ta!</strong></p>
<p><strong>Dacă:</strong> Faci import/export UE → <strong>Regim standard obligatoriu</strong></p>',
'["Verifică cifra de afaceri anuală (<4.5M RON)","Depune declarația 087 opțiune regim casa","Actualizează sistemul contabil (tracking încasări/plăți)","Modifică facturi: mențiune TVA la încasare","Instruiește contabilul despre regim casa"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'cash_flow_issue' AND dp.path_key = 'no_cash_ok'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>📊 REGIM RECOMANDAT: TVA Standard (Exigibilitate)</h2>

<div class="alert alert-info">
<strong>Regimul standard e suficient pentru tine.</strong> Cash flow-ul nu e problemă.
</div>

<h3>Ce Înseamnă TVA Standard (Exigibilitate)?</h3>
<ul>
<li>Plătești TVA la ANAF când <strong>emiti factura</strong> (nu când încasezi)</li>
<li>Deduci TVA când <strong>primești factura</strong> de la furnizor (nu când plătești)</li>
<li>Simplu, clar, regimul default pentru majoritatea firmelor</li>
</ul>

<h3>Avantaje Regim Standard:</h3>
<ul>
<li>✅ <strong>Simplu:</strong> No strings attached, funcționează pentru orice tip de operațiune</li>
<li>✅ <strong>Intracom OK:</strong> Poți face achiziții/livrări UE fără probleme</li>
<li>✅ <strong>Deducere imediată:</strong> Deduci TVA îndată ce primești factura (nu aștepți să plătești)</li>
</ul>

<h3>Dezavantaje:</h3>
<ul>
<li>❌ <strong>Avansezi TVA:</strong> Dacă clientul plătește în 60 zile, tu plătești TVA în 25 zile</li>
<li>❌ <strong>Risc cash flow:</strong> La creștere rapidă, poți avea probleme de lichiditate</li>
</ul>

<h3>Exemplu Calcul TVA Standard:</h3>
<pre>
Ianuarie:
- Emiți facturi: 100.000 RON + 19.000 TVA colectat
- Primești facturi furnizori: 40.000 RON + 7.600 TVA deductibil
────────────────────────────────────────────────
TVA de plată = 19.000 - 7.600 = 11.400 RON

Termen plată: 25 februarie (declarația 300)
</pre>

<p><strong>Observație:</strong> Plătești TVA chiar dacă clienții nu te-au plătit încă!</p>

<h3>Când Regim Standard E Cea Mai Bună Opțiune?</h3>
<ul>
<li>✅ Încasezi rapid de la clienți (0-30 zile)</li>
<li>✅ Faci operațiuni UE (import/export)</li>
<li>✅ Venit >4.500.000 RON (obligatoriu standard)</li>
<li>✅ Ai rezervă cash pentru a acoperi TVA-ul</li>
</ul>

<h3>Declarația 300 (Lunară/Trimestrială):</h3>
<p><strong>Lunară</strong> dacă cifra afaceri >100.000 EUR/an</p>
<p><strong>Trimestrială</strong> dacă sub acest prag</p>

<p>Termen depunere: <strong>ziua 25</strong> a lunii următoare perioadei (sau trimestru)</p>

<h3>Tips pentru Regim Standard:</h3>
<ol>
<li>Păstrează <strong>rezervă cash 20-25%</strong> din facturi emise (pentru TVA)</li>
<li>Monitorizează <strong>TVA deductibil</strong> - asigură-te că primești facturi conforme</li>
<li>Verifică <strong>termenele de plată</strong> clienți - dacă depășesc 45 zile constant, consideră regim casa</li>
<li>Automatizează declarația 300 (majoritatea contabililor au software)</li>
</ol>',
'["Configurează cont separat pentru TVA (20-25% din facturi)","Asigură-te că contabilul depune 300 la timp (penalități!!)","Verifică TVA deductibil lunar (facturi conforme?)","Monitorizează cash flow - dacă probleme, evaluează regim casa","Păstrează evidența clară factură vs încasare"]'
FROM p;

-- Update Points
INSERT INTO decision_tree_update_points (
  tree_id, update_category, data_point_name, current_value, value_source,
  linked_variable_key, update_frequency, next_verification_due, criticality, auto_updateable
)
SELECT t.id, 'tax_rate', 'Cotă standard TVA', '19%', 'Codul Fiscal',
  'vat_standard_rate', 'quarterly', CURRENT_DATE + 90, 'critical', true
FROM decision_trees t WHERE t.tree_key = 'vat_regimes'
UNION ALL
SELECT t.id, 'tax_rate', 'Cotă redusă TVA', '9%', 'Codul Fiscal',
  'vat_reduced_rate', 'quarterly', CURRENT_DATE + 90, 'high', true
FROM decision_trees t WHERE t.tree_key = 'vat_regimes'
UNION ALL
SELECT t.id, 'threshold', 'Plafon regim casa TVA', '4.500.000 RON', 'Codul Fiscal Art. 134^2',
  'vat_cash_accounting_limit', 'annual', CURRENT_DATE + 365, 'critical', true
FROM decision_trees t WHERE t.tree_key = 'vat_regimes';

COMMIT;

-- Verification
SELECT '════════════════════════════════════════════════════' as separator;
SELECT 'BATCH 1 MIGRATION COMPLETE - 3 TREES CREATED' as status;
SELECT '════════════════════════════════════════════════════' as separator;

SELECT dt.tree_name,
  COUNT(DISTINCT dn.id) as nodes,
  COUNT(DISTINCT dp.id) as paths,
  COUNT(DISTINCT da.id) as answers
FROM decision_trees dt
LEFT JOIN decision_nodes dn ON dt.id = dn.tree_id
LEFT JOIN decision_paths dp ON dn.id = dp.node_id
LEFT JOIN decision_answers da ON dp.id = da.path_id
WHERE dt.tree_key IN ('legal_form_choice', 'dividend_distribution', 'vat_regimes')
GROUP BY dt.tree_name
ORDER BY dt.tree_name;
