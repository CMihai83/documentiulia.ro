// HR/Payroll Romania - Module 2: Salarizare si Contributii
// Elite-level comprehensive content

export const hrModule2 = {
  title: 'Salarizare Practica si Calculul Contributiilor',
  description: 'Calculul complet al salariilor, contributiilor si declaratiilor fiscale',
  order: 2,
  lessons: [
    {
      title: 'Concedii si Absente - Tipuri, Drepturi si Calcul',
      slug: 'concedii-absente-tipuri-calcul',
      type: 'TEXT' as const,
      duration: 55,
      order: 1,
      isFree: false,
      content: `# Concedii si Absente in Romania - Ghid Complet

## Concediul de Odihna

### Dreptul la Concediu

**Minim legal:** 20 zile lucratoare/an

**Conditii de acordare:**
- Proportional cu timpul lucrat (pentru anul partial)
- Nu poate fi cedat sau compensat in bani (exceptie incetare CIM)
- Se planifica la inceputul anului

### Calcul Zile Concediu

\`\`\`typescript
function calculeazaZileConcediu(
  zileTotaleAn: number,
  luniLucrate: number,
  contractNormaIntreaga: boolean
): number {
  if (!contractNormaIntreaga) {
    // Pentru timp partial, se acorda proportional
    return Math.floor((zileTotaleAn * luniLucrate) / 12);
  }
  return Math.floor((zileTotaleAn * luniLucrate) / 12);
}

// Exemplu: 25 zile/an, angajat din iulie
const zile = calculeazaZileConcediu(25, 6, true); // = 12 zile
\`\`\`

### Indemnizatia de Concediu

**Baza de calcul:** Media veniturilor din ultimele 3 luni anterioare

\`\`\`typescript
interface CalculIndemnizatieCO {
  venituriLuna1: number;
  venituriLuna2: number;
  venituriLuna3: number;
  zileLucratoreLuna1: number;
  zileLucratoreLuna2: number;
  zileLucratoreLuna3: number;
}

function calculeazaIndemnizatieCO(date: CalculIndemnizatieCO, zileCO: number): number {
  const totalVenituri = date.venituriLuna1 + date.venituriLuna2 + date.venituriLuna3;
  const totalZile = date.zileLucratoreLuna1 + date.zileLucratoreLuna2 + date.zileLucratoreLuna3;
  const mediaZilnica = totalVenituri / totalZile;
  return mediaZilnica * zileCO;
}
\`\`\`

### Programarea Concediului

**Reguli:**
- Se stabileste pana la sfarsitul anului pentru anul urmator
- Minim 10 zile consecutive obligatoriu
- Fractiuni restante: pana la 18 luni

---

## Concediul Medical (Incapacitate Temporara de Munca)

### Tipuri de Concediu Medical

| Tip | Durata maxima | Platitor |
|-----|---------------|----------|
| Boala obisnuita | 183 zile/an | Angajator (5 zile) + CNAS |
| Accident de munca | 180 zile | Angajator (3 zile) + CNAS |
| Boala profesionala | 180 zile | CNAS integral |
| Urgenta medico-chirurgicala | 90 zile | CNAS integral |
| TBC, SIDA, cancer | Fara limita | CNAS integral |

### Calcul Indemnizatie

\`\`\`typescript
interface CalculCM {
  venituriUltimele6Luni: number[];
  tipCM: 'BOALA' | 'ACCIDENT_MUNCA' | 'MATERNITATE' | 'INGRIJIRE_COPIL';
  zileCM: number;
}

function calculeazaIndemnizatieCM(date: CalculCM): {
  mediaZilnica: number;
  procent: number;
  indemnizatie: number;
} {
  // Baza: media veniturilor din ultimele 6 luni
  const medie = date.venituriUltimele6Luni.reduce((a, b) => a + b, 0) / 6;
  const mediaZilnica = medie / 22; // zile standard luna

  // Procentul depinde de tipul CM
  let procent: number;
  switch (date.tipCM) {
    case 'BOALA':
      procent = 75;
      break;
    case 'ACCIDENT_MUNCA':
    case 'MATERNITATE':
      procent = 85;
      break;
    case 'INGRIJIRE_COPIL':
      procent = 85;
      break;
    default:
      procent = 75;
  }

  const indemnizatie = (mediaZilnica * procent / 100) * date.zileCM;

  return { mediaZilnica, procent, indemnizatie };
}
\`\`\`

### Documente Necesare

1. **Certificat medical** - formular tipizat
2. **Cod diagnostic** (CIM-10)
3. **Cod indemnizatie** (01-15)
4. **Cod urgenta** (daca e cazul)

### Stagiul Minim de Cotizare

- **Boala obisnuita**: 6 luni in ultimele 12
- **Accident munca/boala profesionala**: fara stagiu
- **Maternitate**: 6 luni in ultimele 12
- **Ingrijire copil bolnav**: 6 luni in ultimele 12

---

## Concediul de Maternitate

### Durata si Structura

**Total: 126 zile calendaristice**
- **Prenatal**: 63 zile (obligatoriu minim 42)
- **Postnatal**: 63 zile (obligatoriu minim 42)

### Indemnizatia de Maternitate

- **85%** din media veniturilor ultimelor 6 luni
- Platita integral de CNAS
- Nu se retine impozit pe venit

\`\`\`typescript
function calculeazaIndemMaternitate(
  venituriUltimele6Luni: number[],
  zileMaternitate: number = 126
): number {
  const medie = venituriUltimele6Luni.reduce((a, b) => a + b, 0) / 6;
  const mediaZilnica = medie / 30; // zile calendaristice
  return mediaZilnica * 0.85 * zileMaternitate;
}
\`\`\`

### Drepturi Speciale

- Interdictie concediere
- Reintegrare pe acelasi post
- Ore pentru alaptare (2 ore/zi pana la 1 an)

---

## Concediul pentru Cresterea Copilului

### Durata si Optiuni

| Optiune | Durata | Indemnizatie |
|---------|--------|--------------|
| Standard | Pana la 2 ani | 85% din media veniturilor |
| Cu stimulent | Pana la 1 an | 85% + 1.500 RON stimulent |
| Copil cu handicap | Pana la 3 ani | 85% din media veniturilor |

### Indemnizatia

- **Minim**: 2.500 RON (2024)
- **Maxim**: 8.500 RON (2024)
- **85%** din media veniturilor nete din ultimele 12 luni

\`\`\`typescript
function calculeazaCCC(
  venituriNete12Luni: number[],
  copilHandicap: boolean = false
): {
  durata: number;
  indemnizatieLunara: number;
} {
  const medie = venituriNete12Luni.reduce((a, b) => a + b, 0) / 12;
  let indemnizatie = medie * 0.85;

  // Plafoane
  const minim = 2500;
  const maxim = 8500;
  indemnizatie = Math.max(minim, Math.min(maxim, indemnizatie));

  return {
    durata: copilHandicap ? 36 : 24, // luni
    indemnizatieLunara: Math.round(indemnizatie)
  };
}
\`\`\`

### Stimulent de Insertie

**Conditii:**
- Revenire la munca inainte de 2 ani
- Mentinerea activitatii minim 60 zile

**Valoare:** 1.500 RON/luna pana la 2 ani copil

---

## Concediul Paternal

### Drepturi

- **5 zile lucratoare** - acordate la cerere
- **+10 zile** daca tatal a urmat curs de puericultura

### Conditii

- Cerere in primele 8 saptamani de la nastere
- Plata integrala de catre angajator
- Nu afecteaza concediul de odihna

---

## Concediu pentru Evenimente Familiale

### Zile Platite (conform Codului Muncii)

| Eveniment | Zile |
|-----------|------|
| Casatoria salariatului | 5 |
| Casatoria copilului | 2 |
| Nastere copil | 5 + 10 (paternal) |
| Deces sot/copil/parinte | 3 |
| Deces bunici/frati/socri | 1 |
| Donare sange | 1 |
| Schimbare loc munca in alta localitate | 5 |

---

## Absente si Suspendari

### Tipuri de Suspendare CIM

**De drept:**
- Concediu maternitate
- Incapacitate temporara
- Carantina
- Forta majora
- Arest preventiv (max 30 zile)

**La initiativa salariatului:**
- Concediu crestere copil
- Concediu pentru formare profesionala
- Concediu fara plata

**La initiativa angajatorului:**
- Intreruperea activitatii (fara culpa salariatului)
- Detasarea
- Sanctiune disciplinara (suspendare)

### Indemnizatia pe Timpul Suspendarii

\`\`\`typescript
interface SuspendreCIM {
  tip: 'FORTA_MAJORA' | 'INTRERUPERE_ACTIVITATE' | 'FARA_PLATA';
  durataZile: number;
  salariuBaza: number;
}

function calculeazaIndemnizatieSuspendare(s: SuspendreCIM): number {
  switch (s.tip) {
    case 'FORTA_MAJORA':
      return (s.salariuBaza / 22) * s.durataZile * 0.75; // 75%
    case 'INTRERUPERE_ACTIVITATE':
      return (s.salariuBaza / 22) * s.durataZile * 0.75; // 75% minim
    case 'FARA_PLATA':
      return 0;
    default:
      return 0;
  }
}
\`\`\`

---

## Pontaj si Evidenta Prezentei

### Documente Obligatorii

1. **Condica de prezenta** sau sistem electronic
2. **Pontaj lunar** - zile lucrate, absente, ore suplimentare
3. **Cereri absente** semnate

### Model Pontaj

\`\`\`
PONTAJ LUNA: Ianuarie 2024
Salariat: Popescu Ion
Departament: IT

Zi | L | M | M | J | V | S | D | Status
---|---|---|---|---|---|---|---|-------
1  |   |   |   |   |   |   | - | Sarbatoare
2  | 8 |   |   |   |   |   |   | Prezent
3  |   | 8 |   |   |   |   |   | Prezent
...
15 |   |   | C | C | C |   |   | Concediu odihna

TOTAL: 20 zile lucratoare
Prezent: 17 zile
CO: 3 zile
CM: 0 zile
Ore suplimentare: 4 ore
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Calculati indemnizatia de concediu de odihna pentru un salariat cu:
- Salariu brut: 5.500 RON constant ultimele 3 luni
- Zile concediu: 12 zile
- Zile lucratoare/luna: 22

**Exercitiul 2:** Determinati indemnizatia de maternitate pentru o angajata cu venituri:
- Ultimele 6 luni: 4.200, 4.500, 4.300, 4.400, 4.600, 4.500 RON

**Exercitiul 3:** Simulati pontajul complet pentru o luna cu:
- 22 zile lucratoare
- 3 zile concediu odihna
- 5 zile concediu medical

---

*Lectia urmatoare: Contributii Sociale - CAS, CASS, CAM*`
    },
    {
      title: 'Contributii Sociale - CAS, CASS, CAM Detaliat',
      slug: 'contributii-sociale-cas-cass-cam',
      type: 'TEXT' as const,
      duration: 50,
      order: 2,
      isFree: false,
      content: `# Contributii Sociale in Romania 2024-2025

## Sistemul de Contributii Sociale

### Structura Generala

Romania are un sistem de contributii sociale care finanteaza:
- **Pensiile publice** (CAS)
- **Sistemul de sanatate** (CASS)
- **Somajul si accidentele de munca** (CAM)

---

## CAS - Contributia de Asigurari Sociale

### Cota si Baza de Calcul

**Cota 2024:** 25% (suportata de salariat)

**Baza de calcul:**
- Toate veniturile brute din salarii
- Inclusiv sporuri si bonusuri

**Plafonare:**
- Pentru venituri peste 12 salarii minime/luna: contribuții la maxim 12 salarii minime brute

\`\`\`typescript
interface CalculCAS {
  venitBrut: number;
  salariuMinim: number;
}

function calculeazaCAS(date: CalculCAS): number {
  const plafon = date.salariuMinim * 12;
  const bazaCAS = Math.min(date.venitBrut, plafon);
  return bazaCAS * 0.25;
}

// Exemplu 2024:
const cas = calculeazaCAS({ venitBrut: 50000, salariuMinim: 3300 });
// Plafon: 39.600 RON
// CAS: 9.900 RON (nu 12.500 RON)
\`\`\`

### Drepturi Obtinute prin CAS

1. **Pensia pentru limita de varsta**
2. **Pensia anticipata**
3. **Pensia de invaliditate**
4. **Pensia de urmas**
5. **Indemnizatii de maternitate**
6. **Indemnizatii pentru incapacitate de munca**

### Stagiul de Cotizare

| Tip pensie | Stagiu minim |
|------------|--------------|
| Limita de varsta | 15 ani (minim), 35 ani (complet) |
| Anticipata | 35 ani |
| Invaliditate gr. I-II | 1/3 din stagiu normal |

---

## CASS - Contributia de Asigurari Sociale de Sanatate

### Cota si Baza

**Cota 2024:** 10% (suportata de salariat)

**Baza de calcul:**
- Toate veniturile brute
- FARA plafonare

\`\`\`typescript
function calculeazaCASS(venitBrut: number): number {
  return venitBrut * 0.10;
}
\`\`\`

### Categorii Scutite de CASS

- Persoane cu handicap grav/accentuat
- Pensionari cu pensie sub un anumit prag
- Beneficiari de ajutor social
- Persoane private de libertate

### Drepturi din CASS

1. **Servicii medicale** in sistemul public
2. **Medicamente compensate**
3. **Dispozitive medicale**
4. **Concedii medicale** (indemnizatii)
5. **Tratamente in strainatate** (in anumite conditii)

---

## CAM - Contributia Asiguratorie pentru Munca

### Cota si Platitor

**Cota 2024:** 2.25% (suportata de ANGAJATOR)

**Finanteaza:**
- Fondul de somaj
- Fondul pentru accidente de munca
- Fondul de garantare a creantelor salariale

\`\`\`typescript
function calculeazaCAM(fondSalariiBrut: number): number {
  return fondSalariiBrut * 0.0225;
}

// Cost angajator pentru salariat cu brut 5.000 RON
const cam = calculeazaCAM(5000); // = 112.50 RON
\`\`\`

### Drepturi din CAM

1. **Indemnizatie de somaj**
2. **Plati compensatorii pentru disponibilizari**
3. **Despagubiri pentru accidente de munca**
4. **Garantarea creantelor salariale** (la insolventa)

---

## Calculul Complet Contributii

### Exemplu Detaliat

\`\`\`typescript
interface SituatieSalariat {
  salariuBazaBrut: number;
  sporuri: number;
  bonusuri: number;
  ticheteMasa: number;
  salariuMinim: number;
}

interface RezultatCalculContributii {
  totalBrut: number;
  cas: number;
  cass: number;
  totalContributiiSalariat: number;
  cam: number;
  costTotalAngajator: number;
}

function calculeazaContributii(s: SituatieSalariat): RezultatCalculContributii {
  const totalBrut = s.salariuBazaBrut + s.sporuri + s.bonusuri;

  // CAS cu plafonare
  const plafonCAS = s.salariuMinim * 12;
  const bazaCAS = Math.min(totalBrut, plafonCAS);
  const cas = bazaCAS * 0.25;

  // CASS fara plafonare
  const cass = totalBrut * 0.10;

  // CAM platit de angajator
  const cam = totalBrut * 0.0225;

  return {
    totalBrut,
    cas: Math.round(cas * 100) / 100,
    cass: Math.round(cass * 100) / 100,
    totalContributiiSalariat: Math.round((cas + cass) * 100) / 100,
    cam: Math.round(cam * 100) / 100,
    costTotalAngajator: Math.round((totalBrut + cam + s.ticheteMasa) * 100) / 100
  };
}

// Exemplu practic
const rezultat = calculeazaContributii({
  salariuBazaBrut: 6000,
  sporuri: 600, // 10% vechime
  bonusuri: 400,
  ticheteMasa: 880,
  salariuMinim: 3300
});

/*
Rezultat:
- Total brut: 7.000 RON
- CAS: 1.750 RON (25%)
- CASS: 700 RON (10%)
- Total retineri salariat: 2.450 RON
- CAM angajator: 157.50 RON
- Cost total angajator: 8.037.50 RON
*/
\`\`\`

---

## Situatii Speciale

### Contracte Timp Partial

- Contributiile se calculeaza la venitul efectiv
- CAS: baza minima = salariul minim proportional cu fractia de norma

### Cumul Contracte

\`\`\`
Salariat cu 2 CIM-uri:
- CIM 1: 4.000 RON brut → CAS 1.000, CASS 400
- CIM 2: 3.000 RON brut → CAS 750, CASS 300

Total contributii: CAS 1.750, CASS 700
Plafonare CAS: se aplica la angajatorul principal
\`\`\`

### Pensionari Reangajati

- Platesc CAS si CASS integral
- Nu beneficiaza de stagiu suplimentar de cotizare (exceptie: pot opta pentru recalculare)

### Detasare in UE

**Formularul A1:**
- Mentine afilierea la sistemul roman
- Durata maxima: 24 luni
- Prelungire posibila cu acord

---

## Declaratia 112

### Ce se Declara

| Camp | Descriere |
|------|-----------|
| Venituri brute | Total fond salarii |
| CAS | 25% din brut |
| CASS | 10% din brut |
| Impozit | 10% din baza impozabila |
| CAM | 2.25% angajator |

### Termene

- **Depunere:** pana pe 25 ale lunii urmatoare
- **Plata:** pana pe 25 ale lunii urmatoare
- **Rectificative:** pana la termenul de prescriptie (5 ani)

### Penalitati

| Intarziere | Penalitate |
|------------|------------|
| 1-30 zile | 0.01%/zi din suma datorata |
| 31-60 zile | 0.02%/zi |
| 60+ zile | 0.03%/zi + executare silita |

---

## Optimizare Legala a Contributiilor

### Beneficii Neimpozabile

| Beneficiu | Limita | Scutiri |
|-----------|--------|---------|
| Tichete masa | 40 RON/zi | CAS, CASS, impozit |
| Tichete vacanta | 1.600 RON/an | CAS, CASS, impozit |
| Asigurari sanatate | 400 EUR/an | CAS, CASS, impozit |
| Abonament sport | 400 RON/luna | CAS, CASS, impozit |

### Strategii de Pachet Salarial

\`\`\`
Varianta A - Tot in salariu brut:
Brut: 7.000 RON
Net: ~4.400 RON
Cost angajator: 7.157.50 RON

Varianta B - Cu beneficii:
Brut: 5.500 RON
Tichete masa: 880 RON
Net: ~3.560 RON + 880 = 4.440 RON
Cost angajator: 5.500 + 123.75 + 880 = 6.503.75 RON

Economie angajator: 653.75 RON/luna
Beneficiu net similar pentru salariat
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Calculati toate contributiile pentru:
- Salariat IT, brut 12.000 RON
- Spor vechime 15%
- Tichete masa 40 RON/zi (22 zile)

**Exercitiul 2:** Comparati costul total angajator pentru doua variante de pachet salarial cu acelasi beneficiu net pentru salariat.

**Exercitiul 3:** Completati Declaratia 112 pentru o firma cu 5 salariati.

---

*Lectia urmatoare: Declaratia 112 si Declaratia 205 - Pas cu Pas*`
    },
    {
      title: 'Declaratia 112 si 205 - Ghid Pas cu Pas',
      slug: 'declaratia-112-205-ghid',
      type: 'TEXT' as const,
      duration: 55,
      order: 3,
      isFree: false,
      content: `# Declaratiile Fiscale 112 si 205 - Ghid Complet

## Declaratia 112

### Ce este Declaratia 112?

Declaratia 112 este principala declaratie fiscala lunara pentru angajatori, care cuprinde:
- **Contributii sociale** (CAS, CASS)
- **Impozit pe venit** din salarii
- **CAM** (contributia angajatorului)

### Cine Depune?

- Persoane juridice cu salariati
- PFA/II/IF cu salariati
- Asociatii, fundatii, alte entitati cu angajati

### Termen de Depunere

**25 ale lunii urmatoare** pentru luna de referinta

Exceptii:
- Angajatorii cu sub 3 salariati: pot opta pentru depunere trimestriala

---

## Structura Declaratiei 112

### Sectiunea A - Date Angajator

\`\`\`
- CUI/CNP angajator
- Denumire/Nume
- Adresa sediu social
- Telefon, email
- Numar total salariati
- Tip entitate (persoana juridica, PFA etc.)
\`\`\`

### Sectiunea B - Sumar Contributii

\`\`\`typescript
interface Sumar112 {
  totalVenituriBrute: number;
  totalCAS: number;
  totalCASS: number;
  totalImpozit: number;
  totalCAM: number;
  totalDePlata: number;
}

function calculeazaSumar(salariati: Salariat[]): Sumar112 {
  let sumar: Sumar112 = {
    totalVenituriBrute: 0,
    totalCAS: 0,
    totalCASS: 0,
    totalImpozit: 0,
    totalCAM: 0,
    totalDePlata: 0
  };

  salariati.forEach(s => {
    sumar.totalVenituriBrute += s.brutTotal;
    sumar.totalCAS += s.cas;
    sumar.totalCASS += s.cass;
    sumar.totalImpozit += s.impozit;
    sumar.totalCAM += s.brutTotal * 0.0225;
  });

  sumar.totalDePlata = sumar.totalCAS + sumar.totalCASS +
                       sumar.totalImpozit + sumar.totalCAM;
  return sumar;
}
\`\`\`

### Sectiunea C - Detalii per Salariat

Pentru fiecare salariat:

| Camp | Descriere |
|------|-----------|
| CNP | Cod numeric personal |
| Nume, Prenume | Date identificare |
| Tip contract | CIM/conventie |
| Venit brut | Suma totala |
| CAS | 25% |
| CASS | 10% |
| Deducere personala | Conform tabel |
| Baza impozabila | Brut - CAS - CASS - Deducere |
| Impozit | 10% din baza |

---

## Completare Declaratia 112

### Pasul 1: Pregatire Date

\`\`\`typescript
interface DateSalariat112 {
  cnp: string;
  nume: string;
  prenume: string;
  functie: string;
  tipContract: 'CIM' | 'CONVENTIE';
  norma: 'INTREAGA' | 'PARTIALA';

  venituri: {
    salariuBaza: number;
    sporuri: number;
    bonusuri: number;
    oreSuplimentare: number;
    indemnizatieCO: number;
  };

  zile: {
    lucrate: number;
    concediuOdihna: number;
    concediuMedical: number;
    alteleNeplatite: number;
  };

  deducerePersonala: number;
  persoaneinIntretinere: number;
}
\`\`\`

### Pasul 2: Calcul Individual

\`\`\`typescript
function calculeaza112Individual(s: DateSalariat112): Calcul112 {
  // Total brut
  const brut = s.venituri.salariuBaza + s.venituri.sporuri +
               s.venituri.bonusuri + s.venituri.oreSuplimentare +
               s.venituri.indemnizatieCO;

  // Contributii
  const cas = brut * 0.25;
  const cass = brut * 0.10;

  // Deducere personala (cu persoane in intretinere)
  let deducere = s.deducerePersonala;
  deducere += s.persoaneinIntretinere * 100;

  // Baza impozabila
  const bazaImpozabila = Math.max(0, brut - cas - cass - deducere);

  // Impozit
  const impozit = bazaImpozabila * 0.10;

  return {
    brut: Math.round(brut * 100) / 100,
    cas: Math.round(cas * 100) / 100,
    cass: Math.round(cass * 100) / 100,
    deducere,
    bazaImpozabila: Math.round(bazaImpozabila * 100) / 100,
    impozit: Math.round(impozit * 100) / 100,
    net: Math.round((brut - cas - cass - impozit) * 100) / 100
  };
}
\`\`\`

### Pasul 3: Generare XML

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<declaratie112 xmlns="mfp:anaf:dgti:d112:declaratie:v1">
  <lunaR>01</lunaR>
  <anR>2024</anR>

  <angajator>
    <cui>12345678</cui>
    <den>SC Example SRL</den>
    <jud>CJ</jud>
    <localit>Cluj-Napoca</localit>
  </angajator>

  <totalPlata>
    <cas>15000.00</cas>
    <cass>6000.00</cass>
    <impozit>4500.00</impozit>
    <cam>1350.00</cam>
    <total>26850.00</total>
  </totalPlata>

  <angajati>
    <angajat>
      <cnp>1850101123456</cnp>
      <nume>POPESCU</nume>
      <prenume>ION</prenume>
      <brutRealizat>5000.00</brutRealizat>
      <cas>1250.00</cas>
      <cass>500.00</cass>
      <deducere>400.00</deducere>
      <impozit>285.00</impozit>
    </angajat>
    <!-- Mai multi angajati -->
  </angajati>
</declaratie112>
\`\`\`

---

## Declaratia 205

### Ce este Declaratia 205?

Declaratia informativa anuala privind:
- Impozitul retinut la sursa
- Veniturile platite catre persoane fizice
- Contributiile retinute

### Cine Depune?

Toti platitorii de venituri din:
- Salarii si asimilate
- Drepturi de proprietate intelectuala
- Dividende
- Alte venituri

### Termen de Depunere

**Ultima zi a lunii februarie** pentru anul anterior

---

## Structura Declaratiei 205

### Tipuri de Venituri Declarate

| Cod | Tip Venit |
|-----|-----------|
| SAL | Salarii |
| DPI | Drepturi proprietate intelectuala |
| DIV | Dividende |
| LOC | Venituri din inchirieri |
| JOC | Venituri din jocuri de noroc |

### Date per Beneficiar

\`\`\`typescript
interface Beneficiar205 {
  cnp: string;
  nume: string;
  prenume: string;
  adresa: string;

  venituri: {
    tipVenit: string;
    venitBrutAnual: number;
    contributiiRetinute: number;
    impozitRetinut: number;
    venitNetAnual: number;
  }[];
}
\`\`\`

---

## Reconciliere 112 vs 205

### Verificare Consistenta

\`\`\`typescript
function verificaReconciliere(
  declaratii112: Declaratie112[],
  declaratie205: Declaratie205
): RezultatVerificare {
  // Total din D112 lunare
  const totalBrut112 = declaratii112.reduce(
    (sum, d) => sum + d.totalVenituriBrute, 0
  );
  const totalImpozit112 = declaratii112.reduce(
    (sum, d) => sum + d.totalImpozit, 0
  );

  // Total din D205 anuala
  const totalBrut205 = declaratie205.beneficiari.reduce(
    (sum, b) => sum + b.venituri.reduce((s, v) => s + v.venitBrutAnual, 0), 0
  );
  const totalImpozit205 = declaratie205.beneficiari.reduce(
    (sum, b) => sum + b.venituri.reduce((s, v) => s + v.impozitRetinut, 0), 0
  );

  return {
    brutOK: Math.abs(totalBrut112 - totalBrut205) < 0.01,
    impozitOK: Math.abs(totalImpozit112 - totalImpozit205) < 0.01,
    diferentaBrut: totalBrut112 - totalBrut205,
    diferentaImpozit: totalImpozit112 - totalImpozit205
  };
}
\`\`\`

---

## Greseli Frecvente si Solutii

### Declaratia 112

| Greseala | Solutie |
|----------|---------|
| CNP gresit | Rectificativa + verificare REVISAL |
| Suma gresita | Rectificativa |
| Depunere cu intarziere | Plata penalitati |
| Neincludere salariat | Rectificativa + verificare REVISAL |

### Declaratia 205

| Greseala | Solutie |
|----------|---------|
| Neconcordanta cu D112 | Verificare luna cu luna |
| Beneficiar omis | Rectificativa |
| Tip venit gresit | Rectificativa |

---

## Automatizare cu Software HR

### Fluxul de Lucru Automatizat

\`\`\`typescript
class GeneratorDeclaratii {
  async genereazaD112(luna: number, an: number): Promise<string> {
    // 1. Extrage date din pontaj
    const pontaje = await this.getPontaje(luna, an);

    // 2. Calculeaza salarii
    const salarii = await this.calculeazaSalarii(pontaje);

    // 3. Genereaza XML
    const xml = this.genereazaXML112(salarii);

    // 4. Valideaza conform schema ANAF
    await this.valideazaXML(xml, 'D112_schema.xsd');

    // 5. Returneaza pentru semnare si transmitere
    return xml;
  }

  async genereazaD205(an: number): Promise<string> {
    // Agregheaza toate D112 din an
    const declaratii112 = await this.getDeclaratii112(an);

    // Grupeaza per beneficiar
    const beneficiari = this.grupeazaPerBeneficiar(declaratii112);

    // Genereaza XML
    return this.genereazaXML205(beneficiari);
  }
}
\`\`\`

---

## Checklist Depunere

### Inainte de D112

- [ ] Pontaje complete pentru toti salariatii
- [ ] State de plata verificate
- [ ] Concedii medicale inregistrate
- [ ] Modificari REVISAL transmise
- [ ] Reconciliere cu contabilitatea

### Inainte de D205

- [ ] Toate D112 lunare depuse
- [ ] Rectificative D112 (daca e cazul)
- [ ] Verificare sume anuale per beneficiar
- [ ] Reconciliere D112 vs D205
- [ ] Backup documentatie

---

## Exercitii Practice

**Exercitiul 1:** Completati manual D112 pentru o firma cu 3 salariati:
- Salariat 1: brut 4.500 RON, 1 persoana in intretinere
- Salariat 2: brut 6.000 RON, 0 persoane in intretinere
- Salariat 3: brut 3.300 RON, 2 persoane in intretinere

**Exercitiul 2:** Identificati erorile intr-o D112 furnizata si propuneti corectii.

**Exercitiul 3:** Generati D205 pornind de la 12 D112 lunare.

---

*Lectia urmatoare: Fluturasi de Salariu si State de Plata*`
    },
    {
      title: 'Fluturasi de Salariu si State de Plata Profesionale',
      slug: 'fluturasi-salariu-state-plata',
      type: 'TEXT' as const,
      duration: 45,
      order: 4,
      isFree: false,
      content: `# Fluturasi de Salariu si State de Plata

## Fluturasul de Salariu

### Obligatia Legala

Conform **Art. 165 Codul Muncii**, angajatorul trebuie sa emita lunar un document care sa contina:
- Toate veniturile realizate
- Toate retinerile efectuate
- Suma neta de plata

### Structura Standard

\`\`\`
╔══════════════════════════════════════════════════════════════╗
║                    FLUTURAS DE SALARIU                       ║
║                      Luna: Ianuarie 2024                      ║
╠══════════════════════════════════════════════════════════════╣
║ Angajator: SC Example SRL                CUI: RO12345678     ║
║ Salariat: Popescu Ion Alexandru         CNP: 1850101123456   ║
║ Functie: Specialist IT                  Dept: Dezvoltare     ║
╠══════════════════════════════════════════════════════════════╣
║                        VENITURI                              ║
╠══════════════════════════════════════════════════════════════╣
║ Salariu baza (22 zile)                          5,000.00 RON ║
║ Spor vechime 10%                                  500.00 RON ║
║ Bonus performanta                                 800.00 RON ║
║ Ore suplimentare (8h x 52.08 x 1.75)              729.17 RON ║
║ ────────────────────────────────────────────────────────────║
║ TOTAL BRUT                                      7,029.17 RON ║
╠══════════════════════════════════════════════════════════════╣
║                       RETINERI                               ║
╠══════════════════════════════════════════════════════════════╣
║ CAS 25%                                         1,757.29 RON ║
║ CASS 10%                                          702.92 RON ║
║ Impozit 10%                                       406.90 RON ║
║ ────────────────────────────────────────────────────────────║
║ TOTAL RETINERI                                  2,867.11 RON ║
╠══════════════════════════════════════════════════════════════╣
║                     BENEFICII NETE                           ║
╠══════════════════════════════════════════════════════════════╣
║ Tichete masa (22 x 40 RON)                        880.00 RON ║
╠══════════════════════════════════════════════════════════════╣
║ SALARIU NET                                     4,162.06 RON ║
║ TOTAL DE INCASAT (Net + Tichete)                5,042.06 RON ║
╠══════════════════════════════════════════════════════════════╣
║ Zile lucrate: 22 | CO: 0 | CM: 0 | Ore suplimentare: 8      ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

---

## Generare Automata Fluturas

### Model TypeScript

\`\`\`typescript
interface DateFluturas {
  // Angajator
  angajator: {
    denumire: string;
    cui: string;
  };

  // Salariat
  salariat: {
    nume: string;
    prenume: string;
    cnp: string;
    functie: string;
    departament: string;
  };

  // Perioada
  luna: number;
  an: number;

  // Venituri
  venituri: {
    salariuBaza: number;
    sporVechime: number;
    sporConditii: number;
    bonusPerformanta: number;
    oreSuplimentare: number;
    indemnizatieCO: number;
    alteVenituri: number;
  };

  // Zile
  zile: {
    lucratoare: number;
    lucrate: number;
    concediuOdihna: number;
    concediuMedical: number;
    absente: number;
  };

  // Ore suplimentare
  oreSuplimentare: {
    numar: number;
    spor: number; // 75% sau 100%
  };

  // Beneficii
  beneficii: {
    ticheteMasa: number;
    altele: number;
  };

  // Deduceri
  deducerePersonala: number;
  persoaneinIntretinere: number;
}

function genereazaFluturas(date: DateFluturas): Fluturas {
  // Calcul total brut
  const totalBrut =
    date.venituri.salariuBaza +
    date.venituri.sporVechime +
    date.venituri.sporConditii +
    date.venituri.bonusPerformanta +
    date.venituri.oreSuplimentare +
    date.venituri.indemnizatieCO +
    date.venituri.alteVenituri;

  // Contributii
  const cas = totalBrut * 0.25;
  const cass = totalBrut * 0.10;

  // Deducere
  const deducere = date.deducerePersonala + (date.persoaneinIntretinere * 100);

  // Baza impozabila
  const bazaImpozabila = Math.max(0, totalBrut - cas - cass - deducere);

  // Impozit
  const impozit = bazaImpozabila * 0.10;

  // Net
  const net = totalBrut - cas - cass - impozit;

  return {
    venituri: {
      detalii: date.venituri,
      total: Math.round(totalBrut * 100) / 100
    },
    retineri: {
      cas: Math.round(cas * 100) / 100,
      cass: Math.round(cass * 100) / 100,
      impozit: Math.round(impozit * 100) / 100,
      total: Math.round((cas + cass + impozit) * 100) / 100
    },
    beneficii: date.beneficii,
    net: Math.round(net * 100) / 100,
    totalIncasat: Math.round((net + date.beneficii.ticheteMasa) * 100) / 100,
    zile: date.zile
  };
}
\`\`\`

---

## Statul de Plata

### Definitie si Rol

Statul de plata este documentul centralizator care:
- Cuprinde toti salariatii activi
- Reflecta veniturile si retinerile
- Serveste drept baza pentru plati si contabilizare

### Structura Standard

\`\`\`
STAT DE PLATA
Luna: Ianuarie 2024
Angajator: SC Example SRL

Nr. | Nume         | Functie      | Zile | Brut     | CAS      | CASS    | Impozit | Net      | Tichete | Total
----|--------------|--------------|------|----------|----------|---------|---------|----------|---------|--------
1   | Popescu Ion  | Specialist   | 22   | 7,029.17 | 1,757.29 | 702.92  | 406.90  | 4,162.06 | 880.00  | 5,042.06
2   | Ionescu Ana  | Manager      | 22   | 9,500.00 | 2,375.00 | 950.00  | 597.50  | 5,577.50 | 880.00  | 6,457.50
3   | Vasile Maria | Contabil     | 20   | 4,545.45 | 1,136.36 | 454.55  | 205.45  | 2,749.09 | 800.00  | 3,549.09
----|--------------|--------------|------|----------|----------|---------|---------|----------|---------|--------
    | TOTAL        |              |      |21,074.62 | 5,268.65 |2,107.47 |1,209.85 |12,488.65 |2,560.00 |15,048.65

Contributii angajator (CAM 2.25%): 474.18 RON
TOTAL COST SALARIAL: 24,108.80 RON

Intocmit: _______________     Verificat: _______________     Aprobat: _______________
\`\`\`

---

## Export si Raportare

### Format Excel/CSV

\`\`\`typescript
interface LinieStatPlata {
  nrCrt: number;
  cnp: string;
  nume: string;
  prenume: string;
  functie: string;
  departament: string;
  zileLucratoare: number;
  zileLucrate: number;
  salariuBaza: number;
  sporuri: number;
  bonusuri: number;
  oreSuplimentare: number;
  totalBrut: number;
  cas: number;
  cass: number;
  deducere: number;
  bazaImpozabila: number;
  impozit: number;
  altineri: number;
  totalRetineri: number;
  net: number;
  ticheteMasa: number;
  totalIncasat: number;
}

function exportStatPlataCSV(linii: LinieStatPlata[]): string {
  const header = Object.keys(linii[0]).join(',');
  const rows = linii.map(l => Object.values(l).join(','));
  return [header, ...rows].join('\\n');
}
\`\`\`

### Raport Sumar pentru Management

\`\`\`typescript
interface RaportSumarSalarii {
  luna: string;
  numarSalariati: number;
  totalBrutCompanie: number;
  totalContributiiSalariati: number;
  totalContributiiAngajator: number;
  totalNetPlata: number;
  totalTichete: number;
  costTotalSalarial: number;

  perDepartament: {
    departament: string;
    numarSalariati: number;
    costTotal: number;
  }[];

  evolutie: {
    luna: string;
    cost: number;
    variatie: number;
  }[];
}
\`\`\`

---

## Contabilizare Salarii

### Note Contabile Standard

\`\`\`
1. Inregistrare salarii brute:
   641 "Cheltuieli cu salariile personalului" = 421 "Personal - salarii datorate"

2. Retinere CAS:
   421 "Personal - salarii datorate" = 4312 "CAS"

3. Retinere CASS:
   421 "Personal - salarii datorate" = 4313 "CASS"

4. Retinere impozit:
   421 "Personal - salarii datorate" = 4411 "Impozit pe venit"

5. CAM angajator:
   6452 "CAM" = 4371 "CAM"

6. Plata salarii nete:
   421 "Personal - salarii datorate" = 5121 "Conturi la banci"

7. Plata contributii:
   4312, 4313, 4411, 4371 = 5121 "Conturi la banci"
\`\`\`

---

## Arhivare si Pastrare

### Termene de Pastrare

| Document | Termen |
|----------|--------|
| State de plata | 50 ani |
| Fluturasi (copii) | 5 ani |
| Pontaje | 5 ani |
| D112, D205 | 10 ani |
| CIM-uri | 50 ani dupa incetare |

### Organizare Arhiva

\`\`\`
/Arhiva_Salarii
  /2024
    /01_Ianuarie
      - stat_plata_2024_01.pdf
      - fluturasi_2024_01.zip
      - pontaj_2024_01.xlsx
      - D112_2024_01.xml
    /02_Februarie
      ...
  /Anuale
    - D205_2023.xml
    - raport_anual_2023.pdf
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Generati fluturasul de salariu complet pentru:
- Salariat: Ionescu Maria
- Brut baza: 5.500 RON
- Spor noapte: 275 RON (10 nopti x 25%)
- 1 persoana in intretinere
- 20 zile lucrate, 2 CO

**Exercitiul 2:** Creati statul de plata pentru o echipa de 5 persoane cu situatii diferite.

**Exercitiul 3:** Calculati costul total salarial pentru un departament si prezentati evolutia pe 6 luni.

---

*Lectia urmatoare: Impozitul pe Venit - Deduceri si Facilitati*`
    }
  ]
};
