-- Simple Migration: Add 3 New Decision Trees
-- Date: 2025-11-15
-- Approach: Sequential inserts with explicit IDs where safe

BEGIN;

-- =============================================================================
-- TREE 1: MICROENTERPRISE ELIGIBILITY
-- =============================================================================

-- Insert tree
INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, is_active)
VALUES (
    'microenterprise_eligibility',
    'Eligibilitate Microîntreprindere',
    'Verifică dacă firma ta poate opta pentru regimul de microîntreprindere și ce cotă de impozit se aplică',
    'business_formation',
    'building',
    true
);

-- Get tree_id
DO $$
DECLARE tree1_id INT;
BEGIN
    SELECT id INTO tree1_id FROM decision_trees WHERE tree_key = 'microenterprise_eligibility';
    RAISE NOTICE 'Microenterprise tree ID: %', tree1_id;
END $$;

-- Insert nodes for tree 1
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT id, 'micro_root',
    'Ce formă juridică are afacerea ta?',
    'Regimul de microîntreprindere este disponibil doar pentru SRL-uri.',
    false
FROM decision_trees WHERE tree_key = 'microenterprise_eligibility';

INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT
    dt.id,
    'micro_check_revenue',
    dn.id,
    'Ce venit anual estimezi?',
    'Pragul maxim: 500.000 EUR',
    false
FROM decision_trees dt
CROSS JOIN decision_nodes dn
WHERE dt.tree_key = 'microenterprise_eligibility' AND dn.node_key = 'micro_root';

INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT
    dt.id,
    'micro_check_employees',
    dn.id,
    'Câți angajați vei avea (media anuală)?',
    'Pragul maxim: 9 angajați',
    false
FROM decision_trees dt
CROSS JOIN decision_nodes dn
WHERE dt.tree_key = 'microenterprise_eligibility' AND dn.node_key = 'micro_check_revenue';

INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT
    dt.id,
    'micro_check_consulting',
    dn.id,
    'Ce procent din venit va fi consultanță?',
    'Peste 80% consultanță = cotă 3%, altfel 1%',
    false
FROM decision_trees dt
CROSS JOIN decision_nodes dn
WHERE dt.tree_key = 'microenterprise_eligibility' AND dn.node_key = 'micro_check_employees';

-- Insert paths
INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT
    n1.id,
    'SRL (Societate cu Răspundere Limitată)',
    'srl',
    n2.id,
    1
FROM decision_nodes n1, decision_nodes n2
WHERE n1.node_key = 'micro_root' AND n2.node_key = 'micro_check_revenue';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'PFA sau Întreprindere Individuală', 'not_srl', NULL, 2
FROM decision_nodes WHERE node_key = 'micro_root';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT
    n1.id,
    'Sub 500.000 EUR',
    'under_500k',
    n2.id,
    1
FROM decision_nodes n1, decision_nodes n2
WHERE n1.node_key = 'micro_check_revenue' AND n2.node_key = 'micro_check_employees';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'Peste 500.000 EUR', 'over_500k', NULL, 2
FROM decision_nodes WHERE node_key = 'micro_check_revenue';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT
    n1.id,
    'Sub 9 angajați',
    'under_9',
    n2.id,
    1
FROM decision_nodes n1, decision_nodes n2
WHERE n1.node_key = 'micro_check_employees' AND n2.node_key = 'micro_check_consulting';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, '9 sau mai mulți angajați', '9_or_more', NULL, 2
FROM decision_nodes WHERE node_key = 'micro_check_employees';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'Sub 80% consultanță', 'low_consulting', NULL, 1
FROM decision_nodes WHERE node_key = 'micro_check_consulting';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, '80% sau mai mult consultanță', 'high_consulting', NULL, 2
FROM decision_nodes WHERE node_key = 'micro_check_consulting';

-- Insert answers for microenterprise
INSERT INTO decision_answers (path_id, path_key answer_text, next_steps)
SELECT
    dp.id,
    'micro_not_srl',
    '❌ Microîntreprindere - Nu Ești Eligibil',
    '<div class="answer-section"><h3>🏢 Regimul de Microîntreprindere</h3><div class="alert-info"><p><strong>Regimul de microîntreprindere este disponibil DOAR pentru SRL-uri.</strong></p><p>Ca PFA sau II, vei plăti impozit pe venit conform normelor generale (10% din venit net).</p></div><h4>💡 Alternative:</h4><ul><li>Impozit pe venit: 10%</li><li>CAS: 25% (dacă depășești pragul)</li><li>CASS: 10% (dacă depășești pragul)</li></ul><p><strong>Recomandare:</strong> Consultă un contabil despre transformarea în SRL dacă vrei beneficiile micro (1-3%).</p></div>',
    'low',
    '0 zile',
    '["Consultă contabil pentru opțiuni fiscale","Evaluează costuri transformare în SRL"]'
FROM decision_paths dp
JOIN decision_nodes dn ON dp.node_id = dn.id
WHERE dn.node_key = 'micro_root' AND dp.path_key = 'not_srl';

INSERT INTO decision_answers (path_id, path_key answer_text, next_steps)
SELECT
    dp.id,
    'micro_over_revenue',
    '❌ Venit Prea Mare pentru Micro',
    '<div class="answer-section"><h3>📊 Depășești Pragul de 500.000 EUR</h3><div class="alert-warning"><p><strong>Nu poți opta pentru microîntreprindere.</strong></p><p>Vei plăti impozit pe profit: 16% din profitul net.</p></div><h4>✅ Avantaje regim profit:</h4><ul><li>Deduci TOATE cheltuielile justificate</li><li>Eficient pentru afaceri cu cheltuieli mari</li><li>Reportare pierderi din anii anteriori</li></ul><h4>💰 Costuri:</h4><p>Contabilitate: 500-1000 RON/lună (SRL pe profit)</p></div>',
    'low',
    '0 zile',
    '["Angajează contabil pentru profit","Organizează evidența cheltuielilor","Profită de deduceri"]'
FROM decision_paths dp
JOIN decision_nodes dn ON dp.node_id = dn.id
WHERE dn.node_key = 'micro_check_revenue' AND dp.path_key = 'over_500k';

INSERT INTO decision_answers (path_id, path_key answer_text, next_steps)
SELECT
    dp.id,
    'micro_too_many_employees',
    '❌ Prea Mulți Angajați',
    '<div class="answer-section"><h3>👥 Depășești Pragul de Angajați</h3><div class="alert-warning"><p><strong>Ai 9 sau mai mulți angajați.</strong></p><p>Pragul maxim pentru micro: 9 angajați (medie anuală).</p></div><p>Vei plăti impozit pe profit: 16%</p><h4>✅ Avantaje:</h4><ul><li>Deduci salariile + contribuțiile</li><li>Deduci toate cheltuielile justificate</li><li>Flexibilitate în angajare</li></ul><p><strong>Cost contabilitate:</strong> 500-1000 RON/lună</p></div>',
    'low',
    '0 zile',
    '["Contabil specializat profit","Evidență salarizare","Profită de deduceri salariale"]'
FROM decision_paths dp
JOIN decision_nodes dn ON dp.node_id = dn.id
WHERE dn.node_key = 'micro_check_employees' AND dp.path_key = '9_or_more';

INSERT INTO decision_answers (path_id, path_key answer_text, next_steps)
SELECT
    dp.id,
    'micro_eligible_1pct',
    '✅ Eligibil Micro - 1% Impozit',
    '<div class="answer-section"><h3>🎉 Ești Eligibil pentru Microîntreprindere!</h3><div class="alert-success"><p><strong>Cota ta: 1% din cifra de afaceri</strong></p></div><h4>Ce înseamnă:</h4><ul><li>Plătești 1% din VENIT total (nu profit)</li><li>Cheltuielile NU se deduc</li><li>Calcul simplu, administrare ușoară</li><li>Ideal pentru marje mari</li></ul><h4>⏰ Obligații:</h4><p><strong>Declarația 100:</strong> Trimestrial, până pe 25</p><h4>💰 Costuri lunare:</h4><p>Contabil: 150-300 RON/lună<br>Software: 50-150 RON/lună<br><strong>Total: 200-450 RON/lună</strong></p><h4>📋 Exemple calcul:</h4><p>La 100.000 RON venit anual:<br>- Impozit: 1.000 RON (1%)<br>- Foarte avantajos vs profit!</p></div>',
    'low',
    '0 zile',
    '["Optează micro până 31 ianuarie","Angajează contabil","Ține evidența veniturilor"]'
FROM decision_paths dp
JOIN decision_nodes dn ON dp.node_id = dn.id
WHERE dn.node_key = 'micro_check_consulting' AND dp.path_key = 'low_consulting';

INSERT INTO decision_answers (path_id, path_key answer_text, next_steps)
SELECT
    dp.id,
    'micro_eligible_3pct',
    '✅ Eligibil Micro - 3% Impozit',
    '<div class="answer-section"><h3>🎉 Ești Eligibil pentru Micro</h3><div class="alert-warning"><p><strong>Cota ta: 3% din cifra de afaceri</strong></p><p>Aplici 3% deoarece >80% venit din consultanță.</p></div><h4>Ce înseamnă:</h4><ul><li>Plătești 3% din VENIT total</li><li>Cheltuielile NU se deduc</li><li>Tot mai simplu decât profit</li></ul><h4>⚖️ Compară cu profit:</h4><table><tr><th>Micro 3%</th><th>Profit 16%</th></tr><tr><td>3% din venituri</td><td>16% din profit</td></tr><tr><td>Nu deduci</td><td>Deduci cheltuieli</td></tr></table><p><strong>Exemplu:</strong> La 100k venit + 40k cheltuieli:<br>- Micro 3%: 3.000 RON<br>- Profit 16%: 9.600 RON (16% din 60k profit)</p><p><strong>Micro e mai bun dacă cheltuieli <50%!</strong></p></div>',
    'medium',
    '0 zile',
    '["Optează micro dacă cheltuieli <50%","Simulare cu contabil","Evidență consultanță vs alte activități"]'
FROM decision_paths dp
JOIN decision_nodes dn ON dp.node_id = dn.id
WHERE dn.node_key = 'micro_check_consulting' AND dp.path_key = 'high_consulting';

-- =============================================================================
-- TREE 2: EMPLOYEE HIRING
-- =============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, is_active)
VALUES (
    'employee_hiring',
    'Angajare Salariați',
    'Ghid pentru angajarea primilor salariați: proceduri, costuri, termene ANAF',
    'hr_payroll',
    'users',
    true
);

-- Nodes for tree 2
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT id, 'hiring_root',
    'Este primul tău angajat?',
    'Procedurile diferă pentru primul angajat.',
    false
FROM decision_trees WHERE tree_key = 'employee_hiring';

INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT
    dt.id,
    'hiring_salary',
    dn.id,
    'Ce salariu brut vei oferi?',
    'Minim: 3.300 RON (salariu minim 2024)',
    false
FROM decision_trees dt
CROSS JOIN decision_nodes dn
WHERE dt.tree_key = 'employee_hiring' AND dn.node_key = 'hiring_root';

-- Paths for tree 2
INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT
    n1.id,
    'Da, e primul angajat',
    'first',
    n2.id,
    1
FROM decision_nodes n1, decision_nodes n2
WHERE n1.node_key = 'hiring_root' AND n2.node_key = 'hiring_salary';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT
    n1.id,
    'Nu, am deja angajați',
    'additional',
    n2.id,
    2
FROM decision_nodes n1, decision_nodes n2
WHERE n1.node_key = 'hiring_root' AND n2.node_key = 'hiring_salary';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'Salariu minim (3.300 RON)', 'minimum', NULL, 1
FROM decision_nodes WHERE node_key = 'hiring_salary';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'Peste minim', 'above', NULL, 2
FROM decision_nodes WHERE node_key = 'hiring_salary';

-- Answers for hiring (only first employee minimum wage for demo)
INSERT INTO decision_answers (path_id, path_key answer_text, next_steps)
SELECT
    dp.id,
    'hiring_first_minimum',
    '✅ Primul Angajat - Ghid Complet',
    '<div class="answer-section"><h3>👥 Primul Tău Angajat</h3><div class="alert-success"><p><strong>Salariu brut: 3.300 RON</strong></p></div><h4>📋 Proceduri ÎNAINTE:</h4><ol><li><strong>Înregistrare ANAF ca angajator</strong><ul><li>Formular: Declarația 010</li><li>Termen: Cu 20 zile înainte</li></ul></li><li><strong>Cont REVISAL</strong><ul><li>https://www.inspectiamuncii.ro/revisal</li><li>Declară postul înainte de angajare</li></ul></li><li><strong>Control medicina muncii</strong><ul><li>Programare înainte de angajare</li><li>Cost: 100-200 RON</li></ul></li></ol><h4>📄 Documente necesare:</h4><p><strong>De la angajat:</strong> CV, CI, CNP, ultima adeverință salariu, cazier (uneori), control medical</p><p><strong>De la angajator:</strong> Contract muncă (2 ex), fișa post</p><h4>⏰ Timeline:</h4><table><tr><th>Zi</th><th>Acțiune</th></tr><tr><td>-20</td><td>Declarație 010 ANAF</td></tr><tr><td>-10</td><td>Cont REVISAL + post</td></tr><tr><td>-3</td><td>Control medical</td></tr><tr><td>0</td><td>Semnare contract</td></tr><tr><td>0</td><td>Înreg. REVISAL (aceeași zi!)</td></tr><tr><td>1</td><td>Prima zi lucru</td></tr></table><h4>💰 Cost total lunar:</h4><table><tr><td>Salariu brut</td><td>3.300 RON</td></tr><tr><td>CAS angajator (4%)</td><td>132 RON</td></tr><tr><td><strong>TOTAL</strong></td><td><strong>3.432 RON/lună</strong></td></tr></table><p>Angajatul primește NET: ~2.145 RON (după 35% contribuții)</p><h4>📅 Obligații lunare:</h4><ul><li><strong>25 ale lunii:</strong> Declarație 112 + plată</li><li><strong>31 ianuarie:</strong> Declarație anuală 112</li></ul><p><strong>Cost contabil salarizare:</strong> 150-300 RON/lună</p></div>',
    'high',
    '20-30 zile',
    '["Declarație 010 ANAF (-20 zile)","Cont REVISAL + post (-10 zile)","Control medical (-3 zile)","Contract muncă (ziua 0)","Înreg REVISAL (ziua 0)","Contabil salarizare (150-300 RON/lună)"]'
FROM decision_paths dp
JOIN decision_nodes dn ON dp.node_id = dn.id
WHERE dn.node_key = 'hiring_salary' AND dp.path_key = 'minimum';

-- =============================================================================
-- TREE 3: DEDUCTIBLE EXPENSES
-- =============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, is_active)
VALUES (
    'deductible_expenses',
    'Cheltuieli Deductibile',
    'Ce cheltuieli poți deduce fiscal, cum justifici, limite legale',
    'accounting',
    'receipt',
    true
);

-- Nodes for tree 3
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT id, 'expense_root',
    'Ce tip de cheltuială vrei să deduci?',
    'Fiecare categorie are reguli specifice.',
    false
FROM decision_trees WHERE tree_key = 'deductible_expenses';

-- Paths for tree 3
INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'Protocol și reprezentare', 'protocol', NULL, 1
FROM decision_nodes WHERE node_key = 'expense_root';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'Deplasări (transport, cazare)', 'travel', NULL, 2
FROM decision_nodes WHERE node_key = 'expense_root';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'Utilități și chirie', 'utilities', NULL, 3
FROM decision_nodes WHERE node_key = 'expense_root';

INSERT INTO decision_paths (node_id, answer_option, path_key, next_node_id, path_order)
SELECT id, 'Echipamente și software', 'equipment', NULL, 4
FROM decision_nodes WHERE node_key = 'expense_root';

-- Answers for expenses
INSERT INTO decision_answers (path_id, path_key answer_text, next_steps)
SELECT
    dp.id,
    'expense_protocol',
    '📋 Protocol - Limită 2.5% din Salarii',
    '<div class="answer-section"><h3>🍽️ Cheltuieli Protocol</h3><div class="alert-warning"><p><strong>Deductibile în limita de 2,5% din cheltuielile cu salariile</strong></p></div><h4>Ce intră:</h4><ul><li>Mese afaceri cu parteneri</li><li>Cadouri (max 300 RON/cadou)</li><li>Recepții parteneri</li><li>Sponsorizări (reguli speciale)</li></ul><h4>⚠️ Condiții:</h4><ol><li><strong>Scop economic:</strong> Trebuie demonstrat</li><li><strong>Limita 2,5%:</strong> Din salarii anuale</li><li><strong>Documentare:</strong><ul><li>Factură/bon fiscal</li><li>Proces verbal participanți</li><li>Justificare scop</li></ul></li></ol><h4>💡 Exemplu:</h4><p>Cheltuieli salarii: 100.000 RON/an<br><strong>Limită protocol: 2.500 RON/an</strong></p><p>Peste 2.500 RON nu e deductibil (dar poți cheltui, doar nu reduci profitul impozabil).</p><h4>🎁 Cadouri:</h4><ul><li>Max 300 RON/cadou</li><li>Listă nominală beneficiari</li><li>Justificare: parteneriat, sărbători</li></ul></div>',
    'low',
    '0 zile',
    '["Evidență separată protocol","Calculează 2,5% din salarii","Proces verbal evenimente","Factură + justificare economică"]'
FROM decision_paths dp
JOIN decision_nodes dn ON dp.node_id = dn.id
WHERE dn.node_key = 'expense_root' AND dp.path_key = 'protocol';

INSERT INTO decision_answers (path_id, path_key answer_text, next_steps)
SELECT
    dp.id,
    'expense_travel',
    '✈️ Deplasări - 100% Deductibile',
    '<div class="answer-section"><h3>🚗 Cheltuieli Deplasări</h3><div class="alert-success"><p><strong>100% deductibile cu justificare corespunzătoare</strong></p></div><h4>Ce poți deduce:</h4><ul><li>Transport: avion, tren, mașină (combustibil, km)</li><li>Cazare: hotel, apartament</li><li>Diurnă: conform legii muncii</li><li>Parcare, taxe drum</li></ul><h4>📋 Documente necesare:</h4><ol><li><strong>Dispoziție delegare</strong> (ordin intern)</li><li><strong>Factură/bon</strong> pentru fiecare cheltuială</li><li><strong>Raport deplasare</strong> (scop, activități)</li><li><strong>Foaie parcurs</strong> (dacă mașină proprie)</li></ul><h4>💰 Limite diurnă:</h4><p><strong>România:</strong> 20-30 lei/zi (conform companie)<br><strong>Străinătate:</strong> Variabil pe țară (ex: Germania 40 EUR/zi)</p><h4>⚠️ Atenție:</h4><ul><li>Cheltuielile personale NU sunt deductibile</li><li>Trebuie legătură clară cu activitatea</li><li>Păstrează TOATE chitanțele</li></ul></div>',
    'low',
    '0 zile',
    '["Ordin delegare pentru fiecare deplasare","Păstrează toate chitanțele","Raport activități la întoarcere","Foaie parcurs mașină proprie"]'
FROM decision_paths dp
JOIN decision_nodes dn ON dp.node_id = dn.id
WHERE dn.node_key = 'expense_root' AND dp.path_key = 'travel';

COMMIT;

-- Verification
SELECT '=== TREES CREATED ===' as info;
SELECT tree_key, tree_name FROM decision_trees ORDER BY id;

SELECT '=== NODES CREATED ===' as info;
SELECT dt.tree_name, COUNT(dn.id) as nodes_count
FROM decision_trees dt
LEFT JOIN decision_nodes dn ON dt.id = dn.tree_id
GROUP BY dt.id, dt.tree_name
ORDER BY dt.id;

SELECT '=== PATHS CREATED ===' as info;
SELECT dt.tree_name, COUNT(dp.id) as paths_count
FROM decision_trees dt
LEFT JOIN decision_nodes dn ON dt.id = dn.tree_id
LEFT JOIN decision_paths dp ON dn.id = dp.node_id
GROUP BY dt.id, dt.tree_name
ORDER BY dt.id;

SELECT '=== ANSWERS CREATED ===' as info;
SELECT dt.tree_name, COUNT(da.id) as answers_count
FROM decision_trees dt
LEFT JOIN decision_nodes dn ON dt.id = dn.tree_id
LEFT JOIN decision_paths dp ON dn.id = dp.node_id
LEFT JOIN decision_answers da ON dp.id = da.path_id
GROUP BY dt.id, dt.tree_name
ORDER BY dt.id;
