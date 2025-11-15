-- TREE 10: GDPR Compliance - Data Protection
-- Final tree to complete Month 1 priority 10

BEGIN;

INSERT INTO decision_trees (tree_key, tree_name, description, category, is_active, priority)
VALUES (
  'gdpr_compliance',
  'GDPR - Protecția Datelor Personale',
  'Ghid conformitate GDPR: când e necesar, ce documente, amenzi, proceduri',
  'legal',
  true,
  5
);

-- Nodes
WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'gdpr_compliance')
INSERT INTO decision_nodes (tree_id, node_key, question, help_text, is_terminal)
SELECT t.id, 'collect_personal_data',
  'Colectezi date personale? (nume, email, telefon, CNP, etc.)',
  'Dacă răspunsul e DA la orice din următoarele, ești supus GDPR: clienți, angajați, furnizori, vizitatori site.',
  false
FROM t;

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'gdpr_compliance')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'data_volume', n.id,
  'Câte persoane (înregistrări) ai în baza de date?',
  'Volumul determină complexitatea conformității. >1000 persoane = risc crescut.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'collect_personal_data';

WITH t AS (SELECT id FROM decision_trees WHERE tree_key = 'gdpr_compliance')
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, help_text, is_terminal)
SELECT t.id, 'sensitive_data', n.id,
  'Procesezi date sensibile? (sănătate, religie, orientare sexuală, cazier)',
  'Datele sensibile au cerințe suplimentare și amenzi mai mari.',
  false
FROM t, decision_nodes n WHERE n.node_key = 'data_volume';

-- Paths
WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'collect_personal_data')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'yes_collect', 'Da - colectez date personale', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'data_volume';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'collect_personal_data')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'no_collect', 'Nu - zero date personale'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'data_volume')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'under_1000', 'Sub 1.000 persoane', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'sensitive_data';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'data_volume')
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id)
SELECT n.id, 'over_1000', 'Peste 1.000 persoane', n2.id
FROM n, decision_nodes n2 WHERE n2.node_key = 'sensitive_data';

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'sensitive_data')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'yes_sensitive', 'Da - date sensibile (sănătate, etc.)'
FROM n;

WITH n AS (SELECT id FROM decision_nodes WHERE node_key = 'sensitive_data')
INSERT INTO decision_paths (node_id, path_key, answer_option)
SELECT n.id, 'no_sensitive', 'Nu - doar date standard (nume, email, telefon)'
FROM n;

-- Answers
WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'collect_personal_data' AND dp.path_key = 'no_collect'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>✅ GDPR NU SE APLICĂ</h2>

<div class="alert alert-success">
<strong>Veste bună:</strong> Dacă nu colectezi NICIO dată personală, GDPR nu te afectează!
</div>

<h3>Ce Înseamnă "Date Personale"?</h3>
<p>Orice informație despre o persoană identificabilă:</p>
<ul>
<li>Nume, prenume</li>
<li>Adresă email, telefon</li>
<li>Adresă fizică</li>
<li>CNP, CI, pașaport</li>
<li>IP-ul calculatorului</li>
<li>Cookie-uri site (dacă permit identificare)</li>
</ul>

<h3>Sigur Nu Colectezi Date?</h3>
<p>Verifică dacă ai:</p>
<ul>
<li>✅ Formulare contact pe site (nume + email = DATE!)</li>
<li>✅ Newsletter (email-uri = DATE!)</li>
<li>✅ Facturi clienți (nume, adresă = DATE!)</li>
<li>✅ Angajați (CV, contracte = DATE!)</li>
<li>✅ Google Analytics pe site (IP-uri = DATE!)</li>
</ul>

<p><strong>Dacă ai oricare din astea → AI DATE → GDPR se aplică!</strong></p>

<h3>Singurele Cazuri Când Chiar NU Ai Date:</h3>
<ul>
<li>Business pur offline, fără site, plăți cash, zero evidență clienți</li>
<li>Site static informativ fără formulare, fără analytics, fără cookies</li>
</ul>

<p><strong>Recomandare:</strong> Reconsideră răspunsul. 99% din businessuri colectează date!</p>',
'["Re-evaluează: ai formulare contact? Newsletter? Facturi?","Dacă da la oricare: GDPR se aplică, re-navighează arborele","Dacă cu adevărat zero date: ești safe, dar verifică anual"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'sensitive_data' AND dp.path_key = 'yes_sensitive'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>🔴 CONFORMITATE GDPR STRICTĂ - Date Sensibile</h2>

<div class="alert alert-danger">
<strong>ATENȚIE MAXIMĂ:</strong> Date sensibile = cerințe stricte + amenzi FOARTE mari!
</div>

<h3>Ce Sunt "Date Sensibile" (Special Category Data)?</h3>
<ul>
<li>🏥 Sănătate (diagnostic, tratamente, asigurări medicale)</li>
<li>⚖️ Cazier judiciar, infracțiuni</li>
<li>🙏 Religie, convingeri filozofice</li>
<li>🌈 Orientare sexuală</li>
<li>🧬 Date genetice, biometrice (amprente, iris)</li>
<li>🗳️ Opinie politică, apartenență sindicală</li>
<li>🌍 Origine rasială sau etnică</li>
</ul>

<h3>⚠️ Risc Amenzi GDPR:</h3>
<pre>
Nivel 1 (proceduri): până la 10 milioane EUR SAU 2% din venit global
Nivel 2 (încălcări grave): până la 20 milioane EUR SAU 4% din venit global

Exemple amenzi în România:
- Cabinet medical fără consimțământ: 50.000 RON
- Bază date expusă public: 100.000 RON
- Breach (scurgere date) neraportat: 200.000 RON
</pre>

<h3>📋 CHECKLIST CONFORMITATE COMPLETĂ:</h3>

<h4>1. Bază Legală pentru Procesare (OBLIGATORIU!)</h4>
<p>Trebuie să ai UNA din:</p>
<ul>
<li>✅ <strong>Consimțământ EXPLICIT</strong> (scris, specific, retractabil)
  <ul>
  <li>NU merge consimțământ implicit (checkbox pre-bifat = ILEGAL!)</li>
  <li>Exemplu formular: "Accept procesarea datelor de sănătate pentru X scop [checkbox gol]"</li>
  </ul>
</li>
<li>✅ <strong>Obligație legală</strong> (ex: medicine muncii, asigurări)
  <ul>
  <li>Doar pentru anumite domenii (medical, asigurări, HR)</li>
  </ul>
</li>
<li>✅ <strong>Interes public substanțial</strong>
  <ul>
  <li>Foarte rar aplicabil (spitale, autorități)</li>
  </ul>
</li>
</ul>

<h4>2. Documente OBLIGATORII (Amenzi de la 10.000 RON/lipsă!):</h4>

<h5>a) Politică de Confidențialitate (Privacy Policy)</h5>
<ul>
<li>Publicată pe site + dată clienților înainte de colectare</li>
<li>Conținut minim:
  <ul>
  <li>Ce date colectezi (specifice: "adresă email, telefon, date sănătate X")</li>
  <li>De ce le colectezi (scopuri: "procesare comandă", "marketing")</li>
  <li>Cât le păstrezi (perioade: "3 ani", "până la retragerea consimțământului")</li>
  <li>Cu cine le partajezi (terți: "contabil", "curier", "Google Analytics")</li>
  <li>Drepturile persoanei (acces, ștergere, portabilitate)</li>
  <li>Cum să te contacteze (email DPO sau responsabil)</li>
  </ul>
</li>
</ul>

<h5>b) Registrul de Tratare (Processing Register)</h5>
<ul>
<li>Document intern (Excel sau soft specializat)</li>
<li>Listează TOATE procesările:
  <table>
  <tr><th>Procesare</th><th>Date</th><th>Scop</th><th>Bază legală</th><th>Păstrare</th></tr>
  <tr><td>HR - angajați</td><td>CV, CNP, cont bancar</td><td>Relație muncă</td><td>Contract</td><td>10 ani</td></tr>
  <tr><td>Marketing - newsletter</td><td>Email, nume</td><td>Marketing</td><td>Consimțământ</td><td>Până la retragere</td></tr>
  <tr><td>Medical - fișe</td><td>Diagnostic, istoric</td><td>Tratament</td><td>Consimțământ explicit</td><td>10 ani</td></tr>
  </table>
</li>
</ul>

<h5>c) Formulare Consimțământ</h5>
<ul>
<li>Separate pentru fiecare scop (NU cumula: "Accept tot" = ILEGAL!)</li>
<li>Exemplu corect:
  <pre>
  ☐ Accept procesarea datelor personale (nume, email, telefon) pentru procesarea comenzii.
  ☐ Accept procesarea datelor de sănătate (diagnostic) pentru realizarea tratamentului medical.
  ☐ Accept primirea de oferte marketing prin email (OPȚIONAL - poate fi nebifat!).
  </pre>
</li>
</ul>

<h5>d) Contract Procesare Date (DPA - Data Processing Agreement)</h5>
<ul>
<li>Cu FIECARE terț care procesează date în numele tău:
  <ul>
  <li>Contabil (are acces la salarii angajați)</li>
  <li>Hosting (serverul unde stochezi date)</li>
  <li>Email marketing (MailChimp, etc.)</li>
  <li>Cloud storage (Google Drive, Dropbox)</li>
  </ul>
</li>
<li>Conținut: obligațiile lor (securitate, confidențialitate, raportare breach-uri)</li>
</ul>

<h4>3. Măsuri Tehnice de Securitate (OBLIGATORII!):</h4>
<ul>
<li>✅ <strong>Criptare date sensibile</strong> (în baza de date + transmisie HTTPS)</li>
<li>✅ <strong>Acces restricționat</strong> (doar angajații care au nevoie)</li>
<li>✅ <strong>Parole strong policy</strong> (minim 12 caractere, 2FA)</li>
<li>✅ <strong>Backup-uri criptate</strong> (zilnice, testate lunar)</li>
<li>✅ <strong>Antivirus, firewall</strong> (actualizate)</li>
<li>✅ <strong>Loguri acces</strong> (cine a accesat ce date, când)</li>
<li>✅ <strong>Procedură ștergere sigură</strong> (când persoana cere sau expiră păstrarea)</li>
</ul>

<h4>4. Proceduri Obligatorii:</h4>

<h5>a) Dreptul de Acces (Răspuns în 30 zile!)</h5>
<ul>
<li>Persoana cere: "Vreau să văd ce date aveți despre mine"</li>
<li>Tu răspunzi: copie toate datele (PDF sau Excel), GRATUIT</li>
<li>Include: ce date, de când, pentru ce scop, cu cine au fost partajate</li>
</ul>

<h5>b) Dreptul la Ștergere ("Dreptul de a fi uitat")</h5>
<ul>
<li>Persoana cere: "Ștergeți-mi datele"</li>
<li>Tu TREBUIE să ștergi (cu excepții: obligație legală, interes public)</li>
<li>Termen: 30 zile maximum</li>
<li>Confirmare scrisă că ai șters</li>
</ul>

<h5>c) Data Breach Notification (72 ore!!)</h5>
<ul>
<li>Dacă datele sunt compromise (hack, scurgere, pierdere laptop):
  <ol>
  <li><strong>Raportare la ANSPDCP în 72 ore</strong> (autoritatea GDPR RO)</li>
  <li>Notificare persoane afectate (dacă risc mare pentru ele)</li>
  <li>Măsuri remediale (schimbare parole, investigație)</li>
  </ol>
</li>
<li><strong>Amenda pentru neraportare: până la 200.000 RON!</strong></li>
</ul>

<h4>5. DPO (Data Protection Officer) - Obligatoriu?</h4>
<p><strong>DA, dacă:</strong></p>
<ul>
<li>Ești autoritate publică</li>
<li>Monitorizare la scară largă (>5.000 persoane)</li>
<li>Procesare sistematică date sensibile (cabinet medical mare, clinică)</li>
</ul>
<p><strong>NU, dacă:</strong> Business mic/mediu, date sensibile limitate (sub 1.000 persoane)</p>

<h3>💰 Costuri Conformitate GDPR - Date Sensibile:</h3>
<pre>
Consultanță GDPR (audit + documente): 3.000-10.000 RON (one-time)
DPO externalizat: 500-1.500 RON/lună (dacă obligatoriu)
Software GDPR (registru, consimțăminte): 200-500 RON/lună
Instruire angajați (workshop): 1.000-3.000 RON/an
Măsuri securitate IT (criptare, backup): 2.000-5.000 RON (one-time) + 500 RON/lună mentenanță
────────────────────────────────────────────────
TOTAL SETUP: 6.000-18.000 RON
TOTAL LUNAR: 1.200-2.500 RON
</pre>

<h3>📞 Unde Să Începi:</h3>
<ol>
<li><strong>Audit rapid:</strong> Listează TOATE datele pe care le ai (unde, ce, de la cine)</li>
<li><strong>Consultant GDPR:</strong> Angajează specialist pentru documente inițiale (merită investiția!)</li>
<li><strong>Implementare:</strong> Politică confidențialitate + consimțăminte + DPA-uri + securitate IT</li>
<li><strong>Training:</strong> Instruiește TOȚI angajații (1h prezentare GDPR basics)</li>
<li><strong>Monitorizare:</strong> Review anual conformitate (sau când schimbi procesări)</li>
</ol>',
'["URGENT: Angajează consultant GDPR specializat (nu improviza!)","Audit complet date: ce ai, de la cine, unde stocate","Politică confidențialitate (template specializat, nu generic!)","Formulare consimțământ explicit (checkbox-uri separate)","DPA cu TOȚI terții (contabil, hosting, cloud, marketing)","Măsuri securitate: criptare + acces restricționat + backup","Procedură breach notification (plan în caz de incident)","Instruire angajați (obligatoriu! ei sunt prima linie)","Registru tratare (Excel sau soft GDPR)","Review anual + actualizare când schimbi ceva"]'
FROM p;

WITH p AS (
  SELECT dp.id FROM decision_paths dp
  JOIN decision_nodes dn ON dp.node_id = dn.id
  WHERE dn.node_key = 'sensitive_data' AND dp.path_key = 'no_sensitive'
), parent_vol AS (
  SELECT dp2.path_key FROM decision_paths dp2
  JOIN decision_nodes dn2 ON dp2.node_id = dn2.id
  WHERE dn2.node_key = 'data_volume'
)
INSERT INTO decision_answers (path_id, answer_template, next_steps)
SELECT p.id,
'<h2>📊 CONFORMITATE GDPR STANDARD - Date Normale</h2>

<div class="alert alert-info">
<strong>Nivel mediu:</strong> Date personale standard, fără sensibilități speciale.
</div>

<h3>Ce Date Intră Aici:</h3>
<ul>
<li>Nume, prenume</li>
<li>Email, telefon</li>
<li>Adresă poștală</li>
<li>Date firmă (CUI, J, cont bancar)</li>
<li>IP-uri, cookie-uri</li>
<li>Date tranzacții (istorice comenzi, facturi)</li>
</ul>

<h3>📋 CHECKLIST CONFORMITATE (Simplificată):</h3>

<h4>1. Politică de Confidențialitate (Privacy Policy) ✅</h4>
<ul>
<li><strong>Unde:</strong> Pe site (link în footer) + la colectare (formulare)</li>
<li><strong>Conținut minim:</strong>
  <ul>
  <li>Ce date: "nume, email, telefon, adresă"</li>
  <li>De ce: "procesare comandă, comunicare, marketing (cu consimțământ)"</li>
  <li>Cât timp: "3 ani de la ultima interacțiune"</li>
  <li>Cu cine: "contabil, curier, hosting"</li>
  <li>Drepturile: "acces, ștergere, portabilitate, opoziție"</li>
  <li>Contact: "gdpr@firma.ro sau director@firma.ro"</li>
  </ul>
</li>
<li><strong>Template gratuit:</strong> <a href="https://gdpr.eu/privacy-notice/" target="_blank">GDPR.eu Privacy Notice Generator</a></li>
</ul>

<h4>2. Consimțământ (Dacă aplicabil) ✅</h4>
<ul>
<li><strong>Marketing email/SMS:</strong> Checkbox separat, nebifat default
  <pre>☐ Accept primirea de oferte promoționale prin email (opțional)</pre>
</li>
<li><strong>Procesare comandă/contract:</strong> NU trebuie consimțământ (bază legală = contract)</li>
<li><strong>Cookie-uri:</strong> Banner cookie cu opțiuni (acceptă tot / personalizează / refuză)</li>
</ul>

<h4>3. Registrul de Tratare ✅</h4>
<p>Document intern (Excel):</p>
<table>
<tr><th>Activitate</th><th>Date</th><th>Scop</th><th>Bază legală</th><th>Păstrare</th><th>Terți</th></tr>
<tr><td>Comenzi online</td><td>Nume, email, adresă, telefon</td><td>Livrare produse</td><td>Contract</td><td>3 ani</td><td>Curier, plăți</td></tr>
<tr><td>Newsletter</td><td>Email, nume</td><td>Marketing</td><td>Consimțământ</td><td>Până la retragere</td><td>MailChimp</td></tr>
<tr><td>HR - angajați</td><td>CV, CNP, cont bancar</td><td>Relație muncă</td><td>Contract + lege</td><td>10 ani</td><td>Contabil</td></tr>
<tr><td>Contact forms</td><td>Nume, email, mesaj</td><td>Răspuns întrebări</td><td>Interes legitim</td><td>1 an</td><td>-</td></tr>
</table>

<h4>4. Contracte Procesare Date (DPA) ✅</h4>
<p>Cu toți terții care procesează date în numele tău:</p>
<ul>
<li>✅ Contabil (are acces la salarii, facturi clienți)</li>
<li>✅ Hosting (serverul tău)</li>
<li>✅ Email marketing (MailChimp, Brevo)</li>
<li>✅ CRM (Pipedrive, HubSpot)</li>
<li>✅ Cloud (Google Workspace, Dropbox)</li>
</ul>
<p><strong>Majoritatea oferă template DPA pre-completat (cerere la support).</strong></p>

<h4>5. Măsuri Securitate ✅</h4>
<ul>
<li>✅ <strong>HTTPS pe site</strong> (certificat SSL - gratuit Let''s Encrypt)</li>
<li>✅ <strong>Parole strong</strong> (minim 12 caractere, schimbate la 90 zile)</li>
<li>✅ <strong>Acces limitat</strong> (doar angajații relevanți)</li>
<li>✅ <strong>Backup zilnic</strong> (automat, testat lunar)</li>
<li>✅ <strong>Antivirus actualizat</strong></li>
</ul>

<h4>6. Proceduri Drepturi Persoane ✅</h4>

<h5>a) Dreptul de Acces (30 zile răspuns)</h5>
<p>Persoana cere: "Vreau datele mele"</p>
<p>Tu trimiți: PDF cu toate datele (ce ai, de când, pentru ce)</p>

<h5>b) Dreptul la Ștergere (30 zile)</h5>
<p>Persoana cere: "Ștergeți-mi contul"</p>
<p>Tu ștergi (cu excepții: obligații legale fiscale - păstrezi facturi 10 ani)</p>

<h5>c) Dreptul la Portabilitate</h5>
<p>Persoana cere: "Dați-mi datele în format portabil"</p>
<p>Tu trimiți: CSV/JSON cu datele (pentru transfer la alt serviciu)</p>

<h5>d) Dreptul la Opoziție (Marketing)</h5>
<p>Persoana cere: "Stop marketing!"</p>
<p>Tu oprești imediat (unsubscribe automat)</p>

<h3>💰 Costuri Conformitate GDPR - Date Standard:</h3>
<pre>
Template politică confidențialitate (online gratuit): 0 RON
Consultant GDPR (dacă vrei profesionist): 1.500-3.000 RON (one-time)
Software consimțăminte (Cookiebot, Termly): 0-200 RON/lună
DPA cu terți (template-uri lor): 0 RON (gratuit de la furnizori)
Măsuri securitate (HTTPS, antivirus, backup): 500-1.500 RON (one-time) + 200 RON/lună
────────────────────────────────────────────────
TOTAL SETUP: 2.000-5.000 RON (sau 0 RON DIY)
TOTAL LUNAR: 200-400 RON
</pre>

<h3>🚀 Plan Acțiune Rapid (1 Săptămână):</h3>
<ol>
<li><strong>Ziua 1:</strong> Generează politică confidențialitate (template GDPR.eu) + publică pe site</li>
<li><strong>Ziua 2:</strong> Adaugă checkbox consimțământ la newsletter/marketing</li>
<li><strong>Ziua 3:</strong> Creează registrul de tratare (Excel simplu)</li>
<li><strong>Ziua 4-5:</strong> Contactează terți pentru DPA (email: "Aveți template DPA GDPR?")</li>
<li><strong>Ziua 6:</strong> Verifică: HTTPS pe site? Parole strong? Backup?</li>
<li><strong>Ziua 7:</strong> Instruiește echipa (1h: ce e GDPR, cum răspundem la cereri)</li>
</ol>

<h3>📞 Resurse Gratuite:</h3>
<ul>
<li><a href="https://gdpr.eu/" target="_blank">GDPR.eu</a> - Ghiduri, template-uri, generatoare</li>
<li><a href="https://dataprotection.ro/" target="_blank">ANSPDCP.ro</a> - Autoritatea RO, ghiduri oficiale</li>
<li><a href="https://iapp.org/resources/article/sample-data-processing-agreement/" target="_blank">IAPP Sample DPA</a> - Template contract procesare</li>
</ul>

<h3>✅ Ești Conform GDPR Când:</h3>
<ul>
<li>☑ Politică confidențialitate publicată și accesibilă</li>
<li>☑ Consimțământ explicit pentru marketing (checkbox nebifat)</li>
<li>☑ Registru tratare completat (chiar și Excel simplu)</li>
<li>☑ DPA cu toți terții relevanți (contabil, hosting, etc.)</li>
<li>☑ HTTPS pe site + măsuri securitate de bază</li>
<li>☑ Procedură răspuns cereri (acces, ștergere) - chiar și informală</li>
</ul>

<p><strong>Nivelul acesta de conformitate e suficient pentru 90% din SMB-uri sub 1.000 clienți!</strong></p>',
'["Generează politică confidențialitate (GDPR.eu sau Termly)","Publică pe site (footer link + la formulare)","Checkbox marketing: nebifat default, text clar","Creează registrul tratare (Excel: activitate, date, scop, bază legală)","Solicită DPA de la terți (email: contabil, hosting, CRM, cloud)","Verifică HTTPS pe site (Let''s Encrypt gratuit)","Parole strong policy (minim 12 caractere)","Backup automat zilnic (Google Drive, Dropbox, sau hosting)","Instruiește echipa (1h workshop GDPR basics)","Review anual (sau când adaugi procesări noi)"]'
FROM p;

-- Update Points
INSERT INTO decision_tree_update_points (
  tree_id, update_category, data_point_name, current_value, value_source,
  linked_variable_key, update_frequency, next_verification_due, criticality, auto_updateable
)
SELECT t.id, 'penalty', 'Amendă maximă GDPR nivel 1', '10 milioane EUR sau 2% venit global', 'GDPR Art. 83',
  NULL, 'annual', CURRENT_DATE + 365, 'critical', false
FROM decision_trees t WHERE t.tree_key = 'gdpr_compliance'
UNION ALL
SELECT t.id, 'penalty', 'Amendă maximă GDPR nivel 2', '20 milioane EUR sau 4% venit global', 'GDPR Art. 83',
  NULL, 'annual', CURRENT_DATE + 365, 'critical', false
FROM decision_trees t WHERE t.tree_key = 'gdpr_compliance'
UNION ALL
SELECT t.id, 'deadline', 'Termen raportare breach', '72 ore', 'GDPR Art. 33',
  NULL, 'annual', CURRENT_DATE + 365, 'critical', false
FROM decision_trees t WHERE t.tree_key = 'gdpr_compliance'
UNION ALL
SELECT t.id, 'deadline', 'Termen răspuns cereri drepturi', '30 zile', 'GDPR Art. 12',
  NULL, 'annual', CURRENT_DATE + 365, 'critical', false
FROM decision_trees t WHERE t.tree_key = 'gdpr_compliance';

COMMIT;

-- Final verification
SELECT '════════════════════════════════════════════════════' as separator;
SELECT 'MONTH 1 COMPLETE - 10 PRIORITY TREES CREATED! 🎉' as status;
SELECT '════════════════════════════════════════════════════' as separator;

SELECT COUNT(*) as total_trees FROM decision_trees;
SELECT COUNT(*) as total_update_points FROM decision_tree_update_points;
SELECT COUNT(*) as total_variables FROM legislation_variables;
