/**
 * Sprint 25 - Business Formation LMS Courses
 * 5 comprehensive courses on starting a business in Romania
 */

export const businessFormationCourses = [
  // Course 1: Complete Guide to Starting a Business
  {
    slug: 'ghid-complet-infiintare-afacere-romania',
    title: 'Ghid Complet: Înființarea unei Afaceri în România',
    description: 'Tot ce trebuie să știi pentru a-ți lansa afacerea în România. De la idee la înregistrare, acoperim fiecare pas al procesului.',
    category: 'BUSINESS',
    level: 'BEGINNER',
    duration: 180,
    price: 0,
    isFree: true,
    language: 'ro',
    tags: ['înființare firmă', 'antreprenoriat', 'startup', 'România', 'ONRC'],
    modules: [
      {
        title: 'Introducere în Antreprenoriat',
        description: 'Fundamentele antreprenoriatului și pregătirea pentru lansarea afacerii',
        order: 1,
        duration: 30,
        lessons: [
          {
            title: 'De Ce Să Devii Antreprenor?',
            type: 'VIDEO',
            duration: 10,
            order: 1,
            content: `# De Ce Să Devii Antreprenor?

## Introducere

Antreprenoriatul reprezintă una dintre cele mai provocatoare dar și satisfăcătoare căi profesionale. În România, ecosistemul antreprenorial a crescut semnificativ în ultimii ani.

## Avantajele Antreprenoriatului

### 1. Independență și Flexibilitate
- Ești propriul tău șef
- Stabilești propriul program
- Alegi proiectele și clienții

### 2. Potențial Financiar Nelimitat
- Venitul nu este plafonat
- Construiești valoare pe termen lung
- Posibilitatea de exit (vânzare afacere)

### 3. Impact și Satisfacție
- Creezi locuri de muncă
- Rezolvi probleme reale
- Lași o moștenire

## Provocările Antreprenoriatului

- **Risc financiar**: Investiție personală necesară
- **Incertitudine**: Venituri variabile, mai ales la început
- **Responsabilitate totală**: Toate deciziile îți aparțin
- **Work-life balance**: Poate fi dificil de menținut

## Statistici România 2025

- Peste 1.2 milioane de companii active
- 45.000+ firme noi înregistrate anual
- Rata de supraviețuire la 5 ani: 52%
- Sectoare în creștere: IT, e-commerce, servicii

## Ești Pregătit?

Întreabă-te:
1. Ai o idee sau pasiune puternică?
2. Poți gestiona incertitudinea?
3. Ai economii pentru 6-12 luni?
4. Ești dispus să înveți continuu?

> "Cel mai mare risc este să nu riști nimic." - Mark Zuckerberg`
          },
          {
            title: 'Validarea Ideii de Afaceri',
            type: 'TEXT',
            duration: 12,
            order: 2,
            content: `# Validarea Ideii de Afaceri

## De Ce Este Importantă Validarea?

90% dintre startup-uri eșuează. Motivul #1? Lipsa cererii pe piață. Validarea te ajută să eviți această greșeală costisitoare.

## Metode de Validare

### 1. Cercetarea Pieței

**Analiza competiției:**
- Cine sunt competitorii direcți?
- Ce fac bine? Ce fac prost?
- Care este diferențiatorul tău?

**Dimensiunea pieței:**
- TAM (Total Addressable Market)
- SAM (Serviceable Addressable Market)
- SOM (Serviceable Obtainable Market)

### 2. Interviuri cu Potențiali Clienți

**Reguli pentru interviuri:**
- Vorbește cu minim 20-30 persoane
- Nu vinde, doar ascultă
- Întreabă despre probleme, nu soluții
- Înregistrează și analizează răspunsurile

**Întrebări cheie:**
- Care este cea mai mare provocare în [domeniu]?
- Cum rezolvi acum această problemă?
- Cât plătești pentru soluția actuală?
- Ce te-ar convinge să schimbi?

### 3. MVP (Minimum Viable Product)

**Tipuri de MVP:**
- Landing page cu înscrieri
- Prototip sau mockup
- Serviciu manual (Wizard of Oz)
- Video demonstrativ

**Metrici de urmărit:**
- Rata de conversie (înscrieri/vizite)
- Timp petrecut pe pagină
- Feedback calitativ
- Pre-comenzi sau plăți

### 4. Testul Fumului (Smoke Test)

Creează o pagină de vânzare pentru un produs care nu există încă:
1. Descrie beneficiile
2. Pune un preț
3. Buton "Cumpără acum"
4. Măsoară câți dau click

## Criterii de Validare

Ideea ta este validată dacă:
- ✅ 40%+ din intervievați au problema
- ✅ 10%+ ar plăti pentru soluție
- ✅ Rata de conversie landing page > 5%
- ✅ Ai obținut pre-comenzi

## Exercițiu Practic

Completează acest canvas:

| Element | Răspuns |
|---------|---------|
| Problema | |
| Soluția | |
| Clientul ideal | |
| Competitori | |
| Diferențiator | |
| Model de venit | |`
          },
          {
            title: 'Planificarea Financiară Inițială',
            type: 'TEXT',
            duration: 8,
            order: 3,
            content: `# Planificarea Financiară Inițială

## Cât Costă Să Începi o Afacere în România?

### Costuri de Înființare

| Element | Cost Estimat |
|---------|--------------|
| Înregistrare ONRC | €100-500 |
| Contabilitate (primul an) | €600-2.400 |
| Sediu social | €0-600/an |
| Echipamente | €500-5.000+ |
| Website | €300-2.000 |
| Marketing inițial | €500-2.000 |
| **TOTAL MINIM** | **€2.000-5.000** |

### Fond de Rulment

Recomandare: Economii pentru 6-12 luni de cheltuieli:
- Salarii (dacă ai angajați)
- Chirie și utilități
- Abonamente și licențe
- Marketing continuu
- Rezervă neprevăzute (10-20%)

## Surse de Finanțare

### 1. Bootstrapping (Fonduri Proprii)
- ✅ Control total
- ✅ Fără datorii
- ❌ Creștere mai lentă

### 2. Familie și Prieteni
- ✅ Condiții flexibile
- ❌ Risc relațional

### 3. Credite Bancare
- IMM Invest (garantat de stat)
- Credite pentru start-up-uri
- Dobânzi: 5-12%/an

### 4. Fonduri Europene
- Start-Up Nation (până la 200.000 RON)
- POC - Competitivitate
- PNRR - Digitalizare

### 5. Investitori
- Business Angels
- Fonduri VC (pentru scale-ups)

## Break-even Analysis

Formula:
\`\`\`
Punct de echilibru = Costuri Fixe / (Preț - Cost Variabil)
\`\`\`

Exemplu:
- Costuri fixe lunare: 5.000 RON
- Preț produs: 200 RON
- Cost variabil/produs: 50 RON
- Break-even: 5.000 / (200-50) = 34 produse/lună`
          }
        ]
      },
      {
        title: 'Alegerea Formei Juridice',
        description: 'Cum să alegi între SRL, PFA și alte forme juridice',
        order: 2,
        duration: 45,
        lessons: [
          {
            title: 'SRL - Societate cu Răspundere Limitată',
            type: 'TEXT',
            duration: 15,
            order: 1,
            content: `# SRL - Societate cu Răspundere Limitată

## Ce Este un SRL?

SRL-ul este cea mai populară formă juridică în România, reprezentând peste 90% din companiile înregistrate.

## Caracteristici Principale

### Avantaje
- **Răspundere limitată**: Patrimoniul personal este protejat
- **Credibilitate**: Mai multă încredere din partea clienților/partenerilor
- **Flexibilitate fiscală**: Alegere între micro și profit
- **Scalabilitate**: Poți avea asociați și angajați nelimitat

### Dezavantaje
- Procedură mai complexă de înființare
- Costuri contabile mai mari
- Obligații de raportare

## Cerințe Legale

| Cerință | Detalii |
|---------|---------|
| Capital social | Minim 1 RON |
| Asociați | 1-50 persoane |
| Administrator | Minim 1, poate fi asociat sau terț |
| Sediu social | Obligatoriu, poate fi virtual |

## Regim Fiscal

### Microîntreprindere (recomandată la început)
- Condiții: Venituri < 500.000 EUR/an
- Impozit: 1% (cu angajați) sau 3% (fără)
- Avantaj: Simplu, predictibil

### Impozit pe Profit
- Impozit: 16% din profit
- Avantaj: Deduci toate cheltuielile
- Recomandat: Marje de profit mici sau pierderi

## Pași pentru Înființare

1. Rezervare denumire la ONRC
2. Pregătire act constitutiv
3. Deschidere cont bancar + depunere capital
4. Obținere specimen semnătură
5. Depunere dosar ONRC
6. Primire CUI și certificat

## Costuri Estimative

| Serviciu | Cost |
|----------|------|
| Pachet Basic DocumentIulia | €199 |
| Pachet Premium (tot inclus) | €499 |
| Taxe stat | ~€30-50 |`
          },
          {
            title: 'PFA - Persoană Fizică Autorizată',
            type: 'TEXT',
            duration: 12,
            order: 2,
            content: `# PFA - Persoană Fizică Autorizată

## Ce Este un PFA?

PFA este o formă simplificată de a desfășura activități economice ca persoană fizică, ideală pentru freelanceri.

## Caracteristici

### Avantaje
- ✅ Procedură simplă de înregistrare
- ✅ Fără capital social
- ✅ Contabilitate simplificată
- ✅ Costuri reduse de mentenanță

### Dezavantaje
- ❌ Răspundere nelimitată (patrimoniul personal)
- ❌ Nu poți avea angajați
- ❌ Credibilitate mai redusă pentru contracte mari
- ❌ Limitări la anumite activități

## Taxe și Contribuții 2025

| Contribuție | Procent | Condiție |
|-------------|---------|----------|
| Impozit pe venit | 10% | Din venitul net |
| CAS (pensie) | 25% | Dacă venit > 12 salarii minime |
| CASS (sănătate) | 10% | Dacă venit > 6 salarii minime |

## Ideal Pentru

- Programatori și IT-iști
- Designeri și creativi
- Consultanți
- Traducători
- Activități secundare (part-time)

## PFA vs SRL - Comparație Rapidă

| Aspect | PFA | SRL |
|--------|-----|-----|
| Răspundere | Nelimitată | Limitată |
| Capital | 0 | 1 RON+ |
| Angajați | Nu | Da |
| Contabilitate | Simplificată | Completă |
| Credibilitate | Medie | Ridicată |
| Cost înființare | €99-149 | €199-499 |`
          },
          {
            title: 'Alte Forme Juridice',
            type: 'TEXT',
            duration: 10,
            order: 3,
            content: `# Alte Forme Juridice

## Întreprindere Individuală (II)

Similar cu PFA dar poate avea angajați (max 8).

**Când să alegi II:**
- Activități artizanale sau meșteșugărești
- Ai nevoie de 1-2 ajutoare
- Vrei flexibilitate PFA dar cu angajați

## Societate pe Acțiuni (SA)

Pentru afaceri mari cu capital semnificativ.

**Caracteristici:**
- Capital minim: 90.000 RON
- Minim 2 acționari
- Consiliu de administrație
- Posibilitate listare la bursă

**Când să alegi SA:**
- Planifici să atragi investitori
- Afacere cu capital mare
- Vizezi IPO sau exit

## ONG / Asociație / Fundație

Pentru activități non-profit.

**Diferențe:**
- Asociație: min 3 membri
- Fundație: bazată pe patrimoniu (min 100 salarii minime)

**Avantaje:**
- Scutiri fiscale
- Poate primi donații și sponsorizări
- Statut de utilitate publică

## Tabel Comparativ Complet

| Formă | Capital Min | Răspundere | Angajați | Complexitate |
|-------|-------------|------------|----------|--------------|
| PFA | 0 | Nelimitată | Nu | Foarte mică |
| II | 0 | Nelimitată | Max 8 | Mică |
| SRL | 1 RON | Limitată | Da | Medie |
| SA | 90.000 RON | Limitată | Da | Mare |
| ONG | Patrimoniu | Limitată | Da | Medie |

## Recomandări per Situație

- **Freelancer solo** → PFA
- **Freelancer + ajutoare** → II sau SRL
- **Start-up tech** → SRL (poate deveni SA)
- **Afacere tradițională** → SRL
- **Cu investitori de la început** → SA
- **Activități sociale** → ONG/Asociație`
          },
          {
            title: 'Quiz: Ce Formă Juridică Ți Se Potrivește?',
            type: 'QUIZ',
            duration: 8,
            order: 4,
            content: `# Quiz: Alegerea Formei Juridice

## Răspunde la întrebări pentru a descoperi ce formă juridică ți se potrivește.

### Întrebarea 1
Vei lucra singur sau vei avea parteneri/angajați?

- A) Singur, fără angajați
- B) Singur, dar poate 1-2 ajutoare ocazional
- C) Cu parteneri și/sau angajați de la început

### Întrebarea 2
Cât de important este să îți protejezi patrimoniul personal?

- A) Nu îmi fac griji, risc scăzut
- B) Moderat important
- C) Foarte important, vreau separare totală

### Întrebarea 3
Ce buget ai pentru înființare și mentenanță anuală?

- A) Minim posibil (sub €500/an)
- B) Moderat (€500-2000/an)
- C) Confortabil (peste €2000/an)

### Întrebarea 4
Vei lucra cu clienți corporativi mari?

- A) Nu, mai ales persoane fizice sau afaceri mici
- B) Ocazional
- C) Da, exclusiv sau majoritar

### Întrebarea 5
Planifici să atragi investitori în următorii 2-3 ani?

- A) Nu
- B) Poate
- C) Da, sigur

---

## Rezultate:

**Majoritate A**: PFA sau II
**Majoritate B**: SRL
**Majoritate C**: SRL sau SA

Recomandare: Consultă un specialist pentru decizia finală.`
          }
        ]
      },
      {
        title: 'Procesul de Înregistrare',
        description: 'Pașii practici pentru înregistrarea firmei',
        order: 3,
        duration: 50,
        lessons: [
          {
            title: 'Documentele Necesare',
            type: 'TEXT',
            duration: 15,
            order: 1,
            content: `# Documentele Necesare pentru Înființare SRL

## Documente Obligatorii

### 1. Act Constitutiv
Document fundamental care stabilește:
- Denumirea și sediul societății
- Obiectul de activitate (coduri CAEN)
- Capitalul social și aportul fiecărui asociat
- Administratorul și puterile sale
- Durata societății

**Tip**: Poate fi sub semnătură privată sau autentificat.

### 2. Dovada Sediului Social

Opțiuni:
- **Contract de închiriere** (înregistrat la ANAF)
- **Contract de comodat** (împrumut gratuit)
- **Act de proprietate** + acord de folosință
- **Sediu virtual** (de la furnizori autorizați)

### 3. Documente de Identitate
- Copii CI/pașaport pentru toți asociații
- Copie CI pentru administrator (dacă diferit)

### 4. Specimen de Semnătură
Pentru administrator - se dă la notar sau la ONRC.

### 5. Declarații pe Proprie Răspundere
- Administrator: că îndeplinește condițiile legale
- Asociați: cazier fiscal curat

### 6. Rezervare Denumire
- Certificat de la ONRC
- Valabil 3 luni

## Documente Suplimentare (dacă e cazul)

- **Autorizații speciale** pentru anumite activități
- **Avize** (pompieri, mediu, sanitar)
- **Traduceri legalizate** pentru asociați străini

## Checklist Pregătire

- [ ] Ai ales denumirea și verificat disponibilitatea?
- [ ] Ai stabilit cine sunt asociații și administrator?
- [ ] Ai stabilit capitalul social și aporturile?
- [ ] Ai stabilit codurile CAEN?
- [ ] Ai rezolvat sediul social?
- [ ] Ai pregătit copiile după CI?

## Sfaturi Practice

1. **Denumirea**: Verifică pe portal.onrc.ro înainte
2. **CAEN**: Include toate activitățile posibile de la început
3. **Capital**: Minim 1 RON, dar poți pune mai mult
4. **Sediu**: Asigură-te că proprietarul e de acord`
          },
          {
            title: 'Procedura la ONRC',
            type: 'TEXT',
            duration: 12,
            order: 2,
            content: `# Procedura la ONRC

## Pașii de Urmat

### Pasul 1: Rezervare Denumire (Online/Fizic)

**Online:**
1. Accesează portal.onrc.ro
2. Verifică disponibilitatea numelui
3. Depune cerere de rezervare
4. Plătește taxa (~36 RON)
5. Primești dovada rezervării

**La ghișeu:**
- Mergi la ONRC local
- Completezi cererea
- Primești rezervarea pe loc

### Pasul 2: Pregătire Dosar

Compilează toate documentele:
- Cerere de înregistrare
- Act constitutiv (2 exemplare)
- Dovadă sediu social
- Copii CI
- Specimen semnătură
- Declarații

### Pasul 3: Depunere Dosar

**Metode:**
- **Online**: portal.onrc.ro (necesită semnătură electronică)
- **Fizic**: La ghișeul ONRC din județul sediului
- **Poștă/Curier**: Cu confirmare de primire

### Pasul 4: Verificare și Aprobare

- ONRC verifică documentele (1-3 zile)
- Poate cere completări
- Emite încheierea de înregistrare

### Pasul 5: Primire Documente

După aprobare primești:
- **Certificat de înregistrare** (cu CUI)
- **Certificat constatator**
- **Act constitutiv vizat**

## Taxe ONRC 2025

| Serviciu | Cost |
|----------|------|
| Rezervare denumire | ~36 RON |
| Înregistrare SRL | ~100-150 RON |
| Total taxe stat | ~150 RON |

## Timp Estimat

| Metodă | Durată |
|--------|--------|
| Online (premium) | 1-3 zile |
| La ghișeu | 3-5 zile |
| Standard | 5-7 zile |

## Erori Frecvente de Evitat

❌ Denumire similară cu una existentă
❌ CAEN incompatibil cu sediul
❌ Documente incomplete sau ilizibile
❌ Semnături lipsă
❌ Adresă sediu incorectă`
          },
          {
            title: 'Înregistrarea la ANAF',
            type: 'TEXT',
            duration: 10,
            order: 3,
            content: `# Înregistrarea la ANAF

## Ce Se Întâmplă Automat

La înregistrarea la ONRC, firma este înregistrată automat și la ANAF, primind:
- **CUI** (Cod Unic de Identificare) = CIF fiscal
- **Înregistrare ca plătitor de impozit**

## Declarații Necesare (Primele 30 Zile)

### 1. Declarația 010 - Vectorul Fiscal
Stabilește obligațiile fiscale:
- Tipul de impozit (micro sau profit)
- Periodicitatea declarațiilor
- Înregistrare în scopuri de TVA (opțional sub 300k RON)

### 2. Alegerea Regimului Fiscal

**Microîntreprindere** (recomandat la start):
- Impozit 1% sau 3% din venituri
- Declarații trimestriale
- Simplitate administrativă

**Impozit pe profit**:
- 16% din profit
- Declarații trimestriale
- Mai complex, dar deduci toate cheltuielile

### 3. Înregistrare în Scopuri de TVA

**Când devine obligatorie:**
- Venituri > 300.000 RON/an

**Când este opțională:**
- Furnizori cu TVA (pentru deducere)
- Clienți care vor factură cu TVA

## Portal ANAF (SPV)

Înregistrează-te pe:
- **e-guvernare.ro** pentru acces SPV
- **anaf.ro** pentru depunere declarații

## Primele Obligații Fiscale

| Termen | Obligație |
|--------|-----------|
| 30 zile | Declarația 010 |
| Trimestrial | Declarație impozit micro/profit |
| Lunar (dacă TVA) | Declarație 300 |
| Anual | Situații financiare |

## Sfaturi

1. Colaborează cu un contabil de la început
2. Setează remindere pentru declarații
3. Păstrează toate facturile și documentele
4. Folosește un soft de contabilitate (ex: DocumentIulia.ro)`
          },
          {
            title: 'După Înregistrare - Primii Pași',
            type: 'TEXT',
            duration: 13,
            order: 4,
            content: `# Primii Pași După Înregistrare

## Checklist Post-Înregistrare

### Săptămâna 1

- [ ] **Deschide cont bancar business**
  - Alege o bancă cu comisioane mici pentru start-up
  - Documente: CUI, act constitutiv, CI administrator

- [ ] **Angajează un contabil**
  - Contabilitate internă sau externalizată
  - Buget: 100-300 EUR/lună

- [ ] **Înregistrează-te pe SPV (ANAF)**
  - Portal pentru declarații electronice
  - Obligatoriu pentru comunicare cu ANAF

### Săptămâna 2

- [ ] **Configurează facturarea**
  - Alegere soft de facturare
  - Înregistrare e-Factura (dacă B2B)

- [ ] **Stabilește procesele interne**
  - Workflow pentru vânzări
  - Gestionare documente
  - Backup și arhivare

- [ ] **Creează identitatea vizuală**
  - Logo
  - Cărți de vizită
  - Antet documente

### Luna 1

- [ ] **Website și prezență online**
  - Minim o pagină de prezentare
  - Google Business Profile
  - Social media relevante

- [ ] **Primii clienți**
  - Activează rețeaua personală
  - Lansează primele campanii

- [ ] **Sistemele de evidență**
  - CRM pentru clienți
  - Evidență venituri/cheltuieli
  - Documente organizate

## Greșeli de Evitat

❌ **Nu amesteca banii personali cu cei ai firmei**
Folosește exclusiv contul firmei pentru afacere.

❌ **Nu ignora obligațiile fiscale**
O întârziere = penalități și dobânzi.

❌ **Nu economisi la contabilitate**
Un contabil bun te scutește de probleme.

❌ **Nu uita de asigurări**
RCA profesional, asigurare sediu, etc.

## Resurse Utile

- **portal.onrc.ro** - Verificări și acte
- **anaf.ro/spv** - Declarații fiscale
- **efactura.mfinante.gov.ro** - e-Factura
- **revisal.ro** - Registrul salariaților`
          }
        ]
      },
      {
        title: 'Concluzii și Resurse',
        description: 'Recapitulare și resurse adiționale',
        order: 4,
        duration: 20,
        lessons: [
          {
            title: 'Recapitulare și Pașii Următori',
            type: 'TEXT',
            duration: 10,
            order: 1,
            content: `# Recapitulare - Înființarea Afacerii

## Ce Ai Învățat

### Modul 1: Introducere
- Avantajele și provocările antreprenoriatului
- Cum să validezi o idee de afaceri
- Planificarea financiară inițială

### Modul 2: Forme Juridice
- SRL - cea mai populară opțiune
- PFA - pentru freelanceri
- Alte forme: II, SA, ONG

### Modul 3: Procesul de Înregistrare
- Documentele necesare
- Procedura ONRC
- Înregistrarea la ANAF
- Primii pași după înființare

## Plan de Acțiune

### Dacă nu ai încă o idee:
1. Identifică problemele din jurul tău
2. Vorbește cu potențiali clienți
3. Validează înainte de a investi

### Dacă ai o idee validată:
1. Alege forma juridică (SRL recomandat)
2. Pregătește documentele
3. Înregistrează firma
4. Începe să vinzi!

## Următorii Pași cu DocumentIulia.ro

1. **Servicii de înființare** - [/services/infiintare-srl](/services/infiintare-srl)
2. **Șabloane documente** - [/templates](/templates)
3. **Platformă contabilitate** - [/pricing](/pricing)

## Întrebări Frecvente

**Q: Cât durează tot procesul?**
A: 5-15 zile pentru SRL, 3-7 zile pentru PFA.

**Q: Pot face singur fără ajutor?**
A: Da, dar economisești timp și eviti greșeli cu un serviciu specializat.

**Q: Ce fac dacă nu am sediu social?**
A: Poți folosi sediu virtual sau un contract de comodat.`
          },
          {
            title: 'Resurse și Link-uri Utile',
            type: 'TEXT',
            duration: 10,
            order: 2,
            content: `# Resurse și Link-uri Utile

## Site-uri Oficiale

| Instituție | Link | Utilitate |
|------------|------|-----------|
| ONRC | portal.onrc.ro | Înregistrare firmă |
| ANAF | anaf.ro | Fiscalitate |
| SPV | anaf.ro/spv | Declarații online |
| e-Factura | efactura.mfinante.gov.ro | Facturare electronică |
| REVISAL | revisal.ro | Registru salariați |
| CASS | cnas.ro | Asigurări sănătate |

## Fonduri și Finanțări

- **Start-Up Nation** - pana la 200.000 RON
- **IMM Invest** - credite garantate
- **Fonduri UE** - fonduri-ue.ro

## Comunități Antreprenoriale

- Startup Romania
- Romanian Business Leaders
- How to Web
- TechHub Bucharest

## Cărți Recomandate

1. "Lean Startup" - Eric Ries
2. "Zero to One" - Peter Thiel
3. "The Mom Test" - Rob Fitzpatrick
4. "Antreprenoriat" - Daniel Dăianu

## Instrumente Utile

### Contabilitate și Facturare
- DocumentIulia.ro (AI-powered)
- SmartBill
- FGO

### Productivitate
- Notion (organizare)
- Slack (comunicare)
- Trello (proiecte)

### Marketing
- Canva (design)
- Mailchimp (email)
- Google Analytics

## Contact și Suport

📧 contact@documentiulia.ro
📞 +40 700 000 000
🌐 documentiulia.ro

---

**Felicitări pentru finalizarea cursului!**

Acum ai cunoștințele necesare pentru a-ți lansa afacerea.
Succes în antreprenoriat! 🚀`
          }
        ]
      }
    ]
  },

  // Course 2: Business Plan Course
  {
    slug: 'plan-afaceri-complet-2025',
    title: 'Cum Să Scrii un Plan de Afaceri Câștigător',
    description: 'Învață să creezi un plan de afaceri profesional care atrage investitori și finanțări. Include template-uri și exemple reale.',
    category: 'BUSINESS',
    level: 'INTERMEDIATE',
    duration: 150,
    price: 49,
    isFree: false,
    language: 'ro',
    tags: ['plan de afaceri', 'business plan', 'finanțare', 'investitori', 'startup'],
    modules: [
      {
        title: 'Fundamentele Planului de Afaceri',
        description: 'Ce este și de ce ai nevoie de un plan de afaceri',
        order: 1,
        duration: 40,
        lessons: [
          {
            title: 'De Ce Ai Nevoie de un Plan de Afaceri',
            type: 'VIDEO',
            duration: 12,
            order: 1,
            content: `# De Ce Ai Nevoie de un Plan de Afaceri

## Ce Este un Plan de Afaceri?

Un plan de afaceri este un document strategic care descrie:
- Ce face afacerea ta
- Cum va genera profit
- Care este piața țintă
- Cum te vei diferenția
- Ce resurse sunt necesare

## De Ce Este Important?

### 1. Claritate pentru Tine
- Organizează ideile
- Identifică punctele slabe
- Stabilește priorități

### 2. Atragerea Finanțării
- Bănci și credite
- Fonduri europene
- Investitori

### 3. Ghidare Strategică
- Traseu clar de urmat
- Metrici de succes
- Repere pentru evaluare

## Când Ai Nevoie de Plan?

**Obligatoriu pentru:**
- Start-Up Nation
- Credite bancare
- Investitori

**Recomandat pentru:**
- Orice afacere nouă
- Expansiuni
- Pivoturi strategice

## Tipuri de Planuri

| Tip | Pagini | Scop |
|-----|--------|------|
| Lean Canvas | 1 | Validare rapidă |
| Mini plan | 5-10 | Uz intern |
| Plan complet | 20-40 | Finanțare |
| Plan detaliat | 50+ | Investitori mari |`
          },
          {
            title: 'Structura Planului de Afaceri',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Structura Standard a Planului de Afaceri

## Secțiunile Principale

### 1. Executive Summary (1-2 pagini)
- Rezumatul întregului plan
- Se scrie la sfârșit!
- Prima impresie pentru cititor

### 2. Descrierea Afacerii (2-3 pagini)
- Ce problemă rezolvi
- Soluția ta
- Misiune și viziune
- Obiective

### 3. Analiza Pieței (3-5 pagini)
- Dimensiunea pieței
- Segmente de clienți
- Tendințe și oportunități
- Analiza competiției

### 4. Strategia de Marketing (3-4 pagini)
- Poziționare
- Prețuri
- Canale de vânzare
- Promovare

### 5. Operațiuni (2-3 pagini)
- Procesele cheie
- Furnizori
- Tehnologie
- Locație

### 6. Echipa (2 pagini)
- Fondatori și roluri
- Competențe cheie
- Organigrama
- Planuri de angajare

### 7. Planul Financiar (5-10 pagini)
- Proiecții venituri/cheltuieli
- Cash flow
- Punct de echilibru
- Nevoi de finanțare

### 8. Anexe
- CV-uri
- Studii de piață
- Contracte
- Licențe`
          },
          {
            title: 'Greșeli de Evitat în Planul de Afaceri',
            type: 'TEXT',
            duration: 13,
            order: 3,
            content: `# Greșeli Frecvente în Planurile de Afaceri

## Greșeli de Conținut

### ❌ Proiecții Nerealiste
**Greșit:** "Vom avea 1 milion de clienți în primul an"
**Corect:** Proiecții bazate pe date și asumpții clare

### ❌ Ignorarea Competiției
**Greșit:** "Nu avem competitori"
**Corect:** Analiza detaliată a alternativelor

### ❌ Lipsa Validării
**Greșit:** Presupuneri fără dovezi
**Corect:** Date din interviuri, sondaje, teste

### ❌ Focus Excesiv pe Produs
**Greșit:** 10 pagini de caracteristici tehnice
**Corect:** Focus pe beneficii pentru client

## Greșeli de Formă

### ❌ Prea Lung sau Prea Scurt
- Optim: 20-40 pagini pentru finanțare
- Anexe separate pentru detalii

### ❌ Jargon Excesiv
- Scrie pentru un ne-specialist
- Explică termenii tehnici

### ❌ Grafică Slabă
- Folosește grafice și tabele
- Design profesionist

### ❌ Greșeli de Scriere
- Revizuire atentă
- Citește cu voce tare

## Sfaturi pentru Succes

✅ Fii onest despre riscuri
✅ Arată cum vei depăși provocările
✅ Folosește date reale
✅ Personalizează pentru audiență
✅ Actualizează regulat`
          }
        ]
      },
      {
        title: 'Analiza Pieței și Competiției',
        description: 'Cum să analizezi piața și competitorii',
        order: 2,
        duration: 45,
        lessons: [
          {
            title: 'Cercetarea și Dimensiunea Pieței',
            type: 'TEXT',
            duration: 15,
            order: 1,
            content: `# Cercetarea și Dimensiunea Pieței

## De Ce Este Importantă Analiza Pieței?

Investitorii vor să vadă:
- Piață suficient de mare
- Creștere a pieței
- Nevoie reală demonstrată

## TAM, SAM, SOM

### TAM (Total Addressable Market)
Piața totală teoretică.
Exemplu: Piața de software din România = 2 miliarde EUR

### SAM (Serviceable Addressable Market)
Partea pe care o poți servi.
Exemplu: Software contabilitate = 200 milioane EUR

### SOM (Serviceable Obtainable Market)
Ce poți captura realist.
Exemplu: 2% din SAM = 4 milioane EUR

## Surse de Date pentru România

### Gratuite:
- INS (insse.ro) - statistici oficiale
- Eurostat - date europene
- Google Trends - tendințe căutări
- Rapoarte industriale publice

### Plătite:
- Termene.ro - date firme
- KeysFin - analize financiare
- Rapoarte de piață specializate

## Cum Să Calculezi Dimensiunea Pieței

### Metoda Top-Down
1. Pornești de la piața totală
2. Aplici filtre (geografie, segment)
3. Ajungi la piața ta

### Metoda Bottom-Up
1. Estimezi clienți potențiali
2. Înmulțești cu prețul mediu
3. Mai realist pentru start-up-uri

## Template Analiză Piață

| Indicator | Valoare | Sursă |
|-----------|---------|-------|
| TAM | X EUR | [sursa] |
| SAM | Y EUR | [sursa] |
| SOM (Anul 1) | Z EUR | calcul |
| Rată creștere | X%/an | [sursa] |`
          },
          {
            title: 'Analiza Competiției',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Analiza Competiției

## Tipuri de Competitori

### Competitori Direcți
Oferă aceeași soluție pentru aceeași problemă.
- Același produs/serviciu
- Aceiași clienți țintă

### Competitori Indirecți
Rezolvă aceeași problemă diferit.
- Alternativa la soluția ta
- Pot deveni direcți

### Substituți
Produse/servicii care elimină nevoia.
- Exemple: email vs. fax

## Cum Să Identifici Competitorii

1. **Căutare Google** cu termeni relevanți
2. **Întreabă clienții** ce folosesc acum
3. **Verifică directoare** de afaceri
4. **Urmărește conferințe** din industrie
5. **Monitorizează rețele sociale**

## Framework Analiză Competitori

### Tabel Comparativ

| Criteriu | Noi | Competitor A | Competitor B |
|----------|-----|--------------|--------------|
| Preț | | | |
| Calitate | | | |
| Suport | | | |
| Tehnologie | | | |
| Brand | | | |

### Avantaj Competitiv

Ce faci mai bine?
- Preț mai mic?
- Calitate superioară?
- Tehnologie unică?
- Nișă specifică?

## Analiza SWOT

| Strengths | Weaknesses |
|-----------|------------|
| Puncte forte | Puncte slabe |

| Opportunities | Threats |
|---------------|---------|
| Oportunități | Amenințări |`
          },
          {
            title: 'Definirea Clientului Ideal',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Definirea Clientului Ideal (Buyer Persona)

## Ce Este o Buyer Persona?

Un profil semi-fictiv al clientului ideal, bazat pe:
- Date demografice
- Comportament
- Motivații
- Provocări

## Cum Să Creezi o Persona

### Pasul 1: Colectează Date

**Surse:**
- Interviuri cu clienți existenți
- Sondaje online
- Date din CRM
- Analytics (Google, social)
- Echipa de vânzări

### Pasul 2: Identifică Patternuri

Grupează răspunsurile pe:
- Rol/poziție
- Industrie
- Dimensiune companie
- Provocări comune

### Pasul 3: Creează Profilul

## Template Buyer Persona

### Date Demografice
- **Nume fictiv**: Ana Antreprenoare
- **Vârstă**: 35-45 ani
- **Educație**: Studii superioare
- **Rol**: Administrator/Proprietar
- **Companie**: SRL, 5-20 angajați
- **Industrie**: Servicii

### Obiective
- Să economisească timp
- Să fie conform cu legea
- Să crească profitabilitatea

### Provocări
- Lipsa timpului
- Complexitatea fiscală
- Găsirea angajaților buni

### Unde Caută Informații
- Google
- LinkedIn
- Recomandări colegi
- Conferințe

### Obiecții la Cumpărare
- "E prea scump"
- "Nu am timp să învăț"
- "Funcționează ce am acum"

## Exemplu Complet

> **Maria, 38 ani**, administrator la un SRL de servicii IT cu 12 angajați.
> Provocarea principală: conformitatea fiscală îi consumă prea mult timp.
> Caută soluții care automatizează contabilitatea.
> Buget: dispusă să plătească 100-300 EUR/lună pentru eficiență.`
          }
        ]
      },
      {
        title: 'Planul Financiar',
        description: 'Proiecții financiare și planificarea bugetului',
        order: 3,
        duration: 45,
        lessons: [
          {
            title: 'Proiecții de Venituri',
            type: 'TEXT',
            duration: 15,
            order: 1,
            content: `# Proiecții de Venituri

## Principii de Bază

### Fii Conservator
- Supraestimarea = pierderea credibilității
- Mai bine să depășești decât să nu atingi

### Bazează-te pe Date
- Validare din piață
- Benchmark-uri industrie
- Teste anterioare

## Metode de Proiecție

### 1. Bottom-Up (Recomandat)

Calculezi de la mic la mare:

\`\`\`
Clienți potențiali contactați: 1000/lună
Rata de conversie: 2%
Clienți noi: 20/lună
Valoare medie client: 500 RON/lună
Venit lunar: 10.000 RON
\`\`\`

### 2. Top-Down

Pornești de la piața totală:

\`\`\`
Piața totală: 10 milioane RON
Cota de piață țintă: 1%
Venit potențial: 100.000 RON
\`\`\`

## Template Proiecții 3 Ani

| Indicator | An 1 | An 2 | An 3 |
|-----------|------|------|------|
| Clienți | 50 | 150 | 400 |
| Venit mediu/client | 500 | 600 | 650 |
| Venit total | 25k | 90k | 260k |
| Creștere YoY | - | 260% | 189% |

## Asumpții de Documentat

Pentru fiecare proiecție, notează:
- Ce presupui
- De unde vine cifra
- Ce ar putea schimba rezultatul

## Scenarii

Prezintă 3 scenarii:
- **Pesimist**: Ce se întâmplă în worst case
- **Realist**: Cel mai probabil
- **Optimist**: Best case, cu condiții favorabile`
          },
          {
            title: 'Costurile și Cheltuielile',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Costurile și Cheltuielile

## Tipuri de Costuri

### Costuri Fixe
Nu variază cu volumul vânzărilor:
- Chirii
- Salarii fixe
- Abonamente
- Asigurări

### Costuri Variabile
Cresc odată cu vânzările:
- Materii prime
- Comisioane
- Livrare
- Procesare plăți

### Costuri Semi-variabile
- Marketing (buget variabil)
- Suport clienți (crește cu clienții)

## Template Cheltuieli Lunare

| Categorie | Suma | Tip |
|-----------|------|-----|
| Chiria | 1.000 | Fix |
| Salarii | 15.000 | Fix |
| Utilități | 500 | Semi-var |
| Marketing | 2.000 | Variabil |
| Software | 500 | Fix |
| Contabilitate | 300 | Fix |
| Diverse | 700 | Variabil |
| **TOTAL** | **20.000** | |

## Costuri de Start-up

| Element | Cost Unic |
|---------|-----------|
| Înregistrare firmă | 500 |
| Echipamente | 5.000 |
| Website | 2.000 |
| Branding | 1.500 |
| Stocuri inițiale | 10.000 |
| Fond de rulment | 30.000 |
| **TOTAL START** | **49.000** |

## Calculul Marjelor

### Marja Brută
\`\`\`
(Venituri - Costuri directe) / Venituri × 100
\`\`\`

### Marja Netă
\`\`\`
Profit net / Venituri × 100
\`\`\`

Țintă: Marja brută > 50% pentru servicii, > 30% pentru produse`
          },
          {
            title: 'Cash Flow și Break-Even',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Cash Flow și Punct de Echilibru

## Ce Este Cash Flow?

Fluxul de numerar = Diferența dintre banii care intră și ies.

**Atenție**: Profit ≠ Cash Flow
- Poți fi profitabil dar fără cash
- Facturile neîncasate nu sunt bani

## Template Cash Flow Lunar

| Luna | Încasări | Plăți | Sold | Cumul |
|------|----------|-------|------|-------|
| 1 | 5.000 | 15.000 | -10.000 | -10.000 |
| 2 | 8.000 | 14.000 | -6.000 | -16.000 |
| 3 | 12.000 | 14.000 | -2.000 | -18.000 |
| 4 | 15.000 | 14.000 | +1.000 | -17.000 |
| ... | | | | |

## Punct de Echilibru (Break-Even)

### Formula
\`\`\`
Break-even = Costuri Fixe / (Preț - Cost Variabil Unitar)
\`\`\`

### Exemplu
- Costuri fixe lunare: 10.000 RON
- Preț produs: 200 RON
- Cost variabil: 80 RON
- Break-even: 10.000 / (200-80) = 84 produse/lună

## Nevoia de Finanțare

Calculează:
1. Cel mai negativ sold din cash flow
2. Adaugă 20% rezervă de siguranță
3. = Suma minimă de finanțat

### Exemplu
- Sold minim: -50.000 RON
- Rezervă 20%: -10.000 RON
- **Finanțare necesară: 60.000 RON**

## Sfaturi Cash Flow

✅ Colectează rapid (avansuri, termene scurte)
✅ Plătește strategic (negociază termene)
✅ Monitorizează săptămânal
✅ Păstrează rezervă 3 luni
✅ Planifică sezonalitatea`
          }
        ]
      }
    ]
  },

  // Course 3: Legal Compliance for New Businesses
  {
    slug: 'conformitate-legala-firme-noi',
    title: 'Conformitate Legală pentru Firme Noi',
    description: 'Tot ce trebuie să știi despre obligațiile legale, fiscale și de raportare pentru o firmă nou înființată în România.',
    category: 'LEGAL',
    level: 'BEGINNER',
    duration: 120,
    price: 0,
    isFree: true,
    language: 'ro',
    tags: ['conformitate', 'legal', 'fiscal', 'ANAF', 'obligații', 'raportare'],
    modules: [
      {
        title: 'Obligații Fiscale de Bază',
        description: 'Înțelege sistemul fiscal românesc',
        order: 1,
        duration: 40,
        lessons: [
          {
            title: 'Sistemul Fiscal Românesc - Prezentare Generală',
            type: 'TEXT',
            duration: 15,
            order: 1,
            content: `# Sistemul Fiscal Românesc

## Principalele Impozite pentru Firme

### 1. Impozit pe Venit Microîntreprinderi
- **Cine**: Firme cu venituri < 500.000 EUR/an
- **Cât**: 1% (cu angajați) sau 3% (fără angajați)
- **Baza**: Se aplică la venituri, nu la profit

### 2. Impozit pe Profit
- **Cine**: Firme peste pragul micro sau care optează
- **Cât**: 16%
- **Baza**: Se aplică la profit (venituri - cheltuieli)

### 3. TVA (Taxa pe Valoare Adăugată)
- **Cine**: Obligatoriu peste 300.000 RON/an
- **Cote**: 19% (standard), 9% (alimente, medicamente), 5% (cărți)
- **Opțional**: Sub prag, poți opta voluntar

### 4. Contribuții Sociale (pentru angajați)
- CAS (pensie): 25% din salariu brut
- CASS (sănătate): 10% din salariu brut
- CAM (accidente muncă): 2.25%

## Calendarul Fiscal

| Frecvență | Declarație | Termen |
|-----------|------------|--------|
| Lunar | D112 (salarii) | 25 ale lunii |
| Lunar | D300 (TVA) | 25 ale lunii |
| Trimestrial | Impozit micro | 25 post-trimestru |
| Anual | Situații financiare | 30 mai (micro) |

## Micro vs Profit - Când Să Alegi Ce

### Alege Micro dacă:
- Marje de profit > 15-20%
- Cheltuieli mici
- Vrei simplitate

### Alege Profit dacă:
- Marje mici sau pierderi
- Cheltuieli mari (investiții)
- Planifici să reinvestești`
          },
          {
            title: 'Declarații și Termene Obligatorii',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Declarații și Termene Obligatorii

## Declarații Lunare

### D112 - Declarația privind obligațiile de plată (salarii)
- **Când**: Până pe 25 ale lunii următoare
- **Cine**: Toți angajatorii
- **Ce conține**: Contribuții salariați, impozit pe salarii

### D300 - Decont TVA
- **Când**: Până pe 25 ale lunii următoare
- **Cine**: Plătitori de TVA
- **Ce conține**: TVA colectată și deductibilă

### D390 - Declarație recapitulativă
- **Când**: Până pe 25
- **Cine**: Tranzacții intracomunitare

## Declarații Trimestriale

### D100 - Impozit pe venit micro/profit
- **Când**: 25 ale lunii post-trimestru
- **Cine**: Microîntreprinderi și plătitori profit

## Declarații Anuale

### Situații Financiare
- **Când**: 30 mai (micro) / 150 zile (normal)
- **Ce conține**: Bilanț, cont profit/pierdere

### D101 - Declarație impozit profit
- **Când**: 25 martie anul următor

### D205 - Informații despre beneficiari
- **Când**: Anual

## Calendar Fiscal 2025 (Selectiv)

| Termen | Declarație |
|--------|------------|
| 25 ianuarie | D112, D300 (dec) |
| 25 februarie | D112, D300 (ian) |
| 25 martie | D101 (anual), D112 |
| 25 aprilie | D100 T1, D112 |
| 30 mai | Situații financiare |

## Penalități pentru Întârziere

- **0.01%/zi** din suma datorată
- **Amenzi** pentru nedepunere: 1.000-5.000 RON
- **Majorări** pentru neplată

## Sfaturi

1. Setează remindere în calendar
2. Folosește soft de contabilitate
3. Colaborează cu un contabil
4. Nu aștepta ultimul moment`
          },
          {
            title: 'E-Factura și SPV - Obligații Digitale',
            type: 'TEXT',
            duration: 10,
            order: 3,
            content: `# E-Factura și SPV - Obligații Digitale

## E-Factura - Ce Este?

Sistem național de facturare electronică B2B obligatoriu.

### Cine Este Obligat?
- Toate firmele în relații B2B (de la 1 ian 2024)
- Tranzacții cu instituții publice (B2G)

### Cum Funcționează?
1. Emiți factura în sistemul tău
2. O transmiți în format XML la ANAF
3. ANAF validează și distribuie
4. Clientul o primește prin sistem

### Termene
- Transmitere: 5 zile de la emitere
- Validare ANAF: 1-2 zile

### Format
- Standard: RO_CIUS UBL 2.1
- Trebuie să conțină toate elementele obligatorii

## SPV (Spațiul Privat Virtual)

### Ce Este?
Portalul ANAF pentru comunicare electronică.

### Ce Poți Face?
- Depune declarații
- Vezi situația fiscală
- Primești notificări
- Descarci documente

### Cum Te Înregistrezi?
1. Accesează anaf.ro/spv
2. Înregistrare cu certificat digital sau
3. Validare la ghișeu ANAF

## SAF-T (Standard Audit File for Tax)

### Ce Este?
Fișier standard pentru raportare fiscală detaliată.

### Obligatoriu din 2025:
- Contribuabili mari
- Medii (etapizat)
- Mici (din 2026)

### Ce Conține?
- Jurnale contabile
- Facturi emise/primite
- Registre
- Stocuri

## Recomandări

✅ Folosește un soft care suportă e-Factura
✅ Înregistrează-te pe SPV acum
✅ Pregătește-te pentru SAF-T
✅ Verifică periodic conformitatea`
          }
        ]
      },
      {
        title: 'Obligații HR și Muncă',
        description: 'Ce trebuie să știi când angajezi',
        order: 2,
        duration: 40,
        lessons: [
          {
            title: 'Primul Angajat - Pași Legali',
            type: 'TEXT',
            duration: 15,
            order: 1,
            content: `# Primul Angajat - Pași Legali

## Înainte de Angajare

### 1. Medicina Muncii
- Examen medical de angajare
- Fișă de aptitudine
- Cost: 100-200 RON

### 2. Instruire SSM
- Instruire introductiv-generală
- Instruire la locul de muncă
- Documentație semnat

## Documente de Angajare

### Contract Individual de Muncă
- Obligatoriu în scris
- Înregistrat în REVISAL
- Minimum un exemplar pentru angajat

### Elemente obligatorii CIM:
- Datele părților
- Funcția și COR
- Locul muncii
- Salariu și sporuri
- Durată și perioadă probă
- Concediu de odihnă
- Preaviz

### Fișa Postului
- Anexă la CIM
- Descrie atribuțiile
- Semnată de angajat

## REVISAL

### Ce Este?
Registrul Electronic al Salariaților

### Când Se Transmite?
- La angajare: înainte de începerea activității
- La modificări: 24 ore
- La încetare: 24 ore

### Cum?
- Online prin revisal.ro
- Necesită certificat digital

## Salarii 2025

### Salariul Minim Brut
- 3.700 RON (general)
- 4.582 RON (studii superioare + 1 an)

### Contribuții (suportate de angajat din brut)
- CAS: 25%
- CASS: 10%
- Impozit: 10%

### Net din 3.700 brut ≈ 2.275 RON

## Checklist Primul Angajat

- [ ] Examen medical
- [ ] Instruire SSM
- [ ] Contract semnat
- [ ] Fișa postului
- [ ] REVISAL transmis
- [ ] Dosar personal complet`
          },
          {
            title: 'SSM și PSI - Obligații de Bază',
            type: 'TEXT',
            duration: 12,
            order: 2,
            content: `# SSM și PSI - Obligații de Bază

## SSM (Securitate și Sănătate în Muncă)

### Obligații Angajator

1. **Evaluarea riscurilor**
   - Document obligatoriu
   - Realizat de specialist SSM
   - Actualizat periodic

2. **Instruirea angajaților**
   - Instructaj introductiv (la angajare)
   - Instructaj la locul de muncă
   - Instructaj periodic (3-12 luni)

3. **Medicina muncii**
   - Examen la angajare
   - Control periodic
   - Evidența fișelor

4. **Echipament de protecție**
   - Gratuit pentru angajați
   - Adecvat riscurilor

### Documente Necesare

| Document | Obligatoriu? |
|----------|--------------|
| Evaluare riscuri | Da |
| Fișe instruire | Da |
| Plan SSM | Da (>9 angajați) |
| ROI/ROF | Da |

## PSI (Prevenire și Stingere Incendii)

### Obligații de Bază

1. **Documentație**
   - Plan de evacuare
   - Instructaj PSI

2. **Echipamente**
   - Stingătoare (verificate anual)
   - Detectoare fum
   - Iluminat de siguranță

3. **Autorizații**
   - Aviz/Autorizație ISU (depinde de risc)

## Externalizare SSM

### Când Poți Externaliza?
- Sub 9 angajați: obligatoriu extern sau intern
- Peste 9 angajați: intern sau extern

### Costuri Orientative
- SSM extern: 50-100 RON/angajat/lună
- Evaluare riscuri: 500-2000 RON (one-time)

## Sancțiuni

- Lipsă SSM: 5.000-10.000 RON amendă
- Lipsă instructaj: 4.000-8.000 RON
- Accident de muncă fără SSM: răspundere penală`
          },
          {
            title: 'GDPR pentru Angajatori',
            type: 'TEXT',
            duration: 13,
            order: 3,
            content: `# GDPR pentru Angajatori

## Ce Date Personale Prelucrezi?

### Date Angajați
- CNP, adresă, telefon
- Date bancare
- Date medicale
- Fișe de pontaj
- Evaluări performanță

### Date Candidați
- CV-uri
- Scrisori de intenție
- Date din interviuri

## Obligații GDPR

### 1. Bază Legală
- Contract de muncă (pentru date salariale)
- Obligație legală (REVISAL, declarații)
- Consimțământ (pentru altele)

### 2. Informarea Angajaților

Trebuie să informezi despre:
- Ce date colectezi
- De ce le folosești
- Cât timp le păstrezi
- Drepturile lor

### Document: Notă de informare GDPR

### 3. Evidența Prelucrărilor
Registru cu:
- Categorii de date
- Scopuri
- Destinatari
- Termene de păstrare

### 4. Securitatea Datelor
- Acces restricționat
- Parole sigure
- Backup-uri
- Proceduri breach

## Termene de Păstrare

| Document | Termen |
|----------|--------|
| Documente salariale | 50 ani |
| Contracte muncă | 75 ani |
| Fișe SSM | 20 ani |
| CV-uri (respinși) | 6 luni |

## Sancțiuni GDPR

- Avertisment
- Amendă până la 4% din cifra de afaceri
- Despăgubiri către persoane afectate

## Checklist GDPR Angajator

- [ ] Notă informare angajați
- [ ] Clauze GDPR în contracte
- [ ] Registru prelucrări
- [ ] Proceduri securitate
- [ ] Consimțăminte unde e cazul`
          }
        ]
      },
      {
        title: 'Licențe și Autorizații',
        description: 'Ce autorizații ar putea fi necesare pentru afacerea ta',
        order: 3,
        duration: 40,
        lessons: [
          {
            title: 'Autorizații Comune pentru Afaceri',
            type: 'TEXT',
            duration: 15,
            order: 1,
            content: `# Autorizații Comune pentru Afaceri

## Autorizații Generale

### 1. Autorizație de Funcționare
- **Cine**: Activități comerciale cu sediu fizic
- **De unde**: Primărie
- **Cost**: 100-500 RON

### 2. Autorizație Sanitară
- **Cine**: Alimentație publică, comerț alimente
- **De unde**: DSP (Direcția de Sănătate Publică)
- **Cost**: Variabil

### 3. Autorizație ISU (Pompieri)
- **Cine**: Spații publice, depozite
- **De unde**: ISU
- **Cost**: 50-500 RON

### 4. Autorizație de Mediu
- **Cine**: Activități cu impact de mediu
- **De unde**: Agenția de Mediu

## Licențe Specifice

### HORECA
- Licență pentru băuturi alcoolice
- Autorizație sanitară
- Autorizație ISU
- Autorizație muzică ambientală (UCMR-ADA)

### Transport
- Licență de transport
- Autorizații vehicule
- Certificat competență profesională

### Construcții
- Autorizație de construire
- Certificat de urbanism
- Avize utilități

### Sănătate
- Autorizație de funcționare MS
- Aviz Colegiu Medici/Farmaciști

## Proces Obținere

1. Identifică ce autorizații ai nevoie
2. Pregătește documentația
3. Depune cererea
4. Achită taxele
5. Așteaptă verificarea
6. Primește autorizația

## Termene Orientative

| Autorizație | Durată |
|-------------|--------|
| Funcționare | 10-30 zile |
| Sanitară | 15-45 zile |
| ISU | 15-30 zile |
| Mediu | 30-90 zile |

## Atenție!

⚠️ Funcționarea fără autorizații = AMENDĂ + ÎNCHIDERE
⚠️ Verifică periodic valabilitatea
⚠️ Anunță modificările`
          },
          {
            title: 'Protecția Consumatorului',
            type: 'TEXT',
            duration: 12,
            order: 2,
            content: `# Protecția Consumatorului

## Obligații Principale

### 1. Informarea Consumatorului

Trebuie să afișezi:
- Prețurile complete (inclusiv TVA)
- Caracteristicile produselor
- Condițiile de vânzare
- Datele firmei

### 2. Dreptul de Retragere (E-commerce)

- **Termen**: 14 zile fără motiv
- **Excepții**: Produse personalizate, perisabile
- **Obligație**: Informare clară înainte de comandă

### 3. Garanții

- **Garanție legală**: 2 ani (produse noi)
- **Garanție comercială**: Opțională, suplimentară

### 4. Reclamații

- Termen răspuns: 30 zile
- Registru reclamații (fizic sau electronic)
- Soluționare amiabilă

## Vânzări Online - Obligații Extra

### Informații Obligatorii pe Site
- Date identificare firmă
- Prețuri și taxe de livrare
- Modalități de plată
- Politica de returnare
- Politica de confidențialitate

### Confirmare Comandă
- Email confirmare
- Rezumat produs + preț
- Dreptul de retragere

## Sancțiuni ANPC

| Încălcare | Amendă |
|-----------|--------|
| Lipsa informații | 2.000-20.000 RON |
| Nerespectare retragere | 2.000-50.000 RON |
| Practici înșelătoare | 5.000-50.000 RON |

## Bune Practici

✅ Termeni și condiții clare
✅ Politică returnare vizibilă
✅ Răspuns rapid la reclamații
✅ Păstrează dovada comunicărilor
✅ Formular retragere disponibil`
          },
          {
            title: 'Rezumat și Checklist Conformitate',
            type: 'TEXT',
            duration: 13,
            order: 3,
            content: `# Checklist Complet Conformitate

## Obligații Fiscale

- [ ] Înregistrare ANAF
- [ ] Alegere regim fiscal (micro/profit)
- [ ] Înregistrare TVA (dacă e cazul)
- [ ] SPV activat
- [ ] e-Factura configurat
- [ ] Calendar declarații setat

## Obligații HR

- [ ] REVISAL activ
- [ ] Contracte muncă conforme
- [ ] Fișe post semnate
- [ ] Medicina muncii
- [ ] SSM realizat
- [ ] Instructaje efectuate
- [ ] GDPR implementat

## Licențe și Autorizații

- [ ] Verificat ce autorizații sunt necesare
- [ ] Autorizație funcționare (dacă e cazul)
- [ ] Autorizație sanitară (dacă e cazul)
- [ ] Autorizație ISU (dacă e cazul)
- [ ] Alte licențe specifice

## Protecția Consumatorului

- [ ] Prețuri afișate corect
- [ ] Politică returnare
- [ ] Termeni și condiții
- [ ] Registru reclamații

## Documente de Păstrat

| Document | Termen |
|----------|--------|
| Facturi | 10 ani |
| Contracte | Durata + 3 ani |
| Declarații fiscale | 10 ani |
| Documente salarii | 50 ani |
| Documente SSM | 20 ani |

## Resurse Utile

- anaf.ro - Fiscalitate
- itm.gov.ro - Muncă
- anpc.ro - Consumatori
- dataprotection.ro - GDPR

## Sfat Final

**Nu încerca să faci totul singur!**

Colaborează cu:
- Contabil - pentru fiscalitate
- Avocat - pentru contracte
- Specialist SSM - pentru sănătate și securitate
- Consultant GDPR - pentru date personale

Costul specialiștilor < Costul amenzilor + stresul`
          }
        ]
      }
    ]
  },

  // Course 4: Digital Tools for New Businesses
  {
    slug: 'instrumente-digitale-afaceri-noi',
    title: 'Instrumente Digitale pentru Afaceri Noi',
    description: 'Ghid complet de digitalizare pentru start-up-uri și afaceri noi. Cele mai bune tool-uri pentru productivitate, contabilitate și marketing.',
    category: 'BUSINESS',
    level: 'BEGINNER',
    duration: 90,
    price: 0,
    isFree: true,
    language: 'ro',
    tags: ['digitalizare', 'software', 'productivitate', 'marketing', 'tools'],
    modules: [
      {
        title: 'Stack-ul Digital Esențial',
        description: 'Instrumentele de bază pentru orice afacere nouă',
        order: 1,
        duration: 30,
        lessons: [
          {
            title: 'Categorii de Software pentru Afaceri',
            type: 'TEXT',
            duration: 10,
            order: 1,
            content: `# Categorii de Software pentru Afaceri

## Instrumentele Esențiale

### 1. Contabilitate și Facturare
- Emitere facturi
- Evidență cheltuieli
- Rapoarte financiare
- Declarații fiscale

### 2. CRM (Customer Relationship Management)
- Gestionare clienți
- Pipeline vânzări
- Istoric interacțiuni

### 3. Productivitate și Colaborare
- Email
- Calendar
- Document sharing
- Comunicare echipă

### 4. Marketing
- Email marketing
- Social media
- Website/landing pages
- Analytics

### 5. Project Management
- Task-uri și proiecte
- Time tracking
- Raportare

## Buget Orientativ

| Categorie | Free | Basic | Pro |
|-----------|------|-------|-----|
| Contabilitate | 0 | 50-100€/lună | 200€+ |
| CRM | 0 | 20-50€/lună | 100€+ |
| Email | 0 | 5-10€/lună | 20€+ |
| Marketing | 0 | 30-100€/lună | 200€+ |

## Criterii de Alegere

1. **Integrări** - Se conectează cu alte tool-uri?
2. **Scalabilitate** - Crește cu afacerea?
3. **Suport** - Disponibil în română?
4. **Preț** - Cost vs. valoare
5. **UX** - Ușor de folosit?`
          },
          {
            title: 'Software de Contabilitate și Facturare',
            type: 'TEXT',
            duration: 12,
            order: 2,
            content: `# Software de Contabilitate și Facturare

## Opțiuni pentru România

### DocumentIulia.ro
**Avantaje:**
- AI-powered (OCR, predicții)
- E-Factura integrat
- SAF-T ready
- Suport complet ANAF

**Preț:** De la gratuit, Pro de la 49 RON/lună

### SmartBill
**Avantaje:**
- Popular în România
- Facturare simplă
- Rapoarte de bază

**Preț:** De la 19 RON/lună

### FGO (Facturare.ro)
**Avantaje:**
- E-Factura integrat
- Simplu de folosit

**Preț:** De la 29 RON/lună

### SAGA
**Avantaje:**
- Standard contabil românesc
- Integrări multiple

**Preț:** Variabil

## Funcționalități de Urmărit

### Must Have
- [ ] Emitere facturi (inclusiv e-Factura)
- [ ] Evidență încasări/plăți
- [ ] Export pentru contabil
- [ ] Rapoarte de bază

### Nice to Have
- [ ] OCR pentru documente
- [ ] Mobile app
- [ ] Integrări bancare
- [ ] Predicții cash flow

## Recomandări per Dimensiune

| Tip Firmă | Recomandare |
|-----------|-------------|
| Freelancer | SmartBill sau FGO |
| SRL mic | DocumentIulia sau SmartBill |
| SRL mediu | DocumentIulia Pro |
| Cu contabil | Ce recomandă contabilul |`
          },
          {
            title: 'CRM și Productivitate',
            type: 'TEXT',
            duration: 8,
            order: 3,
            content: `# CRM și Productivitate

## CRM - Gestionarea Clienților

### Opțiuni Gratuite/Freemium
- **HubSpot CRM** - Gratuit, foarte complet
- **Notion** - Flexibil, personalizabil
- **Airtable** - Bază de date vizuală

### Opțiuni Plătite
- **Pipedrive** - Focus pe vânzări
- **Salesforce** - Enterprise
- **Monday.com** - Versatil

## Productivitate și Colaborare

### Suita Google Workspace
- Gmail
- Calendar
- Drive
- Docs/Sheets/Slides
- Meet

**Preț:** De la gratuit (personal) sau 6$/utilizator (business)

### Microsoft 365
- Outlook
- OneDrive
- Word/Excel/PowerPoint
- Teams

**Preț:** De la 5€/utilizator/lună

### Comunicare Echipă
- **Slack** - Chat și canale
- **Discord** - Alternativă gratuită
- **Teams** - Dacă ai M365

### Project Management
- **Trello** - Kanban simplu
- **Asana** - Proiecte complexe
- **Notion** - All-in-one

## Stack Recomandat Start-up

| Nevoie | Tool | Cost |
|--------|------|------|
| Email | Gmail | Gratuit |
| CRM | HubSpot | Gratuit |
| Docs | Google Docs | Gratuit |
| Chat | Slack | Gratuit |
| Tasks | Trello | Gratuit |
| **TOTAL** | | **0€** |`
          }
        ]
      },
      {
        title: 'Marketing Digital de Bază',
        description: 'Primii pași în marketing online',
        order: 2,
        duration: 35,
        lessons: [
          {
            title: 'Website și Prezență Online',
            type: 'TEXT',
            duration: 12,
            order: 1,
            content: `# Website și Prezență Online

## De Ce Ai Nevoie de un Website?

- Credibilitate profesională
- Punct de contact 24/7
- SEO și vizibilitate Google
- Bază pentru marketing

## Opțiuni pentru Creare Website

### 1. Website Builders (fără cod)
- **Wix** - Ușor, drag-and-drop
- **Squarespace** - Design premium
- **Webflow** - Avansat, fără cod

### 2. WordPress
- Control total
- Mii de plugin-uri
- Necesită hosting

### 3. Landing Page Builders
- **Carrd** - Simplu, 19$/an
- **Unbounce** - Focus conversii
- **Leadpages** - Marketing

### 4. Agenție/Freelancer
- Custom, profesionist
- Cost: 500-5000€+

## Elementele unui Website Bun

### Must Have
- [ ] Pagină principală clară
- [ ] Despre noi
- [ ] Servicii/Produse
- [ ] Contact
- [ ] Mobile-friendly
- [ ] HTTPS (SSL)

### SEO Basics
- [ ] Titluri optimizate
- [ ] Meta descrieri
- [ ] Google Business Profile
- [ ] Viteză bună de încărcare

## Google Business Profile

**GRATUIT și ESENȚIAL:**
1. Creează profil pe business.google.com
2. Verifică adresa
3. Adaugă poze și informații
4. Colectează recenzii

## Costuri Orientative

| Element | Cost Anual |
|---------|------------|
| Domeniu .ro | 10-15€ |
| Hosting | 50-100€ |
| Website builder | 100-300€ |
| SSL | Gratuit (Let's Encrypt) |
| **TOTAL MINIM** | **160-400€/an** |`
          },
          {
            title: 'Social Media pentru Business',
            type: 'TEXT',
            duration: 12,
            order: 2,
            content: `# Social Media pentru Business

## Alegerea Platformelor

### Nu fi peste tot!
Alege 1-2 platforme relevante pentru audiența ta.

### Ghid per Tip de Business

| Business | Platforme Recomandate |
|----------|----------------------|
| B2B, Servicii | LinkedIn, Facebook |
| B2C, Retail | Instagram, TikTok |
| Local | Facebook, Google |
| Creativ | Instagram, Pinterest |
| Tech/Startup | LinkedIn, Twitter |

## Strategia de Conținut

### Regula 80/20
- 80% conținut valoros (educativ, entertaining)
- 20% promovare directă

### Tipuri de Postări
- Educative (how-to, tips)
- Behind the scenes
- Testimoniale clienți
- Oferte și promoții
- Interacțiuni (întrebări, sondaje)

### Frecvența
- Facebook: 3-5 postări/săptămână
- Instagram: 4-7 postări/săptămână
- LinkedIn: 2-3 postări/săptămână
- TikTok: Zilnic

## Tools Utile

### Management
- **Buffer** - Programare postări
- **Hootsuite** - Management complet
- **Later** - Focus Instagram

### Design
- **Canva** - Grafică ușoară
- **Adobe Express** - Templates

### Analytics
- Insights native ale platformelor
- Google Analytics pentru trafic

## Buget Publicitate

### Start minimal:
- 5-10€/zi pentru testare
- Scalează ce funcționează

### Tipuri de Ads
- Facebook/Instagram Ads
- LinkedIn Ads (B2B)
- Google Ads (căutare)`
          },
          {
            title: 'Email Marketing Basics',
            type: 'TEXT',
            duration: 11,
            order: 3,
            content: `# Email Marketing Basics

## De Ce Email Marketing?

- ROI ridicat (36$ pentru fiecare 1$ investit)
- Audiență proprie (nu depinzi de algoritmi)
- Automatizare posibilă
- Măsurabil

## Platforme Recomandate

### Gratuite/Freemium
- **Mailchimp** - 500 contacte gratuit
- **Brevo** - 300 email/zi gratuit
- **MailerLite** - 1000 contacte gratuit

### Plătite
- **ConvertKit** - Creatori
- **ActiveCampaign** - Avansat

## Construirea Listei

### Metode Etice
- Lead magnets (ebook, checklist)
- Newsletter signup pe site
- Concursuri
- Pop-up-uri (non-agresive)

### Lead Magnets Eficiente
- Ghiduri PDF
- Template-uri
- Checklist-uri
- Mini-cursuri email
- Acces exclusiv

## Tipuri de Email-uri

### Welcome Series
Email-uri automate pentru noi abonați:
1. Bun venit + lead magnet
2. Povestea ta
3. Cum poți ajuta
4. Ofertă specială

### Newsletter
- Frecvență: Săptămânal/Lunar
- Conținut valoros
- Update-uri business

### Promotional
- Oferte speciale
- Lansări produse
- Black Friday etc.

## Best Practices

✅ Subiect compelling (40-60 caractere)
✅ Personalizare (nume)
✅ CTA clar și singular
✅ Mobile-friendly
✅ Link unsubscribe vizibil
✅ Testează înainte de trimis

## Metrici de Urmărit

| Metrică | Benchmark |
|---------|-----------|
| Open Rate | 20-25% |
| Click Rate | 2-5% |
| Unsubscribe | <0.5% |`
          }
        ]
      },
      {
        title: 'Automatizare și Eficiență',
        description: 'Cum să automatizezi procesele repetitive',
        order: 3,
        duration: 25,
        lessons: [
          {
            title: 'Introducere în Automatizare',
            type: 'TEXT',
            duration: 10,
            order: 1,
            content: `# Introducere în Automatizare

## Ce Poți Automatiza?

### Procese Repetitive
- Răspunsuri la email-uri frecvente
- Facturare recurentă
- Postări social media
- Rapoarte periodice

### Fluxuri de Lucru
- Onboarding clienți noi
- Follow-up vânzări
- Colectare feedback

## Tool-uri de Automatizare

### Zapier
- Conectează 5000+ aplicații
- "If this, then that"
- Plan gratuit: 100 tasks/lună

### Make (Integromat)
- Mai complex, mai flexibil
- Vizual, drag-and-drop
- Plan gratuit disponibil

### IFTTT
- Simplu, personal
- Mai limitat pentru business

## Exemple de Automatizări

### 1. Lead nou în CRM
**Trigger**: Formular completat pe site
**Acțiune**:
- Adaugă în CRM
- Trimite email de bun venit
- Notifică echipa pe Slack

### 2. Factură plătită
**Trigger**: Plată primită
**Acțiune**:
- Marchează factura plătită
- Trimite mulțumire client
- Actualizează raport

### 3. Postare automată
**Trigger**: Articol nou pe blog
**Acțiune**:
- Postează pe Facebook
- Postează pe LinkedIn
- Trimite newsletter

## Reguli de Automatizare

✅ Automatizează ce e repetitiv
✅ Păstrează touch-ul uman unde contează
✅ Testează înainte de a pune live
✅ Monitorizează și ajustează`
          },
          {
            title: 'Template-uri și Procese Standard',
            type: 'TEXT',
            duration: 8,
            order: 2,
            content: `# Template-uri și Procese Standard

## De Ce Template-uri?

- Economisești timp
- Consistență în comunicare
- Reducerea erorilor
- Scalabilitate

## Template-uri Esențiale

### Comunicare
- [ ] Email răspuns standard
- [ ] Ofertă de preț
- [ ] Contract servicii
- [ ] Factură
- [ ] Email follow-up

### Operațiuni
- [ ] Checklist onboarding client
- [ ] Proces livrare serviciu
- [ ] Raport periodic
- [ ] Procedură reclamații

### HR
- [ ] Anunț recrutare
- [ ] Email respingere
- [ ] Contract muncă
- [ ] Fișa postului

## Unde Să Le Stochezi

### Google Drive
- Folder structurat
- Acces echipă
- Versioning

### Notion
- Bază de date template-uri
- Ușor de actualizat
- Căutare rapidă

### CRM/Software Specializat
- Template-uri email în CRM
- Template-uri facturi în soft contabil

## Crearea unui Proces Standard (SOP)

### Structura SOP
1. **Titlu și scop**
2. **Când se aplică**
3. **Pași detaliați**
4. **Resurse necesare**
5. **Responsabili**
6. **Excepții**

### Exemplu SOP - Onboarding Client

\`\`\`
PROCES: Onboarding Client Nou

1. Primire contract semnat
   - Verifică semnăturile
   - Salvează în folderul clientului

2. Configurare în sistem
   - Adaugă în CRM
   - Creează folder Drive
   - Setează acces echipă

3. Email de bun venit
   - Folosește template "Welcome"
   - Atașează ghid utilizare
   - CC manager cont

4. Kick-off call (în 48h)
   - Programează meet
   - Pregătește agenda
   - Documentează deciziile
\`\`\`

## Sfaturi

✅ Documentează tot ce faci de 3+ ori
✅ Actualizează template-urile periodic
✅ Colectează feedback de la echipă
✅ Simplifică pe măsură ce înveți`
          },
          {
            title: 'Concluzie și Pași Următori',
            type: 'TEXT',
            duration: 7,
            order: 3,
            content: `# Concluzie - Stack Digital pentru Start-up

## Recapitulare

### Modul 1: Esențiale
- Categorii de software
- Contabilitate (DocumentIulia, SmartBill)
- CRM (HubSpot) și productivitate (Google)

### Modul 2: Marketing Digital
- Website și SEO
- Social media strategie
- Email marketing

### Modul 3: Automatizare
- Zapier și integrări
- Template-uri și SOP-uri

## Stack Recomandat (Start)

| Nevoie | Tool | Cost |
|--------|------|------|
| Contabilitate | DocumentIulia | Gratuit |
| CRM | HubSpot | Gratuit |
| Email | Gmail | Gratuit |
| Docs | Google Workspace | Gratuit |
| Chat | Slack | Gratuit |
| Tasks | Trello | Gratuit |
| Design | Canva | Gratuit |
| Email marketing | Mailchimp | Gratuit |
| **TOTAL** | | **0€** |

## Planul de Implementare

### Săptămâna 1
- [ ] Configurează Gmail business
- [ ] Setează Google Drive
- [ ] Creează cont HubSpot CRM

### Săptămâna 2
- [ ] Lansează website minim
- [ ] Configurează Google Business
- [ ] Creează pagini social media

### Săptămâna 3
- [ ] Setează cont Mailchimp
- [ ] Creează primul lead magnet
- [ ] Configurează prima automatizare

### Luna 1-3
- [ ] Creează template-uri esențiale
- [ ] Documentează procesele
- [ ] Optimizează bazat pe feedback

## Resurse Suplimentare

- [/templates](/templates) - Șabloane documente
- [/blog](/blog) - Articole digitalizare
- [/courses](/courses) - Mai multe cursuri

## Felicitări!

Ai acum cunoștințele necesare pentru a-ți digitaliza afacerea eficient.

Succes! 🚀`
          }
        ]
      }
    ]
  },

  // Course 5: Funding and Financing
  {
    slug: 'finantare-startup-romania-2025',
    title: 'Finanțarea Start-up-urilor în România 2025',
    description: 'Ghid complet pentru finanțarea afacerii tale: fonduri europene, credite bancare, investitori și crowdfunding.',
    category: 'BUSINESS',
    level: 'INTERMEDIATE',
    duration: 100,
    price: 29,
    isFree: false,
    language: 'ro',
    tags: ['finanțare', 'fonduri europene', 'investitori', 'credite', 'startup'],
    modules: [
      {
        title: 'Opțiuni de Finanțare în România',
        description: 'Prezentare generală a surselor de finanțare',
        order: 1,
        duration: 35,
        lessons: [
          {
            title: 'Tipuri de Finanțare pentru Start-up-uri',
            type: 'TEXT',
            duration: 12,
            order: 1,
            content: `# Tipuri de Finanțare pentru Start-up-uri

## Surse de Finanțare

### 1. Bootstrapping (Fonduri Proprii)
- Economii personale
- Reinvestirea profitului
- Cea mai comună metodă

**Pro:** Control total, fără datorii
**Contra:** Limitat, creștere lentă

### 2. Familie și Prieteni (FFF)
- Friends, Family, and Fools
- Primele investiții externe

**Pro:** Flexibilitate, încredere
**Contra:** Risc relațional, neprofesionist

### 3. Credite Bancare
- IMM Invest (garantat de stat)
- Credite pentru start-up-uri
- Linii de credit

**Pro:** Păstrezi controlul
**Contra:** Dobânzi, garanții necesare

### 4. Fonduri Europene / Granturi
- Start-Up Nation
- PNRR
- POC Competitivitate

**Pro:** Bani nerambursabili
**Contra:** Birocrație, termene, condiții

### 5. Business Angels
- Investitori privați
- Sume: 10.000 - 200.000 EUR
- Expertiză și conexiuni

**Pro:** Smart money, mentorat
**Contra:** Dilutie, așteptări

### 6. Venture Capital (VC)
- Fonduri de investiții
- Sume: 200.000 - 10M+ EUR
- Pentru scale-up

**Pro:** Capital mare, suport
**Contra:** Dilutie mare, presiune creștere

### 7. Crowdfunding
- Reward-based (Kickstarter)
- Equity (Seedblink)
- Lending (Mintos)

**Pro:** Validare piață
**Contra:** Expunere, efort marketing

## Potrivirea Stadiu - Finanțare

| Stadiu | Sursă Recomandată |
|--------|-------------------|
| Idee | Bootstrapping, FFF |
| Validare | Angels, Granturi |
| Creștere | VC, Credite |
| Scale | VC, IPO |`
          },
          {
            title: 'Fonduri Europene 2025 - Oportunități',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Fonduri Europene 2025 - Oportunități

## Programe Active

### Start-Up Nation 2025
- **Sumă**: Până la 200.000 RON (nerambursabil)
- **Pentru**: Firme noi (max 3 ani)
- **Cofinanțare**: 0% (100% grant)
- **Condiții**: Angajare personal, menținere 3 ani

**Cheltuieli eligibile:**
- Echipamente și utilaje
- Mobilier
- Software și licențe
- Website
- Consultanță

### PNRR - Digitalizare IMM
- **Sumă**: 20.000 - 100.000 EUR
- **Pentru**: Digitalizarea proceselor
- **Focus**: E-commerce, automatizare

### POC - Inovare
- **Sumă**: Variabilă
- **Pentru**: Proiecte inovatoare
- **Sector**: Tehnologie, cercetare

## Cum Să Aplici

### Pasul 1: Verifică Eligibilitatea
- Criterii firmă (vechime, dimensiune)
- Criterii activitate (CAEN)
- Criterii financiare

### Pasul 2: Pregătește Documentația
- Plan de afaceri
- Proiecții financiare
- Documente legale

### Pasul 3: Depune Dosarul
- Online prin platformă dedicată
- Respectă termenele

### Pasul 4: Evaluare și Contractare
- Evaluare de către autoritate
- Semnare contract finanțare

### Pasul 5: Implementare
- Realizează investițiile
- Păstrează documente
- Raportează conform cerințelor

## Greșeli de Evitat

❌ Aplicare la ultimul moment
❌ Buget nerealist
❌ Nerespectarea termenelor
❌ Lipsa documentelor
❌ Proiecții nefundamentate

## Unde Să Te Informezi

- fonduri-ue.ro
- adr.gov.ro
- finantare.gov.ro

## Sfat Important

Colaborează cu un consultant pentru:
- Identificare program potrivit
- Pregătire documentație
- Maximizare punctaj
- Cost: 3-10% din valoarea proiectului`
          },
          {
            title: 'Credite Bancare pentru Afaceri',
            type: 'TEXT',
            duration: 8,
            order: 3,
            content: `# Credite Bancare pentru Afaceri

## Tipuri de Credite

### 1. IMM Invest
- Garantat de stat (până la 90%)
- Dobândă subvenționată
- Pentru investiții și capital de lucru

### 2. Credite Investiții
- Echipamente, utilaje
- Imobile
- Termen: 3-10 ani

### 3. Linii de Credit
- Capital de lucru
- Flexibilitate
- Termen: 1 an, reînnoibil

### 4. Credite Start-up
- Pentru firme noi
- Cerințe mai flexibile
- Garanții personale

## Documente Necesare

- Plan de afaceri
- Proiecții financiare
- Situații financiare (dacă ai)
- Documente firmă
- Garanții

## Criterii de Analiză

Băncile evaluează:
- Istoricul firmei
- Cash flow proiectat
- Garanții disponibile
- Experiența echipei
- Sectorul de activitate

## Dobânzi Orientative 2025

| Tip Credit | Dobândă |
|------------|---------|
| IMM Invest | 4-6% |
| Investiții | 7-10% |
| Capital lucru | 8-12% |

## Sfaturi

✅ Compară mai multe bănci
✅ Negociază condițiile
✅ Pregătește documentația temeinic
✅ Fii realist în proiecții
✅ Calculează capacitatea de rambursare`
          }
        ]
      },
      {
        title: 'Atragerea Investitorilor',
        description: 'Cum să atragi business angels și VC',
        order: 2,
        duration: 40,
        lessons: [
          {
            title: 'Ecosistemul de Investiții din România',
            type: 'TEXT',
            duration: 12,
            order: 1,
            content: `# Ecosistemul de Investiții din România

## Business Angels în România

### Ce Sunt Business Angels?
Investitori privați care:
- Investesc bani proprii
- Sume: 10.000 - 200.000 EUR
- Oferă mentorat și conexiuni
- Investesc în faze timpurii

### Rețele de Angels
- **TechAngels** - Focus tech
- **ROCA X** - Diversificat
- **Business Angels Romania**

### Ce Caută Angels
- Echipă puternică
- Piață mare
- Tracțiune (early traction)
- Potențial de exit

## Fonduri VC Active în România

### Locale
- **Early Game Ventures** - Seed, Series A
- **Catalyst Romania** - Growth
- **GapMinder VC** - Early stage

### Regionale
- **3TS Capital**
- **LAUNCHub Ventures**
- **Credo Ventures**

### Sume Tipice

| Fază | Sumă | Ce oferă |
|------|------|----------|
| Pre-seed | 50-200k EUR | Validare |
| Seed | 200k-1M EUR | Product-market fit |
| Series A | 1-5M EUR | Scalare |
| Series B+ | 5M+ EUR | Expansiune |

## Acceleratoare și Incubatoare

### Acceleratoare
- **Techcelerator**
- **Innovation Labs**
- **Spherik**

Ce oferă:
- Mentorat intensiv
- Networking
- Investiție seed (50-200k EUR)
- Demo Day

### Incubatoare
- **Cluj IT Cluster**
- **TechHub Bucharest**
- **Impact Hub**

## Cum Să Te Pregătești

1. Construiește produsul minim
2. Obține primii clienți
3. Formează echipa
4. Pregătește pitch deck
5. Networking constant`
          },
          {
            title: 'Pregătirea Pitch-ului Perfect',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Pregătirea Pitch-ului Perfect

## Structura Pitch Deck (10-12 slides)

### Slide 1: Titlu
- Logo și nume
- One-liner: Ce faci în 10 cuvinte
- Datele de contact

### Slide 2: Problema
- Ce problemă rezolvi
- Cât de mare e problema
- Cine o are

### Slide 3: Soluția
- Cum rezolvi problema
- De ce e mai bun decât alternativele
- Demo sau screenshot

### Slide 4: Piața
- TAM, SAM, SOM
- Tendințe de creștere
- Surse credibile

### Slide 5: Produsul
- Funcționalități cheie
- Roadmap
- Proprietate intelectuală

### Slide 6: Model de Business
- Cum faci bani
- Prețuri
- Unit economics

### Slide 7: Tracțiune
- Metrici cheie
- Creștere
- Clienți notabili

### Slide 8: Competiția
- Peisaj competitiv
- Diferențiatori
- Bariere de intrare

### Slide 9: Echipa
- Fondatori și roluri
- Experiență relevantă
- Advisory board

### Slide 10: Financiar
- Proiecții 3-5 ani
- Nevoi de finanțare
- Utilizarea fondurilor

### Slide 11: Ask
- Cât ceri
- Ce oferi (equity)
- Timeline

## Sfaturi pentru Pitch

### Conținut
✅ Spune o poveste
✅ Folosește date concrete
✅ Arată, nu doar spune
✅ Fii concis

### Prezentare
✅ Exersează de 50+ ori
✅ Cronometrează (5-10 min)
✅ Pregătește Q&A
✅ Fii pasionat dar realist

### Evită
❌ Prea multe slide-uri
❌ Text mult
❌ Proiecții nerealiste
❌ Subestimarea competiției`
          },
          {
            title: 'Negocierea și Term Sheet',
            type: 'TEXT',
            duration: 13,
            order: 3,
            content: `# Negocierea și Term Sheet

## Ce Este un Term Sheet?

Document non-obligatoriu care stabilește:
- Termenii principali ai investiției
- Valuation-ul
- Drepturile părților

## Termeni Cheie de Înțeles

### Valuation
- **Pre-money**: Valoarea înainte de investiție
- **Post-money**: Pre-money + investiție

Exemplu:
- Pre-money: 1M EUR
- Investiție: 250k EUR
- Post-money: 1.25M EUR
- Dilutie: 20%

### Equity vs Convertible Note

**Equity (Acțiuni)**
- Valuation fix
- Drepturi de vot
- Dividende

**Convertible Note**
- Împrumut convertibil
- Discount la runda următoare
- Cap pe valuation

### Drepturi Investitori

- **Pro-rata**: Dreptul de a investi în runde viitoare
- **Anti-dilution**: Protecție la down-rounds
- **Liquidation preference**: Prioritate la exit
- **Board seat**: Loc în consiliu

### Vesting
Acțiunile fondatorilor se "câștigă" în timp:
- Tipic: 4 ani cu 1 an cliff
- Protejează toți stakeholderii

## Due Diligence

Ce vor verifica investitorii:
- Documente legale
- Financiare
- Proprietate intelectuală
- Contracte
- Echipa

## Sfaturi de Negociere

✅ Cunoaște-ți BATNA (alternativa)
✅ Nu te grăbi
✅ Ia un avocat specializat
✅ Focus pe control, nu doar valuation
✅ Gândește pe termen lung

## Red Flags

❌ Full ratchet anti-dilution
❌ Participating preferred
❌ Control excesiv pentru investitor
❌ Vesting accelerat doar pentru investitor`
          }
        ]
      },
      {
        title: 'Alte Surse de Finanțare',
        description: 'Crowdfunding și alternative',
        order: 3,
        duration: 25,
        lessons: [
          {
            title: 'Crowdfunding în România',
            type: 'TEXT',
            duration: 12,
            order: 1,
            content: `# Crowdfunding în România

## Tipuri de Crowdfunding

### 1. Reward-Based
Primești un produs/serviciu în schimb.

**Platforme:**
- Kickstarter (internațional)
- Indiegogo
- Crestemidei.ro (local)

**Potrivit pentru:**
- Produse fizice
- Proiecte creative
- Validare piață

### 2. Equity Crowdfunding
Vinzi acțiuni către publicul larg.

**Platforme:**
- SeedBlink (România)
- Crowdcube
- Republic

**Potrivit pentru:**
- Start-up-uri tech
- Companii cu tracțiune

### 3. Lending Crowdfunding
Împrumuturi de la persoane fizice.

**Platforme:**
- Mintos
- Bondora

## Cum Să Faci o Campanie de Succes

### Pre-lansare (2-3 luni înainte)
- Construiește audiență
- Creează așteptare
- Pregătește materialele

### Elementele Campaniei
- Video compelling (sub 3 minute)
- Descriere clară a produsului
- Recompense atractive
- Stretch goals

### Lansare
- Primele 48h sunt critice
- Activează comunitatea
- 30% din target în primele zile

### Promovare
- Social media intensiv
- PR și presa
- Influenceri relevanți
- Email marketing

## Statistici

- Rata de succes Kickstarter: ~40%
- Suma medie colectată: 10-50k USD
- Taxe platformă: 5-10%

## Avantaje și Dezavantaje

### Avantaje
✅ Validare piață
✅ Pre-comenzi
✅ Marketing gratuit
✅ Comunitate de early adopters

### Dezavantaje
❌ Efort mare de promovare
❌ Risc reputațional
❌ Obligații către backers
❌ Taxe și comisioane`
          },
          {
            title: 'Concluzie și Plan de Acțiune',
            type: 'TEXT',
            duration: 13,
            order: 2,
            content: `# Concluzie - Plan de Acțiune Finanțare

## Recapitulare

### Modul 1: Opțiuni de Finanțare
- Bootstrapping și FFF
- Fonduri europene (Start-Up Nation)
- Credite bancare (IMM Invest)

### Modul 2: Investitori
- Business Angels și VC
- Pitch deck perfect
- Negocierea term sheet-ului

### Modul 3: Alternative
- Crowdfunding
- Granturi și competiții

## Alegerea Strategiei

### Pentru Validare (0-50k EUR)
1. Bootstrapping
2. FFF
3. Crowdfunding
4. Acceleratoare

### Pentru Produs (50-200k EUR)
1. Business Angels
2. Granturi (Start-Up Nation)
3. Pre-seed VC

### Pentru Scalare (200k+ EUR)
1. Seed VC
2. Credite IMM Invest
3. Series A

## Plan de Acțiune

### Luna 1-2: Pregătire
- [ ] Finalizează produsul/serviciul
- [ ] Obține primii clienți
- [ ] Calculează nevoia de finanțare

### Luna 3-4: Documentație
- [ ] Scrie planul de afaceri
- [ ] Creează pitch deck
- [ ] Pregătește proiecții financiare

### Luna 5-6: Aplicare/Pitch
- [ ] Aplică la granturi eligibile
- [ ] Contactează angels/VC
- [ ] Participă la evenimente

### Continuu
- [ ] Networking constant
- [ ] Actualizează metrici
- [ ] Îmbunătățește pitch-ul

## Resurse

- [/services/business-formation](/services/business-formation) - Înființare firmă
- [/templates](/templates) - Șabloane documente
- [/blog](/blog) - Articole finanțare

## Succes!

Ai acum cunoștințele necesare pentru a-ți finanța start-up-ul.

Fiecare sursă de finanțare are avantaje și dezavantaje - alege strategic în funcție de stadiul și obiectivele tale.

🚀 Mult succes în atragerea finanțării!`
          }
        ]
      }
    ]
  }
];
