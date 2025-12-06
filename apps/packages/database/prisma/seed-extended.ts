/**
 * Extended seed file for generating bulk content
 * - 50 forum threads across categories
 * - 20 course lessons
 * - 15 additional blog posts
 */

import { PrismaClient, BlogPostStatus, CourseDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

// Forum topics with realistic Romanian accounting content
export const extendedForumTopics = [
  // e-Factura (10 topics)
  {
    categorySlug: 'e-factura',
    title: 'Cum configurez corect XMLul pentru e-Factura?',
    content: 'Am început să implementez e-Factura și am probleme cu structura XML. Care sunt câmpurile obligatorii și cum trebuie formatate datele? Mulțumesc pentru ajutor!',
    tags: ['e-factura', 'xml', 'configurare'],
  },
  {
    categorySlug: 'e-factura',
    title: 'Eroare cod 4001 la trimiterea e-Facturii',
    content: 'Primesc constant eroarea 4001 când încerc să trimit factura la ANAF. Am verificat CIF-ul și pare corect. Ce alte cauze pot fi?',
    tags: ['e-factura', 'eroare', 'anaf'],
  },
  {
    categorySlug: 'e-factura',
    title: 'e-Factura pentru servicii intracomunitare',
    content: 'Cum trebuie să emit e-Factura pentru un client din Germania? Ce coduri TVA folosesc și cum raportez în SPV?',
    tags: ['e-factura', 'intracomunitar', 'tva'],
  },
  {
    categorySlug: 'e-factura',
    title: 'Certificat digital pentru e-Factura - ce tip am nevoie?',
    content: 'Vreau să semnez digital facturile pentru e-Factura. Ce tip de certificat digital am nevoie și de unde îl pot obține?',
    tags: ['e-factura', 'certificat', 'semnatura'],
  },
  {
    categorySlug: 'e-factura',
    title: 'Termenul de încărcare e-Factura pentru B2C',
    content: 'Care este termenul legal pentru încărcarea unei e-Facturi B2C? Am citit că sunt 5 zile, dar nu sunt sigur.',
    tags: ['e-factura', 'termen', 'b2c'],
  },
  {
    categorySlug: 'e-factura',
    title: 'Stornare factură în e-Factura - procedura corectă',
    content: 'Trebuie să stornez o factură deja trimisă la ANAF. Care este procedura corectă? Emit factură de stornare și o trimit separat?',
    tags: ['e-factura', 'stornare', 'procedura'],
  },
  {
    categorySlug: 'e-factura',
    title: 'Integrare API e-Factura cu soft propriu',
    content: 'Dezvoltăm un soft de facturare și vrem să integrăm e-Factura. Ce documentație recomandați pentru API-ul ANAF?',
    tags: ['e-factura', 'api', 'integrare'],
  },
  {
    categorySlug: 'e-factura',
    title: 'Descărcarea facturilor primite din SPV',
    content: 'Cum pot descărca automat facturile primite de la furnizori din SPV? Există un API pentru asta?',
    tags: ['e-factura', 'spv', 'descarcare'],
  },
  {
    categorySlug: 'e-factura',
    title: 'e-Factura și RO e-Transport - conexiune?',
    content: 'Există vreo legătură între e-Factura și sistemul RO e-Transport? Trebuie să transmit ambele pentru o vânzare?',
    tags: ['e-factura', 'e-transport', 'anaf'],
  },
  {
    categorySlug: 'e-factura',
    title: 'Format factura proforme în e-Factura',
    content: 'Facturile proforme trebuie transmise prin e-Factura sau doar cele fiscale definitive?',
    tags: ['e-factura', 'proforma', 'intrebare'],
  },

  // SAF-T (10 topics)
  {
    categorySlug: 'saft',
    title: 'Cum completez secțiunea GeneralLedgerEntries în SAF-T?',
    content: 'Am probleme cu completarea jurnalelor contabile în SAF-T. Care sunt câmpurile obligatorii pentru GeneralLedgerEntries?',
    tags: ['saft', 'd406', 'jurnal'],
  },
  {
    categorySlug: 'saft',
    title: 'Validare SAF-T - eroare la Suppliers',
    content: 'La validarea fișierului SAF-T primesc eroare pe secțiunea Suppliers. CIF-urile sunt corecte dar tot dă eroare.',
    tags: ['saft', 'validare', 'furnizori'],
  },
  {
    categorySlug: 'saft',
    title: 'Periodicitatea transmiterii SAF-T pentru microîntreprinderi',
    content: 'Ca microîntreprindere, cât de des trebuie să transmit SAF-T? Lunar, trimestrial sau anual?',
    tags: ['saft', 'periodicitate', 'micro'],
  },
  {
    categorySlug: 'saft',
    title: 'SAF-T și conturile din afara bilanțului',
    content: 'Conturile din afara bilanțului (clasa 8) trebuie incluse în raportarea SAF-T sau nu?',
    tags: ['saft', 'conturi', 'bilant'],
  },
  {
    categorySlug: 'saft',
    title: 'Corespondența planului de conturi cu nomenclatorul ANAF',
    content: 'Cum fac corespondența între planul meu de conturi și nomenclatorul oficial ANAF pentru SAF-T?',
    tags: ['saft', 'plan-conturi', 'nomenclator'],
  },
  {
    categorySlug: 'saft',
    title: 'Softul de contabilitate nu exportă SAF-T corect',
    content: 'Folosesc un soft mai vechi care nu generează SAF-T conform ultimelor cerințe. Ce soluții am?',
    tags: ['saft', 'soft', 'export'],
  },
  {
    categorySlug: 'saft',
    title: 'SAF-T pentru PFA - este obligatoriu?',
    content: 'Ca PFA cu contabilitate în partidă simplă, sunt obligat să transmit SAF-T?',
    tags: ['saft', 'pfa', 'obligativitate'],
  },
  {
    categorySlug: 'saft',
    title: 'Corectarea unui SAF-T deja transmis',
    content: 'Am transmis un SAF-T cu erori. Cum fac corectura? Trimit un nou fișier sau există altă procedură?',
    tags: ['saft', 'corectare', 'procedura'],
  },
  {
    categorySlug: 'saft',
    title: 'Inventarul în SAF-T - mapare coduri produse',
    content: 'Cum map-uiez codurile de produs din gestiune cu cele necesare pentru SAF-T?',
    tags: ['saft', 'inventar', 'mapare'],
  },
  {
    categorySlug: 'saft',
    title: 'SAF-T și sucursalele - raportare consolidată?',
    content: 'Avem mai multe puncte de lucru. Transmitem un singur SAF-T consolidat sau câte unul per locație?',
    tags: ['saft', 'sucursale', 'consolidare'],
  },

  // Fiscalitate (15 topics)
  {
    categorySlug: 'fiscalitate',
    title: 'Impozit micro vs impozit profit - când să trec?',
    content: 'Am o microîntreprindere cu venituri crescătoare. La ce prag convine să trec la impozit pe profit?',
    tags: ['impozit', 'micro', 'profit'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'TVA la încasare - avantaje și dezavantaje',
    content: 'Mă gândesc să optez pentru TVA la încasare. Care sunt avantajele și dezavantajele principale?',
    tags: ['tva', 'incasare', 'optiune'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Deducerea TVA pentru autoturisme',
    content: 'Care sunt regulile actuale pentru deducerea TVA la achiziția și întreținerea autoturismelor?',
    tags: ['tva', 'auto', 'deducere'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Declarația 112 - termene și completare',
    content: 'Care sunt termenele de depunere a Declarației 112 și ce trebuie să conțină?',
    tags: ['d112', 'contributii', 'declaratie'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Impozit pe dividende 2025',
    content: 'Care este cota de impozit pe dividende pentru 2025 și cum se calculează?',
    tags: ['dividende', 'impozit', '2025'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Cheltuieli deductibile pentru IT-iști',
    content: 'Ca programator cu PFA, ce cheltuieli pot deduce pentru echipamente și abonamente?',
    tags: ['deductibil', 'it', 'pfa'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Impozitul pe clădiri pentru sediu social',
    content: 'Cum se calculează impozitul pe clădiri când am sediul social în apartament personal?',
    tags: ['impozit', 'cladiri', 'sediu'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Scutire TVA pentru servicii medicale',
    content: 'Care sunt condițiile pentru scutirea de TVA a serviciilor medicale?',
    tags: ['tva', 'scutire', 'medical'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Declarația unică 2025 - modificări importante',
    content: 'Ce modificări au apărut în Declarația unică pentru anul fiscal 2025?',
    tags: ['declaratie-unica', 'pfa', '2025'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Contribuția la sănătate pentru PFA',
    content: 'Cum se calculează contribuția la sănătate pentru un PFA în 2025?',
    tags: ['cas', 'sanatate', 'pfa'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Plăți anticipate impozit profit',
    content: 'Cum se calculează și când se plătesc avansurile pentru impozitul pe profit?',
    tags: ['profit', 'anticipate', 'termene'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Tratamentul fiscal al bonurilor de masă',
    content: 'Cum sunt tratate fiscal bonurile de masă acordate angajaților?',
    tags: ['bonuri', 'salarii', 'deductibil'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Facturare în valută - curs de schimb',
    content: 'Ce curs de schimb folosesc pentru facturi emise în EUR sau USD?',
    tags: ['valuta', 'curs', 'facturare'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Sponsorizări și deductibilitate fiscală',
    content: 'Care sunt condițiile pentru deducerea cheltuielilor cu sponsorizarea?',
    tags: ['sponsorizare', 'deductibil', 'conditii'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'TVA pentru export servicii IT',
    content: 'Cum se aplică TVA pentru servicii de programare prestate către clienți din SUA?',
    tags: ['tva', 'export', 'it'],
  },

  // Contabilitate (10 topics)
  {
    categorySlug: 'contabilitate',
    title: 'Închidere cont 121 - rezultatul exercițiului',
    content: 'Care este procedura corectă de închidere a contului 121 la sfârșitul anului?',
    tags: ['121', 'inchidere', 'rezultat'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Înregistrare avans furnizor',
    content: 'Cum înregistrez corect un avans dat unui furnizor pentru marfă?',
    tags: ['avans', 'furnizor', 'inregistrare'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Diferențe de curs valutar - tratament contabil',
    content: 'Cum se înregistrează diferențele de curs valutar la creanțe și datorii în valută?',
    tags: ['valuta', 'diferente', 'curs'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Amortizarea mijloacelor fixe - metode',
    content: 'Care sunt diferențele între amortizarea liniară, degresivă și accelerată?',
    tags: ['amortizare', 'imobilizari', 'metode'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Provizioane pentru garanții - calcul',
    content: 'Cum calculez și înregistrez provizionul pentru garanții acordate clienților?',
    tags: ['provizioane', 'garantii', 'calcul'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Înregistrare leasing financiar',
    content: 'Care este schema de înregistrare a unui leasing financiar pentru echipamente?',
    tags: ['leasing', 'financiar', 'inregistrare'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Reevaluarea imobilizărilor corporale',
    content: 'Când și cum se face reevaluarea imobilizărilor corporale conform OMFP 1802?',
    tags: ['reevaluare', 'imobilizari', 'omfp'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Contabilitatea stocurilor la cost standard',
    content: 'Cum funcționează metoda costului standard pentru gestiunea stocurilor?',
    tags: ['stocuri', 'cost', 'standard'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Facturi de regularizare utilități',
    content: 'Cum înregistrez facturile de regularizare de la furnizori de utilități?',
    tags: ['utilitati', 'regularizare', 'inregistrare'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Cheltuieli în avans vs cheltuieli anticipate',
    content: 'Care este diferența între conturile 471 și 418? Când folosesc fiecare?',
    tags: ['cheltuieli', 'avans', 'anticipate'],
  },

  // General (5 topics)
  {
    categorySlug: 'general',
    title: 'Recomandări soft contabilitate pentru microîntreprinderi',
    content: 'Căut un soft de contabilitate pentru micro cu integrare e-Factura și SAF-T. Ce recomandați?',
    tags: ['soft', 'recomandare', 'micro'],
  },
  {
    categorySlug: 'general',
    title: 'Cursuri de contabilitate online - merita?',
    content: 'Sunt student și vreau să învăț contabilitate practică. Merită cursurile online sau e mai bun un curs fizic?',
    tags: ['cursuri', 'invatare', 'student'],
  },
  {
    categorySlug: 'general',
    title: 'Externalizare contabilitate - costuri și avantaje',
    content: 'Cât costă externalizarea contabilității pentru un SRL cu 3 angajați?',
    tags: ['externalizare', 'costuri', 'contabil'],
  },
  {
    categorySlug: 'general',
    title: 'Experiența voastră cu ANAF online',
    content: 'Cum vi se pare platforma ANAF pentru depunerea declarațiilor? Am avut probleme frecvente.',
    tags: ['anaf', 'online', 'experienta'],
  },
  {
    categorySlug: 'general',
    title: 'Comunitatea contabililor din România',
    content: 'Există alte forumuri sau grupuri pentru contabili unde să putem schimba experiențe?',
    tags: ['comunitate', 'networking', 'contabili'],
  },
];

// Additional blog posts
export const extendedBlogPosts = [
  {
    title: 'Ghid Complet: Cum să Implementezi e-Factura în 2025',
    slug: 'ghid-implementare-e-factura-2025',
    categorySlug: 'e-factura',
    excerpt: 'Tot ce trebuie să știi despre implementarea sistemului e-Factura în firma ta, pas cu pas.',
    content: `# Ghid Complet: Implementarea e-Factura în 2025

## Introducere

Sistemul e-Factura devine obligatoriu pentru tot mai multe categorii de firme în România. Acest ghid acoperă tot ce trebuie să știți pentru o implementare de succes.

## Ce este e-Factura?

e-Factura este sistemul național de facturare electronică administrat de ANAF. Acesta permite transmiterea și validarea facturilor în format electronic standardizat.

## Pași de Implementare

### 1. Obținerea Certificatului Digital
Primul pas este să obțineți un certificat digital calificat de la un furnizor autorizat.

### 2. Înregistrarea în SPV
Accesați Spațiul Privat Virtual și activați opțiunea pentru e-Factura.

### 3. Configurarea Softului
Asigurați-vă că softul de facturare generează XML în formatul UBL 2.1.

### 4. Testarea
Efectuați teste în mediul de test ANAF înainte de a trimite facturi reale.

## Erori Frecvente

- CIF invalid sau inexistent
- Format XML incorect
- Semnătură digitală invalidă
- Date obligatorii lipsă

## Concluzii

Implementarea e-Factura necesită planificare, dar beneficiile pe termen lung sunt semnificative: reducerea erorilor, automatizare și conformitate fiscală.`,
    tags: ['e-factura', 'implementare', 'ghid', '2025'],
    metaTitle: 'Ghid Implementare e-Factura 2025 | DocumentIulia',
    metaDescription: 'Ghid complet pas cu pas pentru implementarea sistemului e-Factura în firma ta în 2025.',
    readingTime: 8,
    wordCount: 320,
  },
  {
    title: 'SAF-T D406: Tot Ce Trebuie Să Știi',
    slug: 'saft-d406-ghid-complet',
    categorySlug: 'saft',
    excerpt: 'Ghid exhaustiv despre raportarea SAF-T D406, de la pregătire până la transmitere.',
    content: `# SAF-T D406: Ghid Complet pentru Contabili

## Ce este SAF-T?

SAF-T (Standard Audit File for Tax) este un standard internațional pentru raportarea datelor contabile către autoritățile fiscale în format electronic.

## Secțiunile SAF-T

### 1. Header
Informații generale despre contribuabil și perioada de raportare.

### 2. MasterFiles
Date despre conturi, clienți, furnizori și produse.

### 3. GeneralLedgerEntries
Înregistrările contabile din jurnale.

### 4. SourceDocuments
Facturi emise și primite, plăți.

## Validarea Fișierului

ANAF pune la dispoziție un validator online pentru verificarea fișierelor SAF-T.

## Termene de Transmitere

- Contribuabili mari: lunar
- Contribuabili mijlocii: trimestrial
- Microîntreprinderi: anual

## Sfaturi Practice

1. Verificați maparea conturilor
2. Completați corect CIF-urile
3. Validați înainte de transmitere
4. Păstrați o arhivă a fișierelor`,
    tags: ['saft', 'd406', 'raportare', 'anaf'],
    metaTitle: 'SAF-T D406 - Ghid Complet | DocumentIulia',
    metaDescription: 'Tot ce trebuie să știi despre raportarea SAF-T D406 în România.',
    readingTime: 6,
    wordCount: 280,
  },
  {
    title: 'TVA la Încasare vs TVA la Facturare: Care Este Mai Avantajos?',
    slug: 'tva-incasare-vs-facturare-comparatie',
    categorySlug: 'fiscalitate',
    excerpt: 'Analiză comparativă între cele două sisteme TVA și cum să alegi varianta potrivită pentru afacerea ta.',
    content: `# TVA la Încasare vs TVA la Facturare

## Introducere

Alegerea sistemului TVA potrivit poate avea un impact semnificativ asupra cash-flow-ului firmei tale.

## TVA la Facturare (Sistem Normal)

### Avantaje
- Mai simplu de gestionat
- Deducere TVA imediat la primirea facturii
- Nu necesită urmărirea încasărilor

### Dezavantaje
- Plătești TVA înainte de a încasa banii
- Risc de cash-flow negativ

## TVA la Încasare

### Avantaje
- Plătești TVA doar când încasezi
- Cash-flow îmbunătățit
- Protecție la clienți rău-platnici

### Dezavantaje
- Deduci TVA doar la plata facturii
- Administrare mai complexă
- Nu toate facturile sunt eligibile

## Cine Poate Opta?

Firmele cu cifră de afaceri sub plafonul legal pot opta pentru TVA la încasare.

## Concluzie

Alegerea depinde de profilul afacerii, termenii de plată cu clienții și capacitatea de gestionare administrativă.`,
    tags: ['tva', 'incasare', 'facturare', 'comparatie'],
    metaTitle: 'TVA la Încasare vs TVA la Facturare | DocumentIulia',
    metaDescription: 'Comparație detaliată între sistemul TVA la încasare și TVA la facturare pentru a alege varianta optimă.',
    readingTime: 5,
    wordCount: 240,
  },
  {
    title: 'Microîntreprinderi 2025: Reguli Noi și Strategii Fiscale',
    slug: 'microintreprinderi-2025-reguli-strategii',
    categorySlug: 'fiscalitate',
    excerpt: 'Ce schimbări aduce 2025 pentru microîntreprinderi și cum să te adaptezi.',
    content: `# Microîntreprinderi în 2025: Ghid Complet

## Modificări Legislative 2025

Anul 2025 aduce mai multe modificări pentru regimul microîntreprinderilor.

## Plafoane și Cote

- Plafon maxim: verificați legislația în vigoare
- Cotă impozit: în funcție de numărul de angajați
- Excluderi: anumite activități nu mai pot fi micro

## Obligații Noi

### e-Factura
Toate microîntreprinderile trebuie să utilizeze e-Factura.

### SAF-T
Raportarea SAF-T devine obligatorie și pentru micro.

## Strategii de Optimizare

1. Monitorizați plafonul de venituri
2. Evaluați opțiunea pentru impozit pe profit
3. Planificați distribuirea dividendelor

## Când Să Treci la Impozit pe Profit?

Dacă aveți cheltuieli mari deductibile, impozitul pe profit poate fi mai avantajos.`,
    tags: ['micro', 'impozit', '2025', 'strategii'],
    metaTitle: 'Microîntreprinderi 2025 - Reguli și Strategii | DocumentIulia',
    metaDescription: 'Ghid complet despre modificările pentru microîntreprinderi în 2025 și strategii de optimizare fiscală.',
    readingTime: 5,
    wordCount: 220,
  },
  {
    title: 'Declarația 112: Ghid Practic de Completare',
    slug: 'declaratia-112-ghid-completare',
    categorySlug: 'fiscalitate',
    excerpt: 'Cum să completezi corect Declarația 112 pentru contribuții sociale și impozit pe venit.',
    content: `# Declarația 112: Ghid de Completare

## Ce Este Declarația 112?

Declarația 112 este documentul prin care angajatorii raportează contribuțiile sociale și impozitul pe venit reținut de la salariați.

## Secțiuni Principale

### Secțiunea A - Date Angajator
- CIF/CUI
- Denumire
- Adresă

### Secțiunea B - Angajați
- CNP
- Tip contract
- Venituri brute
- Contribuții

### Secțiunea C - Totale
- Sume de plată
- Rectificări

## Termene de Depunere

Declarația se depune lunar, până la data de 25 a lunii următoare.

## Erori Frecvente

- CNP incorect
- Tip contract greșit
- Calcul contribuții eronat

## Sfaturi Practice

1. Folosiți soft de salarizare actualizat
2. Verificați datele angajaților
3. Păstrați evidența declarațiilor depuse`,
    tags: ['d112', 'salarii', 'contributii', 'declaratie'],
    metaTitle: 'Ghid Completare Declarația 112 | DocumentIulia',
    metaDescription: 'Ghid practic pentru completarea corectă a Declarației 112 pentru contribuții sociale.',
    readingTime: 4,
    wordCount: 200,
  },
  {
    title: 'Amortizarea Mijloacelor Fixe: Metode și Calcul',
    slug: 'amortizare-mijloace-fixe-metode-calcul',
    categorySlug: 'contabilitate',
    excerpt: 'Ghid detaliat despre metodele de amortizare și cum să le aplici corect.',
    content: `# Amortizarea Mijloacelor Fixe

## Ce Este Amortizarea?

Amortizarea reprezintă repartizarea sistematică a valorii unui activ pe durata sa de viață utilă.

## Metode de Amortizare

### 1. Amortizare Liniară
- Cel mai simplu calcul
- Valoare constantă lunar/anual
- Formulă: Valoare / Durată

### 2. Amortizare Degresivă
- Rate mai mari la început
- Avantaj fiscal în primii ani
- Coeficienți de multiplicare

### 3. Amortizare Accelerată
- 50% în primul an
- Restul liniar
- Condiții speciale de aplicare

## Exemple Practice

**Exemplu 1: Calculator 5.000 lei, 4 ani**
- Liniar: 1.250 lei/an
- Degresiv: 2.500 lei primul an, apoi liniar

## Aspecte Fiscale

- Amortizarea contabilă poate diferi de cea fiscală
- Atenție la limitele pentru auto`,
    tags: ['amortizare', 'imobilizari', 'calcul', 'metode'],
    metaTitle: 'Amortizarea Mijloacelor Fixe - Metode | DocumentIulia',
    metaDescription: 'Ghid complet despre metodele de amortizare a mijloacelor fixe și calcul practic.',
    readingTime: 5,
    wordCount: 230,
  },
  {
    title: 'Contabilitatea Stocurilor: FIFO, LIFO și CMP',
    slug: 'contabilitate-stocuri-fifo-lifo-cmp',
    categorySlug: 'contabilitate',
    excerpt: 'Comparație între metodele de evaluare a stocurilor și când să folosești fiecare.',
    content: `# Evaluarea Stocurilor: FIFO, LIFO, CMP

## Introducere

Alegerea metodei de evaluare a stocurilor afectează direct costul mărfurilor vândute și profitul raportat.

## Metodele de Evaluare

### FIFO (First In, First Out)
- Primele intrări sunt primele ieșiri
- Stocul final reflectă prețuri recente
- Preferat în perioadă de inflație

### LIFO (Last In, First Out)
- Ultimele intrări sunt primele ieșiri
- Nu mai este permis în IFRS
- Poate fi folosit pentru management

### CMP (Cost Mediu Ponderat)
- Media ponderată a costurilor
- Simplu de calculat
- Uniformitate în evaluare

## Exemplu Practic

**Intrări:**
- 100 buc x 10 lei
- 200 buc x 12 lei

**Ieșire:** 150 buc

| Metodă | Cost Ieșire | Stoc Final |
|--------|-------------|------------|
| FIFO | 1.600 lei | 1.800 lei |
| CMP | 1.700 lei | 1.700 lei |

## Recomandări

Alegeți metoda în funcție de natura afacerii și cerințele de raportare.`,
    tags: ['stocuri', 'fifo', 'cmp', 'evaluare'],
    metaTitle: 'Contabilitatea Stocurilor FIFO LIFO CMP | DocumentIulia',
    metaDescription: 'Comparație completă între metodele de evaluare a stocurilor: FIFO, LIFO și CMP.',
    readingTime: 5,
    wordCount: 250,
  },
  {
    title: 'Cum Să Pregătești Firma Pentru Audit',
    slug: 'pregatire-firma-audit-checklist',
    categorySlug: 'contabilitate',
    excerpt: 'Checklist complet pentru pregătirea firmei în vederea unui audit financiar.',
    content: `# Pregătirea pentru Audit: Ghid Practic

## De Ce Este Important?

O pregătire adecvată reduce timpul de audit și costurile asociate.

## Checklist Pre-Audit

### Documente Contabile
- [ ] Balanță de verificare
- [ ] Jurnale contabile
- [ ] Registre de evidență

### Documente Juridice
- [ ] Acte constitutive
- [ ] Contracte importante
- [ ] Procese verbale AGA

### Reconcilieri
- [ ] Extrase bancare
- [ ] Confirmări solduri
- [ ] Inventariere stocuri

## Erori Frecvente

1. Documente lipsă sau incomplete
2. Reconcilieri neefectuate
3. Politici contabile nedocumentate

## Timeline Recomandat

- **3 luni înainte**: Planificare
- **1 lună înainte**: Pregătire documente
- **1 săptămână înainte**: Verificare finală

## Concluzie

Pregătirea din timp asigură un audit eficient și fără surprize.`,
    tags: ['audit', 'pregatire', 'checklist', 'documente'],
    metaTitle: 'Pregătirea pentru Audit - Checklist | DocumentIulia',
    metaDescription: 'Checklist complet pentru pregătirea firmei în vederea unui audit financiar de succes.',
    readingTime: 4,
    wordCount: 210,
  },
  {
    title: 'Leasing Financiar vs Operațional: Diferențe Contabile',
    slug: 'leasing-financiar-operational-diferente',
    categorySlug: 'contabilitate',
    excerpt: 'Cum se diferențiază tratamentul contabil între leasing financiar și operațional.',
    content: `# Leasing Financiar vs Operațional

## Criterii de Clasificare

### Leasing Financiar
- Transfer de proprietate la final
- Opțiune de cumpărare avantajoasă
- Durata > 75% din viața utilă
- Valoare actualizată > 90% din valoarea justă

### Leasing Operațional
- Nu îndeplinește criteriile financiar
- Similar unei închirieri
- Nu apare în bilanț (pre-IFRS 16)

## Tratament Contabil

### Leasing Financiar
**La începutul contractului:**
\`\`\`
212x = 167 (valoarea justă sau valoarea actualizată)
\`\`\`

**Plata ratelor:**
\`\`\`
666 = 5121 (dobândă)
167 = 5121 (principal)
\`\`\`

### Leasing Operațional
**Plata chiriei:**
\`\`\`
612 = 5121 (chirie)
\`\`\`

## Impactul IFRS 16

Standardul IFRS 16 schimbă semnificativ tratamentul leasingului operațional pentru locatari.`,
    tags: ['leasing', 'financiar', 'operational', 'contabilitate'],
    metaTitle: 'Leasing Financiar vs Operațional | DocumentIulia',
    metaDescription: 'Diferențele contabile între leasing financiar și operațional explicate pe înțelesul tuturor.',
    readingTime: 5,
    wordCount: 230,
  },
  {
    title: 'Calendar Fiscal 2025: Toate Termenele Importante',
    slug: 'calendar-fiscal-2025-termene',
    categorySlug: 'fiscalitate',
    excerpt: 'Calendar complet cu toate termenele fiscale importante pentru anul 2025.',
    content: `# Calendar Fiscal 2025

## Ianuarie
- **25 ian**: D112 decembrie, TVA decembrie
- **31 ian**: Inventariere anuală

## Februarie
- **25 feb**: D112, TVA, D300
- **28 feb**: Recapitulativ 390

## Trimestrul I
- **25 apr**: D100 trimestrial
- **30 apr**: Bilanț provisoriu

## Declarații Anuale
- **25 martie**: D101 (profit anual)
- **25 mai**: Declarație unică PFA
- **30 iunie**: Situații financiare

## e-Factura
- Transmitere în maxim 5 zile de la emitere
- Verificare zilnică în SPV

## SAF-T
- Mari contribuabili: lunar
- Contribuabili mijlocii: trimestrial
- Microîntreprinderi: anual

## Sfaturi Practice

1. Setați alerte în calendar
2. Verificați modificările legislative
3. Consultați contabilul periodic`,
    tags: ['calendar', 'termene', '2025', 'fiscal'],
    metaTitle: 'Calendar Fiscal 2025 - Termene | DocumentIulia',
    metaDescription: 'Calendar complet cu toate termenele fiscale importante pentru anul 2025 în România.',
    readingTime: 4,
    wordCount: 200,
  },
  {
    title: 'Optimizare Fiscală Legală pentru SRL',
    slug: 'optimizare-fiscala-legala-srl',
    categorySlug: 'fiscalitate',
    excerpt: 'Strategii legale de optimizare fiscală pentru societăți cu răspundere limitată.',
    content: `# Optimizare Fiscală Legală pentru SRL

## Principii de Bază

Optimizarea fiscală înseamnă utilizarea legală a prevederilor fiscale pentru minimizarea impozitelor.

## Strategii Principale

### 1. Alegerea Formei de Impozitare
- Micro vs profit
- Analiza break-even

### 2. Deduceri Fiscale
- Cheltuieli de protocol: 2% din profit brut
- Sponsorizări: 0.75% din cifra de afaceri
- Tichete de masă

### 3. Dividende vs Salarii
- Contribuții sociale diferite
- Impozit dividende vs venit

### 4. Investiții Deductibile
- Echipamente
- Software
- Cercetare-dezvoltare

## Ce NU Este Legal

- Facturi false
- Subevaluare venituri
- Cheltuieli fictive

## Recomandări

Consultați un specialist pentru strategii personalizate.`,
    tags: ['optimizare', 'fiscal', 'srl', 'legal'],
    metaTitle: 'Optimizare Fiscală Legală SRL | DocumentIulia',
    metaDescription: 'Strategii legale de optimizare fiscală pentru SRL-uri în România.',
    readingTime: 4,
    wordCount: 190,
  },
  {
    title: 'Erori Frecvente în Contabilitate și Cum Să Le Eviți',
    slug: 'erori-frecvente-contabilitate-solutii',
    categorySlug: 'contabilitate',
    excerpt: 'Top 10 erori contabile frecvente și soluții practice pentru a le evita.',
    content: `# Erori Frecvente în Contabilitate

## Top 10 Erori și Soluții

### 1. Înregistrări în Perioadă Greșită
**Eroare**: Facturi înregistrate în luna greșită
**Soluție**: Verificare dată document vs dată înregistrare

### 2. Confuzie Între Conturi
**Eroare**: 401 în loc de 404
**Soluție**: Ghid conturi cu exemple

### 3. TVA Calculat Greșit
**Eroare**: Cotă TVA incorectă
**Soluție**: Verificare cotă pe factură

### 4. Nepotrivire Sold Bancă
**Eroare**: Balanță diferită de extras
**Soluție**: Reconciliere lunară

### 5. Documente Lipsă
**Eroare**: Înregistrări fără documente
**Soluție**: Arhivare organizată

### 6. Amortizare Neevidențiată
**Soluție**: Automatizare calcul

### 7. Închidere Incorectă
**Soluție**: Checklist de închidere

### 8. Declarații Eronate
**Soluție**: Verificare încrucișată

### 9. Politici Neaplicare Consistentă
**Soluție**: Documentare politici

### 10. Backup Neefectuat
**Soluție**: Backup automat zilnic`,
    tags: ['erori', 'contabilitate', 'solutii', 'sfaturi'],
    metaTitle: 'Erori Frecvente în Contabilitate | DocumentIulia',
    metaDescription: 'Top 10 erori contabile frecvente și soluții practice pentru a le evita în activitatea zilnică.',
    readingTime: 5,
    wordCount: 240,
  },
  {
    title: 'Digitalizarea Contabilității: Trend sau Necesitate?',
    slug: 'digitalizare-contabilitate-trend-necesitate',
    categorySlug: 'general',
    excerpt: 'Analiza beneficiilor și provocărilor digitalizării proceselor contabile.',
    content: `# Digitalizarea Contabilității

## Context

Digitalizarea nu mai este o opțiune, ci o cerință pentru conformitate (e-Factura, SAF-T).

## Beneficii

### Eficiență
- Automatizare procese repetitive
- Reducere erori umane
- Timp economisit

### Conformitate
- Adaptare rapidă la schimbări legislative
- Raportare automată
- Audit trail complet

### Costuri
- Reducere costuri operaționale
- ROI pe termen mediu
- Scalabilitate

## Provocări

- Investiție inițială
- Curba de învățare
- Securitate date
- Integrare sisteme

## Cum Să Începi

1. Evaluare situație actuală
2. Identificare priorități
3. Alegere soluții potrivite
4. Implementare graduală
5. Training echipă

## Viitorul

AI și Machine Learning vor automatiza și mai mult procesele contabile.`,
    tags: ['digitalizare', 'automatizare', 'software', 'viitor'],
    metaTitle: 'Digitalizarea Contabilității | DocumentIulia',
    metaDescription: 'Analiza beneficiilor și provocărilor digitalizării proceselor contabile în România.',
    readingTime: 4,
    wordCount: 200,
  },
  {
    title: 'Contabilitate pentru Freelanceri: Ce Trebuie Să Știi',
    slug: 'contabilitate-freelanceri-ghid-complet',
    categorySlug: 'fiscalitate',
    excerpt: 'Ghid complet de contabilitate și fiscalitate pentru freelanceri și PFA-uri.',
    content: `# Contabilitate pentru Freelanceri

## Forme Juridice

### PFA
- Partidă simplă sau dublă
- Impozit pe venit 10%
- Contribuții sociale obligatorii

### SRL Individual
- Contabilitate în partidă dublă
- Micro sau profit
- Mai multe cheltuieli deductibile

## Obligații Fiscale

### Declarații
- Declarația unică: anual
- D112: lunar (cu salariați)
- TVA: dacă te înregistrezi

### Contribuții
- CAS: 25% din venit
- CASS: 10% din venit
- Plafoane anuale

## Cheltuieli Deductibile

- Echipamente și software
- Abonamente profesionale
- Cursuri de formare
- Deplasări de afaceri

## Sfaturi Practice

1. Separați conturile personal/business
2. Păstrați toate chitanțele
3. Automatizați facturarea
4. Consultați un contabil`,
    tags: ['freelancer', 'pfa', 'impozit', 'contributii'],
    metaTitle: 'Contabilitate pentru Freelanceri | DocumentIulia',
    metaDescription: 'Ghid complet de contabilitate și fiscalitate pentru freelanceri și PFA-uri în România.',
    readingTime: 5,
    wordCount: 220,
  },
  {
    title: 'Bilanțul Contabil: Structură și Interpretare',
    slug: 'bilant-contabil-structura-interpretare',
    categorySlug: 'contabilitate',
    excerpt: 'Cum să citești și să interpretezi un bilanț contabil pentru analiza financiară.',
    content: `# Bilanțul Contabil Explicat

## Structura Bilanțului

### Activul
**Imobilizări**
- Necorporale (brevete, licențe)
- Corporale (clădiri, echipamente)
- Financiare (participații)

**Active Circulante**
- Stocuri
- Creanțe
- Disponibilități

### Pasivul
**Capitaluri Proprii**
- Capital social
- Rezerve
- Rezultat

**Datorii**
- Pe termen lung
- Pe termen scurt

## Indicatori din Bilanț

### Lichiditate
\`\`\`
Lichiditate curentă = Active circulante / Datorii curente
\`\`\`

### Solvabilitate
\`\`\`
Solvabilitate = Capital propriu / Total pasiv
\`\`\`

### Autonomie Financiară
\`\`\`
Autonomie = Capital propriu / Datorii totale
\`\`\`

## Interpretare

- Lichiditate > 1: pozitiv
- Solvabilitate > 30%: stabil
- Autonomie > 1: independent financiar`,
    tags: ['bilant', 'analiza', 'indicatori', 'financiar'],
    metaTitle: 'Bilanțul Contabil - Structură și Interpretare | DocumentIulia',
    metaDescription: 'Ghid pentru înțelegerea și interpretarea bilanțului contabil pentru analiza financiară.',
    readingTime: 5,
    wordCount: 230,
  },
];

// Course lessons
export const extendedLessons = [
  {
    courseSlug: 'introducere-e-factura',
    lessons: [
      { title: 'Ce este e-Factura?', slug: 'ce-este-e-factura', content: '# Ce este e-Factura?\n\ne-Factura este sistemul național de facturare electronică administrat de ANAF...', duration: 10, sortOrder: 0, isFree: true },
      { title: 'Obligativitatea e-Factura', slug: 'obligativitate-e-factura', content: '# Cine este obligat să utilizeze e-Factura?\n\nConform legislației...', duration: 15, sortOrder: 1, isFree: true },
      { title: 'Structura XML UBL', slug: 'structura-xml-ubl', content: '# Structura fișierului XML\n\nFormatul UBL 2.1...', duration: 20, sortOrder: 2, isFree: false },
      { title: 'Câmpuri obligatorii', slug: 'campuri-obligatorii', content: '# Câmpuri obligatorii în e-Factura\n\nFiecare factură trebuie să conțină...', duration: 25, sortOrder: 3, isFree: false },
      { title: 'Transmiterea facturii', slug: 'transmitere-factura', content: '# Cum transmiți o factură la ANAF\n\nPentru transmitere...', duration: 20, sortOrder: 4, isFree: false },
      { title: 'Erori frecvente', slug: 'erori-frecvente-efactura', content: '# Erori frecvente și soluții\n\nCele mai comune erori...', duration: 15, sortOrder: 5, isFree: false },
    ],
  },
  {
    courseSlug: 'saft-pentru-contabili',
    lessons: [
      { title: 'Introducere în SAF-T', slug: 'introducere-saft', content: '# Ce este SAF-T?\n\nSAF-T (Standard Audit File for Tax)...', duration: 15, sortOrder: 0, isFree: true },
      { title: 'Structura fișierului SAF-T', slug: 'structura-saft', content: '# Structura SAF-T\n\nFișierul SAF-T conține mai multe secțiuni...', duration: 20, sortOrder: 1, isFree: false },
      { title: 'MasterFiles - Date de bază', slug: 'masterfiles-saft', content: '# Secțiunea MasterFiles\n\nAceastă secțiune conține...', duration: 25, sortOrder: 2, isFree: false },
      { title: 'GeneralLedgerEntries', slug: 'general-ledger-saft', content: '# Jurnalele contabile în SAF-T\n\nInregistrările...', duration: 30, sortOrder: 3, isFree: false },
      { title: 'SourceDocuments', slug: 'source-documents-saft', content: '# Documente sursă\n\nFacturile și plățile...', duration: 25, sortOrder: 4, isFree: false },
      { title: 'Validare și transmitere', slug: 'validare-transmitere-saft', content: '# Validarea fișierului\n\nÎnainte de transmitere...', duration: 20, sortOrder: 5, isFree: false },
      { title: 'Corectare erori', slug: 'corectare-erori-saft', content: '# Corectarea erorilor\n\nDacă SAF-T conține erori...', duration: 15, sortOrder: 6, isFree: false },
    ],
  },
  {
    courseSlug: 'fiscalitate-antreprenori',
    lessons: [
      { title: 'Tipuri de impozitare', slug: 'tipuri-impozitare', content: '# Forme de impozitare în România\n\nÎn România există...', duration: 20, sortOrder: 0, isFree: true },
      { title: 'TVA - Bazele', slug: 'tva-bazele', content: '# Taxa pe valoare adăugată\n\nTVA este un impozit indirect...', duration: 25, sortOrder: 1, isFree: true },
      { title: 'Contribuții sociale', slug: 'contributii-sociale', content: '# CAS și CASS\n\nContribuțiile sociale...', duration: 20, sortOrder: 2, isFree: false },
      { title: 'Declarații fiscale', slug: 'declaratii-fiscale', content: '# Declarațiile obligatorii\n\nFiecare firmă trebuie să depună...', duration: 25, sortOrder: 3, isFree: false },
      { title: 'Optimizare fiscală', slug: 'optimizare-fiscala', content: '# Strategii legale\n\nOptimizarea fiscală...', duration: 30, sortOrder: 4, isFree: false },
    ],
  },
];

async function seedExtendedContent() {
  console.log('🌱 Starting extended content seed...');

  // Get default user for authorship
  const user = await prisma.user.findFirst({
    where: { clerkId: 'user_test_admin' },
  });

  if (!user) {
    console.error('❌ No test user found. Run main seed first.');
    return;
  }

  // Seed forum topics
  console.log('📝 Creating forum topics...');
  let topicCount = 0;

  for (const topic of extendedForumTopics) {
    const category = await prisma.forumCategory.findUnique({
      where: { slug: topic.categorySlug },
    });

    if (!category) continue;

    const slug = topic.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    try {
      await prisma.forumTopic.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug,
          },
        },
        update: {},
        create: {
          title: topic.title,
          slug,
          content: topic.content,
          tags: topic.tags,
          categoryId: category.id,
          authorId: user.id,
        },
      });
      topicCount++;
    } catch {
      // Skip duplicates
    }
  }
  console.log(`✅ Created ${topicCount} forum topics`);

  // Seed blog posts
  console.log('📰 Creating blog posts...');
  let postCount = 0;

  for (const post of extendedBlogPosts) {
    const category = await prisma.blogCategory.findUnique({
      where: { slug: post.categorySlug },
    });

    try {
      await prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: {},
        create: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          categoryId: category?.id,
          tags: post.tags,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          readingTime: post.readingTime,
          wordCount: post.wordCount,
          authorId: user.id,
          status: BlogPostStatus.PUBLISHED,
          publishedAt: new Date(),
          language: 'ro',
        },
      });
      postCount++;
    } catch {
      // Skip duplicates
    }
  }
  console.log(`✅ Created ${postCount} blog posts`);

  // Seed course lessons
  console.log('📚 Creating course lessons...');
  let lessonCount = 0;

  for (const courseData of extendedLessons) {
    const course = await prisma.course.findUnique({
      where: { slug: courseData.courseSlug },
    });

    if (!course) continue;

    for (const lesson of courseData.lessons) {
      try {
        await prisma.courseLesson.upsert({
          where: {
            courseId_slug: {
              courseId: course.id,
              slug: lesson.slug,
            },
          },
          update: {},
          create: {
            courseId: course.id,
            title: lesson.title,
            slug: lesson.slug,
            content: lesson.content,
            duration: lesson.duration,
            sortOrder: lesson.sortOrder,
            isFree: lesson.isFree,
            isPublished: true,
          },
        });
        lessonCount++;
      } catch {
        // Skip duplicates
      }
    }
  }
  console.log(`✅ Created ${lessonCount} course lessons`);

  // Update category counts
  console.log('🔄 Updating category counts...');
  const categories = await prisma.forumCategory.findMany();
  for (const cat of categories) {
    const count = await prisma.forumTopic.count({
      where: { categoryId: cat.id },
    });
    await prisma.forumCategory.update({
      where: { id: cat.id },
      data: { topicCount: count },
    });
  }

  console.log('');
  console.log('🎉 Extended content seeded successfully!');
  console.log(`   - ${topicCount} forum topics`);
  console.log(`   - ${postCount} blog posts`);
  console.log(`   - ${lessonCount} course lessons`);
}

// Export for use in main seed
export { seedExtendedContent };

// Allow direct execution
if (require.main === module) {
  seedExtendedContent()
    .catch((e) => {
      console.error('❌ Extended seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
