// Project Management Masterclass - Module 3: Executia si Monitorizarea
// Elite-level comprehensive content

export const pmModule3 = {
  title: 'Executia si Monitorizarea Proiectului',
  description: 'Conducerea echipei, managementul riscurilor, schimbarilor si raportarea',
  order: 3,
  lessons: [
    {
      title: 'Managementul Riscurilor - Identificare, Analiza si Raspuns',
      slug: 'managementul-riscurilor-identificare-analiza',
      type: 'TEXT' as const,
      duration: 55,
      order: 1,
      isFree: false,
      content: `# Managementul Riscurilor in Proiecte

## Ce este un Risc?

### Definitie

> Un risc este un eveniment sau conditie incerta care, daca apare, are un efect pozitiv sau negativ asupra obiectivelor proiectului.

**Risc ≠ Problema**
- Risc = eveniment VIITOR incert
- Problema = situatie CURENTA care trebuie rezolvata

---

## Procesul de Management al Riscurilor

\`\`\`
1. PLANIFICARE → Cum vom gestiona riscurile?
       ↓
2. IDENTIFICARE → Ce riscuri exista?
       ↓
3. ANALIZA CALITATIVA → Care sunt prioritare?
       ↓
4. ANALIZA CANTITATIVA → Cat de grave sunt?
       ↓
5. PLANIFICARE RASPUNS → Ce facem cu ele?
       ↓
6. MONITORIZARE → S-au schimbat? Au aparut altele?
       ↓
   (ciclu continuu)
\`\`\`

---

## Identificarea Riscurilor

### Tehnici de Identificare

\`\`\`typescript
const tehniciIdentificare = {
  brainstorming: {
    descriere: 'Sesiune de grup pentru generarea de idei',
    participanti: ['PM', 'Echipa', 'Experti', 'Stakeholderi'],
    reguli: ['Fara critica', 'Cantitate peste calitate', 'Combinare idei']
  },

  checklisturi: {
    descriere: 'Liste predefinite de riscuri comune',
    surse: ['Proiecte anterioare', 'Industrie', 'Organizatie'],
    avantaj: 'Nu ratezi riscuri cunoscute'
  },

  interviuri: {
    descriere: 'Discutii individuale cu experti',
    participanti: ['SME-uri', 'Manageri seniori', 'Clienti'],
    avantaj: 'Perspective diverse, detalii'
  },

  analizaDocumente: {
    descriere: 'Revizuire documentatie proiect',
    documente: ['Cerinte', 'Plan', 'Contracte', 'Lessons learned'],
    avantaj: 'Identifica presupuneri riscante'
  },

  diagrameAfinitate: {
    descriere: 'Grupare riscuri pe categorii',
    categorii: ['Tehnice', 'Management', 'Externe', 'Organizationale'],
    avantaj: 'Structureaza analiza'
  }
};
\`\`\`

### Structura Riscurilor (RBS)

\`\`\`
RISCURI PROIECT
├── 1. TEHNICE
│   ├── 1.1 Tehnologie
│   ├── 1.2 Complexitate
│   ├── 1.3 Performanta
│   └── 1.4 Calitate
│
├── 2. EXTERNE
│   ├── 2.1 Furnizori
│   ├── 2.2 Reglementari
│   ├── 2.3 Piata
│   └── 2.4 Client
│
├── 3. ORGANIZATIONALE
│   ├── 3.1 Resurse
│   ├── 3.2 Prioritati
│   ├── 3.3 Finantare
│   └── 3.4 Dependente
│
└── 4. MANAGEMENT PROIECT
    ├── 4.1 Estimari
    ├── 4.2 Comunicare
    ├── 4.3 Control
    └── 4.4 Planificare
\`\`\`

---

## Registrul Riscurilor

### Structura

\`\`\`typescript
interface Risc {
  id: string;
  titlu: string;
  descriere: string;
  categorie: string;
  sursa: string;
  dataIdentificare: Date;

  // Analiza
  probabilitate: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  scor: number; // P x I
  prioritate: 'Scazuta' | 'Medie' | 'Ridicata' | 'Critica';

  // Raspuns
  strategieRaspuns: 'Evitare' | 'Transfer' | 'Mitigare' | 'Acceptare';
  actiuniRaspuns: string[];
  proprietar: string;
  termenActiuni: Date;
  costContingenta: number;

  // Monitorizare
  status: 'Activ' | 'Inchis' | 'Realizat';
  triggere: string[];
  ultimaRevizuire: Date;
}
\`\`\`

### Exemplu Registru

\`\`\`
═══════════════════════════════════════════════════════════════════
                    REGISTRU RISCURI
═══════════════════════════════════════════════════════════════════

ID: R-001
TITLU: Intarziere livrare componente de la furnizor
DESCRIERE: Furnizorul principal de echipamente IT poate intarzia
          livrarea cu 2-4 saptamani din cauza crizei logistice.
CATEGORIE: Extern - Furnizori
DATA: 15.01.2025

PROBABILITATE: 4 (Probabil)
IMPACT: 4 (Ridicat - intarzie milestone M3)
SCOR: 16 → PRIORITATE RIDICATA

STRATEGIE: MITIGARE + TRANSFER PARTIAL
ACTIUNI:
1. Comanda cu 30 zile in avans fata de necesar
2. Identificare furnizor alternativ (backup)
3. Clauze penalizare in contract
4. Monitorizare saptamanala status livrare

PROPRIETAR: Ion Popescu (Procurement Lead)
TERMEN: 01.02.2025
CONTINGENTA: 15.000 RON (achizitie urgenta furnizor alternativ)

TRIGGER: Confirmare livrare nu vine cu 14 zile inainte de data
STATUS: ACTIV
ULTIMA REVIZUIRE: 20.01.2025
═══════════════════════════════════════════════════════════════════
\`\`\`

---

## Analiza Calitativa

### Matricea Probabilitate-Impact

\`\`\`
           I M P A C T
         1    2    3    4    5
      ┌────┬────┬────┬────┬────┐
    5 │  5 │ 10 │ 15 │ 20 │ 25 │ ← CRITIC
P   4 │  4 │  8 │ 12 │ 16 │ 20 │
R   3 │  3 │  6 │  9 │ 12 │ 15 │
O   2 │  2 │  4 │  6 │  8 │ 10 │
B   1 │  1 │  2 │  3 │  4 │  5 │
      └────┴────┴────┴────┴────┘

Scor 1-4:   Scazut  → Monitorizare pasiva
Scor 5-9:   Mediu   → Plan de raspuns
Scor 10-16: Ridicat → Actiuni prioritare
Scor 17-25: Critic  → Atentie imediata top management
\`\`\`

### Scale de Evaluare

\`\`\`typescript
const scaleEvaluare = {
  probabilitate: {
    1: { text: 'Foarte improbabil', procent: '<10%' },
    2: { text: 'Improbabil', procent: '10-30%' },
    3: { text: 'Posibil', procent: '30-50%' },
    4: { text: 'Probabil', procent: '50-70%' },
    5: { text: 'Foarte probabil', procent: '>70%' }
  },
  impact: {
    1: { text: 'Nesemnificativ', cost: '<2% buget', timp: '<1 sapt' },
    2: { text: 'Minor', cost: '2-5% buget', timp: '1-2 sapt' },
    3: { text: 'Moderat', cost: '5-10% buget', timp: '2-4 sapt' },
    4: { text: 'Major', cost: '10-20% buget', timp: '1-2 luni' },
    5: { text: 'Catastrofal', cost: '>20% buget', timp: '>2 luni' }
  }
};
\`\`\`

---

## Strategii de Raspuns

### Pentru Riscuri Negative (Amenintari)

\`\`\`typescript
const strategiiAmenintari = {
  EVITARE: {
    descriere: 'Eliminarea cauzei riscului',
    exemple: [
      'Schimbarea tehnologiei',
      'Eliminarea cerintei riscante',
      'Extinderea termenului'
    ],
    cand: 'Risc critic, cauza poate fi eliminata'
  },

  TRANSFER: {
    descriere: 'Mutarea consecintelor la tert',
    exemple: [
      'Asigurare',
      'Contract pret fix',
      'Subcontractare',
      'Garantii'
    ],
    cand: 'Tert poate gestiona mai bine riscul'
  },

  MITIGARE: {
    descriere: 'Reducerea probabilitatii sau impactului',
    exemple: [
      'Testare suplimentara',
      'Prototipuri',
      'Training echipa',
      'Furnizori backup'
    ],
    cand: 'Riscul nu poate fi evitat sau transferat'
  },

  ACCEPTARE: {
    descriere: 'Recunoasterea riscului fara actiune',
    tipuri: {
      activa: 'Rezerva de contingenta',
      pasiva: 'Deal with it if it happens'
    },
    cand: 'Cost raspuns > impact potential'
  }
};
\`\`\`

### Pentru Riscuri Pozitive (Oportunitati)

\`\`\`typescript
const strategiiOportunitati = {
  EXPLOATARE: 'Asigura ca oportunitatea se realizeaza',
  IMPARTASIRE: 'Parteneriat pentru a valorifica',
  IMBUNATATIRE: 'Creste probabilitatea sau impactul',
  ACCEPTARE: 'Profita daca apare'
};
\`\`\`

---

## Monitorizarea Riscurilor

### Activitati Continue

\`\`\`
SAPTAMANAL:
□ Revizuire riscuri active top 10
□ Verificare triggere
□ Actualizare status actiuni

LUNAR:
□ Re-evaluare toti riscuri activi
□ Identificare riscuri noi
□ Raport risc pentru steering committee

LA FIECARE MILESTONE:
□ Revizuire completa registru
□ Inchidere riscuri irelevante
□ Actualizare contingenta
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Identificati 10 riscuri pentru un proiect de migrare a aplicatiei in cloud.

**Exercitiul 2:** Pentru riscul "Dezvoltatorul cheie poate pleca", definiti:
- Probabilitate si impact
- Strategie de raspuns
- 3 actiuni concrete

**Exercitiul 3:** Creati un registru de riscuri complet pentru proiectul dvs. curent.

---

*Lectia urmatoare: Managementul Schimbarilor*`
    },
    {
      title: 'Managementul Schimbarilor si Controlul Scope',
      slug: 'managementul-schimbarilor-control-scope',
      type: 'TEXT' as const,
      duration: 45,
      order: 2,
      isFree: false,
      content: `# Managementul Schimbarilor in Proiecte

## De ce apar Schimbarile?

### Surse Comune

\`\`\`
1. EXTERNE
   - Legislatie noua
   - Actiuni competitori
   - Conditii economice

2. STAKEHOLDERI
   - Schimbare prioritati
   - Cerinte noi descoperite
   - Feedback utilizatori

3. TEHNICE
   - Probleme de integrare
   - Performanta sub asteptari
   - Constrangeri neanticipate

4. INTERNE
   - Lessons learned in proiect
   - Imbunatatiri identificate
   - Erori in specificatii
\`\`\`

---

## Procesul de Control al Schimbarilor

### Fluxul Standard

\`\`\`
CERERE SCHIMBARE
       ↓
   INREGISTRARE
       ↓
   ANALIZA IMPACT
       ↓
┌──────┴──────┐
│   DECIZIE   │ ← Change Control Board
└──────┬──────┘
       ↓
   ┌───┴───┐
   │       │
APROBARE  RESPINGERE
   ↓         ↓
IMPLEMENTARE  COMUNICARE
   ↓         MOTIV
VERIFICARE
   ↓
INCHIDERE CR
\`\`\`

---

## Cererea de Schimbare (Change Request)

### Structura Standard

\`\`\`typescript
interface ChangeRequest {
  // Identificare
  id: string;
  titlu: string;
  dataSubmitere: Date;
  solicitant: string;
  prioritate: 'Critica' | 'Ridicata' | 'Medie' | 'Scazuta';
  tip: 'Scope' | 'Cost' | 'Timp' | 'Calitate' | 'Combinat';

  // Descriere
  situatiaActuala: string;
  schimbareaPropusa: string;
  justificare: string;

  // Analiza Impact
  impactScope: string;
  impactTimp: {
    zileAditionale: number;
    activitatiAfectate: string[];
  };
  impactCost: {
    costAditional: number;
    detalii: string;
  };
  impactCalitate: string;
  impactRiscuri: string[];

  // Decizie
  status: 'Noua' | 'In analiza' | 'Aprobata' | 'Respinsa' | 'Amanata' | 'Implementata';
  dataCCB: Date;
  decizie: string;
  conditii: string[];
  aprobatDe: string[];

  // Implementare
  planImplementare: string;
  responsabil: string;
  dataImplementare: Date;
}
\`\`\`

### Model Cerere

\`\`\`
═══════════════════════════════════════════════════════════════════
           CERERE DE SCHIMBARE
═══════════════════════════════════════════════════════════════════

CR ID: CR-2025-015
TITLU: Adaugare modul export Excel pentru rapoarte
DATA: 25.01.2025
SOLICITANT: Maria Ionescu, Director Vanzari
PRIORITATE: Ridicata
TIP: Scope + Timp

───────────────────────────────────────────────────────────────────
1. SITUATIA ACTUALA
───────────────────────────────────────────────────────────────────
Rapoartele din sistem se pot exporta doar in PDF.
Echipa de vanzari petrece 4 ore/saptamana reformatand in Excel.

───────────────────────────────────────────────────────────────────
2. SCHIMBAREA PROPUSA
───────────────────────────────────────────────────────────────────
Adaugarea optiunii de export Excel (.xlsx) pentru toate
rapoartele din modulul de vanzari (5 rapoarte).

───────────────────────────────────────────────────────────────────
3. JUSTIFICARE BUSINESS
───────────────────────────────────────────────────────────────────
- Economie 4 ore/sapt x 50 sapt = 200 ore/an
- Cost orar echipa: 50 RON → Economie 10.000 RON/an
- Imbunatatire satisfactie utilizatori
- ROI implementare: 12 luni

───────────────────────────────────────────────────────────────────
4. ANALIZA IMPACT
───────────────────────────────────────────────────────────────────

SCOPE: +1 functionalitate, 5 rapoarte modificate
TIMP:  +10 zile dezvoltare, +3 zile testare
       Intarziere milestone M4 cu 2 saptamani
COST:  +8.500 RON (80 ore dezvoltare x 80 RON + testare)
       +2.000 RON licenta librarie Excel
       TOTAL: +10.500 RON
CALITATE: Fara impact negativ
RISCURI:
  - R-NEW-01: Compatibilitate formatare (mitigabil)

───────────────────────────────────────────────────────────────────
5. ALTERNATIVE EVALUATE
───────────────────────────────────────────────────────────────────
A1: Implementare in faza 2 → Nu rezolva problema imediat
A2: Export CSV (mai simplu) → Echipa prefera Excel direct
A3: Tool extern → Cost mai mare pe termen lung

RECOMANDARE: Aprobare cu implementare in Sprint 8

═══════════════════════════════════════════════════════════════════
                        DECIZIE CCB
═══════════════════════════════════════════════════════════════════
DATA CCB: 28.01.2025
PARTICIPANTI: PM, Sponsor, Tech Lead, QA Lead

DECIZIE: ☑ APROBAT  ☐ RESPINS  ☐ AMANAT

CONDITII:
1. Implementare in Sprint 8-9
2. Testare cu echipa vanzari inainte de release
3. Documentatie utilizator actualizata

SEMNATURI:
Sponsor: _____________ PM: _____________

═══════════════════════════════════════════════════════════════════
\`\`\`

---

## Change Control Board (CCB)

### Compozitie Tipica

\`\`\`typescript
interface CCB {
  membri: {
    rol: string;
    reprezentant: string;
    votant: boolean;
  }[];

  reguli: {
    cvorum: number; // minim membri pentru decizie valida
    unanimitate: boolean; // sau majoritate
    vetoSponso: boolean;
    frecventaIntalniri: string;
  };
}

const ccbExemplu: CCB = {
  membri: [
    { rol: 'Sponsor', reprezentant: 'Director Comercial', votant: true },
    { rol: 'Manager Proiect', reprezentant: 'Andrei Popescu', votant: true },
    { rol: 'Tech Lead', reprezentant: 'Ion Developer', votant: true },
    { rol: 'QA Lead', reprezentant: 'Maria Tester', votant: true },
    { rol: 'Business Analyst', reprezentant: 'Ana Analyst', votant: false }
  ],
  reguli: {
    cvorum: 3,
    unanimitate: false,
    vetoSponso: true, // Sponsor poate bloca orice
    frecventaIntalniri: 'Saptamanal sau la cerere urgenta'
  }
};
\`\`\`

---

## Scope Creep vs Gold Plating

### Definitii

\`\`\`
SCOPE CREEP:
- Adaugare necontrolata de cerinte
- Fara aprobare formala CCB
- Fara ajustare buget/timp
- PERICOL MAJOR pentru proiecte

GOLD PLATING:
- Adaugare functionalitati "bonus" de echipa
- Fara cerere de la client
- "Nice to have" neaprobate
- Risipire resurse

AMBELE SUNT INTERZISE!
Orice schimbare → prin procesul formal de CR
\`\`\`

### Prevenire

\`\`\`typescript
const prevenieScopeCreep = {
  claritate: {
    actiuni: [
      'WBS complet si aprobat',
      'Documentatie cerinte detaliata',
      'Criterii de acceptanta clare',
      'Lista explicita de excluderi'
    ]
  },

  proces: {
    actiuni: [
      'Orice cerere → CR formal',
      'CCB periodic',
      'Comunicare impact la stakeholderi',
      'Nu se lucreaza fara CR aprobat'
    ]
  },

  cultura: {
    actiuni: [
      'Training echipa pe proces',
      'Empowerment PM sa spuna NU',
      'Stakeholderi inteleg constrangerile',
      'Transparenta cost schimbari'
    ]
  }
};
\`\`\`

---

## Registrul Schimbarilor

### Model Registru

\`\`\`
┌─────┬───────────────────┬────────┬─────────┬─────────┬──────────┐
│ ID  │ Titlu             │ Status │ Impact  │ Data    │ Decizie  │
│     │                   │        │ Cost    │ CCB     │          │
├─────┼───────────────────┼────────┼─────────┼─────────┼──────────┤
│ 001 │ Export Excel      │ Impl.  │+10.500  │28.01.25 │ Aprobat  │
│ 002 │ 2FA Login         │ Analiza│+5.000   │ -       │ Pending  │
│ 003 │ Dark Mode         │ Respins│+15.000  │25.01.25 │ Respins  │
│ 004 │ API v2            │ Amanat │+25.000  │25.01.25 │ Faza 2   │
└─────┴───────────────────┴────────┴─────────┴─────────┴──────────┘

SUMAR:
- Total CR: 4
- Aprobate: 1 (+10.500 RON)
- Respinse: 1
- In analiza: 1
- Amanate: 1
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Completati o cerere de schimbare pentru adaugarea unei functionalitati de notificari push.

**Exercitiul 2:** Definiti compozitia CCB si regulile pentru un proiect de implementare CRM.

**Exercitiul 3:** Identificati 3 semne de scope creep in proiectul dvs. si propuneti masuri preventive.

---

*Lectia urmatoare: Comunicarea si Raportarea in Proiecte*`
    },
    {
      title: 'Comunicarea si Raportarea in Proiecte',
      slug: 'comunicare-raportare-proiecte',
      type: 'TEXT' as const,
      duration: 45,
      order: 3,
      isFree: false,
      content: `# Comunicarea si Raportarea in Proiecte

## Importanta Comunicarii

### Statistici

- PM petrece **75-90%** din timp comunicand
- **90%** din problemele proiectelor = comunicare deficitara
- Proiectele cu plan de comunicare clar au **2x** succes

---

## Planul de Comunicare

### Structura

\`\`\`typescript
interface PlanComunicare {
  stakeholder: string;
  informatie: string;
  frecventa: string;
  format: string;
  canal: string;
  responsabil: string;
  feedback: string;
}

const planComunicareExemplu: PlanComunicare[] = [
  {
    stakeholder: 'Sponsor',
    informatie: 'Status general, riscuri majore, decizii necesare',
    frecventa: 'Bi-saptamanal',
    format: 'Raport executive (1 pagina)',
    canal: 'Email + meeting 30 min',
    responsabil: 'PM',
    feedback: 'Email reply / discutie'
  },
  {
    stakeholder: 'Steering Committee',
    informatie: 'Progres milestone, buget, schimbari, riscuri',
    frecventa: 'Lunar',
    format: 'Prezentare + raport detaliat',
    canal: 'Meeting 1h',
    responsabil: 'PM',
    feedback: 'Decizii in meeting'
  },
  {
    stakeholder: 'Echipa proiect',
    informatie: 'Taskuri, blocaje, coordonare',
    frecventa: 'Zilnic (stand-up)',
    format: 'Verbal + actualizare Jira',
    canal: 'Meeting 15 min + Slack',
    responsabil: 'Toti membrii',
    feedback: 'Imediat in meeting'
  },
  {
    stakeholder: 'Utilizatori finali',
    informatie: 'Timeline, impact, training',
    frecventa: 'La milestone-uri',
    format: 'Newsletter + webinar',
    canal: 'Email + Teams',
    responsabil: 'Change Manager',
    feedback: 'Survey'
  }
];
\`\`\`

---

## Raportul de Status (Weekly)

### Structura Standard

\`\`\`
══════════════════════════════════════════════════════════════════
       RAPORT STATUS PROIECT - SAPTAMANA 4
══════════════════════════════════════════════════════════════════

PROIECT: Implementare CRM        DATA: 27.01.2025
PM: Andrei Popescu               PERIOADA: 20-26 Ianuarie

──────────────────────────────────────────────────────────────────
                    STATUS GENERAL: 🟡 ATENTIE
──────────────────────────────────────────────────────────────────

SUMAR EXECUTIV:
Proiectul inregistreaza o intarziere de 5 zile fata de plan
datorata disponibilitatii reduse a echipei de vanzari pentru
sesiunile de configurare. S-au luat masuri de recuperare.

──────────────────────────────────────────────────────────────────
                    PROGRES SAPTAMANA CURENTA
──────────────────────────────────────────────────────────────────

REALIZAT:
✓ Finalizare configurare module Pipeline si Leads
✓ Import date clienti existenti (2.500 inregistrari)
✓ Training echipa IT pentru administrare

IN CURS:
→ Configurare modul Oportuniti (75% complet)
→ Integrare email Outlook (50% complet)

BLOCAT:
⚠ Sesiuni configurare cu Vanzari - reprogramate

──────────────────────────────────────────────────────────────────
                    INDICATORI CHEIE
──────────────────────────────────────────────────────────────────

            Plan     Actual   Variatie   Trend
SCOPE       40%      38%        -2%       →
TIMP        S4       S4+5d      +5d       ↓
BUGET       45.000   42.000   -3.000      ↑
CALITATE    OK       OK         OK        →

──────────────────────────────────────────────────────────────────
                    PLAN SAPTAMANA URMATOARE
──────────────────────────────────────────────────────────────────

• Finalizare configurare Oportuniti
• Completare integrare email
• Sesiuni configurare Vanzari (3 sesiuni programate)
• Incepere testare UAT modul Pipeline

──────────────────────────────────────────────────────────────────
                    RISCURI SI PROBLEME
──────────────────────────────────────────────────────────────────

RISCURI ACTIVE:
⚠ R-003: Adoptie scazuta Vanzari - RIDICAT - Actiuni in curs

PROBLEME:
⚠ P-001: Disponibilitate Vanzari - Escaladat la Director

──────────────────────────────────────────────────────────────────
                    DECIZII NECESARE
──────────────────────────────────────────────────────────────────

• Aprobare reprogramare sesiuni Vanzari (impact +3 zile)
• Aprobare CR-005: Adaugare camp custom "Sursa Lead"

══════════════════════════════════════════════════════════════════
             Urmatorul raport: 03.02.2025
══════════════════════════════════════════════════════════════════
\`\`\`

---

## Dashboard Proiect

### Indicatori Vizuali

\`\`\`typescript
interface DashboardProiect {
  statusGeneral: 'Verde' | 'Galben' | 'Rosu';

  carduri: {
    progresScope: number; // %
    zilePanaDeadline: number;
    bugetRamas: number;
    riscuriActive: number;
    problemeActive: number;
    CRpending: number;
  };

  grafice: {
    burndownChart: DataPoint[]; // Munca ramasa vs timp
    burnupChart: DataPoint[]; // Munca completata vs timp
    budgetTrend: DataPoint[]; // Plan vs actual cost
    velocityTrend: DataPoint[]; // Story points per sprint
  };

  milestones: {
    nume: string;
    dataPlanificata: Date;
    dataActuala?: Date;
    status: 'Complete' | 'On Track' | 'At Risk' | 'Late';
  }[];
}
\`\`\`

---

## Meeting-uri Esentiale

### Tipuri si Structura

\`\`\`typescript
const meetinguriProiect = {
  kickoff: {
    scop: 'Lansare oficiala proiect',
    participanti: ['Toti stakeholderii cheie'],
    durata: '1-2 ore',
    agenda: [
      'Prezentare obiective si scope',
      'Echipa si roluri',
      'Timeline si milestone-uri',
      'Reguli de lucru',
      'Q&A'
    ],
    output: 'Aliniere echipa, actiuni imediate'
  },

  dailyStandup: {
    scop: 'Sincronizare zilnica echipa',
    participanti: ['Echipa tehnica'],
    durata: '15 minute MAX',
    agenda: [
      'Ce am facut ieri?',
      'Ce fac azi?',
      'Ce blocaje am?'
    ],
    output: 'Identificare blocaje, coordonare'
  },

  statusMeeting: {
    scop: 'Raportare progres la management',
    participanti: ['PM', 'Sponsor', 'Key stakeholders'],
    durata: '30-60 minute',
    agenda: [
      'Status general',
      'Progres vs plan',
      'Riscuri si probleme',
      'Decizii necesare',
      'Plan urmator'
    ],
    output: 'Decizii, actiuni, alerta'
  },

  retrospectiva: {
    scop: 'Imbunatatire continua',
    participanti: ['Echipa proiect'],
    durata: '1-2 ore',
    agenda: [
      'Ce a mers bine?',
      'Ce putem imbunatati?',
      'Ce vom face diferit?'
    ],
    output: 'Actiuni de imbunatatire'
  }
};
\`\`\`

---

## Tehnici de Comunicare Eficienta

### Reguli de Baza

\`\`\`
1. ADAPTARE LA AUDIENTA
   - Executive: sumar, decizii, numere
   - Tehnici: detalii, solutii, date

2. CLARITATE
   - Un mesaj principal per comunicare
   - Evita jargon pentru non-tehnici
   - Actiuni clare cu responsabili si termene

3. PROACTIVITATE
   - Comunica inainte sa fii intrebat
   - Vestile proaste - mai devreme
   - Vestile bune - cu context

4. DOCUMENTARE
   - Minutes of Meeting distribuite in 24h
   - Decizii inregistrate in scris
   - Comunicari importante - email follow-up
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Creati un plan de comunicare pentru un proiect cu 8 categorii de stakeholderi.

**Exercitiul 2:** Scrieti un raport de status saptamanal pentru un proiect aflat la 60% completare, cu o intarziere de 10%.

**Exercitiul 3:** Pregatiti agenda si facilitati un meeting retrospectiva de 1 ora.

---

*Lectia urmatoare: Inchiderea Proiectului si Lessons Learned*`
    },
    {
      title: 'Inchiderea Proiectului si Lessons Learned',
      slug: 'inchidere-proiect-lessons-learned',
      type: 'TEXT' as const,
      duration: 40,
      order: 4,
      isFree: false,
      content: `# Inchiderea Proiectului

## De ce este Importanta Inchiderea Formala?

### Beneficii

- **Confirmare oficiala** ca proiectul este complet
- **Transfer responsabilitate** catre operatiuni
- **Eliberare resurse** pentru alte proiecte
- **Documentare cunostinte** pentru viitor
- **Celebrare succesului** echipei

---

## Procesul de Inchidere

### Etape

\`\`\`
1. VERIFICARE LIVRABILE
   ↓
2. OBTINERE ACCEPTANTA FORMALA
   ↓
3. TRANSFER OPERATIONAL
   ↓
4. SESIUNE LESSONS LEARNED
   ↓
5. ARHIVARE DOCUMENTE
   ↓
6. ELIBERARE RESURSE
   ↓
7. RAPORT FINAL PROIECT
   ↓
8. CELEBRARE
\`\`\`

---

## Verificarea Livrabilor

### Checklist Final

\`\`\`typescript
interface VerificareLivrabile {
  livrabil: string;
  criteriiAcceptanta: {
    criteriu: string;
    indeplinit: boolean;
    dovada: string;
  }[];
  testat: boolean;
  documentat: boolean;
  aprobatDe: string;
  dataAprobarii: Date;
}

const checklistFinal = {
  livrabileTehnice: [
    'Software instalat si functional',
    'Documentatie tehnica completa',
    'Cod sursa in repository',
    'Teste automate trecute',
    'Performanta conform SLA'
  ],

  livrabileBusiness: [
    'Procese actualizate',
    'Utilizatori instruiti',
    'Manuale utilizator',
    'Rapoarte functionale'
  ],

  livrabilePM: [
    'Toate CR-urile inchise',
    'Riscuri inchise sau transferate',
    'Probleme rezolvate',
    'Registre actualizate'
  ]
};
\`\`\`

---

## Acceptanta Formala

### Document Acceptanta

\`\`\`
══════════════════════════════════════════════════════════════════
         CERTIFICAT DE ACCEPTANTA FINALA
══════════════════════════════════════════════════════════════════

PROIECT: Implementare CRM
COD: PRJ-2025-001
DATA: 15.03.2025

Subsemnatii, in calitate de reprezentanti ai partilor,
confirma urmatoarele:

1. LIVRABILE VERIFICATE
   ☑ Sistem CRM instalat si operational
   ☑ 50 utilizatori cu acces configurat
   ☑ Date migrate si validate
   ☑ Integrari functionale (email, telefonie)
   ☑ Training completat pentru toti utilizatorii
   ☑ Documentatie livrata

2. CONFORMITATE
   ☑ Toate cerintele din specificatii sunt indeplinite
   ☑ Criteriile de acceptanta din contract sunt satisfacute
   ☑ Testele UAT au fost finalizate cu succes

3. OBSERVATII / EXCEPTII
   Nicio exceptie. Toate livrabileele sunt acceptate.

4. TRANSFER RESPONSABILITATE
   De la data semnarii, responsabilitatea operationala
   este transferata catre:
   - Suport Nivel 1: Service Desk IT
   - Suport Nivel 2: Echipa CRM Operations
   - Suport Nivel 3: Vendor (conform SLA)

──────────────────────────────────────────────────────────────────

BENEFICIAR:                    FURNIZOR/PM:

Nume: Maria Ionescu            Nume: Andrei Popescu
Functie: Director Comercial    Functie: Project Manager
Semnatura: ____________        Semnatura: ____________
Data: ____________             Data: ____________

══════════════════════════════════════════════════════════════════
\`\`\`

---

## Lessons Learned

### Definitie

Cunostinte si experiente dobandite pe parcursul proiectului care pot fi valorificate in proiecte viitoare.

### Facilitarea Sesiunii

\`\`\`typescript
const structuraSesiuneLL = {
  pregatire: {
    durata: '1-2 zile inainte',
    activitati: [
      'Trimitere survey pre-sesiune',
      'Analiza datelor proiect',
      'Pregatire intrebari cheie',
      'Invitare participanti'
    ]
  },

  sesiune: {
    durata: '2-3 ore',
    agenda: [
      '0-15 min: Introducere si reguli',
      '15-60 min: Ce a mers bine? (SUCCESS)',
      '60-120 min: Ce a mers mai putin bine? (CHALLENGES)',
      '120-150 min: Ce facem diferit? (IMPROVEMENTS)',
      '150-180 min: Sumar si actiuni'
    ],
    reguli: [
      'Fara blame - focus pe proces nu pe persoane',
      'Toate opiniile sunt valide',
      'Confidentialitate',
      'Documentam tot'
    ]
  },

  postSesiune: {
    activitati: [
      'Documentare lessons learned',
      'Distribuire la echipa',
      'Adaugare in baza de cunostinte',
      'Plan actiuni pentru organizatie'
    ]
  }
};
\`\`\`

### Template Lessons Learned

\`\`\`
══════════════════════════════════════════════════════════════════
              LESSONS LEARNED - PROIECT CRM
══════════════════════════════════════════════════════════════════

DATA SESIUNE: 18.03.2025
PARTICIPANTI: Echipa proiect (8 persoane)
FACILITATOR: Andrei Popescu, PM

──────────────────────────────────────────────────────────────────
                     CE A MERS BINE
──────────────────────────────────────────────────────────────────

1. COMUNICAREA CU VENDORUL
   Descriere: Call-uri saptamanale au mentinut alinierea
   Impact: Zero surprize la livrare
   Recomandare: Mentineti ritmul regulat de sync cu vendori

2. EARLY INVOLVEMENT UTILIZATORI
   Descriere: Utilizatorii cheie implicati din faza de design
   Impact: Adoptie 85% in prima luna (target 80%)
   Recomandare: Definiti "super users" de la inceput

3. TESTARE PARALELA
   Descriere: UAT in paralel cu development
   Impact: Redus timpul de testare finala cu 40%
   Recomandare: Implementati testare continua

──────────────────────────────────────────────────────────────────
                     PROVOCARI INTAMPINATE
──────────────────────────────────────────────────────────────────

1. DISPONIBILITATE STAKEHOLDERI
   Ce s-a intamplat: Sesiunile de cerinte amanate repetat
   Impact: +2 saptamani intarziere faza analiza
   Cauza root: Stakeholderii nu au fost informati de commitment
   Recomandare: Obtineti commitment scris inainte de kickoff

2. CALITATE DATE MIGRARE
   Ce s-a intamplat: 15% din date necesitau curatare manuala
   Impact: +20 ore efort + 3 zile intarziere
   Cauza root: Nu am facut audit date inainte de estimare
   Recomandare: Audit date obligatoriu in faza de analiza

3. SCOPE CREEP MODULE RAPOARTE
   Ce s-a intamplat: 3 rapoarte custom adaugate fara CR formal
   Impact: +15 ore efort neplanificat
   Cauza root: Echipa a acceptat cereri direct de la utilizatori
   Recomandare: Training echipa pe procesul de CR

──────────────────────────────────────────────────────────────────
                     RECOMANDARI PENTRU VIITOR
──────────────────────────────────────────────────────────────────

PENTRU PROIECTE SIMILARE:
1. Planificati 20% contingenta timp pentru migrare date
2. Includeti change management formal din start
3. Definiti clar cine are autoritate de aprobare in absenta

PENTRU ORGANIZATIE:
1. Actualizati template-ul de estimare cu lectiile invatate
2. Adaugati checkpoint "data quality" in proces
3. Training PMO pe procesul de schimbari

══════════════════════════════════════════════════════════════════
\`\`\`

---

## Raportul Final de Proiect

### Structura

\`\`\`
RAPORT FINAL PROIECT

1. SUMAR EXECUTIV
   - Obiective atinse
   - Rezultate cheie

2. PERFORMANTA PROIECT
   - Scope: Plan vs Realizat
   - Timp: Plan vs Realizat
   - Cost: Buget vs Actual
   - Calitate: Metrici

3. LIVRABILE
   - Lista completa
   - Status acceptanta

4. LESSONS LEARNED
   - Sumar top 5

5. RISCURI REZIDUALE
   - Transferate la operatiuni

6. RECOMANDARI
   - Urmatoarele faze
   - Imbunatatiri

7. MULTUMIRI
   - Echipa si contributii
\`\`\`

---

## Celebrarea Succesului

### Importanta

- Recunoasterea efortului echipei
- Motivare pentru proiecte viitoare
- Consolidarea relatiilor
- Inchidere psihologica

### Idei

\`\`\`
• Cina/petrecere echipa
• Recunoastere publica (newsletter, town hall)
• Certificate/trofee simbolice
• Bonus performanta
• Zile libere suplimentare
• Scrisori de multumire personalizate
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Creati checklist-ul complet de inchidere pentru proiectul dvs.

**Exercitiul 2:** Facilitati o sesiune de lessons learned (simulare sau reala) si documentati rezultatele.

**Exercitiul 3:** Scrieti raportul final sumar (2 pagini) pentru un proiect incheiat.

---

## Concluzie Modul si Curs

Felicitari pentru parcurgerea cursului de Project Management!

**Ati invatat:**
- Fundamentele managementului de proiect
- Metodologii (Waterfall, Agile, PRINCE2, PMI)
- Initierea si planificarea proiectelor
- Executia si monitorizarea
- Managementul riscurilor si schimbarilor
- Comunicarea si raportarea
- Inchiderea profesionala

**Urmatoarele certificari recomandate:**
- PMP (Project Management Professional)
- PRINCE2 Foundation & Practitioner
- PMI-ACP (Agile Certified Practitioner)
- Scrum Master (PSM I, CSM)

---

*Sfarsitul cursului Project Management Masterclass*`
    }
  ]
};
