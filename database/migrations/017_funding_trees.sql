-- MIGRATION 017: Funding & Finance Trees
-- 4 trees: EU Grants, Angel/VC, Crowdfunding, Financing Options
-- Created: 2025-11-16

BEGIN;

-- ============================================================================
-- TREE 1: EU Grants
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'eu_grants',
  'Fonduri Europene & Granturi UE',
  'Ghid pentru accesarea fondurilor europene: POR, PNDR, eligibilitate și proceduri',
  'finance',
  true,
  11
);

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'eu_grants')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'business_type',
  'Ce tip de organizație ai?',
  'Tipul organizației determină programele disponibile',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'eu_grants'),
     n AS (SELECT id FROM decision_nodes WHERE node_key = 'business_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'startup', 'Start-up IT/Tech (sub 2 ani)'
FROM n;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'eu_grants'),
     n AS (SELECT id FROM decision_nodes WHERE node_key = 'business_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'agriculture', 'Agricultură / Fermă'
FROM n;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'business_type' AND dp.path_key = 'startup'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>💡 POR - Start-Up Nation</h2>
<p><strong>Grant: 50.000-200.000 EUR (90% nerambursabil)</strong></p>
<h3>Eligibilitate:</h3>
<ul>
<li>SRL înființat sub 2 ani</li>
<li>Minim 1 angajat</li>
<li>Cod CAEN IT/tech</li>
<li>Produs/serviciu inovator</li>
</ul>
<h3>Procedură:</h3>
<ol>
<li>Plan de afaceri detaliat (50-100 pagini)</li>
<li>Buget cu oferte furnizori (min 3 oferte)</li>
<li>Aplicație în MySMIS</li>
<li>Evaluare 4-6 luni</li>
<li>Implementare 18-24 luni</li>
</ol>
<h3>Cheltuieli Eligibile:</h3>
<ul>
<li>Echipamente IT (max 50%)</li>
<li>Amenajări birou (max 20%)</li>
<li>Consultanță (max 20%)</li>
<li>Capital lucru - salarii (max 30%)</li>
</ul>
<p><strong>Cost consultant:</strong> 15.000-30.000 RON (recuperabil din grant)</p>
<p><strong>Rate succes:</strong> 30-35% DIY, 70-80% cu consultant</p>',
'["Verifică eligibilitate","Angajează consultant POR","Elaborează plan afaceri","Aplică în MySMIS"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'business_type' AND dp.path_key = 'agriculture'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🌾 PNDR - Tineri Fermieri</h2>
<p><strong>Grant: 50.000 EUR (100% nerambursabil!)</strong></p>
<h3>Eligibilitate:</h3>
<ul>
<li>Vârstă 18-40 ani</li>
<li>Calificare agricolă (diplomă sau curs 150h)</li>
<li>Fermă minimă: 8.000 EUR Producție Standard</li>
<li>PFA/SRL cu CAEN agricol</li>
</ul>
<h3>Ce poți cumpăra:</h3>
<ul>
<li>Tractor, utilaje</li>
<li>Sistem irigație</li>
<li>Sere, adăposturi animale</li>
<li>Animale</li>
<li>Capital lucru (max 20%)</li>
</ul>
<h3>Procedură Simplă:</h3>
<ol>
<li>Obține calificare agricolă (1-2 luni, 1.000-3.000 RON)</li>
<li>Înființare PFA cu CAEN agricol</li>
<li>Plan afaceri 30-50 pagini</li>
<li>Aplicație AFIR online</li>
<li>Primești 37.500 EUR (75%) la aprobare</li>
<li>Implementezi în 18 luni</li>
<li>Primești 12.500 EUR (25%) la finalizare</li>
</ol>
<p><strong>Fără cofinanțare necesară!</strong></p>',
'["Verifică vârsta (sub 40 ani)","Obține calificare agricolă","Înființare PFA agricol","Elaborează plan afaceri","Aplică pe portal AFIR"]'
FROM p;

-- ============================================================================
-- TREE 2: Angel vs VC
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'angel_vs_vc',
  'Angel Investors vs Venture Capital',
  'Cum să atragi investitori: diferențe angel vs VC, equity dilution, term sheets',
  'finance',
  true,
  12
);

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'angel_vs_vc')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'capital_amount',
  'Cât capital cauți?',
  'Suma determină tipul de investitor potrivit',
  false
FROM t;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'capital_amount')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'small', 'Sub 100.000 EUR - Angel'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'capital_amount')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'medium', '100.000-500.000 EUR - Seed VC'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'capital_amount')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'large', 'Peste 500.000 EUR - Series A VC'
FROM n;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'capital_amount' AND dp.path_key = 'small'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>👼 Angel Investors (50-100k EUR)</h2>
<h3>Caracteristici:</h3>
<ul>
<li><strong>Sumă tipică:</strong> 50.000-100.000 EUR</li>
<li><strong>Equity:</strong> 10-20%</li>
<li><strong>Valuation:</strong> 300.000-700.000 EUR</li>
<li><strong>Timeline:</strong> 2-3 luni</li>
</ul>
<h3>Unde găsești angels:</h3>
<ul>
<li>SeedBlink.com</li>
<li>How to Web (noiembrie)</li>
<li>Startup Grind București</li>
<li>Network personal LinkedIn</li>
</ul>
<h3>Ce caută:</h3>
<ol>
<li><strong>Echipă puternică</strong> (50%) - fondatori complementari, domain expertise</li>
<li><strong>Tracțiune early</strong> (30%) - beta users, validare problemă</li>
<li><strong>Piață mare</strong> (15%) - TAM 100M+ EUR</li>
<li><strong>Plan clar</strong> (5%) - cum folosești banii</li>
</ol>
<h3>Term Sheet - Termeni Fair:</h3>
<table>
<tr><th>Parametru</th><th>Recomandat</th></tr>
<tr><td>Equity</td><td>10-20%</td></tr>
<tr><td>Liquidation Pref</td><td>1x non-participating</td></tr>
<tr><td>Board seats</td><td>Fondatori majoritate</td></tr>
<tr><td>Vesting</td><td>4 ani cu 1 an cliff</td></tr>
</table>
<p><strong>Legal costs:</strong> 15.000-40.000 RON</p>',
'["Pitch deck 10-15 slides","Identifică 30-50 angels","Warm intros prin network","Pregătește data room","Angajează avocat startup"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'capital_amount' AND dp.path_key = 'medium'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🚀 Seed VC (100-500k EUR)</h2>
<h3>Caracteristici:</h3>
<ul>
<li><strong>Sumă:</strong> 100.000-500.000 EUR</li>
<li><strong>Equity:</strong> 15-25%</li>
<li><strong>Necesită:</strong> Traction (revenue 50k+ EUR/an)</li>
<li><strong>Timeline:</strong> 3-6 luni</li>
</ul>
<h3>VCs activi România:</h3>
<ul>
<li>Catalyst România</li>
<li>Early Game Ventures</li>
<li>Gecad Ventures</li>
<li>GapMinder VC</li>
</ul>
<h3>Ce caută VCs:</h3>
<ul>
<li><strong>Product-market fit:</strong> MRR creștere constantă</li>
<li><strong>Scalabilitate:</strong> Model SaaS/marketplace</li>
<li><strong>Metrics solide:</strong> LTV/CAC ratio 3:1+, churn <5%</li>
<li><strong>Piață vizibilă:</strong> Path to 10M EUR revenue</li>
</ul>
<h3>Pitch Deck VC (15 slides):</h3>
<ol>
<li>Problem & Solution</li>
<li>Market Size (TAM/SAM/SOM)</li>
<li>Product Demo</li>
<li>Business Model</li>
<li><strong>Traction</strong> (MRR chart, growth rate)</li>
<li>Unit Economics (LTV, CAC, payback)</li>
<li>Competition</li>
<li>Go-to-Market Strategy</li>
<li>Team</li>
<li>Financials (3 year projection)</li>
<li>Ask & Use of Funds</li>
</ol>',
'["Demonstrează traction (MRR >5k EUR)","Pitch deck cu metrics","Target 15-20 VCs","Pregătește due diligence materials","Negociază term sheet cu avocat"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'capital_amount' AND dp.path_key = 'large'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>💼 Series A VC (500k-2M EUR)</h2>
<h3>Caracteristici:</h3>
<ul>
<li><strong>Sumă:</strong> 500.000-2.000.000 EUR</li>
<li><strong>Equity:</strong> 20-30%</li>
<li><strong>Necesită:</strong> Revenue 500k+ EUR/an, creștere 100%+ YoY</li>
<li><strong>Timeline:</strong> 4-9 luni</li>
</ul>
<h3>Requirements Series A:</h3>
<ul>
<li><strong>Revenue run-rate:</strong> 500k-1M EUR ARR minimum</li>
<li><strong>Growth:</strong> 3x-5x YoY</li>
<li><strong>Team:</strong> 10-30 angajați</li>
<li><strong>Product-market fit:</strong> Dovedit (retention >40%)</li>
</ul>
<h3>VCs internaționali activi EE:</h3>
<ul>
<li>Earlybird (Germania)</li>
<li>Atomico (UK)</li>
<li>Index Ventures</li>
<li>Point Nine Capital</li>
</ul>
<p><strong>Due diligence intens:</strong> 2-3 luni, verificare financiară detaliată, customer references, tech audit</p>',
'["ARR >500k EUR cu growth >100%","Board profesionalizat","Financial model detaliat","Customer references","Tech due diligence ready"]'
FROM p;

-- ============================================================================
-- TREE 3: Crowdfunding
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'crowdfunding',
  'Crowdfunding - Equity vs Reward',
  'Ghid crowdfunding: equity (SeedBlink) vs reward-based (Kickstarter)',
  'finance',
  true,
  13
);

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'crowdfunding')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'product_type',
  'Ce tip de produs/business ai?',
  'Tipul produsului determină platforma optimă',
  false
FROM t;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'product_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'physical', 'Produs fizic (gadget, fashion, food)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'product_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'software', 'Software / SaaS / Tech startup'
FROM n;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'product_type' AND dp.path_key = 'physical'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🎁 Reward-based Crowdfunding</h2>
<p><strong>Platforme: Kickstarter, Indiegogo</strong></p>
<h3>Cum funcționează:</h3>
<ul>
<li>Setezi goal (ex: 50.000 EUR)</li>
<li>Oferi produsul ca "reward" la diferite prețuri</li>
<li>Campanie 30-60 zile</li>
<li>All-or-nothing (dacă nu atingi goal, returnezi banii)</li>
</ul>
<h3>Costuri:</h3>
<ul>
<li><strong>Platform fee:</strong> 5% din suma strânsă</li>
<li><strong>Payment processing:</strong> 3-5%</li>
<li><strong>Marketing:</strong> 10-20% din goal (ads, PR, video)</li>
<li><strong>Fulfillment:</strong> Producție + shipping</li>
</ul>
<h3>Structură campanie:</h3>
<ol>
<li><strong>Video profesionist:</strong> 2-3 minute (cost 2.000-10.000 EUR)</li>
<li><strong>Reward tiers:</strong>
  <ul>
  <li>Early bird: produsul la 30-40% discount (limited 100 units)</li>
  <li>Standard: produsul la preț pre-order</li>
  <li>Premium: bundle sau versiune deluxe</li>
  </ul>
</li>
<li><strong>Pre-launch marketing:</strong> Email list 1.000-5.000 persoane</li>
<li><strong>PR strategy:</strong> Pitch la TechCrunch, Mashable, bloguri de nișă</li>
</ol>
<h3>Timeline:</h3>
<table>
<tr><th>Fază</th><th>Durată</th></tr>
<tr><td>Pre-launch (build audience)</td><td>2-3 luni</td></tr>
<tr><td>Campanie live</td><td>30-45 zile</td></tr>
<tr><td>Producție & fulfillment</td><td>3-6 luni</td></tr>
</table>
<p><strong>Rate succes:</strong> 35-40% campanii ating goal-ul</p>',
'["Construiește email list 1.000+ înainte de launch","Video profesionist 2-3 min","Reward tiers clare cu early bird discount","Budget marketing 10-20% din goal","Launch cu PR blitz coordonat"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'product_type' AND dp.path_key = 'software'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>📈 Equity Crowdfunding (SeedBlink)</h2>
<p><strong>Vinzi acțiuni publicului larg prin platformă autorizată</strong></p>
<h3>SeedBlink România:</h3>
<ul>
<li><strong>Minim raise:</strong> 50.000 EUR</li>
<li><strong>Maxim raise:</strong> 1.000.000 EUR (fără prospectus)</li>
<li><strong>Equity cedat:</strong> 10-25%</li>
<li><strong>Nr investitori:</strong> 20-500+</li>
</ul>
<h3>Eligibilitate:</h3>
<ul>
<li>SRL înregistrat România</li>
<li>Tech/innovation business</li>
<li>Preferabil: Traction (MRR >2.000 EUR sau beta users)</li>
<li>Valuation realistă: 500k-3M EUR pre-money</li>
</ul>
<h3>Costuri & Fees:</h3>
<ul>
<li><strong>Success fee SeedBlink:</strong> 7-8% din suma ridicată</li>
<li><strong>Legal (SHA, prospectus light):</strong> 5.000-15.000 EUR</li>
<li><strong>Due diligence:</strong> Include în fee SeedBlink</li>
<li><strong>Marketing campanie:</strong> 5.000-20.000 EUR</li>
</ul>
<h3>Proces:</h3>
<ol>
<li><strong>Apply la SeedBlink</strong> (2 săpt review)</li>
<li><strong>Due diligence light</strong> (verificare business, financials)</li>
<li><strong>Campaign page</strong> (pitch video, financials, team)</li>
<li><strong>Pre-launch:</strong> 2-4 săptămâni (commit early investors pentru 30-40% din goal)</li>
<li><strong>Public launch:</strong> 30-60 zile</li>
<li><strong>Closing & legale:</strong> 2-4 săptămâni</li>
</ol>
<h3>Exemplu real:</h3>
<p>Startup SaaS, MRR 5.000 EUR, raise 200.000 EUR la 1.2M valuation pre-money:</p>
<ul>
<li>Equity cedat: 14,3%</li>
<li>Nr investitori: 87</li>
<li>Ticket mediu: 2.300 EUR</li>
<li>Campanie: 45 zile</li>
<li>Success fee: 16.000 EUR</li>
</ul>',
'["Demonstrează traction (MRR sau users)","Apply la SeedBlink","Pitch video 3-5 minute","Financials transparente","Securizează lead investors pentru 30-40% din raise"]'
FROM p;

-- ============================================================================
-- TREE 4: Bank Loan vs Leasing vs Renting
-- ============================================================================

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'financing_options',
  'Credit Bancar vs Leasing vs Închiriere',
  'Comparație opțiuni finanțare: credit, leasing operațional/financiar, închiriere',
  'finance',
  true,
  14
);

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'financing_options')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'asset_type',
  'Ce vrei să achiziționezi?',
  'Tipul activului influențează opțiunea optimă',
  false
FROM t;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'asset_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'vehicle', 'Vehicul (mașină, camion, utilaj mobil)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'asset_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'equipment', 'Echipament (IT, producție, mobilier)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'asset_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'property', 'Spațiu comercial (birou, depozit)'
FROM n;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'asset_type' AND dp.path_key = 'vehicle'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🚗 Vehicule: Leasing Operațional vs Financiar</h2>
<h3>Comparație opțiuni pentru vehicul 100.000 RON:</h3>
<table>
<tr><th>Opțiune</th><th>Avans</th><th>Rată lunară</th><th>Perioadă</th><th>Cost total</th></tr>
<tr><td><strong>Credit bancar</strong></td><td>30.000</td><td>1.750</td><td>60 luni</td><td>135.000</td></tr>
<tr><td><strong>Leasing financiar</strong></td><td>15.000</td><td>1.950</td><td>60 luni</td><td>132.000</td></tr>
<tr><td><strong>Leasing operațional</strong></td><td>0</td><td>2.200</td><td>36 luni</td><td>79.200*</td></tr>
<tr><td><strong>Închiriere (rent)</strong></td><td>0</td><td>2.500</td><td>12 luni</td><td>30.000/an</td></tr>
</table>
<p><em>*Nu deții vehiculul la final</em></p>

<h3>Leasing Financiar - RECOMANDAT pentru vehicule business:</h3>
<h4>Avantaje:</h4>
<ul>
<li>✅ Avans mic (10-20% vs 30% credit)</li>
<li>✅ Deductibilitate fiscală: 100% rată leasing</li>
<li>✅ Rapid (aprobare 2-5 zile vs 2-4 săptămâni credit)</li>
<li>✅ Vehiculul devine al tău la final</li>
<li>✅ Asigurare CASCO inclusă în rată</li>
</ul>
<h4>Dezavantaje:</h4>
<ul>
<li>❌ Dobândă ușor mai mare decât credit (8-10% vs 7-9%)</li>
<li>❌ Vehiculul e gaj până la plata finală</li>
</ul>

<h3>Leasing Operațional - Pentru flote sau uzură mare:</h3>
<h4>Avantaje:</h4>
<ul>
<li>✅ Fără avans</li>
<li>✅ 100% deductibil fiscal</li>
<li>✅包Service & întreținere inclusă</li>
<li>✅ Schimbi vehiculul la 2-3 ani (mereu nou)</li>
</ul>
<h4>Dezavantaje:</h4>
<ul>
<li>❌ NU devii proprietar</li>
<li>❌ Limită km/an (ex: 30.000 km, extra cost peste limită)</li>
<li>❌ Cost total mai mare pe termen lung</li>
</ul>

<h3>Deductibilitate fiscală exemplu:</h3>
<p>Vehicul 100.000 RON, rată leasing 2.000 RON/lună:</p>
<ul>
<li>Deductibil fiscal: 2.000 RON × 12 = 24.000 RON/an</li>
<li>Economie fiscală (16% impozit micro): 3.840 RON/an</li>
<li>Cost real: 24.000 - 3.840 = 20.160 RON/an</li>
</ul>

<h3>Când să alegi ce:</h3>
<ul>
<li><strong>Credit bancar:</strong> Ai cash flow bun, vrei să deții activul ASAP</li>
<li><strong>Leasing financiar:</strong> Cash flow limitat, vrei ownership final (BEST pentru majoritatea business-urilor)</li>
<li><strong>Leasing operațional:</strong> Flotă vehicule, vrei mereu mașini noi, service inclus</li>
<li><strong>Rent:</strong> Nevoie temporară (sub 2 ani) sau test înainte de achiziție</li>
</ul>',
'["Calculează cash flow disponibil","Compară oferte 3-4 companii leasing","Verifică deductibilitate în Codul Fiscal","Negociază avans și dobândă","Citește contract (atenție la penalități early termination)"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'asset_type' AND dp.path_key = 'equipment'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>💻 Echipamente: Credit vs Leasing</h2>
<h3>Pentru echipamente IT, producție, mobilier:</h3>
<h4>Credit Bancar - RECOMANDAT dacă:</h4>
<ul>
<li>✅ Vrei depreciere în bilanț (reduce baza impozit profit)</li>
<li>✅ Echipament cu viață lungă (5-10 ani)</li>
<li>✅ Ai cash disponibil pentru avans 30%</li>
</ul>
<h4>Leasing - RECOMANDAT dacă:</h4>
<ul>
<li>✅ Cash flow limitat (avans doar 10-15%)</li>
<li>✅ Echipament IT (depreciere rapidă, vrei upgrade la 3-4 ani)</li>
<li>✅ Vrei aprobare rapidă</li>
</ul>

<h3>Exemplu: Echipamente IT 50.000 EUR</h3>
<table>
<tr><th>Parametru</th><th>Credit</th><th>Leasing Financiar</th></tr>
<tr><td>Avans</td><td>15.000 EUR (30%)</td><td>7.500 EUR (15%)</td></tr>
<tr><td>Rată lunară (36 luni)</td><td>1.100 EUR</td><td>1.300 EUR</td></tr>
<tr><td>Dobândă efectivă</td><td>7%</td><td>9%</td></tr>
<tr><td>Aprobare</td><td>2-4 săptămâni</td><td>3-7 zile</td></tr>
<tr><td>Garanții</td><td>Gaj echipament + garanție personală</td><td>Doar gaj echipament</td></tr>
</table>

<h3>Înc hiriere Echipamente - Când are sens:</h3>
<ul>
<li>Proiecte temporare (6-18 luni)</li>
<li>Test echipament înainte de achiziție</li>
<li>Echipament scump folosit sporadic</li>
</ul>
<p><strong>Exemplu:</strong> Închiriezi excavator 5.000 EUR/lună pentru 6 luni = 30.000 EUR (vs cumpărare 150.000 EUR)</p>

<h3>Legislație & Deductibilitate:</h3>
<ul>
<li><strong>Credit:</strong> Deductibilă doar dobânda (nu și principalul)</li>
<li><strong>Leasing:</strong> Deductibilă întreaga rată (principal + dobândă)</li>
<li><strong>Depreciere:</strong> Credit permite amortizare echipament (reduce impozit profit SRL)</li>
</ul>',
'["Evaluează durata utilizare echipament","Compară cost total ownership","Verifică cash flow pentru avans","Negociază cu 3 bănci/leasing companies","Alege în funcție de necesarul de lichiditate"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'asset_type' AND dp.path_key = 'property'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🏢 Spații Comerciale: Cumpărare vs Închiriere</h2>
<h3>Decizie strategică majoră:</h3>

<h4>Închiriere (RENT) - RECOMANDAT pentru majoritatea startup-urilor:</h4>
<h5>Avantaje:</h5>
<ul>
<li>✅ Fără capital blocat (cash disponibil pentru business)</li>
<li>✅ Flexibilitate relocare (când crești sau pivotezi)</li>
<li>✅ 100% deductibilă fiscal (chirie = cheltuială)</li>
<li>✅ Fără risc depreciere proprietate</li>
<li>✅ Landlord asigură întreținere majoră</li>
</ul>
<h5>Dezavantaje:</h5>
<ul>
<li>❌ Banii "pierduți" (nu construiești equity)</li>
<li>❌ Risc creștere chirie anual</li>
<li>❌ Dependență de landlord</li>
</ul>

<h4>Cumpărare cu Credit Ipotecar - RECOMANDAT dacă:</h4>
<ul>
<li>Business stabil 5+ ani</li>
<li>Cash flow predictibil</li>
<li>Locație strategică long-term</li>
<li>Ai avans 25-35%</li>
</ul>
<h5>Avantaje:</h5>
<ul>
<li>✅ Construiești equity (activul e al tău)</li>
<li>✅ Protecție inflație (chirie crește, rata fixă/capped)</li>
<li>✅ Poți închiria suprafața nefolosită</li>
<li>✅ Activul poate fi folosit ca garanție pentru alte credite</li>
</ul>
<h5>Dezavantaje:</h5>
<ul>
<li>❌ Capital mare blocat (avans 100.000-300.000 RON)</li>
<li>❌ Risc piață imobiliară</li>
<li>❌ Inflexibilitate (hard să vinzi rapid)</li>
<li>❌ Costuri întreținere, taxe proprietate</li>
</ul>

<h3>Analiză financiară: Birou 200 mp București</h3>
<table>
<tr><th>Parametru</th><th>Închiriere</th><th>Cumpărare Credit</th></tr>
<tr><td>Preț/chirie inițială</td><td>3.000 EUR/lună</td><td>200.000 EUR (10 EUR/mp)</td></tr>
<tr><td>Avans necesar</td><td>2 chirii (6.000 EUR)</td><td>60.000 EUR (30%)</td></tr>
<tr><td>Cost lunar</td><td>3.000 EUR</td><td>1.100 EUR rată + 200 EUR întreținere</td></tr>
<tr><td>Cost total 10 ani</td><td>360.000 EUR*</td><td>216.000 EUR (rate + întreținere)</td></tr>
<tr><td>Equity construit</td><td>0</td><td>140.000 EUR (principal plătit)</td></tr>
</table>
<p><em>*Presupune creștere chirie 3% anual</em></p>

<h3>Regula 5% (când are sens să cumperi):</h3>
<p>Calculează costul anual ownership: <strong>(Preț proprietate × 5%) / 12 = cost lunar ownership</strong></p>
<p>Exemplu: 200.000 EUR × 5% = 10.000 EUR/an = 833 EUR/lună cost ownership</p>
<p><strong>Dacă chiria > cost ownership → Cumpără</strong></p>
<p><strong>Dacă chiria < cost ownership → Închiriază</strong></p>

<p>În exemplul de mai sus: Chirie 3.000 EUR > 833 EUR ownership → <strong>Închirierea e mai scumpă pe termen lung, CUMPĂRĂ!</strong></p>

<h3>Factori fiscali:</h3>
<ul>
<li><strong>Chirie:</strong> 100% deductibilă (reduce impozit cu 16% sau 10%)</li>
<li><strong>Rată credit:</strong> Doar dobânda deductibilă (nu și principalul)</li>
<li><strong>Depreciere proprietate:</strong> SRL poate amortiza clădirea (reduce impozit profit)</li>
</ul>',
'["Evaluează orizont business (5+ ani = consideră cumpărare)","Calculează regula 5%","Compară cash flow: chirie vs rată","Analizează flexibilitate necesară","Discută cu consultant fiscal pentru optimizare"]'
FROM p;

-- Update points
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'eu_grants')
INSERT INTO decision_tree_update_points (
  tree_id, update_category, data_point_name, current_value, value_source,
  update_frequency, next_verification_due, criticality, auto_updateable
)
SELECT t.id, 'deadline', 'Sesiuni POR 2025', 'Aprilie 2025', 'MySMIS',
  'monthly', CURRENT_DATE + INTERVAL '30 days', 'high', false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'angel_vs_vc')
INSERT INTO decision_tree_update_points (
  tree_id, update_category, data_point_name, current_value, value_source,
  update_frequency, next_verification_due, criticality, auto_updateable
)
SELECT t.id, 'cost_estimate', 'Investiție tipică angel', '70.000 EUR', 'SeedBlink',
  'quarterly', CURRENT_DATE + INTERVAL '90 days', 'medium', false
FROM t;

COMMIT;
