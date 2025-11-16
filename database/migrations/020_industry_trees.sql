-- MIGRATION 020: Industry-Specific Trees  
-- 4 trees: E-commerce, HoReCa, Construction, IT/Software
-- Created: 2025-11-16

BEGIN;

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES
('ecommerce_setup', 'Lansare Magazin Online', 'Platforme, plăți, logistică pentru e-commerce România', 'industry', true, 23),
('horeca_business', 'Business HoReCa - Restaurant/Cafe', 'Specificități restaurant/cafenea: autorizații, costuri, profit margins', 'industry', true, 24),
('construction_business', 'Business Construcții', 'Autorizații, echipe, contracte, riscuri construcții', 'industry', true, 25),
('it_software', 'Business IT/Software', 'SaaS, development services, pricing models, team building', 'industry', true, 26);

-- E-commerce tree
WITH t1 AS (SELECT id FROM decision_trees WHERE tree_key = 'ecommerce_setup')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t1.id, 'platform_choice', 'Ce platformă e-commerce vrei?', 'Platforma influențează costuri și flexibilitate', false FROM t1;

WITH n1 AS (SELECT id FROM decision_nodes WHERE node_key = 'platform_choice')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n1), 'saas', 'SaaS (Shopify, WooCommerce) - rapid, ușor'),
((SELECT id FROM n1), 'custom', 'Custom development - flexibil, scump');

WITH p1 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'platform_choice' AND dp.path_key = 'saas')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p1.id,
'<h2>🛒 E-commerce cu Platformă SaaS</h2>
<h3>Platforme Recomandate România:</h3>
<table>
<tr><th>Platformă</th><th>Cost/lună</th><th>Avantaje</th></tr>
<tr><td><strong>Shopify</strong></td><td>$29-299</td><td>Cel mai popular, toate features, integrări multe</td></tr>
<tr><td><strong>WooCommerce (WordPress)</strong></td><td>Gratuit + hosting $10-50</td><td>Open-source, customizabil</td></tr>
<tr><td><strong>PrestaShop</strong></td><td>Gratuit + hosting</td><td>Popular România, suport local</td></tr>
<tr><td><strong>Wix E-commerce</strong></td><td>$23-49</td><td>Foarte ușor de folosit, drag-and-drop</td></tr>
</table>
<h3>Setup Complet Shopify (Recom andat):</h3>
<ol>
<li><strong>Platformă:</strong> Shopify Basic $29/lună</li>
<li><strong>Domeniu:</strong> .ro domain 50 RON/an</li>
<li><strong>Procesare plăți:</strong>
  <ul>
  <li>Shopify Payments: 2,9% + 0,30$/tranzacție</li>
  <li>SAU Netopia/PayU România: 2-3% + 20-50 RON/lună</li>
  </ul>
</li>
<li><strong>Livrare:</strong> Integrare Fan Courier/Sameday/DPD (gratuit plugins)</li>
<li><strong>AWB automat:</strong> SmartBill/Oblio integrare (150-300 RON/lună)</li>
</ol>
<h3>Costuri Operaționale Lunare:</h3>
<ul>
<li>Platform $29 (~140 RON)</li>
<li>Hosting imagini (Shopify include)</li>
<li>AWB/facturare: 200 RON</li>
<li>Marketing (Google Ads, Facebook): 1.000-5.000 RON</li>
<li><strong>Total minim: ~1.500 RON/lună</strong></li>
</ul>
<h3>Legal & Fiscal:</h3>
<ul>
<li>📋 <strong>Termeni & Condiții:</strong> Obligatorii (template avocat 500-1.000 RON)</li>
<li>📋 <strong>GDPR:</strong> Politică confidențialitate, consimțăminte</li>
<li>📋 <strong>ANPC:</strong> Drept returnare 14 zile consumatori</li>
<li>📋 <strong>E-factura:</strong> Obligatorie din 2024</li>
</ul>',
'["Alege Shopify Basic pentru început","Setup procesare plăți (Netopia/PayU RO)","Integrare curieri (FanCourier API)","Terms & Conditions cu avocat","Marketing budget min 1.000 RON/lună","E-factura compliance"]'
FROM p1;

-- HoReCa tree
WITH t2 AS (SELECT id FROM decision_trees WHERE tree_key = 'horeca_business')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t2.id, 'horeca_type', 'Ce tip de local HoReCa?', 'Costuri și cerințe variază semnificativ', false FROM t2;

WITH n2 AS (SELECT id FROM decision_nodes WHERE node_key = 'horeca_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n2), 'cafe', 'Cafenea/Coffee shop'),
((SELECT id FROM n2), 'restaurant', 'Restaurant (bucătărie completă)');

WITH p2 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'horeca_type' AND dp.path_key = 'cafe')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p2.id,
'<h2>☕ Cafenea - Business Plan</h2>
<h3>Investiție Inițială (50mp):</h3>
<table>
<tr><th>Categorie</th><th>Cost (EUR)</th></tr>
<tr><td>Chirie (depozit 3 luni + garanție)</td><td>6.000</td></tr>
<tr><td>Renovări & design interior</td><td>15.000</td></tr>
<tr><td>Echipamente (espresso, frigidere, mobilier)</td><td>25.000</td></tr>
<tr><td>Autorizații (DSP, ISU)</td><td>3.000</td></tr>
<tr><td>Stoc inițial (cafea, lapte, consumabile)</td><td>3.000</td></tr>
<tr><td>Marketing pre-opening</td><td>2.000</td></tr>
<tr><td>Capital de lucru 3 luni</td><td>10.000</td></tr>
<tr><td><strong>TOTAL</strong></td><td><strong>64.000 EUR</strong></td></tr>
</table>
<h3>Operațional Lunar:</h3>
<ul>
<li>Chirie: 2.000 EUR</li>
<li>Salarii 3 barista: 3.000 EUR</li>
<li>Cafea + consumabile (COGS 30%): 3.000 EUR (la 10k revenue)</li>
<li>Utilități: 500 EUR</li>
<li>Marketing: 500 EUR</li>
<li><strong>Total cheltuieli: 9.000 EUR/lună</strong></li>
</ul>
<h3>Revenue Estimat:</h3>
<ul>
<li>150 clienți/zi × 15 RON (3 EUR) = 450 EUR/zi</li>
<li>450 EUR × 26 zile = 11.700 EUR/lună</li>
<li><strong>Profit net: 2.700 EUR/lună (23% margin)</strong></li>
<li><strong>Breakeven: ~24 luni</strong></li>
</ul>
<h3>Success Factors:</h3>
<ul>
<li>📍 <strong>Locație:</strong> Trafic pedonal 5.000+ persoane/zi</li>
<li>☕ <strong>Calitate cafea:</strong> Boabe specialty, barista antrenați</li>
<li>🎨 <strong>Ambianță:</strong> Instagram-worthy design</li>
<li>💳 <strong>Payment:</strong> Card obligatoriu (90%+ plăți sunt card)</li>
</ul>',
'["Investiție totală: 60-80k EUR","Locație high-traffic ESENȚIALĂ","Autorizații DSP/ISU (buget 6 luni)","Training barista profesionist","Marketing pre-opening (Instagram, local influencers)","POS integrat cu SmartBill/Oblio"]'
FROM p2;

-- Construction tree
WITH t3 AS (SELECT id FROM decision_trees WHERE tree_key = 'construction_business')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t3.id, 'construction_type', 'Ce tip de lucrări?', 'Cerințe diferite per tip', false FROM t3;

WITH n3 AS (SELECT id FROM decision_nodes WHERE node_key = 'construction_type')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n3), 'residential', 'Rezidențial (case, apartamente)'),
((SELECT id FROM n3), 'commercial', 'Comercial/Industrial');

WITH p3 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'construction_type' AND dp.path_key = 'residential')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p3.id,
'<h2>🏗️ Construcții Rezidențiale</h2>
<h3>Cerințe Business:</h3>
<ul>
<li><strong>Atestare ANCPI:</strong> Obligatorie pentru lucrări >20k EUR</li>
<li><strong>Asigurare RCG decenală:</strong> Pentru proprietarul construcției</li>
<li><strong>Responsabil tehnic cu execuția (RTE):</strong> Inginer autorizat</li>
<li><strong>Autorizație construcție:</strong> Pentru client (tu prepari documentație)</li>
</ul>
<h3>Structură Echipă:</h3>
<ul>
<li>Inginer șef (RTE): 5.000-8.000 RON/lună</li>
<li>Maiștri: 4.000-6.000 RON</li>
<li>Muncitori calificați: 3.000-5.000 RON</li>
<li>Necalificați: 2.500-3.500 RON</li>
</ul>
<h3>Pricing:</h3>
<ul>
<li>Structură (gros obra): 250-350 EUR/mp</li>
<li>Finisaje standard: 300-400 EUR/mp</li>
<li>Finisaje premium: 500-800 EUR/mp</li>
<li><strong>Total casă la cheie: 700-1.200 EUR/mp</strong></li>
</ul>
<h3>Margin & Riscuri:</h3>
<ul>
<li>Profit margin: 15-25% (dacă nu sunt probleme)</li>
<li>⚠️ Risc: Creșteri prețuri materiale (hedge cu contracte fixe furnizori)</li>
<li>⚠️ Plăți întârziate clienți (cere advance 30-50%)</li>
<li>⚠️ Weather delays (buffer 20% în timeline)</li>
</ul>',
'["Atestare ANCPI pentru lucrări >20k EUR","Asigurare RCG decenală","Contracte fixe furnizori materiale","Advance payment 30-50% de la client","Responsabil tehnic cu execuția autorizat","Buffer 20% în timp și cost pentru imprevizibil"]'
FROM p3;

-- IT/Software tree
WITH t4 AS (SELECT id FROM decision_trees WHERE tree_key = 'it_software')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t4.id, 'it_model', 'Ce model de business IT?', 'Modele diferite, economics diferite', false FROM t4;

WITH n4 AS (SELECT id FROM decision_nodes WHERE node_key = 'it_model')
INSERT INTO decision_paths (node_id, path_key, answer_option)
VALUES
((SELECT id FROM n4), 'saas', 'SaaS (Software as a Service)'),
((SELECT id FROM n4), 'agency', 'Development Agency (client projects)');

WITH p4 AS (SELECT dp.id FROM decision_paths dp JOIN decision_nodes dn ON dp.node_id = dn.id WHERE dn.node_key = 'it_model' AND dp.path_key = 'saas')
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p4.id,
'<h2>💻 SaaS Business Model</h2>
<h3>Unit Economics Sănătoși:</h3>
<table>
<tr><th>Metric</th><th>Target</th></tr>
<tr><td><strong>LTV (Lifetime Value)</strong></td><td>3x CAC minimum</td></tr>
<tr><td><strong>CAC (Customer Acquisition Cost)</strong></td><td><300 EUR pentru B2B SMB</td></tr>
<tr><td><strong>Churn rate</strong></td><td><5% lunar (B2B), <7% (B2C)</td></tr>
<tr><td><strong>Gross margin</strong></td><td>>70% (SaaS e high-margin)</td></tr>
<tr><td><strong>Rule of 40</strong></td><td>Growth% + Profit% >40</td></tr>
</table>
<h3>Pricing Models:</h3>
<ul>
<li><strong>Per-seat:</strong> $10-50/user/lună (ex: Slack, Asana)</li>
<li><strong>Usage-based:</strong> Pay per API call, storage (ex: AWS, Twilio)</li>
<li><strong>Tiered:</strong> Starter/Pro/Enterprise (ex: HubSpot)</li>
<li><strong>Freemium:</strong> Free + paid features (ex: Dropbox)</li>
</ul>
<h3>Exemplu Pricing SaaS B2B:</h3>
<ul>
<li>Starter: 49 EUR/lună (1-5 users)</li>
<li>Professional: 149 EUR/lună (până la 25 users)</li>
<li>Enterprise: 499 EUR/lună (unlimited + support)</li>
</ul>
<h3>Team Structure (la 100k MRR):</h3>
<ul>
<li>4-5 developers (15k EUR/lună total)</li>
<li>1 product manager (5k EUR)</li>
<li>2 sales/marketing (8k EUR)</li>
<li>1 customer success (3k EUR)</li>
<li>Infra AWS/hosting (2k EUR)</li>
<li><strong>Total opex: ~35k EUR/lună</strong></li>
<li><strong>At 100k MRR → 65k EUR profit (65% margin)</strong></li>
</ul>
<h3>Fundraising Milestones:</h3>
<ul>
<li><strong>Pre-seed:</strong> 50-100k EUR (la product-market fit signals)</li>
<li><strong>Seed:</strong> 200-500k EUR (la 5-10k MRR, growing 15%+ MoM)</li>
<li><strong>Series A:</strong> 1-3M EUR (la 50-100k MRR, ARR 500k-1M EUR)</li>
</ul>',
'["Focus pe single metric: MRR growth","Product-market fit ÎNAINTE de scaling","CAC payback <12 luni","Churn <5% lunar","Hire sales când ai 20-30 paying customers","Fundraise când ai traction (MRR growing 10%+ MoM)"]'
FROM p4;

COMMIT;
