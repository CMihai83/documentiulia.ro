// Project Management Masterclass - Module 2: Planificarea Proiectului
// Elite-level comprehensive content

export const pmModule2 = {
  title: 'Planificarea Proiectului',
  description: 'WBS, estimari, grafic Gantt, buget si planificarea resurselor',
  order: 2,
  lessons: [
    {
      title: 'WBS - Work Breakdown Structure - Descompunerea Lucrarilor',
      slug: 'wbs-work-breakdown-structure',
      type: 'TEXT' as const,
      duration: 50,
      order: 1,
      isFree: false,
      content: `# WBS - Work Breakdown Structure

## Ce este WBS?

**Work Breakdown Structure (WBS)** este descompunerea ierarhica a intregului scope al proiectului in componente gestionabile.

### Regula de baza

> "Daca nu este in WBS, nu este in proiect!"

---

## Structura WBS

### Niveluri Ierarhice

\`\`\`
Nivel 0: PROIECT (root)
    │
    ├── Nivel 1: Faze/Livrabile Majore
    │       │
    │       ├── Nivel 2: Componente
    │       │       │
    │       │       ├── Nivel 3: Sub-componente
    │       │       │       │
    │       │       │       └── Nivel 4: Pachete de lucru (Work Packages)
\`\`\`

### Exemplu WBS - Proiect Website

\`\`\`
1.0 PROIECT WEBSITE CORPORATIV
│
├── 1.1 MANAGEMENT PROIECT
│   ├── 1.1.1 Initiare
│   │   └── 1.1.1.1 Project Charter
│   ├── 1.1.2 Planificare
│   │   ├── 1.1.2.1 Plan management
│   │   └── 1.1.2.2 WBS
│   ├── 1.1.3 Monitorizare
│   │   ├── 1.1.3.1 Rapoarte status
│   │   └── 1.1.3.2 Meetings
│   └── 1.1.4 Inchidere
│       └── 1.1.4.1 Lessons learned
│
├── 1.2 DESIGN
│   ├── 1.2.1 UX Research
│   │   ├── 1.2.1.1 Analiza competitori
│   │   └── 1.2.1.2 User interviews
│   ├── 1.2.2 Wireframes
│   │   ├── 1.2.2.1 Homepage
│   │   ├── 1.2.2.2 Pagini secundare
│   │   └── 1.2.2.3 Mobile
│   └── 1.2.3 Design Visual
│       ├── 1.2.3.1 Mockups
│       └── 1.2.3.2 Design system
│
├── 1.3 DEZVOLTARE
│   ├── 1.3.1 Frontend
│   │   ├── 1.3.1.1 HTML/CSS
│   │   ├── 1.3.1.2 JavaScript
│   │   └── 1.3.1.3 Responsive
│   ├── 1.3.2 Backend
│   │   ├── 1.3.2.1 CMS setup
│   │   └── 1.3.2.2 API-uri
│   └── 1.3.3 Integrari
│       ├── 1.3.3.1 Analytics
│       └── 1.3.3.2 Newsletter
│
├── 1.4 CONTINUT
│   ├── 1.4.1 Copywriting
│   ├── 1.4.2 Imagini
│   └── 1.4.3 Video
│
├── 1.5 TESTARE
│   ├── 1.5.1 Teste functionale
│   ├── 1.5.2 Teste browser
│   └── 1.5.3 Teste performanta
│
└── 1.6 LANSARE
    ├── 1.6.1 Migrare productie
    ├── 1.6.2 DNS redirect
    └── 1.6.3 Monitorizare post-launch
\`\`\`

---

## Regula 100%

### Definitie

Suma tuturor componentelor de pe un nivel trebuie sa fie egala cu 100% din nivelul superior.

\`\`\`typescript
interface WBSElement {
  cod: string;
  nume: string;
  nivel: number;
  parinte?: string;
  copii: WBSElement[];
  esteWorkPackage: boolean;
}

function verificaRegula100(element: WBSElement): boolean {
  if (element.copii.length === 0) {
    return true; // Work package, OK
  }

  // Suma copiilor trebuie sa acopere 100% din parinte
  // Verificare logica - nu exista element neinclus
  const acoperireaCompleta = element.copii.every(
    copil => verificaRegula100(copil)
  );

  return acoperireaCompleta;
}
\`\`\`

---

## Work Package (Pachet de Lucru)

### Caracteristici

- Cel mai jos nivel din WBS
- Poate fi **estimat** (efort, cost)
- Poate fi **atribuit** unei persoane/echipe
- Poate fi **monitorizat** si controlat
- Durata tipica: **8-80 ore** (regula de baza)

### Dictionar WBS

\`\`\`typescript
interface WorkPackageDictionary {
  cod: string;
  nume: string;
  descriere: string;
  criteriAcceptanta: string[];
  responsabil: string;
  efortEstimat: number; // ore
  costEstimat: number;
  precedente: string[];
  livrabil: string;
  riscuri: string[];
}

const exempluWP: WorkPackageDictionary = {
  cod: '1.2.3.1',
  nume: 'Mockups Design',
  descriere: 'Crearea mockup-urilor in high-fidelity pentru toate paginile site-ului',
  criteriAcceptanta: [
    'Mockups pentru toate 10 paginile identificate',
    'Versiuni desktop si mobile',
    'Aprobat de client in scris'
  ],
  responsabil: 'Senior Designer',
  efortEstimat: 40,
  costEstimat: 4000,
  precedente: ['1.2.2.1', '1.2.2.2', '1.2.2.3'],
  livrabil: 'Fisiere Figma + PDF export',
  riscuri: ['Iteratii multiple cu clientul pot intarzia']
};
\`\`\`

---

## Tehnici de Creare WBS

### 1. Top-Down (Descompunere)

\`\`\`
Proiect
   ↓ "Ce componente majore are?"
Faze
   ↓ "Ce contine fiecare faza?"
Componente
   ↓ "Ce trebuie facut pentru fiecare?"
Work Packages
\`\`\`

### 2. Bottom-Up (Agregare)

\`\`\`
Lista toate taskurile posibile
   ↓ "Cum le grupam logic?"
Grupeaza in componente
   ↓ "Ce faze rezulta?"
Organizeaza in faze
   ↓ "Verifica completitudine"
Valideaza WBS
\`\`\`

### 3. Template-uri

Foloseste WBS-uri din proiecte similare anterioare ca punct de plecare.

---

## Erori Frecvente WBS

### Ce sa EVITI

\`\`\`
❌ Confuzie WBS cu lista de taskuri (WBS e ierarhic)
❌ Includere activitati (verbe) in loc de livrabile (substantive)
❌ Work packages prea mari (>80 ore)
❌ Work packages prea mici (<8 ore)
❌ Lipsa regula 100%
❌ Niveluri inconsistente
❌ Excluderea managementului de proiect
\`\`\`

### Exemple

\`\`\`
❌ "1.2.1 Creeaza wireframes"     ← verb, e task
✓ "1.2.1 Wireframes"              ← substantiv, e livrabil

❌ WP de 200 ore                  ← prea mare, imparti!
✓ WP de 40 ore

❌ WP de 2 ore                    ← prea mic, grupeaza!
✓ WP de 16 ore (4 x 4 ore grupate)
\`\`\`

---

## WBS in Software/Agile

### Adaptare pentru Proiecte Agile

\`\`\`
1.0 PRODUCT
│
├── 1.1 EPIC: User Authentication
│   ├── 1.1.1 Feature: Login
│   │   ├── Story: Email/password login
│   │   ├── Story: Social login
│   │   └── Story: 2FA
│   └── 1.1.2 Feature: Registration
│       ├── Story: Basic registration
│       └── Story: Email verification
│
├── 1.2 EPIC: Dashboard
│   └── ...
│
└── 1.3 EPIC: Reporting
    └── ...
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Creati WBS complet pentru organizarea unui eveniment corporate (100 persoane, o zi).

**Exercitiul 2:** Identificati 5 erori in WBS-ul urmator si corectati-le:
\`\`\`
1.0 Proiect
├── 1.1 Analizeaza cerinte (500 ore)
├── 1.2 Creeaza rapoarte
├── 1.3 Testare
│   └── 1.3.1 Verifica butonul "OK"
└── 1.4 Training
\`\`\`

**Exercitiul 3:** Completati dictionarul WBS pentru 3 work packages din proiectul dvs.

---

*Lectia urmatoare: Estimari - Tehnici si Bune Practici*`
    },
    {
      title: 'Estimari - Tehnici si Bune Practici',
      slug: 'estimari-tehnici-bune-practici',
      type: 'TEXT' as const,
      duration: 45,
      order: 2,
      isFree: false,
      content: `# Estimari in Managementul de Proiect

## De ce sunt Estimarile Dificile?

### Factori de Incertitudine

- **Complexitate** - nu stim tot ce nu stim
- **Experienta** - variaza in echipa
- **Dependente** - factori externi
- **Optimism** - tendinta naturala umana
- **Presiune** - deadline-uri impuse

---

## Tehnici de Estimare

### 1. Estimare Analogica (Top-Down)

Bazata pe proiecte similare anterioare.

\`\`\`typescript
interface EstimareAnalogica {
  proiectReferinta: string;
  durataReferinta: number;
  costReferinta: number;

  factorAjustare: number; // ex: 1.2 pentru 20% mai complex

  durataEstimata: number;
  costEstimat: number;
}

function estimeazaAnalogic(
  referinta: ProiectAnterior,
  factorComplexitate: number
): Estimare {
  return {
    durata: referinta.durata * factorComplexitate,
    cost: referinta.cost * factorComplexitate,
    incredere: 'Scazuta-Medie'
  };
}

// Exemplu
// Proiect anterior: 100 zile, 200.000 RON
// Proiect nou 30% mai complex:
// Estimare: 130 zile, 260.000 RON
\`\`\`

**Avantaje:** Rapid, util la inceput
**Dezavantaje:** Depinde de similitudine, acuratete scazuta

---

### 2. Estimare Parametrica

Foloseste relatii matematice intre variabile.

\`\`\`typescript
interface EstimareParametrica {
  parametruBaza: string;
  valoareParametru: number;
  costPerUnitate: number;
  orePeUnitate: number;
}

function estimeazaParametric(params: EstimareParametrica): Estimare {
  return {
    cost: params.valoareParametru * params.costPerUnitate,
    ore: params.valoareParametru * params.orePeUnitate
  };
}

// Exemple:
// - Cost constructie: 800 EUR/mp * 500mp = 400.000 EUR
// - Dezvoltare software: 40 ore/ecran * 25 ecrane = 1000 ore
// - Testare: 30% din efort dezvoltare
\`\`\`

**Avantaje:** Obiectiv, scalabil
**Dezavantaje:** Necesita date istorice, nu capteaza unicitatea

---

### 3. Estimare Bottom-Up

Estimare detaliata la nivel de work package, apoi agregare.

\`\`\`typescript
interface EstimareBottomUp {
  workPackages: {
    cod: string;
    nume: string;
    efortOre: number;
    costMateriale: number;
    costResurse: number;
  }[];
}

function calculeazaTotalBottomUp(estimari: EstimareBottomUp): Totale {
  const totalOre = estimari.workPackages.reduce(
    (sum, wp) => sum + wp.efortOre, 0
  );
  const totalCost = estimari.workPackages.reduce(
    (sum, wp) => sum + wp.costMateriale + wp.costResurse, 0
  );

  return {
    efortTotal: totalOre,
    costTotal: totalCost,
    incredere: 'Ridicata'
  };
}
\`\`\`

**Avantaje:** Precizie ridicata, ownership echipa
**Dezavantaje:** Consumator de timp, necesita WBS complet

---

### 4. Estimare in Trei Puncte (PERT)

Combina optimism, realism si pesimism.

\`\`\`typescript
interface EstimarePERT {
  optimist: number;  // Best case (O)
  probabil: number;  // Most likely (M)
  pesimist: number;  // Worst case (P)
}

function calculeazaPERT(e: EstimarePERT): number {
  // Formula PERT: (O + 4M + P) / 6
  return (e.optimist + 4 * e.probabil + e.pesimist) / 6;
}

function calculeazaDeviatieStandard(e: EstimarePERT): number {
  // Deviatie: (P - O) / 6
  return (e.pesimist - e.optimist) / 6;
}

// Exemplu:
// O = 10 zile, M = 15 zile, P = 26 zile
// PERT = (10 + 60 + 26) / 6 = 16 zile
// Deviatie = (26 - 10) / 6 = 2.67 zile
// Interval incredere 95%: 16 +/- (2 * 2.67) = 10.66 - 21.34 zile
\`\`\`

---

### 5. Planning Poker (Agile)

Estimare colaborativa folosind carti.

\`\`\`
SECVENTA FIBONACCI: 1, 2, 3, 5, 8, 13, 21, 34...

PROCES:
1. Product Owner prezinta User Story
2. Echipa discuta
3. Fiecare alege o carte (fara a vedea pe altii)
4. Toate cartile se arata simultan
5. Daca diferenta mare → discutie
6. Se repeta pana la consens

AVANTAJE:
- Elimina ancorarea
- Stimuleaza discutia
- Valorifica expertiza diversa
\`\`\`

---

## Contingency (Rezerve)

### Tipuri de Rezerve

\`\`\`typescript
interface Rezerve {
  // Pentru riscuri cunoscute, cuantificabile
  rezervaContingenta: {
    valoare: number;
    baza: 'Analiza riscuri';
    controlataDe: 'Manager Proiect';
  };

  // Pentru riscuri necunoscute (unknown-unknowns)
  rezervaManagement: {
    valoare: number;
    procent: number; // tipic 5-15%
    baza: 'Incertitudine generala';
    controlataDe: 'Sponsor';
  };
}

// Exemplu calcul:
// Estimare baza: 100.000 RON
// Contingenta (din analiza riscuri): 15.000 RON
// Rezerva management (10%): 10.000 RON
// TOTAL BUGET: 125.000 RON
\`\`\`

---

## Acuratete vs Precizie

### Concepte

\`\`\`
PRECIZIE: Cat de detaliata e estimarea
  - "Intre 100-200 zile" → precizie scazuta
  - "147 zile" → precizie ridicata

ACURATETE: Cat de aproape de realitate
  - Estimat: 147 zile, Real: 150 zile → acuratete buna
  - Estimat: 147 zile, Real: 300 zile → acuratete slaba

ATENTIE: Precizia inalta NU garanteaza acuratete!
"Ne va lua exact 147.5 zile" poate fi complet gresit.
\`\`\`

### Cone of Uncertainty

\`\`\`
                    │
Variatie    +100%   │    ●
estimare            │   ● ●
                    │  ●   ●
            +25%    │ ●     ●
                    │●       ●
            Actual ─│─────────●────────────────→ Timp
                    │
            -25%    │
                    │
            -50%    │
                    │
                    └─────────────────────────────
                   Initiere    Planificare    Executie

La initiere: +100% / -50%
La planificare detaliata: +25% / -15%
In executie: +10% / -5%
\`\`\`

---

## Greseli Frecvente in Estimari

### Ce sa EVITI

\`\`\`
❌ Estimare sub presiune ("Cat crezi ca dureaza?" "Ummm... 2 saptamani?")
❌ Excluderea taskurilor "mici" (se acumuleaza!)
❌ Neglijarea dependentelor
❌ Lipsa continentei
❌ Estimare fara echipa
❌ Copy-paste din alte proiecte fara ajustare
❌ Optimismul planificatorului
❌ Student Syndrome (lucrul se extinde pana la deadline)
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Folositi PERT pentru a estima durata unei activitati:
- Optimist: 5 zile
- Probabil: 8 zile
- Pesimist: 17 zile

Calculati: durata asteptata, deviatie standard, interval 95%.

**Exercitiul 2:** Aveti urmatorul WBS. Estimati bottom-up:
\`\`\`
1.1 Analiza (3 WP-uri)
1.2 Design (2 WP-uri)
1.3 Dezvoltare (5 WP-uri)
\`\`\`

**Exercitiul 3:** Simulati o sesiune Planning Poker pentru estimarea a 3 user stories.

---

*Lectia urmatoare: Graficul Proiectului - Gantt, CPM, PERT*`
    },
    {
      title: 'Graficul Proiectului - Gantt, CPM si Drumul Critic',
      slug: 'grafic-proiect-gantt-cpm-drum-critic',
      type: 'TEXT' as const,
      duration: 55,
      order: 3,
      isFree: false,
      content: `# Graficul Proiectului si Drumul Critic

## Diagrama Gantt

### Ce este?

Reprezentare grafica a programului proiectului, aratand:
- Activitatile pe axa verticala
- Timpul pe axa orizontala
- Durata fiecarei activitati ca bara

### Exemplu Gantt

\`\`\`
Activitate              │ S1  │ S2  │ S3  │ S4  │ S5  │ S6  │ S7  │ S8  │
────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
1.1 Cerinte             │████████████│     │     │     │     │     │     │
1.2 Design              │     │█████████████████│     │     │     │     │
1.3 Dezvoltare Frontend │     │     │     │████████████████████│     │     │
1.4 Dezvoltare Backend  │     │     │███████████████████│     │     │     │
1.5 Integrare           │     │     │     │     │     │████████████│     │
1.6 Testare             │     │     │     │     │     │     │██████████│
1.7 Lansare             │     │     │     │     │     │     │     │████│

Legenda:
████ = Activitate planificata
──── = Milestone (punct de referinta)
\`\`\`

### Componente Gantt

\`\`\`typescript
interface ElementGantt {
  id: string;
  nume: string;
  tip: 'task' | 'milestone' | 'summary';
  dataStart: Date;
  dataEnd: Date;
  durata: number; // zile
  progres: number; // 0-100%
  dependente: string[];
  resurse: string[];
  esteRuta: boolean;
}
\`\`\`

---

## Tipuri de Dependente

### Relatii intre Activitati

\`\`\`
1. FINISH-TO-START (FS) - cel mai comun
   A ████████│
             └──→ B ████████
   "B incepe cand A se termina"

2. START-TO-START (SS)
   A ████████
   └──→ B ████████
   "B incepe cand A incepe"

3. FINISH-TO-FINISH (FF)
             A ████████│
                      └──→ B ████████│
   "B se termina cand A se termina"

4. START-TO-FINISH (SF) - rar
   A ████████
            └──→ │████████ B
   "B se termina cand A incepe"
\`\`\`

### Lead si Lag

\`\`\`typescript
interface Dependenta {
  predecessor: string;
  successor: string;
  tip: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number; // zile de asteptare (pozitiv)
  lead: number; // suprapunere (negativ lag)
}

// Exemplu:
// A se termina → B incepe dupa 3 zile (lag +3)
// A se termina → B incepe cu 2 zile inainte (lead -2)
\`\`\`

---

## Critical Path Method (CPM)

### Ce este Drumul Critic?

Cea mai lunga secventa de activitati care determina durata minima a proiectului.

**Caracteristici activitati critice:**
- **Float (slack) = 0** - nu au flexibilitate
- Intarzierea lor **intarzie tot proiectul**
- Trebuie **monitorizate atent**

### Calculul Drumului Critic

\`\`\`typescript
interface ActivitateCPM {
  id: string;
  durata: number;
  predecessori: string[];

  // Calculat
  ES: number; // Early Start
  EF: number; // Early Finish
  LS: number; // Late Start
  LF: number; // Late Finish
  TF: number; // Total Float
  FF: number; // Free Float
  esteCritica: boolean;
}

// Forward Pass (calculeaza ES, EF)
// ES = max(EF al tuturor predecessorilor)
// EF = ES + Durata

// Backward Pass (calculeaza LS, LF)
// LF = min(LS al tuturor succesorilor)
// LS = LF - Durata

// Total Float
// TF = LS - ES = LF - EF

// Activitate Critica: TF = 0
\`\`\`

### Exemplu CPM

\`\`\`
Activitate │ Durata │ Pred. │ ES │ EF │ LS │ LF │ TF │ Critica
───────────┼────────┼───────┼────┼────┼────┼────┼────┼────────
A          │   3    │   -   │  0 │  3 │  0 │  3 │  0 │   DA
B          │   5    │   A   │  3 │  8 │  3 │  8 │  0 │   DA
C          │   2    │   A   │  3 │  5 │  6 │  8 │  3 │   NU
D          │   4    │  B,C  │  8 │ 12 │  8 │ 12 │  0 │   DA
E          │   3    │   D   │ 12 │ 15 │ 12 │ 15 │  0 │   DA

Drum Critic: A → B → D → E (15 zile)

Reprezentare grafica:
                    ┌── C (2) ──┐
                    │     TF=3  │
A (3) ─→ B (5) ────────────────→ D (4) → E (3)
  ↑                                        ↑
  └─────────── DRUM CRITIC ────────────────┘
\`\`\`

---

## Fast Tracking vs Crashing

### Fast Tracking

Executare in paralel a activitatilor care initial erau secventiale.

\`\`\`
INAINTE (secvential):
Design ████████│
               └─ Dezvoltare ████████│

DUPA (fast tracking):
Design ████████│
          └─ Dezvoltare ████████│
              (suprapunere)

RISC: Reluare lucru daca design-ul se schimba
\`\`\`

### Crashing

Adaugare resurse pentru reducerea duratei.

\`\`\`typescript
interface OptiuneCrashing {
  activitate: string;
  durataOriginala: number;
  durataComprimata: number;
  costOriginal: number;
  costComprimat: number;
  costPeZi: number; // (costComprimat - costOriginal) / (durataO - durataC)
}

function alegeCrashing(optiuni: OptiuneCrashing[]): OptiuneCrashing {
  // Alege activitatea critica cu cel mai mic cost pe zi de comprimare
  return optiuni
    .filter(o => o.durata > o.durataComprimata)
    .sort((a, b) => a.costPeZi - b.costPeZi)[0];
}

// Exemplu:
// Activitate B: 5 zile → 3 zile, cost +2000 RON
// Cost/zi = 2000 / 2 = 1000 RON/zi
\`\`\`

---

## Resource Leveling

### Problema

Uneori planificarea rezulta in supraalocare de resurse (o persoana alocata 150% intr-o zi).

### Solutia

\`\`\`
INAINTE (supralocare):
Task A: Dev1 100% │████████│
Task B: Dev1 100%      │████████│
                       ↑ CONFLICT

DUPA (leveling):
Task A: Dev1 100% │████████│
Task B: Dev1 100%          │████████│ (amanat)

CONSECINTA: Proiectul se poate prelungi
\`\`\`

---

## Software pentru Grafice

### Optiuni Populare

| Software | Pret | Puncte forte |
|----------|------|--------------|
| MS Project | $$ | Standard industrie, complet |
| Smartsheet | $$ | Colaborare, cloud |
| Monday.com | $$ | Interfata moderna |
| GanttProject | Free | Simplu, open source |
| ProjectLibre | Free | Alternativa MS Project |
| Jira | $$ | Integrat cu dev |

---

## Exercitii Practice

**Exercitiul 1:** Creati diagrama Gantt pentru:
\`\`\`
A (3 zile) - fara predecessor
B (5 zile) - dupa A
C (2 zile) - dupa A
D (4 zile) - dupa B si C
E (3 zile) - dupa D
\`\`\`

**Exercitiul 2:** Calculati drumul critic pentru exercitiul 1. Care e durata minima?

**Exercitiul 3:** Proiectul trebuie finalizat cu 3 zile mai devreme. Ce optiuni aveti? Ce costa fiecare?

---

*Lectia urmatoare: Bugetarea Proiectului*`
    },
    {
      title: 'Bugetarea Proiectului si Controlul Costurilor',
      slug: 'bugetare-proiect-control-costuri',
      type: 'TEXT' as const,
      duration: 50,
      order: 4,
      isFree: false,
      content: `# Bugetarea Proiectului si Controlul Costurilor

## Tipuri de Costuri

### Clasificare

\`\`\`typescript
interface CosturiProiect {
  // Dupa variabilitate
  fixe: {
    exemple: ['Licente software', 'Chirie birou proiect', 'Echipamente'];
    caracteristica: 'Nu variaza cu volumul';
  };
  variabile: {
    exemple: ['Ore consultanta', 'Materiale', 'Utilitati'];
    caracteristica: 'Variaza proportional cu volumul';
  };

  // Dupa atribuire
  directe: {
    exemple: ['Salarii echipa', 'Materiale specifice', 'Echipamente dedicate'];
    caracteristica: 'Atribuibile direct proiectului';
  };
  indirecte: {
    exemple: ['Overhead administrativ', 'Utilitati cladire', 'Management general'];
    caracteristica: 'Alocate proiectelor dupa o cheie';
  };

  // Dupa tip
  forta_munca: number;
  materiale: number;
  echipamente: number;
  subcontractori: number;
  diverse: number;
}
\`\`\`

---

## Procesul de Bugetare

### Etape

\`\`\`
1. ESTIMARE COSTURI (pe Work Package)
   │
   ↓
2. AGREGARE (bottom-up)
   │
   ↓
3. ADAUGARE CONTINGENTA (riscuri)
   │
   ↓
4. ADAUGARE REZERVA MANAGEMENT
   │
   ↓
5. APROBARE BUGET
   │
   ↓
6. STABILIRE BASELINE
\`\`\`

### Cost Baseline vs Budget

\`\`\`
         ┌─────────────────────────────────────┐
         │      BUGET TOTAL (BAC)              │
         │ ┌─────────────────────────────────┐ │
         │ │   Rezerva Management (10%)      │ │
         │ └─────────────────────────────────┘ │
         │ ┌─────────────────────────────────┐ │
         │ │      COST BASELINE              │ │
         │ │ ┌─────────────────────────────┐ │ │
         │ │ │ Contingenta (15%)           │ │ │
         │ │ └─────────────────────────────┘ │ │
         │ │ ┌─────────────────────────────┐ │ │
         │ │ │ Estimari Work Packages      │ │ │
         │ │ │ (costuri directe + indirecte)│ │ │
         │ │ └─────────────────────────────┘ │ │
         │ └─────────────────────────────────┘ │
         └─────────────────────────────────────┘

Cost Baseline = PM il controleaza
Rezerva Management = Sponsor controleaza
\`\`\`

---

## Structura Bugetului (CBS)

### Cost Breakdown Structure

\`\`\`
1.0 BUGET PROIECT WEBSITE                    150.000 RON
│
├── 1.1 Forta de munca                        85.000 RON
│   ├── 1.1.1 Project Manager (160h x 150)    24.000 RON
│   ├── 1.1.2 Designer (120h x 120)           14.400 RON
│   ├── 1.1.3 Developer Senior (200h x 180)   36.000 RON
│   └── 1.1.4 Developer Junior (100h x 80)     8.000 RON
│
├── 1.2 Licente si software                   15.000 RON
│   ├── 1.2.1 Adobe CC (12 luni)               3.600 RON
│   ├── 1.2.2 Licenta CMS                      8.000 RON
│   └── 1.2.3 Hosting (12 luni)                3.400 RON
│
├── 1.3 Subcontractori                        20.000 RON
│   ├── 1.3.1 Copywriting                      8.000 RON
│   ├── 1.3.2 Fotografie                       7.000 RON
│   └── 1.3.3 Video                            5.000 RON
│
├── 1.4 Diverse                                5.000 RON
│
├── 1.5 Contingenta (15%)                     18.750 RON
│
└── 1.6 Rezerva Management (10%)               6.250 RON
\`\`\`

---

## Earned Value Management (EVM)

### Concepte de Baza

\`\`\`typescript
interface MetriciEVM {
  // Valori fundamentale
  PV: number;  // Planned Value - cat planificam sa cheltuim pana acum
  EV: number;  // Earned Value - valoarea muncii realizate
  AC: number;  // Actual Cost - cat am cheltuit efectiv
  BAC: number; // Budget at Completion - buget total

  // Variatii
  SV: number;  // Schedule Variance = EV - PV
  CV: number;  // Cost Variance = EV - AC

  // Indici
  SPI: number; // Schedule Performance Index = EV / PV
  CPI: number; // Cost Performance Index = EV / AC

  // Prognoze
  EAC: number; // Estimate at Completion
  ETC: number; // Estimate to Complete
  VAC: number; // Variance at Completion
}

function calculeazaEVM(pv: number, ev: number, ac: number, bac: number): MetriciEVM {
  const sv = ev - pv;
  const cv = ev - ac;
  const spi = pv !== 0 ? ev / pv : 0;
  const cpi = ac !== 0 ? ev / ac : 0;

  // EAC = BAC / CPI (presupunand ca trendurile continua)
  const eac = cpi !== 0 ? bac / cpi : bac;
  const etc = eac - ac;
  const vac = bac - eac;

  return { PV: pv, EV: ev, AC: ac, BAC: bac, SV: sv, CV: cv, SPI: spi, CPI: cpi, EAC: eac, ETC: etc, VAC: vac };
}
\`\`\`

### Interpretare Indici

\`\`\`
SPI (Schedule Performance Index):
  SPI > 1.0 → Ahead of schedule (mai rapid)
  SPI = 1.0 → On schedule
  SPI < 1.0 → Behind schedule (intarziere)

CPI (Cost Performance Index):
  CPI > 1.0 → Under budget (economie)
  CPI = 1.0 → On budget
  CPI < 1.0 → Over budget (depasire)

EXEMPLU:
PV = 50.000, EV = 40.000, AC = 45.000, BAC = 150.000

SV = 40.000 - 50.000 = -10.000 (in urma cu 10.000)
CV = 40.000 - 45.000 = -5.000 (depasire 5.000)
SPI = 40.000 / 50.000 = 0.80 (20% in urma)
CPI = 40.000 / 45.000 = 0.89 (11% depasire cost)
EAC = 150.000 / 0.89 = 168.539 (proiect va costa 168.539)
VAC = 150.000 - 168.539 = -18.539 (depasire finala estimata)
\`\`\`

### Grafic EVM

\`\`\`
Cost
  ↑
  │                           ╱ AC (Actual Cost)
  │                         ╱
  │                       ╱
  │                   ╱ ╱ EV (Earned Value)
  │                 ╱ ╱
  │               ╱ ╱  PV (Planned Value)
  │             ╱ ╱  ╱
  │          ╱  ╱  ╱
  │        ╱  ╱  ╱
  │      ╱  ╱  ╱
  │    ╱  ╱  ╱
  │  ╱  ╱  ╱
  │╱  ╱  ╱
  └───────────────────────────────────→ Timp
       ↑
     Acum (data status)

CV = EV - AC (negativ = over budget)
SV = EV - PV (negativ = behind schedule)
\`\`\`

---

## Cash Flow

### Planificarea Fluxului de Numerar

\`\`\`typescript
interface CashFlowProiect {
  luna: number;
  incasariPlanificate: number;
  cheltuieliPlanificate: number;
  soldLunar: number;
  soldCumulat: number;
}

function genereazaCashFlow(buget: Buget, luni: number): CashFlowProiect[] {
  // Distribuie cheltuielile pe luni conform planului
  // Identifica momentele cu nevoie de finantare
  // Planifica incasarile (milestone payments)
}

// Exemplu output:
// Luna 1: Cheltuieli 30.000, Incasari 0 → Sold -30.000
// Luna 2: Cheltuieli 25.000, Incasari 50.000 → Sold -5.000
// Luna 3: Cheltuieli 20.000, Incasari 0 → Sold -25.000
// ...
\`\`\`

---

## Raport Financiar Proiect

### Model Raport Lunar

\`\`\`
══════════════════════════════════════════════════════════════
         RAPORT FINANCIAR PROIECT - LUNA 4
══════════════════════════════════════════════════════════════

REZUMAT:
• Buget total (BAC):        150.000 RON
• Cheltuit pana acum (AC):   68.000 RON
• Valoare realizata (EV):    55.000 RON
• Planificat pana acum (PV): 60.000 RON

INDICATORI:
• CPI: 0.81 (19% depasire cost)     ⚠️ ATENTIE
• SPI: 0.92 (8% intarziere)         ⚡ OK
• EAC: 185.185 RON (+35.185 RON)    ⚠️ ATENTIE

ANALIZA PE CATEGORII:
┌─────────────┬──────────┬──────────┬──────────┬───────┐
│ Categorie   │ Buget    │ Cheltuit │ Ramas    │ Var % │
├─────────────┼──────────┼──────────┼──────────┼───────┤
│ Personal    │  85.000  │  52.000  │  33.000  │ +12%  │
│ Licente     │  15.000  │   8.000  │   7.000  │   0%  │
│ Subcontract │  20.000  │   5.000  │  15.000  │  -5%  │
│ Diverse     │   5.000  │   3.000  │   2.000  │ +20%  │
├─────────────┼──────────┼──────────┼──────────┼───────┤
│ TOTAL       │ 125.000  │  68.000  │  57.000  │  +9%  │
└─────────────┴──────────┴──────────┴──────────┴───────┘

ACTIUNI NECESARE:
1. Revizuire alocare ore dezvoltare
2. Negociere cu subcontractor fotografie
3. Analiza detaliata depasire "Diverse"

══════════════════════════════════════════════════════════════
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Creati CBS pentru un proiect de organizare eveniment cu buget 50.000 RON.

**Exercitiul 2:** Calculati metricile EVM pentru:
- BAC = 200.000 RON
- Suntem la 40% din durata
- PV = 80.000 RON
- Am finalizat 30% din munca
- Am cheltuit 70.000 RON

**Exercitiul 3:** Ce actiuni recomandati pentru un proiect cu CPI = 0.75 si SPI = 1.10?

---

*Urmatorul modul: Executia si Monitorizarea Proiectului*`
    }
  ]
};
