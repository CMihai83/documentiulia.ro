-- Final Simple Migration: 3 New Decision Trees
-- Microenterprise, Hiring, Expenses

BEGIN;

-- TREE 1: Microenterprise ==================================================
INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active)
VALUES ('microenterprise', 'Microîntreprindere', 'Eligibilitate micro și cotă impozit', 'business', true);

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'microenterprise')
INSERT INTO decision_nodes (tree_id, node_key, question, is_terminal) SELECT id, 'micro_entity', 'Ce formă juridică ai?', false FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'microenterprise')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, is_terminal)
SELECT t.id, 'micro_revenue', n.id, 'Ce venit anual estimezi?', false
FROM t, decision_nodes n WHERE n.node_key = 'micro_entity';

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'micro_entity')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'srl', 'SRL', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'micro_revenue';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'micro_entity')
INSERT INTO decision_paths (node_id, path_key, answer_option) SELECT n.id, 'other', 'PFA/II' FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'micro_revenue')
INSERT INTO decision_paths (node_id, path_key, answer_option) SELECT n.id, 'under', 'Sub 500k EUR' FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'micro_revenue')
INSERT INTO decision_paths (node_id, path_key, answer_option) SELECT n.id, 'over', 'Peste 500k EUR' FROM n;

-- Answers
WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'other' AND node_id IN (SELECT id FROM decision_nodes WHERE node_key = 'micro_entity'))
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h3>❌ Nu Ești Eligibil</h3><p>Micro e doar pentru SRL. Ca PFA plătești 10% impozit pe venit.</p>',
'["Consultă contabil"]'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'under' AND node_id IN (SELECT id FROM decision_nodes WHERE node_key = 'micro_revenue'))
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h3>✅ Eligibil Micro 1-3%</h3><p>Poți opta pentru micro (1% sau 3% din venit, în funcție de activitate).</p><ul><li>1% - activități generale</li><li>3% - consultanță >80%</li></ul>',
'["Optează micro până 31 ianuarie","Angajează contabil (150-300 RON/lună)"]'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'over' AND node_id IN (SELECT id FROM decision_nodes WHERE node_key = 'micro_revenue'))
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h3>❌ Venit Prea Mare</h3><p>Depășești 500k EUR. Vei plăti 16% impozit pe profit (deduci cheltuieli).</p>',
'["Contabil profit (500-1000 RON/lună)","Evidență cheltuieli"]'
FROM p;

-- TREE 2: Hiring ============================================================
INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active)
VALUES ('hiring', 'Angajare', 'Ghid angajare primul salariat', 'hr', true);

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'hiring')
INSERT INTO decision_nodes (tree_id, node_key, question, is_terminal) SELECT id, 'hire_first', 'E primul angajat?', false FROM t;

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'hire_first')
INSERT INTO decision_paths (node_id, path_key, answer_option) SELECT n.id, 'yes', 'Da' FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'hire_first')
INSERT INTO decision_paths (node_id, path_key, answer_option) SELECT n.id, 'no', 'Nu' FROM n;

-- Answers
WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'yes' AND node_id IN (SELECT id FROM decision_nodes WHERE node_key = 'hire_first'))
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h3>👥 Primul Angajat</h3><p><strong>Proceduri:</strong></p><ol><li>Declarație 010 ANAF (-20 zile)</li><li>Cont REVISAL (-10 zile)</li><li>Control medical (-3 zile)</li><li>Contract muncă (ziua 0)</li></ol><p><strong>Cost la minim (3.300 RON brut):</strong> ~3.432 RON/lună (cu CAS angajator 4%)</p><p>Angajatul primește NET: ~2.145 RON</p>',
'["Declarație 010 ANAF","Cont REVISAL","Contabil salarizare (150-300 RON/lună)"]'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'no' AND node_id IN (SELECT id FROM decision_nodes WHERE node_key = 'hire_first'))
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h3>👥 Angajat Suplimentar</h3><p>Deja ai cont angajator, procedura e simplă:</p><ol><li>Contract muncă</li><li>Înregistrare REVISAL (aceeași zi)</li><li>Declarație 112 lunar</li></ol><p>Cost = Salariu brut + 4% CAS angajator</p>',
'["Contract muncă","Înregistrare REVISAL","Actualizare declarație 112"]'
FROM p;

-- TREE 3: Expenses ==========================================================
INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active)
VALUES ('expenses', 'Cheltuieli', 'Cheltuieli deductibile fiscal', 'accounting', true);

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'expenses')
INSERT INTO decision_nodes (tree_id, node_key, question, is_terminal) SELECT id, 'expense_type', 'Ce cheltuială?', false FROM t;

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'expense_type')
INSERT INTO decision_paths (node_id, path_key, answer_option) SELECT n.id, 'protocol', 'Protocol' FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'expense_type')
INSERT INTO decision_paths (node_id, path_key, answer_option) SELECT n.id, 'travel', 'Deplasări' FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'expense_type')
INSERT INTO decision_paths (node_id, path_key, answer_option) SELECT n.id, 'utilities', 'Utilități' FROM n;

-- Answers
WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'protocol' AND node_id IN (SELECT id FROM decision_nodes WHERE node_key = 'expense_type'))
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h3>🍽️ Protocol</h3><p><strong>Limită: 2,5% din cheltuieli salarii</strong></p><p>Intră: Mese afaceri, cadouri (max 300 RON/buc), recepții</p><p><strong>Documentare:</strong> Factură + proces verbal + justificare scop economic</p><p><strong>Exemplu:</strong> La 100k salarii → max 2.500 RON/an protocol deductibil</p>',
'["Evidență separată","Proces verbal","Factură + scop economic"]'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'travel' AND node_id IN (SELECT id FROM decision_nodes WHERE node_key = 'expense_type'))
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h3>✈️ Deplasări</h3><p><strong>100% deductibile</strong> cu documentare</p><p>Intră: Transport, cazare, diurnă, parcare</p><p><strong>Documente:</strong> Ordin delegare + factură + raport deplasare + foaie parcurs (mașină)</p><p><strong>Diurnă:</strong> RO 20-30 lei/zi, Străinătate variabil (ex: DE 40 EUR/zi)</p>',
'["Ordin delegare","Toate chitanțele","Raport la întoarcere","Foaie parcurs"]'
FROM p;

WITH p AS (SELECT id FROM decision_paths WHERE path_key = 'utilities' AND node_id IN (SELECT id FROM decision_nodes WHERE node_key = 'expense_type'))
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h3>💡 Utilități & Chirie</h3><p><strong>100% deductibile</strong> pentru spațiu cu destinație business</p><p>Intră: Chirie birou, curent, apă, căldură, internet, telefon</p><p><strong>Atenție:</strong> Dacă e acasă, doar prorata suprafață folosită business!</p>',
'["Contract chirie (dacă e cazul)","Factură utilități","Calculează prorata dacă e acasă"]'
FROM p;

COMMIT;

-- Verify
SELECT 'TREES:' as info, COUNT(*) as count FROM decision_trees;
SELECT 'NODES:' as info, COUNT(*) as count FROM decision_nodes;
SELECT 'PATHS:' as info, COUNT(*) as count FROM decision_paths;
SELECT 'ANSWERS:' as info, COUNT(*) as count FROM decision_answers;

SELECT tree_name, COUNT(dn.id) as nodes
FROM decision_trees dt
LEFT JOIN decision_nodes dn ON dt.id = dn.tree_id
GROUP BY dt.tree_name;
