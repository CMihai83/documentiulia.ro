/**
 * DocumentIulia.ro - Complete Course Content for Additional Courses
 * Elite-quality educational content for Romanian business professionals
 *
 * This file completes the courses defined in seed-additional-courses.ts
 * with full modules and lessons - making this knowledge repository
 * the definitive resource for Romanian entrepreneurs and professionals.
 *
 * Created: December 2025
 * Quality Standard: Elite Professional (World-class content)
 */

export interface LessonContent {
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'EXERCISE' | 'DOWNLOAD';
  duration: number;
  order: number;
  content: string;
  isFree?: boolean;
}

export interface ModuleContent {
  title: string;
  description?: string;
  order: number;
  duration: number;
  lessons: LessonContent[];
}

export interface CourseContent {
  slug: string;
  modules: ModuleContent[];
}

export const additionalCoursesComplete: CourseContent[] = [
  // ============================================================
  // COURSE 1: Planul de Afaceri - De la Idee la Finanțare
  // ============================================================
  {
    slug: 'plan-afaceri-idee-finantare',
    modules: [
      {
        title: 'Fundamentele Planului de Afaceri',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Ce este un Plan de Afaceri și de ce ai nevoie de unul',
            type: 'TEXT',
            duration: 15,
            order: 1,
            isFree: true,
            content: `# Ce este un Plan de Afaceri?

## Definiție

Planul de afaceri este un document strategic care descrie viziunea, obiectivele și strategia unei afaceri. Este harta drumului tău antreprenorial.

## De ce ai nevoie de un Plan de Afaceri?

### 1. Claritate Internă
- Îți forțează gândirea structurată
- Identifici punctele slabe înainte să fie prea târziu
- Stabilești priorități clare

### 2. Atragere Finanțare
- **Bănci**: Cer plan pentru credite
- **Investitori**: Evaluează potențialul
- **Fonduri europene**: Obligatoriu pentru aplicații

### 3. Ghidare Strategică
- Bază pentru decizii
- Măsurare progres
- Adaptare la schimbări

## Mituri despre Planul de Afaceri

### ❌ "Trebuie să fie perfect"
Planul e un document viu. Se adaptează.

### ❌ "E doar pentru investitori"
Cel mai mare beneficiar ești TU.

### ❌ "Durează luni să-l scrii"
Un plan bun poate fi gata în 2-3 săptămâni.

## Lungimea Ideală

| Scop | Pagini |
|------|--------|
| Uz intern | 10-15 |
| Bancă | 20-30 |
| Investitori | 30-50 |
| Fonduri UE | 50-100+ |

## Când să îl scrii?

- **Înainte** de a începe afacerea
- **La schimbări majore** de strategie
- **Anual** pentru actualizare
- **La căutare finanțare**

## Concluzie

Planul de afaceri nu este o formalitate - este fundamentul succesului tău. În lecțiile următoare, vom construi împreună fiecare secțiune.`
          },
          {
            title: 'Structura Standard a unui Plan de Afaceri',
            type: 'TEXT',
            duration: 20,
            order: 2,
            content: `# Structura Completă a Planului de Afaceri

## Secțiunile Esențiale

### 1. Sumar Executiv (Executive Summary)
**Lungime:** 1-2 pagini

Conține:
- Descrierea afacerii (2-3 propoziții)
- Produsul/serviciul
- Piața țintă
- Avantajul competitiv
- Obiective financiare cheie
- Suma solicitată (dacă e cazul)

**Important:** Se scrie ULTIMUL, dar se pune PRIMUL!

### 2. Descrierea Afacerii
**Lungime:** 3-5 pagini

Conține:
- Viziunea și misiunea
- Istoricul (dacă există)
- Forma juridică
- Echipa de management
- Locația și facilitățile

### 3. Analiza Pieței
**Lungime:** 5-10 pagini

Conține:
- Dimensiunea pieței (TAM, SAM, SOM)
- Tendințe și dinamică
- Segmentarea clienților
- Profilul clientului ideal
- Analiza competiției

### 4. Produsele/Serviciile
**Lungime:** 3-5 pagini

Conține:
- Descrierea detaliată
- Caracteristici și beneficii
- Ciclul de viață
- Dezvoltări viitoare
- Proprietate intelectuală

### 5. Strategia de Marketing
**Lungime:** 3-5 pagini

Conține:
- Poziționare
- Prețuri
- Canale de distribuție
- Promovare
- Buget marketing

### 6. Planul Operațional
**Lungime:** 3-5 pagini

Conține:
- Procesele cheie
- Furnizori
- Tehnologie
- Facilități
- Timelines

### 7. Management și Organizare
**Lungime:** 2-3 pagini

Conține:
- Organigramă
- CV-uri cheie
- Consiliul consultativ (dacă există)
- Planul de angajare

### 8. Proiecții Financiare
**Lungime:** 5-10 pagini

Conține:
- Proiecție venituri (3-5 ani)
- Proiecție cheltuieli
- Cash flow
- Punct de break-even
- Indicatori financiari

### 9. Analiza Riscurilor
**Lungime:** 2-3 pagini

Conține:
- Identificare riscuri
- Probabilitate și impact
- Măsuri de mitigare
- Plan de contingență

### 10. Anexe
**Lungime:** variabil

Conține:
- CV-uri complete
- Studii de piață
- Oferte furnizori
- Contracte existente
- Licențe/autorizații

## Template Vizual

\`\`\`
┌─────────────────────────────────┐
│     SUMAR EXECUTIV (1-2 pag)    │
├─────────────────────────────────┤
│   DESCRIEREA AFACERII (3-5)     │
├─────────────────────────────────┤
│     ANALIZA PIEȚEI (5-10)       │
├─────────────────────────────────┤
│    PRODUSE/SERVICII (3-5)       │
├─────────────────────────────────┤
│     MARKETING (3-5)             │
├─────────────────────────────────┤
│     OPERAȚIUNI (3-5)            │
├─────────────────────────────────┤
│     MANAGEMENT (2-3)            │
├─────────────────────────────────┤
│     FINANCIAR (5-10)            │
├─────────────────────────────────┤
│     RISCURI (2-3)               │
├─────────────────────────────────┤
│         ANEXE                   │
└─────────────────────────────────┘
\`\`\`

## Sfaturi de Formatare

1. **Font profesional**: Arial, Calibri, Times New Roman
2. **Dimensiune**: 11-12pt text, 14-16pt titluri
3. **Margini**: 2.5 cm
4. **Numerotare**: Pagini numerotate
5. **Cuprins**: Cu hyperlink-uri în PDF`
          },
          {
            title: 'Greșeli Fatale de Evitat',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Top 10 Greșeli Fatale în Planurile de Afaceri

## 1. Proiecții Financiare Nerealiste

### Problema:
"Vom avea 1 milion EUR vânzări în primul an!"

### Realitatea:
Investitorii și băncile văd sute de planuri. Recunosc fanteziile instant.

### Soluția:
- Bazează-te pe date reale de piață
- Folosește scenarii conservatoare
- Arată cum ai calculat numerele

## 2. Ignorarea Competiției

### Problema:
"Nu avem competitori."

### Realitatea:
Întotdeauna există alternative (chiar și "a nu face nimic").

### Soluția:
- Cercetează temeinic piața
- Identifică competitori direcți și indirecți
- Arată cum te diferențiezi

## 3. Piață Nedefinită

### Problema:
"Produsul nostru e pentru toată lumea!"

### Realitatea:
Un produs pentru toți e un produs pentru nimeni.

### Soluția:
- Definește segmente clare
- Creează persona de client
- Focusează pe nișa ta

## 4. Lipsa Validării

### Problema:
"Știu că oamenii vor cumpăra pentru că..."

### Soluția:
- Interviuri cu potențiali clienți
- MVP sau prototip testat
- Pre-comenzi sau Letters of Intent

## 5. Plan Prea Lung sau Prea Scurt

### Problema:
- 100 de pagini = nimeni nu citește
- 5 pagini = lipsesc detalii critice

### Soluția:
- 20-30 pagini pentru bancă
- 30-50 pentru investitori
- Anexe pentru detalii suplimentare

## 6. Sumar Executiv Slab

### Problema:
Sumarul este copiat din restul planului, fără impact.

### Realitatea:
Mulți cititori citesc DOAR sumarul.

### Soluția:
- Scrie-l la sfârșit
- Fă-l captivant
- Include numerele cheie

## 7. Echipă Neconvingătoare

### Problema:
"Suntem pasionați și muncitori!"

### Realitatea:
Investitorii investesc în OAMENI, nu în idei.

### Soluția:
- Evidențiază experiența relevantă
- Arată rezultate anterioare
- Recunoaște lipsurile și planul de acoperire

## 8. Model de Afaceri Neclar

### Problema:
Nu e clar cum faci bani.

### Soluția:
- Explicare clară: ce vinzi, cui, la ce preț
- Structura costurilor
- Marje și profitabilitate

## 9. Lipsa Strategiei de Exit (pentru investitori)

### Problema:
"Vom crește pentru totdeauna!"

### Realitatea:
Investitorii vor să știe când și cum își recuperează banii.

### Soluția:
- Scenarii de exit: vânzare, IPO, buyback
- Timeline realist
- Potențiali cumpărători

## 10. Format și Prezentare Neprofesională

### Problema:
Greșeli gramaticale, formatare inconsistentă, grafice urâte.

### Soluția:
- Proofreading profesional
- Design consistent
- Grafice clare și relevante

## Checklist Final

Înainte de a trimite planul:

☐ Cineva din afară l-a citit și înțeles?
☐ Numerele sunt verificate?
☐ Sursele sunt citate?
☐ Formatarea e consistentă?
☐ Sumarul e captivant?
☐ Toate afirmațiile sunt susținute?`
          },
          {
            title: 'Quiz: Fundamentele Planului de Afaceri',
            type: 'QUIZ',
            duration: 10,
            order: 4,
            content: `# Quiz: Testează-ți Cunoștințele

## Întrebarea 1
Care secțiune a planului de afaceri se scrie ultima dar se pune prima?
- A) Descrierea afacerii
- B) Sumarul executiv ✓
- C) Proiecțiile financiare
- D) Analiza pieței

## Întrebarea 2
Ce lungime are un plan de afaceri pentru bancă?
- A) 5-10 pagini
- B) 10-15 pagini
- C) 20-30 pagini ✓
- D) 50+ pagini

## Întrebarea 3
"Produsul nostru e pentru toată lumea" este:
- A) O afirmație corectă
- B) O greșeală frecventă ✓
- C) O strategie de succes
- D) Irelevant pentru plan

## Întrebarea 4
TAM, SAM, SOM sunt termeni folosiți în:
- A) Proiecțiile financiare
- B) Analiza riscurilor
- C) Analiza pieței ✓
- D) Planul operațional

## Întrebarea 5
Care este cel mai important lucru în care investesc investitorii?
- A) Ideea
- B) Produsul
- C) Piața
- D) Echipa ✓`
          }
        ]
      },
      {
        title: 'Analiza Pieței și Competiției',
        order: 2,
        duration: 60,
        lessons: [
          {
            title: 'Dimensionarea Pieței: TAM, SAM, SOM',
            type: 'TEXT',
            duration: 25,
            order: 1,
            content: `# Dimensionarea Pieței: TAM, SAM, SOM

## Ce sunt și de ce contează?

Investitorii și băncile vor să știe: "Cât de mare e oportunitatea?"

### TAM (Total Addressable Market)
**Piața Totală Adresabilă**

Reprezintă valoarea totală a pieței dacă ai avea 100% cotă.

**Exemplu:**
- Piața de software contabil în România = 150 milioane EUR

### SAM (Serviceable Available Market)
**Piața Disponibilă Deservibilă**

Partea din TAM pe care o poți deservi cu produsul și modelul tău actual.

**Exemplu:**
- Software contabil cloud pentru IMM-uri = 40 milioane EUR

### SOM (Serviceable Obtainable Market)
**Piața Obtenabilă Realist**

Cota de piață pe care o poți captura în mod realist în 3-5 ani.

**Exemplu:**
- Ținta noastră: 5% = 2 milioane EUR

## Vizualizare

\`\`\`
┌─────────────────────────────────┐
│           TAM                   │
│  ┌───────────────────────────┐  │
│  │         SAM               │  │
│  │  ┌─────────────────────┐  │  │
│  │  │       SOM           │  │  │
│  │  │                     │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
\`\`\`

## Metode de Calcul

### Top-Down (De sus în jos)
Pornești de la statistici generale și restrângi.

1. Piața totală de software în România: 2 miliarde EUR
2. Segment contabilitate: 7.5% = 150 milioane EUR
3. Cloud pentru IMM: 27% = 40 milioane EUR
4. Ținta noastră: 5% = 2 milioane EUR

### Bottom-Up (De jos în sus)
Pornești de la unități și construiești.

1. IMM-uri în România: 500.000
2. Potențiali clienți software cloud: 50.000
3. Preț mediu anual: 800 EUR
4. TAM segment: 40 milioane EUR
5. Clienți obtenabili (5%): 2.500
6. SOM: 2 milioane EUR

### Combinat (Recomandat)
Folosești ambele și verifici dacă rezultatele sunt consistente.

## Surse de Date

### Gratuite:
- INS (Institutul Național de Statistică)
- Eurostat
- Registrul Comerțului
- Rapoarte industriale publice
- Google Trends

### Plătite:
- Statista
- IBISWorld
- Nielsen
- Rapoarte de la firme de consultanță

## Greșeli de Evitat

### 1. Cifre prea optimiste
"Vom lua 20% din piață în 2 ani!"
**Realitate:** Chiar și liderii rar depășesc 10-15%.

### 2. Piață nedefinită
"Piața e uriașă!"
**Cerință:** Numere concrete cu surse.

### 3. Ignorarea trendurilor
Piața poate crește SAU scădea. Arată tendința.

## Template de Prezentare

| Metric | Valoare | Sursă |
|--------|---------|-------|
| TAM | 150M EUR | Raport XYZ 2024 |
| SAM | 40M EUR | Calcul intern |
| SOM (Y1) | 500K EUR | Buget vânzări |
| SOM (Y3) | 2M EUR | Plan creștere |
| Rata creștere | 12%/an | Eurostat |

## Exercițiu Practic

Pentru afacerea ta, calculează:
1. TAM folosind Top-Down
2. SAM folosind Bottom-Up
3. SOM realist pentru 3 ani
4. Identifică 3 surse pentru validare`
          },
          {
            title: 'Analiza Competiției - Cadrul Porter și SWOT',
            type: 'TEXT',
            duration: 20,
            order: 2,
            content: `# Analiza Competiției

## De ce e importantă?

"Dacă nu știi cine sunt competitorii, nu poți câștiga."

## Cele 5 Forțe ale lui Porter

### 1. Rivalitatea între competitorii existenți
- Câți sunt?
- Cât de agresivi?
- Diferențiere vs. comoditizare?

**Întrebări cheie:**
- Cine sunt primii 5 competitori?
- Care e cota lor de piață?
- Pe ce concurează: preț, calitate, service?

### 2. Amenințarea noilor intrări
- Cât de ușor e să intri pe piață?
- Bariere de intrare?

**Bariere tipice:**
- Capital necesar
- Reglementări
- Economii de scară
- Acces la canale

### 3. Puterea de negociere a furnizorilor
- Dependență de furnizori cheie?
- Alternative disponibile?

### 4. Puterea de negociere a clienților
- Concentrare clienți?
- Costuri de schimbare?

### 5. Amenințarea substituenților
- Ce alternative au clienții?
- Produse din alte industrii?

## Analiza SWOT

### Strengths (Puncte Forte)
Ce faci mai bine decât competiția?
- Resurse unice
- Expertiză
- Relații
- Locație

### Weaknesses (Puncte Slabe)
Unde ești vulnerabil?
- Lipsă resurse
- Reputație
- Dependențe

### Opportunities (Oportunități)
Ce poți exploata?
- Trenduri de piață
- Schimbări legislative
- Tehnologii noi
- Gap-uri în oferta competiției

### Threats (Amenințări)
Ce te poate afecta?
- Competitori noi
- Schimbări reglementări
- Evoluție tehnologică

## Matricea Competiției

| Criteriu | Noi | Comp A | Comp B | Comp C |
|----------|-----|--------|--------|--------|
| Preț | ★★★ | ★★ | ★★★★ | ★★ |
| Calitate | ★★★★ | ★★★★ | ★★ | ★★★ |
| Service | ★★★★★ | ★★★ | ★★ | ★★★★ |
| Tehnologie | ★★★★ | ★★ | ★★★ | ★★★★ |

## Avantaj Competitiv Sustenabil

### Ce te face diferit?
- Cost mai mic? (ex: Ryanair)
- Calitate superioară? (ex: Apple)
- Nișă specializată? (ex: Tesla)
- Experiență unică? (ex: Starbucks)

### De ce e sustenabil?
- Greu de copiat
- Protejat (brevete, contracte)
- Rețea de efecte
- Marcă puternică

## Template pentru Plan

**Secțiunea Competiție ar trebui să includă:**

1. **Lista competitorilor** (5-10 principali)
2. **Profiluri scurte** pentru top 3
3. **Matrice de comparație**
4. **Diferențiatorii tăi**
5. **Strategia de poziționare**`
          },
          {
            title: 'Profilul Clientului Ideal (Buyer Persona)',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Crearea Buyer Persona

## Ce este o Buyer Persona?

Un profil semi-fictiv al clientului tău ideal, bazat pe date reale și cercetare.

## De ce e importantă?

- **Marketing țintit**: Știi unde și cum să comunici
- **Dezvoltare produs**: Construiești ce au nevoie
- **Vânzări**: Înțelegi procesul de decizie
- **Service**: Anticipezi nevoi

## Elementele unei Persona B2C

### Date Demografice
- Vârstă: 35-45 ani
- Gen: Femeie
- Locație: Urban, București
- Educație: Studii superioare
- Venit: 5.000-8.000 RON net/lună
- Status familial: Căsătorită, 1-2 copii

### Psihografice
- Valori: Familie, securitate, eficiență
- Interese: Dezvoltare personală, călătorii
- Stil de viață: Ocupat, caută simplificare

### Comportament
- Cum caută informații: Google, LinkedIn, recomandări
- Unde petrece timpul online: Facebook, Instagram
- Cum ia decizii: Cercetează, compară, citește review-uri

### Nevoi și Dureri (Pain Points)
- Problema #1: Lipsa timpului
- Problema #2: Complexitatea administrativă
- Problema #3: Frica de amenzi fiscale

### Obiective
- Ce vrea să realizeze: Ordine în finanțe
- Ce succes înseamnă pentru ea: Zero griji fiscale

## Template Buyer Persona B2C

\`\`\`
┌─────────────────────────────────────────┐
│          "Maria Antreprenoarea"          │
├─────────────────────────────────────────┤
│ Foto reprezentativ                       │
├─────────────────────────────────────────┤
│ Vârstă: 38 ani                          │
│ Locație: Cluj-Napoca                    │
│ Rol: Proprietar magazin online          │
│ Venit: 7.500 RON/lună                   │
├─────────────────────────────────────────┤
│ OBIECTIVE:                              │
│ • Să crească afacerea                   │
│ • Să aibă timp pentru familie           │
│ • Să evite problemele fiscale           │
├─────────────────────────────────────────┤
│ FRUSTRĂRI:                              │
│ • Contabilul e mereu ocupat             │
│ • Nu înțelege declarațiile              │
│ • Surprize la taxe                      │
├─────────────────────────────────────────┤
│ CANALE PREFERATE:                       │
│ • Facebook, Instagram                   │
│ • Email (dimineața)                     │
│ • YouTube pentru tutoriale              │
├─────────────────────────────────────────┤
│ OBIECȚII POSIBILE:                      │
│ • "E prea scump"                        │
│ • "Nu am timp să învăț"                 │
│ • "Prefer contabilul meu"               │
└─────────────────────────────────────────┘
\`\`\`

## Buyer Persona B2B

Pentru vânzări către companii, profilul include:

### Compania
- Dimensiune: 10-50 angajați
- Industrie: Servicii profesionale
- Cifră afaceri: 500K-2M EUR
- Locație: Urban

### Decidentul
- Rol: Director Financiar / CEO
- Vârstă: 40-55 ani
- Experiență: 15+ ani

### Procesul de Achiziție
- Cine identifică nevoia?
- Cine cercetează soluții?
- Cine ia decizia finală?
- Cine aprobă bugetul?

## Cum Colectezi Date

### Metode primare:
1. **Interviuri** cu clienți existenți
2. **Sondaje** online
3. **Analiza CRM** (date existente)
4. **Discuții** cu echipa de vânzări

### Metode secundare:
1. **Analytics** (Google, Facebook)
2. **Studii** de piață
3. **Forumuri** și grupuri
4. **Review-uri** competitori

## Câte Personas?

- Minim: 1-2 pentru început
- Ideal: 3-5 pentru afaceri mature
- Maxim: 7-8 (mai multe = confuzie)`
          }
        ]
      },
      {
        title: 'Proiecții Financiare și Indicatori',
        order: 3,
        duration: 70,
        lessons: [
          {
            title: 'Proiecția Veniturilor - Metodologii',
            type: 'TEXT',
            duration: 25,
            order: 1,
            content: `# Proiecția Veniturilor

## De ce contează?

Investitorii și băncile vor să vadă:
- Potențialul de creștere
- Realismul așteptărilor
- Logica din spatele numerelor

## Metodologii de Proiecție

### 1. Top-Down

Pornești de la piață și cobori.

**Exemplu:**
- Piață totală: 100M EUR
- Piața accesibilă: 20M EUR
- Cota țintită (5%): 1M EUR
- Creștere anuală: 20%

| An | Cotă | Venituri |
|----|------|----------|
| 1  | 2.5% | 500K     |
| 2  | 4%   | 800K     |
| 3  | 5%   | 1M       |

### 2. Bottom-Up (Recomandat)

Construiești de la unitățile vândute.

**Exemplu SaaS:**
- Clienți la început: 50
- Achiziție lunară: 10 clienți noi
- Churn: 5%/lună
- ARPU: 100 EUR/lună

| Lună | Clienți | Venit Lunar |
|------|---------|-------------|
| 1    | 50      | 5.000€      |
| 6    | 95      | 9.500€      |
| 12   | 155     | 15.500€     |

### 3. Bazat pe Capacitate

Pentru servicii și producție.

**Exemplu restaurant:**
- Locuri: 40
- Rotații/zi: 2.5
- Zile deschise: 25/lună
- Nota medie: 80 RON

Capacitate maximă: 40 × 2.5 × 25 × 80 = 200.000 RON/lună

| An | Utilizare | Venit Lunar |
|----|-----------|-------------|
| 1  | 50%       | 100K        |
| 2  | 70%       | 140K        |
| 3  | 85%       | 170K        |

## Structura Veniturilor

### Surse de Venit

Identifică toate sursele:
1. Produs/Serviciu principal (70%)
2. Servicii adiționale (20%)
3. Altele (10%)

### Sezonalitate

\`\`\`
J   F   M   A   M   J   J   A   S   O   N   D
|   |   |   |   |   |   |   |   |   |   |   |
60% 70% 80% 90% 100%120%80% 70% 90% 100%110%150%
\`\`\`

Ajustează proiecțiile lunar pentru sezonalitate!

## Asumpții Cheie

Documentează și justifică:

| Asumpție | Valoare | Justificare |
|----------|---------|-------------|
| Rata conversie | 3% | Media industrie 2-5% |
| Ciclu vânzare | 30 zile | Feedback clienți |
| Preț mediu | 500 EUR | Analiza competiție |
| Churn | 5%/lună | Benchmark SaaS |

## Scenarii

Prezintă 3 scenarii:

### Pesimist (-30%)
- Ce se întâmplă în cel mai rău caz?
- Poți supraviețui?

### Realist (bază)
- Proiecția principală
- Cea mai probabilă

### Optimist (+30%)
- Totul merge perfect
- Nu e imposibil dar rar

## Red Flags pentru Evaluatori

### ❌ "Hockey stick growth"
Creștere explozivă în an 3 fără justificare.

### ❌ Cifre rotunde perfecte
100.000 EUR exact? Pare inventat.

### ❌ Zero sezonalitate
Orice afacere are variații.

### ❌ Fără churn/pierderi
Nimeni nu are retenție 100%.

## Template Excel

Vom furniza un template cu:
- Proiecție lunară An 1
- Proiecție trimestrială Ani 2-5
- Grafice automate
- Analiză de sensibilitate`
          },
          {
            title: 'Proiecția Cheltuielilor și Break-Even',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Proiecția Cheltuielilor

## Categorii de Costuri

### Costuri Fixe
Nu variază cu volumul vânzărilor:
- Chirii
- Salarii administrative
- Abonamente software
- Asigurări
- Amortizări

### Costuri Variabile
Cresc proporțional cu vânzările:
- Materii prime
- Comisioane vânzări
- Livrare
- Procesare plăți

### Costuri Semi-variabile
Au componentă fixă + variabilă:
- Utilități
- Salariu + bonusuri
- Marketing (minim + performanță)

## Structura Cheltuielilor

| Categorie | % din Venituri | Exemplu (1M EUR) |
|-----------|----------------|------------------|
| COGS | 30-40% | 350K |
| Marketing | 10-20% | 150K |
| Salarii | 20-30% | 250K |
| Chirii | 5-10% | 70K |
| Tehnologie | 3-5% | 40K |
| Admin | 5-10% | 60K |
| **Total** | 80-95% | 920K |
| **Profit** | 5-20% | 80K |

## Analiza Break-Even

### Formula:
\`\`\`
Break-Even (unități) = Costuri Fixe / (Preț - Cost Variabil per Unitate)
\`\`\`

### Exemplu:
- Costuri fixe lunare: 20.000 EUR
- Preț produs: 100 EUR
- Cost variabil: 40 EUR
- Marja per unitate: 60 EUR

Break-Even = 20.000 / 60 = **334 unități/lună**

### Break-Even (Timp)
\`\`\`
Luni până la Break-Even = Investiție Inițială / Profit Lunar Net
\`\`\`

### Grafic Break-Even

\`\`\`
EUR │
    │                        ✓ Profit
    │               ╱─────────
    │          ╱───
    │     ╱───
    │╱───         Break-Even Point
────┼────────────────────────────────
    │     Pierdere
    │─────────────────────────────────
    └────────────────────────────────▶ Unități
         100   200   334   400   500
\`\`\`

## Proiecție Cash Flow

### De ce e diferit de P&L?

**Profit ≠ Cash**

Diferențe cheie:
- Facturi neîncasate (receivables)
- Plăți în avans
- Amortizări (cheltuială non-cash)
- Investiții (cash out, nu cheltuială)

### Template Simplificat

| Lună | Încasări | Plăți | Sold Inițial | Sold Final |
|------|----------|-------|--------------|------------|
| 1 | 0 | 15.000 | 50.000 | 35.000 |
| 2 | 5.000 | 12.000 | 35.000 | 28.000 |
| 3 | 12.000 | 14.000 | 28.000 | 26.000 |
| 4 | 18.000 | 15.000 | 26.000 | 29.000 |

### Valley of Death

\`\`\`
Cash │
     │───╮
     │   │
     │   ╰──╮
     │      │
     │      ╰──────────────╱───
     │                 ╱───
     │           ╱────
     │      ╱───       Break-Even
─────┼─────────────────────────────▶ Timp
     │
     │     "Valley of Death"
\`\`\`

Momentul critic: când cash-ul scade cel mai mult înainte de break-even.

## Nevoia de Finanțare

### Cum o calculezi?

1. Proiectează cash flow lunar
2. Identifică punctul minim
3. Adaugă buffer 20-30%

### Exemplu:
- Punct minim: -80.000 EUR (luna 8)
- Buffer 25%: 20.000 EUR
- **Finanțare necesară: 100.000 EUR**

## Indicatori de Monitorizat

| Indicator | Formulă | Target |
|-----------|---------|--------|
| Marja brută | (Venituri-COGS)/Venituri | >40% |
| Marja netă | Profit/Venituri | >10% |
| Burn rate | Cheltuieli lunare | Monitorizare |
| Runway | Cash / Burn rate | >12 luni |
| CAC | Cost marketing / Clienți noi | <LTV/3 |
| LTV | Venit client × Durată | >3×CAC |`
          },
          {
            title: 'Indicatori Financiari Cheie (KPIs)',
            type: 'TEXT',
            duration: 20,
            order: 3,
            content: `# KPIs Financiari pentru Planul de Afaceri

## De ce sunt importanți?

Investitorii evaluează nu doar numerele absolute, ci și **indicatorii** care arată eficiența și sănătatea afacerii.

## Indicatori de Profitabilitate

### Marja Brută
\`\`\`
Marja Brută = (Venituri - COGS) / Venituri × 100
\`\`\`

**Benchmark-uri:**
| Industrie | Marja Brută |
|-----------|-------------|
| SaaS | 70-85% |
| Retail | 25-35% |
| Manufacturing | 35-45% |
| Servicii | 50-70% |

### Marja EBITDA
\`\`\`
EBITDA = Earnings Before Interest, Taxes, Depreciation, Amortization
Marja EBITDA = EBITDA / Venituri × 100
\`\`\`

**Target:** 15-25% pentru afaceri mature

### Marja Netă
\`\`\`
Marja Netă = Profit Net / Venituri × 100
\`\`\`

**Target:** 5-15% în funcție de industrie

## Indicatori de Creștere

### MoM (Month over Month)
Creștere față de luna anterioară.
\`\`\`
MoM = (Venit Luna Curentă - Venit Luna Anterioară) / Venit Luna Anterioară × 100
\`\`\`

### YoY (Year over Year)
Creștere față de anul anterior.
\`\`\`
YoY = (Venit An Curent - Venit An Anterior) / Venit An Anterior × 100
\`\`\`

### CAGR (Compound Annual Growth Rate)
Rata de creștere anuală compusă.
\`\`\`
CAGR = (Valoare Finală / Valoare Inițială)^(1/n) - 1
\`\`\`

## Indicatori pentru Start-ups / Tech

### CAC (Customer Acquisition Cost)
\`\`\`
CAC = Total Cheltuieli Marketing & Vânzări / Număr Clienți Noi
\`\`\`

### LTV (Customer Lifetime Value)
\`\`\`
LTV = ARPU × Durata Medie Client
\`\`\`

### Raportul LTV/CAC
\`\`\`
LTV/CAC = Lifetime Value / Acquisition Cost
\`\`\`

**Target:**
- Minim 3:1
- Ideal 5:1 sau mai mult

### MRR / ARR (Monthly/Annual Recurring Revenue)
Pentru modele de abonament.
\`\`\`
MRR = Număr Clienți × ARPU
ARR = MRR × 12
\`\`\`

### Churn Rate
Rata de pierdere clienți.
\`\`\`
Churn = Clienți Pierduți / Total Clienți la Început × 100
\`\`\`

**Target:**
- SaaS B2B: <5% anual
- SaaS B2C: <5% lunar

## Indicatori de Lichiditate

### Current Ratio
\`\`\`
Current Ratio = Active Curente / Pasive Curente
\`\`\`
**Target:** >1.5

### Quick Ratio
\`\`\`
Quick Ratio = (Active Curente - Stocuri) / Pasive Curente
\`\`\`
**Target:** >1.0

### Runway
\`\`\`
Runway (luni) = Cash Disponibil / Burn Rate Lunar
\`\`\`
**Target:** >12-18 luni

## Tabel Rezumativ pentru Plan

| Indicator | An 1 | An 2 | An 3 | Target |
|-----------|------|------|------|--------|
| Venituri | 200K | 500K | 1M | Creștere |
| Marja Brută | 55% | 60% | 65% | >50% |
| Marja Netă | -20% | 5% | 12% | >10% |
| CAC | €150 | €100 | €80 | Scădere |
| LTV | €800 | €1.000 | €1.200 | Creștere |
| LTV/CAC | 5.3x | 10x | 15x | >3x |
| Churn | 8% | 5% | 3% | Scădere |
| Runway | 18 luni | - | - | >12 |

## Prezentare Vizuală

Folosește grafice pentru indicatori cheie:
- **Line charts**: pentru evoluție în timp
- **Bar charts**: pentru comparații
- **Gauges**: pentru target vs actual
- **Waterfall**: pentru analiza profit

## Dashboard Template

\`\`\`
┌─────────────────────────────────────────┐
│            DASHBOARD FINANCIAR           │
├──────────────┬──────────────┬───────────┤
│   VENITURI   │   MARJĂ     │   CASH    │
│   €500K      │    60%      │   €120K   │
│   ↑ 25%      │   ↑ 5pp     │   ↓ 10%   │
├──────────────┼──────────────┼───────────┤
│     CAC      │    LTV      │ LTV/CAC   │
│    €100      │   €1.000    │    10x    │
│   ↓ 15%      │   ↑ 20%     │    ↑ 4x   │
├──────────────┴──────────────┴───────────┤
│           CASH FLOW PROJECTION          │
│   ▁▂▃▄▅▆▇█▇▆▅▆▇█▉▉▉▉▉▊▊▊▊              │
│   J F M A M J J A S O N D               │
└─────────────────────────────────────────┘
\`\`\``
          }
        ]
      },
      {
        title: 'Redactare și Prezentare',
        order: 4,
        duration: 50,
        lessons: [
          {
            title: 'Sumarul Executiv Perfect',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Cum să Scrii un Sumar Executiv Captivant

## Regula de Aur

**Se scrie ULTIMUL dar se pune PRIMUL.**

Sumar = Esența întregului plan în 1-2 pagini.

## Structura (1 pagină)

### Paragraful 1: Hook (2-3 propoziții)
Care e problema mare pe care o rezolvi?

> "70% din microîntreprinderile din România primesc amenzi fiscale în primul an. Platforma noastră elimină acest risc prin automatizare completă."

### Paragraful 2: Soluția (3-4 propoziții)
Ce faci și cum?

> "DocumentIulia.ro este platforma de contabilitate AI care automatizează complet raportarea fiscală pentru microîntreprinderi. Prin integrare directă cu ANAF și OCR pentru facturi, elimină munca manuală și erorile umane."

### Paragraful 3: Piața (2-3 propoziții)
Cât de mare e oportunitatea?

> "Piața de software contabil pentru IMM-uri în România este de 150M EUR, cu o creștere de 15% anual. Țintim 5% cotă în 3 ani, reprezentând 7.5M EUR venituri anuale."

### Paragraful 4: Modelul de Afaceri (2-3 propoziții)
Cum faci bani?

> "Operăm pe model SaaS cu abonament lunar de 49-149 RON. Marjă brută 75%, break-even în luna 18."

### Paragraful 5: Tracțiune/Dovezi (2-3 propoziții)
Ce ai realizat deja?

> "În 6 luni de beta, am atras 500 de utilizatori activi, 95% retenție, și NPS de 72. Avem parteneriate cu 3 bănci pentru distribuție."

### Paragraful 6: Echipa (2-3 propoziții)
De ce voi?

> "Echipa combină 30 ani experiență în fintech și contabilitate: fondator ex-CFO multinațională, CTO fost inginer Google, și advisor partener Big 4."

### Paragraful 7: Ask (2-3 propoziții)
Ce ceri?

> "Căutăm o investiție de 500K EUR pentru expansiune regională și dezvoltare produs. Oferim 20% equity la o evaluare de 2.5M EUR."

## Template Vizual

\`\`\`
┌─────────────────────────────────────────┐
│          [LOGO COMPANIE]                │
│                                         │
│        SUMAR EXECUTIV                   │
│                                         │
├─────────────────────────────────────────┤
│ PROBLEMA                                │
│ • Statistic șocant                      │
│ • Durere specifică                      │
├─────────────────────────────────────────┤
│ SOLUȚIA                                 │
│ • Ce facem                              │
│ • Cum funcționează                      │
├─────────────────────────────────────────┤
│ OPORTUNITATEA                           │
│ • TAM → SAM → SOM                       │
│ • Creșterea pieței                      │
├─────────────────────────────────────────┤
│ MODELUL DE BUSINESS                     │
│ • Surse venit  • Marje  • Break-even   │
├─────────────────────────────────────────┤
│ TRACȚIUNE                               │
│ • Utilizatori  • Venituri  • Parteneriate│
├─────────────────────────────────────────┤
│ ECHIPA                                  │
│ • Fondatori + credențiale               │
├─────────────────────────────────────────┤
│ FINANȚARE                               │
│ • Suma cerută  • Utilizare  • Oferim    │
└─────────────────────────────────────────┘
\`\`\`

## Sfaturi de Scriere

### DO:
- Scrie clar și concis
- Folosește numere concrete
- Evidențiază realizările
- Fă-l memorabil

### DON'T:
- Jargon tehnic excesiv
- Promisiuni nerealiste
- Prea multe detalii
- Texte lungi fără structură

## Test Final

Întreabă pe cineva din afara industriei să citească.

**Dacă după 2 minute înțelege:**
1. Ce faci
2. Pentru cine
3. De ce e important
4. Ce ceri

... ai un sumar executiv bun!`
          },
          {
            title: 'Pitch Deck și Prezentare',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Pitch Deck: Planul tău în 10 Slide-uri

## Structura Clasică (Guy Kawasaki)

### Slide 1: Titlu
- Nume companie + logo
- Tagline (max 8 cuvinte)
- Contact fondator

### Slide 2: Problema
- 1-3 probleme clare
- Cât de mare e durerea?
- Date/statistici

### Slide 3: Soluția
- Ce faci
- Screenshot/demo
- Beneficii cheie (3 max)

### Slide 4: De ce acum?
- Tendințe de piață
- Schimbări legislative
- Tehnologii noi disponibile

### Slide 5: Dimensiunea pieței
- TAM → SAM → SOM
- Vizualizare cerc/pâlnie

### Slide 6: Produsul/Demo
- Screenshots
- Video scurt (30 sec)
- Diferențiatori vizuali

### Slide 7: Modelul de business
- Cum faci bani
- Prețuri
- Unit economics

### Slide 8: Tracțiune
- Grafice creștere
- Clienți/Venituri
- Testimoniale/logo-uri

### Slide 9: Echipa
- Foto + nume + rol
- Credențiale relevante
- Advisori

### Slide 10: Ask
- Suma cerută
- Utilizare fonduri
- Termeni (dacă e cazul)

## Design Tips

### Font
- Titluri: 28-36pt
- Text: 18-24pt
- Minimum: 18pt (citibil de la distanță)

### Culori
- Max 3 culori
- Contrast bun
- Consistență brand

### Imagini
- Calitate înaltă
- Relevante
- Fără clip art

### Text
- Max 6 bullet points per slide
- Max 6 cuvinte per bullet
- Lasă aer

## Prezentare

### Timing
- 10 slide-uri × 2 minute = 20 minute prezentare
- 10 minute Q&A

### Practică
- Minimum 10 repetări
- Filmează-te
- Feedback de la alții

### Întrebări Frecvente

Pregătește răspunsuri pentru:
1. "Care sunt riscurile principale?"
2. "De ce voi și nu alții?"
3. "Ce se întâmplă dacă X?"
4. "Cum scalează?"
5. "Când ajungi profitabil?"

## Template Descărcabil

Vom furniza:
- Template PowerPoint/Google Slides
- Exemple completate
- Checklist prezentare`
          },
          {
            title: 'Template Plan de Afaceri Descărcabil',
            type: 'DOWNLOAD',
            duration: 15,
            order: 3,
            content: `# Template-uri Incluse

## Documente Word/Google Docs

### 1. Plan de Afaceri Complet (30 pagini)
- Toate secțiunile pre-structurate
- Instrucțiuni în paranteze [...]
- Exemple pentru fiecare secțiune
- Formatare profesională

### 2. Plan de Afaceri Simplificat (10 pagini)
- Versiune condensată
- Perfect pentru uz intern
- Actualizare rapidă

### 3. Sumar Executiv (2 pagini)
- Template cu structura optimă
- Variante pentru bănci vs investitori

## Excel/Google Sheets

### 1. Model Financiar Complet
Foi:
- Venituri (Bottom-up)
- Cheltuieli (pe categorii)
- P&L proiecție 5 ani
- Cash Flow lunar An 1
- Break-Even calculator
- Scenarii (pesimist/realist/optimist)
- Dashboard KPIs
- Asumpții documentate

### 2. Analiză Competiție
- Matrice comparativă
- Scoring automat
- Vizualizări grafice

### 3. Timeline Implementare
- Gantt simplificat
- Milestone tracking
- Responsabilități

## PowerPoint/Google Slides

### 1. Pitch Deck (10 slide-uri)
- Design profesional
- Placeholder-e pentru conținut
- Variante de culori

### 2. Prezentare Extinsă (20 slide-uri)
- Pentru prezentări detaliate
- Secțiuni suplimentare

## Cum să Folosești

1. **Descarcă** toate template-urile
2. **Citește** instrucțiunile din fiecare
3. **Completează** secțiune cu secțiune
4. **Verifică** cu checklist-ul nostru
5. **Cere feedback** înainte de finalizare

## Actualizări

Template-urile sunt actualizate:
- La schimbări legislative
- Cu best practices noi
- La feedback utilizatori

## Suport

Pentru întrebări despre template-uri:
- Forum-ul comunității
- Email suport
- Sesiuni Q&A lunare`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE 2: e-Factura SPV - Ghid Practic
  // ============================================================
  {
    slug: 'efactura-spv-ghid-practic',
    modules: [
      {
        title: 'Introducere în e-Factura',
        order: 1,
        duration: 45,
        lessons: [
          {
            title: 'Ce este e-Factura și de ce este obligatorie',
            type: 'TEXT',
            duration: 15,
            order: 1,
            isFree: true,
            content: `# e-Factura în România - Ghid Complet

## Ce este e-Factura?

e-Factura este sistemul național de facturare electronică administrat de ANAF prin platforma SPV (Spațiul Privat Virtual).

## Cadrul Legal

- **Legea 296/2023**: Obligativitate B2B de la 1 ianuarie 2024
- **OUG 120/2021**: Cadrul inițial e-Factura
- **Ordinul 1365/2021**: Specificații tehnice

## Cine trebuie să folosească e-Factura?

### Obligatoriu din 1 ianuarie 2024:
- Toate tranzacțiile B2B (între firme)
- Facturi către instituții publice (B2G)

### Obligatoriu din 1 iulie 2024:
- Toate relațiile B2B, indiferent de sumă

### Exceptate:
- Tranzacții B2C (către persoane fizice)
- Export în afara UE
- Anumite operațiuni specifice

## Beneficii

### Pentru Firme:
- Reducere costuri administrative
- Procesare automată
- Arhivare digitală obligatorie
- Integrare cu contabilitatea

### Pentru ANAF:
- Monitorizare în timp real
- Reducere evaziune
- Automatizare controale

## Formatul UBL 2.1

e-Factura folosește standardul internațional UBL 2.1 cu specificații românești (RO_CIUS).

Structura XML:
\`\`\`xml
<Invoice>
  <ID>FA001</ID>
  <IssueDate>2024-01-15</IssueDate>
  <AccountingSupplierParty>...</AccountingSupplierParty>
  <AccountingCustomerParty>...</AccountingCustomerParty>
  <InvoiceLine>...</InvoiceLine>
  <TaxTotal>...</TaxTotal>
  <LegalMonetaryTotal>...</LegalMonetaryTotal>
</Invoice>
\`\`\`

## Fluxul e-Factura

1. **Emitere**: Firma emite factura în format UBL
2. **Transmitere**: Upload în SPV ANAF
3. **Validare**: ANAF validează formatul
4. **Notificare**: Destinatarul primește notificare
5. **Descărcare**: Destinatarul descarcă factura
6. **Arhivare**: Ambele părți arhivează 10 ani

## Termene Importante

| Acțiune | Termen |
|---------|--------|
| Transmitere factura | 5 zile lucrătoare de la emitere |
| Descărcare de destinatar | 60 zile de la transmitere |
| Arhivare | 10 ani |

## Sancțiuni

- Netransmitere: 5.000 - 10.000 RON
- Transmitere cu întârziere: Avertisment sau amendă
- Nevalidare format: Factura respinsă

## Cum începi?

1. Accesează SPV ANAF
2. Obține certificat digital sau folosește credențiale
3. Alege metoda de transmitere (manual/API/soft)
4. Transmite prima factură de test`
          },
          {
            title: 'Înregistrarea în SPV ANAF',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Înregistrarea în SPV ANAF

## Ce este SPV?

Spațiul Privat Virtual (SPV) este platforma online a ANAF unde:
- Transmiți declarații fiscale
- Comunici cu ANAF
- Gestionezi e-Factura
- Vizualizezi situația fiscală

## Metode de Autentificare

### 1. Credențiale ANAF
- Username și parolă
- Gratuit
- Funcții limitate

### 2. Certificat Digital
- Token sau card criptografic
- Acces complet
- Cost: 100-300 RON/an
- Recomandat pentru utilizare intensă

### 3. Identitate Digitală
- Cartea de identitate electronică
- Disponibil pentru persoane fizice

## Pașii de Înregistrare

### Pas 1: Accesează
www.anaf.ro → Spațiul Privat Virtual

### Pas 2: Solicită acces
Click pe "Înregistrare" sau "Acces SPV"

### Pas 3: Completează formularul
- Date identificare (CUI, denumire)
- Date reprezentant legal
- Adresă email validă

### Pas 4: Verificare identitate
- La ghișeu ANAF (cu CI)
- SAU cu certificat digital valid

### Pas 5: Primește credențiale
- Email cu username
- Email separat cu parolă

### Pas 6: Prima autentificare
- Schimbă parola obligatoriu
- Configurează profilul

## Delegare Acces

### Cine poate accesa:
- Administrator/Asociat (automat)
- Contabil (cu delegare)
- Consultant fiscal (cu delegare)

### Cum delegi:
1. Autentificare în SPV
2. Meniu → Administrare → Împuterniciri
3. Adaugă persoană (CNP) sau firmă (CUI)
4. Selectează drepturile (e-Factura, declarații, etc.)
5. Confirmă

## Probleme Frecvente

### "Nu pot accesa"
- Verifică browser (Chrome/Firefox)
- Șterge cache
- Încearcă mod incognito

### "Parolă expirată"
- Schimbă la fiecare 90 zile
- Folosește "Am uitat parola"

### "Certificat nerecunoscut"
- Verifică instalarea driver-ului
- Actualizează software-ul token

## Sfaturi

1. Salvează credențialele în loc sigur
2. Configurează email corect (pentru notificări)
3. Verifică periodic accesul
4. Instruiește persoana delegată`
          },
          {
            title: 'Interfața e-Factura în SPV',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Navigarea în Modulul e-Factura

## Accesare

După autentificare în SPV:
Meniu Principal → Servicii → e-Factura

## Secțiunile Principale

### 1. Tablou de Bord (Dashboard)
- Statistici: facturi emise/primite
- Alerte: facturi noi, erori
- Sumar lunar

### 2. Facturi Emise
- Lista facturilor transmise
- Status: în așteptare, acceptat, respins
- Filtrare și căutare
- Descărcare PDF/XML

### 3. Facturi Primite
- Facturi de la furnizori
- Status: nou, vizualizat, descărcat
- Descărcare pentru contabilitate

### 4. Încărcare Factură
- Upload manual XML
- Validare înainte de transmitere
- Mesaje eroare detaliate

### 5. Rapoarte
- Export liste facturi
- Rapoarte pe perioade
- Format Excel/CSV

### 6. Setări
- Notificări email
- Delegări acces
- Configurări afișare

## Statusuri Facturi

| Status | Semnificație |
|--------|--------------|
| În procesare | ANAF verifică |
| Acceptat | Validare OK |
| Respins | Erori în XML |
| Notificat | Destinatar informat |
| Descărcat | Destinatar a descărcat |

## Acțiuni Disponibile

### Pentru facturi emise:
- Vizualizare detalii
- Descărcare PDF/XML
- Retransmitere (dacă respins)
- Anulare (în anumite condiții)

### Pentru facturi primite:
- Vizualizare
- Descărcare
- Marcare ca procesat
- Export în contabilitate

## Notificări

### Configurează alerte pentru:
- Factură nouă primită
- Eroare la transmitere
- Factură aproape de expirare
- Rapoarte periodice

### Canale:
- Email (recomandat)
- SMS (opțional, cost)
- În aplicație

## Tips & Tricks

1. **Verifică zilnic** secțiunea "Facturi primite"
2. **Descarcă imediat** - expiră în 60 zile
3. **Organizează** după data/furnizor
4. **Arhivează** automat în cloud
5. **Verifică** statusurile facturilor emise`
          }
        ]
      },
      {
        title: 'Transmiterea Facturilor',
        order: 2,
        duration: 60,
        lessons: [
          {
            title: 'Generarea Fișierului XML UBL 2.1',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Generarea Fișierului XML pentru e-Factura

## Standardul RO_CIUS UBL 2.1

România folosește specificația RO_CIUS (Core Invoice Usage Specification) bazată pe UBL 2.1.

## Structura Obligatorie

### Header (Antet)
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>FA001</cbc:ID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  <cbc:DueDate>2024-02-15</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>
</Invoice>
\`\`\`

### Furnizor (AccountingSupplierParty)
\`\`\`xml
<cac:AccountingSupplierParty>
  <cac:Party>
    <cac:PartyName>
      <cbc:Name>SC EXEMPLU SRL</cbc:Name>
    </cac:PartyName>
    <cac:PostalAddress>
      <cbc:StreetName>Strada Exemplu nr. 1</cbc:StreetName>
      <cbc:CityName>București</cbc:CityName>
      <cbc:CountrySubentity>RO-B</cbc:CountrySubentity>
      <cac:Country>
        <cbc:IdentificationCode>RO</cbc:IdentificationCode>
      </cac:Country>
    </cac:PostalAddress>
    <cac:PartyTaxScheme>
      <cbc:CompanyID>RO12345678</cbc:CompanyID>
      <cac:TaxScheme>
        <cbc:ID>VAT</cbc:ID>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
    <cac:PartyLegalEntity>
      <cbc:RegistrationName>SC EXEMPLU SRL</cbc:RegistrationName>
      <cbc:CompanyID>J40/1234/2020</cbc:CompanyID>
    </cac:PartyLegalEntity>
  </cac:Party>
</cac:AccountingSupplierParty>
\`\`\`

### Linii Factură
\`\`\`xml
<cac:InvoiceLine>
  <cbc:ID>1</cbc:ID>
  <cbc:InvoicedQuantity unitCode="C62">10</cbc:InvoicedQuantity>
  <cbc:LineExtensionAmount currencyID="RON">1000.00</cbc:LineExtensionAmount>
  <cac:Item>
    <cbc:Name>Servicii consultanță</cbc:Name>
  </cac:Item>
  <cac:Price>
    <cbc:PriceAmount currencyID="RON">100.00</cbc:PriceAmount>
  </cac:Price>
</cac:InvoiceLine>
\`\`\`

### Totaluri TVA
\`\`\`xml
<cac:TaxTotal>
  <cbc:TaxAmount currencyID="RON">190.00</cbc:TaxAmount>
  <cac:TaxSubtotal>
    <cbc:TaxableAmount currencyID="RON">1000.00</cbc:TaxableAmount>
    <cbc:TaxAmount currencyID="RON">190.00</cbc:TaxAmount>
    <cac:TaxCategory>
      <cbc:ID>S</cbc:ID>
      <cbc:Percent>19</cbc:Percent>
      <cac:TaxScheme>
        <cbc:ID>VAT</cbc:ID>
      </cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>
</cac:TaxTotal>
\`\`\`

## Validare Înainte de Transmitere

### DUKIntegrator
Instrument gratuit ANAF pentru validare locală:
1. Descarcă de pe anaf.ro
2. Instalează Java Runtime
3. Rulează validarea
4. Corectează erorile

### Erori Frecvente

| Eroare | Cauză | Soluție |
|--------|-------|---------|
| CUI invalid | Format greșit | Verifică RO prefix |
| Cod CAEN lipsă | Camp obligatoriu | Adaugă codul |
| Sumă negativă | Stornare greșită | Folosește CreditNote |
| Dată viitoare | IssueDate > azi | Corectează data |

## Generare Automată

### Din Software Contabil
- Saga
- Mentor
- WinMentor
- NextUp

### Din ERP
- SAP
- Microsoft Dynamics
- Custom solutions

### Din Platforme SaaS
- SmartBill
- Facturis
- DocumentIulia.ro

## Sfaturi

1. **Testează** întâi în mediul de test ANAF
2. **Validează local** înainte de transmitere
3. **Păstrează template** pentru facturile standard
4. **Documentează** mapping-ul câmpurilor`
          },
          {
            title: 'Transmiterea prin SPV - Manual',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Transmiterea Manuală prin SPV

## Când folosești transmiterea manuală?

- Volum mic de facturi (<50/lună)
- Fără software de facturare
- Backup când API-ul nu funcționează

## Pașii de Transmitere

### Pas 1: Pregătirea Fișierului
- Generează XML valid
- Validează cu DUKIntegrator
- Verifică dimensiunea (<10 MB)

### Pas 2: Accesează SPV
- www.anaf.ro → SPV
- Autentificare
- Meniu → e-Factura → Încărcare

### Pas 3: Selectează Fișierul
- Click "Încarcă fișier XML"
- Navighează la fișier
- Selectează și confirmă

### Pas 4: Verificare Automată
SPV verifică:
- Format XML valid
- Câmpuri obligatorii
- CUI-uri valide
- Sume corecte

### Pas 5: Rezultat

**Acceptat:**
- Primești ID unic (index de încărcare)
- Factura e transmisă destinatarului
- Salvează confirmarea!

**Respins:**
- Mesaje de eroare detaliate
- Corectează și retransmite
- Nu se percepe taxă

## Transmitere Multiplă (Batch)

### Pregătire:
1. Generează mai multe XML-uri
2. Arhivează în ZIP
3. Maxim 500 facturi/zip

### Încărcare:
1. Meniu → Încărcare lot
2. Selectează ZIP
3. Așteaptă procesare
4. Verifică raport

## Monitorizarea Statusului

### Unde verifici:
e-Factura → Facturi Emise → Căutare

### Informații disponibile:
- ID încărcare
- Data transmitere
- Status curent
- ID destinatar
- Data descărcare

## Probleme Frecvente

### "Fișier prea mare"
**Soluție:** Împarte în mai multe fișiere

### "CUI destinatar invalid"
**Soluție:** Verifică în Registrul Comerțului

### "Eroare server"
**Soluție:** Încearcă mai târziu, salvează dovada

### "Sesiune expirată"
**Soluție:** Re-autentificare, nu pierde fișierul

## Confirmări de Salvat

1. Screenshot cu ID încărcare
2. PDF factură descărcat din SPV
3. Raport lot (pentru transmitere multiplă)
4. Email notificare ANAF`
          },
          {
            title: 'Integrare API pentru Automatizare',
            type: 'TEXT',
            duration: 25,
            order: 3,
            content: `# Automatizarea cu API ANAF

## De ce API?

- Volum mare de facturi (>50/lună)
- Integrare cu ERP/software
- Zero intervenție manuală
- Procesare în timp real

## Tipuri de API ANAF

### 1. API REST e-Factura
- Upload facturi
- Descărcare facturi primite
- Verificare status
- Listare facturi

### 2. API Validare
- Verificare format XML
- Pre-validare înainte de transmitere

## Autentificare API

### Metoda: OAuth 2.0

1. **Înregistrare aplicație** în SPV
2. **Obținere client_id și client_secret**
3. **Token request:**
\`\`\`
POST https://api.anaf.ro/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
\`\`\`

4. **Răspuns:**
\`\`\`json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
\`\`\`

## Endpoints Principale

### Upload Factură
\`\`\`
POST https://api.anaf.ro/prod/FCTEL/rest/upload
Authorization: Bearer {token}
Content-Type: application/xml

{XML e-Factura}
\`\`\`

### Verificare Status
\`\`\`
GET https://api.anaf.ro/prod/FCTEL/rest/status/{id_incarcare}
Authorization: Bearer {token}
\`\`\`

### Descărcare Facturi Primite
\`\`\`
GET https://api.anaf.ro/prod/FCTEL/rest/descarcare?zile=30
Authorization: Bearer {token}
\`\`\`

## Răspunsuri API

### Succes:
\`\`\`json
{
  "id_incarcare": "1234567890",
  "data_incarcare": "2024-01-15T10:30:00",
  "stare": "OK"
}
\`\`\`

### Eroare:
\`\`\`json
{
  "error_code": "INVALID_XML",
  "error_message": "Element 'InvoiceTypeCode' is missing",
  "details": [...]
}
\`\`\`

## Coduri Eroare Frecvente

| Cod | Descriere | Acțiune |
|-----|-----------|---------|
| 400 | XML invalid | Verifică format |
| 401 | Token expirat | Reautentificare |
| 404 | ID negăsit | Verifică parametri |
| 429 | Rate limit | Așteaptă, retry |
| 500 | Eroare server | Retry cu backoff |

## Best Practices

### Rate Limiting
- Max 10 request/secundă
- Implementează exponential backoff
- Cache tokenuri

### Retry Strategy
\`\`\`javascript
async function uploadWithRetry(xml, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadInvoice(xml);
    } catch (error) {
      if (error.code === 429 || error.code >= 500) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
\`\`\`

### Logging
- Loghează toate request/response
- Salvează pentru audit
- Alertează la erori persistente

### Webhook-uri
- Configurează notificări push
- Evită polling constant
- Procesare asincronă

## Librării și SDK-uri

### Node.js
\`\`\`javascript
const anafClient = require('anaf-efactura-client');
await anafClient.upload(invoiceXml);
\`\`\`

### Python
\`\`\`python
from anaf_efactura import Client
client = Client(client_id, client_secret)
client.upload(invoice_xml)
\`\`\`

### PHP
\`\`\`php
$anaf = new AnafEfacturaClient($credentials);
$anaf->uploadInvoice($xmlContent);
\`\`\``
          }
        ]
      },
      {
        title: 'Gestionarea Facturilor Primite',
        order: 3,
        duration: 45,
        lessons: [
          {
            title: 'Descărcarea și Procesarea Facturilor',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Gestionarea Facturilor Primite

## Monitorizarea Facturilor Noi

### Verificare Zilnică
1. Accesează SPV → e-Factura → Facturi Primite
2. Filtrează: Status = "Noi"
3. Verifică lista

### Notificări Automate
- Configurează email în Setări
- Primești alert la factură nouă
- Include link direct

## Descărcarea Facturilor

### Manual din SPV:
1. Selectează factura
2. Click "Descarcă"
3. Alege format: XML + PDF
4. Salvează local

### Automat via API:
\`\`\`javascript
// Descarcă facturi din ultimele 30 zile
const facturi = await anafClient.getReceivedInvoices({
  zile: 30,
  stare: 'nedescarcat'
});

for (const factura of facturi) {
  const xml = await anafClient.downloadInvoice(factura.id);
  await saveToDatabase(xml);
}
\`\`\`

## Termene Importante

| Acțiune | Termen |
|---------|--------|
| Descărcare | 60 zile de la transmitere |
| Procesare contabilă | Conform termenelor interne |
| Arhivare | 10 ani |

### Ce se întâmplă după 60 zile?
- Factura NU dispare
- Dar nu mai generează notificări
- Trebuie căutată manual

## Procesarea în Contabilitate

### Workflow Recomandat:

1. **Descărcare**
   - Zilnic sau automat
   - Salvează XML + PDF

2. **Validare**
   - Verifică datele
   - Potrivește cu comanda/contract
   - Verifică prețuri/cantități

3. **Înregistrare**
   - Import în software contabil
   - Atribuie cont
   - Asociază cu furnizor

4. **Aprobare**
   - Workflow de aprobare
   - Semn de la manager
   - Programare plată

5. **Arhivare**
   - Folder structurat
   - Backup regulat
   - Accesibil pentru audit

## Organizare Fișiere

### Structură Recomandată:
\`\`\`
/Facturi/
├── 2024/
│   ├── 01-Ianuarie/
│   │   ├── Primite/
│   │   │   ├── FA001_Furnizor_2024-01-15.xml
│   │   │   ├── FA001_Furnizor_2024-01-15.pdf
│   │   │   └── ...
│   │   └── Emise/
│   │       └── ...
│   └── 02-Februarie/
│       └── ...
└── Arhiva/
    └── ...
\`\`\`

### Convenție Denumire:
\`[Număr]_[Furnizor]_[Data].xml\`

## Integrare Software Contabil

### Import Automat:
- Saga: Import XML nativ
- Mentor: Modul e-Factura
- WinMentor: Plugin disponibil

### Mapare Câmpuri:
| e-Factura | Contabilitate |
|-----------|---------------|
| SupplierParty | Furnizor |
| InvoiceLine | Articol/Serviciu |
| TaxTotal | TVA |
| DueDate | Scadență |

## Probleme Frecvente

### "Furnizor necunoscut"
- Adaugă în nomenclator
- Mapează CUI

### "TVA diferit"
- Verifică cota aplicată
- Rotunjiri diferite

### "Articol negăsit"
- Crează articol nou
- Sau mapează manual

## Rapoarte Utile

1. **Facturi neînregistrate** - evită restanțe
2. **Scadențar furnizori** - planifică plăți
3. **Reconciliere** - potrivește cu extrase`
          },
          {
            title: 'Arhivarea Conform Legii',
            type: 'TEXT',
            duration: 15,
            order: 2,
            content: `# Arhivarea e-Facturilor

## Cerințe Legale

### Termen Arhivare:
**10 ani** de la data emiterii

### Format Arhivare:
- XML original (obligatoriu)
- PDF (recomandat)
- Metadate asociate

### Integritate:
- Fișierele NU pot fi modificate
- Timestamp verificabil
- Semnătură electronică păstrată

## Metode de Arhivare

### 1. Locală (On-premise)
**Avantaje:**
- Control total
- Fără costuri recurente

**Dezavantaje:**
- Responsabilitate backup
- Risc pierdere date

**Cerințe:**
- Server/NAS dedicat
- Backup automat (3-2-1)
- Acces controlat

### 2. Cloud Storage
**Avantaje:**
- Redundanță automată
- Acces de oriunde
- Scalabilitate

**Furnizori Recomandați:**
- Google Cloud Storage
- Amazon S3
- Azure Blob
- Bunny.net (UE)

**Configurare tipică:**
\`\`\`javascript
// Exemplu S3
const params = {
  Bucket: 'facturi-arhiva',
  Key: \`\${year}/\${month}/\${invoiceId}.xml\`,
  Body: xmlContent,
  StorageClass: 'GLACIER_IR', // Cost redus
  ServerSideEncryption: 'AES256'
};
await s3.upload(params).promise();
\`\`\`

### 3. Servicii Specializate
- Arhive electronice certificate
- Conformitate garantată
- Costisitoare dar sigure

## Structură Recomandată

### Folder Structure:
\`\`\`
/Arhiva-eFactura/
├── Emise/
│   └── 2024/
│       └── 01/
│           ├── index.json
│           ├── FA001.xml
│           └── FA001.pdf
├── Primite/
│   └── 2024/
│       └── 01/
│           ├── index.json
│           └── ...
└── Metadata/
    └── checksums.json
\`\`\`

### Index File (index.json):
\`\`\`json
{
  "facturi": [
    {
      "id": "FA001",
      "data": "2024-01-15",
      "furnizor": "SC Exemplu SRL",
      "suma": 1190.00,
      "file": "FA001.xml",
      "checksum": "sha256:abc123..."
    }
  ]
}
\`\`\`

## Backup Strategy (3-2-1)

- **3** copii ale datelor
- **2** tipuri diferite de stocare
- **1** copie off-site

### Implementare:
1. Original: Server local
2. Copie 1: NAS intern
3. Copie 2: Cloud backup

## Verificare Integritate

### Periodic (lunar):
1. Verifică checksums
2. Test restore random
3. Audit trail

### Script Verificare:
\`\`\`bash
#!/bin/bash
# Verifică integritatea arhivei
find /Arhiva-eFactura -name "*.xml" | while read file; do
  stored_hash=$(grep "$file" checksums.json | cut -d'"' -f4)
  actual_hash=$(sha256sum "$file" | cut -d' ' -f1)
  if [ "$stored_hash" != "$actual_hash" ]; then
    echo "CORRUPT: $file"
  fi
done
\`\`\`

## La Audit/Control ANAF

### Ce trebuie să poți:
1. Găsi orice factură în <5 minute
2. Demonstra integritatea (checksums)
3. Arăta continuitatea (fără gaps)
4. Export în format solicitat

### Pregătire:
- Index searchable
- Rapoarte pre-generate
- Contact IT disponibil`
          },
          {
            title: 'Quiz: e-Factura în Practică',
            type: 'QUIZ',
            duration: 10,
            order: 3,
            content: `# Quiz: Verifică-ți Cunoștințele

## Întrebarea 1
În câte zile trebuie transmisă e-factura de la emitere?
- A) 24 ore
- B) 3 zile lucrătoare
- C) 5 zile lucrătoare ✓
- D) 10 zile lucrătoare

## Întrebarea 2
Ce format folosește e-Factura în România?
- A) PDF simplu
- B) JSON
- C) UBL 2.1 XML (RO_CIUS) ✓
- D) CSV

## Întrebarea 3
Cât timp trebuie arhivate e-facturile?
- A) 5 ani
- B) 7 ani
- C) 10 ani ✓
- D) 15 ani

## Întrebarea 4
Ce tool gratuit ANAF folosești pentru validare?
- A) PDF Validator
- B) DUKIntegrator ✓
- C) XMLChecker
- D) AnafValidator

## Întrebarea 5
Care e termenul de descărcare pentru facturi primite?
- A) 30 zile
- B) 60 zile ✓
- C) 90 zile
- D) Nelimitat

## Întrebarea 6
Ce prefix trebuie să aibă CUI-ul pentru TVA?
- A) EU
- B) ROM
- C) RO ✓
- D) Nu e nevoie de prefix

## Rezultat
Verifică răspunsurile și revizuiește lecțiile pentru temele cu răspuns greșit!`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE 3: Digitalizare pentru IMM-uri
  // ============================================================
  {
    slug: 'digitalizare-imm-primi-pasi',
    modules: [
      {
        title: 'Fundamentele Digitalizării',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Ce înseamnă Digitalizare pentru o Afacere Mică',
            type: 'TEXT',
            duration: 20,
            order: 1,
            isFree: true,
            content: `# Digitalizarea IMM-urilor - Ghid de Start

## Ce este Digitalizarea?

Digitalizarea înseamnă transformarea proceselor manuale în procese digitale pentru eficiență, acuratețe și scalabilitate.

## De ce contează pentru IMM-uri?

### Eficiență operațională
- Automatizare sarcini repetitive
- Reducere erori umane
- Economie de timp

### Competitivitate
- Clienții așteaptă digital
- Competitorii se digitalizează
- Piața evoluează

### Scalabilitate
- Creștere fără costuri proporționale
- Procese standardizate
- Date pentru decizii

## Niveluri de Digitalizare

### Nivel 1: Bazic
- Email pentru comunicare
- Excel pentru evidențe
- Facturare electronică

### Nivel 2: Intermediar
- Software contabil/ERP
- Website/prezență online
- Plăți electronice

### Nivel 3: Avansat
- Automatizări complete
- Integrări între sisteme
- Analiză date/BI

### Nivel 4: Transformare Digitală
- Modele de business digitale
- AI și automatizare avansată
- Ecosistem digital complet

## De unde începi?

### Audit Digital:
1. Ce procese sunt manuale?
2. Unde pierzi cel mai mult timp?
3. Unde apar cele mai multe erori?
4. Ce spun clienții că le lipsește?

### Prioritizare:
- Impact mare + Efort mic = START AICI
- Impact mare + Efort mare = Planifică
- Impact mic = Mai târziu sau deloc

## Mituri despre Digitalizare

### ❌ "E prea scump"
Multe tool-uri au versiuni gratuite sau ieftine pentru IMM.

### ❌ "E prea complicat"
Soluțiile moderne sunt intuitive și ușor de învățat.

### ❌ "Nu am timp"
Investiția inițială economisește timp pe termen lung.

### ❌ "Nu e pentru industria mea"
Orice industrie beneficiază de digitalizare.

## ROI Tipic

| Investiție | Economie | Timp Recuperare |
|------------|----------|-----------------|
| Email profesional | 2h/săpt. | 1 lună |
| Software facturare | 5h/săpt. | 2 luni |
| CRM simplu | 3h/săpt. | 3 luni |
| Automatizări | 10h/săpt. | 6 luni |

## Primul Pas

Identifică UN SINGUR proces de digitalizat:
- Cel care te frustrează cel mai mult
- Cel care consumă cel mai mult timp
- Cel unde faci cele mai multe erori

Începe mic, măsoară, apoi extinde.`
          },
          {
            title: 'Tool-uri Esențiale pentru Start',
            type: 'TEXT',
            duration: 20,
            order: 2,
            content: `# Tool-uri Digitale pentru IMM-uri

## Categoria 1: Comunicare

### Email Profesional
**Opțiuni:**
- Google Workspace (6€/user/lună)
- Microsoft 365 (5€/user/lună)
- Zoho Mail (gratuit/1€)

**De ce contează:**
- Adresă @firma.ro
- Profesionalism
- Stocare cloud inclusă

### Comunicare Internă
**Opțiuni:**
- Slack (gratuit pentru mici)
- Microsoft Teams (inclus în 365)
- Discord (gratuit)

**Beneficii:**
- Canale pe proiecte/departamente
- Istoric căutabil
- Integrări cu alte app-uri

## Categoria 2: Productivitate

### Documente Cloud
**Opțiuni:**
- Google Drive (15GB gratuit)
- Dropbox (2GB gratuit)
- OneDrive (5GB gratuit)

### Editare Colaborativă
**Opțiuni:**
- Google Docs/Sheets (gratuit)
- Microsoft Office Online (gratuit)
- Notion (gratuit pentru personal)

## Categoria 3: Finanțe

### Facturare
**Opțiuni România:**
- SmartBill (de la 29 RON/lună)
- Facturis (de la 19 RON/lună)
- DocumentIulia.ro (freemium)

### Contabilitate Simplă
**Opțiuni:**
- SAGA (licență)
- NextUp (cloud)
- Contapp (mobil)

### Plăți
- Stripe/PayPal pentru online
- SumUp pentru POS mobil
- Revolut Business pentru card

## Categoria 4: Vânzări & Clienți

### CRM Simplu
**Opțiuni gratuite:**
- HubSpot CRM (generos gratuit)
- Zoho CRM (3 users gratuit)
- Bitrix24 (12 users gratuit)

### E-commerce
**Opțiuni:**
- Shopify (de la $29/lună)
- WooCommerce (gratuit, self-hosted)
- Gomag (de la 79 RON/lună)

## Categoria 5: Marketing

### Social Media
- Buffer/Hootsuite pentru programare
- Canva pentru design
- Later pentru Instagram

### Email Marketing
- Mailchimp (gratuit până la 500)
- Brevo (gratuit 300/zi)
- ConvertKit pentru creatori

## Stiva Recomandată pentru Start

### Buget 0 RON/lună:
1. Gmail (personal) + Google Drive
2. WhatsApp Business
3. Canva gratuit
4. Notion pentru note

### Buget ~100 RON/lună:
1. Google Workspace
2. SmartBill bază
3. HubSpot CRM gratuit
4. Canva Pro

### Buget ~500 RON/lună:
1. Microsoft 365 Business
2. Software contabil complet
3. CRM cu automatizări
4. Marketing tools

## Cum Alegi

### Criterii:
1. Ușurință în utilizare
2. Suport în română
3. Integrări disponibile
4. Scalabilitate
5. Raport calitate/preț

### Testează înainte:
- Majoritatea au trial gratuit
- Testează cu date reale
- Implică echipa în evaluare`
          },
          {
            title: 'Roadmap de Digitalizare în 12 Luni',
            type: 'TEXT',
            duration: 20,
            order: 3,
            content: `# Plan de Digitalizare pe 12 Luni

## Luna 1-2: Fundația

### Săptămâna 1-2:
- [ ] Audit procese actuale
- [ ] Identificare pain points
- [ ] Inventar tool-uri existente

### Săptămâna 3-4:
- [ ] Setup email profesional
- [ ] Migrare documente în cloud
- [ ] Training echipă bazic

### Săptămâna 5-8:
- [ ] Implementare software facturare
- [ ] Conectare e-Factura ANAF
- [ ] Proceduri standard create

### Rezultat Luna 2:
✓ Email @firma.ro funcțional
✓ Documente accesibile oriunde
✓ Facturare electronică activă

## Luna 3-4: Operațiuni

### Focus:
- Contabilitate digitală
- Comunicare internă
- Backup și securitate

### Acțiuni:
- [ ] Software contabil configurat
- [ ] Slack/Teams pentru echipă
- [ ] Backup automat activat
- [ ] Parole în manager (1Password/Bitwarden)

### Rezultat Luna 4:
✓ Contabilitate în timp real
✓ Comunicare centralizată
✓ Date securizate

## Luna 5-6: Clienți

### Focus:
- CRM implementat
- Prezență online
- Automatizări simple

### Acțiuni:
- [ ] CRM cu contacte importate
- [ ] Website actualizat/creat
- [ ] Google Business Profile
- [ ] Template-uri email

### Rezultat Luna 6:
✓ Vizibilitate clienți 360°
✓ Online prezent
✓ Răspunsuri mai rapide

## Luna 7-8: Vânzări

### Focus:
- Proces vânzare digitalizat
- E-commerce (dacă relevant)
- Pipeline management

### Acțiuni:
- [ ] Funnel vânzări în CRM
- [ ] Oferte digitale
- [ ] Semnătură electronică
- [ ] Plăți online (dacă B2C)

### Rezultat Luna 8:
✓ Vânzări tracked
✓ Conversii măsurate
✓ Închideri mai rapide

## Luna 9-10: Marketing

### Focus:
- Content digital
- Social media consistent
- Email marketing

### Acțiuni:
- [ ] Calendar conținut
- [ ] Automatizări social
- [ ] Newsletter lunar
- [ ] Landing pages

### Rezultat Luna 10:
✓ Brand vizibil
✓ Lead-uri digitale
✓ Audiență în creștere

## Luna 11-12: Optimizare

### Focus:
- Analiză date
- Automatizări avansate
- Planificare an următor

### Acțiuni:
- [ ] Dashboard KPIs
- [ ] Integrări între sisteme
- [ ] Audit rezultate
- [ ] Plan anul următor

### Rezultat Luna 12:
✓ Decizii bazate pe date
✓ Procese fluide
✓ Roadmap clear

## Măsurare Progres

### KPIs de urmărit:
| Metric | Înainte | După | Target |
|--------|---------|------|--------|
| Ore admin/săpt | 15h | 5h | -66% |
| Timp răspuns client | 24h | 4h | -83% |
| Erori facturi | 5% | 0.5% | -90% |
| Clienți noi/lună | 5 | 15 | +200% |

### Review lunar:
1. Ce am implementat?
2. Ce a funcționat?
3. Ce trebuie ajustat?
4. Ce urmează?

## Buget Estimativ

| Fază | Investiție |
|------|------------|
| Luna 1-2 | 500-1000 RON |
| Luna 3-4 | 300-500 RON/lună |
| Luna 5-6 | 500-1000 RON (website) |
| Luna 7-12 | 500-1500 RON/lună |

**Total An 1:** 5.000-15.000 RON
**ROI estimat:** 3-5x în economii și vânzări`
          }
        ]
      }
    ]
  }
];

export default additionalCoursesComplete;
