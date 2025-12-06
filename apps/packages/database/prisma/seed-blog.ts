/**
 * Blog Content Seed Data for DocumentIulia.ro
 * Romanian accounting blog categories and sample posts
 */

export const blogCategories = [
  {
    name: 'Legislație Fiscală',
    slug: 'legislatie-fiscala',
    description: 'Actualizări și analize privind legislația fiscală românească',
    icon: 'gavel',
    color: '#ef4444',
    sortOrder: 1,
  },
  {
    name: 'TVA și Impozite',
    slug: 'tva-impozite',
    description: 'Ghiduri practice pentru TVA, impozit pe profit și alte taxe',
    icon: 'percent',
    color: '#f59e0b',
    sortOrder: 2,
  },
  {
    name: 'e-Factura & ANAF',
    slug: 'efactura-anaf',
    description: 'Totul despre sistemul e-Factura și relația cu ANAF',
    icon: 'file-text',
    color: '#10b981',
    sortOrder: 3,
  },
  {
    name: 'Contabilitate Practică',
    slug: 'contabilitate-practica',
    description: 'Sfaturi și tutoriale pentru contabilitatea de zi cu zi',
    icon: 'calculator',
    color: '#3b82f6',
    sortOrder: 4,
  },
  {
    name: 'Startup & Antreprenoriat',
    slug: 'startup-antreprenoriat',
    description: 'Ghiduri fiscale pentru startup-uri și antreprenori',
    icon: 'rocket',
    color: '#8b5cf6',
    sortOrder: 5,
  },
  {
    name: 'Resurse Umane',
    slug: 'resurse-umane',
    description: 'Legislația muncii, salarizare și contribuții',
    icon: 'users',
    color: '#ec4899',
    sortOrder: 6,
  },
];

export const blogPosts = [
  {
    title: 'Ghid Complet: e-Factura pentru Întreprinderi Mici 2025',
    slug: 'ghid-complet-efactura-intreprinderi-mici-2025',
    excerpt: 'Tot ce trebuie să știți despre implementarea e-Factura în firma dumneavoastră. De la înregistrare până la prima factură electronică.',
    content: `
# Ghid Complet: e-Factura pentru Întreprinderi Mici 2025

Sistemul e-Factura devine obligatoriu pentru toate firmele din România. În acest ghid vă explicăm pas cu pas cum să vă conformați noilor cerințe legale.

## Ce este e-Factura?

e-Factura este sistemul național de facturare electronică administrat de ANAF. Începând cu 2025, toate facturile B2B trebuie transmise prin acest sistem.

## Pașii pentru Implementare

### 1. Înregistrarea în SPV

Primul pas este să vă înregistrați în Spațiul Privat Virtual (SPV) de pe site-ul ANAF.

### 2. Obținerea certificatului digital

Aveți nevoie de un certificat digital calificat pentru semnarea facturilor. Puteți obține unul de la:
- CertSign
- DigiSign
- Trans Sped

### 3. Alegerea unei soluții software

Opțiuni disponibile:
- **DocumentIulia.ro** - soluție completă cu integrare directă ANAF
- Software de contabilitate cu modul e-Factura
- Aplicația gratuită ANAF (funcționalitate limitată)

### 4. Testarea în mediul de test

Înainte de a trimite facturi reale, testați în mediul sandbox ANAF.

## Termene Limită

| Tip Firmă | Termen |
|-----------|--------|
| Firme mari | 1 Ianuarie 2025 |
| IMM-uri | 1 Iulie 2025 |
| Microîntreprinderi | 1 Ianuarie 2026 |

## Concluzii

Nu așteptați ultimul moment! Începeți implementarea acum pentru a evita problemele de ultima oră.

---

*Articol actualizat conform OUG 130/2024*
    `,
    categorySlug: 'efactura-anaf',
    tags: ['efactura', 'anaf', 'facturare', 'ghid', 'obligatoriu'],
    metaTitle: 'Ghid e-Factura 2025 - Tot ce trebuie să știți',
    metaDescription: 'Ghid complet pentru implementarea e-Factura în firmele mici. Termene, pași și soluții software recomandate.',
    readingTime: 8,
    wordCount: 350,
  },
  {
    title: 'Modificări TVA 2025: Ce se schimbă pentru firme',
    slug: 'modificari-tva-2025-ce-se-schimba',
    excerpt: 'Analiză completă a modificărilor TVA care intră în vigoare în 2025. Cote noi, scutiri și obligații de raportare.',
    content: `
# Modificări TVA 2025: Ce se schimbă pentru firme

Anul 2025 aduce schimbări importante în legislația TVA din România. Iată ce trebuie să știți.

## Noile Cote TVA

### Cota standard: 19%
Se menține cota standard de 19% pentru majoritatea bunurilor și serviciilor.

### Cota redusă: 9%
Se aplică pentru:
- Alimente de bază
- Medicamente
- Cărți și publicații
- Cazare hotelieră

### Cota redusă: 5%
Nouă cotă pentru:
- Produse ecologice certificate
- Energie verde
- Transport electric public

## Noi Obligații de Raportare

### SAF-T D406
Declarația SAF-T devine obligatorie pentru:
- Contribuabili mari: din ianuarie 2025
- Contribuabili mijlocii: din iulie 2025
- Contribuabili mici: din ianuarie 2026

### E-Transport
Monitorizarea transporturilor pentru anumite categorii de bunuri.

## Sfaturi Practice

1. **Actualizați software-ul** de contabilitate pentru noile cote
2. **Verificați clasificarea** produselor și serviciilor
3. **Instruiți personalul** cu privire la modificări
4. **Consultați un expert** pentru cazuri complexe

## Resurse Utile

- [Site ANAF - TVA](https://www.anaf.ro)
- [Codul Fiscal actualizat](https://legislatie.just.ro)

---

*Informații valabile la data publicării. Verificați modificările legislative ulterioare.*
    `,
    categorySlug: 'tva-impozite',
    tags: ['tva', 'impozite', 'legislatie', '2025', 'cote'],
    metaTitle: 'Modificări TVA 2025 - Ghid complet pentru firme',
    metaDescription: 'Tot ce trebuie să știți despre modificările TVA din 2025. Cote noi, scutiri, SAF-T și obligații de raportare.',
    readingTime: 6,
    wordCount: 280,
  },
  {
    title: 'Cum să Îți Deschizi un SRL în România: Ghid Pas cu Pas',
    slug: 'cum-sa-iti-deschizi-srl-romania-ghid',
    excerpt: 'Ghid complet pentru înființarea unui SRL în România. De la documentație până la prima factură.',
    content: `
# Cum să Îți Deschizi un SRL în România

Visezi să îți deschizi propria afacere? Iată tot ce trebuie să știi despre înființarea unui SRL în România.

## De ce SRL?

Societatea cu Răspundere Limitată (SRL) este cea mai populară formă juridică pentru afaceri mici și mijlocii în România, datorită:

- Răspundere limitată la capitalul social
- Flexibilitate în management
- Posibilitatea de a avea asociați multipli
- Credibilitate în fața partenerilor

## Cerințe Minime

| Element | Cerință |
|---------|---------|
| Capital social minim | 1 RON (recomandat 200 RON) |
| Asociați | 1-50 persoane |
| Administrator | Cel puțin 1 persoană |
| Sediu social | Adresă validă în România |

## Pașii pentru Înființare

### Pasul 1: Alegerea Denumirii
Verificați disponibilitatea la ONRC folosind portalul online.

### Pasul 2: Pregătirea Documentelor
- Act constitutiv
- Declarație pe proprie răspundere administrator
- Specimen de semnătură
- Dovada sediului social

### Pasul 3: Depunerea la ONRC
Puteți depune:
- Online prin portalul ONRC
- Personal la Registrul Comerțului

### Pasul 4: Înregistrarea Fiscală
După obținerea certificatului de înregistrare, veți fi înregistrați automat la ANAF.

### Pasul 5: Opțiuni Fiscale
Alegeți regimul fiscal:
- **Microîntreprindere**: impozit 1% pe venit
- **Impozit pe profit**: 16% pe profit

## Costuri Estimate

| Element | Cost (RON) |
|---------|------------|
| Taxe ONRC | 100-300 |
| Rezervare denumire | 36 |
| Notariat (opțional) | 200-500 |
| Contabil | 50-150/lună |

## După Înființare

1. Deschideți cont bancar firmă
2. Alegeți un software de contabilitate (recomandat: DocumentIulia.ro)
3. Înregistrați-vă pentru e-Factura
4. Stabiliți contractele cu furnizorii

---

*Succes în afaceri!*
    `,
    categorySlug: 'startup-antreprenoriat',
    tags: ['srl', 'infiintare', 'antreprenoriat', 'ghid', 'onrc'],
    metaTitle: 'Cum să deschizi un SRL în România - Ghid 2025',
    metaDescription: 'Ghid complet pentru înființarea SRL în România. Documente necesare, costuri, pași și sfaturi practice pentru antreprenori.',
    readingTime: 7,
    wordCount: 400,
  },
  {
    title: 'SAF-T D406: Tot ce trebuie să știți despre noua raportare fiscală',
    slug: 'saft-d406-ghid-raportare-fiscala',
    excerpt: 'Explicații complete despre declarația SAF-T D406, formatele XML și cum să vă pregătiți pentru implementare.',
    content: `
# SAF-T D406: Ghid Complet de Raportare Fiscală

SAF-T (Standard Audit File for Tax) este un standard internațional de raportare fiscală adoptat de România pentru îmbunătățirea colectării taxelor.

## Ce este SAF-T D406?

SAF-T D406 este declarația informativă care conține toate tranzacțiile contabile ale unei firme într-un format XML standardizat.

## Cine trebuie să depună?

### Calendar de Implementare

| Categorie | Data Start |
|-----------|------------|
| Contribuabili mari | Ianuarie 2025 |
| Contribuabili mijlocii | Iulie 2025 |
| Contribuabili mici | Ianuarie 2026 |

## Structura Fișierului SAF-T

Declarația D406 include:

1. **Header** - Informații despre firmă
2. **MasterFiles** - Date master (clienți, furnizori, produse)
3. **GeneralLedgerEntries** - Înregistrări contabile
4. **SourceDocuments** - Documente sursă (facturi, plăți)

## Cum să vă pregătiți?

### 1. Verificați software-ul
Asigurați-vă că programul de contabilitate poate genera XML SAF-T.

### 2. Curățați datele
- Verificați codurile fiscale
- Completați datele lipsă
- Corectați erorile de înregistrare

### 3. Testați exportul
Validați fișierul XML folosind validatorul ANAF.

### 4. Stabiliți proceduri
Definiți cine și când generează și transmite declarația.

## Erori Frecvente

- CUI-uri invalide
- Conturi contabile neconforme
- Sume care nu se balansează
- Format XML incorect

## Penalități

Nedepunerea sau depunerea incorectă poate atrage amenzi de:
- 1.000 - 5.000 RON pentru persoane juridice
- 500 - 2.500 RON pentru PFA

---

*DocumentIulia.ro generează automat fișierul SAF-T D406 conform cerințelor ANAF.*
    `,
    categorySlug: 'legislatie-fiscala',
    tags: ['saft', 'd406', 'anaf', 'raportare', 'xml'],
    metaTitle: 'SAF-T D406 - Ghid complet raportare fiscală România',
    metaDescription: 'Tot ce trebuie să știți despre SAF-T D406: termene, structura XML, pregătire și cum să evitați penalitățile.',
    readingTime: 6,
    wordCount: 350,
  },
  {
    title: 'Cheltuieli Deductibile: Ce Poți Deduce din Impozite',
    slug: 'cheltuieli-deductibile-ghid-complet',
    excerpt: 'Lista completă a cheltuielilor deductibile fiscal pentru SRL-uri și PFA. Maximizează economiile legale!',
    content: `
# Cheltuieli Deductibile: Ghid Complet 2025

Înțelegerea cheltuielilor deductibile vă poate economisi mii de lei anual. Iată ce puteți deduce legal.

## Cheltuieli 100% Deductibile

### Cheltuieli Operaționale
- Salarii și contribuții sociale
- Chirii și utilități pentru sediu
- Materiale și consumabile
- Servicii contabilitate și juridice
- Asigurări profesionale
- Abonamente software

### Cheltuieli de Marketing
- Publicitate online și offline
- Website și hosting
- Materiale promoționale
- Participări la târguri

### Cheltuieli cu Personalul
- Training și cursuri profesionale
- Echipamente de protecție
- Tichete de masă (limită legală)
- Abonamente medicale

## Cheltuieli Parțial Deductibile

### Autoturisme
- 50% din cheltuieli pentru autoturisme
- Excepție: 100% pentru activități specifice (taxi, transport)

### Protocol
- Limită: 2% din cifra de afaceri
- Necesită documente justificative

### Sponsorizări
- Maximum 0.75% din cifra de afaceri
- 20% din impozitul pe profit

## Cheltuieli Nedeductibile

❌ Amenzi și penalități
❌ Cheltuieli personale
❌ Donații către persoane fizice
❌ Cheltuieli fără documente

## Documente Necesare

Pentru fiecare cheltuială aveți nevoie de:
1. Factură fiscală
2. Dovada plății
3. Recepție/acceptare (pentru servicii)

## Sfaturi Practice

1. **Păstrați toate facturile** - minimum 10 ani
2. **Utilizați card firmă** - trasabilitate clară
3. **Consultați contabilul** - pentru situații speciale
4. **Digitalizați documentele** - backup sigur

---

*Consultați un expert contabil pentru situația dumneavoastră specifică.*
    `,
    categorySlug: 'contabilitate-practica',
    tags: ['deductibil', 'cheltuieli', 'impozit', 'economii', 'ghid'],
    metaTitle: 'Cheltuieli Deductibile 2025 - Ce poți deduce legal',
    metaDescription: 'Ghid complet cheltuieli deductibile pentru SRL și PFA. Lista completă, limite și documente necesare pentru economii fiscale legale.',
    readingTime: 5,
    wordCount: 320,
  },
  {
    title: 'Contribuții Sociale 2025: Ghid Complet pentru Angajatori',
    slug: 'contributii-sociale-2025-ghid-angajatori',
    excerpt: 'Toate contribuțiile sociale pentru angajatori în 2025. CAS, CASS, contribuție asiguratorie și calcule practice.',
    content: `
# Contribuții Sociale 2025: Ghid pentru Angajatori

Calculul corect al contribuțiilor sociale este esențial pentru conformitatea fiscală. Iată ghidul complet pentru 2025.

## Contribuții Salariat

| Contribuție | Cotă | Bază |
|-------------|------|------|
| CAS (pensie) | 25% | Salariu brut |
| CASS (sănătate) | 10% | Salariu brut |
| Impozit pe venit | 10% | Venit net |

## Contribuții Angajator

| Contribuție | Cotă | Bază |
|-------------|------|------|
| CAM | 2.25% | Fond salarii |

## Exemplu Calcul

**Salariu brut: 5.000 RON**

### Contribuții salariat:
- CAS: 5.000 × 25% = 1.250 RON
- CASS: 5.000 × 10% = 500 RON
- Impozit: (5.000 - 1.250 - 500) × 10% = 325 RON

**Salariu net: 2.925 RON**

### Cost total angajator:
- Salariu brut: 5.000 RON
- CAM: 5.000 × 2.25% = 112.50 RON

**Total cost angajator: 5.112.50 RON**

## Deduceri și Facilități

### Deducere personală
Se aplică pentru salarii sub plafonul legal, în funcție de persoane în întreținere.

### Scutiri IT
Angajații din IT beneficiază de scutire impozit pe venit (10%).

### Sector construcții
Facilități speciale pentru domeniului construcțiilor.

## Termene de Plată

| Declarație | Termen |
|------------|--------|
| D112 | 25 luna următoare |
| Plată contribuții | 25 luna următoare |

## Penalități

- Întârziere plată: 0.01% pe zi
- Nedepunere declarații: amenzi semnificative

---

*DocumentIulia.ro calculează automat toate contribuțiile și generează declarația D112.*
    `,
    categorySlug: 'resurse-umane',
    tags: ['contributii', 'salarii', 'cas', 'cass', 'angajator'],
    metaTitle: 'Contribuții Sociale 2025 - Ghid complet angajatori',
    metaDescription: 'Ghid complet contribuții sociale pentru angajatori: CAS, CASS, CAM, impozit pe venit. Exemple de calcul și termene.',
    readingTime: 5,
    wordCount: 300,
  },
];

// Forum seed data
export const forumCategories = [
  {
    name: 'Întrebări Generale',
    slug: 'intrebari-generale',
    description: 'Întrebări generale despre contabilitate și fiscalitate',
    icon: 'help-circle',
    color: '#3b82f6',
    sortOrder: 1,
  },
  {
    name: 'e-Factura & ANAF',
    slug: 'efactura-anaf',
    description: 'Discuții despre sistemul e-Factura și relația cu ANAF',
    icon: 'file-text',
    color: '#10b981',
    sortOrder: 2,
  },
  {
    name: 'TVA și Impozite',
    slug: 'tva-impozite',
    description: 'Întrebări despre TVA, impozit pe profit și alte taxe',
    icon: 'percent',
    color: '#f59e0b',
    sortOrder: 3,
  },
  {
    name: 'Salarii și HR',
    slug: 'salarii-hr',
    description: 'Discuții despre salarii, contribuții și legislația muncii',
    icon: 'users',
    color: '#ec4899',
    sortOrder: 4,
  },
  {
    name: 'DocumentIulia.ro',
    slug: 'documentiulia',
    description: 'Întrebări și feedback despre platforma DocumentIulia',
    icon: 'message-circle',
    color: '#8b5cf6',
    sortOrder: 5,
  },
];

export const forumTopics = [
  {
    categorySlug: 'intrebari-generale',
    title: 'Cum să aleg între microîntreprindere și impozit pe profit?',
    content: `Bună ziua,

Am un SRL nou înființat și nu știu ce regim fiscal să aleg. Care sunt avantajele și dezavantajele fiecăruia?

Cifra de afaceri estimată: 100.000 RON/an
Cheltuieli estimate: 30.000 RON/an

Mulțumesc anticipat!`,
    tags: ['microintreprindere', 'impozit-profit', 'alegere'],
  },
  {
    categorySlug: 'efactura-anaf',
    title: 'Eroare la transmiterea e-Factura: "CIF invalid"',
    content: `Am încercat să trimit o factură prin e-Factura dar primesc eroarea "CIF invalid pentru client".

Am verificat și CIF-ul este corect în baza de date ANAF. Ce poate fi problema?

Mulțumesc!`,
    tags: ['eroare', 'cif', 'efactura'],
  },
  {
    categorySlug: 'tva-impozite',
    title: 'Când devine obligatorie înregistrarea în scopuri de TVA?',
    content: `Bună ziua,

Sunt PFA și am depășit recent pragul de 300.000 RON cifră de afaceri.

Întrebări:
1. În cât timp trebuie să mă înregistrez pentru TVA?
2. Care sunt obligațiile după înregistrare?
3. Pot deduce TVA pentru achizițiile anterioare?

Mulțumesc!`,
    tags: ['tva', 'prag', 'inregistrare'],
  },
  {
    categorySlug: 'salarii-hr',
    title: 'Calcul concediu de odihnă - zile lucratoare vs calendaristice',
    content: `Am o nelămurire legată de calculul zilelor de concediu.

Angajatul are dreptul la 21 de zile lucrătoare de concediu. Dacă ia concediu o săptămână (luni-vineri), câte zile se scad?

5 zile (lucrătoare) sau 7 zile (calendaristice)?

Mulțumesc!`,
    tags: ['concediu', 'calcul', 'zile-lucratoare'],
  },
  {
    categorySlug: 'documentiulia',
    title: 'Cum să import facturile din alt software?',
    content: `Tocmai am trecut pe DocumentIulia și aș vrea să import facturile din vechiul program de contabilitate.

Aveți un ghid sau template pentru import CSV/Excel?

Mulțumesc!`,
    tags: ['import', 'migrare', 'csv'],
  },
];
