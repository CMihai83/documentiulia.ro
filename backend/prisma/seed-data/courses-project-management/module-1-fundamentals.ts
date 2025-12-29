// Project Management Masterclass - Module 1: Fundamentele Managementului de Proiect
// Elite-level comprehensive content

export const pmModule1 = {
  title: 'Fundamentele Managementului de Proiect',
  description: 'Concepte de baza, metodologii si framework-uri esentiale',
  order: 1,
  lessons: [
    {
      title: 'Ce este un Proiect? - Definitii, Caracteristici si Ciclul de Viata',
      slug: 'ce-este-proiect-definitii-caracteristici',
      type: 'TEXT' as const,
      duration: 40,
      order: 1,
      isFree: true,
      content: `# Ce este un Proiect? - Ghid Complet

## Definitia Proiectului

### Conform PMI (Project Management Institute)

> "Un proiect este un efort temporar intreprins pentru a crea un produs, serviciu sau rezultat unic."

### Conform PRINCE2

> "Un proiect este o organizatie temporara creata pentru a livra unul sau mai multe produse de business conform unui caz de afaceri agreat."

---

## Caracteristicile Esentiale ale unui Proiect

### 1. Temporar

- Are un inceput si un sfarsit definit
- Nu inseamna "scurt" - poate dura ani
- Echipa se dizolva la final

### 2. Unic

- Rezultatul este diferit de alte proiecte
- Chiar si proiecte similare au context diferit
- Implica un grad de incertitudine

### 3. Elaborare Progresiva

- Detaliile se clarifica pe parcurs
- Planul initial evolueaza
- Invatare continua

\`\`\`typescript
interface Proiect {
  nume: string;
  dataInceput: Date;
  dataSfarsit: Date;
  obiectiv: string;
  rezultatUnic: string;
  temporar: true;

  constrangeri: {
    timp: number;
    buget: number;
    calitate: string;
    scope: string;
  };
}
\`\`\`

---

## Proiect vs Operatiuni vs Program

### Comparatie

| Aspect | Proiect | Operatiuni | Program |
|--------|---------|------------|---------|
| Durata | Temporar | Continuu | Multi-proiect |
| Rezultat | Unic | Repetitiv | Strategic |
| Echipa | Temporara | Permanenta | Mixta |
| Scop | Schimbare | Mentinere | Beneficii |

### Exemple

**Proiect:**
- Dezvoltare aplicatie noua
- Construire cladire
- Implementare ERP

**Operatiuni:**
- Suport clienti zilnic
- Productie continua
- Contabilitate lunara

**Program:**
- Transformare digitala (multiple proiecte IT)
- Extindere internationala (proiecte per tara)

---

## Ciclul de Viata al Proiectului

### Fazele Generale

\`\`\`
    INITIERE → PLANIFICARE → EXECUTIE → MONITORIZARE → INCHIDERE
        ↑          ↑            ↑           ↓             ↓
        └──────────┴────────────┴───────────┘             │
                   (iteratii posibile)                    ↓
                                                    TRANSFER
\`\`\`

### Detalii pe Faze

\`\`\`typescript
interface CicluViataProiect {
  initiere: {
    activitati: [
      'Identificare nevoie/oportunitate',
      'Studiu fezabilitate',
      'Definire obiective SMART',
      'Identificare stakeholderi',
      'Elaborare Project Charter'
    ];
    livrabile: ['Project Charter', 'Registru Stakeholderi'];
    decizii: ['Go / No-Go'];
  };

  planificare: {
    activitati: [
      'Definire scope detaliat (WBS)',
      'Estimare durata si resurse',
      'Elaborare grafic (Gantt)',
      'Planificare buget',
      'Identificare riscuri',
      'Plan comunicare'
    ];
    livrabile: ['Plan Management Proiect', 'WBS', 'Grafic', 'Buget'];
    decizii: ['Aprobare plan'];
  };

  executie: {
    activitati: [
      'Coordonare echipa',
      'Achizitii resurse',
      'Realizare livrabile',
      'Managementul calitatii',
      'Comunicare stakeholderi'
    ];
    livrabile: ['Produsele proiectului'];
    decizii: ['Aprobari intermediare'];
  };

  monitorizare: {
    activitati: [
      'Masurare progres',
      'Comparatie plan vs realizat',
      'Actiuni corective',
      'Control schimbari',
      'Raportare status'
    ];
    livrabile: ['Rapoarte progres', 'Cereri schimbare'];
    decizii: ['Aprobare schimbari'];
  };

  inchidere: {
    activitati: [
      'Verificare livrabile finale',
      'Transfer catre beneficiar',
      'Documentare lessons learned',
      'Eliberare resurse',
      'Arhivare documente'
    ];
    livrabile: ['Acceptanta finala', 'Raport final', 'Lessons Learned'];
    decizii: ['Inchidere formala'];
  };
}
\`\`\`

---

## Tipuri de Cicluri de Viata

### 1. Predictiv (Waterfall)

\`\`\`
Cerinte → Proiectare → Implementare → Testare → Livrare
   ↓           ↓            ↓           ↓          ↓
 FAZA 1     FAZA 2       FAZA 3      FAZA 4     FAZA 5
\`\`\`

**Caracteristici:**
- Faze secventiale
- Scope fix de la inceput
- Schimbarile sunt costisitoare
- Potrivit pentru: constructii, productie

### 2. Iterativ

\`\`\`
[Iteratia 1] → [Iteratia 2] → [Iteratia 3] → Produs Final
     ↓              ↓              ↓
  Feedback      Feedback       Feedback
\`\`\`

**Caracteristici:**
- Repetare cicluri de dezvoltare
- Rafinare progresiva
- Feedback integrat
- Potrivit pentru: R&D, inovatie

### 3. Incremental

\`\`\`
MVP → Increment 1 → Increment 2 → Produs Complet
 ↓         ↓             ↓              ↓
Core    +Feature A   +Feature B    +Feature C
\`\`\`

**Caracteristici:**
- Livrari partiale functionale
- Valoare timpurie
- Prioritizare functionalitatilor
- Potrivit pentru: software, produse

### 4. Agile (Adaptiv)

\`\`\`
Sprint 1 → Sprint 2 → Sprint 3 → ... → Sprint N
   ↓          ↓          ↓              ↓
Review    Review     Review         Release
\`\`\`

**Caracteristici:**
- Iteratii scurte (1-4 saptamani)
- Adaptare continua la schimbare
- Colaborare stransa client
- Potrivit pentru: software, startup

---

## Triunghiul Constrangerilor (Triple Constraint)

### Modelul Clasic

\`\`\`
           SCOPE
            /\\
           /  \\
          /    \\
         /      \\
        /CALITATE\\
       /    ●     \\
      /____________\\
   TIMP          COST

Schimbarea unuia afecteaza celelalte!
\`\`\`

### Exemplu Practic

\`\`\`typescript
function analizeazaImpact(schimbare: string): Impact {
  const scenarii = {
    'ADAUGARE_FUNCTIONALITATE': {
      scope: '+20%',
      timp: '+15%',
      cost: '+20%',
      calitate: 'risc scadere daca nu se ajusteaza'
    },
    'REDUCERE_BUGET': {
      scope: '-25%',
      timp: 'neschimbat',
      cost: '-20%',
      calitate: 'risc daca se forteaza scope-ul'
    },
    'DEADLINE_MAI_DEVREME': {
      scope: '-15%',
      timp: '-20%',
      cost: '+10% (ore suplimentare)',
      calitate: 'risc ridicat'
    }
  };

  return scenarii[schimbare];
}
\`\`\`

---

## Rolurile in Proiect

### Roluri Principale

\`\`\`typescript
interface RoluriProiect {
  sponsor: {
    responsabilitati: [
      'Furnizeaza resurse si buget',
      'Decide Go/No-Go la gate-uri',
      'Rezolva escaladari majore',
      'Sustine proiectul politic'
    ];
    timp: '5-10% din capacitate';
  };

  managerProiect: {
    responsabilitati: [
      'Planifica si coordoneaza',
      'Gestioneaza echipa',
      'Raporteaza progres',
      'Gestioneaza riscuri',
      'Comunica cu stakeholderii'
    ];
    timp: '100% dedicat';
  };

  echipaProiect: {
    responsabilitati: [
      'Realizeaza livrabilele',
      'Estimeaza efort',
      'Raporteaza progres taskuri',
      'Identifica probleme'
    ];
    timp: 'variabil, conform plan';
  };

  stakeholderi: {
    tipuri: [
      'Beneficiari (primesc rezultatul)',
      'Influentatori (afecteaza deciziile)',
      'Impactati (afectati de proiect)'
    ];
    implicare: 'conform matricei stakeholder';
  };
}
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Identificati un proiect din experienta dvs. si descrieti:
- Caracteristicile de temporar si unic
- Fazele ciclului de viata parcurse
- Constrangerile principale

**Exercitiul 2:** Pentru fiecare situatie, decideti: proiect, operatiune sau program?
- Migrare la noul sistem ERP
- Procesarea facturilor lunar
- Lansarea in 5 tari noi in 2 ani

**Exercitiul 3:** Un client cere o functionalitate noua care ar adauga 3 saptamani. Deadline-ul e fix. Ce optiuni aveti?

---

*Lectia urmatoare: Metodologii - Waterfall, Agile, PRINCE2, PMI*`
    },
    {
      title: 'Metodologii de Management - Waterfall, Agile, PRINCE2, PMI',
      slug: 'metodologii-waterfall-agile-prince2-pmi',
      type: 'TEXT' as const,
      duration: 55,
      order: 2,
      isFree: false,
      content: `# Metodologii de Management de Proiect

## De ce avem nevoie de Metodologii?

### Beneficii

1. **Limbaj comun** - toata lumea intelege la fel
2. **Procese standardizate** - nu reinventam roata
3. **Best practices** - invatam din experienta altora
4. **Predictibilitate** - sanse mai mari de succes
5. **Certificari** - recunoastere profesionala

---

## Waterfall (Cascada)

### Origini si Filosofie

- Provine din industria constructiilor
- Publicat de Winston Royce (1970) - ironic, ca anti-pattern!
- Adoptat masiv in software anii '80-'90

### Fazele Waterfall

\`\`\`
┌─────────────┐
│  CERINTE    │ → Documente de cerinte complete
└──────┬──────┘
       ↓
┌─────────────┐
│  PROIECTARE │ → Arhitectura, design detaliat
└──────┬──────┘
       ↓
┌─────────────┐
│ IMPLEMENTARE│ → Cod, constructie efectiva
└──────┬──────┘
       ↓
┌─────────────┐
│   TESTARE   │ → Verificare, validare
└──────┬──────┘
       ↓
┌─────────────┐
│  MENTENANTA │ → Suport post-livrare
└─────────────┘
\`\`\`

### Avantaje si Dezavantaje

| Avantaje | Dezavantaje |
|----------|-------------|
| Structura clara | Inflexibil la schimbari |
| Documentatie completa | Feedback tardiv |
| Usor de estimat | Risc mare de esec |
| Potrivit proiecte stabile | Nu pentru incertitudine |

### Cand sa folosesti Waterfall

- Cerinte foarte clare si stabile
- Proiecte reglementate (medical, aviatie)
- Integrari cu sisteme legacy rigide
- Contracte cu pret fix si scope fix

---

## Agile

### Manifestul Agile (2001)

\`\`\`
Valorizam:
• INDIVIZI si INTERACTIUNI    peste procese si unelte
• SOFTWARE FUNCTIONAL         peste documentatie comprehensiva
• COLABORARE cu CLIENTUL      peste negociere contractuala
• RASPUNS la SCHIMBARE        peste urmarirea unui plan

Principiile din stanga au mai multa valoare,
dar nu ignoram elementele din dreapta.
\`\`\`

### Principiile Agile (12)

1. Satisfactia clientului prin livrare continua
2. Acceptarea schimbarilor chiar si tarziu
3. Livrari frecvente (saptamani, nu luni)
4. Colaborare zilnica business-developeri
5. Motivare si incredere in echipa
6. Conversatie fata-in-fata
7. Software functional = masura progresului
8. Ritm sustenabil
9. Excelenta tehnica
10. Simplitate
11. Echipe auto-organizate
12. Reflectie si adaptare regulata

### Framework-uri Agile Populare

\`\`\`typescript
const frameworksAgile = {
  scrum: {
    descriere: 'Framework iterativ cu roluri, evenimente si artefacte definite',
    roluri: ['Product Owner', 'Scrum Master', 'Development Team'],
    evenimente: ['Sprint Planning', 'Daily Scrum', 'Sprint Review', 'Retrospective'],
    artefacte: ['Product Backlog', 'Sprint Backlog', 'Increment'],
    durataSprint: '2-4 saptamani'
  },

  kanban: {
    descriere: 'Sistem vizual de flux continuu',
    principii: ['Vizualizare flux', 'Limitare WIP', 'Gestionare flux', 'Imbunatatire continua'],
    componente: ['Kanban Board', 'Coloane (To Do, In Progress, Done)', 'Card-uri', 'WIP Limits'],
    durata: 'Flux continuu, fara iteratii fixe'
  },

  xp: {
    descriere: 'Extreme Programming - practici tehnice intense',
    practici: ['Pair Programming', 'TDD', 'CI/CD', 'Refactoring', 'Simple Design'],
    focusuri: 'Calitate cod, feedback rapid',
    durata: 'Iteratii de 1-2 saptamani'
  },

  safe: {
    descriere: 'Scaled Agile Framework - Agile la nivel enterprise',
    niveluri: ['Team', 'Program', 'Large Solution', 'Portfolio'],
    evenimente: ['PI Planning', 'Scrum of Scrums', 'System Demo'],
    durata: 'Program Increment (PI) = 8-12 saptamani'
  }
};
\`\`\`

---

## PRINCE2

### Ce este PRINCE2?

**PR**ojects **IN** **C**ontrolled **E**nvironments - metodologie de management structurata, dezvoltata de guvernul UK.

### Principiile PRINCE2 (7)

\`\`\`
1. Justificare Business Continua
   - Proiectul trebuie sa ramana viabil
   - Business Case actualizat la fiecare etapa

2. Invatare din Experienta
   - Lessons learned la inceput, pe parcurs si la final
   - Registru de lectii invatate

3. Roluri si Responsabilitati Definite
   - Structura organizationala clara
   - Fiecare stie ce face

4. Management pe Etape
   - Proiectul impartit in etape gestionabile
   - Aprobare la fiecare gate

5. Management prin Exceptie
   - Delegare cu tolerante
   - Escaladare doar la depasire

6. Focus pe Produse
   - Orientare spre rezultate, nu activitati
   - Descrieri de produs clare

7. Adaptare la Context
   - Scalare la dimensiunea proiectului
   - Nu one-size-fits-all
\`\`\`

### Structura PRINCE2

\`\`\`
         ┌──────────────────────────────┐
         │      COMITET PROIECT         │
         │  (Project Board)             │
         └──────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │    MANAGER PROIECT      │
         └────────────┬────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───┴───┐       ┌────┴────┐       ┌────┴────┐
│ECHIPA │       │ ECHIPA  │       │ ECHIPA  │
│   A   │       │    B    │       │    C    │
└───────┘       └─────────┘       └─────────┘
\`\`\`

### Procesele PRINCE2 (7)

1. **Starting Up a Project** - pregatire initiala
2. **Directing a Project** - decizii la nivel board
3. **Initiating a Project** - planificare detaliata
4. **Controlling a Stage** - management zi de zi
5. **Managing Product Delivery** - lucrul efectiv
6. **Managing Stage Boundaries** - tranzitie intre etape
7. **Closing a Project** - inchidere formala

---

## PMI / PMBOK

### Ce este PMBOK?

**P**roject **M**anagement **B**ody **O**f **K**nowledge - ghid de best practices publicat de PMI (Project Management Institute).

### Grupurile de Procese (5)

\`\`\`typescript
const grupuriProcese = {
  initiating: {
    procese: ['Develop Project Charter', 'Identify Stakeholders'],
    output: 'Autorizare proiect'
  },
  planning: {
    procese: [
      'Develop Project Management Plan',
      'Plan Scope/Schedule/Cost/Quality/Resources',
      'Plan Communications/Risk/Procurement/Stakeholder'
    ],
    output: 'Plan de management'
  },
  executing: {
    procese: [
      'Direct and Manage Work',
      'Manage Quality',
      'Acquire/Develop/Manage Team',
      'Manage Communications',
      'Conduct Procurements'
    ],
    output: 'Livrabile, date performanta'
  },
  monitoringControlling: {
    procese: [
      'Monitor and Control Work',
      'Perform Integrated Change Control',
      'Validate/Control Scope',
      'Control Schedule/Cost/Quality/Resources',
      'Monitor Communications/Risks'
    ],
    output: 'Cereri schimbare, actiuni corective'
  },
  closing: {
    procese: ['Close Project or Phase'],
    output: 'Transfer final, lessons learned'
  }
};
\`\`\`

### Ariile de Cunoastere (10)

1. **Integration** - coordonare generala
2. **Scope** - ce este si ce nu este inclus
3. **Schedule** - cand se face
4. **Cost** - cat costa
5. **Quality** - cat de bine
6. **Resource** - cine face
7. **Communications** - cine stie ce
8. **Risk** - ce poate merge prost
9. **Procurement** - ce cumparam
10. **Stakeholder** - cine e afectat

---

## Comparatie Metodologii

| Aspect | Waterfall | Agile/Scrum | PRINCE2 | PMI/PMBOK |
|--------|-----------|-------------|---------|-----------|
| Origine | Industrie | Software | UK Gov | USA |
| Abordare | Secventiala | Iterativa | Etape | Procese |
| Flexibilitate | Scazuta | Inalta | Medie | Medie |
| Documentatie | Extinsa | Minima | Structurata | Completa |
| Certificari | - | PSM, CSM | PRINCE2 F/P | PMP, CAPM |
| Potrivit pentru | Proiecte stabile | Incertitudine | Governance | Universal |

---

## Alegerea Metodologiei

### Criterii de Decizie

\`\`\`typescript
function alegeMetodologie(context: ContextProiect): string {
  if (context.cerinteCLare && context.schimbariPutine && context.reglementat) {
    return 'WATERFALL';
  }

  if (context.incertitudineInalta && context.feedbackFrecvent && context.echipaMica) {
    return 'AGILE/SCRUM';
  }

  if (context.governance && context.multipleStakeholder && context.justificareBusiness) {
    return 'PRINCE2';
  }

  if (context.proiectComplex && context.organizatieMare && context.certificariNecesare) {
    return 'PMI/PMBOK';
  }

  return 'HYBRID - combina elemente din mai multe';
}
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Pentru fiecare proiect, recomandati metodologia potrivita:
- Dezvoltare aplicatie mobila pentru startup
- Construire pod autostrada
- Implementare SAP in corporatie
- Campanie marketing 3 luni

**Exercitiul 2:** Comparati Scrum si Waterfall pentru un proiect de dezvoltare software de 6 luni.

**Exercitiul 3:** Identificati 3 situatii in care ati combina elemente din metodologii diferite.

---

*Lectia urmatoare: Initierea Proiectului - Project Charter si Stakeholder Analysis*`
    },
    {
      title: 'Initierea Proiectului - Project Charter si Stakeholder Analysis',
      slug: 'initiere-project-charter-stakeholder',
      type: 'TEXT' as const,
      duration: 50,
      order: 3,
      isFree: false,
      content: `# Initierea Proiectului - Ghid Complet

## De ce este critica Initierea?

### Statistici

- **70%** din proiectele esuate au avut initiere deficitara
- Corectarea erorilor costa **10-100x** mai mult in faze ulterioare
- Proiectele cu charter clar au **2x** sanse de succes

---

## Project Charter (Carta Proiectului)

### Ce este Project Charter?

Documentul care **autorizeaza formal** existenta proiectului si confera managerului de proiect autoritatea de a utiliza resursele organizationale.

### Componentele Project Charter

\`\`\`typescript
interface ProjectCharter {
  // Identificare
  numeProiect: string;
  codProiect: string;
  dataCreare: Date;
  versiune: number;

  // Justificare
  justificareBusiness: string;
  obiectiveSMART: Obiectiv[];
  beneficiiAsteptate: string[];
  aliniereStrategica: string;

  // Scope la nivel inalt
  descriereProiect: string;
  liverabileMain: string[];
  excluderi: string[];
  constrangeri: string[];
  presupuneri: string[];

  // Organizare
  sponsor: Persoana;
  managerProiect: Persoana;
  stakeholderCheie: Persoana[];
  autoritateMP: string;

  // Estimari initiale
  bugetEstimat: number;
  duratEstimata: string;
  resurseNecesare: string[];

  // Riscuri initiale
  riscuriPrincipale: Risc[];
  criteriSucces: string[];

  // Aprobari
  aprobari: Aprobare[];
}
\`\`\`

### Obiective SMART

\`\`\`
S - Specific: Ce exact vrem sa realizam?
M - Measurable: Cum masuram succesul?
A - Achievable: Este realizabil cu resursele disponibile?
R - Relevant: Este aliniat cu strategia organizatiei?
T - Time-bound: Pana cand trebuie realizat?

EXEMPLU:
❌ "Imbunatatirea sistemului IT"
✓ "Reducerea timpului de raspuns al aplicatiei de facturare
   de la 5 secunde la sub 1 secunda pana la 30 iunie 2025,
   masurat prin monitorizarea automata a performantei"
\`\`\`

### Model Project Charter

\`\`\`
═══════════════════════════════════════════════════════════════
                    PROJECT CHARTER
═══════════════════════════════════════════════════════════════

PROIECT: Implementare Sistem CRM
COD: PRJ-2025-001
DATA: 15 Ianuarie 2025
VERSIUNE: 1.0

───────────────────────────────────────────────────────────────
1. JUSTIFICARE BUSINESS
───────────────────────────────────────────────────────────────

Situatia actuala:
- Datele clientilor sunt dispersate in Excel-uri
- Nu exista vizibilitate asupra pipeline-ului de vanzari
- Timpul de raspuns la clienti este de 48h in medie

Propunere:
Implementarea unui sistem CRM centralizat care sa...

Beneficii asteptate:
- Crestere conversie lead-uri: +20%
- Reducere timp raspuns: la 4h
- Visibilitate 100% pipeline
- ROI estimat: 250% in 2 ani

───────────────────────────────────────────────────────────────
2. OBIECTIVE
───────────────────────────────────────────────────────────────

O1: Implementarea sistemului CRM pentru 50 utilizatori
    pana la 30 iunie 2025

O2: Migrarea a 100% din datele clientilor existenti
    cu acuratete >99%

O3: Atingerea ratei de adoptie de 80% in primele 3 luni
    post-implementare

───────────────────────────────────────────────────────────────
3. SCOPE LA NIVEL INALT
───────────────────────────────────────────────────────────────

Inclus:
• Selectie si achizitie CRM cloud
• Configurare si personalizare
• Migrare date din surse existente
• Integrare cu email si telefonie
• Training 50 utilizatori
• Suport 3 luni post go-live

Exclus:
• Integrare cu ERP (faza ulterioara)
• Dezvoltare functionalitati custom
• Hardware nou

Constrangeri:
• Buget maxim: 150.000 RON
• Deadline: 30 iunie 2025
• Fara intrerupere operatiuni vanzari

Presupuneri:
• Vendor CRM va respecta SLA-urile
• Datele existente sunt in format utilizabil
• Echipa de vanzari va participa la training

───────────────────────────────────────────────────────────────
4. ORGANIZARE
───────────────────────────────────────────────────────────────

Sponsor:         Maria Ionescu, Director Comercial
Manager Proiect: Andrei Popescu, PMO
Autoritate MP:   Decizii pana la 10.000 RON fara aprobare;
                 Gestionare echipa de 5 persoane

Stakeholderi cheie:
• Director IT - pentru integrari tehnice
• Director Vanzari - pentru cerinte business
• CFO - pentru aprobare buget
• Echipa Vanzari (50 pers.) - utilizatori finali

───────────────────────────────────────────────────────────────
5. ESTIMARI INITIALE
───────────────────────────────────────────────────────────────

Buget estimat:     120.000 - 150.000 RON
Durata estimata:   6 luni
Resurse:           1 PM, 1 Consultant CRM, 1 IT,
                   0.5 Trainer, SME-uri business

───────────────────────────────────────────────────────────────
6. RISCURI PRINCIPALE
───────────────────────────────────────────────────────────────

R1: Rezistenta la schimbare din partea echipei de vanzari
    - Probabilitate: Medie | Impact: Ridicat
    - Mitigare: Program de change management

R2: Calitate slaba a datelor de migrat
    - Probabilitate: Ridicata | Impact: Mediu
    - Mitigare: Audit si curatare date inainte

R3: Intarzieri vendor
    - Probabilitate: Scazuta | Impact: Ridicat
    - Mitigare: Clauze penalizare in contract

───────────────────────────────────────────────────────────────
7. CRITERII DE SUCCES
───────────────────────────────────────────────────────────────

• Go-live pana la 30 iunie 2025
• Buget respectat (max +10%)
• Adoptie 80% in 3 luni
• Satisfactie utilizatori >7/10
• 0 pierderi de date in migrare

═══════════════════════════════════════════════════════════════
                      APROBARI
═══════════════════════════════════════════════════════════════

Sponsor:           Maria Ionescu    ___________  Data: ______
Director IT:       Ion Vasilescu    ___________  Data: ______
CFO:               Ana Georgescu    ___________  Data: ______
Manager Proiect:   Andrei Popescu   ___________  Data: ______

═══════════════════════════════════════════════════════════════
\`\`\`

---

## Analiza Stakeholderilor

### Cine sunt Stakeholderii?

Orice persoana, grup sau organizatie care:
- Este **afectata** de proiect
- Poate **influenta** proiectul
- Are **interes** in rezultatele proiectului

### Matricea Putere-Interes

\`\`\`
              INTERES
           Low         High
         ┌─────────┬─────────┐
    High │ KEEP    │ MANAGE  │
         │SATISFIED│ CLOSELY │
PUTERE   ├─────────┼─────────┤
         │ MONITOR │ KEEP    │
    Low  │ (MIN)   │ INFORMED│
         └─────────┴─────────┘

Strategii pe cadrane:
• MANAGE CLOSELY: Comunicare frecventa, implicare in decizii
• KEEP SATISFIED: Updates regulate, consultare pe domeniul lor
• KEEP INFORMED: Newsletter, rapoarte status
• MONITOR: Minimal, doar daca se schimba ceva major
\`\`\`

### Registru Stakeholderi

\`\`\`typescript
interface StakeholderRegister {
  stakeholderi: Stakeholder[];
}

interface Stakeholder {
  id: string;
  nume: string;
  rol: string;
  organizatie: string;

  // Analiza
  putere: 1 | 2 | 3 | 4 | 5;
  interes: 1 | 2 | 3 | 4 | 5;
  atitudine: 'Suporter' | 'Neutru' | 'Rezistent';

  // Asteptari
  asteptari: string[];
  temerile: string[];
  influentaAsupra: string[];

  // Strategie
  strategieComunicare: string;
  frecventa: 'Zilnic' | 'Saptamanal' | 'Lunar' | 'La nevoie';
  canale: string[];
  responsabil: string;
}

// Exemplu
const stakeholderCFO: Stakeholder = {
  id: 'SH-003',
  nume: 'Ana Georgescu',
  rol: 'CFO',
  organizatie: 'SC Example SRL',
  putere: 5,
  interes: 3,
  atitudine: 'Neutru',
  asteptari: ['ROI pozitiv', 'Buget respectat', 'Rapoarte financiare exacte'],
  temerile: ['Depasire buget', 'ROI sub asteptari'],
  influentaAsupra: ['Buget', 'Aprobare achizitii'],
  strategieComunicare: 'Keep Satisfied - rapoarte financiare lunare',
  frecventa: 'Lunar',
  canale: ['Email', 'Meeting steering committee'],
  responsabil: 'Andrei Popescu, PM'
};
\`\`\`

---

## Studiu de Fezabilitate

### Tipuri de Fezabilitate

\`\`\`typescript
interface StudiuFezabilitate {
  fezabilitateTehnica: {
    tehnologieDisponibila: boolean;
    expertiZaNecesara: boolean;
    infrastructuraExistenta: boolean;
    riscuriTehnice: string[];
    concluzie: 'Fezabil' | 'Fezabil cu riscuri' | 'Nefezabil';
  };

  fezabilitateOperationala: {
    proceseCompatibile: boolean;
    utilizatoriCapabili: boolean;
    schimbariNecesare: string[];
    rezistentaEstimata: 'Scazuta' | 'Medie' | 'Ridicata';
    concluzie: 'Fezabil' | 'Fezabil cu efort' | 'Nefezabil';
  };

  fezabilitateEconomica: {
    costuriEstimate: number;
    beneficiiEstimate: number;
    roi: number;
    paybackPeriod: number; // luni
    npv: number;
    concluzie: 'Fezabil' | 'Marginal' | 'Nefezabil';
  };

  fezabilitateLegala: {
    conformGDPR: boolean;
    licenTenecesare: boolean;
    reglementariSpecifice: string[];
    riscuriLegale: string[];
    concluzie: 'Fezabil' | 'Cu conditii' | 'Nefezabil';
  };

  fezabilitateTimporal: {
    deadlineRealist: boolean;
    dependenteExterne: string[];
    bufferNecesar: number; // %
    concluzie: 'Fezabil' | 'Riscant' | 'Nefezabil';
  };
}
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Redactati un Project Charter complet pentru:
- Proiect: Migrare website pe noua platforma
- Buget: 50.000 RON
- Durata: 3 luni

**Exercitiul 2:** Identificati 10 stakeholderi pentru un proiect de implementare ERP si plasati-i in matricea Putere-Interes.

**Exercitiul 3:** Realizati un studiu de fezabilitate sumar pentru automatizarea procesului de facturare.

---

*Lectia urmatoare: Planificarea Proiectului - WBS, Estimari, Grafic*`
    }
  ]
};
