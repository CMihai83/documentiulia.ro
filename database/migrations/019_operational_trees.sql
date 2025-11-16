-- MIGRATION 019: Operational Trees
-- 4 trees: Licenses/Permits, Contracts, Insurance, IP
-- Created: 2025-11-16

BEGIN;

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES 
('licenses_permits', 'Autorizații & Licențe Business', 'Ghid autorizații necesare pentru diferite tipuri de business', 'operations', true, 19),
('contract_types', 'Tipuri de Contracte Business', 'B2B, B2C, B2G - diferențe și recomandări', 'operations', true, 20),
('business_insurance', 'Asigurări Business Necesare', 'Ce asigurări sunt obligatorii și recomandate', 'operations', true, 21),
('intellectual_property', 'Proprietate Intelectuală', 'Trademark, Patent, Copyright - când și cum să protejezi IP', 'operations', true, 22);

-- Simplified tree structures with key answers
WITH t1 AS (SELECT id FROM decision_trees WHERE tree_key = 'licenses_permits')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t1.id, 'activity_type', 'Ce tip de activitate desfășori?', 'Tipul activității determină autorizațiile necesare', false FROM t1;

WITH n1 AS (SELECT id FROM decision_nodes WHERE node_key = 'activity_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES 
((SELECT id FROM n1), 'food', 'Alimentație publică (restaurant, cafenea)'),
((SELECT id FROM n1), 'retail', 'Comerț (magazin, online shop)');

WITH p1 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'activity_type' AND dp.path_key = 'food')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p1.id,
'<h2>🍽️ Autorizații HoReCa (Restaurant/Cafenea)</h2>
<h3>Autorizații Obligatorii:</h3>
<ul>
<li><strong>Autorizație sanitară DSP:</strong> 500-2.000 RON, valabilă 3 ani</li>
<li><strong>Autorizație pompieri ISU:</strong> 300-1.500 RON</li>
<li><strong>Aviz sanitar-veterinar ANSVSA:</strong> Pentru bucătărie</li>
<li><strong>HACCP (food safety):</strong> Proceduri obligatorii</li>
</ul>
<h3>Procedură:</h3>
<ol>
<li>Amenajare conform norme (DSP, ISU)</li>
<li>Documentație tehnică (planuri, memorii)</li>
<li>Depunere dosare DSP + ISU</li>
<li>Inspecții pe teren</li>
<li>Obținere autorizații (2-6 luni)</li>
</ol>
<p><strong>Cost total:</strong> 2.000-5.000 RON + eventuale lucrări conformare</p>',
'["Angajează consultant autorizații (recomand)","Asigură conformitate DSP/ISU înainte de amenajări","Training HACCP pentru personal","Pregătește dosare complete","Buget 3-6 luni pentru proces"]'
FROM p1;

-- Contract types tree
WITH t2 AS (SELECT id FROM decision_trees WHERE tree_key = 'contract_types')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t2.id, 'customer_type', 'Cu cine contractezi?', 'Tipul clientului determină structura contractului', false FROM t2;

WITH n2 AS (SELECT id FROM decision_nodes WHERE node_key = 'customer_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n2), 'b2b', 'B2B - Alte companii'),
((SELECT id FROM n2), 'b2c', 'B2C - Consumatori finali');

WITH p2 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'customer_type' AND dp.path_key = 'b2b')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p2.id,
'<h2>📝 Contracte B2B</h2>
<h3>Elemente Esențiale:</h3>
<ul>
<li><strong>Părți contractante:</strong> CUI, reprezentant legal</li>
<li><strong>Obiect:</strong> Servicii/produse exact definite</li>
<li><strong>Preț & modalitate plată:</strong> NET30, NET60, avans</li>
<li><strong>Termen execuție/livrare</strong></li>
<li><strong>Garanții:</strong> De bună execuție, penalități</li>
<li><strong>Reziliere:</strong> Condiții și preaviz</li>
<li><strong>Forță majoră & litigii</strong></li>
</ul>
<h3>Clauze Importante:</h3>
<ul>
<li>⚖️ <strong>Late payment:</strong> Dobândă penalizatoare 0,5-1%/zi</li>
<li>⚖️ <strong>IP ownership:</strong> Cine deține rezultatele?</li>
<li>⚖️ <strong>Confidențialitate (NDA):</strong> Protecție informații</li>
<li>⚖️ <strong>Non-compete:</strong> Durata rezonabilă (1-2 ani)</li>
</ul>
<p><strong>Recomandare:</strong> Template de avocat (1.000-3.000 RON investiție inițială), apoi refolosești</p>',
'["Angajează avocat pentru template contract","Include termeni plată clari (NET30/60)","Clauze IP ownership explicit","NDA pentru proiecte sensibile","Review contract cu avocat înainte de semnare contracte >10k EUR"]'
FROM p2;

-- Insurance tree
WITH t3 AS (SELECT id FROM decision_trees WHERE tree_key = 'business_insurance')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t3.id, 'business_nature', 'Ce tip de business ai?', 'Riscurile variază per industrie', false FROM t3;

WITH n3 AS (SELECT id FROM decision_nodes WHERE node_key = 'business_nature')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n3), 'office', 'Office/servicii (risc scăzut)'),
((SELECT id FROM n3), 'production', 'Producție/HoReCa (risc mediu-ridicat)');

WITH p3 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'business_nature' AND dp.path_key = 'office')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p3.id,
'<h2>🛡️ Asigurări Business - Office/Servicii</h2>
<h3>Asigurări Obligatorii:</h3>
<ul>
<li><strong>RCA clădire:</strong> Dacă deții proprietate (300-1.000 RON/an)</li>
<li><strong>Asigurare angajați (work accidents):</strong> Prin CAS</li>
</ul>
<h3>Asigurări Recomandate:</h3>
<table>
<tr><th>Tip</th><th>Acoperire</th><th>Cost/an</th></tr>
<tr><td><strong>Property insurance</strong></td><td>Echipamente, mobilier</td><td>0,1-0,3% din valoare</td></tr>
<tr><td><strong>Professional liability</strong></td><td>Erori profesionale, malpractice</td><td>500-2.000 EUR</td></tr>
<tr><td><strong>Cyber insurance</strong></td><td>Data breaches, ransomware</td><td>1.000-5.000 EUR</td></tr>
<tr><td><strong>Business interruption</strong></td><td>Pierderi dacă business se oprește</td><td>1-2% din revenue</td></tr>
</table>
<h3>Exemplu Package SRL IT (20 angajați):</h3>
<ul>
<li>Property: 50k EUR echipamente → 150 EUR/an</li>
<li>Professional liability: 1M EUR coverage → 1.500 EUR/an</li>
<li>Cyber: 500k EUR coverage → 2.000 EUR/an</li>
<li><strong>Total: ~3.700 EUR/an</strong></li>
</ul>',
'["Property insurance pentru echipamente >10k EUR","Professional liability OBLIGATORIU pentru consultanță/servicii","Cyber insurance dacă gestionezi date clienți","Compare 3 asigurători înainte de decizie"]'
FROM p3;

-- IP tree
WITH t4 AS (SELECT id FROM decision_trees WHERE tree_key = 'intellectual_property')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t4.id, 'ip_type', 'Ce vrei să protejezi?', 'Fiecare tip de IP are procedură diferită', false FROM t4;

WITH n4 AS (SELECT id FROM decision_nodes WHERE node_key = 'ip_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n4), 'trademark', 'Brand/Logo (Trademark)'),
((SELECT id FROM n4), 'patent', 'Invenție tehnică (Patent)');

WITH p4 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'ip_type' AND dp.path_key = 'trademark')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p4.id,
'<h2>™️ Trademark (Marcă Înregistrată)</h2>
<h3>De ce să înregistrezi marca:</h3>
<ul>
<li>✅ Protecție legală 10 ani (reînnoibil)</li>
<li>✅ Exclude competiția din numele/logo-ul tău</li>
<li>✅ Poți licenția marca (revenue stream)</li>
<li>✅ Crește valoarea company (asset intangibil)</li>
</ul>
<h3>Procedură OSIM:</h3>
<ol>
<li><strong>Search similar marks:</strong> Verifică dacă marca e disponibilă (gratuit pe osim.ro)</li>
<li><strong>Aplică online:</strong> portal.osim.ro</li>
<li><strong>Documente:</strong> Logo, descriere, clase activitate (Nice Classification)</li>
<li><strong>Taxă:</strong> 400 RON (1 clasă) + 150 RON/clasă suplimentară</li>
<li><strong>Examinare OSIM:</strong> 6-12 luni</li>
<li><strong>Publicare & opoziții:</strong> 3 luni window pentru contestații</li>
<li><strong>Înregistrare finală:</strong> Certificat de marcă</li>
</ol>
<h3>Costuri:</h3>
<ul>
<li>DIY: 400-700 RON (doar taxe OSIM)</li>
<li>Cu avocat IP: 2.000-5.000 RON (recomandat pentru business serios)</li>
</ul>
<h3>Clase Nice (Exemple):</h3>
<ul>
<li>Clasă 9: Software, apps</li>
<li>Clasă 25: Îmbrăcăminte</li>
<li>Clasă 35: Servicii comerciale, publicitate</li>
<li>Clasă 41: Educație, training</li>
<li>Clasă 42: Servicii IT, development</li>
<li>Clasă 43: Restaurante, cafenele</li>
</ul>
<p><strong>Recomandare:</strong> Înregistrează ÎNAINTE de launch public (cineva poate să-ți fure marca!)</p>',
'["Search disponibilitate marcă pe osim.ro","Identifică clasele Nice relevante (minim 2-3)","Aplică online sau prin avocat IP","Buget 400-5.000 RON","Timeline 8-14 luni pentru înregistrare completă","Consider trademark UE (EUIPO) dacă vizezi export"]'
FROM p4;

COMMIT;
