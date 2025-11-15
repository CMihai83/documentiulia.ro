-- Migration: Add 3 New Decision Trees
-- Date: 2025-11-15
-- Trees: Microenterprise Eligibility, Employee Hiring, Deductible Expenses

-- Check next available tree_id
DO $$
DECLARE
    next_tree_id INT;
BEGIN
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_tree_id FROM decision_trees;
    RAISE NOTICE 'Next tree ID will be: %', next_tree_id;
END $$;

BEGIN;

-- =============================================================================
-- TREE 1: MICROENTERPRISE ELIGIBILITY
-- =============================================================================

-- Create tree (will be ID 2, 3, or 4 depending on existing data)
WITH new_tree AS (
    INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, is_active)
    VALUES (
        'microenterprise_eligibility',
        'Eligibilitate Microîntreprindere',
        'Verifică dacă firma ta poate opta pentru regimul de microîntreprindere și ce cotă de impozit se aplică',
        'business_formation',
        'building',
        true
    ) RETURNING id
)
-- Node 1: Root - Check entity type
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
SELECT id, 'micro_root', NULL,
    'Ce formă juridică are afacerea ta?',
    'multiple_choice',
    'Regimul de microîntreprindere este disponibil doar pentru anumite forme juridice.',
    0, false
FROM new_tree;

-- Get the tree_id for subsequent inserts
CREATE TEMP TABLE temp_tree_ids (tree_num INT, tree_id INT);
INSERT INTO temp_tree_ids (tree_num, tree_id)
SELECT 1, id FROM decision_trees WHERE tree_key = 'microenterprise_eligibility';

-- Node 2: Check revenue (for SRL)
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
SELECT tree_id, 'micro_check_revenue',
    (SELECT id FROM decision_nodes WHERE node_key = 'micro_root'),
    'Ce venit anual estimezi pentru anul curent?',
    'multiple_choice',
    'Pragul maxim pentru microîntreprindere este {{microenterprise_revenue_threshold}} {{unit}}.',
    0, false
FROM temp_tree_ids WHERE tree_num = 1;

-- Node 3: Check employees (for revenue under threshold)
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
SELECT tree_id, 'micro_check_employees',
    (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_revenue'),
    'Câți angajați vei avea (media anuală)?',
    'multiple_choice',
    'Pragul maxim este de {{microenterprise_employee_threshold}} angajați.',
    0, false
FROM temp_tree_ids WHERE tree_num = 1;

-- Node 4: Check consulting revenue percentage
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
SELECT tree_id, 'micro_check_consulting',
    (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_employees'),
    'Ce procent din venit va proveni din consultanță/management?',
    'multiple_choice',
    'Dacă peste 80% din venituri provin din consultanță, se aplică o cotă mai mare.',
    0, false
FROM temp_tree_ids WHERE tree_num = 1;

-- Decision Paths for Microenterprise

-- Path 1: SRL entity type
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
SELECT (SELECT id FROM decision_nodes WHERE node_key = 'micro_root'),
    'SRL (Societate cu Răspundere Limitată)', 'srl',
    (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_revenue'), 1;

-- Path 2: PFA entity type (not eligible)
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
SELECT (SELECT id FROM decision_nodes WHERE node_key = 'micro_root'),
    'PFA (Persoană Fizică Autorizată)', 'pfa', NULL, 2;

-- Path 3: II entity type (not eligible)
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
SELECT (SELECT id FROM decision_nodes WHERE node_key = 'micro_root'),
    'Întreprindere Individuală (II)', 'ii', NULL, 3;

-- Path 4: Revenue under threshold
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
SELECT (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_revenue'),
    'Sub 500.000 EUR', 'under_500k',
    (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_employees'), 1;

-- Path 5: Revenue over threshold
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
SELECT (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_revenue'),
    'Peste 500.000 EUR', 'over_500k', NULL, 2;

-- Path 6: Employees under limit
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
SELECT (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_employees'),
    'Sub 9 angajați', 'under_9',
    (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_consulting'), 1;

-- Path 7: Employees over limit
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
SELECT (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_employees'),
    '9 angajați sau mai mulți', '9_or_more', NULL, 2;

-- Path 8: Low consulting revenue (1% tax)
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
SELECT (SELECT id FROM decision_nodes WHERE node_key = 'micro_check_consulting'),
    'Sub 80% consultanță', 'low_consulting', NULL, 1;

-- Path 9: High consulting revenue (3% tax)
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (
    100, 2, 'micro_root', NULL,
    'Ce formă juridică are afacerea ta?',
    'multiple_choice',
    'Regimul de microîntreprindere este disponibil doar pentru anumite forme juridice.',
    0, false
);

-- Node 2: Check revenue (for SRL)
INSERT INTO decision_nodes (id, tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
VALUES (
    101, 2, 'micro_check_revenue', 100,
    'Ce venit anual estimezi pentru anul curent?',
    'multiple_choice',
    'Pragul maxim pentru microîntreprindere este {{microenterprise_revenue_threshold}} {{unit}}.',
    0, false
);

-- Node 3: Check employees (for revenue under threshold)
INSERT INTO decision_nodes (id, tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
VALUES (
    102, 2, 'micro_check_employees', 101,
    'Câți angajați vei avea (media anuală)?',
    'multiple_choice',
    'Pragul maxim este de {{microenterprise_employee_threshold}} angajați.',
    0, false
);

-- Node 4: Check consulting revenue percentage
INSERT INTO decision_nodes (id, tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
VALUES (
    103, 2, 'micro_check_consulting', 102,
    'Ce procent din venit va proveni din consultanță/management?',
    'multiple_choice',
    'Dacă peste 80% din venituri provin din consultanță, se aplică o cotă mai mare.',
    0, false
);

-- Decision Paths for Microenterprise

-- Path 1: SRL entity type
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (100, 'SRL (Societate cu Răspundere Limitată)', 'srl', 101, 1);

-- Path 2: PFA entity type (not eligible)
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (100, 'PFA (Persoană Fizică Autorizată)', 'pfa', NULL, 2);

-- Path 3: II entity type (not eligible)
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (100, 'Întreprindere Individuală (II)', 'ii', NULL, 3);

-- Path 4: Revenue under threshold
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (101, 'Sub 500.000 EUR', 'under_500k', 102, 1);

-- Path 5: Revenue over threshold
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (101, 'Peste 500.000 EUR', 'over_500k', NULL, 2);

-- Path 6: Employees under limit
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (102, 'Sub 9 angajați', 'under_9', 103, 1);

-- Path 7: Employees over limit
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (102, '9 angajați sau mai mulți', '9_or_more', NULL, 2);

-- Path 8: Low consulting revenue (1% tax)
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (103, 'Sub 80% consultanță', 'low_consulting', NULL, 1);

-- Path 9: High consulting revenue (3% tax)
INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES (103, '80% sau mai mult consultanță', 'high_consulting', NULL, 2);

-- Decision Answers for Microenterprise

-- Answer 1: Not eligible - PFA/II
INSERT INTO decision_answers (id, tree_id, path_id, answer_key, answer_title, answer_text, urgency, estimated_cost_min, estimated_cost_max, estimated_timeline, next_steps, related_forms)
VALUES (
    20, 2, 2, 'micro_not_eligible_pfa',
    '❌ Microîntreprindere - Nu ești eligibil',
    '<div class="answer-content"><h3>🏢 Regimul de Microîntreprindere - Nu Este Disponibil</h3><div class="alert-info"><p><strong>Din păcate, regimul de microîntreprindere este disponibil DOAR pentru SRL-uri.</strong></p><p>Ca PFA sau II, vei plăti impozit pe venit conform normelor generale.</p></div><h4>📋 Alternative pentru tine:</h4><ul><li><strong>Impozit pe venit</strong>: 10% din venitul net (venituri - cheltuieli)</li><li><strong>CAS</strong>: 25% din venitul net (dacă depășești 12 salarii minime/an)</li><li><strong>CASS</strong>: 10% din venitul net (dacă depășești 6 salarii minime/an)</li></ul><h4>💡 Recomandare:</h4><p>Dacă dorești beneficiile microîntreprinderii (1-3% impozit fix), consultă un contabil despre transformarea în SRL.</p></div>',
    'low', 0, 0, '0 zile',
    '["Consultă un contabil pentru opțiuni de optimizare fiscală","Evaluează costurile transformării în SRL dacă este avantajos"]',
    '[]'
);

-- Answer 2: Not eligible - Revenue over threshold
INSERT INTO decision_answers (id, tree_id, path_id, answer_key, answer_title, answer_text, urgency, estimated_cost_min, estimated_cost_max, estimated_timeline, next_steps, related_forms)
VALUES (
    21, 2, 5, 'micro_not_eligible_revenue',
    '❌ Depășești Pragul de Venit',
    '<div class="answer-content"><h3>🏢 Microîntreprindere - Venit Prea Mare</h3><div class="alert-urgent"><p><strong>Venitul tău anual depășește pragul de {{microenterprise_revenue_threshold}} {{unit}}.</strong></p></div><h4>📊 Ce înseamnă asta:</h4><ul><li>Nu poți opta pentru regimul de microîntreprindere</li><li>Vei plăti <strong>impozit pe profit: {{profit_tax_rate}}%</strong></li><li>Impozitul se calculează din profitul net (venituri - cheltuieli deductibile)</li></ul><h4>✅ Avantajul regimului de profit:</h4><ul><li>Deduci toate cheltuielile justificate și documentate</li><li>Mai eficient pentru afaceri cu cheltuieli mari</li><li>Posibilitate de reportare pierderi din anii anteriori</li></ul><h4>💰 Costuri estimate:</h4><p><strong>Servicii contabilitate:</strong> {{cost_range}} RON/lună (pentru SRL pe profit)</p><p><strong>Software contabil:</strong> 100-300 RON/lună</p></div>',
    'low', 500, 1000, '0 zile',
    '["Angajează contabil autorizat pentru regimul de profit","Organizează evidența cheltuielilor deductibile","Consideră avantajele deducerilor vs impozit fix"]',
    '[]'
);

-- Answer 3: Eligible - 1% tax
INSERT INTO decision_answers (id, tree_id, path_id, answer_key, answer_title, answer_text, urgency, estimated_cost_min, estimated_cost_max, estimated_timeline, next_steps, related_forms)
VALUES (
    22, 2, 8, 'micro_eligible_1_percent',
    '✅ Eligibil - Impozit {{microenterprise_tax_rate_1}}%',
    '<div class="answer-content"><h3>🎉 Felicitări! Ești Eligibil pentru Microîntreprindere</h3><div class="alert-success"><p><strong>Cota ta de impozit: {{microenterprise_tax_rate_1}}% din cifra de afaceri</strong></p></div><h4>📊 Ce înseamnă asta:</h4><ul><li>Plătești impozit pe <strong>venitul total</strong>, nu pe profit</li><li>Cheltuielile NU se deduc (impozit fix pe venit brut)</li><li>Mai simplu de calculat și administrat</li><li>Ideal pentru afaceri cu marje mari și cheltuieli mici</li></ul><h4>⏰ Termen de plată:</h4><p>Declarația și plata impozitului: <strong>{{tva_declaration_deadline}} {{unit}}</strong> (trimestrial)</p><h4>📋 Declarații necesare:</h4><ul><li><strong>Declarația 100</strong>: Trimestrial, până pe 25 ale lunii următoare trimestrului</li><li><strong>Declarația 112</strong>: Lunar, pentru angajați (dacă ai)</li></ul><h4>💰 Costuri estimate lunare:</h4><p><strong>Contabil:</strong> 150-300 RON/lună</p><p><strong>Software:</strong> 50-150 RON/lună</p><p><strong>Total:</strong> 200-450 RON/lună</p></div>',
    'low', 150, 300, '0 zile',
    '["Optează pentru regimul de microîntreprindere la înființare sau până pe 31 ianuarie","Angajează un contabil pentru declarațiile trimestriale","Ține evidența veniturilor (nu trebuie să justifici cheltuielile)"]',
    '["Declarația 100 (trimestrială)","Declarația 112 (lunară - dacă ai angajați)"]'
);

-- Answer 4: Eligible - 3% tax
INSERT INTO decision_answers (id, tree_id, path_id, answer_key, answer_title, answer_text, urgency, estimated_cost_min, estimated_cost_max, estimated_timeline, next_steps, related_forms)
VALUES (
    23, 2, 9, 'micro_eligible_3_percent',
    '✅ Eligibil - Impozit {{microenterprise_tax_rate_3}}%',
    '<div class="answer-content"><h3>🎉 Ești Eligibil pentru Microîntreprindere</h3><div class="alert-warning"><p><strong>Atenție! Cota ta de impozit: {{microenterprise_tax_rate_3}}% din cifra de afaceri</strong></p><p>Aplici cota de 3% deoarece peste 80% din venituri provin din consultanță, management sau servicii conexe.</p></div><h4>📊 Ce înseamnă asta:</h4><ul><li>Plătești impozit pe <strong>venitul total</strong>, nu pe profit</li><li>Cotă mai mare datorită tipului de activitate</li><li>Cheltuielile NU se deduc</li><li>Tot mai simplu decât regimul de profit</li></ul><h4>⏰ Termen de plată:</h4><p>Declarația și plata impozitului: <strong>{{tva_declaration_deadline}} {{unit}}</strong> (trimestrial)</p><h4>⚖️ Compară cu Impozitul pe Profit:</h4><table><tr><th>Microîntreprindere 3%</th><th>Impozit Profit {{profit_tax_rate}}%</th></tr><tr><td>3% din venituri</td><td>{{profit_tax_rate}}% din profit</td></tr><tr><td>Nu deduci cheltuieli</td><td>Deduci toate cheltuielile</td></tr><tr><td>Calcul simplu</td><td>Contabilitate complexă</td></tr></table><p><strong>💡 Exemplu:</strong> La 100.000 RON venit și 40.000 RON cheltuieli:<br>- Micro 3%: 3.000 RON impozit<br>- Profit {{profit_tax_rate}}%: 9.600 RON impozit ({{profit_tax_rate}}% din 60.000 profit)</p></div>',
    'medium', 150, 300, '0 zile',
    '["Optează pentru regimul de microîntreprindere dacă cheltuielile tale sunt sub 50% din venituri","Consultă un contabil pentru simulare microîntreprindere vs profit","Ține evidența precisă a veniturilor din consultanță vs alte activități"]',
    '["Declarația 100 (trimestrială)","Declarația 112 (lunară - dacă ai angajați)"]'
);

-- Answer 5: Not eligible - Too many employees
INSERT INTO decision_answers (id, tree_id, path_id, answer_key, answer_title, answer_text, urgency, estimated_cost_min, estimated_cost_max, estimated_timeline, next_steps, related_forms)
VALUES (
    24, 2, 7, 'micro_not_eligible_employees',
    '❌ Prea Mulți Angajați',
    '<div class="answer-content"><h3>🏢 Microîntreprindere - Depășești Pragul de Angajați</h3><div class="alert-urgent"><p><strong>Ai {{microenterprise_employee_threshold}} sau mai mulți angajați.</strong></p><p>Pragul maxim pentru microîntreprindere este de {{microenterprise_employee_threshold}} angajați (medie anuală).</p></div><h4>📊 Regim aplicabil:</h4><p>Vei plăti <strong>impozit pe profit: {{profit_tax_rate}}%</strong> din profitul net.</p><h4>💰 Costuri estimate:</h4><p><strong>Contabilitate:</strong> 500-1000 RON/lună (pentru SRL pe profit cu angajați)</p><h4>✅ Ce câștigi:</h4><ul><li>Deduci salariile și contribuțiile pentru toți angajații</li><li>Deduci toate cheltuielile justificate</li><li>Flexibilitate în angajarea de personal</li></ul></div>',
    'low', 500, 1000, '0 zile',
    '["Angajează contabil specializat în regimul de profit","Organizează evidența pentru salarizare și contribuții","Profită de deducerea cheltuielilor cu personalul"]',
    '[]'
);

-- =============================================================================
-- TREE 2: EMPLOYEE HIRING PROCESS
-- =============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, is_active)
VALUES (
    'employee_hiring',
    'Angajare Salariați',
    'Ghid complet pentru angajarea primilor salariați: tipuri de contract, costuri, proceduri ANAF',
    'hr_payroll',
    'users',
    true
);

-- Node: Root - First employee or additional
INSERT INTO decision_nodes (id, tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
VALUES (
    200, 3, 'hiring_root', NULL,
    'Este primul tău angajat sau ai deja personal?',
    'multiple_choice',
    'Procedurile diferă pentru primul angajat vs angajați suplimentari.',
    0, false
);

-- Node: Contract type
INSERT INTO decision_nodes (id, tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
VALUES (
    201, 3, 'hiring_contract_type', 200,
    'Ce tip de contract vrei să încheii?',
    'multiple_choice',
    'Tipul contractului determină obligațiile și costurile.',
    0, false
);

-- Node: Salary amount
INSERT INTO decision_nodes (id, tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
VALUES (
    202, 3, 'hiring_salary', 201,
    'Ce salariu brut vei oferi?',
    'multiple_choice',
    'Salariul minim brut pe economie este {{minimum_gross_salary}} RON.',
    0, false
);

-- Paths for Employee Hiring

INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES
(200, 'Primul angajat', 'first_employee', 201, 1),
(200, 'Angajat suplimentar', 'additional_employee', 201, 2),
(201, 'Contract pe perioadă nedeterminată (permanent)', 'cim', 202, 1),
(201, 'Contract pe perioadă determinată (temporar)', 'cdd', 202, 2),
(201, 'Contract cu timp parțial', 'part_time', 202, 3),
(202, 'Salariu minim ({{minimum_gross_salary}} RON)', 'minimum_wage', NULL, 1),
(202, 'Peste salariul minim', 'above_minimum', NULL, 2);

-- Answers for Employee Hiring

INSERT INTO decision_answers (id, tree_id, path_id, answer_key, answer_title, answer_text, urgency, estimated_cost_min, estimated_cost_max, estimated_timeline, next_steps, related_forms)
VALUES (
    30, 3, 13, 'hiring_first_cim_minimum',
    '✅ Angajare Primul Salariat - Contract Permanent',
    '<div class="answer-content"><h3>👥 Primul Tău Angajat - Ghid Complet</h3><div class="alert-success"><p><strong>Contract pe Perioadă Nedeterminată (CIM)</strong></p><p>Salariu brut: {{minimum_gross_salary}} RON</p></div><h4>📋 Proceduri ÎNAINTE de angajare:</h4><ol><li><strong>Înregistrare ca angajator la ANAF</strong> (dacă e primul angajat)<ul><li>Formular: Declarația 010 (secțiunea pentru angajatori)</li><li>Termen: Cu 20 de zile înainte de angajare</li></ul></li><li><strong>Înregistrare în REVISAL</strong><ul><li>Acces: https://www.inspectiamuncii.ro/revisal</li><li>Creează cont angajator și obține parolă</li><li>Termen: Înainte de angajare</li></ul></li><li><strong>Declararea postului în REVISAL</strong><ul><li>Declară postul cu COR (Clasificarea Ocupațiilor din România)</li><li>Termen: Înainte de semnarea contractului</li></ul></li></ol><h4>📄 Documentele necesare:</h4><h5>De la angajat:</h5><ul><li>CV actualizat</li><li>Copie CI sau pașaport</li><li>CNP</li><li>Ultima adeverință de salariu (dacă a mai lucrat)</li><li>Certificat de cazier judiciar (pentru anumite posturi)</li><li>Adeverință medicală (control medicina muncii)</li></ul><h5>De la angajator:</h5><li>Contract individual de muncă (2 exemplare)</li><li>Regulament intern (dacă ai peste 10 angajați)</li><li>Fișa postului</li></ul><h4>⏰ Timeline angajare:</h4><table><tr><th>Zi</th><th>Acțiune</th></tr><tr><td>Zi -20</td><td>Înregistrare ANAF ca angajator (declarație 010)</td></tr><tr><td>Zi -10</td><td>Cont REVISAL creat și post declarat</td></tr><tr><td>Zi -3</td><td>Control medicina muncii pentru angajat</td></tr><tr><td>Zi 0</td><td>Semnare contract de muncă</td></tr><tr><td>Zi 0</td><td>Înregistrare contract în REVISAL (în aceeași zi!)</td></tr><tr><td>Zi 1</td><td>Prima zi de lucru</td></tr></table><h4>💰 Costuri complete lunare:</h4><table><tr><th>Element</th><th>Suma (RON)</th></tr><tr><td>Salariu brut</td><td>{{minimum_gross_salary}}</td></tr><tr><td>CAS angajator (4% din brut)</td><td>132</td></tr><tr><td>Total cost angajator</td><td><strong>3.432 RON</strong></td></tr></table><p><strong>Ce primește angajatul NET:</strong> ~{{minimum_gross_salary}} - 35% contribuții = ~2.145 RON</p><h4>📅 Obligații lunare:</h4><ul><li><strong>Până pe 25</strong>: Depunere Declarație 112 (contribuții sociale)</li><li><strong>Până pe 25</strong>: Plată salarii + contribuții</li><li><strong>Până pe 31 ianuarie</strong>: Declarație anuală D112 (recapitulație)</li></ul></div>',
    'high', 3500, 4000, '20-30 zile',
    '["Înregistrare ANAF ca angajator (formular 010) - cu 20 zile înainte","Creare cont REVISAL și declarare post","Contract medicina muncii pentru angajat","Semnare contract individual de muncă","Înregistrare contract în REVISAL în ziua semnării","Angajare contabil pentru salarizare (150-300 RON/lună)"]',
    '["Declarația 010 (înregistrare angajator)","Contract individual de muncă","Declarația 112 (lunară - contribuții)","Declarația anuală 112"]'
);

-- =============================================================================
-- TREE 3: DEDUCTIBLE EXPENSES
-- =============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, is_active)
VALUES (
    'deductible_expenses',
    'Cheltuieli Deductibile',
    'Ghid pentru cheltuieli deductibile fiscal: ce poți deduce, cum justifici, limite legale',
    'accounting',
    'receipt',
    true
);

-- Node: Root - Expense category
INSERT INTO decision_nodes (id, tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
VALUES (
    300, 4, 'expense_root', NULL,
    'Ce tip de cheltuială vrei să deduci?',
    'multiple_choice',
    'Fiecare categorie are reguli specifice de deductibilitate.',
    0, false
);

-- Node: Travel - domestic or international
INSERT INTO decision_nodes (id, tree_id, node_key, parent_node_id, question, question_type, help_text, display_order, is_terminal)
VALUES (
    301, 4, 'expense_travel_type', 300,
    'Este deplasare internă sau externă?',
    'multiple_choice',
    'Regulile diferă pentru deplasări în România vs străinătate.',
    0, false
);

-- Paths for Deductible Expenses

INSERT INTO decision_paths (node_id, answer_option, answer_key, next_node_id, path_order)
VALUES
(300, 'Deplasări (transport, cazare, diurnă)', 'travel', 301, 1),
(300, 'Protocol și reprezentare', 'protocol', NULL, 2),
(300, 'Utilități și chirie birou', 'utilities', NULL, 3),
(300, 'Echipamente și software', 'equipment', NULL, 4),
(300, 'Marketing și publicitate', 'marketing', NULL, 5),
(301, 'Deplasare în România', 'domestic', NULL, 1),
(301, 'Deplasare în străinătate', 'international', NULL, 2);

-- Answers for Deductible Expenses

INSERT INTO decision_answers (id, tree_id, path_id, answer_key, answer_title, answer_text, urgency, estimated_cost_min, estimated_cost_max, estimated_timeline, next_steps, related_forms)
VALUES (
    40, 4, 19, 'expense_protocol',
    '📋 Cheltuieli Protocol - Deductibile cu Limită',
    '<div class="answer-content"><h3>🍽️ Cheltuieli de Protocol și Reprezentare</h3><div class="alert-warning"><p><strong>Deductibile în limita de 2,5% din valoarea cheltuielilor cu salariile</strong></p></div><h4>Ce intră în cheltuieli de protocol:</h4><ul><li>Mese de afaceri cu parteneri/clienți</li><li>Cadouri pentru parteneri de afaceri (max 300 RON/cadou)</li><li>Recepții pentru parteneri</li><li>Sponsorizări (reguli speciale)</li></ul><h4>⚠️ Condiții de deductibilitate:</h4><ol><li><strong>Legătură cu activitatea</strong>: Trebuie să demonstrezi scop economic</li><li><strong>Limita 2,5%</strong>: Calculată din cheltuielile cu salariile anuale</li><li><strong>Documentare</strong>:<ul><li>Factură sau bon fiscal</li><li>Proces verbal semnat de participanți</li><li>Scop economic explicat</li></ul></li></ol><h4>💡 Exemplu calcul:</h4><p>Dacă cheltuielile cu salariile sunt 100.000 RON/an:<br><strong>Limită protocol deductibilă: 2.500 RON/an</strong></p><p>Orice depășește 2.500 RON NU este deductibil (dar poți cheltui, doar că nu reduci profitul impozabil).</p><h4>🎁 Reguli speciale cadouri:</h4><ul><li>Max 300 RON/cadou pentru a fi deductibil</li><li>Trebuie să existe lista nominală cu beneficiarii</li><li>Justificare: parteneriat, sărbători legale, etc.</li></ul></div>',
    'low', 0, 0, '0 zile',
    '["Ține evidența separată pentru cheltuieli protocol","Calculează limita de 2,5% din salarii anual","Păstrează proces verbal pentru fiecare eveniment protocol","Asigură-te că ai factură + justificare economică"]',
    '[]'
);

-- Update Points for New Trees

-- Microenterprise update points
INSERT INTO decision_tree_update_points (
    tree_id, node_id, update_category, data_point_name, current_value,
    linked_variable_key, update_frequency, next_verification_due,
    verification_source, criticality, auto_updateable
) VALUES
(2, 101, 'threshold', 'Prag venit microîntreprindere', '500.000 EUR',
 'microenterprise_revenue_threshold', 'annual', '2026-01-01',
 'Cod Fiscal Art. 47', 'critical', true),

(2, 102, 'threshold', 'Prag angajați microîntreprindere', '9 angajați',
 'microenterprise_employee_threshold', 'annual', '2026-01-01',
 'Cod Fiscal Art. 47', 'critical', true),

(2, 103, 'tax_rate', 'Cotă impozit micro 1%', '1%',
 'microenterprise_tax_rate_1', 'on_legislation_change', '2026-01-01',
 'Cod Fiscal Art. 47', 'critical', true),

(2, 103, 'tax_rate', 'Cotă impozit micro 3%', '3%',
 'microenterprise_tax_rate_3', 'on_legislation_change', '2026-01-01',
 'Cod Fiscal Art. 47', 'critical', true);

-- Employee hiring update points
INSERT INTO decision_tree_update_points (
    tree_id, node_id, update_category, data_point_name, current_value,
    linked_variable_key, update_frequency, next_verification_due,
    verification_source, criticality, auto_updateable
) VALUES
(3, 202, 'threshold', 'Salariu minim brut', '3.300 RON',
 'minimum_gross_salary', 'annual', '2026-01-01',
 'HG Guvern', 'critical', true),

(3, NULL, 'tax_rate', 'CAS angajat', '25%',
 'cas_employee_rate', 'on_legislation_change', '2026-01-01',
 'Cod Fiscal', 'critical', true),

(3, NULL, 'tax_rate', 'CASS angajat', '10%',
 'cass_employee_rate', 'on_legislation_change', '2026-01-01',
 'Cod Fiscal', 'critical', true),

(3, NULL, 'deadline', 'Termen declarație 112', '25 ale lunii următoare',
 'd112_deadline', 'on_legislation_change', '2026-01-01',
 'Cod Fiscal', 'high', false);

COMMIT;

-- Verification queries
SELECT 'Decision Trees Created:' as info, COUNT(*) as count FROM decision_trees;
SELECT 'Decision Nodes Created:' as info, COUNT(*) as count FROM decision_nodes WHERE tree_id >= 2;
SELECT 'Decision Paths Created:' as info, COUNT(*) as count FROM decision_paths WHERE node_id >= 100;
SELECT 'Decision Answers Created:' as info, COUNT(*) as count FROM decision_answers WHERE tree_id >= 2;
SELECT 'Update Points Created:' as info, COUNT(*) as count FROM decision_tree_update_points WHERE tree_id >= 2;
