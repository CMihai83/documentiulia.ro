/**
 * DocumentIulia.ro - Blog Articles Seed Data
 * 50+ Full-content articles across all categories
 */

export const blogCategories = [
  { name: 'Fiscalitate și TVA', nameEn: 'Tax & VAT', slug: 'fiscalitate-tva', sortOrder: 1 },
  { name: 'Contabilitate', nameEn: 'Accounting', slug: 'contabilitate', sortOrder: 2 },
  { name: 'HR și Legislația Muncii', nameEn: 'HR & Labor Law', slug: 'hr-legislatia-muncii', sortOrder: 3 },
  { name: 'Management și Leadership', nameEn: 'Management', slug: 'management-leadership', sortOrder: 4 },
  { name: 'Antreprenoriat', nameEn: 'Entrepreneurship', slug: 'antreprenoriat', sortOrder: 5 },
  { name: 'Finanțare și Fonduri', nameEn: 'Funding', slug: 'finantare-fonduri', sortOrder: 6 },
  { name: 'Digitalizare', nameEn: 'Digital Transformation', slug: 'digitalizare', sortOrder: 7 },
  { name: 'SSM și Compliance', nameEn: 'HSE & Compliance', slug: 'ssm-compliance', sortOrder: 8 },
  { name: 'Excel și Productivitate', nameEn: 'Excel & Productivity', slug: 'excel-productivitate', sortOrder: 9 },
  { name: 'Actualitate', nameEn: 'News', slug: 'actualitate', sortOrder: 10 }
];

export const blogArticles = [
  // Fiscalitate articles
  {
    categorySlug: 'fiscalitate-tva',
    title: 'TVA 21% din August 2025: Ghid Complet pentru Companii',
    titleEn: 'VAT 21% from August 2025: Complete Company Guide',
    slug: 'tva-21-august-2025-ghid-complet',
    authorName: 'Maria Ionescu',
    authorBio: 'Consultant fiscal cu 15 ani experiență, fost inspector ANAF',
    readTime: 12,
    tags: ['TVA', 'Legea 141/2025', 'fiscalitate', 'ANAF'],
    excerpt: 'Modificările aduse de Legea 141/2025 schimbă cotele de TVA din România. Află tot ce trebuie să știi pentru a te pregăti corect pentru tranziție.',
    content: `## Introducere

De la 1 august 2025, România va implementa noi cote de TVA conform Legii 141/2025. Această schimbare majoră afectează toate companiile înregistrate în scopuri de TVA și necesită pregătire atentă.

## Noile cote de TVA

### Cota standard: 21% (anterior 19%)
Se aplică pentru:
- Bunuri și servicii care nu beneficiază de cotă redusă
- Importuri
- Achiziții intracomunitare

### Cota redusă: 11% (anterior 9%)
Se aplică pentru:
- Produse alimentare
- Cărți și publicații
- Medicamente
- Cazare hotelieră

### Cota specială: 5%
Se menține pentru:
- Locuințe sociale
- Echipamente pentru persoane cu dizabilități

## Ce trebuie să faci până la 1 august 2025

### 1. Actualizează sistemele de facturare
- Verifică că software-ul permite cote multiple
- Testează cu cele noi cote pe mediu de test
- Planifică update-ul pentru 31 iulie seara

### 2. Revizuiește contractele
- Identifică contractele cu prețuri fixe
- Pregătește acte adiționale unde e cazul
- Comunică cu clienții despre ajustările de preț

### 3. Instruiește echipa
- Training pentru departamentul financiar
- Ghid pentru echipa de vânzări
- FAQ pentru clienți

### 4. Planifică cash flow-ul
- TVA de plată va crește (diferența de 2%)
- Ajustează previziunile de trezorerie
- Consideră impactul asupra prețurilor finale

## Aspecte tehnice importante

### Faptul generator
Cota aplicabilă este cea de la data faptului generator:
- **Livrare bunuri**: data livrării
- **Prestări servicii**: data finalizării sau acceptării
- **Import**: data declarației vamale

### Facturi emise înainte, livrate după
Pentru facturi emise înainte de 1 august dar cu livrare/prestare după:
- Se aplică cota nouă (21% sau 11%)
- Este necesară stornare și refacturare

### Avansuri
- Avansurile încasate înainte de 1 august: cota veche
- Diferența la factura finală: cota nouă proporțional

## Impactul asupra prețurilor

### Bunuri la cota standard
| Preț fără TVA | TVA 19% (vechi) | TVA 21% (nou) | Diferență |
|---------------|-----------------|---------------|-----------|
| 100 RON       | 119 RON         | 121 RON       | +2 RON    |
| 1,000 RON     | 1,190 RON       | 1,210 RON     | +20 RON   |
| 10,000 RON    | 11,900 RON      | 12,100 RON    | +200 RON  |

### Bunuri la cota redusă
| Preț fără TVA | TVA 9% (vechi) | TVA 11% (nou) | Diferență |
|---------------|----------------|---------------|-----------|
| 100 RON       | 109 RON        | 111 RON       | +2 RON    |

## Recomandări finale

1. **Nu amâna pregătirea** - 1 august va veni rapid
2. **Comunică proactiv** cu clienții și furnizorii
3. **Documentează tot** pentru eventuale controale
4. **Consultă un specialist** pentru cazuri complexe

## Resurse utile

- [ANAF - Ghid oficial TVA](https://www.anaf.ro)
- [Codul Fiscal actualizat](https://legislatie.just.ro)
- Cursul nostru: [Conformitate ANAF](/courses/anaf-compliance)

---

*Acest articol a fost actualizat la 15 ianuarie 2025. Verifică întotdeauna legislația în vigoare pentru cele mai recente modificări.*`
  },
  {
    categorySlug: 'fiscalitate-tva',
    title: 'SAF-T D406: Ghid Practic pentru Raportare Lunară',
    titleEn: 'SAF-T D406: Practical Guide for Monthly Reporting',
    slug: 'saft-d406-ghid-practic-raportare',
    authorName: 'Andrei Popescu',
    authorBio: 'Expert contabil, certificat CECCAR',
    readTime: 15,
    tags: ['SAF-T', 'D406', 'ANAF', 'raportare'],
    excerpt: 'Tot ce trebuie să știi despre raportarea SAF-T D406: structură, termene, erori frecvente și soluții practice pentru conformitate.',
    content: `## Ce este SAF-T D406?

SAF-T (Standard Audit File for Tax) este un format standardizat de raportare fiscală introdus în România prin Ordinul 1783/2021. Declarația D406 conține date detaliate despre:
- Planul de conturi
- Balanța de verificare
- Jurnale contabile
- Documente (facturi, chitanțe)
- Stocuri
- Imobilizări

## Cine trebuie să raporteze?

### Obligatoriu din ianuarie 2025
- Mari contribuabili
- Contribuabili mijlocii
- Instituții de credit

### Pilot voluntar (sept 2025 - aug 2026)
- IMM-uri (opțional, cu perioadă de grație de 6 luni)

### Excepții
- Microîntreprinderi cu CA < 1 milion EUR
- PFA și întreprinderi individuale

## Structura fișierului SAF-T

### Header (Antet)
\`\`\`xml
<Header>
  <AuditFileVersion>1.0</AuditFileVersion>
  <CompanyID>RO12345678</CompanyID>
  <TaxRegistrationNumber>RO12345678</TaxRegistrationNumber>
  <CompanyName>SC Exemplu SRL</CompanyName>
  <FiscalYear>2025</FiscalYear>
  <StartDate>2025-01-01</StartDate>
  <EndDate>2025-01-31</EndDate>
</Header>
\`\`\`

### Secțiuni principale
1. **MasterFiles** - Date de referință (conturi, parteneri, produse)
2. **GeneralLedgerEntries** - Înregistrări contabile
3. **SourceDocuments** - Documente sursă (facturi)

## Procesul de raportare pas cu pas

### 1. Pregătirea datelor
- Export din software contabil
- Verificare completitudine
- Curățare date (caractere speciale, lungimi câmpuri)

### 2. Generarea fișierului XML
- Folosește template-ul oficial ANAF
- Respectă schema XSD
- Codificare UTF-8

### 3. Validare
- DUKIntegrator (gratuit de pe ANAF)
- Verificare erori și avertismente
- Corecții necesare

### 4. Transmitere
- Portal SPV
- Semnătură electronică calificată
- Confirmare primire

### 5. Monitorizare status
- Verifică periodic în SPV
- Răspunde la eventuale solicitări

## Erori frecvente și soluții

### 1. CUI invalid
**Problemă**: Format incorect al codului de identificare fiscală
**Soluție**: Verifică prefixul RO, elimină spații, verifică cifra de control

### 2. Balanță dezechilibrată
**Problemă**: Totalul debitor ≠ totalul creditor
**Soluție**: Verifică rulajele lunare, caută înregistrări incomplete

### 3. Document duplicat
**Problemă**: Același număr document apare de mai multe ori
**Soluție**: Verifică seria/numărul, elimină duplicatele

### 4. Curs valutar lipsă
**Problemă**: Operațiuni în valută fără curs
**Soluție**: Completează cursul BNR pentru toate datele

### 5. Cont inexistent
**Problemă**: Referință la cont care nu e în planul de conturi
**Soluție**: Actualizează MasterFiles cu toate conturile folosite

## Termene și penalități

### Termene de depunere
- Luna N: până pe 25 a lunii N+1
- Exemplu: Ianuarie 2025 → până pe 25 februarie 2025

### Penalități pentru nedepunere
- Avertisment sau amendă 1,000 - 5,000 RON
- Posibilitate de rectificare în 30 zile

## Best practices

1. **Automatizează** - Integrează generarea SAF-T în procesul de închidere lunară
2. **Validează înainte de transmitere** - Folosește DUKIntegrator
3. **Păstrează arhive** - Toate fișierele transmise și confirmările
4. **Documentează excepțiile** - Note pentru cazuri speciale
5. **Testează înainte de deadline** - Nu aștepta ultima zi

## Concluzie

SAF-T D406 pare complex la început, dar cu pregătire și procese clare devine rutină. Investește timp în automatizare și vei economisi ore în fiecare lună.

---

*Ai nevoie de ajutor cu SAF-T? Cursul nostru [Conformitate ANAF](/courses/anaf-compliance) acoperă tot procesul în detaliu.*`
  },
  {
    categorySlug: 'fiscalitate-tva',
    title: 'e-Factura 2026: Tot Ce Trebuie Să Știi despre B2B',
    slug: 'efactura-2026-b2b-ghid',
    authorName: 'Elena Radu',
    authorBio: 'Specialist e-Facturare, trainer certificat',
    readTime: 10,
    tags: ['e-Factura', 'B2B', 'SPV', 'digitalizare'],
    excerpt: 'De la mijlocul lui 2026, e-Factura devine obligatorie pentru toate tranzacțiile B2B. Pregătește-te din timp cu acest ghid complet.',
    content: `## Timeline e-Factura în România

### Deja implementat
- **2022**: B2G (Business-to-Government) obligatoriu
- **2024**: Extindere la produse cu risc fiscal ridicat

### În curs
- **2025**: Pregătire infrastructură B2B
- **Iulie 2026**: Obligatoriu pentru toate tranzacțiile B2B

## Ce este e-Factura?

E-Factura este factura în format electronic structurat (XML UBL 2.1) transmisă prin sistemul SPV al ANAF. Nu este:
- Un PDF trimis pe email
- O imagine scanată
- O factură tipărită și trimisă poștal

## Cum funcționează fluxul B2B

### 1. Emitere
Furnizorul generează factura în format UBL 2.1

### 2. Transmitere SPV
Factura se încarcă în Spațiul Privat Virtual

### 3. Validare ANAF
Sistemul verifică structura și datele

### 4. Notificare client
Clientul primește notificare în SPV

### 5. Descărcare
Clientul descarcă și procesează factura

## Pregătire pentru B2B

### Verifică software-ul
- Poate genera XML UBL 2.1?
- Are integrare cu SPV?
- Permite descărcare automată facturi primite?

### Actualizează datele partenerilor
- CUI/CIF corect
- Adrese complete (obligatoriu în UBL)
- Email pentru notificări

### Instruiește echipa
- Cine va transmite facturile?
- Cine va descărca și procesa facturile primite?
- Ce se întâmplă dacă e o eroare?

### Testează din timp
- Înscrie-te în programul pilot
- Transmite facturi de test
- Rezolvă problemele înainte de deadline

## Beneficii e-Factura

1. **Eficiență**: Eliminare introducere manuală date
2. **Viteză**: Facturi ajung instant la client
3. **Audit trail**: Trasabilitate completă
4. **Conformitate**: Reducere risc erori fiscale
5. **Economii**: Fără costuri tipărire/expediere

## Provocări de anticipat

- **Refuzuri de validare**: Pregătește-te pentru erori inițiale
- **Integrare sisteme**: Poate necesita investiții IT
- **Change management**: Echipa trebuie să se adapteze

## Resurse

- Portal SPV: [anaf.ro/spv](https://www.anaf.ro)
- Specificații tehnice UBL 2.1
- [Cursul nostru de e-Facturare](/courses/efactura-specialist)

---

*Nu aștepta până în 2026! Începe pregătirea acum cu versiunea pilot gratuită.*`
  },

  // Contabilitate articles
  {
    categorySlug: 'contabilitate',
    title: 'Închiderea Exercițiului Financiar: Checklist Complet 2024',
    slug: 'inchidere-exercitiu-financiar-checklist-2024',
    authorName: 'Mihai Stanescu',
    authorBio: 'Expert contabil, auditor financiar',
    readTime: 18,
    tags: ['închidere an', 'situații financiare', 'bilanț', 'audit'],
    excerpt: 'Ghid pas cu pas pentru închiderea exercițiului financiar 2024: inventar, ajustări, situații financiare și depunere la ANAF.',
    content: `## Introducere

Închiderea exercițiului financiar este unul dintre cele mai importante momente din anul contabil. Acest ghid te ajută să nu ratezi niciun pas esențial.

## Calendar închidere 2024

| Activitate | Termen limită |
|------------|---------------|
| Inventar | 31 decembrie 2024 |
| Reconcilieri | 15 ianuarie 2025 |
| Ajustări contabile | 31 ianuarie 2025 |
| Situații financiare | 28 februarie 2025 |
| Depunere ANAF | 28 februarie 2025 |
| Depunere MF (entități mari) | 31 mai 2025 |

## Checklist detaliat

### Faza 1: Pregătire (Decembrie)

- [ ] Programează inventarul fizic
- [ ] Solicită confirmări de sold
- [ ] Verifică toate reconcilierile bancare
- [ ] Identifică facturi de primit/emis
- [ ] Verifică starea creanțelor

### Faza 2: Inventar (31 Dec)

- [ ] Numărare fizică stocuri
- [ ] Inventar casă
- [ ] Verificare imobilizări
- [ ] Documentare diferențe
- [ ] Aprobare comisie inventar

### Faza 3: Reconcilieri (Ianuarie)

- [ ] Reconciliere furnizori
- [ ] Reconciliere clienți
- [ ] Reconciliere intercompany
- [ ] Reconciliere salarii/contribuții
- [ ] Reconciliere TVA

### Faza 4: Ajustări (Ianuarie)

- [ ] Provizioane creanțe incerte
- [ ] Ajustări depreciere stocuri
- [ ] Amortizare completă
- [ ] Constituire/utilizare provizioane
- [ ] Regularizări curs valutar

### Faza 5: Situații Financiare

- [ ] Balanță de verificare finală
- [ ] Bilanț
- [ ] Cont de profit și pierdere
- [ ] Note explicative
- [ ] Raportul administratorilor

### Faza 6: Revizuire și Aprobare

- [ ] Verificare internă
- [ ] Revizuire auditor (dacă e cazul)
- [ ] Aprobare CA/AGA
- [ ] Semnături
- [ ] Depunere

## Erori frecvente de evitat

1. **Omiterea cut-off**: Verifică că toate facturile din decembrie sunt înregistrate
2. **Provizioane insuficiente**: Mai bine conservative decât optimiste
3. **Amortizare incompletă**: Verifică toate activele
4. **Solduri în valută**: Curs BNR 31 decembrie
5. **Note incomplete**: Citeți cerințele OMFP 1802

## Concluzie

Închiderea de an necesită planificare și atenție la detalii. Folosește acest checklist și nu vei avea surprize neplăcute la depunere sau audit.`
  },
  {
    categorySlug: 'contabilitate',
    title: 'Planul de Conturi Românesc 2025: Ghid pentru Contabili',
    slug: 'plan-conturi-romanesc-2025-ghid',
    authorName: 'Ana Gheorghe',
    authorBio: 'Lector universitar, expert contabil',
    readTime: 14,
    tags: ['plan de conturi', 'contabilitate', 'OMFP 1802'],
    excerpt: 'Structura completă a planului de conturi conform OMFP 1802/2014 cu exemple practice și sfaturi de utilizare.',
    content: `## Structura Planului de Conturi

Planul de conturi românesc este organizat în 9 clase:

### Clasa 1 - Conturi de capitaluri
- 101 Capital social
- 106 Rezerve
- 117 Rezultatul reportat
- 121 Profit sau pierdere

### Clasa 2 - Conturi de imobilizări
- 201-208 Imobilizări necorporale
- 211-214 Imobilizări corporale
- 261-267 Imobilizări financiare

### Clasa 3 - Conturi de stocuri și producție în curs
- 301-308 Materii prime și materiale
- 331-348 Producție în curs
- 371 Mărfuri

### Clasa 4 - Conturi de terți
- 401-408 Furnizori
- 411-418 Clienți
- 421-428 Personal
- 441-448 Bugetul statului

### Clasa 5 - Conturi de trezorerie
- 511-512 Bănci
- 531 Casa

### Clasa 6 - Conturi de cheltuieli
- 601-608 Cheltuieli cu materiale
- 611-628 Cheltuieli cu servicii
- 641-645 Cheltuieli cu personalul

### Clasa 7 - Conturi de venituri
- 701-708 Venituri din vânzări
- 711 Variația stocurilor
- 761 Venituri din participații

### Clasa 8 - Conturi speciale
- 801-805 Angajamente
- 891-894 Bilanț

### Clasa 9 - Conturi de gestiune internă
Utilizate pentru contabilitatea de gestiune (opțional)

## Funcțiunea conturilor

### Conturi de activ (A)
- Se debitează la intrări/creșteri
- Se creditează la ieșiri/diminuări
- Sold final debitor

### Conturi de pasiv (P)
- Se creditează la intrări/creșteri
- Se debitează la ieșiri/diminuări
- Sold final creditor

### Conturi bifuncționale (A/P)
- Pot avea sold debitor sau creditor
- Exemplu: 401 Furnizori (P), dar avansuri date = A

## Exemple practice

### Achiziție marfă cu factură
\`\`\`
371 "Mărfuri" = 401 "Furnizori"     10,000 RON
4426 "TVA deductibil" = 401        2,100 RON
\`\`\`

### Vânzare marfă
\`\`\`
411 "Clienți" = 707 "Venituri"     15,000 RON
411 = 4427 "TVA colectat"          3,150 RON

607 "Cheltuieli mărfuri" = 371    10,000 RON
\`\`\`

## Conturi noi și modificări 2024-2025

- Actualizări pentru e-Factura
- Conturi pentru criptomonede (dacă e cazul)
- Ajustări conform IFRS 16 (leasing)

## Resurse

Descarcă planul de conturi complet în format Excel de pe site-ul nostru.`
  },

  // HR articles
  {
    categorySlug: 'hr-legislatia-muncii',
    title: 'Codul Muncii 2025: Modificări și Noutăți',
    slug: 'codul-muncii-2025-modificari',
    authorName: 'Irina Vlad',
    authorBio: 'Avocat specializat în dreptul muncii',
    readTime: 16,
    tags: ['Codul Muncii', 'legislație', 'HR', '2025'],
    excerpt: 'Toate modificările importante ale Codului Muncii intrate în vigoare în 2025: telemuncă, concedii, salariu minim și protecția angajaților.',
    content: `## Principalele modificări 2025

### 1. Salariul minim brut: 3,300 RON

De la 1 ianuarie 2025:
- Salariu minim: 3,300 RON brut
- Cost total angajator: ~4,100 RON
- Salariu net minim: ~2,100 RON

### 2. Telemunca - Clarificări

Noile prevederi clarifică:
- Dreptul de a solicita telemuncă
- Obligația angajatorului de a răspunde în 30 zile
- Cheltuielile de acoperit (negociabile)
- SSM în telemuncă

### 3. Concediu parental flexibil

Modificări importante:
- Posibilitatea de a lua concediu în tranșe
- Menținerea beneficiului până la 2 ani
- Protecție la revenirea în muncă

### 4. Protecție hărțuire

Noi obligații pentru angajatori:
- Politică anti-hărțuire obligatorie
- Canal de raportare confidențial
- Instruire periodică angajați
- Investigare imparțială

## Implicații practice

### Pentru angajatori
1. Actualizează regulamentul intern
2. Revizuiește contractele de muncă
3. Organizează training-uri
4. Actualizează grila salarială

### Pentru HR
1. Comunică schimbările angajaților
2. Actualizează template-urile
3. Verifică conformitatea proceselor
4. Documentează toate modificările

## Timeline de implementare

| Schimbare | Termen |
|-----------|--------|
| Salariu minim | 1 ianuarie 2025 |
| Politică anti-hărțuire | 1 martie 2025 |
| Actualizare regulament | 1 aprilie 2025 |

## Resurse

- Text integral Codul Muncii: [legislatie.just.ro](https://legislatie.just.ro)
- Curs: [HR Fundamentals](/courses/hr-fundamentals)
- Template regulament intern: disponibil în cursul HR`
  },
  {
    categorySlug: 'hr-legislatia-muncii',
    title: 'Calculul Salariului Net 2025: Ghid Complet cu Exemple',
    slug: 'calcul-salariu-net-2025-ghid',
    authorName: 'Laura Munteanu',
    authorBio: 'Specialist payroll, 12 ani experiență',
    readTime: 12,
    tags: ['salariu', 'payroll', 'contribuții', 'impozit'],
    excerpt: 'Învață să calculezi corect salariul net în 2025: CAS, CASS, impozit, deduceri personale și beneficii cu exemple practice.',
    content: `## Formula de calcul

**Salariu net = Brut - CAS - CASS - Impozit**

### Contribuții 2025

| Contribuție | Cotă | Se plătește de |
|-------------|------|----------------|
| CAS | 25% | Angajat |
| CASS | 10% | Angajat |
| Impozit | 10% | Angajat |

### Baza de calcul impozit
Baza = Brut - CAS - CASS - Deducere personală

## Exemplu calcul complet

### Angajat: salariu brut 6,000 RON, 0 persoane în întreținere

\`\`\`
Brut:           6,000 RON
CAS (25%):     -1,500 RON
CASS (10%):      -600 RON
---
Bază impozit:   3,900 RON
Deducere pers.:  -270 RON (pentru 6,000 brut)
---
Bază impoz.:    3,630 RON
Impozit (10%):   -363 RON
---
NET:            3,537 RON
\`\`\`

### Cost total angajator
\`\`\`
Brut:           6,000 RON
CAM (2.25%):     +135 RON
---
Total:          6,135 RON
\`\`\`

## Deducerea personală 2025

### Tabel deduceri pentru brut între 3,301-5,200 RON
| Persoane | Deducere |
|----------|----------|
| 0 | 570 RON |
| 1 | 670 RON |
| 2 | 770 RON |
| 3 | 870 RON |
| 4+ | 970 RON |

### Pentru brut 5,201-10,000 RON
Deducerea se reduce proporțional.

### Pentru brut > 10,000 RON
Deducere = 0

## Beneficii și impozitare

### Neimpozabile
- Tichete de masă (până la plafonul legal)
- Abonament sport (400 RON/lună)
- Contribuție pensie privată (până la 400 EUR/an)

### Impozabile
- Bonusuri
- Prime
- Mașină de serviciu (pentru uz personal)

## Calculator Excel

Descarcă calculatorul nostru Excel pentru salariu net, disponibil gratuit pentru utilizatorii înregistrați.`
  },

  // Management articles
  {
    categorySlug: 'management-leadership',
    title: 'OKRs pentru Companii Românești: Ghid de Implementare',
    slug: 'okrs-companii-romanesti-implementare',
    authorName: 'Bogdan Marinescu',
    authorBio: 'Managing Partner, consultant strategie',
    readTime: 14,
    tags: ['OKRs', 'management', 'strategie', 'performanță'],
    excerpt: 'Cum să implementezi OKRs într-o companie românească: adaptări culturale, exemple practice și greșeli de evitat.',
    content: `## Ce sunt OKRs?

**Objectives and Key Results** este un framework de goal-setting folosit de Google, Intel, LinkedIn și mii de alte companii.

### Structura
- **Objective**: Ce vrem să realizăm (inspirațional)
- **Key Results**: Cum măsurăm succesul (metrici)

## Exemplu complet

### Objective
"Devenim lider de piață în segmentul IMM pentru software contabil"

### Key Results
1. KR1: Creștem baza de clienți de la 500 la 1,000
2. KR2: Scădem churn rate de la 5% la 2%
3. KR3: NPS crește de la 30 la 50
4. KR4: 80% din clienți recomandă activ produsul

## Implementare în 6 pași

### 1. Educație (Săptămâna 1-2)
- Training management
- Workshop echipe
- Q&A și clarificări

### 2. OKRs companie (Săptămâna 3)
- CEO + leadership team
- 3-5 OKRs la nivel de companie
- Quarterly focus

### 3. Cascadare (Săptămâna 4)
- Fiecare departament își setează OKRs
- Aliniament cu OKRs companie
- Review cross-functional

### 4. Scoring (Weekly)
- Check-in săptămânal
- Scor 0.0 - 1.0
- Roșu-galben-verde

### 5. Review (End of Quarter)
- Ce am realizat?
- De ce am/nu am reușit?
- Ce învățăm?

### 6. Iterație
- Ajustări pentru Q+1
- Îmbunătățiri proces

## Adaptări pentru România

### Ce funcționează
- Focus pe rezultate, nu activități
- Transparență (dacă cultura permite)
- Conexiune cu bonusuri (parțială)

### Ce necesită ajustări
- "Stretch goals" poate speria inițial
- Scoring sub 1.0 nu e "eșec" - necesită comunicare
- Start mic, apoi scalează

## Greșeli comune

1. **Prea multe OKRs** → Max 3-5/entitate
2. **KRs = activități** → Măsoară rezultate, nu efort
3. **Set and forget** → Review săptămânal!
4. **100% = succes** → 70% e bine pentru stretch goals
5. **Lipsa buy-in** → Training și comunicare!

## Tools recomandate

- Gratuit: Google Sheets cu template
- Plătit: Weekdone, Gtmhub, Perdoo
- Enterprise: Workboard, Betterworks`
  },

  // Antreprenoriat articles
  {
    categorySlug: 'antreprenoriat',
    title: 'Înființare SRL 2025: Ghid Pas cu Pas',
    slug: 'infiintare-srl-2025-ghid',
    authorName: 'Dan Moldovan',
    authorBio: 'Serial entrepreneur, 4 companii fondate',
    readTime: 15,
    tags: ['SRL', 'înființare firmă', 'antreprenoriat', 'start-up'],
    excerpt: 'Tot ce trebuie să știi pentru a înființa un SRL în România în 2025: documente, pași, costuri și sfaturi practice.',
    content: `## De ce SRL?

SRL (Societate cu Răspundere Limitată) este cea mai populară formă juridică în România pentru că:
- Răspundere limitată la aportul la capital
- Flexibilitate în structură
- Fiscalitate optimizabilă
- Credibilitate față de parteneri

## Pași pentru înființare

### 1. Alege numele și verifică disponibilitatea
- Verificare pe [portal.onrc.ro](https://portal.onrc.ro)
- Rezervare nume (valabilă 3 luni)
- Cost: 36 RON

### 2. Stabilește sediul social
Opțiuni:
- Proprietate proprie
- Contract de închiriere/comodat
- Sediu virtual (de la 50 RON/lună)

### 3. Redactează actul constitutiv
Conține:
- Date asociați
- Capital social (minim 1 RON)
- Aport asociați
- Administrator
- Obiect de activitate (coduri CAEN)

### 4. Depune cererea la ONRC
Documente necesare:
- Cerere înregistrare
- Act constitutiv (2 exemplare)
- Dovadă sediu
- Declarație pe propria răspundere
- Specimen semnătură administrator
- Copii CI asociați/administrator

### 5. Înregistrare fiscală
- Cerere înregistrare fiscală
- Opțiune impozit micro/profit
- Opțiune plătitor TVA (dacă e cazul)

## Costuri totale estimate

| Element | Cost |
|---------|------|
| Rezervare nume | 36 RON |
| Taxa ONRC | 200 RON |
| Publicare MO | 100 RON |
| Act constitutiv (avocat) | 200-500 RON |
| Sediu (dacă e cazul) | 50-200 RON |
| **TOTAL** | **~500-1,000 RON** |

## Timeline

- **Ziua 1**: Rezervare nume
- **Ziua 2-3**: Pregătire documente
- **Ziua 4**: Depunere ONRC
- **Ziua 7-10**: Obținere CUI
- **Ziua 10-15**: Activare ANAF

## După înființare

### Obligatoriu
- [ ] Deschide cont bancar
- [ ] Stabilește contabilitate
- [ ] Decide regim fiscal
- [ ] Înregistrare beneficiar real

### Recomandat
- [ ] Logo și identitate
- [ ] Website
- [ ] Email profesional
- [ ] Card de vizită

## Sfaturi practice

1. **Alege codurile CAEN corect** - Poți adăuga altele mai târziu, dar e mai simplu de la început
2. **Capital social realist** - 200-1,000 RON e suficient pentru început
3. **Administrator = asociat** - Simplifică lucrurile
4. **Contabil de la început** - Chiar dacă ai 0 activitate

## Resurse

- [ONRC Portal](https://portal.onrc.ro)
- [Ghid ANAF înregistrare](https://www.anaf.ro)
- Curs: [Antreprenoriat pentru Începători](/courses/antreprenoriat-incepatori)`
  },

  // Digitalizare articles
  {
    categorySlug: 'digitalizare',
    title: 'Transformare Digitală pentru IMM-uri: De Unde Începi?',
    slug: 'transformare-digitala-imm-start',
    authorName: 'George Ionescu',
    authorBio: 'CTO, consultant digitalizare',
    readTime: 11,
    tags: ['digitalizare', 'IMM', 'automatizare', 'ERP'],
    excerpt: 'Ghid practic pentru IMM-urile românești care vor să se digitalizeze: prioritizare, buget, implementare și ROI.',
    content: `## De ce digitalizare?

### Beneficii dovedite
- 40% reducere timp administrativ
- 30% mai puține erori
- Decizii bazate pe date, nu intuiție
- Scalabilitate fără proporțional mai mulți angajați

## Unde să începi

### Prioritatea 1: Contabilitate și facturare
- Impact mare, risc mic
- ROI vizibil rapid
- Obligatoriu pentru e-Factura

### Prioritatea 2: HR și payroll
- Eliminare erori calcul
- Conformitate REVISAL
- Self-service angajați

### Prioritatea 3: CRM și vânzări
- Urmărire pipeline
- Istoric clienți
- Forecast vânzări

### Prioritatea 4: Operațiuni
- Gestiune stocuri
- Planificare producție
- Supply chain

## Buget orientativ

### Microîntreprindere (1-9 angajați)
- Cloud accounting: 50-150 RON/lună
- E-facturare: gratuit - 100 RON/lună
- Total: 100-250 RON/lună

### Întreprindere mică (10-49 angajați)
- ERP simplu: 200-500 RON/lună
- HR/Payroll: 100-300 RON/lună
- CRM: 100-300 RON/lună
- Total: 400-1,100 RON/lună

### Întreprindere mijlocie (50-249 angajați)
- ERP complet: 1,000-3,000 RON/lună
- + implementare: 10,000-50,000 RON one-time
- Total: 1,500-5,000 RON/lună

## Pași de implementare

### 1. Audit curent (2 săptămâni)
- Ce procese avem?
- Unde sunt problemele?
- Ce date avem/ne lipsesc?

### 2. Selectare soluții (4 săptămâni)
- Identificare nevoi
- Demo-uri
- Comparație (preț, funcționalitate, suport)

### 3. Implementare pilot (4-8 săptămâni)
- Un departament/proces
- Training echipă
- Ajustări

### 4. Roll-out (8-12 săptămâni)
- Extindere la toată compania
- Migrare date
- Procese paralele (vechi + nou)

### 5. Optimizare (continuu)
- Feedback utilizatori
- Automatizări suplimentare
- Rapoarte și dashboards

## Greșeli de evitat

1. **"Totul odată"** → Implementare graduală
2. **"Cel mai ieftin"** → Cel mai potrivit pentru nevoi
3. **"IT se ocupă"** → Ownership business
4. **"Software rezolvă tot"** → Procesele contează mai mult
5. **"O dată și gata"** → Îmbunătățire continuă`
  },

  // SSM articles
  {
    categorySlug: 'ssm-compliance',
    title: 'GDPR pentru HR: Ghid Practic 2025',
    slug: 'gdpr-hr-ghid-practic-2025',
    authorName: 'Cristina Pavel',
    authorBio: 'DPO certificat, specialist protecție date',
    readTime: 13,
    tags: ['GDPR', 'HR', 'date personale', 'compliance'],
    excerpt: 'Tot ce trebuie să știe un departament HR despre GDPR: date procesate, baze legale, drepturi angajați și obligații.',
    content: `## GDPR și datele HR

Departamentul HR procesează cantități mari de date personale:
- Date identificare (nume, CNP, adresă)
- Date profesionale (CV, diplome)
- Date financiare (salariu, cont bancar)
- Date sensibile (medical, apartenență sindicală)

## Baze legale pentru procesare HR

### 1. Contract de muncă (Art. 6(1)(b))
Permite procesarea necesară pentru:
- Administrare personal
- Calcul salariu
- Evidență concedii

### 2. Obligație legală (Art. 6(1)(c))
Obligatoriu pentru:
- REVISAL
- Declarații fiscale
- Raportări ITM

### 3. Interes legitim (Art. 6(1)(f))
Poate justifica:
- Monitorizare email (cu limite!)
- Referințe de la angajatori anteriori
- Directoare interne

### 4. Consimțământ (Art. 6(1)(a))
Necesar pentru:
- Poze pe website/materiale
- Utilizare date după încetare contract
- Transmitere către terți (non-obligatoriu)

## Drepturi angajați (ca persoane vizate)

1. **Informare** - Politică de confidențialitate
2. **Acces** - Copie date pe cerere
3. **Rectificare** - Corectare date incorecte
4. **Ștergere** - Cu limitări legale (arhivare obligatorie)
5. **Restricție** - În anumite situații
6. **Portabilitate** - Pentru angajații care pleacă
7. **Opoziție** - La marketing, profiling

## Obligații HR

### Documentare
- [ ] Registru de procesare (Art. 30)
- [ ] Politică confidențialitate angajați
- [ ] Proceduri pentru exercitare drepturi
- [ ] Contract DPO (dacă e cazul)

### Securitate
- [ ] Acces restricționat la dosare
- [ ] Criptare date electronice
- [ ] Backup și recovery
- [ ] Training angajați

### Transparență
- [ ] Informare la angajare
- [ ] Actualizare la schimbări
- [ ] Răspuns la cereri (max 30 zile)

## Perioade de retenție recomandate

| Tip document | Retenție |
|--------------|----------|
| Dosar personal | 75 ani |
| State de plată | 50 ani |
| Pontaje | 5 ani |
| CV-uri neselectate | 6 luni |
| Evaluări | 5 ani |

## Sancțiuni GDPR

- Până la 20 mil EUR sau 4% din cifra de afaceri globală
- Avertismente
- Ordin de conformare
- Răspundere civilă față de angajați

## Checklist conformitate HR

- [ ] Politică de confidențialitate
- [ ] Registru de procesare
- [ ] Informare angajați (semnată)
- [ ] Procedură drepturi
- [ ] Măsuri tehnice securitate
- [ ] Contract procesare date (servicii externalizate)
- [ ] Training periodic echipa HR`
  },

  // Excel articles
  {
    categorySlug: 'excel-productivitate',
    title: '10 Scurtături Excel pe Care Trebuie să le Știi',
    slug: '10-scurtaturi-excel-trebuie',
    authorName: 'Alexandru Radu',
    authorBio: 'Excel trainer, Microsoft MVP',
    readTime: 8,
    tags: ['Excel', 'scurtături', 'productivitate', 'tips'],
    excerpt: 'Cele mai utile scurtături de tastatură în Excel care îți pot economisi ore întregi de lucru în fiecare săptămână.',
    content: `## Top 10 Scurtături Excel

### 1. Ctrl + ; (data curentă)
Inserează data de azi instant. Perfect pentru timestamp-uri.

### 2. Ctrl + Shift + : (ora curentă)
Inserează ora curentă.

### 3. Ctrl + D (copiază în jos)
Copiază celula de sus în selecția curentă. Mai rapid decât copy-paste.

### 4. Ctrl + R (copiază la dreapta)
Similar, dar pe orizontală.

### 5. Ctrl + ' (copiază formula de sus)
Copiază FORMULA (nu valoarea) din celula de deasupra. Super util!

### 6. F4 (comută referințe)
Apasă F4 pentru a comuta între:
- A1 → $A$1 → A$1 → $A1 → A1

### 7. Ctrl + Shift + L (activează filtre)
Toggle filtre pe selecția curentă.

### 8. Alt + = (AutoSum)
Inserează funcția SUM cu selecție automată a intervalului.

### 9. Ctrl + Page Up/Down (schimbă foi)
Navighează rapid între worksheet-uri.

### 10. Ctrl + Home/End
- Home: Salt la A1
- End: Salt la ultima celulă cu date

## Bonus: Combinații avansate

### Ctrl + Shift + End
Selectează de la celula curentă până la ultima celulă cu date.

### Ctrl + Space / Shift + Space
- Ctrl + Space: Selectează coloana
- Shift + Space: Selectează rândul

### Ctrl + - / Ctrl + +
- Minus: Șterge rânduri/coloane
- Plus: Inserează rânduri/coloane

### F2
Editează celula curentă (intră în modul editare).

### Ctrl + \` (backtick)
Toggle între afișare valori și formule.

## Exercițiu

Încearcă să petreci o zi întreagă folosind doar tastatura (fără mouse). Vei fi surprins cât de rapid devii!

## Descarcă cheat sheet

Avem un PDF cu toate scurtăturile Excel - disponibil gratuit în contul tău.`
  },
  {
    categorySlug: 'excel-productivitate',
    title: 'Pivot Tables: De la Zero la Expert în 30 de Minute',
    slug: 'pivot-tables-zero-expert-30-minute',
    authorName: 'Ioana Munteanu',
    authorBio: 'Data Analyst, trainer Excel',
    readTime: 10,
    tags: ['Excel', 'Pivot Tables', 'analiză date', 'rapoarte'],
    excerpt: 'Ghid rapid pentru a stăpâni Pivot Tables în Excel: de la crearea primului pivot până la tehnici avansate.',
    content: `## Ce este un Pivot Table?

Un Pivot Table este un instrument care:
- Sumarizează date mari instant
- Permite reorganizare prin drag & drop
- Calculează totaluri, medii, procente automat
- Actualizează la un click

## Când să folosești Pivot Tables

✅ **Folosește când:**
- Ai 100+ rânduri de date
- Vrei să vezi totaluri pe categorii
- Trebuie să compari perioade
- Faci rapoarte recurente

❌ **Nu ai nevoie când:**
- Date simple (10-20 rânduri)
- Calcule one-time
- Formatare specială necesară

## Crearea primului Pivot

### Pasul 1: Pregătește datele
- Prima linie = headers
- Fără rânduri goale
- Date consistente pe coloane

### Pasul 2: Selectează și inserează
1. Selectează toate datele (Ctrl+A dacă tabel)
2. Insert → PivotTable
3. Alege locația (new sheet recomandat)
4. OK

### Pasul 3: Configurează
Trage câmpuri în zone:
- **Rows**: Ce apare pe rânduri (ex: Regiune)
- **Columns**: Ce apare pe coloane (ex: Luna)
- **Values**: Ce se calculează (ex: Sum of Vânzări)
- **Filters**: Filtre globale (ex: An)

## Tehnici intermediare

### Schimbă funcția de sumarizare
Click dreapta pe valoare → Value Field Settings
- Sum (implicit pentru numere)
- Count (pentru a număra)
- Average (medie)
- Max/Min

### Show Values As (procente, etc.)
- % of Grand Total
- % of Column Total
- Running Total
- Difference From

### Grupare date
Click dreapta pe dată → Group → Months/Quarters/Years

### Filtrare rapidă
Click pe dropdown din Row/Column Labels

## Tehnici avansate

### Câmpuri calculate
PivotTable Analyze → Fields, Items & Sets → Calculated Field

Exemplu: Marjă = Vânzări - Cost

### Slicers (filtre vizuale)
Insert → Slicer → selectează câmpuri

Butoane interactive pentru filtrare!

### Pivot Chart
Insert → PivotChart

Grafic conectat la Pivot - se actualizează împreună.

## Sfaturi pro

1. **Refresh datele** - Click dreapta → Refresh (sau Ctrl+Alt+F5)
2. **Păstrează formatarea** - PivotTable Options → uncheck "Autofit"
3. **Sortează smart** - Click pe valoare → Sort Largest to Smallest
4. **Drill down** - Dublu-click pe orice valoare pentru detalii

## Exercițiu

Creează un Pivot Table care arată:
- Vânzările pe regiuni (rows)
- Defalcate pe luni (columns)
- Cu filtru pe an (filter)
- Incluzând % din total

Timp estimat: 5 minute după ce ai exersat!`
  },

  // Finanțare articles
  {
    categorySlug: 'finantare-fonduri',
    title: 'PNRR 2025: Ghid Complet pentru IMM-uri',
    slug: 'pnrr-2025-ghid-complet-imm',
    authorName: 'Cristian Bogdan',
    authorBio: 'Consultant fonduri europene, 50+ proiecte aprobate',
    readTime: 18,
    tags: ['PNRR', 'fonduri europene', 'IMM', 'finanțare'],
    excerpt: 'Tot ce trebuie să știi despre finanțările PNRR disponibile pentru IMM-uri în 2025: componente, eligibilitate, buget și sfaturi.',
    content: `## Ce este PNRR?

Planul Național de Redresare și Reziliență (PNRR) este programul UE de 29.2 miliarde EUR pentru România (14.2 mld granturi + 15 mld împrumuturi).

## Componente relevante pentru IMM-uri

### C3: Managementul deșeurilor
- Economie circulară
- Reciclare și valorificare
- Buget: 1.2 mld EUR

### C6: Energie
- Eficiență energetică
- Panouri fotovoltaice
- Buget: 1.6 mld EUR

### C9: Suport pentru sectorul privat
- Digitalizare IMM-uri
- Investiții productive
- Buget: 0.5 mld EUR

### C10: Fond local
- Microîntreprinderi în mediul rural
- Buget: regional

## Eligibilitate generală

### Cine poate aplica
- SRL, SA, alte forme juridice
- Minimum 1 an de activitate
- Situație fiscală OK
- Capacitate de cofinanțare

### Cine NU poate aplica
- Firme în insolvență/faliment
- Datorii la buget
- Firme cu activitate în domenii excluse
- Antecedente de fraudă

## Pregătire aplicație

### Documente necesare
1. Plan de afaceri (template specific!)
2. Situații financiare 3 ani
3. Certificat constatator ONRC
4. Certificate fiscale (ANAF + local)
5. Documente proprietate/sediu
6. CV-uri echipă management
7. Studiu fezabilitate (pentru investiții mari)

### Timeline tipică
- Pregătire: 1-3 luni
- Evaluare: 2-4 luni
- Contractare: 1-2 luni
- Implementare: 6-24 luni

## Rata de succes

### Ce crește șansele
- Plan de afaceri realist
- Experiență în domeniu
- Istoric financiar solid
- Cofinanțare asigurată
- Proiect clar și măsurabil

### Ce scade șansele
- Proiect vag sau prea ambițios
- Buget supraevaluat
- Documente incomplete
- Termene ratate

## Costuri implicate

### Pregătire
- Consultant: 2,000 - 10,000 EUR
- Studii tehnice: 1,000 - 5,000 EUR

### Cofinanțare
- Tipic 10-50% din valoarea proiectului
- Trebuie demonstrată la aplicare

### Post-aprobare
- Management proiect
- Raportări periodice
- Audit final

## Sfaturi practice

1. **Începe din timp** - 3+ luni înainte de deadline
2. **Angajează consultant experimentat** - ROI pozitiv
3. **Fii realist** - Buget și timeline
4. **Documentează tot** - De la început
5. **Pregătește cash flow** - Rambursările vin cu întârziere
6. **Citește ghidul solicitantului** - Integral, de 2 ori

## Resurse

- [mfe.gov.ro](https://mfe.gov.ro) - Site oficial
- [MySmis](https://mysmis.gov.ro) - Platformă depunere
- Curs: [Accesare Fonduri Europene](/courses/fonduri-europene)`
  },

  // Actualitate articles
  {
    categorySlug: 'actualitate',
    title: 'Noutăți Legislative Ianuarie 2025: Ce Trebuie să Știi',
    slug: 'noutati-legislative-ianuarie-2025',
    authorName: 'Echipa DocumentIulia',
    authorBio: 'Redacția DocumentIulia.ro',
    readTime: 7,
    tags: ['legislație', 'noutăți', '2025', 'fiscal'],
    excerpt: 'Sumar al principalelor modificări legislative intrate în vigoare în ianuarie 2025: fiscal, muncă, contabilitate.',
    content: `## Fiscal

### Salariu minim: 3,300 RON
De la 1 ianuarie 2025:
- Brut: 3,300 RON (+10% față de 2024)
- Net: ~2,100 RON
- Cost angajator: ~4,100 RON

### Modificări Cod Fiscal
- Pregătire pentru TVA 21%/11% (din august)
- Clarificări e-Factura B2B
- Ajustări deduceri personale

## Muncă

### Codul Muncii
- Clarificări telemuncă
- Noi obligații anti-hărțuire
- Flexibilizare concediu parental

### REVISAL
- Noi câmpuri obligatorii
- Termene actualizate

## Contabilitate

### SAF-T
- Extindere obligativitate
- Noi validări

### Situații financiare
- Termen: 28 februarie 2025 pentru exercițiul 2024

## SSM

### Instructaje
- Noi cerințe documentare
- Actualizări tematici obligatorii

## Ce urmează în 2025

| Dată | Schimbare |
|------|-----------|
| 1 februarie | Deadline D112 ianuarie |
| 28 februarie | Situații financiare 2024 |
| 1 august | TVA 21%/11% |
| Iulie 2026 | e-Factura B2B obligatoriu |

## Acțiuni recomandate

1. ✅ Actualizează grila salarială
2. ✅ Verifică software pentru noi raportări
3. ✅ Planifică închiderea 2024
4. ⏳ Pregătește-te pentru TVA nou
5. ⏳ Testează e-Factura B2B

---

*Abonează-te la newsletter pentru actualizări săptămânale!*`
  }
];
