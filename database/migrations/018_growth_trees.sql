-- MIGRATION 018: Growth & Scaling Trees
-- 4 trees: Export, Franchising, Scaling Team, Multi-location
-- Created: 2025-11-16

BEGIN;

-- ==========================================================================
-- TREE 1: Export - First Steps
-- ==========================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'export_first_steps',
  'Export - Primii Pași Internaționalizare',
  'Ghid pentru primul export: țări target, logistică, documentație vamală',
  'growth',
  true,
  15
);

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'export_first_steps')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'target_market',
  'În ce regiune vrei să exporți prima dată?',
  'Piața inițială de export determină complexitatea procedurii',
  false
FROM t;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'target_market')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'eu', 'Uniunea Europeană (fără bariere vamale)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'target_market')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'non_eu', 'Extra-UE (SUA, UK, Asia)'
FROM n;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'target_market' AND dp.path_key = 'eu'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🇪🇺 Export în UE - Piață Unică</h2>
<p><strong>Avantaj major: FĂRĂ taxe vamale, proceduri simple!</strong></p>

<h3>De ce să începi cu UE:</h3>
<ul>
<li>✅ Fără taxe vamale (piață unică)</li>
<li>✅ Fără documente vamal complex</li>
<li>✅ Livrare rapidă (1-3 zile în majoritatea țărilor)</li>
<li>✅ Plăți în EUR (fără risc valutar)</li>
<li>✅ Legislație armonizată (CE, RoHS, GDPR)</li>
</ul>

<h3>Țări Recomandate pentru Start:</h3>
<table>
<tr><th>Țară</th><th>Avantaje</th><th>Dificultate</th></tr>
<tr><td><strong>Germania</strong></td><td>Piață mare, putere cumpărare, respect calitate</td><td>Medie (limba)</td></tr>
<tr><td><strong>Italia</strong></td><td>Apropiere culturală, limba asemănătoare</td><td>Ușoară</td></tr>
<tr><td><strong>Austria</strong></td><td>Puteri cumpărare ridicată, proxim</td><td>Medie</td></tr>
<tr><td><strong>Ungaria</strong></td><td>Foarte aproape, logistică ieftină</td><td>Ușoară</td></tr>
</table>

<h3>Pași Esențiali Export UE:</h3>

<h4>1. Cod EORI (Economic Operator Registration Identification):</h4>
<ul>
<li><strong>Ce e:</strong> Număr unic pentru operatori economici în relații cu vama</li>
<li><strong>Unde:</strong>申請 online pe site ANAF (sec ţiunea vamă)</li>
<li><strong>Cost:</strong> GRATUIT</li>
<li><strong>Timp:</strong> 3-5 zile lucrătoare</li>
<li><strong>Obligatoriu:</strong> DA, pentru orice export (chiar și în UE pentru raportare Intrastat)</li>
</ul>

<h4>2. Înregistrare TVA Intracomunitar:</h4>
<ul>
<li><strong>Când:</strong> Dacă vinzi B2B (business to business)</li>
<li><strong>Procedură:</strong> Cere la ANAF cod RO + Cod fiscal (ex: RO12345678)</li>
<li><strong>Avantaj:</strong> Vinzi fără TVA (reverse charge - clientul plătește TVA în țara lui)</li>
<li><strong>Raportare:</strong> Declarație Intrastat lunară (dacă export >200.000 RON/an)</li>
</ul>

<h4>3. Documentele Necesare:</h4>
<ul>
<li>📄 <strong>Factură comercială:</strong> Cu mențiunea "Livrare intracomunitară - taxare inversă art. 319 Cod Fiscal"</li>
<li>📄 <strong>CMR (transport rutier):</strong> Dovada livrării mărfii (semnată de transportator și client)</li>
<li>📄 <strong>Certificat EUR1 sau EUR-MED:</strong> NU e necesar în UE (dar util pentru extra-UE)</li>
<li>📄 <strong>Packing list:</strong> Detalii colete (greutate, dimensiuni, conținut)</li>
</ul>

<h4>4. Logistică & Transport:</h4>

<h5>Opțiuni Transport:</h5>
<table>
<tr><th>Metodă</th><th>Cost</th><th>Timp</th><th>Când să folosești</th></tr>
<tr><td>Curier (DHL, UPS, DPD)</td><td>€€€</td><td>1-2 zile</td><td>Colete mici (<30kg), urgente</td></tr>
<tr><td>Transport rutier (camion)</td><td>€</td><td>2-5 zile</td><td>Palete, comenzi mari (>500kg)</td></tr>
<tr><td>Cargo aerian</td><td>€€€€</td><td>1 zi</td><td>Doar urgențe extreme</td></tr>
</table>

<p><strong>Recomandare:</strong> Pentru început, folosește curieri (DHL, UPS) pentru comenzi test, apoi treci pe transport rutier când crești volumul.</p>

<h5>Costuri Orientative Transport:</h5>
<ul>
<li>📦 Colet 10kg București → München (DHL): 80-120 EUR</li>
<li>🚛 Palet 500kg București → Milano (transport rutier): 200-350 EUR</li>
<li>🚛 Camion complet 20 tone București → Paris: 1.500-2.500 EUR</li>
</ul>

<h4>5. Aspecte Fiscale:</h4>

<h5>TVA pentru Export UE (Livrări Intracomunitare):</h5>
<ul>
<li><strong>B2B (ai CUI client UE validat în VIES):</strong> Facturezi FĂRĂ TVA, treci cod TVA client în factură</li>
<li><strong>B2C (clienți finali):</strong>
  <ul>
  <li>Sub 10.000 EUR/an vânzări B2C în UE: aplici TVA românesc (19%)</li>
  <li>Peste 10.000 EUR/an: trebuie să te înregistrezi OSS (One Stop Shop) și să aplici TVA-ul țării clientului</li>
  </ul>
</li>
</ul>

<h5>Intrastat - Raportare Statistică:</h5>
<p>Obligatoriu dacă export >200.000 RON/an în UE:</p>
<ul>
<li>📊 Raport lunar la INS (Institutul Național de Statistică)</li>
<li>📊 Declari: valoare mărfuri, greutate, țară destinație, cod NC (nomenclatură combinată)</li>
<li>📊 Deadline: până la 15 a lunii următoare</li>
<li>📊 Penalități: 500-10.000 RON pentru nedepunere</li>
</ul>

<h4>6. Găsirea Clienților în UE:</h4>

<h5>Platforme B2B:</h5>
<ul>
<li>🌐 <strong>Alibaba.com Europe:</strong> Marketplace B2B internațional</li>
<li>🌐 <strong>Europages.com:</strong> Director business-uri europene (1M+ companii)</li>
<li>🌐 <strong>Kompass.com:</strong> Bază date companii</li>
<li>🌐 <strong>Amazon Business:</strong> Pentru produse fizice</li>
</ul>

<h5>Târguri Internaționale:</h5>
<ul>
<li>🎪 <strong>IFM (München):</strong> Târg internațional de primăvară</li>
<li>🎪 <strong>Canton Fair (China → exportatori):</strong> Networking cu importatori europeni</li>
<li>🎪 <strong>Ambiente (Frankfurt):</strong> Consumer goods, deco, gifts</li>
</ul>

<h5>Programe Guvernamentale:</h5>
<ul>
<li>💼 <strong>CCIR (Camera de Comerț București):</strong> Misiuni economice, networking</li>
<li>💼 <strong>Programul Competitivitate (fonduri UE):</strong> Finanțare pentru participare la târguri (50-70% grant)</li>
</ul>

<h3>Exemplu Practic - Export Mobilier în Germania:</h3>

<p><strong>Comandă:</strong> 50 scaune, valoare 5.000 EUR</p>

<table>
<tr><th>Pas</th><th>Acțiune</th><th>Cost</th><th>Timp</th></tr>
<tr><td>1</td><td>Obține cod EORI</td><td>0 RON</td><td>3 zile</td></tr>
<tr><td>2</td><td>Verifică cod TVA client în VIES</td><td>0</td><td>1 minut</td></tr>
<tr><td>3</td><td>Emit factură fără TVA (livrare intracom.)</td><td>0</td><td>10 min</td></tr>
<tr><td>4</td><td>Organizează transport (1 palet 300kg)</td><td>300 EUR</td><td>3 zile</td></tr>
<tr><td>5</td><td>Primești CMR semnat (dovada livrării)</td><td>0</td><td>-</td></tr>
<tr><td>6</td><td>Raportare Intrastat (dacă >200k RON/an)</td><td>0</td><td>30 min</td></tr>
</table>

<p><strong>Profit:</strong> 5.000 EUR - 300 EUR transport - costuri producție = profit net!</p>

<h3>Greșeli Frecvente:</h3>
<ul>
<li>❌ <strong>Nu verifici cod TVA client în VIES:</strong> Riști să nu poți justifica scutirea de TVA!</li>
<li>❌ <strong>Factură fără mențiune livrare intracomunitară:</strong> ANAF poate taxa retroactiv cu TVA!</li>
<li>❌ <strong>Nu păstrezi CMR semnat:</strong> Fără dovada livrării, ANAF poate contesta exportul!</li>
<li>❌ <strong>Uiți Intrastat:</strong> Amenzi 500-10.000 RON</li>
<li>❌ <strong>Nu verifici legislație produs (CE, RoHS):</strong> Produsul poate fi oprit în vamă!</li>
</ul>',
'["Obține cod EORI (gratuit, 3 zile, pe site ANAF)","Înregistrează-te pentru TVA intracomunitar la ANAF","Identifică 10-20 potențiali clienți (Europages, Alibaba EU)","Trimite primul sample / comandă test","Verifică MEREU cod TVA client în VIES","Păstrează CMR semnat ca dovadă export","Dacă >200k RON/an: raportare Intrastat lunară"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'target_market' AND dp.path_key = 'non_eu'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🌍 Export Extra-UE (SUA, UK, Asia)</h2>
<p><strong>Mai complex dar piețe URIAȘE!</strong></p>

<h3>Diferențe față de export UE:</h3>
<ul>
<li>⚠️ Taxe vamale (5-25% din valoare)</li>
<li>⚠️ Documente vamale complexe</li>
<li>⚠️ Timp livrare mai lung (5-30 zile)</li>
<li>⚠️ Risc valutar (USD, GBP, CNY)</li>
<li>⚠️ Certificări specifice țării (FDA - SUA, UKCA - UK)</li>
</ul>

<h3>Țări Prioritare & Dificultate:</h3>
<table>
<tr><th>Țară</th><th>Piață</th><th>Taxe Vamale</th><th>Dificultate</th></tr>
<tr><td><strong>UK</strong></td><td>66M, EUR/GBP, apropiat</td><td>0-20%</td><td>Medie (post-Brexit)</td></tr>
<tr><td><strong>SUA</strong></td><td>330M, putere mare cumpărare</td><td>0-25%</td><td>Ridicată</td></tr>
<tr><td><strong>Elveția</strong></td><td>8M, bogată, apropiat</td><td>Acord România-CH (0-5%)</td><td>Medie</td></tr>
<tr><td><strong>Emirate (Dubai)</strong></td><td>Hub regional, 0% taxe multe produse</td><td>0-5%</td><td>Medie</td></tr>
</table>

<h3>Documente Obligatorii Extra-UE:</h3>
<ol>
<li>📄 <strong>Factură comercială (Commercial Invoice):</strong> În limba engleză, cu cod HS</li>
<li>📄 <strong>Packing List:</strong> Detalii colete</li>
<li>📄 <strong>Certificat de Origine EUR1 sau Form A:</strong> Obținut de la CCIR, reduce/elimină taxe vamale</li>
<li>📄 <strong>Bill of Lading (B/L) sau AWB:</strong> Pentru transport maritim/aerian</li>
<li>📄 <strong>Declarație vamală:</strong> De obicei gestionată de broker vamal</li>
<li>📄 <strong>Certificări produse:</strong> CE (Europa), FDA (SUA-alimente/medical), UKCA (UK)</li>
</ol>

<h3>Incoterms - Cine Plătește Ce:</h3>
<table>
<tr><th>Incoterm</th><th>Ce incluzi în preț</th><th>Când să folosești</th></tr>
<tr><td><strong>EXW</strong></td><td>Doar produsul (clientul ridică de la tine)</td><td>Clienți experimentați cu logistică proprie</td></tr>
<tr><td><strong>FCA</strong></td><td>Produsul + încărcare la transport</td><td>Recomandat pentru început</td></tr>
<tr><td><strong>CIF</strong></td><td>Produsul + transport + asigurare până la destinație</td><td>Clienți care vor "all-inclusive"</td></tr>
<tr><td><strong>DDP</strong></td><td>Produsul + tot (transport, vamă, taxe)</td><td>Doar dacă cunoști foarte bine țara destinație</td></tr>
</table>

<p><strong>Recomandare pentru început:</strong> Folosește <strong>FCA</strong> (Free Carrier) - livrezi marfa la transportator, restul e responsabilitatea clientului.</p>

<h3>Certificat Origine EUR1:</h3>
<p><strong>CE E:</strong> Document care dovedește că produsul e fabricat în România/UE</p>
<p><strong>BENEFICII:</strong> Reduce sau elimină taxele vamale în țări cu care UE are acord (UK, Turcia, Elveția, etc.)</p>
<p><strong>UNDE:</strong> Camera de Comerț (CCIR) - online sau la ghișeu</p>
<p><strong>COST:</strong> 50-150 RON</p>
<p><strong>TIMP:</strong> 1-2 zile</p>

<h3>Plăți Internaționale:</h3>
<ul>
<li>💳 <strong>Transfer bancar SWIFT:</strong> Standard, 1-3 zile, comision 15-50 EUR</li>
<li>💳 <strong>Letter of Credit (L/C):</strong> Pentru comenzi mari (>50k EUR), garantează plata, comision 0,5-2%</li>
<li>💳 <strong>PayPal Business:</strong> Rapid, comision 3-4%, bun pentru comenzi mici</li>
<li>💳 <strong>Wise (fostTransferWise):</strong> Comisioane mici (0,5-1%), rapid</li>
</ul>

<p><strong>IMPORTANT:</strong> Pentru comenzi mari (>10k EUR) cu clienți noi, cere <strong>advance payment</strong> (30-50% avans) sau folosește Letter of Credit!</p>

<h3>Costuri Exemplu - Export SUA:</h3>
<p>Comandă 1.000 kg produse textile, valoare 10.000 USD:</p>
<ul>
<li>🚢 <strong>Transport maritim:</strong> 1.500 USD (3-4 săptămâni)</li>
<li>✈️ <strong>Transport aerian:</strong> 6.000 USD (3-5 zile)</li>
<li>📄 <strong>Broker vamal SUA:</strong> 200-500 USD</li>
<li>💰 <strong>Taxe vamale SUA (textile 10%):</strong> 1.000 USD</li>
<li>📋 <strong>Certificat EUR1:</strong> 100 RON</li>
<li>📋 <strong>Asigurare marfă:</strong> 0,5-1% din valoare = 50-100 USD</li>
</ul>

<p><strong>Total costuri export:</strong> 2.850-7.800 USD (depinde de transport)</p>

<h3>UK Post-Brexit (din 2021):</h3>
<ul>
<li>⚠️ UK NU mai e în UE → proceduri vamal complete</li>
<li>⚠️ Cod EORI UK necesar (diferit de EORI RO)</li>
<li>⚠️ Taxe vamale UK: 0-20% (depinde de produs)</li>
<li>⚠️ TVA UK: 20% (plătit de client la import, recuperabil dacă e business)</li>
<li>✅ Acord liber-schimb UE-UK: 0% taxe vamale DACĂ ai EUR1!</li>
</ul>',
'["Identifică țară target (recomand UK sau Elveția pentru început)","Obține cod EORI","Studiază taxe vamale țară destinație (HS code produsului tău)","Obține certificat EUR1 de la CCIR","Angajează broker vamal țară destinație (sau lucrează cu freight forwarder)","Negociază Incoterm FCA cu clientul","Asigură marfa (0,5-1% din valoare)","Pregătește Commercial Invoice, Packing List, EUR1"]'
FROM p;

-- ==================================================================
-- TREE 2: Franchising
-- ==================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'franchising',
  'Franchising - Deschizi vs Creezi Franciză',
  'Ghid complet: să devii franchisee (cumperi franciză) vs franchisor (vinzi francize)',
  'growth',
  true,
  16
);

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'franchising')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'role_choice',
  'Vrei să deschizi o franciză (franchisee) sau să-ți francizezi propriul business (franchisor)?',
  'Două roluri complet diferite cu riscuri și recompense diferite',
  false
FROM t;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'role_choice')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'franchisee', 'Vreau să deschid o franciză existentă (franchisee)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'role_choice')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'franchisor', 'Vreau să-mi francizez business-ul meu (franchisor)'
FROM n;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'role_choice' AND dp.path_key = 'franchisee'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🏪 Deschidere Franciză (Franchisee)</h2>
<p><strong>Cumperi un business model dovedit cu brand cunoscut</strong></p>

<h3>Avantaje Franchisee:</h3>
<ul>
<li>✅ Brand recunoscut (clienți din ziua 1)</li>
<li>✅ Model business testat (reduce risc eșec)</li>
<li>✅ Training & suport continuu</li>
<li>✅ Putere negociere furnizori (prețuri mai bune)</li>
<li>✅ Marketing național (plătit de franchisor)</li>
</ul>

<h3>Dezavantaje:</h3>
<ul>
<li>❌ Taxă inițială mare (10.000-200.000 EUR)</li>
<li>❌ Royalty lunar (3-8% din venit brut)</li>
<li>❌ Autonomie limitată (trebuie să urmezi regulile franchisorului)</li>
<li>❌ Risc brand (dacă francizorul eșuează, afectează toate locațiile)</li>
</ul>

<h3>Costuri Tipice Francizare România:</h3>
<table>
<tr><th>Franciză</th><th>Taxă inițială</th><th>Royalty lunar</th><th>Investiție totală</th></tr>
<tr><td>KFC</td><td>50.000 USD</td><td>5%</td><td>1-2M USD</td></tr>
<tr><td>McDonald s</td><td>45.000 EUR</td><td>15% (sales + rent)</td><td>500k-1.5M EUR</td></tr>
<tr><td>Freshful (sucuri)</td><td>15.000 EUR</td><td>5%</td><td>80-120k EUR</td></tr>
<tr><td>Lemon Gym</td><td>0 EUR</td><td>10%</td><td>150-300k EUR</td></tr>
<tr><td>Dr. Lohengrin (beauty)</td><td>25.000 EUR</td><td>6%</td><td>120-180k EUR</td></tr>
</table>

<h3>Proces Deschidere Franciză (Pas cu Pas):</h3>

<h4>Faza 1 - Research (1-2 luni):</h4>
<ol>
<li>📊 <strong>Identifică industria:</strong> HoReCa, retail, servicii, fitness?</li>
<li>📊 <strong>Listează 5-10 francize potențiale</strong></li>
<li>📊 <strong>Verifică:</strong>
  <ul>
  <li>Câte locații au în România? (dacă <3, e risky - brand necunoscut)</li>
  <li>Rata supraviețuire francize (câte au închis în ultimii 3 ani?)</li>
  <li>Reviews online (Google, Facebook)</li>
  </ul>
</li>
<li>📊 <strong>Solicită FDD (Franchise Disclosure Document):</strong> Document legal cu toate detaliile financiare, obligații, history</li>
</ol>

<h4>Faza 2 - Evaluare Financiară (1 lună):</h4>
<ol>
<li>💰 <strong>Calculează investiția totală:</strong>
  <ul>
  <li>Taxă inițială franchisă</li>
  <li>Renovări spațiu (conform brand standards)</li>
  <li>Echipamente (bucătărie, mobilier, POS, etc.)</li>
  <li>Stoc inițial</li>
  <li>Capital de lucru 3-6 luni</li>
  </ul>
</li>
<li>💰 <strong>Proiecții revenue:</strong> Cere franchisorului date reale de la locații similare (în orașe similare ca mărime)</li>
<li>💰 <strong>Calculează breakeven:</strong> La ce venit lunar acoperi toate cheltuielile?</li>
</ol>

<h4>Faza 3 - Due Diligence (1-2 luni):</h4>
<ol>
<li>🔍 <strong>Vorbește cu alți franchisee:</strong> Franch isorul TREBUIE să-ți dea contacte (dacă refuză = RED FLAG!)</li>
<li>🔍 <strong>Întrebări pentru franchisee existenți:</strong>
  <ul>
  <li>Revenue real vs proiecții franchisor?</li>
  <li>Suportul franchisorului e bun?</li>
  <li>Ce probleme nedeclărate există?</li>
  <li>Ai deschide din nou această franciză?</li>
  </ul>
</li>
<li>🔍 <strong>Verifică contract franciză cu avocat:</strong> Costuri 2.000-5.000 RON, dar ESENȚIAL!</li>
</ol>

<h4>Faza 4 - Finanțare (1-2 luni):</h4>
<ul>
<li>💳 Fonduri proprii (recomandat minim 30-40%)</li>
<li>💳 Credit bancar (bănci au programe speciale franciză - dobândă mai mică dacă brand cunoscut)</li>
<li>💳 Investitori (family & friends sau business angels)</li>
</ul>

<h4>Faza 5 - Semnare & Deschidere (3-6 luni):</h4>
<ol>
<li>📄 Semnare contract franciză (de obicei 5-10 ani)</li>
<li>📄 Plată taxă inițială</li>
<li>🏗️ Găsire & amenajare spațiu (franchisor aproprietară design)</li>
<li>📚 Training (2-4 săptămâni, de obicei la sediul franchisorului)</li>
<li>📢 Pre-opening marketing</li>
<li>🎉 <strong>DESCHIDERE!</strong></li>
</ol>

<h3>Clauzele Contractului de Franciză:</h3>
<table>
<tr><th>Clauză</th><th>Ce verifici</th><th>Red Flags</th></tr>
<tr><td><strong>Teritoriu exclusiv</strong></td><td>Ai exclusivitate într-o zonă?</td><td>Dacă franchisor poate deschide altă locație la 500m</td></tr>
<tr><td><strong>Durata contract</strong></td><td>5-10 ani normal</td><td>Sub 5 ani = prea scurt pentru ROI</td></tr>
<tr><td><strong>Renewal</strong></td><td>Drept reînnoire automată?</td><td>Dacă franchisor poate refuza fără motiv</td></tr>
<tr><td><strong>Exit clause</strong></td><td>Poți vinde franciză?</td><td>Dacă franchisor cere 50%+ din preț vânzare</td></tr>
<tr><td><strong>Non-compete</strong></td><td>Nu poți deschide business similar X ani după</td><td>Dacă non-compete > 3 ani = abuz</td></tr>
</table>

<h3>Rate de Succes Francize:</h3>
<ul>
<li>📈 <strong>Francize:</strong> 90% supraviețuire la 5 ani</li>
<li>📈 <strong>Independent business:</strong> 50% supraviețuire la 5 ani</li>
<li>📈 <strong>Motiv:</strong> Model dovedit + suport continuu</li>
</ul>

<h3>Exemplu Financial - Franciză Cafenea (Starbucks-style):</h3>
<table>
<tr><th>Parametru</th><th>Valoare</th></tr>
<tr><td><strong>Investiție Inițială</strong></td><td></td></tr>
<tr><td>Taxă franciză</td><td>30.000 EUR</td></tr>
<tr><td>Renovări spațiu 100mp</td><td>40.000 EUR</td></tr>
<tr><td>Echipamente (espresso, mobilier, POS)</td><td>50.000 EUR</td></tr>
<tr><td>Stoc inițial</td><td>10.000 EUR</td></tr>
<tr><td>Capital lucru 3 luni</td><td>20.000 EUR</td></tr>
<tr><td><strong>TOTAL INVESTIȚIE</strong></td><td><strong>150.000 EUR</strong></td></tr>
<tr><td><strong>Operațional Lunar (an 1)</strong></td><td></td></tr>
<tr><td>Revenue (400 clienți/zi × 15 RON)</td><td>180.000 RON (36k EUR)</td></tr>
<tr><td>Cost mărfuri (30%)</td><td>54.000 RON</td></tr>
<tr><td>Salarii 5 angajați</td><td>15.000 RON</td></tr>
<tr><td>Chirie</td><td>10.000 RON</td></tr>
<tr><td>Royalty (5%)</td><td>9.000 RON</td></tr>
<tr><td>Alte cheltuieli</td><td>7.000 RON</td></tr>
<tr><td><strong>Profit net lunar</strong></td><td><strong>85.000 RON (17k EUR)</strong></td></tr>
<tr><td><strong>ROI (Return on Investment)</strong></td><td><strong>~9 luni breakeven</strong></td></tr>
</table>',
'["Identifică 5-10 francize în industria ta preferată","Solicită FDD (Franchise Disclosure Document)","Vorbește cu minim 3 franchisee existenți","Verifică contract cu avocat specializat francize","Calculează investiția totală + proiecții realiste","Asigură finanțare (minim 30-40% fonduri proprii)","Training la franchisor înainte de deschidere"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'role_choice' AND dp.path_key = 'franchisor'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🏢 Francizarea Business-ului Tău (Franchisor)</h2>
<p><strong>Creezi un sistem de multiplicare a business-ului prin parteneri</strong></p>

<h3>Când are sens să francizezi:</h3>
<ul>
<li>✅ Ai 2-3+ locații proprii PROFITABILE</li>
<li>✅ Model business replicabil (nu depinde de tine personal)</li>
<li>✅ Brand cunoscut local/regional</li>
<li>✅ Procese documentate (SOPs - Standard Operating Procedures)</li>
<li>✅ Diferențiere clară față de competiție</li>
<li>✅ Capital pentru suport francize (minim 50.000 EUR)</li>
</ul>

<h3>Nu franciza dacă:</h3>
<ul>
<li>❌ Ai doar 1 locație (testează modelul mai întâi cu 2-3 locații)</li>
<li>❌ Profitabilitatea e inconsistentă</li>
<li>❌ Business-ul depinde de tine (skill personal, relații)</li>
<li>❌ Nu ai capital pentru suport & marketing francize</li>
</ul>

<h3>Pași Creare Sistem Franciză:</h3>

<h4>Faza 1 - Pregătire (6-12 luni):</h4>
<ol>
<li>📋 <strong>Documentare procese (SOPs):</strong>
  <ul>
  <li>Opening/closing procedures</li>
  <li>Hiring & training</li>
  <li>Quality control</li>
  <li>Customer service standards</li>
  <li>Marketing local</li>
  <li>Financial reporting</li>
  </ul>
</li>
<li>📋 <strong>Operations Manual:</strong> Document 100-300 pagini cu TOATE detaliile operaționale</li>
<li>📋 <strong>Brand Guidelines:</strong> Logo usage, colors, design standards</li>
<li>📋 <strong>Financial Model:</strong> Proiecții realiste pentru franchisee (venit, costuri, profit)</li>
</ol>

<h4>Faza 2 - Legal & Structură (3-6 luni):</h4>
<ol>
<li>⚖️ <strong>Angajează avocat francize:</strong> Costuri 10.000-30.000 EUR (dar ESENȚIAL!)</li>
<li>⚖️ <strong>Contract Master Franciză:</strong> Document legal care definește relația franchisor-franchisee</li>
<li>⚖️ <strong>Trademark:</strong> Înregistrează brand-ul la OSIM (1.000-3.000 EUR)</li>
<li>⚖️ <strong>FDD (Franchise Disclosure Document):</strong> Document obligatoriu în multe țări</li>
</ol>

<h4>Faza 3 - Pricing & Economics (1-2 luni):</h4>

<table>
<tr><th>Revenue Stream</th><th>Tipic Range</th><th>Când se plătește</th></tr>
<tr><td><strong>Taxă inițială franciză</strong></td><td>10.000-100.000 EUR</td><td>La semnare contract</td></tr>
<tr><td><strong>Royalty lunar</strong></td><td>3-8% din revenue brut</td><td>Lunar</td></tr>
<tr><td><strong>Marketing fee</strong></td><td>1-3% din revenue</td><td>Lunar (fond comun marketing)</td></tr>
<tr><td><strong>Training fee</strong></td><td>2.000-10.000 EUR</td><td>La training inițial</td></tr>
<tr><td><strong>Renewal fee</strong></td><td>20-50% din taxă inițială</td><td>La reînnoirea contractului (5-10 ani)</td></tr>
</table>

<h4>Faza 4 - Suport & Infrastructură (ongoing):</h4>
<p><strong>Ca franchisor, TREBUIE să oferi:</strong></p>
<ul>
<li>📞 <strong>Support line:</strong> Asistență franchisee (telefon, email)</li>
<li>📚 <strong>Training inițial:</strong> 2-4 săptămâni pentru franchisee & staff</li>
<li>📚 <strong>Training continuu:</strong> Updates proceduri, produse noi</li>
<li>📈 <strong>Marketing național:</strong> Campanii TV, social media, PR</li>
<li>🔍 <strong>Quality control:</strong> Vizite periodice, audits</li>
<li>💻 <strong>Tech stack:</strong> POS, CRM, inventory management (licențe pentru franchisee)</li>
<li>📊 <strong>Reporting system:</strong> Franchisee raportează sales lunar</li>
</ul>

<h3>Costuri Francizare Business (pentru tine ca franchisor):</h3>
<ul>
<li>⚖️ <strong>Legal (avocat, contracte, trademark):</strong> 15.000-40.000 EUR</li>
<li>📋 <strong>Operations Manual & SOPs:</strong> 10.000-20.000 EUR (consultant sau intern)</li>
<li>📢 <strong>Marketing materials (pitch deck, brochures):</strong> 5.000-15.000 EUR</li>
<li>👨‍🏫 <strong>Training program development:</strong> 10.000-30.000 EUR</li>
<li>💻 <strong>Tech infrastructure (portal franchisee, reporting):</strong> 15.000-50.000 EUR</li>
<li>👔 <strong>Sales team francize (recruitment franchisee):</strong> 50.000-150.000 EUR/an</li>
<li><strong>TOTAL INVESTIȚIE INIȚIALĂ FRANCIZARE:</strong> 100.000-300.000 EUR</li>
</ul>

<h3>Economics Franchisor - Exemplu:</h3>
<p><strong>Scenar iu:</strong> Ai un business HoReCa (restaurant casual dining)</p>

<p><strong>An 1-2 (pregătire + primele francize):</strong></p>
<ul>
<li>Investiție setup franciză: 150.000 EUR</li>
<li>Vând 3 francize × 25.000 EUR taxă = 75.000 EUR income</li>
<li>Royalty 5%: 3 francize × 50k EUR revenue/lună × 5% × 6 luni (avg) = 45.000 EUR</li>
<li><strong>Total revenue an 1-2:</strong> 120.000 EUR</li>
<li><strong>Costuri support:</strong> 80.000 EUR (staff, marketing, ops)</li>
<li><strong>Net:</strong> 40.000 EUR (+ locațiile tale proprii!)</li>
</ul>

<p><strong>An 3-5 (scale):</strong></p>
<ul>
<li>20 francize active</li>
<li>Revenue franchising: 20 × 50k EUR/lună × 5% royalty × 12 = 600.000 EUR/an</li>
<li>Taxe noi francize: 5/an × 25k = 125.000 EUR</li>
<li><strong>Total revenue:</strong> 725.000 EUR/an</li>
<li><strong>Costuri:</strong> 400.000 EUR (team 10 people, marketing, support)</li>
<li><strong>Net profit:</strong> 325.000 EUR/an (+ locații proprii!)</li>
</ul>

<h3>Greșeli Frecvente Franchisor:</h3>
<ul>
<li>❌ <strong>Francizezi prea devreme:</strong> Cu doar 1 locație = risc mare eșec franchisee</li>
<li>❌ <strong>Selectezi franchisee greșiți:</strong> Doar pentru bani, fără fit cultural</li>
<li>❌ <strong>Suport insuficient:</strong> Franchisee eșuează → imagine brand afectată</li>
<li>❌ <strong>Supraexpansionare:</strong> Prea multe francize prea repede = quality control scade</li>
<li>❌ <strong>Contract slab:</strong> Fără avocat specialist = dispute nesfârșite</li>
</ul>

<h3>Exemple Succese Francize România:</h3>
<ul>
<li>🍕 <strong>Jerry''s Pizza:</strong> 120+ locații, brand 100% românesc</li>
<li>🍔 <strong>City Grill:</strong> 50+ locații, francizare după 10 ani cu locații proprii</li>
<li>💪 <strong>Lemon Gym:</strong> 30+ săli, model low-cost funcționează</li>
<li>☕ <strong>5 to go:</strong> 300+ locații în 5 ani (expansion agresivă dar cu sistem solid)</li>
</ul>',
'["Verifică prerequisite: 2-3+ locații profitabile","Documentează procese (SOPs, Operations Manual)","Angajează avocat francize (15k-30k EUR)","Înregistrează trademark la OSIM","Dezvoltă training program (2-4 săptămâni)","Creează pitch materials pentru recruitment franchisee","Stabilește pricing: taxă inițială + royalty","Construiește support infrastructure (call center, portal, reporting)"]'
FROM p;

-- ================================================================
-- TREE 3: Scaling Team (10 → 50 → 100 employees)
-- ================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'scaling_team',
  'Scaling Team - Creștere de la 10 la 100 Angajați',
  'Provocări și soluții la fiecare etapă de creștere: procese, cultură, leadership',
  'growth',
  true,
  17
);

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'scaling_team')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'current_size',
  'Câți angajați ai acum?',
  'Fiecare etapă de creștere are provocări specifice',
  false
FROM t;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'current_size')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'small', 'Sub 10 angajați (vrei să crești la 20-50)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'current_size')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'medium', '10-50 angajați (vrei să crești la 50-100)'
FROM n;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'current_size' AND dp.path_key = 'small'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>📈 Scaling 5-10 → 20-50 Angajați</h2>
<p><strong>Tranziția de la startup la small company</strong></p>

<h3>Provocări Majore:</h3>
<ul>
<li>⚠️ Founder nu mai poate gestiona totul direct</li>
<li>⚠️ Comunicarea devine haotică</li>
<li>⚠️ Lipsă procese formale</li>
<li>⚠️ Cultura company se diluează cu fiecare hire</li>
<li>⚠️ "Startup vibe" vs profesionalizare</li>
</ul>

<h3>Soluții Testate:</h3>

<h4>1. Creează Management Layer (Primul Tău Management Team):</h4>
<p><strong>La 15-20 angajați, TREBUIE management intermediar!</strong></p>
<ul>
<li>👔 <strong>Head of Engineering/Product:</strong> Gestionează echipa tech</li>
<li>👔 <strong>Sales Manager:</strong> Conduce sales team</li>
<li>👔 <strong>Operations Manager:</strong> Procese, HR, finance</li>
</ul>

<p><strong>Greșeală frecventă:</strong> Founder-ul vrea să rămână in toate deciziile → bottleneck!</p>
<p><strong>Soluție:</strong> Delegate cu trust but verify (weekly 1-on-1 cu manageri)</p>

<h4>2. Documentează Procese Core:</h4>
<table>
<tr><th>Proces</th><th>De ce e critic</th></tr>
<tr><td><strong>Hiring</strong></td><td>Fără proces standard, quality scade la hire 15+</td></tr>
<tr><td><strong>Onboarding</strong></td><td>Fiecare new hire ia 2-4 săptămâni să fie productiv fără onboarding structurat</td></tr>
<tr><td><strong>Performance review</strong></td><td>Feedback ad-hoc nu mai funcționează la 20+ people</td></tr>
<tr><td><strong>Sales pipeline</strong></td><td>Trebuie predictibilitate revenue</td></tr>
<tr><td><strong>Product development</strong></td><td>Sprints, roadmap, prioritizare</td></tr>
</table>

<h4>3. Implementează Tools:</h4>
<ul>
<li>💬 <strong>Communication: Slack</strong> (free până la 10k messages history)</li>
<li>📋 <strong>Project Management: Asana, Monday, Jira</strong></li>
<li>👥 <strong>HR/Payroll: Salarium, FluxHR</strong> (România-specific)</li>
<li>📊 <strong>CRM: HubSpot, Pipedrive</strong></li>
<li>💰 <strong>Accounting: SmartBill, Saga</strong></li>
</ul>

<h4>4. Păstrează Cultura:</h4>
<p><strong>La fiecare 5-10 hires noi, cultura se diluează!</strong></p>
<p><strong>Soluții:</strong></p>
<ul>
<li>📜 <strong>Core Values Document:</strong> 3-5 valori clare, exemplificate</li>
<li>🎤 <strong>Monthly All-Hands:</strong> Founder prezintă vision, wins, challenges</li>
<li>🏆 <strong>Recognition program:</strong> Public shoutouts pentru behaviors aliniate cu values</li>
<li>🍕 <strong>Team events:</strong> Minim 1/trimestru (retreat, team building)</li>
</ul>

<h3>Costuri Scaling (la 30 angajați în tech/SaaS):</h3>
<table>
<tr><th>Categorie</th><th>Cost Lunar (EUR)</th></tr>
<tr><td>Salarii (avg 3.000 EUR/angajat brut)</td><td>90.000</td></tr>
<tr><td>Chirie birou (300mp)</td><td>6.000</td></tr>
<tr><td>Software tools (Slack, Jira, HubSpot, etc.)</td><td>2.000</td></tr>
<tr><td>HR/Recruiting (1 HR person + fees)</td><td>4.000</td></tr>
<tr><td>Accounting/Legal</td><td>2.000</td></tr>
<tr><td><strong>TOTAL LUNAR</strong></td><td><strong>104.000 EUR</strong></td></tr>
<tr><td><strong>BURN RATE ANUAL</strong></td><td><strong>1,25M EUR</strong></td></tr>
</table>

<p><strong>→ Trebuie revenue 1.5-2M EUR/an pentru break-even!</strong></p>',
'["Hire first line managers la 15-20 angajați","Documentează procese hiring & onboarding","Implementează Slack + project management tool","Definește core values în scris","Monthly all-hands meetings","Performance reviews formale (minim bi-anual)"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'current_size' AND dp.path_key = 'medium'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🚀 Scaling 50 → 100+ Angajați</h2>
<p><strong>Tranziția la enterprise-grade company</strong></p>

<h3>Provocări Majore Această Etapă:</h3>
<ul>
<li>⚠️ Silos între departamente</li>
<li>⚠️ Founder pierde "pulse" pe company</li>
<li>⚠️ Comunicarea devine joc telefon stricat</li>
<li>⚠️ Hiring quality scade (volume mare hire)</li>
<li>⚠️ Middle management inexperimentat</li>
</ul>

<h3>Soluții:</h3>

<h4>1. Profese business-grad HR:</h4>
<ul>
<li>👔 <strong>Head of HR</strong> (sau CPO - Chief People Officer)</li>
<li>👔 <strong>Recruiters dedicați:</strong> 1 recruiter per 50 hires/an</li>
<li>👔 <strong>L&D (Learning & Development):</strong> Training programs</li>
<li>👔 <strong>People Ops:</strong> Payroll, benefits, compliance</li>
</ul>

<h4>2. Org Structure:</h4>
<p><strong>La 50+, TREBUIE org chart clar!</strong></p>
<pre>
CEO
├── CTO (Engineering + Product) - 25 people
├── VP Sales (Sales + Marketing) - 15 people
├── VP Operations (Finance, HR, Legal) - 8 people
└── Customer Success - 10 people
</pre>

<h4>3. Communication Rituals:</h4>
<table>
<tr><th>Ritual</th><th>Frecvență</th><th>Participanți</th></tr>
<tr><td>All-hands</td><td>Bi-weekly</td><td>Toată compania</td></tr>
<tr><td>Leadership team</td><td>Weekly</td><td>C-level + VPs</td></tr>
<tr><td>Department sync</td><td>Weekly</td><td>Fiecare departament</td></tr>
<tr><td>1-on-1s</td><td>Bi-weekly</td><td>Manager-report</td></tr>
</table>

<h4>4. Performance & Development:</h4>
<ul>
<li>📊 <strong>OKRs (Objectives & Key Results):</strong> Company, department, individual</li>
<li>📊 <strong>360 reviews:</strong> Bi-anual</li>
<li>📊 <strong>Career framework:</strong> Junior → Mid → Senior → Staff → Principal (cu criteriiclare)</li>
<li>📊 <strong>Promotion cycles:</strong> Bi-anual (transparent process)</li>
</ul>

<h4>5. Retention Focus:</h4>
<p><strong>La 100 angajați, dacă turnover >20%/an = CRIZĂ!</strong></p>
<p><strong>Retention strategies:</strong></p>
<ul>
<li>💰 <strong>Competitive compensation:</strong> Review salaries anual vs market</li>
<li>📈 <strong>Career growth:</strong> Path clar de avansare</li>
<li>🎓 <strong>Learning budget:</strong> 1.000-2.000 EUR/angajat/an pentru cursuri</li>
<li>🏖️ <strong>Work-life balance:</strong> Remote/hybrid, concedii</li>
<li>💼 <strong>Equity/stock options:</strong> Pentru key people</li>
</ul>',
'["Hire Head of HR/CPO","Creează org chart transparent","Implementează OKRs company-wide","Bi-weekly all-hands mandatory","Career framework cu promotion process","Annual compensation review vs market","Employee engagement surveys (quarterly)"]'
FROM p;

-- ================================================================
-- TREE 4: Multi-Location Expansion
-- ================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'multi_location',
  'Expansiune Multi-Locație',
  'Cum să deschizi locații 2, 3, 10: strategie, timing, operațiuni',
  'growth',
  true,
  18
);

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'multi_location')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'business_type_multi',
  'Ce tip de business ai?',
  'Strategia de expansiune diferă radical între industrii',
  false
FROM t;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'business_type_multi')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'retail', 'Retail / HoReCa (cafenea, restaurant, magazin)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'business_type_multi')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'services', 'Servicii (salon, clinică, gym)'
FROM n;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'business_type_multi' AND dp.path_key = 'retail'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🏪 Expansiune Multi-Locație Retail/HoReCa</h2>

<h3>Când să deschizi locația 2:</h3>
<ul>
<li>✅ Locația 1 e profitabilă 12+ luni consecutiv</li>
<li>✅ Ai capital pentru locația 2 FĂRĂ să afectezi locația 1</li>
<li>✅ Ai manager solid pe locația 1 (nu mai depinde de tine zilnic)</li>
<li>✅ Procese documentate (hiring, training, inventory, quality)</li>
<li>✅ Brand recognition în orașul curent</li>
</ul>

<h3>Strategii Expansiune:</h3>

<h4>Opțiunea 1: Cluster Strategy (RECOMANDAT):</h4>
<p><strong>Deschide 3-5 locații în același oraș înainte să mergi în alt oraș</strong></p>
<p><strong>Avantaje:</strong></p>
<ul>
<li>✅ Operational efficiency (un manager district pentru 3-5 locații)</li>
<li>✅ Brand awareness concentrat</li>
<li>✅ Logistică centralizată (furnizori, depozit)</li>
<li>✅ Staff pooling (dacă lipsește cineva, îl muți din altă locație)</li>
</ul>
<p><strong>Exemplu:</strong> Starbucks București: 15+ locații în București înainte de Cluj</p>

<h4>Opțiunea 2: Geographic Expansion:</h4>
<p><strong>Deschizi în alte orașe mari (Cluj, Timișoara, Brașov, Iași)</strong></p>
<p><strong>Avantaje:</strong></p>
<ul>
<li>✅ Diversificare risc (dacă un oraș merge prost, altul compensează)</li>
<li>✅ Brand național</li>
</ul>
<p><strong>Dezavantaje:</strong></p>
<ul>
<li>❌ Management mai greu (travel constant)</li>
<li>❌ Logistică complicată</li>
<li>❌ Trebuie să construiești brand de la 0 în fiecare oraș</li>
</ul>

<h3>Process pentru Locația 2-5:</h3>

<h4>1. Site Selection (Alegerea Locației):</h4>
<table>
<tr><th>Factor</th><th>De ce contează</th></tr>
<tr><td><strong>Footfall</strong></td><td>Minim 5.000 persoane/zi trafic pedonal</td></tr>
<tr><td><strong>Demographics</strong></td><td>Match cu customer profile (vârstă, venit)</td></tr>
<tr><td><strong>Competition</strong></td><td>Verifică raport competiție (nu vrei 5 cafenele pe aceeași stradă)</td></tr>
<tr><td><strong>Vizibilitate</strong></td><td>Trebuie văzut de pe stradă principală</td></tr>
<tr><td><strong>Acces</strong></td><td>Parcare, acces public transport</td></tr>
<tr><td><strong>Chirie</strong></td><td>Max 10-15% din projected revenue</td></tr>
</table>

<h4>2. Financial Model:</h4>
<p><strong>Exemplu Cafenea:</strong></p>
<table>
<tr><th>Parametru</th><th>Locația 1</th><th>Locația 2</th></tr>
<tr><td>Investiție inițială</td><td>80.000 EUR</td><td>60.000 EUR (reuse some equipment)</td></tr>
<tr><td>Timp până la breakeven</td><td>12 luni</td><td>6-9 luni (brand cunoscut)</td></tr>
<tr><td>Revenue lunar (an 1)</td><td>25.000 EUR</td><td>20.000 EUR (80% din loc 1)</td></tr>
<tr><td>Profit margin</td><td>20%</td><td>15% (overhead management)</td></tr>
</table>

<p><strong>Regulă:</strong> Locația 2 va face 60-80% din revenue locația 1 în primul an (brand recognition mai mic în zonă nouă)</p>

<h4>3. Operations Playbook:</h4>
<p><strong>Documentează TOTUL de la locația 1:</strong></p>
<ul>
<li>📋 Opening/closing checklist</li>
<li>📋 Recipes & prep guides (pentru HoReCa)</li>
<li>📋 Inventory management</li>
<li>📋 Customer service scripts</li>
<li>📋 POS training</li>
<li>📋 Health & safety protocols</li>
</ul>

<h4>4. Staffing Multi-Location:</h4>
<ul>
<li>👔 <strong>District Manager:</strong> La 3-5 locații, hire district manager care vizitează fiecare locație 2-3×/săptămână</li>
<li>👔 <strong>Store Manager per locație:</strong> Responsabil P&L locației</li>
<li>👔 <strong>Centralized recruitment:</strong> HR dedicate multi-location hiring</li>
</ul>

<h3>Timeline Expansiune:</h3>
<ul>
<li>📅 <strong>Locația 2:</strong> After 12-18 months locația 1 profitabilă</li>
<li>📅 <strong>Locația 3-5:</strong> Every 6-9 months (dacă cash flow permite)</li>
<li>📅 <strong>10+ locații:</strong> Consider franchising (mai puțin capital-intensive)</li>
</ul>',
'["Asigură profitabilitate locația 1 (12+ luni)","Documentează procese (operations manual)","Hire district/regional manager","Site selection riguros (footfall, demographics)","Financial model conservator (assume 60-80% performance loc 1)","Clone setup locația 1 (reduce risk)","Pre-opening training staff 2 săptămâni"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'business_type_multi' AND dp.path_key = 'services'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>💆 Expansiune Servicii (Salon, Clinică, Gym)</h2>

<h3>Specific Pentru Servicii:</h3>
<ul>
<li>🔑 <strong>Skill-dependent:</strong> Quality depinde de oameni (nu doar procese)</li>
<li>🔑 <strong>Repeat business critical:</strong> 70-80% revenue din clienți recurenți</li>
<li>🔑 <strong>Local reputation:</strong> Word-of-mouth e #1 acquisition channel</li>
</ul>

<h3>Când să deschizi locația 2:</h3>
<ul>
<li>✅ Waitlist constant pe locația 1 (demand > capacity)</li>
<li>✅ Retention rate >60% (clienții revin)</li>
<li>✅ Team de practitioner-i antrenați (poți "exporta" 1-2 la locația nouă)</li>
<li>✅ Procese quality control documentate</li>
</ul>

<h3>Model Expansiune Servicii:</h3>

<h4>Opțiunea 1: Hub & Spoke</h4>
<p><strong>Locația 1 = Hub (flagship), Locațiile 2-3 = Spoke (satelit)</strong></p>
<ul>
<li>Hub: Servicii complete, training center, top practitioners</li>
<li>Spoke: Servicii basics, staff junior (antrenați la hub)</li>
</ul>

<h4>Opțiunea 2: Franchise Approach</h4>
<p>Partner cu practitioner-i de top și deschizi împreună (ei devin co-proprietari locația lor)</p>

<h3>Quality Control Multi-Location:</h3>
<ul>
<li>📊 <strong>Mystery shopping:</strong> Lunar per locație</li>
<li>📊 <strong>NPS (Net Promoter Score):</strong> Survey after fiecare serviciu</li>
<li>📊 <strong>Cross-location training:</strong> Staff rotates pentru knowledge sharing</li>
<li>📊 <strong>Standardized service protocols:</strong> Checklist pentru fiecare serviciu</li>
</ul>',
'["Asigură waitlist locația 1","Hire & train practitioner-i de calitate","Creează service protocols documentate","Mystery shopping program","NPS tracking per locație","Consider partnerships cu top performers (co-ownership)"]'
FROM p;

COMMIT;
