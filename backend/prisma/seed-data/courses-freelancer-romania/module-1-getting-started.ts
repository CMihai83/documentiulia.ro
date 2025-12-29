// Freelancer Romania Complete Guide - Module 1: Incepe ca Freelancer
// Elite-level comprehensive content

export const freelancerModule1 = {
  title: 'Incepe ca Freelancer in Romania',
  description: 'Tot ce trebuie sa stii inainte de a deveni freelancer: forme juridice, inregistrare, taxe',
  order: 1,
  lessons: [
    {
      title: 'Freelancing in Romania 2025 - Peisajul Complet',
      slug: 'freelancing-romania-2025-peisaj',
      type: 'TEXT' as const,
      duration: 35,
      order: 1,
      isFree: true,
      content: `# Freelancing in Romania 2025 - Ghid Complet

## Ce inseamna sa fii Freelancer?

### Definitie

Un **freelancer** este o persoana care ofera servicii profesionale in mod independent, fara a fi angajat permanent al unui singur client.

### Caracteristici

- **Independenta** - alegi cu cine lucrezi
- **Flexibilitate** - stabilesti propriul program
- **Responsabilitate** - gestionezi tot (taxe, clienti, marketing)
- **Risc** - venituri variabile, fara beneficii angajat

---

## De ce Romania pentru Freelancing?

### Avantaje

\`\`\`
FISCAL:
• Impozit pe venit: 10% (printre cele mai mici din UE)
• Contributii sociale: configurabile
• Microintreprindere: 1-3% pe venituri

COSTURI:
• Cost de trai moderat vs Europa de Vest
• Birouri/coworking accesibile
• Internet rapid si ieftin

TALENT:
• Educatie tehnica solida
• Engleza la nivel ridicat
• Fusul orar potrivit pentru UE si USA

DIGITAL:
• E-guvernare in crestere
• SPV pentru declaratii online
• Facturare electronica
\`\`\`

### Provocari

\`\`\`
• Birocratia (in scadere, dar inca prezenta)
• Schimbari legislative frecvente
• Sistem pensii incert pe termen lung
• Plata contributii sociale relativ mare
\`\`\`

---

## Domeniile Populare pentru Freelanceri

### Top 10 Domenii in Romania

| # | Domeniu | Venit mediu/ora | Cerere |
|---|---------|-----------------|--------|
| 1 | Programare/IT | 30-150 EUR | Foarte mare |
| 2 | Design grafic | 20-80 EUR | Mare |
| 3 | Marketing digital | 25-100 EUR | Mare |
| 4 | Copywriting | 15-50 EUR | Medie |
| 5 | Traduceri | 10-30 EUR | Medie |
| 6 | Consultanta business | 50-200 EUR | Medie |
| 7 | Video/Foto | 30-100 EUR | Medie |
| 8 | Contabilitate | 20-50 EUR | Medie |
| 9 | Training/Coaching | 30-100 EUR | In crestere |
| 10 | Asistenta virtuala | 10-25 EUR | Medie |

---

## Forme Juridice pentru Freelanceri

### Optiuni Disponibile

\`\`\`typescript
interface FormaJuridica {
  denumire: string;
  abreviere: string;
  caracteristici: string[];
  pentrucine: string;
  costuriInfiintare: number;
  complexitateAdministrativa: 'Scazuta' | 'Medie' | 'Ridicata';
}

const formeJuridice: FormaJuridica[] = [
  {
    denumire: 'Persoana Fizica Autorizata',
    abreviere: 'PFA',
    caracteristici: [
      'O singura activitate CAEN',
      'Raspundere nelimitata',
      'Contabilitate simpla',
      'Impozit pe norma sau real'
    ],
    pentrucine: 'Freelanceri individuali, venituri moderate',
    costuriInfiintare: 100,
    complexitateAdministrativa: 'Scazuta'
  },
  {
    denumire: 'Intreprindere Individuala',
    abreviere: 'II',
    caracteristici: [
      'Mai multe activitati CAEN',
      'Poate angaja pana la 8 persoane',
      'Raspundere nelimitata',
      'Contabilitate simpla/partida dubla'
    ],
    pentrucine: 'Freelanceri cu activitati diverse',
    costuriInfiintare: 150,
    complexitateAdministrativa: 'Medie'
  },
  {
    denumire: 'Societate cu Raspundere Limitata',
    abreviere: 'SRL',
    caracteristici: [
      'Raspundere limitata la capital',
      'Personalitate juridica separata',
      'Poate fi microintreprindere (1-3%)',
      'Contabilitate partida dubla obligatorie'
    ],
    pentrucine: 'Venituri mari, dorinta de scalare, protectie',
    costuriInfiintare: 500,
    complexitateAdministrativa: 'Ridicata'
  },
  {
    denumire: 'Drepturi de autor',
    abreviere: 'CIM/Cesiune',
    caracteristici: [
      'Pentru creatii intelectuale',
      'Impozit 10% pe venit net',
      'Fara contributii (sau optionale)',
      'Nu necesita inregistrare'
    ],
    pentrucine: 'Scriitori, artisti, dezvoltatori software',
    costuriInfiintare: 0,
    complexitateAdministrativa: 'Scazuta'
  }
];
\`\`\`

### Comparatie Rapida

\`\`\`
                PFA         II          SRL
Raspundere     Nelimitata  Nelimitata  Limitata
Angajati       NU          DA (8)      DA (nelim)
CAEN           1           Mai multe   Nelim
Contabilitate  Simpla      Simpla/PD   Partida dubla
Impozit venit  10%         10%         1-3% micro
Complexitate   Mica        Medie       Mare
\`\`\`

---

## Cat castiga Freelancerii in Romania?

### Statistici 2024

\`\`\`
VENITURI LUNARE MEDII (EUR):

Junior (0-2 ani):
├── IT: 1.500-2.500
├── Design: 800-1.500
├── Marketing: 1.000-2.000
└── Alte: 500-1.000

Mid (2-5 ani):
├── IT: 3.000-5.000
├── Design: 1.500-3.000
├── Marketing: 2.000-4.000
└── Alte: 1.000-2.500

Senior (5+ ani):
├── IT: 5.000-15.000
├── Design: 3.000-6.000
├── Marketing: 4.000-8.000
└── Alte: 2.500-5.000

NOTA: Variatie mare in functie de nisa,
clienti (locali vs internationali), reputatie.
\`\`\`

---

## Primii Pasi - Checklist

### Inainte de a Incepe

\`\`\`
□ Defineste serviciile pe care le oferi
□ Cerceteaza piata (preturi, competitie)
□ Evalueaza nevoile financiare (rezerva 3-6 luni)
□ Decide forma juridica potrivita
□ Consulta un contabil/avocat
□ Pregateste portofoliu/site
\`\`\`

### La Infiintare

\`\`\`
□ Inregistreaza PFA/II/SRL
□ Obtine cod CAEN potrivit
□ Deschide cont bancar business
□ Inregistreaza la ANAF (SPV)
□ Contracteaza contabil (recomandat)
□ Seteaza sistem de facturare
\`\`\`

### Dupa Infiintare

\`\`\`
□ Creeaza contracte standard
□ Stabileste procesul de onboarding clienti
□ Configureaza evidenta venituri/cheltuieli
□ Planifica marketingul personal
□ Construieste retea profesionala
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Listeaza 5 servicii pe care le poti oferi ca freelancer si cerceteaza preturile pietei pentru fiecare.

**Exercitiul 2:** Calculeaza de cati clienti/proiecte pe luna ai nevoie pentru a acoperi cheltuielile personale + taxe.

**Exercitiul 3:** Compara PFA vs SRL pentru situatia ta specifica.

---

*Lectia urmatoare: PFA - Inregistrare Pas cu Pas*`
    },
    {
      title: 'PFA - Inregistrare Completa Pas cu Pas',
      slug: 'pfa-inregistrare-pas-cu-pas',
      type: 'TEXT' as const,
      duration: 45,
      order: 2,
      isFree: false,
      content: `# Inregistrarea PFA - Ghid Complet 2025

## Ce este PFA?

### Definitie Legala

**Persoana Fizica Autorizata (PFA)** este o forma de organizare a activitatii economice desfasurate de o persoana fizica in mod independent.

### Cadrul Legal

- **OUG 44/2008** - privind desfasurarea activitatilor economice de catre PFA, II, IF
- **Codul Fiscal** - impozitare
- **Codul de Procedura Fiscala** - relatia cu ANAF

---

## Conditii de Inregistrare

### Cine poate infiinta PFA

\`\`\`typescript
interface ConditiiPFA {
  varstaMinima: 18; // ani, capacitate deplina de exercitiu
  studiuMinim: string; // Conform activitatii
  experienta: string; // SAU atestare profesionala
  cetatenie: 'RO' | 'UE' | 'terta_tara_cu_rezidenta';
  cazierCurat: boolean;
  sediuProfesional: boolean;
}

const conditiiStandard: ConditiiPFA = {
  varstaMinima: 18,
  studiuMinim: 'Diplome/certificate relevante activitatii',
  experienta: 'Experienta profesionala SAU curs de calificare',
  cetatenie: 'RO', // sau UE/rezident legal
  cazierCurat: true, // pentru anumite activitati
  sediuProfesional: true // adresa unde functionezi
};
\`\`\`

### Documente Necesare

\`\`\`
OBLIGATORII:
□ CI/Pasaport (copie)
□ Cerere de inregistrare (formular ONRC)
□ Declaratie pe propria raspundere
□ Dovada sediu (contract inchiriere/comodat/proprietate)
□ Dovada calificare/experienta pentru activitate
□ Specimenul de semnatura

DUPA CAZ:
□ Cazier judiciar (pentru activitati reglementate)
□ Avize speciale (pentru domenii reglementate)
□ Autorizatii sanitare, PSI etc.

TAXA:
□ Taxa ONRC: ~100-150 RON
□ Taxa Monitorul Oficial: ~20 RON
\`\`\`

---

## Procedura de Inregistrare

### Pasul 1: Alegerea Activitatii (Cod CAEN)

\`\`\`
CODURI CAEN POPULARE PENTRU FREELANCERI:

IT/Programare:
6201 - Activitati de realizare a software-ului la comanda
6202 - Activitati de consultanta in tehnologia informatiei
6209 - Alte activitati de servicii privind tehnologia informatiei

Design:
7410 - Activitati de design specializat
7311 - Activitati ale agentiilor de publicitate

Marketing:
7311 - Activitati ale agentiilor de publicitate
7320 - Activitati de studiere a pietei si de sondare

Consultanta:
7022 - Activitati de consultanta pentru afaceri
7490 - Alte activitati profesionale, stiintifice, tehnice

Traduceri:
7430 - Activitati de traducere scrisa si orala

Training:
8559 - Alte forme de invatamant
\`\`\`

### Pasul 2: Obtinerea Dovezii de Sediu

\`\`\`
OPTIUNI SEDIU:

1. LOCUINTA PROPRIE
   - Extras CF care arata proprietatea
   - Declaratie ca folosesti pentru PFA
   - Gratuit, cel mai simplu

2. INCHIRIERE
   - Contract de inchiriere
   - Acord proprietar pentru sediu PFA
   - Cost lunar

3. COMODAT (imprumut gratuit)
   - Contract comodat cu proprietarul
   - Actul de proprietate
   - Gratuit

4. SEDIU VIRTUAL
   - Contract cu firma de sedii virtuale
   - Include primire corespondenta
   - 50-150 RON/luna

ATENTIE: Unele asociatii de proprietari
interzic activitati comerciale in blocuri!
\`\`\`

### Pasul 3: Rezervarea Denumirii

\`\`\`
FORMAT DENUMIRE PFA:
"[NUME] [PRENUME] PFA"

Exemplu: "POPESCU ION PFA"

VERIFICARE DISPONIBILITATE:
- Online pe portal.onrc.ro
- Rezervare valabila 3 luni
- Taxa: ~40 RON
\`\`\`

### Pasul 4: Completarea Cererii

\`\`\`
FORMULAR ONRC - elemente cheie:

1. Date personale complete
2. Denumirea PFA
3. Sediul profesional
4. Activitatea (cod CAEN)
5. Data inceperii activitatii
6. Durata (nelimitata de obicei)
7. Specimenul de semnatura
\`\`\`

### Pasul 5: Depunerea Dosarului

\`\`\`
OPTIUNI DEPUNERE:

1. FIZIC la ONRC
   - Personal sau prin imputernicit
   - Program: L-V 8:30-15:00
   - Solutionare: 3-5 zile lucratoare

2. ONLINE prin portal.onrc.ro
   - Necesita semnatura electronica
   - Mai rapid (1-3 zile)
   - Aceleasi taxe
\`\`\`

---

## Dupa Inregistrare

### Ce primesti

\`\`\`
1. Certificat de Inregistrare
   - Contine CUI (Cod Unic de Identificare)
   - Dovada legalitatii activitatii

2. Extras RECOM
   - Toate datele PFA
   - Istoric modificari
\`\`\`

### Ce trebuie sa faci

\`\`\`typescript
const pasiiPostInregistrare = {
  imediat: [
    'Obtine semnatura electronica (pentru SPV)',
    'Inregistreaza-te in SPV (ANAF online)',
    'Deschide cont bancar business',
    'Alege sistem impozitare (norma/real)'
  ],

  primaSaptamana: [
    'Contracteaza contabil (recomandat)',
    'Seteaza facturare electronica',
    'Inregistreaza-te pentru TVA (daca e cazul)',
    'Pregateste contracte tip'
  ],

  primaLuna: [
    'Primele facturi emise',
    'Evidenta cheltuieli deductibile',
    'Verifica obligatii declarative',
    'Configureaza sistem pontaj/time tracking'
  ]
};
\`\`\`

---

## Alegerea Sistemului de Impozitare

### Norma de Venit vs Sistem Real

\`\`\`
NORMA DE VENIT:
- Impozit calculat pe venit forfetar stabilit de ANAF
- Nu conteaza cat castigi efectiv
- Avantaj daca venitul real > norma
- Dezavantaj daca venitul real < norma
- Nu poti deduce cheltuieli

SISTEM REAL:
- Impozit pe venitul efectiv net
- Venit net = Venituri - Cheltuieli deductibile
- Contabilitate mai complexa
- Avantajos daca ai cheltuieli mari

CONTRIBUTII:
Ambele sisteme:
- CAS 25% (daca venit > 12 salarii minime)
- CASS 10% (obligatoriu)
\`\`\`

### Calcul Comparativ

\`\`\`typescript
interface ComparatieFiscala {
  venitAnual: number;
  cheltuieliDeductibile: number;
  normaVenit: number;
}

function calculeazaOptimul(date: ComparatieFiscala): string {
  // Sistem real
  const venitNetReal = date.venitAnual - date.cheltuieliDeductibile;
  const impozitReal = venitNetReal * 0.10;
  const casReal = venitNetReal > 39600 ? venitNetReal * 0.25 : 0; // 12 salarii minime
  const cassReal = venitNetReal * 0.10;
  const totalReal = impozitReal + casReal + cassReal;

  // Norma de venit
  const impozitNorma = date.normaVenit * 0.10;
  const casNorma = date.normaVenit > 39600 ? date.normaVenit * 0.25 : 0;
  const cassNorma = date.normaVenit * 0.10;
  const totalNorma = impozitNorma + casNorma + cassNorma;

  if (totalReal < totalNorma) {
    return \`Sistem REAL mai avantajos: \${totalReal} vs \${totalNorma}\`;
  } else {
    return \`NORMA mai avantajoasa: \${totalNorma} vs \${totalReal}\`;
  }
}

// Exemplu:
// Venit: 100.000 RON, Cheltuieli: 30.000 RON, Norma: 50.000 RON
// Real: venit net 70.000, taxe ~31.500 RON
// Norma: taxe pe 50.000 = ~22.500 RON
// → Norma mai avantajoasa
\`\`\`

---

## Costurile Totale Estimate

### La Infiintare

\`\`\`
Taxa ONRC:               100-150 RON
Monitorul Oficial:        20 RON
Notariat (daca e cazul): 50-100 RON
Stampila (optional):      50-100 RON
Semnatura electronica:   100-300 RON
─────────────────────────────────────
TOTAL:                   320-670 RON
\`\`\`

### Lunar (estimativ)

\`\`\`
Contabilitate:           200-500 RON
Cont bancar:             0-50 RON
Facturare software:      0-100 RON
Sediu virtual (opt):     50-150 RON
─────────────────────────────────────
TOTAL:                   250-800 RON
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Identificati codul CAEN potrivit pentru activitatea dvs. si verificati daca necesita autorizatii speciale.

**Exercitiul 2:** Calculati impozitele pentru un venit de 80.000 RON/an, cheltuieli 20.000 RON, norma de venit 45.000 RON.

**Exercitiul 3:** Pregatiti toate documentele necesare pentru inregistrarea PFA.

---

*Lectia urmatoare: Taxe si Contributii pentru Freelanceri*`
    },
    {
      title: 'Taxe si Contributii pentru PFA - Calcul Complet',
      slug: 'taxe-contributii-pfa-calcul',
      type: 'TEXT' as const,
      duration: 50,
      order: 3,
      isFree: false,
      content: `# Taxe si Contributii pentru PFA 2025

## Impozitul pe Venit

### Cota de Impozitare

**Cota fixa: 10%** pe venitul net sau norma de venit

### Calculul Venitului Net

\`\`\`typescript
interface CalculVenitNet {
  venituriIncasate: number;
  cheltuieliDeductibile: number;
  contributiiPlatite: number; // CAS, CASS
}

function calculeazaVenitNet(date: CalculVenitNet): number {
  // Venit net = Venituri - Cheltuieli - Contributii
  return date.venituriIncasate
    - date.cheltuieliDeductibile
    - date.contributiiPlatite;
}

function calculeazaImpozit(venitNet: number): number {
  return venitNet * 0.10;
}
\`\`\`

---

## Contributii Sociale

### CAS (Contributia de Asigurari Sociale)

\`\`\`
COTA: 25%

CAND PLATESTI:
- Daca venitul net anual ESTIMAT > 12 salarii minime brute
- In 2024: 12 x 3.300 = 39.600 RON

BAZA DE CALCUL:
- Minim: 12 salarii minime
- Poti alege baza mai mare (pentru pensie mai mare)

CALCUL 2024:
- CAS minim = 39.600 x 25% = 9.900 RON/an
- Lunar: 825 RON
\`\`\`

### CASS (Contributia de Asigurari Sociale de Sanatate)

\`\`\`
COTA: 10%

CAND PLATESTI:
- OBLIGATORIU pentru toti
- Chiar daca venitul < 12 salarii minime

BAZA DE CALCUL 2024:
- Minim: 6 salarii minime = 19.800 RON
- Sau venitul realizat (daca > 6 salarii minime)

CALCUL:
- CASS minim = 19.800 x 10% = 1.980 RON/an
- Lunar: 165 RON
\`\`\`

---

## Scenarii Complete de Calcul

### Scenariul 1: Venit Mic (sub plafon CAS)

\`\`\`typescript
const scenariuVenitMic = {
  venitBrut: 30000, // RON/an
  cheltuieli: 5000,

  // Calcule
  venitNet: 25000,

  // CAS: NU platesti (sub 39.600)
  cas: 0,

  // CASS: Platesti minim
  cass: 1980, // 6 salarii minime x 10%

  // Venit impozabil
  venitImpozabil: 25000 - 1980, // = 23.020

  // Impozit
  impozit: 2302, // 10%

  // TOTAL TAXE
  totalTaxe: 4282, // CASS + Impozit

  // VENIT NET DUPA TAXE
  venitFinal: 25000 - 4282 // = 20.718 RON
};
\`\`\`

### Scenariul 2: Venit Mediu (peste plafon CAS)

\`\`\`typescript
const scenariuVenitMediu = {
  venitBrut: 100000, // RON/an
  cheltuieli: 20000,

  // Calcule
  venitNet: 80000,

  // CAS: Platesti (venit > 39.600)
  bazaCAS: 39600, // minim 12 salarii minime
  cas: 9900, // 25%

  // CASS: Pe venitul realizat
  bazaCASS: 80000,
  cass: 8000, // 10%

  // Venit impozabil
  venitImpozabil: 80000 - 9900 - 8000, // = 62.100

  // Impozit
  impozit: 6210, // 10%

  // TOTAL TAXE
  totalTaxe: 24110, // CAS + CASS + Impozit

  // VENIT NET DUPA TAXE
  venitFinal: 80000 - 24110, // = 55.890 RON

  // Rata efectiva taxare
  rataEfectiva: '30.1%'
};
\`\`\`

### Scenariul 3: Venit Mare

\`\`\`typescript
const scenariuVenitMare = {
  venitBrut: 250000, // RON/an
  cheltuieli: 50000,

  venitNet: 200000,

  // CAS: Platesti pe baza aleasa sau minim
  bazaCAS: 39600, // poti alege mai mult pentru pensie mai mare
  cas: 9900,

  // CASS: Pe venitul realizat
  bazaCASS: 200000,
  cass: 20000,

  venitImpozabil: 200000 - 9900 - 20000, // = 170.100
  impozit: 17010,

  totalTaxe: 46910,
  venitFinal: 153090,
  rataEfectiva: '23.5%'
};
\`\`\`

---

## Declaratii Fiscale

### Declaratia Unica (212)

\`\`\`
CE CONTINE:
- Estimari venituri anul curent
- Venituri realizate anul anterior
- Calcul contributii si impozit

TERMEN:
- 25 mai an curent (pentru estimari)
- Rectificativa daca estimarile se schimba >20%

CUM SE DEPUNE:
- Exclusiv online prin SPV
- Semnatura electronica necesara
\`\`\`

### Calendar Fiscal PFA

\`\`\`
IANUARIE:
□ Verificare obligatii anul trecut

MARTIE (15):
□ Depunere Declaratia 200 (pt drepturi autor)

MAI (25):
□ Declaratia Unica 212
□ Estimare venituri an curent
□ Definitivare an anterior

TRIMESTRIAL (25):
□ Plata contributii (daca optezi trimestrial)

DECEMBRIE:
□ Pregatire documente pentru anul urmator
□ Evaluare situatie fiscala
\`\`\`

---

## Cheltuieli Deductibile

### Ce poti deduce

\`\`\`typescript
const cheltuieliDeductibile = {
  directe: [
    'Materiale si consumabile',
    'Servicii de la terti (design, hosting, etc.)',
    'Abonamente software',
    'Echipamente (amortizate)',
    'Comisioane platforme'
  ],

  indirecte: [
    'Chirie birou (sau % din locuinta)',
    'Utilitati (proportional cu suprafata birou)',
    'Internet si telefon (% business)',
    'Transport pentru afaceri',
    'Cursuri si certificari profesionale'
  ],

  partialeductibile: {
    masina: 'Maxim 50% din cheltuieli',
    protocol: 'Maxim 2% din venituri',
    sponsorizari: 'Maxim 5% din impozit'
  },

  nedeductibile: [
    'Amenzi si penalitati',
    'Cheltuieli personale',
    'Imbracaminte (daca nu e uniforma)',
    'Cheltuieli fara documente justificative'
  ]
};
\`\`\`

### Documente Necesare

\`\`\`
OBLIGATORIU pentru deducere:
□ Factura fiscala SAU
□ Bon fiscal pentru sume mici
□ Contract (pentru servicii recurente)
□ Dovada platii (extras cont, chitanta)
□ Legatura cu activitatea economica
\`\`\`

---

## TVA pentru PFA

### Cand te inregistrezi

\`\`\`
OBLIGATORIU daca:
- Cifra de afaceri > 300.000 RON/an (prag 2024)
- Livrari intracomunitare

OPTIONAL daca:
- Sub prag, dar vrei sa recuperezi TVA
- Clienti mari care prefera furnizori platitori TVA

EXCEPTII:
- Servicii scutite (medicale, educationale)
- Livrari catre persoane fizice in UE
\`\`\`

### Implicatii TVA

\`\`\`
DACA ESTI PLATITOR TVA:
+ Recuperezi TVA de la furnizori
+ Credibilitate mai mare la clienti B2B
- Preturi +19% pentru clienti persoane fizice
- Declaratii lunare/trimestriale
- Contabilitate mai complexa

DACA NU ESTI PLATITOR:
+ Preturi mai mici pentru clienti finali
+ Administratie simplificata
- Nu recuperezi TVA la achizitii
- Unii clienti B2B evita non-platitorii
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Calculati taxele totale pentru:
- Venit brut: 120.000 RON/an
- Cheltuieli: 25.000 RON
- Alegeti baza CAS standard

**Exercitiul 2:** Listati toate cheltuielile deductibile pentru un freelancer IT care lucreaza de acasa.

**Exercitiul 3:** Decideti daca ar trebui sa va inregistrati pentru TVA avand venituri de 250.000 RON/an, clienti 80% B2B, cheltuieli cu echipamente 40.000 RON.

---

*Lectia urmatoare: Facturarea si Contractele pentru Freelanceri*`
    },
    {
      title: 'Facturarea si Contractele pentru Freelanceri',
      slug: 'facturare-contracte-freelanceri',
      type: 'TEXT' as const,
      duration: 45,
      order: 4,
      isFree: false,
      content: `# Facturarea si Contractele pentru Freelanceri

## Facturarea Profesionala

### Elementele Obligatorii ale Facturii

\`\`\`typescript
interface FacturaCompleta {
  // Antet
  serie: string;
  numar: number;
  dataEmiterii: Date;
  dataScadenta: Date;

  // Furnizor (TU)
  furnizor: {
    denumire: string; // ex: "Popescu Ion PFA"
    cui: string;
    regCom: string; // J40/12345/2024
    adresa: string;
    contBancar: string;
    banca: string;
  };

  // Client
  client: {
    denumire: string;
    cui?: string; // pt persoane juridice
    adresa: string;
  };

  // Servicii
  linii: {
    descriere: string;
    cantitate: number;
    unitateMasura: string;
    pretUnitar: number;
    valoare: number;
  }[];

  // Totaluri
  subtotal: number;
  tva: number; // 0 daca nu esti platitor
  total: number;
  moneda: 'RON' | 'EUR' | 'USD';

  // Mentiuni
  mentiuni: string[];
}
\`\`\`

### Model Factura

\`\`\`
══════════════════════════════════════════════════════════════════
                         FACTURA
══════════════════════════════════════════════════════════════════

Seria: DI  Numar: 0001          Data: 15.01.2025
                                 Scadenta: 30.01.2025

──────────────────────────────────────────────────────────────────
FURNIZOR                         CLIENT
──────────────────────────────────────────────────────────────────
POPESCU ION PFA                  SC CLIENT EXEMPLU SRL
CUI: 12345678                    CUI: RO87654321
Reg.Com: F40/1234/2024           Reg.Com: J40/5678/2020
Str. Exemplu 10, Bucuresti       Str. Test 20, Cluj-Napoca

Cont: RO12BACX0000001234567890
Banca: UniCredit Bank

──────────────────────────────────────────────────────────────────
Nr. │ Descriere servicii      │ UM   │ Cant. │ Pret/UM │ Valoare
──────────────────────────────────────────────────────────────────
 1  │ Dezvoltare website      │ ora  │  40   │ 150 RON │ 6.000 RON
    │ conform contract #123   │      │       │         │
 2  │ Consultanta tehnica     │ ora  │  10   │ 200 RON │ 2.000 RON
──────────────────────────────────────────────────────────────────
                                              Subtotal: 8.000 RON
                                                   TVA: 0 RON *
                                         ─────────────────────────
                                               TOTAL: 8.000 RON
══════════════════════════════════════════════════════════════════

* Neplatitor de TVA conform art. 310 Cod Fiscal

Termen de plata: 15 zile de la emitere
Penalitati intarziere: 0.1% pe zi

Semnatura furnizor: ____________

══════════════════════════════════════════════════════════════════
\`\`\`

---

## Software de Facturare

### Optiuni Populare

| Software | Pret | Puncte Forte |
|----------|------|--------------|
| SmartBill | 0-100 RON/luna | Popular, e-Factura |
| Facturis | 0-80 RON/luna | Simplu, gratuit basic |
| oblio | 0-50 RON/luna | Modern, API |
| FGO | Gratuit | De la ANAF, basic |
| invoicely | 0-30 USD/luna | International |

### Caracteristici de Cautat

\`\`\`
ESENTIAL:
□ Generare facturi conforme legislatiei RO
□ Export PDF si trimitere email
□ Evidenta clienti si produse/servicii
□ Rapoarte de venituri

AVANSAT:
□ Facturi recurente automate
□ Integrare e-Factura (SPV)
□ Multi-moneda
□ Time tracking integrat
□ API pentru automatizari
\`\`\`

---

## e-Factura pentru Freelanceri

### Cand e Obligatorie

\`\`\`
OBLIGATORIU (din 2024):
- Facturi catre institutii publice (B2G)
- Facturi catre mari contribuabili

OPTIONAL (in tranzitie):
- Facturi catre alte societati (B2B)
- Se extinde treptat

EXCEPTII:
- Facturi catre persoane fizice (B2C)
- Facturi sub anumite praguri
\`\`\`

### Procesul e-Factura

\`\`\`
1. Emiti factura in format XML (prin software)
2. Incarci in SPV (Spatiul Privat Virtual)
3. ANAF valideaza si atribuie cod unic
4. Clientul primeste factura prin SPV
5. Pastrezi confirmarea de incarcare
\`\`\`

---

## Contractele pentru Freelanceri

### Tipuri de Contracte

\`\`\`typescript
const tipuriContracte = {
  prestariFacut: {
    descriere: 'Cel mai comun pentru freelanceri',
    continut: 'Servicii specifice, livrabile, plata',
    durata: 'Per proiect sau perioada',
    exemplu: 'Dezvoltare website, consultanta lunara'
  },

  colaborare: {
    descriere: 'Relatie pe termen lung',
    continut: 'Servicii continue, retainer',
    durata: '6-12 luni tipic',
    exemplu: 'Mentenanta lunara, suport tehnic'
  },

  cesiuneDrepturi: {
    descriere: 'Transfer drepturi de autor',
    continut: 'Creatii, proprietate intelectuala',
    durata: 'Permanent sau licenta',
    exemplu: 'Logo, cod software, texte'
  },

  nda: {
    descriere: 'Confidentialitate',
    continut: 'Protectie informatii sensibile',
    durata: '2-5 ani tipic',
    exemplu: 'Acces la date clienti, strategii'
  }
};
\`\`\`

### Clauzele Esentiale

\`\`\`typescript
interface ClauzeContract {
  identificareParti: {
    prestator: DatelePFA;
    beneficiar: DateClient;
  };

  obiectContract: {
    descriereServicii: string;
    livrabile: string[];
    criteriiacceptanta: string[];
  };

  durata: {
    dataInceput: Date;
    dataSfarsit: Date;
    conditiiPrelungire: string;
    conditiiReziliere: string;
  };

  pret: {
    valoare: number;
    moneda: string;
    modalitateCalcul: 'fix' | 'orar' | 'procent';
    conditiiPlata: string;
    termenPlata: number; // zile
    penalitatiIntarziere: number; // %/zi
  };

  obligatiiPrestator: string[];
  obligatiiBeneficiar: string[];

  proprietateIntelectuala: {
    dreptAutor: 'prestator' | 'beneficiar' | 'comun';
    licenta: string;
    restrictii: string[];
  };

  confidentialitate: {
    durata: number; // ani
    exceptii: string[];
    penalitati: string;
  };

  raspundere: {
    limitaRaspundere: number;
    asigurare: boolean;
    excluderi: string[];
  };

  forjMajor: string;
  legAplicabila: string;
  solutionareLitigii: 'mediere' | 'arbitraj' | 'instanta';
}
\`\`\`

---

## Model Contract Prestari Servicii

\`\`\`
══════════════════════════════════════════════════════════════════
         CONTRACT DE PRESTARI SERVICII
              Nr. ___/___.___.2025
══════════════════════════════════════════════════════════════════

CAP. I - PARTILE CONTRACTANTE

1.1 PRESTATOR:
POPESCU ION PFA, cu sediul in Bucuresti, str. Exemplu nr. 10,
CUI 12345678, Reg.Com. F40/1234/2024, cont bancar
RO12BACX0000001234567890, reprezentat prin Popescu Ion

1.2 BENEFICIAR:
SC CLIENT SRL, cu sediul in Cluj-Napoca, str. Test nr. 20,
CUI RO87654321, Reg.Com. J12/5678/2020,
reprezentat prin Director General Maria Ionescu

──────────────────────────────────────────────────────────────────
CAP. II - OBIECTUL CONTRACTULUI

2.1 Prestatorul se obliga sa furnizeze Beneficiarului urmatoarele
servicii:
- Dezvoltare aplicatie web conform specificatiilor din Anexa 1
- Documentatie tehnica
- Training utilizatori (8 ore)

2.2 Livrabilele agreate:
- Codul sursa functional
- Documentatie tehnica si utilizator
- Sesiuni training inregistrate

──────────────────────────────────────────────────────────────────
CAP. III - DURATA

3.1 Contractul intra in vigoare la data semnarii si este valabil
pana la livrarea finala, estimata pentru 15.03.2025.

3.2 Contractul poate fi prelungit prin act aditional.

──────────────────────────────────────────────────────────────────
CAP. IV - PRETUL SI MODALITATEA DE PLATA

4.1 Pretul total: 15.000 RON (neplatitor TVA)

4.2 Esalonare plati:
- 30% avans la semnare: 4.500 RON
- 40% la livrare partiala (milestone 1): 6.000 RON
- 30% la acceptanta finala: 4.500 RON

4.3 Termen de plata: 15 zile de la emiterea facturii

4.4 Penalitati intarziere: 0.1% pe zi, maxim 10% din valoare

──────────────────────────────────────────────────────────────────
CAP. V - OBLIGATIILE PARTILOR

5.1 Prestatorul se obliga:
- Sa livreze serviciile conform specificatiilor
- Sa respecte termenele agreate
- Sa pastreze confidentialitatea informatiilor
- Sa acorde suport 30 zile post-livrare

5.2 Beneficiarul se obliga:
- Sa furnizeze informatiile necesare la timp
- Sa plateasca facturile in termen
- Sa ofere feedback in 5 zile de la livrare

──────────────────────────────────────────────────────────────────
CAP. VI - PROPRIETATE INTELECTUALA

6.1 Drepturile de autor asupra livrabileelor se transfera
Beneficiarului la plata integrala.

6.2 Prestatorul pastreaza dreptul de a mentiona proiectul
in portofoliu, fara a dezvalui informatii confidentiale.

──────────────────────────────────────────────────────────────────
CAP. VII - CONFIDENTIALITATE

7.1 Partile se obliga sa pastreze confidentialitatea tuturor
informatiilor obtinute pe durata contractului, timp de 2 ani.

──────────────────────────────────────────────────────────────────
CAP. VIII - RASPUNDEREA

8.1 Raspunderea Prestatorului este limitata la valoarea
contractului.

8.2 Prestatorul nu raspunde pentru daune indirecte sau
pierderi de profit.

──────────────────────────────────────────────────────────────────
CAP. IX - INCETAREA CONTRACTULUI

9.1 Contractul inceteaza:
- La finalizarea si acceptarea lucrarilor
- Prin acordul partilor
- Prin reziliere pentru neexecutare (preaviz 30 zile)

──────────────────────────────────────────────────────────────────
CAP. X - DISPOZITII FINALE

10.1 Legea aplicabila: legislatia Romaniei
10.2 Litigiile se solutioneaza pe cale amiabila, iar in caz
de esec, de instantele competente din Bucuresti.
10.3 Anexele fac parte integranta din contract.

Incheiat in 2 exemplare originale, cate unul pentru fiecare parte.

PRESTATOR                         BENEFICIAR
_______________                   _______________
Data: ___________                 Data: ___________
══════════════════════════════════════════════════════════════════
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Creati o factura completa pentru 30 ore de consultanta la 100 EUR/ora.

**Exercitiul 2:** Adaptati modelul de contract pentru un proiect de design (logo + identitate vizuala).

**Exercitiul 3:** Identificati 5 clauze care lipsesc din contractul de mai sus si propuneti text.

---

*Urmatorul modul: Gasirea Clientilor si Marketing Personal*`
    }
  ]
};
