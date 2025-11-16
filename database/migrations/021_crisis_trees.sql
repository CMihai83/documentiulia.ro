-- MIGRATION 021: Crisis Management Trees
-- 4 trees: Insolvency, Restructuring, Selling Business, Closing Company
-- Created: 2025-11-16

BEGIN;

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES
('insolvency', 'Insolvență - Când și Cum', 'Procedura de insolvență: criterii, procedură, consecințe', 'crisis', true, 27),
('restructuring', 'Restructurare Business', 'Cum să salvezi business-ul în dificultate: reduceri costuri, renegocieri', 'crisis', true, 28),
('selling_business', 'Vânzare Business - Exit Strategy', 'Cum să vinzi business-ul: valuation, buyer finding, due diligence', 'crisis', true, 29),
('closing_company', 'Închidere SRL - Radiere Corectă', 'Procedura de radiere voluntară SRL: pași, costuri, termene', 'crisis', true, 30);

-- Insolvency tree
WITH t1 AS (SELECT id FROM decision_trees WHERE tree_key = 'insolvency')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t1.id, 'insolvency_stage', 'În ce situație ești?', 'Stadiul dificultății determină opțiunile', false FROM t1;

WITH n1 AS (SELECT id FROM decision_nodes WHERE node_key = 'insolvency_stage')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n1), 'preventive', 'Probleme temporare de cash-flow (poți recupera)'),
((SELECT id FROM n1), 'insolvent', 'Datorii >90 zile, imposibil de plătit');

WITH p1 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'insolvency_stage' AND dp.path_key = 'preventive')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p1.id,
'<h2>⚠️ Concordat Preventiv (Ad-hoc Mandate)</h2>
<p><strong>Alternativă la insolvență - "Chapter 11 românesc"</strong></p>
<h3>Când să aplici:</h3>
<ul>
<li>✅ Business viabil dar probleme temporare cash-flow</li>
<li>✅ Datorii <6 luni întârziere</li>
<li>✅ Creditori dispuși să negocieze</li>
<li>✅ Plan realist de restructurare</li>
</ul>
<h3>Procedură:</h3>
<ol>
<li><strong>Depui cerere la Tribunal:</strong> Prin avocat specializat insolvență</li>
<li><strong>Numire practician reorganizare:</strong> Tribunal desemnează specialist</li>
<li><strong>Moratoriu plăți:</strong> Max 4 luni (protect ie de creditori)</li>
<li><strong>Negociere plan:</strong> Reșalonări, reduceri parțiale datorii</li>
<li><strong>Votare creditori:</strong> Plan aprobat dacă >50% creditori (valoare) sunt de acord</li>
<li><strong>Omologare tribunal:</strong> Plan devine obligatoriu pentru toți creditorii</li>
</ol>
<h3>Costuri:</h3>
<ul>
<li>Avocat: 5.000-15.000 EUR</li>
<li>Practician reorganizare: 3.000-10.000 EUR</li>
<li>Taxe tribunal: 1.000-3.000 EUR</li>
<li><strong>Total: 10.000-30.000 EUR</strong></li>
</ul>
<h3>Avantaje vs Insolvență Clasică:</h3>
<ul>
<li>✅ Managementul rămâne (nu e practician judiciar)</li>
<li>✅ Business continuă normal</li>
<li>✅ Imagine mai bună (nu apare "insolvență" public)</li>
<li>✅ Procedură mai rapidă (6-12 luni vs 2-5 ani)</li>
</ul>
<h3>Rate Succes:</h3>
<ul>
<li>📊 60-70% concordate preventive se finalizează cu succes</li>
<li>📊 Business supraviețuiește în 80%+ cazuri</li>
</ul>',
'["Consultă avocat insolvență URGENT","Evaluează dacă business e viabil (nu doar amâni inevitabilul)","Pregătește plan restructurare realist","Discută informal cu creditori majori","Depune cerere concordat preventiv","Moratoriu 4 luni pentru negociere"]'
FROM p1;

WITH p1b AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'insolvency_stage' AND dp.path_key = 'insolvent')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p1b.id,
'<h2>🚨 Insolvență Clasică</h2>
<p><strong>Când nu mai poți plăti datoriile și nu vezi soluție</strong></p>
<h3>Criterii Legale Insolvență:</h3>
<ul>
<li>Datorii certe, lichide, exigibile >90 zile</li>
<li>SAU Datorii >activul patrimonial (bilanț negativ)</li>
<li>SAU Încetare plăți (nu mai poți onora obligații curente)</li>
</ul>
<h3>Procedură:</h3>
<ol>
<li><strong>Depunere cerere:</strong> De către debitor (voluntară) sau creditor (forțată)</li>
<li><strong>Deschidere procedură:</strong> Tribunal desemnează practician în insolvență</li>
<li><strong>Observare (3-6 luni):</strong> Evaluare situație, plan reorganizare sau lichidare</li>
<li><strong>Reorganizare SAU Lichidare</strong></li>
</ol>
<h4>Reorganizare Judiciară (dacă business e viabil):</h4>
<ul>
<li>📋 Plan reorganizare (2-5 ani plată datorii)</li>
<li>📋 Business continuă cu practician în control</li>
<li>📋 Moratoriu datorii pe perioada planului</li>
<li>📋 Succes rate: ~30% (majoritatea eșuează și merg în lichidare)</li>
</ul>
<h4>Lichidare (dacă business nu e viabil):</h4>
<ul>
<li>📋 Vânzare active</li>
<li>📋 Plată creditori (ordine prioritate: salarii → stat → bănci → furnizori)</li>
<li>📋 Radiere SRL</li>
<li>📋 Durată: 2-5 ani</li>
</ul>
<h3>Consecințe Pentru Administratori:</h3>
<ul>
<li>⚠️ <strong>Răspundere personală:</strong> Dacă se dovedește gestiune frauduloasă</li>
<li>⚠️ <strong>Interdicție adm inistrare:</strong> 3-5 ani dacă tribunal decide</li>
<li>⚠️ <strong>Datorii fiscale:</strong> Administratorii pot fi ținuți răspunzători solidar pentru datorii ANAF</li>
</ul>
<h3>Costuri Procedură:</h3>
<ul>
<li>Avocat: 5.000-20.000 EUR</li>
<li>Practician insolvență: % din active (3-15%)</li>
<li>Taxe tribunal: 2.000-5.000 EUR</li>
</ul>',
'["Consultă avocat insolvență IMEDIAT","Adună documentație completă (bilanțuri, lista creditori, active)","Evaluează: reorganizare sau lichidare?","Protejează active personale (separare patrimoniu)","Depune cerere dacă datorii >90 zile (evită răspundere personală)","Cooperează cu practicianul desemnat"]'
FROM p1b;

-- Restructuring tree
WITH t2 AS (SELECT id FROM decision_trees WHERE tree_key = 'restructuring')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t2.id, 'restructuring_area', 'Unde sunt problemele majore?', 'Focus pe root cause', false FROM t2;

WITH n2 AS (SELECT id FROM decision_nodes WHERE node_key = 'restructuring_area')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n2), 'costs', 'Costuri prea mari (profit margin negativ)'),
((SELECT id FROM n2), 'revenue', 'Revenue scade (pierdere clienți)');

WITH p2 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'restructuring_area' AND dp.path_key = 'costs')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p2.id,
'<h2>💰 Reducere Costuri - Turnaround</h2>
<h3>Analiză Costuri (Pașii Zero-Based Budgeting):</h3>
<table>
<tr><th>Categorie</th><th>% din total costuri (typical)</th><th>Potențial reducere</th></tr>
<tr><td><strong>Salarii & beneficii</strong></td><td>40-60%</td><td>10-20% (layoffs, reduceri salarii, freeze hiring)</td></tr>
<tr><td><strong>Chirie/Spațiu</strong></td><td>10-20%</td><td>20-40% (relocare, sublet, renegociere)</td></tr>
<tr><td><strong>Marketing</strong></td><td>5-15%</td><td>30-50% (tăieri agenții, focus ROI pozitiv)</td></tr>
<tr><td><strong>Software/Tools</strong></td><td>3-8%</td><td>20-30% (cancel subscriptions neutilizate)</td></tr>
<tr><td><strong>Furnizori/COGS</strong></td><td>30-50%</td><td>10-15% (renegociere, switch furnizori)</td></tr>
</table>
<h3>Pași Reducere Costuri (Priority Order):</h3>
<ol>
<li><strong>Cancel neutilizate (quick wins):</strong>
  <ul>
  <li>Subscriptions software neutilizate (audit toate licențele)</li>
  <li>Memberships, abonamente</li>
  <li>Reducere office perks (snacks, events)</li>
  <li><strong>Impact:</strong> 5-10% reducere costuri, ZERO impact revenue</li>
  </ul>
</li>
<li><strong>Renegociere contracte (2-4 săptămâni):</strong>
  <ul>
  <li>Chirie: Cere reducere 15-30% (argumentează dificultate, altfel pleci)</li>
  <li>Furnizori: Volum discounts, payment terms mai lungi</li>
  <li><strong>Impact:</strong> 10-15% reducere, minimal impact</li>
  </ul>
</li>
<li><strong>Freeze hiring & projects (imediat):</strong>
  <ul>
  <li>Stop toate hire-urile noi</li>
  <li>Cancel proiecte non-core</li>
  <li>Focus DOAR pe revenue-generating activities</li>
  <li><strong>Impact:</strong> Previne hemoragie cash</li>
  </ul>
</li>
<li><strong>Layoffs (ultima opțiune, dar efectivă):</strong>
  <ul>
  <li>Identifica bottom 10-20% performers</li>
  <li>SAU tăieri departamente non-core</li>
  <li>Legal: Preaviz, compensații (cost 1-3 salarii/persoană)</li>
  <li><strong>Impact:</strong> 20-30% reducere costuri, DAR afectează moral</li>
  </ul>
</li>
</ol>
<h3>Exemplu Real - SaaS Company:</h3>
<p><strong>Situație:</strong> Burn rate 50k EUR/lună, runway 6 luni, revenue stagnant 30k EUR/lună</p>
<p><strong>Acțiuni (90 zile):</strong></p>
<ul>
<li>Layoffs 30% team (15→10 people): -12k EUR/lună</li>
<li>Renegociere chirie -30%: -3k EUR/lună</li>
<li>Cancel software unutilizat: -2k EUR/lună</li>
<li>Freeze hiring & marketing: -5k EUR/lună</li>
<li><strong>New burn: 28k EUR/lună (reducere 44%!)</strong></li>
<li><strong>New runway: 12 luni (dublu!)</strong></li>
</ul>',
'["Audit 100% costuri (spreadsheet detaliat)","Quick wins: cancel neutilizate (1 săptămână)","Renegociere chirie + furnizori majori (2-4 săpt)","Freeze hiring imediat","Layoffs dacă necesar (bottom 10-20%)","Target: reduce burn cu 30-50% în 90 zile"]'
FROM p2;

-- Selling Business tree
WITH t3 AS (SELECT id FROM decision_trees WHERE tree_key = 'selling_business')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t3.id, 'business_size_sale', 'Ce mărime are business-ul?', 'Procesul diferă radical per size', false FROM t3;

WITH n3 AS (SELECT id FROM decision_nodes WHERE node_key = 'business_size_sale')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n3), 'small', 'Sub 500k EUR revenue/an'),
((SELECT id FROM n3), 'medium', 'Peste 500k EUR revenue/an');

WITH p3 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'business_size_sale' AND dp.path_key = 'small')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p3.id,
'<h2>💼 Vânzare Business Mic (<500k EUR revenue)</h2>
<h3>Valuation Metode:</h3>
<ul>
<li><strong>Profit multiple:</strong> 2-4x EBITDA (profit înainte taxe, dobânzi, amortizare)</li>
<li><strong>Revenue multiple:</strong> 0,5-1,5x revenue anual (pentru business-uri profitabile)</li>
<li><strong>Asset-based:</strong> Valoare active - datorii (dacă profit scăzut)</li>
</ul>
<h3>Exemplu Valuation:</h3>
<p>Cafenea: Revenue 200k EUR, EBITDA 50k EUR, active 80k EUR</p>
<ul>
<li>EBITDA multiple: 50k × 3 = 150k EUR</li>
<li>Revenue multiple: 200k × 0,75 = 150k EUR</li>
<li>Assets: 80k EUR</li>
<li><strong>Asking price: 130-170k EUR (negociabil)</strong></li>
</ul>
<h3>Unde găsești buyers:</h3>
<ul>
<li>🌐 <strong>Platforme online:</strong> BizBuySell.com, BusinessForSale.ro</li>
<li>🌐 <strong>Brokeri business:</strong> Comision 8-12% din preț vânzare</li>
<li>🌐 <strong>Competitori:</strong> Outreach direct (confidențial!)</li>
<li>🌐 <strong>Angajați:</strong> Management buyout (MBO)</li>
</ul>
<h3>Proces Vânzare:</h3>
<ol>
<li><strong>Pregătire (2-3 luni):</strong>
  <ul>
  <li>Clean financials (bilanțuri verificate 3 ani)</li>
  <li>Documentare procese</li>
  <li>Rezolvare probleme legale (datorii, litigii)</li>
  </ul>
</li>
<li><strong>Marketing (1-3 luni):</strong>
  <ul>
  <li>Listing pe platforme</li>
  <li>NDA pentru interested buyers</li>
  <li>Pitch deck (10 slides)</li>
  </ul>
</li>
<li><strong>Negociere (1-2 luni):</strong>
  <ul>
  <li>Letter of Intent (LOI)</li>
  <li>Due diligence (buyer verifică tot)</li>
  <li>Price final negotiation</li>
  </ul>
</li>
<li><strong>Closing (1 lună):</strong>
  <ul>
  <li>SPA (Share Purchase Agreement) cu avocat</li>
  <li>Transfer ownership</li>
  <li>Plată (50% upfront, 50% în 6-12 luni de obicei)</li>
  </ul>
</li>
</ol>
<h3>Costuri:</h3>
<ul>
<li>Broker: 8-12% din preț (sau flat fee 5k-15k EUR)</li>
<li>Avocat: 3.000-10.000 EUR</li>
<li>Accountant (clean financials): 2.000-5.000 EUR</li>
</ul>',
'["Pregătește financials clean (3 ani bilanțuri)","Valuation realistă (2-4x EBITDA)","NDA pentru orice discuție cu buyers","Broker sau DIY (broker crește șanse dar costă 10%)","Due diligence ready (documente organizate)","Avocat pentru SPA","Expect 6-12 luni proces total"]'
FROM p3;

-- Closing Company tree
WITH t4 AS (SELECT id FROM decision_trees WHERE tree_key = 'closing_company')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t4.id, 'closure_type', 'De ce închizi compania?', 'Procedura diferă dacă ai datorii', false FROM t4;

WITH n4 AS (SELECT id FROM decision_nodes WHERE node_key = 'closure_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n4), 'voluntary_clean', 'Voluntar, fără datorii'),
((SELECT id FROM n4), 'with_debts', 'Am datorii neplătite');

WITH p4 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'closure_type' AND dp.path_key = 'voluntary_clean')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p4.id,
'<h2>✅ Radiere Voluntară SRL (Fără Datorii)</h2>
<h3>Condiții:</h3>
<ul>
<li>✅ ZERO datorii (ANAF, CAS, CASS, furnizori, bănci)</li>
<li>✅ Certificate fiscale la zi</li>
<li>✅ Lichidare completă active (vânzare sau distribuție către asociați)</li>
<li>✅ Decizie AGA (Adunare Generală Asociați) pentru dizolvare</li>
</ul>
<h3>Procedură (6-12 luni):</h3>
<ol>
<li><strong>AGA Dizolvare:</strong>
  <ul>
  <li>Hotărâre dizolvare companie</li>
  <li>Numire lichidator (poate fi administratorul)</li>
  <li>Notariat AGA: 200-500 RON</li>
  </ul>
</li>
<li><strong>Publicitate dizolvare (Monitorul Oficial):</strong>
  <ul>
  <li>Anunț în MO: 300-600 RON</li>
  <li>Termen 60 zile pentru creditori să reclame datorii</li>
  </ul>
</li>
<li><strong>Lichidare activelor:</strong>
  <ul>
  <li>Vânzare echipamente, stocuri</li>
  <li>Colectare creanțe</li>
  <li>Închidere conturi bancare</li>
  </ul>
</li>
<li><strong>Raport final lichidare:</strong>
  <ul>
  <li>Bilanț final (profit/pierdere lichidare)</li>
  <li>Distribuție active către asociați (dacă rămân bani)</li>
  <li>AGA aprobare bilanț lichidare</li>
  </ul>
</li>
<li><strong>Certificate fiscale finale:</strong>
  <ul>
  <li>ANAF, primărie, CAS, CASS</li>
  <li>Toate trebuie "FĂRĂ DATORII"</li>
  </ul>
</li>
<li><strong>Depunere dosare ONRC:</strong>
  <ul>
  <li>Cerere radiere</li>
  <li>Certificate fiscale</li>
  <li>Bilanț lichidare</li>
  <li>Hotărâre AGA</li>
  <li>Taxă ONRC: 200-400 RON</li>
  </ul>
</li>
<li><strong>Radiere finală:</strong>
  <ul>
  <li>ONRC radiază compania</li>
  <li>Publicare Monitorul Oficial</li>
  <li><strong>SRL încetează să existe!</strong></li>
  </ul>
</li>
</ol>
<h3>Costuri Totale:</h3>
<ul>
<li>Notar: 200-500 RON</li>
<li>Monitor Oficial: 300-600 RON</li>
<li>Contabil (bilanțuri lichidare): 1.000-3.000 RON</li>
<li>ONRC taxe: 200-400 RON</li>
<li><strong>TOTAL: 2.000-5.000 RON</strong></li>
</ul>
<h3>Timp:</h3>
<ul>
<li>Minim 60 zile (termen creditori)</li>
<li>Realistic: 6-12 luni (obținere certificate, lichidare active)</li>
</ul>
<h3>Alternativă RAPIDĂ (dacă ai grab ă):</h3>
<p><strong>Vânzare SRL cu 1 EUR:</strong></p>
<ul>
<li>Găsești buyer care preia SRL-ul (cu tot cu obligații)</li>
<li>Transfer ownership prin ONRC</li>
<li>Timp: 1-2 săptămâni</li>
<li>Cost: ~500 RON</li>
<li>⚠️ RISC: Rămâi responsabil solidar pentru datorii anterioare transferului!</li>
</ul>',
'["Verifică ZERO datorii (toate certificatele)","AGA dizolvare + numire lichidator","Publicare MO (60 zile waiting period)","Lichidare active (vânzare echipamente)","Bilanț final lichidare","Certificate fiscale finale toate (ANAF, CAS, CASS, primărie)","Depunere dosare ONRC radiere","Buget 2.000-5.000 RON, timp 6-12 luni"]'
FROM p4;

COMMIT;
