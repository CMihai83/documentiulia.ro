-- DocumentIulia Forum Seed Content
-- 20 high-quality threads with realistic replies
-- Romanian language, SEO-optimized
-- Date: 2025-11-22

-- First, get a test user to be the author
-- We'll use UUIDs that should exist in your database

-- Thread 1: Accounting Basics - Contabilitate simplă vs dublă
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'accounting-basics', 'Care este diferența între contabilitate simplă și dublă?', 
'Bună ziua,

Sunt la început cu firma și vreau să înțeleg mai bine care este diferența între contabilitatea în partidă simplă și cea în partidă dublă. 

Când este recomandat să folosesc fiecare sistem? Firma mea este un PFA cu venituri de circa 50.000 RON/an.

Mulțumesc!', 
(SELECT id FROM users LIMIT 1), 
45, 
NOW() - INTERVAL ''5 days'', 
NOW() - INTERVAL ''2 days'');

-- Replies for Thread 1
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%simplă și dublă%'), 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
'Salut!

**Contabilitatea în partidă simplă** înregistrează doar încasările și plățile (cash-in, cash-out). E mai simplă, dar nu oferă o imagine completă despre starea financiară a firmei.

**Contabilitatea în partidă dublă** înregistrează fiecare tranzacție în 2 conturi (debit și credit). De exemplu, când cumperi ceva:
- Debitezi contul de cheltuieli
- Creditezi contul de bancă/casa

Pentru un PFA cu 50.000 RON/an, contabilitatea simplificată este suficientă. Trecerea la dubla devine obligatorie când:
- Depășești 500.000 EUR cifră de afaceri
- Ai angajați
- Ești înregistrat în scopuri de TVA

Spor!', 
NOW() - INTERVAL ''4 days'', 
NOW() - INTERVAL ''4 days'');

INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%simplă și dublă%'), 
(SELECT id FROM users LIMIT 1), 
'Mulțumesc pentru răspuns! Deci pot continua cu contabilitatea simplă pentru moment. 

O altă întrebare: dacă vreau să trec la SRL în viitor, va trebui să schimb sistemul?', 
NOW() - INTERVAL ''3 days'', 
NOW() - INTERVAL ''3 days'');

INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%simplă și dublă%'), 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
'Da, pentru SRL este **obligatorie** contabilitatea în partidă dublă, indiferent de cifra de afaceri. 

SRL-urile trebuie să țină:
- Registrul jurnal
- Registrul inventar  
- Balanța de verificare
- Bilanțul contabil

Recomand să colaborezi cu un contabil autorizat când faci tranziția la SRL.', 
NOW() - INTERVAL ''2 days'', 
NOW() - INTERVAL ''2 days'');

-- Thread 2: Accounting Basics - Amortizarea mijloacelor fixe
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'accounting-basics', 'Cum se calculează amortizarea mijloacelor fixe?', 
'Am cumpărat recent un laptop de 5.000 RON pentru firmă (SRL). 

Cum se calculează amortizarea? În câți ani trebuie să o repartizez?

Am auzit că există mai multe metode de amortizare. Care este cea mai folosită?', 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
67, 
NOW() - INTERVAL ''8 days'', 
NOW() - INTERVAL ''1 day'');

-- Replies for Thread 2
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%amortizare%'), 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
'Pentru calculatoare și echipamente IT, durata normală de utilizare este **3-5 ani** conform Catalogului privind clasificarea şi duratele normale de funcţionare.

**Metoda liniară** (cea mai folosită):
Amortizare anuală = Valoare de intrare / Numărul de ani

Pentru laptopul tău:
- 5.000 RON / 4 ani = 1.250 RON/an
- 1.250 RON / 12 luni = 104,17 RON/lună

**Formula:**
```
Amortizare lunară = (Valoare intrare / Durata ani) / 12
```

Această cheltuială se înregistrează lunar și reduce profitul impozabil.', 
NOW() - INTERVAL ''7 days'', 
NOW() - INTERVAL ''7 days'');

INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%amortizare%'), 
(SELECT id FROM users LIMIT 1), 
'Există și **metoda degresivă** unde amortizezi mai mult în primii ani. Se folosește pentru echipamente care se depreciază rapid.

Dar pentru simplitate, recomand metoda liniară. E mai ușor de calculat și acceptată fiscal.', 
NOW() - INTERVAL ''5 days'', 
NOW() - INTERVAL ''5 days'');

-- Thread 3: Invoicing & Documents - Când emit factură
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'invoicing-docs', 'Când trebuie să emit o factură fiscală?', 
'Lucrez ca freelancer (PFA) și primesc plăți de la clienți. 

În ce situații TREBUIE să emit factură fiscală? Pot să emit chitanță în loc de factură?

Ce se întâmplă dacă nu emit factură la timp?', 
(SELECT id FROM users OFFSET 3 LIMIT 1), 
89, 
NOW() - INTERVAL ''6 days'', 
NOW() - INTERVAL ''1 day'');

-- Replies for Thread 3
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%emit%factură%'), 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
'**Când este OBLIGATORIE factura fiscală:**

1. **Livrări de bunuri** între companii (B2B)
2. **Prestări de servicii** către alte firme
3. **Orice operațiune** dacă ești plătitor de TVA
4. **Export** de bunuri/servicii

**Chitanța** se folosește doar pentru:
- Vânzări către persoane fizice (retail)
- Sume mici (sub 100 RON în unele cazuri)

**Termene de emitere:**
- La livrarea bunului SAU
- La prestarea serviciului SAU  
- La încasarea avansului (dacă primești bani înainte)

**Penalizări** pentru neeimitere: 500-1.000 RON amendă + TVA recalculat retroactiv (dacă ești plătitor).', 
NOW() - INTERVAL ''5 days'', 
NOW() - INTERVAL ''5 days'');

-- Thread 4: Legislation & Tax - Noul prag TVA 2025
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'legislation-tax', 'Noul prag de înregistrare TVA din 2025', 
'Am auzit că s-a modificat plafonul pentru înregistrarea în scopuri de TVA în 2025.

Care este noul prag? Când trebuie să mă înregistrez?

Dacă depășesc plafonul în luna martie, de când plătesc TVA?', 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
134, 
NOW() - INTERVAL ''10 days'', 
NOW() - INTERVAL ''3 days'');

-- Replies for Thread 4
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%prag%TVA%2025%'), 
(SELECT id FROM users LIMIT 1), 
'**Plafonul de înregistrare TVA în 2025: 300.000 RON** (cifră de afaceri în ultimele 12 luni)

**Înregistrare obligatorie când:**
- Depășești 300.000 RON în anul anterior SAU
- Depășești plafonul în cursul anului curent

**Exemplu:**
Dacă în martie 2025 depășești 300.000 RON (cumul ultimele 12 luni):
- Te înregistrezi în termen de 10 zile
- Devii plătitor de TVA din luna următoare (aprilie)
- Aplici TVA 19% la toate facturile emise din aprilie

**ATENȚIE:** Înregistrarea este **irevocabilă** pentru 2 ani!

Poți opta și **voluntar** pentru TVA (chiar dacă nu ai atins plafonul) dacă:
- Lucrezi cu firme mari care cer TVA
- Vrei să recuperezi TVA la achiziții mari', 
NOW() - INTERVAL ''9 days'', 
NOW() - INTERVAL ''9 days'');

INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%prag%TVA%2025%'), 
(SELECT id FROM users OFFSET 3 LIMIT 1), 
'Important de știut: **plafonul se calculează în EURO echivalent** (aproximativ 60.000 EUR la cursul BNR).

Verifică lunar cifra de afaceri cumulată pentru a nu avea surprize!', 
NOW() - INTERVAL ''7 days'', 
NOW() - INTERVAL ''7 days'');

-- Thread 5: Legislation & Tax - Declarația 300
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'legislation-tax', 'Cum se completează declarația 300 (TVA)?', 
'Sunt plătitor de TVA de 3 luni și trebuie să depun prima declarație 300.

Care sunt pașii? Ce rubrici trebuie completate obligatoriu?

Există vreun software care mă ajută sau trebuie completat manual în SPV?', 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
78, 
NOW() - INTERVAL ''4 days'', 
NOW() - INTERVAL ''1 day'');

-- Thread 6: Legislation & Tax - Cheltuieli deductibile
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'legislation-tax', 'Ce cheltuieli sunt deductibile fiscal?', 
'Am un SRL și vreau să știu ce cheltuieli pot deduce pentru a reduce impozitul pe profit.

De exemplu:
- Pot deduce telefonul personal folosit pentru afacere?
- Abonamentul la Netflix (pentru "research")?
- Masa cu clienții?

Care sunt regulile generale?', 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
156, 
NOW() - INTERVAL ''12 days'', 
NOW() - INTERVAL ''4 days'');

-- Replies for Thread 6  
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%deductibile%'), 
(SELECT id FROM users LIMIT 1), 
'**Regula de aur:** Cheltuiala trebuie să fie:
1. **Efectuată** în interesul firmei
2. **Justificată** cu documente (factură, contract)
3. **Legală** (nu contravenții, amenzi)

**DA - Deductibile:**
✅ Telefon de serviciu (contract pe firmă)
✅ Laptop, echipamente IT
✅ Chirii birouri
✅ Salarii + taxe
✅ Deplasări (diurnă max 2,5 × salariul minim)
✅ Reprezentare max 2% din cifra de afaceri

**NU - Nedeductibile:**
❌ Netflix personal  
❌ Amenzi de circulație
❌ Cheltuieli personale fără legătură cu firma
❌ TVA (dacă ești plătitor de TVA)

**Zona GRIS (documentează bine!):**
⚠️ Telefon personal folosit parțial pentru afacere - deductibil parțial
⚠️ Mașină personală - doar km parcurși în interes de serviciu', 
NOW() - INTERVAL ''11 days'', 
NOW() - INTERVAL ''11 days'');

INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%deductibile%'), 
(SELECT id FROM users OFFSET 3 LIMIT 1), 
'Pentru mese cu clienți (protocol/reprezentare):

**Limita:** Max **2% din cifra de afaceri**

**Documente necesare:**
- Factură fiscală de la restaurant
- Invitație sau proces-verbal care atestă scopul mesei
- Listă participanți

Dacă depășești 2%, diferența este nedeductibilă și se adaugă la profitul impozabil.', 
NOW() - INTERVAL ''8 days'', 
NOW() - INTERVAL ''8 days'');

-- Thread 7: Legislation & Tax - PFA vs SRL obligații
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'legislation-tax', 'Obligații fiscale pentru PFA vs SRL - ghid complet', 
'Vreau să compar obligațiile fiscale între PFA și SRL pentru a decide ce formă de organizare să aleg.

**Context:**
- Cifră de afaceri estimată: 200.000 RON/an
- Fără angajați deocamdată
- Servicii IT (programare)

Care sunt diferențele la impozite și declarații?', 
(SELECT id FROM users LIMIT 1), 
201, 
NOW() - INTERVAL ''15 days'', 
NOW() - INTERVAL ''5 days'');

-- Thread 8: Invoicing - e-Factura obligatorie
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'invoicing-docs', 'e-Factura obligatorie - ghid complet 2025', 
'De la 1 iulie 2024 e-Factura este obligatorie pentru tranzacțiile B2B.

**Întrebări:**
1. Cum mă conectez la sistemul ANAF?
2. Ce format trebuie să aibă XML-ul?
3. Pot folosi un software extern sau trebuie manual în SPV?
4. Ce sancțiuni sunt pentru neeimitere?

Cine a implementat deja e-Factura? Ce provocări ați întâmpinat?', 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
289, 
NOW() - INTERVAL ''7 days'', 
NOW() - INTERVAL ''2 days'');

-- Replies for Thread 8
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%e-Factura%'), 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
'**Pași pentru implementare e-Factura:**

1. **Înregistrare în SPV** (Spațiul Privat Virtual ANAF)
   - certificat digital SAU
   - user/parolă

2. **Obține acces la API e-Factura**
   - Aplică pentru credențiale OAuth
   - Primești Client ID + Secret

3. **Generare XML în format RO_CIUS**
   - Standard UBL 2.1
   - Validare XSD

4. **Upload la ANAF**
   - Manual în SPV SAU
   - Automat prin API

**Software-uri compatibile:**
- DocumentIulia (recomand! 😊)
- SmartBill
- Facturis
- ObvioBill

**Sancțiuni neeimitere:** 500-2.000 RON amendă + risc de suspendare cont bancar!', 
NOW() - INTERVAL ''6 days'', 
NOW() - INTERVAL ''6 days'');

INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%e-Factura%'), 
(SELECT id FROM users LIMIT 1), 
'Mulțumesc! Am văzut că DocumentIulia are integrare e-Factura automată. 

Întrebare: dacă emit factura în DocumentIulia, se trimite automat la ANAF sau trebuie să fac eu ceva manual?', 
NOW() - INTERVAL ''5 days'', 
NOW() - INTERVAL ''5 days'');

INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%e-Factura%'), 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
'În DocumentIulia e automat! 

După ce configurezi OAuth-ul (o singură dată):
1. Emiți factura normal în aplicație
2. Apesi butonul "Trimite la ANAF"
3. Sistemul generează XML, îl validează și îl uploadează
4. Primești confirmare de la ANAF în câteva secunde

Și mai cool: primești și facturile de la furnizori automat descărcate din ANAF!', 
NOW() - INTERVAL ''4 days'', 
NOW() - INTERVAL ''4 days'');

-- Thread 9: Invoicing - Factură corectivă
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'invoicing-docs', 'Cum să emit o factură corectivă (storno)?', 
'Am emis o factură cu suma greșită (am pus 1.190 RON în loc de 1.900 RON).

Cum o corectez? Trebuie să anulez factura veche și să emit una nouă sau pot face o factură de diferență?

Ce mențiuni trebuie să pun pe factura corectivă?', 
(SELECT id FROM users OFFSET 3 LIMIT 1), 
54, 
NOW() - INTERVAL ''3 days'', 
NOW() - INTERVAL ''1 day'');

-- Thread 10: Invoicing - Proforma vs Fiscală
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'invoicing-docs', 'Diferența între factură proforma și factură fiscală', 
'Client nou îmi cere "factură proforma" înainte să plătească.

Care este diferența între proforma și factura fiscală? Când folosesc fiecare?

Factura proforma are valoare legală sau e doar un preview?', 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
73, 
NOW() - INTERVAL ''9 days'', 
NOW() - INTERVAL ''3 days'');

-- Thread 11: Payroll & HR - Calcul salariu net
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'payroll-hr', 'Calcul salariu net din brut - exemplu practic 2025', 
'Vreau să angajez primul meu salariat cu un salariu brut de 5.000 RON.

Cât va primi el net în mână și cât îmi costă mie total ca angajator?

Care sunt contribuțiile pe 2025?', 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
167, 
NOW() - INTERVAL ''11 days'', 
NOW() - INTERVAL ''2 days'');

-- Replies for Thread 11
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%Calcul salariu%'), 
(SELECT id FROM users LIMIT 1), 
'**Contribuții 2025:**

**Plătite de angajat (din brut):**
- CAS (pensie): 25%
- CASS (sănătate): 10%  
- Impozit pe venit: 10%

**Plătite de angajator (peste brut):**
- CAS (pensie): 4% (sau 8% în construcții)
- CAM (muncă): 2,25%
- Fond șomaj: 0,5%

**Exemplu pentru 5.000 RON brut:**

```
Brut:                    5.000 RON
- CAS (25%):            -1.250 RON
- CASS (10%):             -500 RON
Venit impozabil:         3.250 RON
- Impozit 10%:            -325 RON
= NET:                   2.925 RON
```

**Cost total angajator:**
```
Brut:                    5.000 RON
+ CAS angajator (4%):     +200 RON
+ CAM (2,25%):           +112,5 RON
+ Șomaj (0,5%):           +25 RON
= COST TOTAL:           5.337,5 RON
```

Deci angajatul primește **2.925 RON net**, tine costă **5.337,5 RON**!', 
NOW() - INTERVAL ''10 days'', 
NOW() - INTERVAL ''10 days'');

-- Thread 12: Payroll & HR - CIM contract
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'payroll-hr', 'Cum se completează CIM (contractul individual de muncă)?', 
'Trebuie să fac primul contract de muncă pentru angajat.

Ce clauze sunt obligatorii în CIM? Există un model standard?

Trebuie înregistrat undeva sau doar semnat între părți?', 
(SELECT id FROM users LIMIT 1), 
91, 
NOW() - INTERVAL ''8 days'', 
NOW() - INTERVAL ''4 days'');

-- Thread 13: Payroll & HR - Contribuții sociale 2025
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'payroll-hr', 'Contribuții sociale 2025 - tabel complet', 
'Vreau un tabel clar cu TOATE contribuțiile sociale pentru 2025.

Am văzut că s-au modificat unele procente față de 2024. Care este situația actuală?

Sunt diferențe pentru IT-iști sau alte categorii speciale?', 
(SELECT id FROM users OFFSET 3 LIMIT 1), 
143, 
NOW() - INTERVAL ''13 days'', 
NOW() - INTERVAL ''6 days'');

-- Thread 14: Business Management - Business plan
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'business-management', 'Cum să construiești un business plan eficient', 
'Vreau să aplic pentru un grant de 100.000 EUR și trebuie un business plan solid.

Ce secțiuni TREBUIE să conțină? 

Aveți template-uri sau exemple de business plan-uri acceptate?', 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
112, 
NOW() - INTERVAL ''14 days'', 
NOW() - INTERVAL ''7 days'');

-- Thread 15: Business Management - Cash flow vs Profit
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'business-management', 'Cash flow vs profit - diferențe esențiale', 
'Am un SRL cu profit de 50.000 RON pe an dar nu am bani în cont. Cum e posibil?

Care este diferența între profit și cash flow? De ce sunt importante amândouă?', 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
98, 
NOW() - INTERVAL ''10 days'', 
NOW() - INTERVAL ''5 days'');

-- Replies for Thread 15
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%Cash flow%'), 
(SELECT id FROM users LIMIT 1), 
'**Profit vs Cash Flow - exemplu simplu:**

**Profit (din contul de profit și pierdere):**
- Venituri: 200.000 RON
- Cheltuieli: 150.000 RON  
- Profit: 50.000 RON

Dar...

**Cash Flow (bani reali în cont):**
- Încasări: 180.000 RON (20k facturat dar neîncasat!)
- Plăți: 160.000 RON
- Cash flow: 20.000 RON

**Diferențele apar din:**
1. **Facturi neîncasate** - ai vândut dar nu ai primit banii
2. **Amortizare** - cheltuială contabilă (nu ieși bani din cont)
3. **Investiții** - ieși bani din cont dar nu apar ca cheltuială
4. **Credite** - ratele nu sunt cheltuială, doar dobânda

**Soluție:** Monitorizează AMBELE! DocumentIulia are raport de cash flow integrat 👍', 
NOW() - INTERVAL ''9 days'', 
NOW() - INTERVAL ''9 days'');

-- Thread 16: Excel & Software - Top formule Excel
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'excel-software', 'Top 10 formule Excel pentru contabilitate', 
'Lucrez mult în Excel pentru rapoarte financiare.

Care sunt formulele esențiale pe care ar trebui să le cunosc?

De exemplu pentru:
- Calcul TVA
- Sumă condiționată pe categorie
- Verificare duplicat facturi', 
(SELECT id FROM users OFFSET 3 LIMIT 1), 
178, 
NOW() - INTERVAL ''12 days'', 
NOW() - INTERVAL ''3 days'');

-- Replies for Thread 16
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%formule Excel%'), 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
'**Top 10 Formule Excel pentru Contabilitate:**

1. **Calcul TVA 19%**
```excel
=A1*0.19        (TVA din valoare fără TVA)
=A1/1.19*0.19   (TVA din valoare cu TVA inclusă)
```

2. **SUMIF - Sumă condiționată**
```excel
=SUMIF(B:B,"Cheltuieli",C:C)
```

3. **VLOOKUP - Caută date**
```excel
=VLOOKUP(A2,Tabel!A:D,3,FALSE)
```

4. **IF - Condiții**
```excel
=IF(A1>300000,"TVA obligatoriu","Scutit TVA")
```

5. **COUNTIF - Numără duplicate**
```excel
=COUNTIF(A:A,A2)>1
```

6. **SUMIFS - Sumă cu multiple condiții**
```excel
=SUMIFS(C:C,A:A,"2025",B:B,"Venituri")
```

7. **EOMONTH - Ultima zi a lunii**
```excel
=EOMONTH(A1,0)
```

8. **TEXT - Formatare dată**
```excel
=TEXT(A1,"DD.MM.YYYY")
```

9. **ROUND - Rotunjire**
```excel
=ROUND(A1*0.19,2)
```

10. **CONCATENATE - Combinare text**
```excel
=CONCATENATE("Factura nr. ",A1)
```', 
NOW() - INTERVAL ''11 days'', 
NOW() - INTERVAL ''11 days'');

-- Thread 17: Excel & Software - Automatizare facturare
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'excel-software', 'Automatizarea facturării cu Excel sau software dedicat?', 
'Emit circa 50 de facturi pe lună și fac totul manual în Excel.

Merită să investesc într-un software de facturare sau pot automatiza în Excel?

Ce soluții recomandați? Care sunt avantajele/dezavantajele?', 
(SELECT id FROM users LIMIT 1), 
134, 
NOW() - INTERVAL ''16 days'', 
NOW() - INTERVAL ''8 days'');

-- Thread 18: General Questions - FAQ DocumentIulia
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'general-questions', 'Întrebări frecvente despre DocumentIulia - FAQ', 
'Am început să folosesc DocumentIulia și am câteva întrebări:

1. Pot lucra cu mai multe companii în același cont?
2. Cum fac backup la date?
3. Există aplicație mobilă?
4. Se integrează cu banca pentru import tranzacții?
5. Pot exporta date în Excel?

Mulțumesc!', 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
256, 
NOW() - INTERVAL ''5 days'', 
NOW() - INTERVAL ''1 day'');

-- Replies for Thread 18
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%FAQ%DocumentIulia%'), 
(SELECT id FROM users OFFSET 1 LIMIT 1), 
'Bună! Răspund la întrebări:

**1. Conturi multiple companii:** DA  
Poți adăuga nelimitat de companii în același cont. Treci ușor între ele din meniul dropdown.

**2. Backup:** Automat zilnic  
Datele sunt salvate în cloud (PostgreSQL) cu backup automat. Poți face și export manual oricând.

**3. Aplicație mobilă:** Responsive web  
Deocamdată nu există app nativ, dar site-ul este 100% responsive - funcționează perfect pe mobil.

**4. Integrare bancară:** DA  
Integrare cu 2500+ bănci europene prin PSD2 (Nordigen API). Importi tranzacții automat!

**5. Export Excel:** DA  
Toate rapoartele pot fi exportate în Excel (.xlsx) cu un click.

**Bonus:** e-Factura integrată, AI consultant fiscal, cursuri gratuite!', 
NOW() - INTERVAL ''4 days'', 
NOW() - INTERVAL ''4 days'');

-- Thread 19: General Questions - Organizare contabilitate început
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'general-questions', 'Cum să îți organizezi contabilitatea pentru început', 
'Tocmai mi-am deschis primul PFA (servicii consultanță).

Nu am experiență cu contabilitate. De unde încep?

Ce documente trebuie să păstrez? Cum organizez facturile?

Există vreo metodă simplă pentru început până găsesc un contabil?', 
(SELECT id FROM users OFFSET 3 LIMIT 1), 
187, 
NOW() - INTERVAL ''7 days'', 
NOW() - INTERVAL ''2 days'');

-- Replies for Thread 19
INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%organizezi contabilitatea%'), 
(SELECT id FROM users LIMIT 1), 
'**Ghid pentru început (PFA):**

**1. Deschide cont bancar dedicat afacerii**
Nu amesteca banii personali cu cei de firmă!

**2. Păstrează TOATE documentele:**
✅ Facturi emise (copii)
✅ Facturi primite (originale)  
✅ Chitanțe
✅ Extrase bancare
✅ Contracte

**3. Organizare fizică:**
- Mapă pentru fiecare lună
- Separează venituri de cheltuieli
- Numerotează facturile emise: 2025001, 2025002, etc.

**4. Digitalizare:**
Scanează/fotografiază totul. Backup în cloud (Google Drive, Dropbox).

**5. Folosește un soft de facturare:**
DocumentIulia, SmartBill, etc. Te ajută să:
- Emiți facturi conforme
- Ții evidența veniturilor/cheltuielilor
- Generezi rapoarte pentru contabil

**6. Lunar:**
- Verifică încasări/plăți
- Reconciliază cu extrasul bancar
- Pregătește documentele pentru contabil

**7. Angajează contabil măcar pentru:**
- Declarația unică (anul fiscal)
- Sfaturi optimizare taxe
- Verificare conformitate

Mult succes! 🚀', 
NOW() - INTERVAL ''6 days'', 
NOW() - INTERVAL ''6 days'');

INSERT INTO forum_replies (id, thread_id, user_id, content, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM forum_threads WHERE title LIKE '%organizezi contabilitatea%'), 
(SELECT id FROM users OFFSET 2 LIMIT 1), 
'Adaug la sfaturile de mai sus:

**Verifică lunar:**
- [ ] Am emis toate facturile pentru serviciile prestate?
- [ ] Am primit toate facturile de la furnizori?
- [ ] Corespund plățile din bancă cu facturile?
- [ ] Am backup la documente?

**Set up initial DocumentIulia:**
1. Adaugă compania (CUI, date firmă)
2. Configurează șablonul de factură
3. Importă produsele/serviciile oferite
4. Adaugă clienții recurenți
5. Configurează e-Factura (dacă ai TVA)

După configurare inițială, emiterea unei facturi durează < 1 minut!', 
NOW() - INTERVAL ''5 days'', 
NOW() - INTERVAL ''5 days'');

-- Thread 20: Announcements & News
INSERT INTO forum_threads (id, category_key, title, content, user_id, views, created_at, updated_at) VALUES
(gen_random_uuid(), 'announcements-news', 'Bun venit pe forumul DocumentIulia! 🎉', 
'Bună ziua și bine ați venit pe forumul comunității DocumentIulia!

Acesta este un spațiu dedicat antreprenorilor, contabililor și profesioniștilor din România pentru:

✅ **Schimb de experiență** în contabilitate și fiscalitate
✅ **Ajutor reciproc** cu întrebări despre legislație
✅ **Discuții** despre DocumentIulia și alte soluții software
✅ **Actualizări** legislative și fiscal

**Reguli forum:**
1. Respectați ceilalți membri
2. Nu spam, nu publicitate
3. Căutați înainte să postați (poate există deja răspunsul!)
4. Marcați răspunsul corect când primiți soluția

**Categorii disponibile:**
📚 Bază Contabilă
⚖️ Legislație & TVA  
📄 Facturare & Documente
👥 Salarii & HR
💼 Afaceri & Management
💻 Excel & Software
❓ Întrebări Generale
📢 Anunțuri & Știri

Succes tuturor! 🚀

**Echipa DocumentIulia**', 
(SELECT id FROM users WHERE email LIKE '%admin%' LIMIT 1), 
512, 
NOW() - INTERVAL ''30 days'', 
NOW() - INTERVAL ''1 day'');

-- Update thread counts for categories
UPDATE forum_categories SET thread_count = (
    SELECT COUNT(*) FROM forum_threads WHERE forum_threads.category_key = forum_categories.category_key
);

-- Update reply counts for threads
UPDATE forum_threads SET reply_count = (
    SELECT COUNT(*) FROM forum_replies WHERE forum_replies.thread_id = forum_threads.id
);

COMMIT;

-- Display summary
SELECT 
    'Forum Seed Complete!' as status,
    (SELECT COUNT(*) FROM forum_threads WHERE created_at > NOW() - INTERVAL '31 days') as threads_created,
    (SELECT COUNT(*) FROM forum_replies WHERE created_at > NOW() - INTERVAL '31 days') as replies_created;
