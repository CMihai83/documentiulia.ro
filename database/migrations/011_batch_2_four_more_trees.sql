-- BATCH 2: 4 More Priority Trees
-- Tax Calendar, Termination, GDPR, Funding

BEGIN;

-- ============================================================================
-- TREE 4: Tax Deadlines Calendar - Fiscal Obligations
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'tax_calendar',
  'Calendar Fiscal - Termene și Declarații',
  'Toate termenele fiscale în funcție de tipul de business: micro, profit, TVA, salarii',
  'fiscal',
  true,
  7
);

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'tax_calendar')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'business_type_tax',
  'Ce tip de afacere ai?',
  'Fiecare tip de entitate (SRL micro, SRL profit, PFA) are obligații fiscale diferite.',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'tax_calendar')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'has_employees', n.id,
  'Ai angajați?',
  'Angajații adaugă obligații lunare (declarația 112 și plăți contribuții).',
  false
FROM t, decision_nodes n WHERE n.node_key = 'business_type_tax';

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'tax_calendar')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'vat_registered_tax', n.id,
  'Ești plătitor de TVA?',
  'TVA adaugă declarații lunare sau trimestriale (300) și plăți pe 25.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'has_employees';

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'business_type_tax')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'srl_micro', 'SRL pe Microîntreprindere', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'has_employees';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'business_type_tax')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'srl_profit', 'SRL pe Impozit Profit', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'has_employees';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'business_type_tax')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'pfa', 'PFA', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'has_employees';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'has_employees')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'yes_emp', 'Da - am angajați', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'vat_registered_tax';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'has_employees')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'no_emp', 'Nu - solo', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'vat_registered_tax';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'vat_registered_tax')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'vat_yes', 'Da - plătitor TVA'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'vat_registered_tax')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'vat_no', 'Nu - fără TVA'
FROM n;

-- Answers (comprehensive calendar)
WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'vat_registered_tax' AND dp.path_key = 'vat_yes'
), parent_emp AS (
  SELECT dp2.path_key FROM decision_paths dp2
  JOIN decision_nodes dn2 ON dp2.node_id = dn2.id
  WHERE dn2.node_key = 'has_employees'
), parent_type AS (
  SELECT dp3.path_key FROM decision_paths dp3
  JOIN decision_nodes dn3 ON dp3.node_id = dn3.id
  WHERE dn3.node_key = 'business_type_tax'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>📅 CALENDAR FISCAL COMPLET - SRL + Angajați + TVA</h2>

<div class="alert alert-warning">
<strong>Complexitate maximă:</strong> Ai cel mai complex set de obligații fiscale. Contabil obligatoriu!
</div>

<h3>📌 Obligații LUNARE (până pe 25):</h3>

<h4>1. Declarația 112 (Salarii și Contribuții)</h4>
<ul>
<li><strong>Ce:</strong> Raportare salarii, CAS, CASS, impozit pe venit angajați</li>
<li><strong>Termen:</strong> Ziua 25 a lunii următoare</li>
<li><strong>Plată:</strong> Contribuții și impozit, aceeași dată (25)</li>
<li><strong>Penalitate întârziere:</strong> 0,04%/zi (14,6%/an) + majorări de întârziere</li>
</ul>

<h4>2. Declarația 300 (TVA)</h4>
<ul>
<li><strong>Ce:</strong> TVA colectat vs TVA deductibil</li>
<li><strong>Termen:</strong> Ziua 25 a lunii următoare (dacă >100.000 EUR/an)</li>
<li><strong>Plată:</strong> Diferență TVA, aceeași dată (25)</li>
<li><strong>Observație:</strong> Dacă <100.000 EUR/an, poți fi trimestrial (vezi mai jos)</li>
</ul>

<h3>📌 Obligații TRIMESTRIALE:</h3>

<h4>3. Declarația 100 (Impozit Micro sau Profit)</h4>
<ul>
<li><strong>Micro:</strong> 1-3% din venit trimestrial</li>
<li><strong>Profit:</strong> 16% din profit trimestrial</li>
<li><strong>Termen:</strong> Ziua 25 a lunii următoare trimestrului</li>
<li><strong>Exemple:</strong>
  <ul>
  <li>T1 (Ian-Mar): declarație + plată până 25 aprilie</li>
  <li>T2 (Apr-Iun): până 25 iulie</li>
  <li>T3 (Iul-Sep): până 25 octombrie</li>
  <li>T4 (Oct-Dec): până 25 ianuarie anul următor</li>
  </ul>
</li>
</ul>

<h4>4. Declarația 394 (Situație financiară)</h4>
<ul>
<li><strong>Ce:</strong> Raportare situație financiară (bilanț prescurtat)</li>
<li><strong>Când:</strong> T1 și T3 (aprilie și octombrie)</li>
<li><strong>Termen:</strong> Ziua 15 ale lunii următoare semestrului</li>
</ul>

<h3>📌 Obligații ANUALE:</h3>

<h4>5. Bilanț Contabil (Balanță + Anexe)</h4>
<ul>
<li><strong>Ce:</strong> Situații financiare anuale complete</li>
<li><strong>Termen:</strong> 150 zile de la închiderea anului fiscal (30 mai pentru an calendaristic)</li>
<li><strong>Unde:</strong> Depunere la Ministerul Finanțelor (online SPV)</li>
</ul>

<h4>6. Declarația 101 (Recapitulativă Impozit Profit - dacă SRL profit)</h4>
<ul>
<li><strong>Ce:</strong> Declarație anuală profit cu ajustări finale</li>
<li><strong>Termen:</strong> 25 martie anul următor</li>
</ul>

<h3>📅 CALENDAR LUNAR COMPLET (Exemplu):</h3>
<pre>
Data   | Obligație                           | Referință
────────────────────────────────────────────────────────────
25 Ian | 112 (salarii dec) + 300 (TVA dec)   | Lună anterioară
25 Feb | 112 (sal ian) + 300 (TVA ian)       | "
25 Mar | 112 (sal feb) + 300 (TVA feb)       | "
25 Apr | 112 (sal mar) + 300 (TVA mar)       | "
       | + 100 (micro/profit T1)             | Trimestru anterior
       | + 394 (situație fin. T1)            | "
25 Mai | 112 + 300                           | Lună anterioară
30 Mai | BILANȚ ANUAL (situații financiare)  | An anterior
25 Iun | 112 + 300                           | Lună anterioară
25 Iul | 112 + 300 + 100 (T2)                | "
25 Aug | 112 + 300                           | "
25 Sep | 112 + 300                           | "
25 Oct | 112 + 300 + 100 (T3) + 394 (T3)    | "
25 Noi | 112 + 300                           | "
25 Dec | 112 + 300                           | "
25 Ian | 112 (dec) + 300 (dec) + 100 (T4)   | An anterior/nou
       | (+101 dacă profit)                  | An anterior
</pre>

<h3>🔴 ATENȚIE - Riscuri Majore:</h3>
<div class="alert alert-danger">
<ul>
<li><strong>Penalități severe:</strong> 0,04%/zi pentru plăți întârziate</li>
<li><strong>Blocarea contului:</strong> ANAF poate bloca contul la restanțe >5.000 RON</li>
<li><strong>Pierderea micro:</strong> Declarații neachitate → trecere forțată pe profit</li>
</ul>
</div>

<h3>✅ RECOMANDĂRI:</h3>
<ol>
<li><strong>Contabil profesionist:</strong> Obligatoriu pentru acest nivel de complexitate (500-1.000 RON/lună)</li>
<li><strong>Calendar Google:</strong> Adaugă toate termenele cu reminder 5 zile înainte</li>
<li><strong>Cont separat taxe:</strong> Virează lunar 30-35% din venit în cont dedicat fiscalității</li>
<li><strong>Backup contabil:</strong> Asigură-te că ai acces la SPV (spațiul privat virtual ANAF)</li>
<li><strong>Software contabilitate:</strong> WizCount, SmartBill, Saga - automatizare declarații</li>
</ol>',
'["Angajează contabil experimentat (verifică referințe!)","Configurează reminder-e 5 zile înainte de 25","Cont bancar separat pentru taxe (30-35% venit)","Acces SPV ANAF (cu certificat digital)","Verifică lunar: toate declarațiile depuse?","Backup plan: al doilea contabil de rezervă"]'
FROM p;

-- ============================================================================
-- TREE 5: Employment Termination - Concediere/Demisie
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'employment_termination',
  'Concediere și Demisie - Procedură Legală',
  'Ghid complet: concediere pentru motive imputabile/neimputabile, demisie, compensații',
  'hr',
  true,
  6
);

-- Variables
INSERT INTO legislation_variables (variable_key, variable_name, current_value, value_type, unit, effective_from, last_verified)
VALUES
  ('severance_per_year', 'Indemnizație concediere/an vechime', '1', 'text', 'salarii', '2024-01-01', CURRENT_DATE),
  ('notice_period_employer', 'Preaviz concediere angajator', '20', 'days', 'zile lucr.', '2024-01-01', CURRENT_DATE),
  ('notice_period_employee', 'Preaviz demisie angajat', '20', 'days', 'zile lucr.', '2024-01-01', CURRENT_DATE)
ON CONFLICT (variable_key) DO UPDATE SET current_value = EXCLUDED.current_value, last_verified = EXCLUDED.last_verified;

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'employment_termination')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'who_initiates',
  'Cine inițiază încetarea contractului?',
  'Procedura diferă complet dacă inițiază angajatorul (concediere) sau angajatul (demisie).',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'employment_termination')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'termination_reason', n.id,
  'Care e motivul concedierii?',
  'Motivul determină procedura, indemnizația și riscul de contestație.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'who_initiates';

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'who_initiates')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'employer_fires', 'Angajator (vreau să concediez)', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'termination_reason';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'who_initiates')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'employee_resigns', 'Angajat (demisionează)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'who_initiates')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'mutual_agreement', 'Comun acord (negociere)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'termination_reason')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'performance', 'Performanță slabă / Neîndeplinire atribuții'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'termination_reason')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'misconduct', 'Abatere disciplinară gravă'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'termination_reason')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'redundancy', 'Desființare post (restructurare)'
FROM n;

-- Answers
WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'termination_reason' AND dp.path_key = 'performance'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>📋 CONCEDIERE pentru PERFORMANȚĂ SLABĂ</h2>

<div class="alert alert-warning">
<strong>ATENȚIE:</strong> Procedură strictă! Risc mare de contestație dacă nu urmezi pașii.
</div>

<h3>Condiții Legale (Codul Muncii Art. 61):</h3>
<ul>
<li>✅ Angajatul nu îndeplinește <strong>obiective de performanță clar stabilite</strong> în contract/fișa postului</li>
<li>✅ Ai făcut <strong>evaluări periodice documentate</strong> (anuale/semestriale)</li>
<li>✅ Ai dat <strong>feedback scris</strong> și șanse de îmbunătățire</li>
<li>❌ NU poți concedia fără obiective măsurabile (contestație sigură!)</li>
</ul>

<h3>📋 PROCEDURĂ PAS-CU-PAS:</h3>

<h4>Pas 1: Evaluare Performance (ÎNAINTE de decizie)</h4>
<ol>
<li>Completează <strong>fișă evaluare performanță</strong> (score sub minim acceptabil)</li>
<li>Organizează <strong>întâlnire față-în-față</strong> cu angajatul:
  <ul>
  <li>Prezintă obiective neatinse (cu cifre!)</li>
  <li>Ascultă explicații angajat</li>
  <li>Consemnează totul într-un <strong>proces-verbal discuție</strong> (semnat de ambii)</li>
  </ul>
</li>
<li>Acordă <strong>plan de îmbunătățire (PIP - Performance Improvement Plan)</strong>:
  <ul>
  <li>Durata: 30-60 zile</li>
  <li>Obiective clare, măsurabile, atinse în termen</li>
  <li>Evaluare la final: atins = rămâne, neatins = concediere</li>
  </ul>
</li>
</ol>

<h4>Pas 2: Decizie Concediere (dacă PIP eșuat)</h4>
<ol>
<li><strong>Decizie scrisă de concediere:</strong>
  <ul>
  <li>Motivare detaliată (obiective neatinse, PIP eșuat)</li>
  <li>Referințe la evaluări anterioare</li>
  <li>Mențiune: "conform Art. 61 alin. 1 lit. a din Codul Muncii"</li>
  </ul>
</li>
<li><strong>Comunicare decizie:</strong>
  <ul>
  <li>În scris, cu confirmare de primire (semnătură + dată)</li>
  <li>Dacă refuză să semneze: anunță prin <strong>scrisoare recomandată cu confirmare</strong></li>
  </ul>
</li>
<li><strong>Preaviz:</strong>
  <ul>
  <li>Durata: <strong>20 zile lucrătoare</strong> (obligatoriu!)</li>
  <li>NU poți scurta (doar prin acord mutual)</li>
  <li>Angajatul lucrează în perioada de preaviz (sau îl plătești)</li>
  </ul>
</li>
</ol>

<h4>Pas 3: Finalizare (La expirarea preavizului)</h4>
<ol>
<li><strong>Plăți finale:</strong>
  <ul>
  <li>Salariu pentru zilele lucrate</li>
  <li>Concediu neefectuat (dacă are zile rămase)</li>
  <li><strong>NU datorezi indemnizație de concediere</strong> (concediere din vina angajatului)</li>
  </ul>
</li>
<li><strong>Documente finale:</strong>
  <ul>
  <li>Adeverință vechime</li>
  <li>Copie carnet muncă (dacă există)</li>
  <li>Fișă fiscală (pentru noul angajator)</li>
  </ul>
</li>
<li><strong>REVISAL:</strong>
  <ul>
  <li>Înregistrare încetare contract în ziua expirării preavizului</li>
  <li>Motiv: "Art. 61 alin. 1 lit. a - necorespundere profesională"</li>
  </ul>
</li>
</ol>

<h3>⚠️ RISCURI și PROTECȚII:</h3>

<h4>Risc MARE de contestație dacă:</h4>
<ul>
<li>❌ Nu ai fișa postului cu obiective clare</li>
<li>❌ Nu ai făcut evaluări periodice documentate</li>
<li>❌ Nu ai dat PIP (șansă de îmbunătățire)</li>
<li>❌ Concediezi o femeie însărcinată, mamă cu copil <2 ani, persoană în concediu medical</li>
</ul>

<h4>Protecții pentru tine:</h4>
<ul>
<li>✅ <strong>Dosarul complet:</strong> fișa post, evaluări, PIP, PV discuții, email-uri feedback</li>
<li>✅ <strong>Obiectivitate:</strong> score-uri numerice (nu subiective: "e leneș")</li>
<li>✅ <strong>Procedură corectă:</strong> preaviz, comunicare scrisă, documentație</li>
</ul>

<h3>💡 ALTERNATIVĂ: Comun Acord</h3>
<p>Dacă vrei să eviți contestația și ai buget, negociază <strong>concediere pe comun acord</strong>:</p>
<ul>
<li>Propui: "Oferim 2 salarii compensație + preaviz plătit (fără lucru) dacă semnezi comun acord"</li>
<li>Avantaj angajat: bani + șomaj tehnic imediat</li>
<li>Avantaj angajator: ZERO risc contestație, plecare imediată</li>
<li>Cost: 2-3 salarii (vs risc proces 6-12 luni + costuri avocat)</li>
</ul>

<h3>📊 Cost Estimat Concediere Performanță:</h3>
<pre>
Salariu angajat: 5.000 RON/lună
────────────────────────────────────────
Preaviz (20 zile): ~3.300 RON
Concediu neefectuat (estimat 10 zile): ~1.650 RON
Indemnizație: 0 RON (vina angajat)
────────────────────────────────────────
TOTAL MINIM: ~5.000 RON

Dacă contestă și pierzi la ITM/Judecătorie:
+ Reintegrare forțată (rămâne angajat)
+ SAU Despăgubiri 6-12 salarii: 30.000-60.000 RON
+ Costuri avocat: 3.000-10.000 RON
────────────────────────────────────────
RISC MAXIM: 40.000-70.000 RON + angajat reintegrat
</pre>',
'["Verifică: ai fișă post cu obiective măsurabile?","Dacă nu: creează acum + adaugă la contract (act adițional)","Organizează evaluare performance (scor numeric)","PIP obligatoriu: 30-60 zile șansă îmbunătățire","Documentează TOTUL (email-uri, PV, evaluări)","Dacă PIP eșuat: decizie scrisă concediere","Preaviz 20 zile lucrătoare (obligatoriu)","Alternativă: oferă comun acord (evită risc contestație)"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'who_initiates' AND dp.path_key = 'employee_resigns'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>📝 DEMISIE - Angajatul Pleacă</h2>

<div class="alert alert-success">
<strong>Procedură simplă:</strong> Angajatul decide, tu doar accepți și finalizezi.
</div>

<h3>Procedură Legală Demisie:</h3>

<h4>1. Angajatul Depune Demisia (Scris!)</h4>
<ul>
<li><strong>Formă:</strong> Scrisoare de demisie scrisă, datată, semnată</li>
<li><strong>Conținut minim:</strong>
  <pre>"Subsemnatul [Nume], angajat în funcția [Funcție], demisionez din proprie inițiativă începând cu data de [Data].
  Semnătură: ___________
  Data: ___________"</pre>
</li>
<li><strong>Preaviz:</strong> 20 zile lucrătoare (obligatoriu din lege, chiar dacă nu scrie în contract!)</li>
</ul>

<h4>2. Tu (Angajator) Primești Demisia</h4>
<ul>
<li>Înregistrezi demisia (număr intern, dată primire)</li>
<li>NU trebuie să "aprobi" demisia (e dreptul angajatului, nu negociezi!)</li>
<li>Calculezi data încetării: data demisiei + 20 zile lucrătoare</li>
</ul>

<h4>3. Perioada de Preaviz (20 zile lucrătoare)</h4>
<ul>
<li>Angajatul lucrează normal</li>
<li>NU poate renunța la preaviz unilateral (doar prin acord mutual)</li>
<li>Dacă pleacă înainte de expirarea preavizului fără acordul tău → îi reții din salariu echivalentul zilelor nerespectate</li>
</ul>

<h3>📋 Exemplu Calcul Preaviz:</h3>
<pre>
Data demisie: 1 noiembrie (luni)
20 zile lucrătoare (exclude weekend + sărbători):
Nov: 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26
────────────────────────────────────────────────────────
Data încetare contract: 26 noiembrie
Ultimă zi de lucru: 26 noiembrie
</pre>

<h4>4. Predare-Primire Atribuții</h4>
<ul>
<li>Organizează predare-primire cu înlocuitor (dacă există)</li>
<li>Procesul-verbal predare: documente, echipamente, acces-uri IT</li>
<li>Angajatul returnează: laptop, telefon, badge, cheie birou</li>
</ul>

<h4>5. Plăți Finale (În ultima zi)</h4>
<ul>
<li>Salariu pentru zilele lucrate (inclusiv preaviz)</li>
<li>Concediu neefectuat:
  <ul>
  <li>Dacă are zile rămase → se plătesc</li>
  <li>Dacă a luat mai mult decât i se cuvenea → se rețin din salariu (cu acordul scris!)</li>
  </ul>
</li>
<li><strong>NU datorezi indemnizație</strong> (demisia e inițiativa angajatului)</li>
</ul>

<h4>6. Documente Finale</h4>
<ul>
<li>Adeverință vechime în muncă</li>
<li>Copie carnet de muncă (dacă există)</li>
<li>Fișă fiscală 205 (pentru noul angajator)</li>
</ul>

<h4>7. REVISAL (IMPORTANT!)</h4>
<ul>
<li><strong>Termen:</strong> Înainte sau în ziua încetării contractului</li>
<li><strong>Motiv:</strong> "Demisie - Art. 81 Codul Muncii"</li>
<li><strong>Observații:</strong> "Demisie cu respectarea termenului de preaviz"</li>
</ul>

<h3>⚠️ Situații Speciale:</h3>

<h4>Angajatul Vrea să Plece Mai Devreme (fără preaviz)</h4>
<p><strong>Soluție:</strong> Comun acord</p>
<ul>
<li>Negociezi: "Poți pleca pe [data X], dar renunți la plata preavizului"</li>
<li>SAU: "Plătesc preavizul complet, dar nu mai lucrezi (gardening leave)"</li>
<li>Act adițional de renunțare la preaviz (semnat de ambii)</li>
</ul>

<h4>Angajatul E în Concediu Medical și Demisionează</h4>
<ul>
<li>✅ Poate demisiona chiar dacă e în concediu medical</li>
<li>Preavizul curge (inclusiv zilele de medical)</li>
<li>Plătește indemnizația de medical casa de sănătate (nu tu!)</li>
</ul>

<h4>Angajatul Vrea să Retracteze Demisia</h4>
<ul>
<li>Poate retracta doar în primele 3 zile de la depunere</li>
<li>După 3 zile: TU decizi dacă accepți retractarea (nu e obligatoriu!)</li>
<li>Dacă refuzi retractarea → demisia rămâne valabilă</li>
</ul>

<h3>💰 Cost Estimat Demisie:</h3>
<pre>
Salariu angajat: 5.000 RON/lună
────────────────────────────────────────
Salariu preaviz (20 zile): ~3.300 RON
Concediu neefectuat (10 zile): ~1.650 RON
Indemnizație: 0 RON
────────────────────────────────────────
TOTAL: ~5.000 RON

Dacă renunți la preaviz (pleacă imediat):
- Economisești ~3.300 RON (salariu preaviz)
- Risc: pierdere know-how, predare incompletă
</pre>

<h3>✅ CHECKLIST Demisie:</h3>
<ol>
<li>☐ Primește demisia scrisă, datată, semnată</li>
<li>☐ Înregistrează intern (nr, dată primire)</li>
<li>☐ Calculează data încetării (+ 20 zile lucrătoare)</li>
<li>☐ Informează echipa (planifică înlocuire)</li>
<li>☐ Organizează predare-primire atribuții</li>
<li>☐ Recuperează echipamente (laptop, telefon, badge)</li>
<li>☐ Calculează plăți finale (salariu + concediu)</li>
<li>☐ Plătește în ultima zi</li>
<li>☐ Emite documente finale (adeverință, fișă fiscală)</li>
<li>☐ Înregistrează în REVISAL (înainte de data încetării!)</li>
</ol>',
'["Primește demisia (verifică: scrisă, datată, semnată)","Calculează data încetării (+20 zile lucr.)","Planifică înlocuire/redistribuire atribuții","Organizează predare-primire (PV)","Recuperează echipamente firmă","Calculează concediu neefectuat","Plătește tot în ultima zi","Emite adeverință + fișă fiscală","REVISAL: înregistrează încetare înainte de data finală"]'
FROM p;

-- Update Points
INSERT INTO decision_tree_update_points (
  tree_id, update_category, data_point_name, current_value, value_source,
  linked_variable_key, update_frequency, next_verification_due, criticality, auto_updateable
)
SELECT t.id, 'cost_estimate', 'Indemnizație concediere/an vechime', '1 salariu/an', 'Codul Muncii Art. 62',
  'severance_per_year', 'annual', CURRENT_DATE + 365, 'high', true
FROM decision_trees t WHERE t.tree_key = 'employment_termination'
UNION ALL
SELECT t.id, 'processing_time', 'Preaviz concediere angajator', '20 zile lucrătoare', 'Codul Muncii Art. 75',
  'notice_period_employer', 'annual', CURRENT_DATE + 365, 'critical', true
FROM decision_trees t WHERE t.tree_key = 'employment_termination'
UNION ALL
SELECT t.id, 'processing_time', 'Preaviz demisie angajat', '20 zile lucrătoare', 'Codul Muncii Art. 81',
  'notice_period_employee', 'annual', CURRENT_DATE + 365, 'critical', true
FROM decision_trees t WHERE t.tree_key = 'employment_termination';

COMMIT;

-- Verification
SELECT '════════════════════════════════════════════════════' as separator;
SELECT 'BATCH 2 MIGRATION COMPLETE - 2 MORE TREES' as status;
SELECT '════════════════════════════════════════════════════' as separator;

SELECT dt.tree_name,
  COUNT(DISTINCT dn.id) as nodes,
  COUNT(DISTINCT dp.id) as paths,
  COUNT(DISTINCT da.id) as answers
FROM decision_trees dt
LEFT JOIN decision_nodes dn ON dt.id = dn.tree_id
LEFT JOIN decision_paths dp ON dn.id = dp.node_id
LEFT JOIN decision_answers da ON dp.id = da.path_id
WHERE dt.tree_key IN ('tax_calendar', 'employment_termination')
GROUP BY dt.tree_name
ORDER BY dt.tree_name;
