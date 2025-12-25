/**
 * DocumentIulia.ro - Complete Course Content Part 2
 * Elite-quality educational content for remaining courses
 * Created: December 2025
 */

import { CourseContent } from './courses-additional-complete';

export const additionalCoursesCompletePart2: CourseContent[] = [
  // ============================================================
  // COURSE: SAF-T D406 pentru Începători
  // ============================================================
  {
    slug: 'saft-d406-incepatori',
    modules: [
      {
        title: 'Introducere în SAF-T',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Ce este SAF-T și de ce a fost introdus',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# SAF-T D406 - Introducere

## Ce este SAF-T?

**SAF-T** (Standard Audit File for Tax) este un standard internațional de raportare fiscală electronică dezvoltat de OECD.

## Cadrul Legal în România

- **Ordinul 1783/2021**: Introduce obligația SAF-T în România
- **D406**: Declarația informativă pentru SAF-T
- **Termen**: Lunar, până pe 25 a lunii următoare

## Cine trebuie să raporteze?

### Obligatoriu din 2022:
- Contribuabili mari

### Obligatoriu din 2023:
- Contribuabili mijlocii

### Obligatoriu din 2025:
- Toți contribuabilii (cu excepții)

## Structura SAF-T

Fișierul XML conține:
1. **Header** - Date identificare
2. **MasterFiles** - Nomenclatoare (parteneri, produse, conturi)
3. **GeneralLedgerEntries** - Înregistrări contabile
4. **SourceDocuments** - Documente sursă

## Beneficii

- Standardizare raportare
- Automatizare controale ANAF
- Reducere timp inspecții
- Transparență fiscală`
          },
          {
            title: 'Calendarul și termenele SAF-T',
            type: 'TEXT',
            duration: 20,
            order: 2,
            content: `# Calendarul SAF-T D406

## Termene de Raportare

### Raportare Lunară
- Termen: **25 ale lunii** următoare
- Exemplu: SAF-T ianuarie → termen 25 februarie

### Perioadă de Grație
- Pilot: Septembrie 2025 - August 2026
- Sancțiuni reduse în această perioadă

## Calendar 2025

| Luna raportată | Termen depunere |
|----------------|-----------------|
| Ianuarie | 25 Februarie |
| Februarie | 25 Martie |
| Martie | 25 Aprilie |
| ... | ... |

## Sancțiuni

### După perioada de grație:
- Nedepunere: 1.000 - 5.000 RON
- Depunere cu erori: Avertisment → Amendă
- Depunere întârziată: Sancțiuni graduale

## Sfaturi

1. **Nu aștepta ultima zi** - Pot apărea erori
2. **Validează înainte** - Folosește DUKIntegrator
3. **Păstrează arhiva** - 10 ani conform legii`
          },
          {
            title: 'DUKIntegrator - Instrumentul de validare',
            type: 'TEXT',
            duration: 20,
            order: 3,
            content: `# DUKIntegrator - Validare SAF-T

## Ce este DUKIntegrator?

Aplicație gratuită furnizată de ANAF pentru:
- Validare fișiere SAF-T
- Verificare conformitate
- Identificare erori înainte de transmitere

## Instalare

### Cerințe:
- Windows 7 sau mai nou
- Java Runtime Environment (JRE) 8+
- Minim 4GB RAM

### Pași instalare:
1. Descarcă de pe anaf.ro
2. Dezarhivează
3. Rulează DUKIntegrator.exe

## Utilizare

### Validare fișier:
1. Deschide DUKIntegrator
2. Selectează fișierul XML
3. Alege schema SAF-T România
4. Click "Validează"
5. Analizează rezultatele

## Erori Frecvente

| Cod Eroare | Descriere | Soluție |
|------------|-----------|---------|
| E001 | CUI invalid | Verifică formatul |
| E002 | Cont inexistent | Adaugă în plan conturi |
| E003 | Sumă negativă | Verifică înregistrarea |
| E004 | Dată invalidă | Format YYYY-MM-DD |

## Tips

- Validează **înainte** de transmitere
- Corectează **toate** erorile
- Păstrează **log-urile** validării`
          }
        ]
      },
      {
        title: 'Structura Fișierului SAF-T',
        order: 2,
        duration: 60,
        lessons: [
          {
            title: 'Header și informații generale',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Header SAF-T

## Structura Header

\`\`\`xml
<Header>
  <AuditFileVersion>2.0</AuditFileVersion>
  <AuditFileCountry>RO</AuditFileCountry>
  <AuditFileDateCreated>2025-01-25</AuditFileDateCreated>
  <SoftwareCompanyName>DocumentIulia</SoftwareCompanyName>
  <SoftwareID>DI-ERP-2025</SoftwareID>
  <SoftwareVersion>1.0</SoftwareVersion>
  <Company>
    <RegistrationNumber>RO12345678</RegistrationNumber>
    <Name>SC EXEMPLU SRL</Name>
    <Address>...</Address>
  </Company>
  <SelectionCriteria>
    <SelectionStartDate>2025-01-01</SelectionStartDate>
    <SelectionEndDate>2025-01-31</SelectionEndDate>
  </SelectionCriteria>
</Header>
\`\`\`

## Câmpuri Obligatorii

| Câmp | Descriere |
|------|-----------|
| AuditFileVersion | Versiunea SAF-T (2.0) |
| AuditFileCountry | Codul țării (RO) |
| RegistrationNumber | CUI cu prefix RO |
| SelectionCriteria | Perioada raportată |

## Validări Header

- CUI valid și activ
- Perioada corectă (o lună)
- Software identificat`
          },
          {
            title: 'MasterFiles - Nomenclatoare',
            type: 'TEXT',
            duration: 20,
            order: 2,
            content: `# MasterFiles - Nomenclatoare SAF-T

## Ce conține MasterFiles?

Toate datele de referință folosite în înregistrări:

### 1. GeneralLedgerAccounts (Conturi)
\`\`\`xml
<GeneralLedgerAccounts>
  <Account>
    <AccountID>411</AccountID>
    <AccountDescription>Clienti</AccountDescription>
    <AccountType>A</AccountType>
  </Account>
</GeneralLedgerAccounts>
\`\`\`

### 2. Customers (Clienți)
\`\`\`xml
<Customers>
  <Customer>
    <CustomerID>C001</CustomerID>
    <RegistrationNumber>RO87654321</RegistrationNumber>
    <Name>CLIENT SRL</Name>
    <Address>...</Address>
  </Customer>
</Customers>
\`\`\`

### 3. Suppliers (Furnizori)
Similar cu Customers

### 4. Products (Produse)
\`\`\`xml
<Products>
  <Product>
    <ProductCode>P001</ProductCode>
    <ProductDescription>Servicii consultanta</ProductDescription>
    <UnitOfMeasure>BUC</UnitOfMeasure>
  </Product>
</Products>
\`\`\`

## Mapare Plan Conturi

Planul de conturi românesc trebuie mapat la structura SAF-T:
- Clasa 1: Capitaluri
- Clasa 2: Imobilizări
- Clasa 3: Stocuri
- Clasa 4: Terți
- Clasa 5: Trezorerie
- Clasa 6: Cheltuieli
- Clasa 7: Venituri`
          },
          {
            title: 'GeneralLedgerEntries - Înregistrări contabile',
            type: 'TEXT',
            duration: 20,
            order: 3,
            content: `# GeneralLedgerEntries

## Structura Înregistrărilor

\`\`\`xml
<GeneralLedgerEntries>
  <NumberOfEntries>150</NumberOfEntries>
  <TotalDebit>1000000.00</TotalDebit>
  <TotalCredit>1000000.00</TotalCredit>
  <Journal>
    <JournalID>VZ</JournalID>
    <Description>Jurnal Vânzări</Description>
    <Transaction>
      <TransactionID>VZ-001</TransactionID>
      <TransactionDate>2025-01-15</TransactionDate>
      <Description>Factura vânzare</Description>
      <Line>
        <RecordID>1</RecordID>
        <AccountID>411</AccountID>
        <DebitAmount>1190.00</DebitAmount>
        <CreditAmount>0</CreditAmount>
      </Line>
      <Line>
        <RecordID>2</RecordID>
        <AccountID>707</AccountID>
        <DebitAmount>0</DebitAmount>
        <CreditAmount>1000.00</CreditAmount>
      </Line>
      <Line>
        <RecordID>3</RecordID>
        <AccountID>4427</AccountID>
        <DebitAmount>0</DebitAmount>
        <CreditAmount>190.00</CreditAmount>
      </Line>
    </Transaction>
  </Journal>
</GeneralLedgerEntries>
\`\`\`

## Reguli Importante

1. **Balanță**: TotalDebit = TotalCredit
2. **Fiecare tranzacție**: Debit = Credit
3. **Referințe**: AccountID există în MasterFiles
4. **Ordine**: Cronologică în cadrul jurnalului

## Tipuri de Jurnale

| Cod | Descriere |
|-----|-----------|
| VZ | Vânzări |
| CP | Cumpărări |
| BC | Bancă |
| CS | Casă |
| OP | Operațiuni diverse |`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: Declarații Fiscale 2025
  // ============================================================
  {
    slug: 'declaratii-fiscale-2025',
    modules: [
      {
        title: 'Declarația D100 - Impozite și Taxe',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Ce este D100 și când se depune',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Declarația D100

## Ce este D100?

Declarație privind obligațiile de plată la bugetul de stat:
- Impozit pe profit
- Impozit pe veniturile microîntreprinderilor
- Impozit pe dividende
- Alte impozite

## Cine depune?

- Societăți comerciale
- PFA/II (anumite cazuri)
- Alte entități cu obligații fiscale

## Termene

### Trimestrial:
- Termen: 25 a lunii următoare trimestrului
- T1 (ian-mar): 25 aprilie
- T2 (apr-iun): 25 iulie
- T3 (iul-sep): 25 octombrie
- T4 (oct-dec): 25 ianuarie

### Lunar:
- Pentru plătitori de TVA lunar
- Termen: 25 a lunii următoare

## Secțiuni D100

1. **Date identificare** - CUI, denumire
2. **Impozite datorate** - Tipuri și sume
3. **Calculul impozitului** - Baza și cota
4. **Total de plată** - Suma finală`
          },
          {
            title: 'Completarea D100 pas cu pas',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Completarea D100

## Secțiunea A - Date Identificare

- **CUI**: Cu sau fără RO
- **Denumire**: Exact ca în certificat
- **Perioada**: Luna/Trimestrul

## Secțiunea B - Impozit Micro

### Calcul:
\`\`\`
Baza impozabilă = Venituri totale - Venituri neimpozabile
Impozit = Baza × Cota (1% sau 3%)
\`\`\`

### Cote 2025:
- **1%** - Dacă ai angajați
- **3%** - Fără angajați

### Exemplu:
- Venituri: 50.000 RON
- Cota: 1%
- Impozit: 500 RON

## Secțiunea C - Impozit Profit

### Calcul:
\`\`\`
Profit impozabil = Venituri - Cheltuieli deductibile
Impozit = Profit × 16%
\`\`\`

## Secțiunea D - Alte Impozite

- Impozit dividende: 8%
- Impozit clădiri
- Alte obligații

## Transmitere

1. Completează în PDF interactiv SAU
2. Generează din software contabil
3. Semnează electronic
4. Transmite prin SPV`
          },
          {
            title: 'Erori frecvente și cum le eviți',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Erori D100 și Soluții

## Top 5 Erori

### 1. Perioada greșită
**Problemă**: Selectezi luna/trimestrul incorect
**Soluție**: Verifică de 2 ori înainte de transmitere

### 2. CUI invalid
**Problemă**: Lipsește RO sau cifră greșită
**Soluție**: Copiază din certificat

### 3. Sume negative
**Problemă**: Introduci valori cu minus
**Soluție**: Folosește câmpurile corecte

### 4. Calcul greșit
**Problemă**: Impozitul nu corespunde bazei
**Soluție**: Verifică formula și cota

### 5. Declarație duplicată
**Problemă**: Depui de 2 ori pentru aceeași perioadă
**Soluție**: Depune declarație rectificativă

## Declarație Rectificativă

Când o folosești:
- Erori în declarația inițială
- Modificări ulterioare
- Corecții din inspecții

Cum o depui:
1. Completează noua declarație
2. Bifează "Rectificativă"
3. Include toate datele corecte
4. Transmite prin SPV`
          }
        ]
      },
      {
        title: 'Declarația D300 - TVA',
        order: 2,
        duration: 60,
        lessons: [
          {
            title: 'Structura D300 și câmpurile importante',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Declarația D300 - TVA

## Ce este D300?

Decontul de taxă pe valoarea adăugată - declarația principală pentru plătitorii de TVA.

## Cine depune?

- Persoane înregistrate în scopuri de TVA
- Lunar (majoritatea) sau trimestrial

## Structura D300

### Secțiunea I - Operațiuni Taxabile
- Rd. 1: Livrări taxabile 19%
- Rd. 2: Livrări taxabile 9%
- Rd. 3: Livrări taxabile 5%
- Rd. 4-6: Achiziții intracomunitare

### Secțiunea II - TVA Colectată
- Rd. 7: TVA 19%
- Rd. 8: TVA 9%
- Rd. 9: TVA 5%

### Secțiunea III - TVA Deductibilă
- Rd. 10: TVA achiziții bunuri
- Rd. 11: TVA achiziții servicii
- Rd. 12: TVA import

### Secțiunea IV - Regularizări
- Ajustări TVA perioadă anterioară
- Corecții

### Secțiunea V - Total
- Rd. 20: TVA de plată SAU
- Rd. 21: TVA de rambursat`
          },
          {
            title: 'Calculul TVA și exemple practice',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Calculul TVA în D300

## Formula de bază

\`\`\`
TVA de plată = TVA Colectată - TVA Deductibilă
\`\`\`

## Exemplu Practic

### Operațiuni luna:
- Vânzări cu TVA 19%: 100.000 RON
- Achiziții cu TVA 19%: 60.000 RON

### Calcul:
\`\`\`
TVA Colectată = 100.000 × 19% = 19.000 RON
TVA Deductibilă = 60.000 × 19% = 11.400 RON
TVA de plată = 19.000 - 11.400 = 7.600 RON
\`\`\`

## Situații Speciale

### TVA de rambursat
Când TVA Deductibilă > TVA Colectată:
- Poți cere rambursare
- Sau reportezi în perioada următoare

### Taxare inversă
- Achiziții intracomunitare
- Anumite servicii
- TVA se colectează ȘI se deduce

### Pro-rata TVA
Când ai operațiuni mixte (cu TVA și scutite):
\`\`\`
Pro-rata = Op. cu drept deducere / Total operațiuni × 100
TVA deductibilă = TVA totală × Pro-rata
\`\`\`

## Sfaturi

1. **Verifică facturile** - TVA corect calculat
2. **Respectă termenul** - 25 a lunii
3. **Păstrează documentele** - Minim 10 ani`
          },
          {
            title: 'Transmiterea și plata TVA',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Transmiterea D300 și Plata TVA

## Transmitere

### Prin SPV:
1. Accesează SPV ANAF
2. Declarații → D300
3. Completează sau încarcă XML
4. Semnează electronic
5. Transmite

### Din software:
- Majoritatea programelor generează XML
- Validează înainte de transmitere

## Plata TVA

### Termen:
- Același cu declarația: 25 a lunii

### Modalități plată:
1. **Transfer bancar** - Cont trezorerie
2. **Ghișeu.ro** - Online
3. **La ghișeu** - Trezorerie

### Cont plată:
\`\`\`
RO47TREZ[COD_JUDEȚ]620702XXXCCC
\`\`\`

## Penalități întârziere

### Dobânzi:
- 0.02% pe zi de întârziere

### Majorări:
- Conform Codului de procedură fiscală

## Rambursare TVA

### Când poți cere:
- Sold negativ (TVA de rambursat)
- Minim 3 luni consecutive
- Sau sumă > 5.000 RON

### Procedură:
1. Depune cerere rambursare
2. ANAF verifică (30-45 zile)
3. Aprobă sau respinge
4. Virează suma aprobată`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: REVISAL
  // ============================================================
  {
    slug: 'revisal-registru-salariati',
    modules: [
      {
        title: 'Bazele REVISAL',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Ce este REVISAL și obligațiile legale',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# REVISAL - Registrul Electronic

## Ce este REVISAL?

Registrul General de Evidență a Salariaților în format electronic, transmis la ITM.

## Cadrul Legal

- **HG 905/2017**: Actualizat
- **Codul Muncii**: Obligativitate
- Legislație protecție date

## Cine trebuie să transmită?

Toți angajatorii:
- Societăți comerciale
- PFA cu angajați
- Instituții publice
- ONG-uri cu personal

## Ce conține REVISAL?

### Date angajat:
- Nume, prenume
- CNP
- Data nașterii
- Adresa

### Date contract:
- Număr și dată contract
- Data începere
- Funcția (cod COR)
- Salariul de bază
- Norma de lucru
- Tip contract (determinat/nedeterminat)

## Termene transmitere

| Eveniment | Termen |
|-----------|--------|
| Angajare | Înainte de începere |
| Modificare | 20 zile lucrătoare |
| Încetare | 20 zile lucrătoare |`
          },
          {
            title: 'Înregistrarea unui nou angajat',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Înregistrare Angajat în REVISAL

## Documente necesare

Înainte de înregistrare, ai nevoie de:
- [ ] Contractul individual de muncă semnat
- [ ] Copie CI angajat
- [ ] Fișa postului
- [ ] Cod COR pentru funcție

## Pași înregistrare

### Pas 1: Accesează aplicația
- REVISAL Online (recomandat)
- Sau aplicația desktop

### Pas 2: Adaugă angajat nou
- Meniu → Angajați → Adaugă

### Pas 3: Completează datele personale
- CNP (validare automată)
- Nume și prenume
- Adresa de domiciliu

### Pas 4: Completează datele contractuale
- Număr contract
- Data începerii
- Funcția (selectează din COR)
- Salariul brut
- Norma (fracție sau întreagă)

### Pas 5: Validează și salvează
- Verifică toate câmpurile
- Salvează local
- Generează fișier transmitere

### Pas 6: Transmite la ITM
- Semnează electronic
- Trimite prin portal
- Păstrează confirmarea

## Cod COR

### Cum găsești codul corect:
1. Accesează clasificarea COR
2. Caută după denumire
3. Verifică descrierea
4. Folosește codul pe 6 cifre

### Exemple:
- 251201 - Programator
- 242101 - Economist
- 422101 - Secretar`
          },
          {
            title: 'Modificări și încetări contracte',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Modificări REVISAL

## Tipuri de modificări

### Modificări contractuale:
- Salariu
- Funcție
- Normă de lucru
- Tip contract

### Modificări personale:
- Schimbare nume
- Schimbare adresă
- Actualizare CI

## Procedură modificare

1. Deschide dosarul angajatului
2. Selectează "Modificare"
3. Completează datele noi
4. Data efectivă a modificării
5. Transmite în termen (20 zile)

## Încetare contract

### Motive frecvente:
- Demisie (art. 81)
- Acordul părților (art. 55)
- Concediere (art. 58-65)
- Expirare contract determinat

### Înregistrare încetare:
1. Selectează angajatul
2. Alege "Încetare contract"
3. Selectează motivul (articol)
4. Data încetării
5. Transmite la ITM

## Erori frecvente

### "CNP invalid"
Verifică cifrele, mai ales cifra de control

### "Dată incorectă"
Formatul trebuie să fie ZZ.LL.AAAA

### "Cod COR inexistent"
Verifică în clasificarea actualizată`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: Concedii și Absențe
  // ============================================================
  {
    slug: 'concedii-absente-ghid',
    modules: [
      {
        title: 'Tipuri de Concedii în România',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Concediul de odihnă - Drepturi și calcul',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Concediul de Odihnă

## Dreptul la concediu

### Minim legal:
- **20 zile lucrătoare** pe an pentru normă întreagă
- Proporțional pentru timp parțial

### Zile suplimentare pentru:
- Condiții grele de muncă: +3 zile
- Nevăzători: +6 zile
- Minori: +3 zile
- Handicap: conform certificat

## Calculul zilelor

### Formula:
\`\`\`
Zile cuvenite = (Zile totale/12) × Luni lucrate
\`\`\`

### Exemplu:
- Drept anual: 21 zile
- Luni lucrate: 6
- Zile cuvenite: (21/12) × 6 = 10.5 → 11 zile

## Programarea concediului

### Obligații angajator:
- Programare anuală (până pe 31 decembrie pentru anul următor)
- Consultare salariați
- Afișare programare

### Drepturi angajat:
- Minim 10 zile consecutive odată
- Poate solicita reprogramare
- Refuz doar motivat de angajator

## Indemnizația de concediu

### Calcul:
\`\`\`
Indemnizație = Media zilnică × Zile concediu
Media zilnică = Venituri ultimele 3 luni / Zile lucrate
\`\`\`

### Se plătește:
- Înainte de plecarea în concediu
- Cu minim 5 zile înainte (conform CCM)`
          },
          {
            title: 'Concediul medical și maternitate',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Concedii Medicale

## Concediu Medical Obișnuit

### Cine plătește:
- Primele 5 zile: Angajator
- Restul: Casa de Asigurări (prin angajator)

### Cuantum:
- 75% din baza de calcul (general)
- 100% pentru urgențe, TBC, cancer, boli infectocontagioase

### Durată maximă:
- 183 zile/an pentru aceeași boală
- Poate fi prelungit cu aviz CNPAS

## Concediu Maternitate

### Durată totală: 126 zile
- Prenatal: 63 zile (minim 42 obligatorii)
- Postnatal: 63 zile (minim 42 obligatorii)

### Indemnizație:
- 85% din media veniturilor
- Baza: Ultimele 6 luni
- Plătește: Casa de Asigurări

### Condiții:
- Minim 6 luni stagiu cotizare în ultimele 12 luni

## Concediu Creștere Copil

### Opțiuni:
- Până la 2 ani: 85% din medie (max 8.500 RON)
- Până la 1 an: 85% din medie (fără plafon)

### Stimulent inserție:
- 1.500 RON/lună dacă revii mai devreme la muncă

## Documente necesare

### Pentru medical:
- Certificat medical
- Formular FNUASS

### Pentru maternitate:
- Certificat constatare sarcină
- Cerere angajator
- Formular Casa Asigurări`
          },
          {
            title: 'Alte tipuri de concedii și absențe',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Alte Concedii

## Concediu Fără Plată

### Acordare:
- La cererea angajatului
- Cu acordul angajatorului
- Nu poate fi refuzat în anumite cazuri legale

### Efecte:
- Nu se plătește salariu
- Nu se datorează contribuții
- Vechimea se suspendă

## Concediu pentru Evenimente Familiale

### Căsătorie: 5 zile lucrătoare plătite
### Naștere copil: 5-10 zile (tată)
### Deces rudă gr. I-II: 3-5 zile

## Concediu Formare Profesională

### Inițiat de angajat:
- 10 zile/an fără plată (sau plătit dacă e în interes angajator)

### Inițiat de angajator:
- Integral plătit
- Obligație de menținere după formare

## Zile Libere Legale 2025

| Data | Sărbătoare |
|------|------------|
| 1-2 Ian | Anul Nou |
| 24 Ian | Unirea |
| 18-21 Apr | Paște |
| 1 Mai | Muncii |
| 8-9 Iun | Rusalii |
| 1 Dec | Națională |
| 25-26 Dec | Crăciun |

## Evidența Absențelor

### Obligații angajator:
- Pontaj lunar
- Registru concedii
- Arhivare certificate medicale`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: Contract Individual de Muncă
  // ============================================================
  {
    slug: 'contract-munca-model-clauze',
    modules: [
      {
        title: 'Structura Contractului de Muncă',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Elementele obligatorii ale CIM',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Contractul Individual de Muncă

## Ce este CIM?

Contractul prin care salariatul se obligă să presteze muncă pentru angajator, în schimbul unui salariu.

## Elemente Obligatorii

### 1. Părțile contractante
- Datele de identificare angajator
- Datele de identificare angajat (CNP, CI)

### 2. Obiectul contractului
- Funcția/postul
- Cod COR
- Fișa postului (anexă)

### 3. Locul muncii
- Sediul angajatorului SAU
- Adresa specifică SAU
- Muncă la domiciliu/telemuncă

### 4. Durata contractului
- Nedeterminată (regula)
- Determinată (excepția - max 36 luni)

### 5. Timpul de muncă
- Normă întreagă (40h/săptămână)
- Timp parțial (specificat)
- Program (interval orar)

### 6. Salarizarea
- Salariu de bază brut
- Sporuri
- Alte beneficii

### 7. Concediul de odihnă
- Număr zile
- Mod de acordare

### 8. Perioada de probă
- Maximum legal per funcție
- Condițiile specifice`
          },
          {
            title: 'Clauze speciale (confidențialitate, neconcurență)',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Clauze Speciale în CIM

## Clauza de Confidențialitate

### Ce prevede:
- Obligația de a păstra secretul informațiilor
- Tipuri de informații protejate
- Durata obligației (și după încetare)
- Sancțiuni pentru încălcare

### Model:
> Salariatul se obligă să păstreze confidențialitatea tuturor informațiilor privind activitatea angajatorului, pe durata contractului și 2 ani după încetare.

## Clauza de Neconcurență

### Condiții de validitate:
1. Formă scrisă
2. Activități interzise specificate
3. Durată maximă 2 ani
4. Compensație lunară minim 50% din media salariului

### Elemente obligatorii:
- Activitățile interzise
- Terții vizați (competitori)
- Aria geografică
- Cuantumul indemnizației
- Perioada de aplicare

### Când nu se aplică:
- Concediere pentru motive neimputabile
- Încetare de drept
- Angajatorul nu plătește indemnizația

## Clauza de Mobilitate

### Când se folosește:
- Activitate în locații multiple
- Deplasări frecvente
- Detașări planificate

### Ce trebuie specificat:
- Locațiile/zona
- Frecvența deplasărilor
- Compensații aferente

## Clauza de Formare Profesională

### Angajatorul finanțează formarea:
- Salariatul se obligă să rămână X ani
- Sau restituie proporțional costurile
- Maximum 3 ani obligație`
          },
          {
            title: 'Modificarea și încetarea CIM',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Modificarea și Încetarea CIM

## Modificarea Contractului

### Ce se poate modifica:
- Salariul
- Funcția
- Locul muncii
- Durata (determinat → nedeterminat)
- Timpul de muncă

### Prin act adițional:
- Acordul ambelor părți
- Formă scrisă
- Înregistrare REVISAL

### Fără act adițional:
- Modificări temporare
- Urgente/forță majoră
- Maximum 60 zile/an

## Încetarea Contractului

### De drept:
- Pensionare
- Deces
- Condamnare definitivă
- Expirare termen determinat

### Acordul părților:
- Oricând
- Formă scrisă
- Fără preaviz

### Demisie:
- Voința angajatului
- Preaviz 20 zile (45 pentru funcții conducere)
- Fără motivare

### Concediere:
- Disciplinară
- Pentru motive neimputabile
- Desființare post

## Preavizul

### Durata:
- Minim 20 zile lucrătoare
- 45 zile pentru conducere
- Poate fi mai lung prin contract

### Calcul:
- Zile lucrătoare
- Exclud concedii și absențe`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: Excel pentru Contabili
  // ============================================================
  {
    slug: 'excel-contabili-reconcilieri',
    modules: [
      {
        title: 'Excel pentru Contabilitate',
        order: 1,
        duration: 90,
        lessons: [
          {
            title: 'Formule esențiale pentru contabili',
            type: 'TEXT',
            duration: 30,
            order: 1,
            content: `# Formule Excel pentru Contabili

## Formule de Bază

### SUMIF - Adunare condiționată
\`\`\`excel
=SUMIF(A:A,"411",B:B)
\`\`\`
Adună valorile din B unde A = "411"

### SUMIFS - Mai multe condiții
\`\`\`excel
=SUMIFS(D:D,A:A,"411",C:C,">=2025-01-01")
\`\`\`

### VLOOKUP - Căutare verticală
\`\`\`excel
=VLOOKUP(A2,NomenclatorConturi,2,0)
\`\`\`

### INDEX + MATCH - Alternativă flexibilă
\`\`\`excel
=INDEX(B:B,MATCH(A2,C:C,0))
\`\`\`

## Formule pentru Date

### EOMONTH - Sfârșit de lună
\`\`\`excel
=EOMONTH(A2,0)
\`\`\`

### NETWORKDAYS - Zile lucrătoare
\`\`\`excel
=NETWORKDAYS(A2,B2,Sarbatori)
\`\`\`

### YEAR, MONTH, DAY
\`\`\`excel
=YEAR(A2) & "-" & MONTH(A2)
\`\`\`

## Formule Financiare

### Rotunjire la 2 zecimale
\`\`\`excel
=ROUND(A2,2)
\`\`\`

### Calcul TVA
\`\`\`excel
=A2*19% (TVA din baza)
=A2/1.19*0.19 (TVA din total)
\`\`\`

### Dobândă
\`\`\`excel
=A2*0.02%*B2 (suma × rată × zile)
\`\`\`

## Formule Text

### Extragere CUI
\`\`\`excel
=IF(LEFT(A2,2)="RO",MID(A2,3,99),A2)
\`\`\`

### Concatenare
\`\`\`excel
=A2&" "&B2
=CONCAT(A2," ",B2)
\`\`\``
          },
          {
            title: 'Reconciliere bancară în Excel',
            type: 'TEXT',
            duration: 30,
            order: 2,
            content: `# Reconciliere Bancară

## Ce este reconcilierea?

Procesul de potrivire între:
- Evidența contabilă (cont 512)
- Extrasul bancar

## Template Reconciliere

### Structura:
| Data | Descriere | Debit Cont | Credit Cont | Debit Bancă | Credit Bancă | Diferență |

### Formule verificare:
\`\`\`excel
=D2-F2 (pentru debite)
=E2-G2 (pentru credite)
=IF(H2=0,"OK","VERIFICĂ")
\`\`\`

## Pași Reconciliere

### 1. Import date
- Extras bancar (CSV/Excel)
- Fișă cont 512 din contabilitate

### 2. Standardizare
- Aceeași structură date
- Aceleași formate numerice

### 3. Potrivire automată
\`\`\`excel
=VLOOKUP(A2,ExtrasBanca,4,0)
\`\`\`

### 4. Identificare diferențe
\`\`\`excel
=IF(ISERROR(VLOOKUP(A2,ExtrasBanca,1,0)),"LIPSA","OK")
\`\`\`

### 5. Investigare
- Plăți în tranzit
- Încasări neînregistrate
- Comisioane necontabilizate

## Diferențe Frecvente

| Tip | Cauză | Soluție |
|-----|-------|---------|
| Plată în tranzit | Emisă dar neprocesată | Așteaptă |
| Comision | Necontabilizat | Înregistrează |
| Diferență sumă | Eroare introducere | Corectează |

## Raport Final

### Structura:
\`\`\`
Sold inițial contabil: X
+ Încasări: Y
- Plăți: Z
= Sold final contabil: W

Sold extras bancar: W'

Diferență: W - W' = 0 ✓
\`\`\``
          },
          {
            title: 'Balanța de verificare în Excel',
            type: 'TEXT',
            duration: 30,
            order: 3,
            content: `# Balanța de Verificare

## Ce este balanța?

Situație centralizatoare cu toate conturile:
- Solduri inițiale
- Rulaje perioadă
- Solduri finale

## Structura Balanței

| Cont | Denumire | SD Inițial | SC Inițial | RD | RC | SD Final | SC Final |

## Formule Calcul

### Sold Final Debitor
\`\`\`excel
=MAX(0, C2 - D2 + E2 - F2)
\`\`\`

### Sold Final Creditor
\`\`\`excel
=MAX(0, D2 - C2 + F2 - E2)
\`\`\`

### Verificare Echilibru
\`\`\`excel
=SUM(G:G) - SUM(H:H) = 0
\`\`\`

## Automatizare

### Agregare din Cartea Mare
\`\`\`excel
=SUMIF(CarteaMare!A:A,A2,CarteaMare!D:D)
\`\`\`

### Pivot Table
1. Selectează datele Cartea Mare
2. Insert → Pivot Table
3. Rows: Cont
4. Values: Sum of Debit, Sum of Credit

## Verificări

### Total Debit = Total Credit
Dacă nu: Caută înregistrări incomplete

### Conturi nepermise cu sold:
- 121 trebuie să fie zero la final
- Conturi de regularizare

### Corelații:
- 411 = Sume de încasat clienți
- 401 = Datorii furnizori

## Export pentru Raportare

### Formatare profesională:
1. Antet cu firmă și perioadă
2. Conturi sortate pe clase
3. Subtotaluri pe clase
4. Total general
5. Semnături`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: SSM Obligatorii
  // ============================================================
  {
    slug: 'instructiuni-ssm-obligatorii',
    modules: [
      {
        title: 'Instructajele SSM',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Instructajul introductiv general',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Instructajul Introductiv General SSM

## Ce este?

Primul instructaj primit de orice persoană care intră în organizație.

## Cine îl face?

- Angajator sau
- Lucrător desemnat SSM sau
- Serviciu extern SSM

## Când se face?

- La angajare
- Înainte de începerea activității
- Durata: minim 8 ore

## Conținut obligatoriu

### 1. Legislație SSM
- Legea 319/2006
- HG 1425/2006
- Drepturi și obligații

### 2. Riscuri generale
- Tipuri de riscuri în unitate
- Zone periculoase
- Semnalizare de securitate

### 3. Măsuri de prevenire
- Echipament de protecție
- Proceduri de lucru
- Comportament în situații de urgență

### 4. Prim ajutor
- Proceduri de bază
- Puncte de prim ajutor
- Numere de urgență

### 5. PSI (Prevenirea Incendiilor)
- Utilizare stingătoare
- Evacuare
- Puncte adunare

## Documentare

### Fișa de instructaj:
- Data și durata
- Conținutul prezentat
- Materialele folosite
- Semnături (instructor + instruit)`
          },
          {
            title: 'Instructajul la locul de muncă',
            type: 'TEXT',
            duration: 20,
            order: 2,
            content: `# Instructajul la Locul de Muncă

## Ce este?

Instructaj specific pentru postul și activitățile concrete ale angajatului.

## Cine îl face?

- Șeful direct/conducătorul locului de muncă

## Când se face?

- După instructajul introductiv general
- Înainte de începerea activității pe post
- Durata: minim 8 ore (poate fi mai mare)

## Conținut

### 1. Prezentarea locului de muncă
- Organizare
- Echipamente utilizate
- Materiale și substanțe

### 2. Riscuri specifice postului
- Identificarea pericolelor
- Măsuri de prevenire
- EIP necesar

### 3. Instrucțiuni proprii
- Proceduri de lucru
- Instrucțiuni specifice echipamente
- Interdicții

### 4. Demonstrație practică
- Arată cum se lucrează corect
- Verifică înțelegerea
- Supervizare inițială

## Perioade de probă SSM

| Funcție | Durată |
|---------|--------|
| Muncitor necalificat | minim 5 zile |
| Muncitor calificat | minim 3 zile |
| Funcții tehnice | minim 3 zile |
| Funcții administrative | minim 1 zi |

## Documentare

- Aceeași fișă cu instructajul general
- Secțiune separată
- Semnături ambele părți`
          },
          {
            title: 'Instructajul periodic și la schimbări',
            type: 'TEXT',
            duration: 20,
            order: 3,
            content: `# Instructajul Periodic

## Frecvență

- **Lunar**: Locuri de muncă cu riscuri mari
- **Trimestrial**: Alte locuri de muncă
- Poate fi mai frecvent dacă e necesar

## Conținut

### Reactualizare cunoștințe:
- Riscuri și măsuri
- Proceduri de lucru
- Modificări legislative

### Analiza incidentelor:
- Accidente petrecute
- Situații periculoase
- Lecții învățate

### Teme specifice:
- Sezoniere (iarnă, caniculă)
- Legate de activități speciale
- Noutăți în domeniu

## Instructaj la Schimbări

### Când este necesar:
- Schimbare loc de muncă
- Transfer în altă secție
- Introducere echipament nou
- Modificare proces tehnologic
- După concediu > 30 zile

### Conținut:
- Riscuri noi
- Proceduri noi
- Măsuri specifice

## Instructaj Suplimentar

### Se face când:
- Abateri de la proceduri
- Accidente/incidente
- La cererea angajatului
- La recomandarea medicului

## Evidența Instructajelor

### Registru sau fișe individuale:
- Toate instructajele documentate
- Semnături complete
- Arhivare pe toată durata angajării + 5 ani`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: GDPR pentru Afaceri Mici
  // ============================================================
  {
    slug: 'gdpr-afaceri-mici',
    modules: [
      {
        title: 'Bazele GDPR',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Ce este GDPR și la cine se aplică',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# GDPR pentru Afaceri Mici

## Ce este GDPR?

Regulamentul General privind Protecția Datelor - legislație europeană care protejează datele personale.

## La cine se aplică?

### Orice organizație care:
- Prelucrează date ale cetățenilor UE
- Are sediul în UE
- Oferă bunuri/servicii în UE

### Dimensiunea nu contează:
- Se aplică și firmelor mici
- Și freelancerilor
- Și asociațiilor

## Ce sunt datele personale?

### Date care identifică o persoană:
- Nume, prenume
- CNP
- Adresă
- Email, telefon
- IP, cookie-uri
- Fotografii

### Date sensibile (protecție specială):
- Sănătate
- Origine etnică
- Opinii politice
- Date biometrice

## Principii GDPR

### 1. Legalitate
Bază legală pentru prelucrare

### 2. Transparență
Informare clară

### 3. Limitarea scopului
Doar pentru scopuri specificate

### 4. Minimizarea datelor
Doar date necesare

### 5. Exactitate
Date corecte și actualizate

### 6. Limitarea stocării
Ștergere când nu mai sunt necesare

### 7. Integritate și confidențialitate
Securitate adecvată`
          },
          {
            title: 'Obligații practice pentru afaceri mici',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Obligații GDPR Practice

## Registrul de Evidență

### Ce trebuie să conțină:
- Ce date prelucrezi
- De ce le prelucrezi
- Cât timp le păstrezi
- Cu cine le împarți

### Model simplu:
| Date | Scop | Bază legală | Durată | Destinatari |
|------|------|-------------|--------|-------------|
| Nume client | Facturare | Contract | 10 ani | Contabil |
| Email | Marketing | Consimțământ | Până la revocare | Newsletter |

## Politica de Confidențialitate

### Trebuie să conțină:
- Cine ești (date contact)
- Ce date colectezi
- De ce
- Drepturile persoanelor
- Cum pot contacta

### Unde se afișează:
- Pe website (link vizibil)
- La colectare date
- La cerere

## Consimțământul

### Când e necesar:
- Marketing direct
- Cookie-uri (unele)
- Date sensibile

### Cum trebuie să fie:
- Liber dat
- Specific
- Informat
- Clar (acțiune afirmativă)

### Ce NU e valid:
- Casete pre-bifate
- "Dacă continuați acceptați"
- Consimțământ general

## Securitatea Datelor

### Măsuri minime:
- Parole puternice
- Backup regulat
- Antivirus actualizat
- Acces limitat (need-to-know)
- Criptare date sensibile`
          },
          {
            title: 'Drepturile persoanelor și cum răspunzi',
            type: 'TEXT',
            duration: 15,
            order: 3,
            content: `# Drepturile Persoanelor

## Dreptul de Acces

### Ce poate cere persoana:
- Confirmarea că îi prelucrezi datele
- Copie a datelor
- Informații despre prelucrare

### Termen răspuns: 30 zile
### Cost: Gratuit (prima cerere)

## Dreptul de Rectificare

### Persoana poate cere:
- Corectarea datelor incorecte
- Completarea datelor incomplete

### Răspuns: Imediat sau maxim 30 zile

## Dreptul la Ștergere ("Dreptul de a fi uitat")

### Când se aplică:
- Date nu mai sunt necesare
- Consimțământ retras
- Opoziție acceptată
- Prelucrare ilegală

### Când NU se aplică:
- Obligații legale (facturi 10 ani)
- Litigii în curs

## Dreptul la Portabilitate

### Persoana poate primi:
- Datele în format electronic
- Sau transfer direct alt operator

### Se aplică pentru:
- Date furnizate de persoană
- Prelucrare pe bază de consimțământ/contract

## Procedură de Răspuns

### 1. Verifică identitatea
### 2. Documentează cererea
### 3. Analizează aplicabilitatea
### 4. Răspunde în termen
### 5. Păstrează evidența

## Încălcări de Date (Data Breach)

### Când notifici ANSPDCP:
- În 72 ore de la constatare
- Dacă există risc pentru drepturi

### Când notifici persoanele:
- Risc ridicat pentru drepturi
- Fără întârziere nejustificată`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: Power BI pentru Finanțe
  // ============================================================
  {
    slug: 'power-bi-finante',
    modules: [
      {
        title: 'Introducere Power BI',
        order: 1,
        duration: 90,
        lessons: [
          {
            title: 'Ce este Power BI și de ce îl folosim în finanțe',
            type: 'TEXT',
            duration: 30,
            order: 1,
            content: `# Power BI pentru Finanțe

## Ce este Power BI?

Platformă Microsoft pentru:
- Vizualizare date
- Business Intelligence
- Rapoarte interactive
- Dashboard-uri

## De ce Power BI în Finanțe?

### Avantaje:
- Conectare la multiple surse
- Actualizare automată
- Vizualizări profesionale
- Partajare ușoară
- Licență gratuită pentru desktop

### Cazuri de utilizare:
- Dashboard CFO
- Raportare lunară
- Analiza profitabilității
- Cash flow monitoring
- KPIs financiari

## Componente Power BI

### Power BI Desktop (gratuit)
- Creare rapoarte
- Modelare date
- Vizualizări

### Power BI Service (cloud)
- Publicare rapoarte
- Partajare echipă
- Programare refresh

### Power BI Mobile
- Vizualizare pe mobil
- Alerte

## Surse de Date pentru Finanțe

### Directe:
- Excel, CSV
- SQL Server
- Oracle, MySQL

### ERP:
- SAP
- Dynamics
- Software contabil (export)

### Cloud:
- SharePoint
- Google Sheets
- APIs`
          },
          {
            title: 'Primul Dashboard Financiar',
            type: 'TEXT',
            duration: 30,
            order: 2,
            content: `# Crearea unui Dashboard Financiar

## Structura Recomandată

### Secțiune 1: KPIs (sus)
- Venituri totale
- Cheltuieli totale
- Profit/Pierdere
- Marjă %

### Secțiune 2: Grafice (mijloc)
- Evoluție venituri (linie)
- Structură cheltuieli (pie)
- Comparativ buget vs realizat (bar)

### Secțiune 3: Tabele (jos)
- Top clienți
- Detalii pe departamente

## Pași Creare

### 1. Import Date
- Get Data → Excel/CSV
- Selectează tabele
- Transform dacă e nevoie

### 2. Modelarea Datelor
- Relații între tabele
- Măsuri calculate (DAX)
- Ierarhii (Ani > Luni > Zile)

### 3. Vizualizări
- Card pentru KPIs
- Line chart pentru trend
- Bar chart pentru comparații

### 4. Formatare
- Titluri clare
- Culori consistente
- Legende

## Măsuri DAX Esențiale

### Total Venituri
\`\`\`dax
Total Venituri = SUM(Facturi[Valoare])
\`\`\`

### Profit
\`\`\`dax
Profit = [Total Venituri] - [Total Cheltuieli]
\`\`\`

### Marjă %
\`\`\`dax
Marja = DIVIDE([Profit], [Total Venituri], 0)
\`\`\`

### YoY Growth
\`\`\`dax
YoY = DIVIDE([Total Venituri] - [Venituri Anul Trecut], [Venituri Anul Trecut])
\`\`\``
          },
          {
            title: 'Conectare la date contabile',
            type: 'TEXT',
            duration: 30,
            order: 3,
            content: `# Conectare Date Contabile

## Export din Software Contabil

### SAGA:
1. Rapoarte → Export → Excel
2. Selectează perioada
3. Format: XLSX

### Mentor/WinMentor:
1. Situații → Export
2. Alege template
3. Salvează Excel

### Alte programe:
- Caută opțiune Export
- Preferă Excel sau CSV

## Import în Power BI

### Pași:
1. Get Data → Excel
2. Navigator → Selectează foi
3. Transform Data (dacă e nevoie)

### Transformări frecvente:
- Elimină rânduri goale
- Schimbă tipuri date
- Pivotare/Unpivot
- Merge tabele

## Model de Date Contabil

### Tabele recomandate:
- **FactJurnal** - Tranzacții
- **DimConturi** - Plan de conturi
- **DimParteneri** - Clienți/Furnizori
- **DimTimpuri** - Calendar

### Relații:
\`\`\`
FactJurnal → DimConturi (Cont)
FactJurnal → DimParteneri (Partener)
FactJurnal → DimTimpuri (Data)
\`\`\`

## Refresh Automat

### Power BI Service:
1. Publică raportul
2. Settings → Scheduled Refresh
3. Configurează frecvența
4. Setează credențiale surse

### Gateway (pentru surse locale):
- Instalează gateway
- Configurează conexiuni
- Programează refresh`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: Evaluarea Riscurilor Profesionale
  // ============================================================
  {
    slug: 'evaluare-riscuri-profesionale',
    modules: [
      {
        title: 'Metodologia de Evaluare',
        order: 1,
        duration: 60,
        lessons: [
          {
            title: 'Ce este evaluarea riscurilor',
            type: 'TEXT',
            duration: 20,
            order: 1,
            content: `# Evaluarea Riscurilor Profesionale

## Ce este?

Proces sistematic de identificare a pericolelor și evaluare a riscurilor la locul de muncă.

## De ce este obligatorie?

### Cadrul legal:
- Legea 319/2006
- HG 1425/2006
- Directiva 89/391/CEE

### Sancțiuni:
- Amendă: 5.000 - 10.000 RON
- Suspendare activitate (cazuri grave)

## Când se face?

### Obligatoriu:
- La înființare/schimbare sediu
- Introducere echipamente noi
- Modificare procese
- După accident de muncă

### Recomandat:
- Anual pentru reactualizare

## Cine o face?

### Opțiuni:
1. **Intern** - Lucrător desemnat SSM
2. **Extern** - Serviciu SSM autorizat
3. **Mixt** - Colaborare

### Cerințe:
- Competență tehnică
- Cunoaștere activități
- Formare SSM

## Etapele Evaluării

1. Pregătire
2. Identificare pericole
3. Evaluare riscuri
4. Stabilire măsuri
5. Documentare
6. Revizuire periodică`
          },
          {
            title: 'Identificarea pericolelor',
            type: 'TEXT',
            duration: 20,
            order: 2,
            content: `# Identificarea Pericolelor

## Categorii de Pericole

### Fizice:
- Zgomot
- Vibrații
- Temperatură extremă
- Radiații
- Iluminat necorespunzător

### Chimice:
- Substanțe toxice
- Gaze, vapori
- Praf
- Produse corozive

### Biologice:
- Bacterii, virusuri
- Ciuperci
- Paraziti

### Mecanice:
- Echipamente în mișcare
- Obiecte în cădere
- Suprafețe alunecoase
- Tăiere, înțepare

### Ergonomice:
- Poziții forțate
- Mișcări repetitive
- Manipulare manuală greutăți

### Psihosociale:
- Stres
- Hărțuire
- Violență

## Metode de Identificare

### Inspecție fizică:
- Parcurgere locuri de muncă
- Observare activități
- Fotografiere zone de risc

### Analiza documentelor:
- Fișe tehnice echipamente
- Fișe de securitate substanțe
- Istoricul incidentelor

### Consultarea lucrătorilor:
- Interviuri
- Chestionare
- Sesiuni de brainstorming

## Lista de Verificare

### Pentru fiecare loc de muncă verifică:
- [ ] Căi de acces
- [ ] Echipamente utilizate
- [ ] Substanțe prezente
- [ ] Condiții de mediu
- [ ] Organizarea muncii
- [ ] EIP disponibil`
          },
          {
            title: 'Matricea de risc și plan de măsuri',
            type: 'TEXT',
            duration: 20,
            order: 3,
            content: `# Matricea de Risc

## Formula de Calcul

\`\`\`
Risc = Probabilitate × Gravitate
\`\`\`

## Scala Probabilitate (P)

| Nivel | Descriere |
|-------|-----------|
| 1 | Foarte puțin probabil |
| 2 | Puțin probabil |
| 3 | Probabil |
| 4 | Foarte probabil |
| 5 | Aproape sigur |

## Scala Gravitate (G)

| Nivel | Descriere |
|-------|-----------|
| 1 | Neglijabil |
| 2 | Minor (prim ajutor) |
| 3 | Moderat (tratament medical) |
| 4 | Major (incapacitate) |
| 5 | Catastrofal (deces) |

## Matricea

\`\`\`
     G1  G2  G3  G4  G5
P5   5  10  15  20  25
P4   4   8  12  16  20
P3   3   6   9  12  15
P2   2   4   6   8  10
P1   1   2   3   4   5
\`\`\`

## Interpretare Risc

| Scor | Nivel | Acțiune |
|------|-------|---------|
| 1-4 | Scăzut | Monitorizare |
| 5-9 | Mediu | Plan termen mediu |
| 10-16 | Ridicat | Acțiune urgentă |
| 17-25 | Inacceptabil | Stop activitate |

## Plan de Măsuri

### Structura:
| Risc | Nivel | Măsură | Responsabil | Termen | Verificare |

### Ierarhie măsuri (preferință):
1. **Eliminare** - Înlătură pericolul
2. **Substituție** - Înlocuire cu mai puțin periculos
3. **Izolare** - Separare fizică
4. **Control tehnic** - Ventilație, protecții
5. **Control administrativ** - Proceduri, instruire
6. **EIP** - Echipament de protecție`
          }
        ]
      }
    ]
  },

  // ============================================================
  // COURSE: Analiza Cost-Beneficiu
  // ============================================================
  {
    slug: 'analiza-cost-beneficiu',
    modules: [
      {
        title: 'Fundamentele Analizei Cost-Beneficiu',
        order: 1,
        duration: 90,
        lessons: [
          {
            title: 'Ce este ACB și când o folosim',
            type: 'TEXT',
            duration: 30,
            order: 1,
            content: `# Analiza Cost-Beneficiu (ACB)

## Definiție

Metodă de evaluare a proiectelor care compară costurile cu beneficiile, exprimate în valori monetare.

## Când se folosește?

### Obligatoriu pentru:
- Proiecte cu finanțare europeană > 75M EUR
- Proiecte majore de infrastructură
- Investiții publice

### Recomandat pentru:
- Decizii strategice de afaceri
- Evaluare investiții
- Comparare alternative

## Principii de Bază

### 1. Perspectiva economică
- Nu doar financiar, ci și social
- Include externalități
- Valori de piață ajustate

### 2. Analiza incrementală
- Compară "cu proiect" vs "fără proiect"
- Nu situația existentă vs proiect

### 3. Orizont de analiză
- Durată de viață economică
- Tipic: 15-30 ani pentru infrastructură
- 5-10 ani pentru echipamente

### 4. Actualizare
- Valori viitoare → valoare prezentă
- Rata de actualizare socială: 5% (RO)

## Etapele ACB

1. Definire obiective și context
2. Identificare proiecte/alternative
3. Studiu de fezabilitate
4. Analiză financiară
5. Analiză economică
6. Analiză de sensibilitate
7. Concluzie și recomandări`
          },
          {
            title: 'Analiza financiară',
            type: 'TEXT',
            duration: 30,
            order: 2,
            content: `# Analiza Financiară

## Scopul

Evaluează sustenabilitatea financiară și rentabilitatea din perspectiva investitorului/operatorului.

## Elemente Cheie

### Costurile de Investiție
- Terenuri și clădiri
- Echipamente și utilaje
- Licențe și software
- Costuri de proiectare
- Contingențe (5-10%)

### Costurile de Operare
- Personal
- Materiale și consumabile
- Utilități
- Întreținere și reparații
- Administrativ

### Veniturile
- Vânzări produse/servicii
- Tarife utilizatori
- Alte venituri operaționale

### Valoarea Reziduală
- La sfârșitul orizontului de analiză
- Metodă: actualizare cashflow viitor

## Indicatori Financiari

### VAN (Valoare Actualizată Netă)
\`\`\`
VAN = Σ (CFt / (1+r)^t) - I₀
\`\`\`
- VAN > 0: Proiect acceptabil
- VAN < 0: Proiect neacceptabil

### RIR (Rata Internă de Rentabilitate)
\`\`\`
Rata la care VAN = 0
\`\`\`
- RIR > Rata de actualizare: Acceptabil

### Raport B/C
\`\`\`
B/C = VAN Beneficii / VAN Costuri
\`\`\`
- B/C > 1: Acceptabil`
          },
          {
            title: 'Analiza economică și sensibilitate',
            type: 'TEXT',
            duration: 30,
            order: 3,
            content: `# Analiza Economică

## Diferența față de Analiza Financiară

### Eliminare transferuri:
- Taxe și impozite
- Subvenții
- Doar resurse reale

### Prețuri umbră
- Ajustare la costul economic real
- Factor de conversie (0.85 pentru RO)

### Externalități
- Beneficii/costuri pentru terți
- Ex: Reducere poluare, timp economisit

## Beneficii Economice Tipice

### Transport:
- Reducere timp călătorie
- Reducere accidente
- Reducere emisii

### Energie:
- Economii consum
- Siguranță alimentare
- Impact climatic

### Social:
- Locuri de muncă
- Acces la servicii
- Calitatea vieții

## Analiza de Sensibilitate

### Ce testează:
- Variația parametrilor cheie
- Impact asupra rezultatelor
- Identificare variabile critice

### Variabile tipice testate:
- Costuri investiție: ±20%
- Costuri operare: ±20%
- Venituri: ±20%
- Beneficii economice: ±30%

### Prezentare rezultate:
| Variabilă | Variație | VAN | Concluzie |
|-----------|----------|-----|-----------|
| Costuri +20% | 120% | X | Robust |
| Venituri -20% | 80% | Y | Sensibil |

## Analiza de Risc

### Identificare riscuri:
- Tehnice
- Financiare
- De implementare
- De operare

### Cuantificare:
- Probabilitate × Impact
- Simulare Monte Carlo (proiecte mari)

### Măsuri de mitigare:
- Pentru fiecare risc major
- Cost măsuri inclus în analiză`
          }
        ]
      }
    ]
  }
];

export default additionalCoursesCompletePart2;
