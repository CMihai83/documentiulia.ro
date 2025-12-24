'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Play, Pause, CheckCircle, BookOpen,
  Clock, Download, FileText, AlertCircle, Lightbulb, ChevronDown,
  ChevronUp, List, X, Volume2, Settings, Maximize
} from 'lucide-react';

// ============================================================================
// COURSE CONTENT DATABASE - Elite Educational Content
// ============================================================================

interface LessonContent {
  id: string;
  title: string;
  duration: number;
  type: 'VIDEO' | 'TEXT' | 'EXERCISE' | 'QUIZ';
  videoPlaceholder: boolean;
  content: {
    introduction: string;
    sections: {
      title: string;
      content: string;
      keyPoints?: string[];
      example?: {
        title: string;
        code?: string;
        explanation: string;
      };
      warning?: string;
      tip?: string;
    }[];
    summary: string[];
    practiceExercise?: {
      title: string;
      description: string;
      steps: string[];
      solution?: string;
    };
    resources?: {
      title: string;
      url: string;
      type: 'PDF' | 'LINK' | 'DOWNLOAD';
    }[];
    quiz?: {
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    }[];
  };
}

interface ModuleContent {
  id: string;
  title: string;
  lessons: LessonContent[];
}

interface CourseContent {
  id: string;
  title: string;
  modules: ModuleContent[];
}

// SAF-T D406 Course - Complete Content
const saftCourse: CourseContent = {
  id: 'c-001',
  title: 'SAF-T D406 - Ghid Complet',
  modules: [
    {
      id: 'm-001',
      title: 'Introducere in SAF-T',
      lessons: [
        {
          id: 'l-001',
          title: 'Ce este SAF-T D406?',
          duration: 10,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Standard Audit File for Tax (SAF-T) reprezinta un standard international de raportare fiscala dezvoltat de OECD, adoptat in Romania prin Ordinul ANAF 1783/2021. Declaratia D406 este implementarea romaneasca a acestui standard, permitand autoritatilor fiscale sa primeasca date contabile standardizate in format XML pentru verificare si audit.`,
            sections: [
              {
                title: 'Definitie si Scop',
                content: `SAF-T D406 este o declaratie informativa lunara care contine date detaliate despre operatiunile contabile ale unei companii. Spre deosebire de declaratiile fiscale traditionale care contin sume agregate, SAF-T transmite date la nivel de tranzactie individuala.

Scopul principal este de a facilita:
- Verificarea incrucisata a datelor intre contribuabili
- Detectarea erorilor si neconcordantelor
- Reducerea evaziunii fiscale
- Simplificarea auditurilor fiscale`,
                keyPoints: [
                  'SAF-T inseamna Standard Audit File for Tax',
                  'D406 este codul declaratiei in nomenclatorul ANAF',
                  'Contine date la nivel de tranzactie, nu agregate',
                  'Format XML standardizat international'
                ],
                tip: 'SAF-T nu inlocuieste declaratiile fiscale existente (D300, D390 etc.) - este o declaratie suplimentara informativa.'
              },
              {
                title: 'Istoric si Adoptare in Romania',
                content: `Romania a adoptat SAF-T prin Ordinul 1783/2021, cu implementare graduala:

**Cronologie:**
- 2021: Publicarea Ordinului 1783/2021
- Ianuarie 2022: Start pentru mari contribuabili
- Ianuarie 2023: Extindere la contribuabili mijlocii
- Ianuarie 2025: Obligatoriu pentru toate firmele platitoare de TVA
- Septembrie 2025 - August 2026: Perioada de gratie (pilot)

Romania este printre primele tari din Europa de Est care implementeaza SAF-T la scara larga.`,
                keyPoints: [
                  'Ordinul 1783/2021 - baza legala',
                  'Implementare graduala pe categorii de contribuabili',
                  'Din ianuarie 2025 obligatoriu pentru toti platitorii de TVA',
                  'Perioada de gratie: sept 2025 - aug 2026'
                ]
              },
              {
                title: 'Cine Trebuie sa Raporteze?',
                content: `**Obligati sa depuna SAF-T D406:**
- Toate persoanele juridice platitoare de TVA
- Persoanele fizice autorizate (PFA) platitoare de TVA
- Intreprinderile individuale (II) platitoare de TVA
- Sucursalele companiilor straine inregistrate in scopuri de TVA

**Exceptii:**
- Microintreprinderile neplatitoare de TVA
- Entitatile in insolventa (cu anumite conditii)
- Institutiile publice (au regim special)`,
                keyPoints: [
                  'Criteriul principal: plata de TVA',
                  'Include PFA si II daca sunt platitori de TVA',
                  'Sucursale straine - da',
                  'Microintreprinderi fara TVA - nu'
                ],
                warning: 'Atentie: Chiar daca firma are TVA la incasare, tot trebuie sa depuna SAF-T!'
              }
            ],
            summary: [
              'SAF-T D406 este o declaratie informativa lunara cu date contabile detaliate',
              'Format XML standardizat conform normelor OECD',
              'Obligatoriu din 2025 pentru toti platitorii de TVA',
              'Nu inlocuieste alte declaratii, este suplimentar',
              'Scopul: transparenta si verificare incrucisata'
            ],
            quiz: [
              {
                question: 'Ce inseamna acronimul SAF-T?',
                options: [
                  'Standard Accounting File for Taxes',
                  'Standard Audit File for Tax',
                  'System for Automated Filing of Taxes',
                  'Standardized Audit Format for Taxation'
                ],
                correct: 1,
                explanation: 'SAF-T = Standard Audit File for Tax, un standard dezvoltat de OECD pentru raportarea fiscala standardizata.'
              },
              {
                question: 'Care este baza legala pentru SAF-T in Romania?',
                options: [
                  'Legea 227/2015',
                  'Ordinul 1783/2021',
                  'Codul Fiscal art. 156',
                  'HG 1/2016'
                ],
                correct: 1,
                explanation: 'Ordinul ANAF 1783/2021 stabileste cadrul legal pentru raportarea SAF-T D406 in Romania.'
              }
            ]
          }
        },
        {
          id: 'l-002',
          title: 'Cadrul Legal - Ordin 1783/2021',
          duration: 10,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Ordinul Presedintelui ANAF nr. 1783/2021 reprezinta cadrul legal complet pentru raportarea SAF-T in Romania. Acest act normativ defineste structura fisierului, termenele de depunere, sanctiunile si toate aspectele tehnice necesare conformarii.`,
            sections: [
              {
                title: 'Structura Ordinului 1783/2021',
                content: `Ordinul este structurat in urmatoarele capitole principale:

**Capitolul I - Dispozitii generale**
- Definitii si termeni
- Scopul raportarii
- Categorii de contribuabili obligati

**Capitolul II - Structura fisierului SAF-T**
- Specificatii tehnice XML
- Campuri obligatorii si optionale
- Reguli de validare

**Capitolul III - Termene si proceduri**
- Termenul de depunere
- Modalitati de transmitere
- Procedura de corectare

**Capitolul IV - Sanctiuni**
- Amenzi pentru nedepunere
- Amenzi pentru erori
- Circumstante atenuante`,
                keyPoints: [
                  '4 capitole principale',
                  'Anexe tehnice detaliate cu schema XML',
                  'Include lista completa a codurilor de eroare',
                  'Actualizat periodic prin ordine ulterioare'
                ]
              },
              {
                title: 'Termene de Depunere',
                content: `**Regula generala:**
SAF-T D406 se depune lunar, pana la data de **25** a lunii urmatoare celei de raportare.

**Exemple:**
- SAF-T pentru ianuarie 2025 → termen: 25 februarie 2025
- SAF-T pentru februarie 2025 → termen: 25 martie 2025
- SAF-T pentru decembrie 2025 → termen: 25 ianuarie 2026

**Exceptii:**
- Daca data de 25 cade in weekend/sarbatoare → prima zi lucratoare urmatoare
- Declaratii rectificative → oricand, dar recomandat cat mai repede

**Important:** Nu exista prelungire automata a termenului!`,
                keyPoints: [
                  'Termen: 25 ale lunii urmatoare',
                  'Nu exista prelungire automata',
                  'Weekend/sarbatoare → prima zi lucratoare',
                  'Rectificativele se pot depune oricand'
                ],
                warning: 'Depasirea termenului atrage amenzi de la 1.000 la 5.000 lei pentru fiecare declaratie!'
              },
              {
                title: 'Sanctiuni si Penalitati',
                content: `**Amenzi pentru nedepunere:**
- Prima abatere: avertisment sau 1.000 - 2.500 lei
- Abateri repetate: 2.500 - 5.000 lei
- Nedepunere peste 90 zile: riscuri suplimentare

**Amenzi pentru erori:**
- Erori minore (sub 1% din valoare): avertisment
- Erori semnificative: 500 - 2.000 lei
- Erori intentionate/frauda: sanctiuni penale posibile

**Circumstante atenuante:**
- Depunere cu intarziere minima (1-5 zile)
- Prima abatere
- Corectare voluntara inainte de control

**Perioada de gratie (sept 2025 - aug 2026):**
In aceasta perioada, sanctiunile sunt suspendate pentru a permite adaptarea.`,
                keyPoints: [
                  'Amenzi: 1.000 - 5.000 lei per declaratie',
                  'Perioada de gratie: sept 2025 - aug 2026',
                  'Corectarea voluntara reduce sanctiunile',
                  'Frauda poate atrage sanctiuni penale'
                ],
                tip: 'Pastrati dovada depunerii (numar de inregistrare SPV) pentru orice eventualitate!'
              }
            ],
            summary: [
              'Ordinul 1783/2021 este cadrul legal complet pentru SAF-T',
              'Termen depunere: 25 ale lunii urmatoare',
              'Amenzi: 1.000 - 5.000 lei pentru nedepunere',
              'Perioada de gratie: sept 2025 - aug 2026',
              'Corectarea voluntara reduce sanctiunile'
            ],
            resources: [
              {
                title: 'Ordinul 1783/2021 - Text integral',
                url: 'https://static.anaf.ro/static/10/Anaf/legislatie/Ordin_1783_2021.pdf',
                type: 'PDF'
              },
              {
                title: 'Ghid ANAF SAF-T',
                url: 'https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_it/saf_t',
                type: 'LINK'
              }
            ]
          }
        },
        {
          id: 'l-003',
          title: 'Cine trebuie sa raporteze?',
          duration: 10,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Identificarea corecta a obligatiei de raportare SAF-T este primul pas catre conformitate. In aceasta lectie vom analiza in detaliu categoriile de contribuabili obligati si exceptiile aplicabile.`,
            sections: [
              {
                title: 'Categorii de Contribuabili Obligati',
                content: `**1. Persoane Juridice Platitoare de TVA**
Toate societatile comerciale (SRL, SA, SNC, SCS) inregistrate in scopuri de TVA, indiferent de cifra de afaceri.

**2. Persoane Fizice Autorizate (PFA)**
PFA-urile care au depasit plafonul de TVA (300.000 lei) si s-au inregistrat ca platitori.

**3. Intreprinderi Individuale (II)**
Similar cu PFA, daca sunt platitoare de TVA.

**4. Sucursale ale Firmelor Straine**
Sucursalele companiilor straine inregistrate fiscal in Romania.

**5. Grupuri Fiscale TVA**
Fiecare membru raporteaza individual.`,
                keyPoints: [
                  'Criteriul cheie: inregistrarea in scopuri de TVA',
                  'Nu conteaza cifra de afaceri',
                  'Nu conteaza forma juridica',
                  'Grupuri fiscale - raportare individuala'
                ]
              },
              {
                title: 'Exceptii de la Raportare',
                content: `**Nu depun SAF-T:**

**1. Microintreprinderi neplatitoare de TVA**
Firmele cu cifra de afaceri sub 500.000 EUR care au optat pentru impozit pe venit si nu sunt inregistrate in scopuri de TVA.

**2. Entitati in insolventa**
Cu conditia sa fi notificat ANAF despre starea de insolventa.

**3. Institutii publice**
Au regim special de raportare.

**4. Asociatii si fundatii**
Daca nu desfasoara activitati economice si nu sunt platitoare de TVA.

**5. Firme radiate/dizolvate**
Din luna urmatoare radierii.`,
                keyPoints: [
                  'Microintreprinderi fara TVA - exceptate',
                  'Insolventa - cu notificare ANAF',
                  'Institutii publice - regim special',
                  'ONG-uri fara activitate economica - exceptate'
                ],
                warning: 'Atentie: TVA la incasare NU este exceptie! Daca aveti TVA la incasare, tot trebuie sa raportati SAF-T.'
              },
              {
                title: 'Verificarea Obligatiei Proprii',
                content: `**Cum verifici daca trebuie sa depui SAF-T:**

**Pasul 1:** Verificati inregistrarea in scopuri de TVA
- SPV → Servicii → Informatii contribuabil
- Sau: verificati codul fiscal - daca incepe cu "RO", sunteti platitor TVA

**Pasul 2:** Verificati categoria de contribuabil
- Mari contribuabili: obligatie din 2022
- Contribuabili mijlocii: obligatie din 2023
- Toti platitorii TVA: obligatie din 2025

**Pasul 3:** Verificati exceptiile
- Insolventa declarata?
- Institutie publica?
- ONG fara activitate economica?

**Daca raspunsul la toate intrebarile de la Pasul 3 este NU si sunteti platitor TVA → trebuie sa depuneti SAF-T.**`,
                keyPoints: [
                  'Verificati codul fiscal - prefix RO = platitor TVA',
                  'Verificati in SPV statusul fiscal',
                  'Mari contribuabili obligati din 2022',
                  'Din 2025 toti platitorii TVA'
                ],
                example: {
                  title: 'Exemplu de verificare',
                  explanation: `**Compania ABC SRL**
- CUI: RO12345678 (prefix RO = platitor TVA) ✓
- Nu este in insolventa ✓
- Nu este institutie publica ✓

**Concluzie:** ABC SRL trebuie sa depuna SAF-T D406 lunar.`
                }
              }
            ],
            summary: [
              'Obligati: toti platitorii de TVA (persoane juridice si fizice)',
              'Exceptii: microintreprinderi fara TVA, entitati in insolventa, institutii publice',
              'TVA la incasare NU este exceptie',
              'Verificati statusul in SPV pentru clarificare',
              'Din 2025 obligatia este generala pentru platitorii TVA'
            ],
            practiceExercise: {
              title: 'Exercitiu: Identifica obligatia SAF-T',
              description: 'Pentru fiecare situatie, determina daca entitatea trebuie sa depuna SAF-T:',
              steps: [
                'SRL cu cifra de afaceri 50.000 EUR, platitor TVA',
                'PFA cu venituri de 200.000 lei, neplatitor TVA',
                'SA in reorganizare judiciara, platitor TVA',
                'ONG care organizeaza cursuri cu plata, platitor TVA',
                'Microintreprindere cu cifra afaceri 400.000 EUR, neplatitor TVA'
              ],
              solution: `1. DA - este platitor TVA
2. NU - nu este platitor TVA
3. DA - reorganizarea nu este exceptie, doar insolventa cu lichidare
4. DA - are activitate economica si plateste TVA
5. NU - nu este platitor TVA (chiar daca depaseste pragul de microintreprindere)`
            }
          }
        }
      ]
    },
    {
      id: 'm-002',
      title: 'Structura Fisierului XML',
      lessons: [
        {
          id: 'l-004',
          title: 'Sectiunile principale ale SAF-T',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Fisierul SAF-T D406 este un document XML complex, structurat in sectiuni logice. Intelegerea acestei structuri este esentiala pentru generarea corecta a fisierului si pentru diagnosticarea erorilor.`,
            sections: [
              {
                title: 'Arhitectura Generala',
                content: `Fisierul SAF-T este organizat ierarhic in urmatoarele sectiuni principale:

**1. Header (Antet)**
Informatii despre fisier si companie.

**2. MasterFiles (Fisiere Master)**
Date de referinta: plan de conturi, parteneri, produse.

**3. GeneralLedgerEntries (Registru Jurnal)**
Inregistrarile contabile propriu-zise.

**4. SourceDocuments (Documente Sursa)**
Facturi emise, facturi primite, plati.

Fiecare sectiune are subsectiuni detaliate cu campuri obligatorii si optionale.`,
                keyPoints: [
                  'Structura ierarhica XML',
                  '4 sectiuni principale',
                  'Header + MasterFiles + GeneralLedger + SourceDocuments',
                  'Fiecare sectiune are reguli specifice'
                ],
                example: {
                  title: 'Structura de baza XML',
                  code: `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Taxation/2.00">
  <Header>
    <!-- Informatii companie si perioada -->
  </Header>
  <MasterFiles>
    <!-- Plan conturi, parteneri, produse -->
  </MasterFiles>
  <GeneralLedgerEntries>
    <!-- Inregistrari contabile -->
  </GeneralLedgerEntries>
  <SourceDocuments>
    <!-- Facturi, plati -->
  </SourceDocuments>
</AuditFile>`,
                  explanation: 'Aceasta este structura de baza a oricarui fisier SAF-T. Fiecare element are subsectiuni detaliate.'
                }
              },
              {
                title: 'Sectiunea Header',
                content: `Header-ul contine metadate esentiale despre fisier:

**Campuri obligatorii:**
- **TaxRegistrationNumber**: CUI-ul companiei (fara RO)
- **CompanyName**: Denumirea oficiala
- **CompanyAddress**: Adresa sediului social
- **FiscalYear**: Anul fiscal
- **StartDate / EndDate**: Perioada raportata
- **DateCreated**: Data generarii fisierului
- **SoftwareCompanyName**: Producatorul softului
- **SoftwareID**: Numele aplicatiei
- **SoftwareVersion**: Versiunea aplicatiei

**Campuri optionale:**
- TaxAccountingBasis: Baza de contabilitate (CASH/INVOICE)
- Contact: Persoana de contact
- Email: Email contact`,
                keyPoints: [
                  'CUI fara prefix RO',
                  'Perioada trebuie sa fie o luna calendaristica completa',
                  'Software-ul trebuie declarat',
                  'Data crearii = data generarii fisierului'
                ],
                example: {
                  title: 'Exemplu Header',
                  code: `<Header>
  <TaxRegistrationNumber>12345678</TaxRegistrationNumber>
  <CompanyName>EXEMPLU SRL</CompanyName>
  <CompanyAddress>
    <StreetName>Strada Exemplu</StreetName>
    <Number>10</Number>
    <City>Bucuresti</City>
    <PostalCode>010101</PostalCode>
    <Country>RO</Country>
  </CompanyAddress>
  <FiscalYear>2025</FiscalYear>
  <StartDate>2025-01-01</StartDate>
  <EndDate>2025-01-31</EndDate>
  <DateCreated>2025-02-15</DateCreated>
  <SoftwareCompanyName>DocumentIulia</SoftwareCompanyName>
  <SoftwareID>DocIulia ERP</SoftwareID>
  <SoftwareVersion>2.5</SoftwareVersion>
</Header>`,
                  explanation: 'Header-ul identifica compania si perioada. Toate datele trebuie sa fie consistente cu cele din SPV.'
                },
                warning: 'CUI-ul din Header trebuie sa coincida exact cu cel din certificatul digital folosit la transmitere!'
              },
              {
                title: 'Sectiunea MasterFiles',
                content: `MasterFiles contine toate datele de referinta folosite in tranzactii:

**GeneralLedgerAccounts (Plan de Conturi)**
- Toate conturile contabile folosite
- Trebuie sa includa: AccountID, AccountDescription, AccountType
- Mapare la planul de conturi ANAF

**Customers (Clienti)**
- Toti clientii cu tranzactii in perioada
- CUI/CNP, denumire, adresa
- Identificator unic intern

**Suppliers (Furnizori)**
- Toti furnizorii cu tranzactii
- Aceleasi informatii ca la clienti

**Products (Produse)**
- Coduri de produs
- Descrieri
- Unitati de masura`,
                keyPoints: [
                  'Planul de conturi trebuie mapat la ANAF',
                  'Toti partenerii cu tranzactii trebuie inclusi',
                  'Identificatorii trebuie sa fie unici si consistenti',
                  'Produsele sunt optionale dar recomandate'
                ],
                tip: 'Asigurati-va ca folositi aceiasi identificatori pentru clienti/furnizori in toate sectiunile fisierului!'
              }
            ],
            summary: [
              'SAF-T are 4 sectiuni: Header, MasterFiles, GeneralLedger, SourceDocuments',
              'Header-ul identifica compania si perioada',
              'MasterFiles contine date de referinta (conturi, parteneri)',
              'Campurile obligatorii sunt strict verificate',
              'Consistenta datelor intre sectiuni este esentiala'
            ]
          }
        },
        {
          id: 'l-005',
          title: 'Header si Company Info',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Sectiunea Header este cartea de vizita a fisierului SAF-T. Erorile in aceasta sectiune sunt cele mai frecvente cauze de respingere a declaratiei. Vom analiza in detaliu fiecare camp si regulile de completare.`,
            sections: [
              {
                title: 'Identificarea Companiei',
                content: `**TaxRegistrationNumber (CUI)**
- Format: doar cifre, fara prefix RO
- Exemplu corect: 12345678
- Exemplu gresit: RO12345678

**CompanyName**
- Denumirea exacta din Registrul Comertului
- Nu abreviatii neoficiale
- Atentie la diacritice: folositi caractere corecte

**TaxEntity**
- "Societate comerciala" pentru SRL/SA
- "Persoana fizica autorizata" pentru PFA
- Conform clasificarii ANAF`,
                keyPoints: [
                  'CUI fara RO',
                  'Denumire identica cu Registrul Comertului',
                  'TaxEntity conform clasificarii oficiale'
                ],
                warning: 'O greseala frecventa: CUI cu RO sau spatii. Validatorul va respinge instant!'
              },
              {
                title: 'Adresa Sediului Social',
                content: `**Structura adresei:**

**StreetName** - Numele strazii (fara numar)
**Number** - Numarul
**Building** - Bloc (optional)
**Entrance** - Scara (optional)
**Floor** - Etaj (optional)
**Room** - Apartament (optional)
**City** - Localitatea
**PostalCode** - Codul postal
**Region** - Judetul (cod SIRUTA)
**Country** - RO (fix)

**Reguli importante:**
- Adresa trebuie sa coincida cu cea din ONRC
- Judetul se raporteaza cu codul SIRUTA, nu cu numele
- Codul postal trebuie valid`,
                keyPoints: [
                  'Adresa identica cu ONRC',
                  'Judet = cod SIRUTA',
                  'Cod postal obligatoriu si valid',
                  'Country = RO (fix)'
                ],
                example: {
                  title: 'Exemplu Adresa Corecta',
                  code: `<CompanyAddress>
  <StreetName>Bulevardul Unirii</StreetName>
  <Number>45</Number>
  <Building>Bl. A1</Building>
  <Entrance>Sc. 2</Entrance>
  <Floor>3</Floor>
  <Room>Ap. 15</Room>
  <City>Bucuresti Sector 3</City>
  <PostalCode>030167</PostalCode>
  <Region>403</Region>
  <Country>RO</Country>
</CompanyAddress>`,
                  explanation: 'Codul 403 reprezinta Sectorul 3 Bucuresti in nomenclatorul SIRUTA.'
                }
              },
              {
                title: 'Perioada de Raportare',
                content: `**FiscalYear**
Anul fiscal (de obicei = anul calendaristic).

**StartDate / EndDate**
- Intotdeauna o luna calendaristica completa
- Format: YYYY-MM-DD
- StartDate = prima zi a lunii
- EndDate = ultima zi a lunii

**CurrencyCode**
- Moneda principala: RON
- Alte monede acceptate pentru operatiuni specifice

**SelectionCriteria**
- Criteriul de selectie a datelor
- De obicei: "Toate tranzactiile din perioada"`,
                keyPoints: [
                  'Perioada = o luna completa',
                  'Format data: YYYY-MM-DD',
                  'Moneda principala: RON',
                  'Nu se accepta perioade partiale'
                ],
                example: {
                  title: 'Perioada Ianuarie 2025',
                  code: `<FiscalYear>2025</FiscalYear>
<StartDate>2025-01-01</StartDate>
<EndDate>2025-01-31</EndDate>
<CurrencyCode>RON</CurrencyCode>`,
                  explanation: 'Ianuarie 2025 incepe in 01.01 si se termina in 31.01 (31 zile).'
                },
                warning: 'O luna partiala (ex: 15.01 - 31.01) va fi respinsa! Raportati intotdeauna luna completa.'
              }
            ],
            summary: [
              'CUI fara prefix RO si fara spatii',
              'Denumirea exacta din Registrul Comertului',
              'Adresa conforma cu ONRC, judet cu cod SIRUTA',
              'Perioada = luna calendaristica completa',
              'Toate datele trebuie consistente cu SPV'
            ],
            practiceExercise: {
              title: 'Verifica Header-ul',
              description: 'Gaseste erorile in urmatorul Header:',
              steps: [
                'TaxRegistrationNumber: RO 12345678',
                'CompanyName: EXEMPLU srl',
                'StartDate: 2025-01-15',
                'EndDate: 2025-02-14',
                'Region: Bucuresti'
              ],
              solution: `Erori identificate:
1. CUI contine "RO " - trebuie doar cifre
2. "srl" cu litere mici - trebuie "SRL"
3. StartDate nu e prima zi a lunii
4. EndDate e in alta luna - perioada invalida
5. Region trebuie sa fie cod SIRUTA (ex: 403), nu text`
            }
          }
        },
        {
          id: 'l-006',
          title: 'General Ledger Entries',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `GeneralLedgerEntries este inima fisierului SAF-T - contine toate inregistrarile contabile din perioada raportata. Aceasta sectiune trebuie sa reflecte fidel Registrul Jurnal al companiei.`,
            sections: [
              {
                title: 'Structura Inregistrarilor',
                content: `Fiecare inregistrare contabila (Journal Entry) contine:

**JournalID** - Identificatorul jurnalului
**Description** - Descrierea jurnalului
**Type** - Tipul jurnalului
**Transaction** - Tranzactiile individuale

**Pentru fiecare Transaction:**
- TransactionID: ID unic
- Period: Luna (1-12)
- TransactionDate: Data inregistrarii
- Description: Explicatia
- SystemEntryDate: Data introducerii in sistem
- GLPostingDate: Data postarii in GL
- Lines: Liniile (debit/credit)`,
                keyPoints: [
                  'JournalID identifica tipul de jurnal',
                  'Fiecare tranzactie are ID unic',
                  'Period = luna (1-12)',
                  'Lines = detaliile debit/credit'
                ],
                example: {
                  title: 'Structura unei tranzactii',
                  code: `<Transaction>
  <TransactionID>TRX-2025-001234</TransactionID>
  <Period>01</Period>
  <TransactionDate>2025-01-15</TransactionDate>
  <Description>Factura furnizor ABC SRL</Description>
  <SystemEntryDate>2025-01-15T10:30:00</SystemEntryDate>
  <GLPostingDate>2025-01-15</GLPostingDate>
  <Lines>
    <DebitLine>...</DebitLine>
    <CreditLine>...</CreditLine>
  </Lines>
</Transaction>`,
                  explanation: 'Fiecare tranzactie reprezinta o nota contabila cu toate liniile sale.'
                }
              },
              {
                title: 'Linii Debit si Credit',
                content: `Fiecare linie (DebitLine/CreditLine) contine:

**RecordID** - ID unic al liniei
**AccountID** - Contul contabil
**SourceDocumentID** - Legatura la document sursa
**CustomerID/SupplierID** - Partenerul (daca e cazul)
**Description** - Descrierea liniei
**Amount** - Suma
**TaxInformation** - Informatii TVA (daca e cazul)

**Regula fundamentala:**
Total Debit = Total Credit (pentru fiecare tranzactie)`,
                keyPoints: [
                  'Fiecare linie are RecordID unic',
                  'AccountID trebuie sa existe in MasterFiles',
                  'Debit = Credit pentru fiecare tranzactie',
                  'TaxInformation obligatoriu pentru conturi de TVA'
                ],
                example: {
                  title: 'Exemplu: Inregistrare factura primita',
                  code: `<Lines>
  <DebitLine>
    <RecordID>L001</RecordID>
    <AccountID>401</AccountID>
    <SourceDocumentID>FZ-001234</SourceDocumentID>
    <SupplierID>SUP-001</SupplierID>
    <Description>Servicii consultanta</Description>
    <Amount>1000.00</Amount>
  </DebitLine>
  <DebitLine>
    <RecordID>L002</RecordID>
    <AccountID>4426</AccountID>
    <Description>TVA deductibil 19%</Description>
    <Amount>190.00</Amount>
    <TaxInformation>
      <TaxType>TVA</TaxType>
      <TaxCode>S19</TaxCode>
      <TaxAmount>190.00</TaxAmount>
    </TaxInformation>
  </DebitLine>
  <CreditLine>
    <RecordID>L003</RecordID>
    <AccountID>401</AccountID>
    <SupplierID>SUP-001</SupplierID>
    <Description>Furnizor ABC</Description>
    <Amount>1190.00</Amount>
  </CreditLine>
</Lines>`,
                  explanation: 'Inregistrare pentru servicii 1000 lei + TVA 19% = 1190 lei. Debit 628+4426 = Credit 401.'
                },
                warning: 'Daca Total Debit ≠ Total Credit, fisierul va fi respins cu eroare de balanta!'
              },
              {
                title: 'Tipuri de Jurnale',
                content: `SAF-T accepta urmatoarele tipuri de jurnale:

**Jurnale standard:**
- **Vanzari (Sales)**: Facturi emise
- **Cumparari (Purchases)**: Facturi primite
- **Banca (Bank)**: Operatiuni bancare
- **Casa (Cash)**: Operatiuni numerar
- **Diverse (General)**: Alte operatiuni

**Jurnale speciale:**
- **Salarii (Payroll)**: Operatiuni salariale
- **Imobilizari (Assets)**: Amortizari, reevaluari
- **Inchidere (Closing)**: Operatiuni de inchidere

Fiecare tip de jurnal are un JournalID specific.`,
                keyPoints: [
                  '5 tipuri principale: Vanzari, Cumparari, Banca, Casa, Diverse',
                  'Jurnale speciale pentru salarii, imobilizari',
                  'JournalID identifica tipul',
                  'Fiecare jurnal grupeaza tranzactii similare'
                ],
                tip: 'Organizati tranzactiile pe jurnale pentru o verificare mai usoara. Nu amestecati tipuri diferite in acelasi jurnal!'
              }
            ],
            summary: [
              'GeneralLedgerEntries = toate inregistrarile contabile',
              'Fiecare tranzactie are linii Debit si Credit',
              'Total Debit = Total Credit (obligatoriu)',
              'AccountID trebuie sa existe in MasterFiles',
              'Jurnale separate pentru tipuri diferite de operatiuni'
            ]
          }
        }
      ]
    },
    {
      id: 'm-003',
      title: 'Maparea Datelor',
      lessons: [
        {
          id: 'l-007',
          title: 'Planul de conturi si SAF-T',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Maparea planului de conturi propriu la planul de conturi SAF-T este una dintre cele mai importante etape. ANAF accepta planul de conturi general romanesc, dar fiecare cont trebuie clasificat corect pentru raportare.`,
            sections: [
              {
                title: 'Planul de Conturi General Romanesc',
                content: `Romania foloseste planul de conturi general aprobat prin OMFP 1802/2014:

**Clasa 1 - Conturi de capitaluri**
101 Capital social, 106 Rezerve, 117 Rezultatul reportat

**Clasa 2 - Conturi de imobilizari**
211 Terenuri, 212 Constructii, 214 Echipamente

**Clasa 3 - Conturi de stocuri**
301 Materii prime, 345 Produse finite, 371 Marfuri

**Clasa 4 - Conturi de terti**
401 Furnizori, 411 Clienti, 421 Personal

**Clasa 5 - Conturi de trezorerie**
512 Conturi la banci, 531 Casa

**Clasa 6 - Conturi de cheltuieli**
601-628 Cheltuieli operationale

**Clasa 7 - Conturi de venituri**
701-758 Venituri operationale`,
                keyPoints: [
                  '7 clase de conturi',
                  'OMFP 1802/2014 - baza legala',
                  'Fiecare clasa are rol specific',
                  'SAF-T foloseste acelasi plan'
                ]
              },
              {
                title: 'Clasificarea Conturilor in SAF-T',
                content: `Pentru SAF-T, fiecare cont trebuie clasificat dupa:

**AccountType (Tipul contului):**
- **Asset**: Active (clase 1-3, 5)
- **Liability**: Pasive (401, 421, etc.)
- **Equity**: Capitaluri proprii (clasa 1)
- **Revenue**: Venituri (clasa 7)
- **Expense**: Cheltuieli (clasa 6)

**StandardAccountID (Mapare ANAF):**
Codul contului din planul general.

**GroupingCategory:**
- Current / Non-current
- Operating / Financial

**GroupingCode:**
Subgruparea contului (ex: 401 = Furnizori).`,
                keyPoints: [
                  '5 tipuri principale: Asset, Liability, Equity, Revenue, Expense',
                  'StandardAccountID = codul din planul general',
                  'Clasificarea afecteaza validarea',
                  'Erori de clasificare = respingere'
                ],
                example: {
                  title: 'Mapare cont 411 Clienti',
                  code: `<Account>
  <AccountID>411</AccountID>
  <AccountDescription>Clienti</AccountDescription>
  <StandardAccountID>411</StandardAccountID>
  <AccountType>Asset</AccountType>
  <GroupingCategory>Current</GroupingCategory>
  <GroupingCode>ReceivablesCustomers</GroupingCode>
  <OpeningDebitBalance>50000.00</OpeningDebitBalance>
  <ClosingDebitBalance>75000.00</ClosingDebitBalance>
</Account>`,
                  explanation: 'Contul 411 este Asset (activ), Current (curent), grupat la Receivables (creante clienti).'
                }
              },
              {
                title: 'Erori Frecvente de Mapare',
                content: `**1. Clasificare gresita a tipului**
- 401 marcat ca Asset in loc de Liability
- Solutie: Furnizorii sunt intotdeauna Liability

**2. StandardAccountID lipsa sau gresit**
- Nu coincide cu codul real
- Solutie: Folositi exact codul din balanta

**3. Solduri inconsistente**
- Opening balance din luna curenta ≠ Closing balance din luna anterioara
- Solutie: Verificati continuitatea soldurilor

**4. Conturi sintetice vs analitice**
- Raportati conturi prea detaliate
- Solutie: Raportati la nivel sintetic (411, nu 411.01.001)

**5. Caractere speciale in descrieri**
- &, <, > in AccountDescription
- Solutie: Folositi escape XML (&amp; etc.)`,
                keyPoints: [
                  'Furnizorii (4xx) sunt Liability',
                  'Clientii (411) sunt Asset',
                  'Solduri continue luna-luna',
                  'Nivel sintetic, nu analitic',
                  'Escape caractere speciale'
                ],
                warning: 'Opening Balance luna curenta TREBUIE = Closing Balance luna anterioara!'
              }
            ],
            summary: [
              'Planul de conturi romanesc (OMFP 1802) este baza',
              '5 tipuri de conturi: Asset, Liability, Equity, Revenue, Expense',
              'Maparea corecta previne respingerea fisierului',
              'Soldurile trebuie sa fie continue',
              'Raportati la nivel sintetic'
            ]
          }
        },
        {
          id: 'l-008',
          title: 'Tipuri de documente',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Fiecare document sursa din SAF-T trebuie clasificat corect folosind codurile standard. Aceasta clasificare permite ANAF sa inteleaga natura tranzactiei si sa efectueze verificari incrucisate.`,
            sections: [
              {
                title: 'Coduri de Documente SAF-T',
                content: `SAF-T foloseste coduri standard pentru tipuri de documente:

**Facturi:**
- **SI**: Sales Invoice (Factura emisa)
- **SC**: Sales Credit Note (Factura de stornare emisa)
- **PI**: Purchase Invoice (Factura primita)
- **PC**: Purchase Credit Note (Factura de stornare primita)

**Documente de plata:**
- **RV**: Receipt Voucher (Chitanta incasare)
- **PV**: Payment Voucher (Ordin de plata)
- **BP**: Bank Payment (Plata bancara)
- **BR**: Bank Receipt (Incasare bancara)

**Alte documente:**
- **JE**: Journal Entry (Nota contabila)
- **AD**: Adjustment Document (Document de ajustare)
- **OT**: Other (Altele)`,
                keyPoints: [
                  'SI/PI pentru facturi normale',
                  'SC/PC pentru stornari',
                  'RV/PV pentru numerar',
                  'BP/BR pentru operatiuni bancare'
                ]
              },
              {
                title: 'Maparea Documentelor Interne',
                content: `Trebuie sa mapati documentele interne la codurile SAF-T:

**Document intern → Cod SAF-T**
- Factura fiscala emisa → SI
- Factura de stornare emisa → SC
- Factura furnizor → PI
- Nota de credit primita → PC
- Chitanta incasare → RV
- Dispozitie de plata → PV
- Extras de cont incasare → BR
- Extras de cont plata → BP
- Nota contabila → JE

**Atentie la documentele speciale:**
- Autofactura → SI (cu mentiune speciala)
- Factura simplificata → SI
- Bon fiscal → poate fi agregat sau individual`,
                keyPoints: [
                  'Maparea trebuie sa fie consistenta',
                  'Un document intern = un cod SAF-T',
                  'Autofacturile sunt tot SI',
                  'Bonurile fiscale se pot agrega'
                ],
                example: {
                  title: 'Exemplu mapare documente',
                  code: `// In configuratia soft:
const documentMapping = {
  'FACTURA_EMISA': 'SI',
  'FACTURA_STORNARE': 'SC',
  'FACTURA_FURNIZOR': 'PI',
  'NOTA_CREDIT_FURNIZOR': 'PC',
  'CHITANTA': 'RV',
  'OP': 'PV',
  'EXTRAS_BANCA_INC': 'BR',
  'EXTRAS_BANCA_PL': 'BP',
  'NC': 'JE'
};`,
                  explanation: 'Aceasta mapare trebuie configurata in software-ul contabil pentru generare automata corecta.'
                }
              },
              {
                title: 'Reguli de Numerotare',
                content: `**SourceDocumentID** trebuie sa fie unic si consistent:

**Reguli obligatorii:**
- Unicitate in cadrul tipului de document
- Consistenta cu numerotarea interna
- Format: prefix + numar (ex: FV-2025-001234)

**Bune practici:**
- Includeti anul in numar
- Folositi zero-padding (001 nu 1)
- Prefix diferit per tip document
- Nu schimbati formatul in timpul anului

**Erori de evitat:**
- Duplicate SourceDocumentID
- Lacune mari in numerotare
- Numere negative sau zero
- Caractere speciale in ID`,
                keyPoints: [
                  'SourceDocumentID unic per tip',
                  'Include anul in numar',
                  'Format consistent tot anul',
                  'Nu duplicate, nu lacune mari'
                ],
                warning: 'Duplicate SourceDocumentID = respingere automata a fisierului!'
              }
            ],
            summary: [
              'Coduri standard: SI, PI, SC, PC pentru facturi',
              'BP, BR, PV, RV pentru operatiuni monetare',
              'JE pentru note contabile',
              'Mapare consistenta document intern → cod SAF-T',
              'SourceDocumentID unic si consistent'
            ]
          }
        },
        {
          id: 'l-009',
          title: 'Parteneri si clienti',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Sectiunea MasterFiles include listele de Customers (Clienti) si Suppliers (Furnizori). Aceste liste sunt esentiale pentru verificarile incrucisate pe care ANAF le efectueaza intre contribuabili.`,
            sections: [
              {
                title: 'Structura Datelor de Parteneri',
                content: `**Pentru fiecare Client/Furnizor:**

**CustomerID/SupplierID**
Identificator intern unic (ex: CLI-001, FRN-001)

**RegistrationNumber**
- CUI pentru persoane juridice romane
- CNP pentru persoane fizice romane
- VAT ID pentru parteneri UE
- Tax ID pentru parteneri non-UE

**Name**
Denumirea oficiala completa

**Address**
Adresa completa (acelasi format ca la companie)

**Contact**
Persoana de contact, telefon, email

**BankAccount**
IBAN-ul principal (optional dar recomandat)`,
                keyPoints: [
                  'ID intern unic si consistent',
                  'CUI/CNP/VAT ID obligatoriu',
                  'Denumire oficiala (nu prescurtari)',
                  'Adresa completa'
                ]
              },
              {
                title: 'Validarea CUI/VAT',
                content: `**Validare CUI romanesc:**
- Format: 8 cifre (fara RO)
- Cifra de control corecta
- Verificare in baza ANAF

**Validare VAT UE:**
- Prefix tara (2 litere)
- Format national (variabil)
- Verificare in VIES

**Validare CNP:**
- 13 cifre
- Prima cifra: 1-8
- Cifra de control corecta

**Ce facem cu parteneri invalizi?**
- Persoane fizice fara CNP → cod intern
- Parteneri straini non-UE → tax ID national
- Parteneri ocazionali → pot fi agregati`,
                keyPoints: [
                  'CUI romanesc: 8 cifre, cifra control',
                  'VAT UE: prefix tara + numar national',
                  'CNP: 13 cifre, validare completa',
                  'Parteneri invalizi → cod intern special'
                ],
                example: {
                  title: 'Exemplu Client',
                  code: `<Customer>
  <CustomerID>CLI-00123</CustomerID>
  <RegistrationNumber>12345678</RegistrationNumber>
  <Name>CLIENTUL MEU SRL</Name>
  <Address>
    <StreetName>Str. Comerciantului</StreetName>
    <Number>15</Number>
    <City>Cluj-Napoca</City>
    <PostalCode>400001</PostalCode>
    <Region>112</Region>
    <Country>RO</Country>
  </Address>
  <Contact>
    <ContactPerson>Ion Popescu</ContactPerson>
    <Telephone>0264123456</Telephone>
    <Email>contact@clientulmeu.ro</Email>
  </Contact>
</Customer>`,
                  explanation: 'Structura completa a unui client cu toate datele necesare.'
                }
              },
              {
                title: 'Verificari Incrucisate ANAF',
                content: `ANAF compara datele intre contribuabili:

**Ce verifica ANAF:**
- Factura emisa de A = Factura primita de B
- CUI-urile coincid
- Sumele coincid (cu toleranta mica)
- Datele coincid (cu toleranta 1-2 zile)

**Cauze frecvente de neconcordante:**
- CUI gresit la partener
- Suma diferita (erori de rotunjire)
- Data diferita (emitere vs primire)
- Document lipsa la unul din parteneri

**Cum sa evitati problemele:**
- Validati CUI-ul inainte de facturare
- Folositi aceeasi suma exact
- Comunicati data corecta
- Arhivati toate documentele`,
                keyPoints: [
                  'ANAF compara facturi emise cu cele primite',
                  'Toleranta mica pentru sume si date',
                  'CUI gresit = neconcordanta',
                  'Verificati CUI inainte de facturare'
                ],
                warning: 'Neconcordantele frecvente pot declansa inspectie fiscala!'
              }
            ],
            summary: [
              'Partenerii trebuie identificati cu CUI/CNP/VAT valid',
              'ID intern unic si consistent in tot fisierul',
              'Adresa completa conform ONRC',
              'ANAF verifica incrucisatdate intre contribuabili',
              'Validati CUI inainte de facturare'
            ]
          }
        }
      ]
    },
    {
      id: 'm-004',
      title: 'Validare si Transmitere',
      lessons: [
        {
          id: 'l-010',
          title: 'DUKIntegrator - Instalare si Configurare',
          duration: 20,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `DUKIntegrator este aplicatia oficiala ANAF pentru validarea fisierelor SAF-T. Este obligatoriu sa validati fisierul local inainte de transmitere pentru a evita respingerea in SPV.`,
            sections: [
              {
                title: 'Despre DUKIntegrator',
                content: `**Ce este DUKIntegrator?**
Aplicatie Java gratuita dezvoltata de ANAF pentru:
- Validarea structurii XML
- Verificarea regulilor de business
- Semnarea electronica a fisierelor
- Compresia pentru transmitere

**Cerinte sistem:**
- Windows 7+ / Linux / macOS
- Java Runtime Environment 8+
- Minimum 4 GB RAM
- Spatiu disk: 500 MB + spatiu pentru fisiere

**Unde se descarca:**
Portal ANAF → Servicii online → SAF-T → DUKIntegrator`,
                keyPoints: [
                  'Aplicatie oficiala ANAF gratuita',
                  'Validare + semnare + compresie',
                  'Necesita Java 8+',
                  'Disponibil pe anaf.ro'
                ]
              },
              {
                title: 'Instalare Pas cu Pas',
                content: `**Pasul 1: Verificati Java**
\`\`\`
java -version
\`\`\`
Trebuie sa vedeti versiunea 8 sau mai mare.

**Pasul 2: Descarcati DUKIntegrator**
- Accesati anaf.ro → Servicii → SAF-T
- Descarcati ultima versiune (.zip)
- Dezarhivati intr-un folder dedicat

**Pasul 3: Configurare initiala**
- Deschideti fisierul config.properties
- Setati calea catre certificatul digital
- Setati parola certificatului

**Pasul 4: Testare**
\`\`\`
java -jar DUKIntegrator.jar --help
\`\`\`
Trebuie sa vedeti optiunile disponibile.`,
                keyPoints: [
                  'Java 8+ obligatoriu',
                  'Descarcati de pe anaf.ro',
                  'Configurati certificatul digital',
                  'Testati cu --help'
                ],
                example: {
                  title: 'Fisier config.properties',
                  code: `# Configurare DUKIntegrator
certificate.path=C:/certificates/certificat_anaf.pfx
certificate.password=parolaCertificat123
output.directory=C:/saft/validated
log.level=INFO
validation.strict=true`,
                  explanation: 'Exemplu de configurare pentru certificat si directoare.'
                }
              },
              {
                title: 'Validarea Fisierelor',
                content: `**Comanda de validare:**
\`\`\`
java -jar DUKIntegrator.jar -validate -input fisier_saft.xml
\`\`\`

**Rezultate posibile:**

**VALID** - Fisierul este corect
- Puteti transmite in SPV
- Salvati raportul de validare

**INVALID** - Fisierul contine erori
- Cititi lista de erori
- Corectati fiecare eroare
- Revalidati

**Optiuni utile:**
- \`-output raport.html\` - Export raport HTML
- \`-verbose\` - Detalii suplimentare
- \`-sign\` - Semneaza dupa validare`,
                keyPoints: [
                  '-validate pentru validare',
                  'VALID = gata de transmitere',
                  'INVALID = cititi erorile',
                  '-sign pentru semnare automata'
                ],
                warning: 'Nu transmiteti NICIODATA un fisier fara validare prealabila cu DUKIntegrator!'
              }
            ],
            summary: [
              'DUKIntegrator este tool-ul oficial ANAF',
              'Necesita Java 8+ si certificat digital',
              'Validati intotdeauna inainte de transmitere',
              'VALID = gata, INVALID = corectati',
              'Salvati rapoartele de validare'
            ],
            resources: [
              {
                title: 'Download DUKIntegrator',
                url: 'https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_it/saf_t',
                type: 'LINK'
              },
              {
                title: 'Ghid utilizare DUKIntegrator',
                url: 'https://static.anaf.ro/static/10/Anaf/Informatii_R/DUKIntegrator_Manual.pdf',
                type: 'PDF'
              }
            ]
          }
        },
        {
          id: 'l-011',
          title: 'Erori frecvente si solutii',
          duration: 20,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Dupa validarea cu DUKIntegrator, puteti intalni diverse erori. In aceasta lectie vom analiza cele mai frecvente erori si solutiile lor.`,
            sections: [
              {
                title: 'Erori de Structura XML',
                content: `**ERR-001: Invalid XML structure**
Cauza: Tag-uri XML inchise gresit
Solutie: Verificati ca fiecare <tag> are </tag>

**ERR-002: Missing required element**
Cauza: Camp obligatoriu lipsa
Solutie: Adaugati elementul lipsa

**ERR-003: Invalid namespace**
Cauza: Namespace XML incorect
Solutie: Folositi namespace-ul corect OECD

**ERR-004: Invalid date format**
Cauza: Data nu e in format YYYY-MM-DD
Solutie: Convertiti toate datele la ISO 8601`,
                keyPoints: [
                  'XML valid = tag-uri inchise corect',
                  'Toate campurile obligatorii prezente',
                  'Namespace OECD corect',
                  'Date in format ISO (YYYY-MM-DD)'
                ],
                example: {
                  title: 'Eroare namespace gresit',
                  code: `<!-- GRESIT -->
<AuditFile xmlns="urn:wrong:namespace">

<!-- CORECT -->
<AuditFile xmlns="urn:OECD:StandardAuditFile-Taxation/2.00">`,
                  explanation: 'Namespace-ul trebuie sa fie exact cel specificat de OECD/ANAF.'
                }
              },
              {
                title: 'Erori de Date',
                content: `**ERR-101: Invalid TaxRegistrationNumber**
Cauza: CUI gresit sau cu RO
Solutie: Folositi doar cifrele, fara RO

**ERR-102: Period mismatch**
Cauza: StartDate/EndDate nu formeaza luna completa
Solutie: Folositi prima si ultima zi a lunii

**ERR-103: Balance mismatch**
Cauza: Total Debit ≠ Total Credit
Solutie: Verificati toate inregistrarile

**ERR-104: Invalid AccountID reference**
Cauza: Cont folosit in tranzactie nu exista in MasterFiles
Solutie: Adaugati contul in GeneralLedgerAccounts

**ERR-105: Duplicate SourceDocumentID**
Cauza: Acelasi ID pentru documente diferite
Solutie: Asigurati unicitatea ID-urilor`,
                keyPoints: [
                  'CUI fara RO',
                  'Luna completa (prima-ultima zi)',
                  'Debit = Credit',
                  'Toate conturile declarate in MasterFiles',
                  'ID-uri unice'
                ],
                warning: 'ERR-103 (Balance mismatch) este cea mai frecventa eroare si necesita verificare manuala a fiecarei note contabile!'
              },
              {
                title: 'Erori de TVA',
                content: `**ERR-201: Invalid TaxCode**
Cauza: Cod TVA necunoscut
Solutie: Folositi coduri standard (S19, S9, S5, Z, E)

**ERR-202: TaxAmount mismatch**
Cauza: Suma TVA nu corespunde cu baza si cota
Solutie: Verificati calculul: TVA = Baza × Cota

**ERR-203: Missing TaxInformation**
Cauza: Cont de TVA fara TaxInformation
Solutie: Adaugati blocul TaxInformation

**Coduri TVA acceptate:**
- S19 / S21 - Standard 19% / 21%
- S9 / S11 - Redus 9% / 11%
- S5 - Special 5%
- Z - Zero (export, intracomunitar)
- E - Scutit`,
                keyPoints: [
                  'Coduri standard: S19, S9, S5, Z, E',
                  'TVA = Baza × Cota exacta',
                  'TaxInformation obligatoriu pt conturi TVA',
                  'Din aug 2025: S21, S11'
                ]
              }
            ],
            summary: [
              'Erori XML: structura, namespace, format date',
              'Erori date: CUI, perioada, balanta, referinte',
              'Erori TVA: cod gresit, calcul gresit, lipsa info',
              'Cititi cu atentie mesajul de eroare',
              'DUKIntegrator indica linia cu problema'
            ],
            practiceExercise: {
              title: 'Diagnosticheaza eroarea',
              description: 'Pentru fiecare mesaj de eroare, identifica cauza si solutia:',
              steps: [
                'ERR-101: TaxRegistrationNumber "RO12345678" is invalid',
                'ERR-103: Transaction TRX-001 has Debit=1190.00, Credit=1000.00',
                'ERR-201: TaxCode "TVA19" is not recognized'
              ],
              solution: `1. CUI contine "RO" - trebuie doar "12345678"
2. Lipseste linia de TVA (190.00) in Credit sau e pusa gresit
3. Cod gresit "TVA19" - trebuie "S19"`
            }
          }
        },
        {
          id: 'l-012',
          title: 'Transmitere prin SPV',
          duration: 20,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Dupa validarea cu succes, fisierul SAF-T trebuie transmis prin Spatiul Privat Virtual (SPV) ANAF. In aceasta lectie vom parcurge procesul complet de transmitere.`,
            sections: [
              {
                title: 'Pregatirea pentru Transmitere',
                content: `**Verificari inainte de transmitere:**

1. **Fisier validat cu DUKIntegrator**
   - Status: VALID
   - Salvat raportul de validare

2. **Certificat digital valid**
   - Nu a expirat
   - Asociat cu CUI-ul companiei
   - Instalat in browser/sistem

3. **Acces SPV**
   - Cont activ in SPV
   - Drepturi de depunere declaratii
   - Test de acces recent

4. **Fisier pregatit**
   - Comprimat (ZIP) daca > 5 MB
   - Denumire corecta: D406_CUI_YYYYMM.xml`,
                keyPoints: [
                  'Validare DUKIntegrator = VALID',
                  'Certificat digital valid si asociat',
                  'Acces SPV functional',
                  'Fisier denumit corect'
                ]
              },
              {
                title: 'Procesul de Transmitere',
                content: `**Pasul 1: Accesati SPV**
- https://www.anaf.ro/spv
- Autentificare cu certificat digital

**Pasul 2: Navigati la Declaratii**
- Meniu → Declaratii → Depunere declaratii
- Selectati D406 SAF-T

**Pasul 3: Incarcati fisierul**
- Click "Alege fisier"
- Selectati fisierul XML validat
- Asteptati upload complet

**Pasul 4: Verificare automata**
- SPV verifica structura
- Afiseaza sumarul datelor
- Confirma sau respinge

**Pasul 5: Semnare si trimitere**
- Verificati sumarul
- Click "Semneaza si trimite"
- Confirmati cu certificatul digital

**Pasul 6: Confirmare**
- Salvati numarul de inregistrare
- Descarcati recipisa
- Arhivati dovada depunerii`,
                keyPoints: [
                  'Autentificare cu certificat',
                  'Navigare: Declaratii → D406',
                  'Upload → Verificare → Semnare',
                  'Salvati numarul de inregistrare!'
                ],
                warning: 'Salvati INTOTDEAUNA numarul de inregistrare si recipisa! Acestea sunt dovada depunerii.'
              },
              {
                title: 'Dupa Transmitere',
                content: `**Ce sa faceti dupa depunere:**

**1. Verificati statusul**
- SPV → Declaratii → Istoric
- Status: Inregistrata / In procesare / Acceptata / Respinsa

**2. Daca este Acceptata:**
- Arhivati: fisierul original + recipisa + raport validare
- Notati in evidenta interna
- Pregatiti luna urmatoare

**3. Daca este Respinsa:**
- Cititi motivul respingerii
- Corectati erorile
- Revalidati cu DUKIntegrator
- Retransmiteti

**4. Declaratie rectificativa:**
- Se depune oricand pentru corectii
- Inlocuieste declaratia anterioara
- Acelasi proces de validare si transmitere`,
                keyPoints: [
                  'Verificati statusul in SPV',
                  'Arhivati toate documentele',
                  'Respingere = corectie + retransmitere',
                  'Rectificativa inlocuieste original'
                ],
                tip: 'Setati un reminder pentru data de 20 a fiecarei luni pentru a avea timp de corectii inainte de termenul de 25!'
              }
            ],
            summary: [
              'Validati cu DUKIntegrator inainte de transmitere',
              'Accesati SPV cu certificat digital',
              'Upload → Verificare → Semnare → Confirmare',
              'Salvati numarul de inregistrare si recipisa',
              'Respingere: corectati si retransmiteti',
              'Rectificativa disponibila oricand'
            ],
            resources: [
              {
                title: 'Portal SPV',
                url: 'https://www.anaf.ro/spv/',
                type: 'LINK'
              },
              {
                title: 'Ghid SPV',
                url: 'https://static.anaf.ro/static/10/Anaf/Informatii_R/Ghid_SPV.pdf',
                type: 'PDF'
              }
            ]
          }
        }
      ]
    }
  ]
};

// e-Factura Course - Complete Content Enhanced with 2025 Research
const efacturaCourse: CourseContent = {
  id: 'c-002',
  title: 'e-Factura B2B - Implementare Completa',
  modules: [
    {
      id: 'm-101',
      title: 'Fundamentele e-Factura',
      lessons: [
        {
          id: 'l-101',
          title: 'Ce este e-Factura RO?',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `RO e-Factura este sistemul national de facturare electronica implementat de ANAF pentru digitalizarea completa a facturilor fiscale in Romania. Din 1 iulie 2024, toate facturile B2B sunt obligatoriu transmise prin acest sistem, iar din 2025 s-a extins si la B2C.`,
            sections: [
              {
                title: 'Definitie si Specificatii Tehnice',
                content: `**e-Factura RO** reprezinta sistemul de pre-clearance (validare prealabila) implementat de Ministerul Finantelor:

**Specificatii tehnice obligatorii:**
- **Format:** UBL 2.1 XML conform standardului european EN 16931-1
- **Extensie locala:** RO_CIUS (Core Invoice Usage Specification)
- **Semnatura:** Digitala obligatorie (certificat calificat)
- **Transmisie:** Exclusiv prin SPV (Spatiul Privat Virtual)
- **Arhivare:** 10 ani conform legislatiei romanesti

**Cronologie implementare:**
- 2021: Lansare sistem pilot B2G
- Ianuarie 2022: Obligatoriu B2G (institutii publice)
- Iulie 2024: Obligatoriu B2B (toate tranzactiile intre firme)
- 2025: Extindere B2C (catre persoane fizice)

Romania este printre primele tari UE cu facturare electronica obligatorie B2B cu model de clearance.`,
                keyPoints: [
                  'Format UBL 2.1 conform EN 16931-1',
                  'Extensie RO_CIUS obligatorie',
                  'B2B obligatoriu din 1 iulie 2024',
                  'Model pre-clearance (validare inainte de emitere)',
                  'Arhivare legala 10 ani'
                ],
                tip: 'Sistemul RO e-Factura valideaza factura INAINTE ca aceasta sa fie considerata emisa legal. Fara validare ANAF = factura invalida!'
              },
              {
                title: 'Beneficii pentru Afaceri',
                content: `**Beneficii operationale:**
- Reducere 60-80% costuri procesare (hartie, posta, arhivare)
- Procesare automata cu integrare ERP
- Reducere erori umane prin validare automata
- Acces instant la istoricul facturilor (10 ani)
- Reconciliere automata cu furnizorii

**Beneficii fiscale:**
- TVA deductibil doar cu factura validata in sistem
- Reducere risc controale fiscale
- Transparenta totala cu ANAF
- Evitare penalitati (pana la 15% din valoare!)

**Beneficii strategice:**
- Digitalizare completa fluxuri financiare
- Date pentru analytics si forecasting
- Competitivitate crescuta
- Conformitate UE automata`,
                keyPoints: [
                  'Reducere costuri 60-80%',
                  'TVA deductibil doar cu e-Factura',
                  'Penalitati severe pentru neconformitate',
                  'Integrare automata cu ERP'
                ],
                warning: 'Din iulie 2024, facturile B2B emise FARA e-Factura nu permit deducere TVA pentru cumparator!'
              },
              {
                title: 'Tranzactii Obligatorii vs Exceptate',
                content: `**Obligatoriu in e-Factura:**
- Toate tranzactiile B2B domestice (Romania-Romania)
- Tranzactii B2G (catre institutii publice)
- Tranzactii B2C (din 2025)

**Exceptate din e-Factura (deocamdata):**
- Livrari intracomunitare (intre state UE)
- Exporturi (catre tari non-UE)
- Servicii B2B cross-border
- Operatiuni scutite de TVA fara drept deducere

**Atentie - cazuri speciale:**
- Achizitii intracomunitare: NU se raporteaza in e-Factura
- Importuri: se declara separat prin DVI
- Reverse charge intern: DA, se raporteaza`,
                keyPoints: [
                  'B2B domestic = obligatoriu',
                  'Intracomunitare = exceptate',
                  'Export = exceptat',
                  'Reverse charge intern = obligatoriu'
                ]
              }
            ],
            summary: [
              'e-Factura RO = sistem de pre-clearance cu validare ANAF',
              'Format UBL 2.1 + RO_CIUS obligatoriu',
              'B2B obligatoriu din 1 iulie 2024',
              'TVA deductibil DOAR cu e-Factura validata',
              'Exceptii: intracomunitare, export, cross-border services'
            ],
            quiz: [
              {
                question: 'Din ce data este obligatorie e-Factura pentru B2B in Romania?',
                options: [
                  '1 ianuarie 2024',
                  '1 iulie 2024',
                  '1 ianuarie 2025',
                  '1 iulie 2025'
                ],
                correct: 1,
                explanation: 'e-Factura B2B a devenit obligatorie din 1 iulie 2024 conform legislatiei romanesti.'
              },
              {
                question: 'Ce format trebuie folosit pentru e-Factura?',
                options: [
                  'PDF semnat digital',
                  'UBL 2.1 XML cu RO_CIUS',
                  'Excel cu macros',
                  'JSON API format'
                ],
                correct: 1,
                explanation: 'e-Factura trebuie emisa in format UBL 2.1 XML conform EN 16931-1 cu extensia locala RO_CIUS.'
              }
            ]
          }
        },
        {
          id: 'l-102',
          title: 'Inregistrare SPV si Form 084',
          duration: 12,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Pentru a utiliza sistemul RO e-Factura, companiile trebuie sa fie inregistrate in Spatiul Privat Virtual (SPV) si sa depuna Formularul 084 pentru activare. Aceasta lectie va ghideaza pas cu pas.`,
            sections: [
              {
                title: 'Inregistrare SPV',
                content: `**Spatiul Privat Virtual (SPV)** este platforma ANAF pentru toate serviciile electronice:

**Metode de inregistrare:**

**1. Cu certificat digital calificat:**
- Achizitionati certificat de la furnizor autorizat (DigiSign, CertSign, Trans Sped)
- Accesati spv.anaf.ro
- Click "Inregistrare cu certificat digital"
- Completati datele companiei
- Validare imediata

**2. Prin reprezentant legal:**
- Depuneti cerere la ANAF cu actele companiei
- Timp procesare: 3-5 zile lucratoare

**3. Prin imputernicit:**
- Imputernicire notariala
- Depunere la ANAF
- Timp procesare: 5-7 zile`,
                keyPoints: [
                  'Certificat digital = metoda cea mai rapida',
                  'Furnizori autorizati: DigiSign, CertSign, Trans Sped',
                  'SPV obligatoriu pentru e-Factura',
                  'Fara SPV = nu puteti emite/primi e-Facturi'
                ]
              },
              {
                title: 'Formularul 084',
                content: `**Formularul 084** activeaza accesul la RO e-Factura:

**Campuri obligatorii:**
- Datele de identificare (CUI, denumire)
- Tipul de acces solicitat (emitere/primire)
- Reprezentantul legal
- Datele de contact

**Procedura depunere:**
1. Autentificati-va in SPV
2. Navigati la "Declaratii" → "Completare declaratie"
3. Selectati Formularul 084
4. Completati toate campurile
5. Semnati digital si transmiteti
6. Verificati confirmarea de primire

**Termen procesare:** 1-2 zile lucratoare
**Valabilitate:** Nelimitata (pana la revocare)`,
                keyPoints: [
                  'Form 084 = activare e-Factura',
                  'Se depune online prin SPV',
                  'Procesare 1-2 zile',
                  'Obligatoriu inainte de prima e-Factura'
                ],
                example: {
                  title: 'Exemplu completare Form 084',
                  code: `Sectiunea A - Date identificare:
- CUI: 12345678
- Denumire: EXEMPLU CONSULTING SRL
- Adresa: Str. Exemplu nr. 10, Bucuresti

Sectiunea B - Tip acces:
- [X] Emitere facturi electronice
- [X] Primire facturi electronice
- [X] Acces API (pentru integrare ERP)

Sectiunea C - Reprezentant:
- Nume: Ion Popescu
- Functie: Administrator
- Email: ion.popescu@exemplu.ro`,
                  explanation: 'Bifati toate optiunile pentru acces complet la functionalitati.'
                }
              }
            ],
            summary: [
              'SPV = portal obligatoriu pentru e-Factura',
              'Inregistrare cu certificat digital = cea mai rapida',
              'Formularul 084 activeaza accesul e-Factura',
              'Procesare 1-2 zile dupa depunere',
              'Fara Form 084 = nu puteti emite e-Facturi'
            ]
          }
        },
        {
          id: 'l-103',
          title: 'Termene si Penalitati 2025',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Respectarea termenelor e-Factura este critica - penalitatile pentru neconformitate sunt severe, ajungand pana la 15% din valoarea facturii. Aceasta lectie detaliaza toate termenele si sanctiunile.`,
            sections: [
              {
                title: 'Termene de Transmitere',
                content: `**Regula generala:**
Facturile trebuie transmise in SPV in maxim **5 zile calendaristice** de la emitere.

**Calculul termenului:**
- Ziua emiterii = Ziua 0
- Se numara zile calendaristice (inclusiv weekend)
- Daca ultima zi e nelucratoare, termenul NU se prelungeste

**Exemple:**
- Factura emisa Luni 1 → Termen maxim: Sambata 6
- Factura emisa Vineri 5 → Termen maxim: Miercuri 10
- Factura emisa 27 dec → Termen maxim: 1 ian (chiar daca e sarbatoare!)

**Termen primire:**
Destinatarul are **60 zile calendaristice** sa descarce factura din SPV.
Dupa 60 zile, factura dispare din sistem (dar ramane arhivata la ANAF).`,
                keyPoints: [
                  'Transmitere: max 5 zile calendaristice',
                  'Zile calendaristice = inclusiv weekend',
                  'Nu exista prelungire pentru sarbatori',
                  'Primire: 60 zile disponibilitate in SPV'
                ],
                warning: 'Depasirea celor 5 zile = penalitate automata! Nu exista exceptii sau prelungiri.'
              },
              {
                title: 'Penalitati pentru Neconformitate',
                content: `**Penalitati pentru intarziere transmitere:**
- Mari contribuabili: 5.000 - 10.000 RON per factura
- Contribuabili mijlocii: 2.500 - 5.000 RON per factura
- Contribuabili mici: 1.000 - 2.500 RON per factura

**Penalitate pentru NEEMITERE e-Factura:**
**15% din valoarea facturii** - cea mai severa!

**Exemple concrete:**
- Factura 10.000 RON neemisa in sistem = amenda 1.500 RON
- Factura 100.000 RON neemisa = amenda 15.000 RON
- 10 facturi intarziate (firma mica) = pana la 25.000 RON amenzi

**Consecinte suplimentare:**
- TVA NU este deductibil pentru cumparator
- Factura poate fi contestata de client
- Risc major la controale ANAF`,
                keyPoints: [
                  'Neemitere = 15% din valoare!',
                  'Intarziere: 1.000-10.000 RON/factura',
                  'TVA nedeductibil fara e-Factura',
                  'Penalitatile se cumuleaza per factura'
                ],
                example: {
                  title: 'Calcul penalitati - Studiu de caz',
                  explanation: `**Compania ABC SRL (contribuabil mic):**
- Emite 50 facturi/luna
- In luna martie, 5 facturi transmise cu intarziere
- 2 facturi neemise deloc in sistem

**Calcul penalitati:**
- 5 x 1.500 RON (intarziere) = 7.500 RON
- 2 x 15% x 8.000 RON (valoare medie) = 2.400 RON
- **TOTAL amenzi: 9.900 RON**

Plus: TVA de 2.280 RON nedeductibil pentru clienti!`
                },
                warning: 'Penalitatile se aplica PER FACTURA, nu per luna! 100 facturi intarziate = 100 de amenzi separate.'
              },
              {
                title: 'Prevenire Penalitati',
                content: `**Strategii de conformitate:**

**1. Automatizare completa:**
- Integrare ERP cu API e-Factura
- Transmitere automata la emitere
- Alerte pentru facturi netransmise

**2. Monitorizare zilnica:**
- Dashboard status facturi
- Raport facturi in asteptare
- Notificari email/SMS

**3. Proceduri interne:**
- Responsabil dedicat e-Factura
- Checklist zilnic de verificare
- Backup proceduri manuale

**4. Planificare:**
- Nu lasati facturile pe ultima zi
- Buffer de 2 zile inainte de termen
- Atentie la perioade aglomerate (sfarsit luna)`,
                keyPoints: [
                  'Automatizare = cea mai sigura solutie',
                  'Monitorizare zilnica obligatorie',
                  'Buffer 2 zile recomandat',
                  'Responsabil dedicat e-Factura'
                ],
                tip: 'Investitia in automatizare (2.000-5.000 RON) se recupereaza dupa evitarea a 2-3 amenzi!'
              }
            ],
            summary: [
              'Transmitere: max 5 zile calendaristice de la emitere',
              'Neemitere = penalitate 15% din valoare',
              'Intarziere = 1.000-10.000 RON/factura',
              'TVA nedeductibil fara e-Factura validata',
              'Automatizarea previne 99% din penalitati'
            ],
            quiz: [
              {
                question: 'In cat timp trebuie transmisa factura in SPV?',
                options: [
                  '24 ore',
                  '3 zile lucratoare',
                  '5 zile calendaristice',
                  '10 zile lucratoare'
                ],
                correct: 2,
                explanation: 'Termenul legal este de 5 zile calendaristice de la data emiterii facturii.'
              },
              {
                question: 'Care este penalitatea pentru NEEMITEREA unei facturi prin e-Factura?',
                options: [
                  '500 RON fix',
                  '5% din valoare',
                  '10% din valoare',
                  '15% din valoare'
                ],
                correct: 3,
                explanation: 'Neemiterea unei facturi obligatorii prin sistemul e-Factura atrage penalitate de 15% din valoarea facturii.'
              }
            ]
          }
        }
      ]
    },
    {
      id: 'm-102',
      title: 'Structura XML si Validare',
      lessons: [
        {
          id: 'l-104',
          title: 'Formatul UBL 2.1 si RO_CIUS',
          duration: 20,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Formatul tehnic al e-Facturii este UBL 2.1 (Universal Business Language) cu extensia romaneasca RO_CIUS. Intelegerea acestei structuri este esentiala pentru integrarea corecta si evitarea erorilor de validare.`,
            sections: [
              {
                title: 'Standardul European EN 16931',
                content: `**EN 16931** este standardul european pentru facturarea electronica:

**Componente:**
- **EN 16931-1**: Modelul semantic (ce date sunt necesare)
- **EN 16931-2**: Sintaxe acceptate (cum se structureaza)

**Sintaxe acceptate:**
1. **UBL 2.1** - cea mai folosita in Romania
2. **CII (Cross Industry Invoice)** - alternativa

**RO_CIUS (Core Invoice Usage Specification):**
- Extensia romaneasca a standardului
- Adauga campuri specifice RO (CUI, cod CAEN, etc.)
- Defineste reguli de validare locale
- Obligatorie pentru e-Factura RO`,
                keyPoints: [
                  'EN 16931 = standard european',
                  'UBL 2.1 = sintaxa principala',
                  'RO_CIUS = extensie obligatorie Romania',
                  'Fara RO_CIUS = respingere automata'
                ]
              },
              {
                title: 'Structura XML e-Factura',
                content: `Structura obligatorie a fisierului XML:

**1. Invoice Header (BT-1 to BT-25)**
- InvoiceNumber (numar factura)
- IssueDate (data emiterii)
- DueDate (data scadenta)
- InvoiceTypeCode (tip factura)
- CurrencyCode (RON)

**2. Seller Information (BG-4 to BG-6)**
- SellerName (denumire furnizor)
- SellerTaxRegistrationNumber (CUI cu RO)
- SellerAddress (adresa completa)
- SellerContact (date contact)

**3. Buyer Information (BG-7 to BG-9)**
- BuyerName (denumire cumparator)
- BuyerTaxRegistrationNumber (CUI)
- BuyerAddress (adresa)

**4. Line Items (BG-25)**
- ItemDescription (descriere)
- Quantity (cantitate)
- UnitPrice (pret unitar)
- LineAmount (valoare)
- VATRate (cota TVA)`,
                keyPoints: [
                  'Header = informatii factura',
                  'Seller/Buyer = parti contractuale',
                  'Lines = detalii produse/servicii',
                  'VAT = informatii fiscale obligatorii'
                ],
                example: {
                  title: 'Exemplu XML e-Factura (simplificat)',
                  code: `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>FV-2025-001234</cbc:ID>
  <cbc:IssueDate>2025-01-15</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>RO12345678</cbc:CompanyID>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>FURNIZOR SRL</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="H87">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="RON">1000.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Servicii consultanta</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="RON">100.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`,
                  explanation: 'Structura de baza cu furnizor, linie de factura si TVA. Codul 380 = factura standard.'
                }
              },
              {
                title: 'Coduri Tip Factura',
                content: `**InvoiceTypeCode - coduri obligatorii:**

**Facturi:**
- **380**: Factura comerciala standard
- **381**: Nota de credit (stornare)
- **383**: Nota de debit
- **384**: Factura corectata
- **389**: Auto-factura

**Document referinta:**
- **386**: Factura proforma (informativa)
- **751**: Factura de avans

**Utilizare corecta:**
- Factura normala vanzare → 380
- Stornare totala/partiala → 381
- Corectie eroare → 384 (cu referinta la originala)
- Avans primit → 751`,
                keyPoints: [
                  '380 = factura standard (90% din cazuri)',
                  '381 = nota credit/stornare',
                  '384 = corectie cu referinta',
                  'Cod gresit = respingere validare'
                ],
                warning: 'Codul de tip factura trebuie sa corespunda cu realitatea. O stornare cu cod 380 va fi respinsa!'
              }
            ],
            summary: [
              'UBL 2.1 + RO_CIUS = format obligatoriu',
              'Structura: Header + Seller + Buyer + Lines',
              'InvoiceTypeCode 380 = factura standard',
              '381 = nota de credit',
              'Validarea verifica toate campurile obligatorii'
            ],
            resources: [
              {
                title: 'Specificatii RO_CIUS ANAF',
                url: 'https://mfinante.gov.ro/ro_cius',
                type: 'PDF'
              },
              {
                title: 'Schema XSD e-Factura',
                url: 'https://static.anaf.ro/static/10/Anaf/efactura/',
                type: 'LINK'
              }
            ]
          }
        },
        {
          id: 'l-105',
          title: 'Validare si Erori Frecvente',
          duration: 18,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Validarea e-Factura se face automat de catre sistemul ANAF. Intelegerea erorilor frecvente si a modului de rezolvare este esentiala pentru conformitate.`,
            sections: [
              {
                title: 'Procesul de Validare ANAF',
                content: `**Etapele validarii:**

**1. Validare structurala (Schema XSD)**
- Verifica daca XML-ul e conform schemei
- Campuri obligatorii prezente
- Tipuri de date corecte

**2. Validare semantica (Reguli de business)**
- CUI valid si activ
- Totaluri calculate corect
- TVA calculat conform cotelor legale

**3. Validare RO_CIUS**
- Campuri specifice Romania
- Reguli locale respectate

**Rezultate posibile:**
- **Acceptata**: Factura valida, primeste ID unic
- **Respinsa**: Erori de validare, trebuie corectata
- **In procesare**: Asteptare (rar, probleme tehnice)`,
                keyPoints: [
                  'Validare in 3 etape',
                  'Structurala + Semantica + RO_CIUS',
                  'Rezultat in cateva secunde',
                  'ID unic = factura valida legal'
                ]
              },
              {
                title: 'Top 10 Erori Frecvente',
                content: `**1. CUI invalid sau inactiv**
Eroare: "Invalid tax registration number"
Solutie: Verificati CUI-ul in ANAF inainte de emitere

**2. Total incorect**
Eroare: "Line amounts do not sum to invoice total"
Solutie: Recalculati: Cantitate x Pret = Valoare linie

**3. TVA calculat gresit**
Eroare: "VAT amount does not match rate"
Solutie: 21% din baza = suma TVA exacta

**4. Data in viitor**
Eroare: "Issue date cannot be in the future"
Solutie: Data emiterii <= data transmiterii

**5. Cod tip factura gresit**
Eroare: "Invalid invoice type code"
Solutie: Folositi 380 (factura) sau 381 (stornare)

**6. Camp obligatoriu lipsa**
Eroare: "Required field missing: BuyerName"
Solutie: Completati toate campurile obligatorii

**7. Format data incorect**
Eroare: "Invalid date format"
Solutie: Folositi YYYY-MM-DD (ex: 2025-01-15)

**8. Cod moneda invalid**
Eroare: "Invalid currency code"
Solutie: RON (nu Lei, nu L)

**9. Unitate masura nerecunoscuta**
Eroare: "Invalid unit of measure"
Solutie: Folositi coduri UN/CEFACT (H87=bucata)

**10. Caractere nepermise**
Eroare: "Invalid XML characters"
Solutie: Escapati &, <, > in texte`,
                keyPoints: [
                  'CUI invalid = cea mai frecventa eroare',
                  'Totaluri = verificati calculele',
                  'TVA = exact 21% sau 11% din baza',
                  'Date = format YYYY-MM-DD'
                ],
                tip: 'Folositi un validator local (DUKIntegrator sau similar) INAINTE de transmitere pentru a prinde erorile din timp!'
              }
            ],
            summary: [
              'Validarea ANAF = 3 etape automate',
              'CUI invalid = eroare #1',
              'Verificati calculele inainte de transmitere',
              'Format data: YYYY-MM-DD',
              'Folositi validator local pentru preview'
            ],
            practiceExercise: {
              title: 'Identifica erorile',
              description: 'Gasiti erorile in urmatorul XML fragment:',
              steps: [
                '<cbc:IssueDate>15/01/2025</cbc:IssueDate>',
                '<cbc:DocumentCurrencyCode>Lei</cbc:DocumentCurrencyCode>',
                '<cbc:CompanyID>12345678</cbc:CompanyID>',
                '<cbc:InvoiceTypeCode>100</cbc:InvoiceTypeCode>',
                '<cbc:LineExtensionAmount>1.000,50</cbc:LineExtensionAmount>'
              ],
              solution: `Erori identificate:
1. Data: 15/01/2025 → corect: 2025-01-15
2. Moneda: Lei → corect: RON
3. CUI: 12345678 → corect: RO12345678 (cu prefix)
4. Tip: 100 → corect: 380 (nu exista cod 100)
5. Suma: 1.000,50 → corect: 1000.50 (punct decimal, fara separator mii)`
            }
          }
        }
      ]
    },
    {
      id: 'm-103',
      title: 'Implementare Practica',
      lessons: [
        {
          id: 'l-106',
          title: 'Integrare API e-Factura',
          duration: 25,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Integrarea API e-Factura permite automatizarea completa a procesului de facturare. Aceasta lectie prezinta arhitectura API-ului si exemple practice de implementare.`,
            sections: [
              {
                title: 'Arhitectura API ANAF',
                content: `**Endpoint-uri principale:**

**Mediu de test:**
https://api.anaf.ro/test/FCTEL/rest/

**Mediu productie:**
https://api.anaf.ro/prod/FCTEL/rest/

**Operatiuni disponibile:**
- **/upload** - Incarcare factura noua
- **/status/{id}** - Verificare status
- **/download/{id}** - Descarcare factura
- **/messages** - Mesaje si notificari

**Autentificare:**
- OAuth 2.0 cu certificat digital
- Token JWT cu valabilitate 1 ora
- Refresh token automat`,
                keyPoints: [
                  'Test vs Productie = URL-uri diferite',
                  'OAuth 2.0 cu certificat',
                  'Token JWT 1 ora valabilitate',
                  '4 operatiuni principale'
                ]
              },
              {
                title: 'Flux Complet Transmitere',
                content: `**Pasii pentru transmitere automata:**

**1. Autentificare**
- Obtineti token cu certificatul digital
- Stocati token pentru reutilizare

**2. Generare XML**
- Construiti XML conform UBL 2.1 + RO_CIUS
- Validati local inainte de transmitere

**3. Semnare digitala**
- Semnati XML cu certificat calificat
- Includeti timestamp

**4. Upload**
- POST la /upload
- Body: XML semnat (base64)
- Header: Authorization Bearer {token}

**5. Verificare status**
- GET la /status/{upload_id}
- Asteptati status "processed"
- Obtineti ID factura unic

**6. Arhivare**
- Stocati ID-ul si confirmarea
- Legati de factura in ERP`,
                keyPoints: [
                  '6 pasi pentru transmitere completa',
                  'Validati local inainte de upload',
                  'Semnatura digitala obligatorie',
                  'Arhivati confirmarea ANAF'
                ],
                example: {
                  title: 'Exemplu Upload API (pseudocod)',
                  code: `// 1. Autentificare
const token = await getOAuthToken(certificate);

// 2. Construire XML
const invoiceXML = buildUBLInvoice(invoiceData);

// 3. Validare locala
const validation = validateLocal(invoiceXML);
if (!validation.isValid) throw validation.errors;

// 4. Semnare
const signedXML = signWithCertificate(invoiceXML, certificate);

// 5. Upload
const response = await fetch('https://api.anaf.ro/prod/FCTEL/rest/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/xml'
  },
  body: signedXML
});

// 6. Obtine ID
const result = await response.json();
const invoiceId = result.index_incarcare;

// 7. Verifica status (polling)
let status;
do {
  await sleep(5000);
  status = await checkStatus(invoiceId, token);
} while (status === 'processing');

console.log('Factura validata:', status.id_descarcare);`,
                  explanation: 'Flux complet de la autentificare la confirmare. In productie, adaugati error handling robust.'
                }
              }
            ],
            summary: [
              'API REST cu OAuth 2.0',
              '6 pasi: Auth → Generate → Sign → Upload → Status → Archive',
              'Testati intai in mediul de test ANAF',
              'Polling pentru status (nu webhook)',
              'Pastrati toate confirmarile pentru audit'
            ]
          }
        }
      ]
    }
  ]
};

// TVA 2025 Course - Complete Content Enhanced with Legea 141/2025 Research
const tvaCourse: CourseContent = {
  id: 'c-003',
  title: 'TVA 2025 - Ghid Complet Legea 141/2025',
  modules: [
    {
      id: 'm-201',
      title: 'Noile Cote TVA din August 2025',
      lessons: [
        {
          id: 'l-201',
          title: 'Legea 141/2025 - Prezentare Generala',
          duration: 18,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Legea nr. 141/2025 privind unele masuri fiscal-bugetare a fost publicata in Monitorul Oficial nr. 699 din 25 iulie 2025. Aceasta lege introduce cele mai semnificative modificari ale cotelor TVA din ultimii 8 ani, aplicabile de la 1 august 2025.`,
            sections: [
              {
                title: 'Contextul Modificarilor',
                content: `**De ce s-au modificat cotele TVA?**

Legea 141/2025 face parte din pachetul de masuri fiscal-bugetare pentru:
- Consolidarea fiscala (reducerea deficitului bugetar)
- Alinierea la recomandarile UE si FMI
- Finantarea investitiilor PNRR (21,6 miliarde EUR)

**Istoric cote TVA in Romania:**
- 2000-2010: 19% standard
- 2010-2016: 24% (criza economica)
- 2016-2017: 20%
- 2017-2025: 19%
- **Din august 2025: 21%**

Aceasta este prima crestere a cotei standard dupa 8 ani de stabilitate.`,
                keyPoints: [
                  'Legea 141/2025 publicata 25 iulie 2025',
                  'Prima modificare dupa 8 ani',
                  'Parte din consolidarea fiscal-bugetara',
                  'Efecte de la 1 august 2025'
                ]
              },
              {
                title: 'Noile Cote TVA - Detalii Complete',
                content: `**COTA STANDARD: 19% → 21%**
Aplicabila pentru majoritatea bunurilor si serviciilor care nu beneficiaza de cota redusa.

**COTA REDUSA UNIFICATA: 11%**
Inlocuieste cele doua cote reduse anterioare (9% si 5%):

**Categorie cu 11% (fost 9%):**
- Alimente pentru consum uman si animal
- Bauturi nealcoolice
- Medicamente de uz uman
- Apa potabila si canalizare
- Carti, ziare, reviste (inclusiv digitale)
- Cazare hoteliera
- Servicii de restaurant si catering
- Transport de persoane
- Bilete la evenimente culturale, sportive
- Produse agricole (seminte, ingrasaminte)

**Cota de 5% ELIMINATA** - trece la 11%:
- Locuinte sub 120.000 EUR (cu exceptii tranzitorii)
- Proteze si echipamente medicale speciale

**EXCEPTIE IMPORTANTA:**
Pentru locuinte, exista perioada tranzitorie pana la 31 iulie 2026 cu cota de 9%.`,
                keyPoints: [
                  'Standard: 21% (de la 19%)',
                  'Redusa unificata: 11% (unifica 9% si 5%)',
                  'Cota de 5% eliminata',
                  'Doar 2 cote raman: 21% si 11%'
                ],
                warning: 'Atentie: Cota de 5% a fost complet eliminata! Toate produsele/serviciile cu 5% trec la 11%.'
              },
              {
                title: 'Data Intrarii in Vigoare',
                content: `**Regula generala: 1 AUGUST 2025**

Modificarile se aplica pentru:
- Livrari de bunuri efectuate din 1 august 2025
- Prestari de servicii finalizate din 1 august 2025
- Achizitii intracomunitare din 1 august 2025
- Importuri din 1 august 2025

**Regula pentru facturi emise INAINTE de 1 august:**
Daca factura a fost emisa inainte de 1 august pentru livrare dupa 1 august:
- Se aplica cota NOUA (21%/11%)
- Factura trebuie stornata si reemisa

**Exceptie avansuri:**
Avansurile incasate inainte de 1 august pentru livrari ulterioare:
- Avansul ramane cu cota veche
- Regularizarea finala cu cota noua`,
                keyPoints: [
                  'Data cheie: 1 AUGUST 2025',
                  'Cota se determina la data livrarii/prestarii',
                  'Avansuri = cota de la data incasarii',
                  'Facturi anticipate = stornare si reemitere'
                ],
                example: {
                  title: 'Exemple aplicare cote',
                  explanation: `**Exemplul 1 - Vanzare bunuri:**
- Comanda: 15 iulie 2025
- Livrare: 5 august 2025
- Cota aplicabila: **21%** (data livrarii)

**Exemplul 2 - Avans servicii:**
- Avans 50% incasat: 20 iulie 2025 → TVA 19%
- Serviciu prestat: 10 august 2025
- Rest de plata: TVA **21%** pe diferenta

**Exemplul 3 - Cazare:**
- Rezervare si plata integrala: 25 iulie 2025
- Sejur: 1-7 august 2025
- Cota aplicabila: **9%** (plata inainte de 1 august)`
                }
              }
            ],
            summary: [
              'Legea 141/2025 - in vigoare de la 1 august 2025',
              'Cota standard: 19% → 21%',
              'Cota redusa unificata: 11% (inlocuieste 9% si 5%)',
              'Data livrarii determina cota aplicabila',
              'Avansuri = cota la data incasarii'
            ],
            quiz: [
              {
                question: 'Care este noua cota TVA standard din august 2025?',
                options: [
                  '19%',
                  '20%',
                  '21%',
                  '24%'
                ],
                correct: 2,
                explanation: 'Legea 141/2025 a crescut cota TVA standard de la 19% la 21%, efectiv din 1 august 2025.'
              },
              {
                question: 'Ce s-a intamplat cu cota TVA de 5%?',
                options: [
                  'A ramas neschimbata',
                  'A crescut la 9%',
                  'A fost eliminata si inlocuita cu 11%',
                  'A crescut la 7%'
                ],
                correct: 2,
                explanation: 'Cota de 5% a fost eliminata complet. Produsele/serviciile care beneficiau de 5% trec acum la cota redusa de 11%.'
              }
            ]
          }
        },
        {
          id: 'l-202',
          title: 'Categorii de Produse si Servicii',
          duration: 20,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Clasificarea corecta a produselor si serviciilor pe categorii de TVA este esentiala pentru conformitate. Aceasta lectie detaliaza fiecare categorie cu exemple concrete.`,
            sections: [
              {
                title: 'Produse si Servicii cu 21% TVA',
                content: `**Cota standard de 21% se aplica pentru:**

**Bunuri generale:**
- Electrocasnice si electronice
- Imbracaminte si incaltaminte
- Mobila si decoratiuni
- Vehicule si accesorii auto
- Bijuterii si ceasuri
- Cosmetice si parfumuri
- Bauturi alcoolice
- Tutun si produse din tutun

**Servicii:**
- Servicii profesionale (avocatura, consultanta, contabilitate)
- Servicii IT si software
- Telecomunicatii
- Servicii financiare taxabile
- Publicitate si marketing
- Inchirieri auto
- Servicii de curatenie industriala
- Constructii (cu exceptiile de mai jos)`,
                keyPoints: [
                  '21% = regula generala',
                  'Tot ce nu e listat la 11% = 21%',
                  'Bauturi alcoolice = intotdeauna 21%',
                  'Servicii profesionale = 21%'
                ]
              },
              {
                title: 'Produse si Servicii cu 11% TVA',
                content: `**Cota redusa de 11% - lista completa:**

**Alimente si bauturi (exclusiv alcool):**
- Paine, produse de panificatie
- Carne, peste, lactate
- Fructe, legume, conserve
- Sucuri naturale, apa imbuteliata
- Cafea, ceai, cacao
- Hrana pentru animale de companie

**Sanatate:**
- Medicamente cu si fara reteta
- Echipamente medicale
- Proteze dentare si ortopedice
- Scaune cu rotile, cadre de mers

**Cultura si educatie:**
- Carti (fizice si e-books)
- Ziare, reviste (print si online)
- Bilete la muzee, teatre, concerte
- Servicii educationale (cursuri)

**Turism si HoReCa:**
- Cazare in hoteluri, pensiuni
- Servicii de restaurant si catering
- Bilete la parcuri de distractii

**Transport:**
- Transport de persoane (taxi, autocar, tren)
- Transport urban public

**Utilitati:**
- Apa potabila si canalizare
- Incalzire centralizata`,
                keyPoints: [
                  'Alimente si bauturi nealcoolice = 11%',
                  'Medicamente = 11%',
                  'Cazare si restaurant = 11%',
                  'Carti si presa = 11%'
                ],
                example: {
                  title: 'Exemple clasificare corecta',
                  explanation: `**Restaurant:**
- Meniu mancare → 11%
- Vin la masa → 21%
- Cafea → 11%
- Cocktail alcool → 21%

**Supermarket:**
- Paine → 11%
- Detergent → 21%
- Apa minerala → 11%
- Bere → 21%
- Carne → 11%
- Tigari → 21%`
                }
              },
              {
                title: 'Cazuri Speciale si Exceptii',
                content: `**Situatii speciale:**

**1. Locuinte - Perioada tranzitorie:**
- Pana la 31.07.2026: TVA **9%** pentru:
  - Locuinte sub 120.000 EUR (fara TVA)
  - Prima locuinta pentru persoane fizice
  - Contract incheiat inainte de 01.08.2025
- Dupa 01.08.2026: TVA **11%**

**2. Livrari mixte:**
Cand o factura contine produse cu cote diferite:
- Se aplica fiecare cota pe linia corespunzatoare
- Total TVA = suma TVA pe fiecare cota

**3. Pachete (bundle):**
Daca nu se poate separa pretul:
- Se aplica cota majoritara (> 50% valoare)
- Sau cota cea mai mare (prudential)

**4. Scutiri:**
Raman SCUTITE de TVA (cota 0%):
- Exporturi
- Livrari intracomunitare
- Servicii medicale
- Servicii educationale publice
- Servicii financiare si de asigurare`,
                keyPoints: [
                  'Locuinte: 9% pana in iulie 2026, apoi 11%',
                  'Livrari mixte: cote separate pe linii',
                  'Pachete: cota majoritara sau maxima',
                  'Scutiri raman neschimbate'
                ],
                warning: 'Atentie la pachete: daca vindeti un "meniu complet" cu bauturi alcoolice incluse, trebuie sa separati sau sa aplicati cota cea mai mare!'
              }
            ],
            summary: [
              '21% = regula generala pentru tot ce nu e listat la 11%',
              '11% = alimente, medicamente, cazare, cultura, transport',
              'Locuinte: 9% tranzitoriu pana in iulie 2026',
              'Livrari mixte: aplicati cote separate',
              'Scutiri (0%): export, intracomunitar, medical, educational'
            ],
            practiceExercise: {
              title: 'Clasifica produsele',
              description: 'Determina cota TVA corecta pentru fiecare produs/serviciu:',
              steps: [
                'Hotel 3 nopti cazare',
                'Laptop pentru birou',
                'Cutie de aspirine',
                'Sticla de whisky',
                'Abonament Netflix',
                'Curs de contabilitate online',
                'Bilet concert rock',
                'Servicii avocatura',
                'Cafea la pachet de la cafenea',
                'Detergent de rufe'
              ],
              solution: `Clasificare corecta:
1. Hotel cazare → 11% (turism)
2. Laptop → 21% (electronice)
3. Aspirine → 11% (medicamente)
4. Whisky → 21% (alcool!)
5. Netflix → 21% (servicii digitale)
6. Curs online → 11% (educational)
7. Concert → 11% (cultura)
8. Avocatura → 21% (servicii profesionale)
9. Cafea pachet → 11% (HoReCa)
10. Detergent → 21% (bunuri generale)`
            }
          }
        },
        {
          id: 'l-203',
          title: 'Pregatirea Tranzitiei - Checklist',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Tranzitia la noile cote TVA necesita pregatire atenta. Aceasta lectie va ofera un checklist complet pentru a va asigura conformitatea din prima zi.`,
            sections: [
              {
                title: 'Actualizari Software si Sisteme',
                content: `**1. Software de facturare:**
- [ ] Actualizati cotele TVA (19→21%, 9→11%, eliminati 5%)
- [ ] Testati calculul TVA pe facturi noi
- [ ] Verificati rotunjirile (2 zecimale)
- [ ] Actualizati template-uri facturi

**2. Sisteme ERP:**
- [ ] Actualizati master data produse (cota TVA)
- [ ] Verificati rapoarte TVA
- [ ] Testati declaratia D300 cu noi cote
- [ ] Verificati integrarea e-Factura

**3. E-commerce:**
- [ ] Actualizati preturi cu TVA pe site
- [ ] Verificati checkout-ul
- [ ] Actualizati confirmari email
- [ ] Testati gateway-uri plata

**4. POS (case de marcat):**
- [ ] Actualizati cotele in soft fiscal
- [ ] Testati bon fiscal cu noi cote
- [ ] Verificati raport Z`,
                keyPoints: [
                  'Facturare: actualizati cotele',
                  'ERP: master data produse',
                  'E-commerce: preturi afisate',
                  'POS: case de marcat'
                ],
                tip: 'Faceti actualizarile cu cel putin 3 zile inainte de 1 august pentru a avea timp de teste!'
              },
              {
                title: 'Preturi si Comunicare',
                content: `**Decizie strategica: Absorb sau Transfer?**

**Optiunea A - Absorbiti cresterea:**
- Marja se reduce cu ~2%
- Pretul final ramane acelasi
- Avantaj competitiv pe termen scurt
- Risc: profitabilitate afectata

**Optiunea B - Transferati cresterea:**
- Pretul final creste cu ~1.7%
- Marja ramane constanta
- Standard in piata
- Comunicati clientilor din timp

**Plan de comunicare:**
1. **Clienti B2B:**
   - Email oficial cu 2 saptamani inainte
   - Actualizati liste de preturi
   - Explicati impactul in contracte

2. **Clienti B2C:**
   - Anunt pe site cu 1 saptamana inainte
   - Preturi noi vizibile din 1 august
   - FAQ pentru intrebari frecvente`,
                keyPoints: [
                  'Decizie: absorb sau transfer',
                  'Comunicare B2B: 2 saptamani inainte',
                  'Comunicare B2C: 1 saptamana inainte',
                  'Actualizati toate listele de preturi'
                ],
                example: {
                  title: 'Calcul impact pret',
                  explanation: `**Produs cu pret vechi 119 RON (100 + 19% TVA):**

**Optiunea A - Absorbire:**
- Pret nou = 119 RON (mentine)
- Baza = 119 / 1.21 = 98.35 RON
- TVA = 20.65 RON
- Pierdere marja: 1.65 RON/produs

**Optiunea B - Transfer:**
- Baza = 100 RON (mentine)
- TVA = 21 RON
- Pret nou = 121 RON
- Crestere pret: +2 RON (+1.68%)`
                }
              },
              {
                title: 'Contracte si Obligatii',
                content: `**Verificati contractele existente:**

**1. Clauze de ajustare pret:**
- Exista clauza de modificare TVA?
- Pretul e "fara TVA" sau "cu TVA inclus"?
- Cine suporta diferenta?

**2. Contracte fara clauza:**
- Pretul se considera CU TVA inclus
- Furnizorul suporta diferenta
- Renegociati urgent!

**3. Abonamente si rate:**
- Actualizati ratele lunare
- Notificati clientii in scris
- Acordati termen de 30 zile pentru obiectii

**4. Oferte valabile:**
- Anulati ofertele vechi
- Emiteti oferte noi cu TVA 21%
- Specificati "preturi valabile pana la..."

**Document recomandat:**
Adendum la contract cu formula:
"Incepand cu 01.08.2025, TVA se modifica conform Legii 141/2025"`,
                keyPoints: [
                  'Verificati clauze ajustare pret',
                  '"Cu TVA" = furnizor suporta diferenta',
                  'Notificati clientii pentru abonamente',
                  'Anulati oferte vechi'
                ],
                warning: 'Contractele pe termen lung FARA clauza de ajustare TVA va pot costa semnificativ. Renegociati ACUM!'
              }
            ],
            summary: [
              'Actualizati software-ul cu 3+ zile inainte',
              'Decideti: absorb sau transfer cresterea',
              'Comunicati clientilor din timp',
              'Verificati si renegociati contractele',
              'Documentati totul pentru audit'
            ],
            resources: [
              {
                title: 'Legea 141/2025 - Text integral',
                url: 'https://static.anaf.ro/static/10/Anaf/legislatie/Legea_141_2025.pdf',
                type: 'PDF'
              },
              {
                title: 'Norme metodologice TVA august 2025',
                url: 'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/TVA',
                type: 'LINK'
              }
            ]
          }
        }
      ]
    },
    {
      id: 'm-202',
      title: 'Declaratii si Raportare TVA',
      lessons: [
        {
          id: 'l-204',
          title: 'Declaratia D300 cu Noi Cote',
          duration: 15,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Declaratia D300 (decontul de TVA) trebuie sa reflecte corect noile cote. Aceasta lectie explica modificarile in completarea decontului incepand cu perioada august 2025.`,
            sections: [
              {
                title: 'Structura Noua D300',
                content: `**Modificari in formularul D300:**

Incepand cu decontul pentru august 2025 (depus in septembrie):

**Sectiunea "Livrari/Prestari taxabile":**
- Rand pentru cota 21% (inlocuieste 19%)
- Rand pentru cota 11% (inlocuieste 9%)
- Randul pentru 5% - eliminat/dezactivat

**Sectiunea "Achizitii cu drept de deducere":**
- Structura similara cu cotele noi
- Achizitii anterioare (19%, 9%, 5%) se mentin pentru rectificative

**Perioada tranzitorie (august 2025):**
Decontul poate contine AMBELE seturi de cote:
- Operatiuni pana in 31.07: cotele vechi
- Operatiuni din 01.08: cotele noi`,
                keyPoints: [
                  'Noi randuri pentru 21% si 11%',
                  'Rand 5% dezactivat',
                  'August = perioada mixta',
                  'Cotele vechi pentru rectificative'
                ]
              },
              {
                title: 'Calcul TVA Perioada Mixta',
                content: `**Exemplu pentru august 2025:**

**Vanzari:**
- 01-31 iulie: 100.000 RON + 19% = 19.000 RON TVA
- 01-31 august (vechi): 20.000 RON + 19% = 3.800 RON TVA
- 01-31 august (noi): 80.000 RON + 21% = 16.800 RON TVA

**Total TVA colectata august:**
- La 19%: 3.800 RON (operatiuni pana 31.07)
- La 21%: 16.800 RON (operatiuni din 01.08)
- **TOTAL: 20.600 RON**

**Completare D300 august:**
- Rand "Livrari 19%": 20.000 RON / TVA 3.800 RON
- Rand "Livrari 21%": 80.000 RON / TVA 16.800 RON

**Important:**
Data livrarii (nu data facturii!) determina cota.`,
                keyPoints: [
                  'Perioada mixta = ambele cote',
                  'Data LIVRARII determina cota',
                  'Nu data facturii!',
                  'Documentati clar in contabilitate'
                ],
                example: {
                  title: 'Inregistrare contabila corecta',
                  code: `// Vanzare cu livrare 30.07.2025 (cota veche)
4111 Clienti               = %           11.900 RON
                             707 Venituri  10.000 RON
                             4427 TVA 19%   1.900 RON

// Vanzare cu livrare 02.08.2025 (cota noua)
4111 Clienti               = %           12.100 RON
                             707 Venituri  10.000 RON
                             4427 TVA 21%   2.100 RON`,
                  explanation: 'Contul 4427 TVA colectata trebuie sa aiba analitice separate pentru fiecare cota pentru reconciliere usoara.'
                },
                warning: 'Nu amestecati cotele! Fiecare operatiune trebuie inregistrata cu cota de la data livrarii efective.'
              },
              {
                title: 'Declaratii Rectificative',
                content: `**Cand depuneti rectificativa:**

**1. Erori descoperite ulterior:**
- Cota gresita aplicata
- Calcul incorect
- Omisiuni

**2. Reguli pentru rectificative:**
- Se aplica cotele valabile la data operatiunii ORIGINALE
- Nu cotele de la data rectificarii!

**Exemplu:**
- Factura ianuarie 2025 cu eroare
- Rectificativa depusa octombrie 2025
- Se aplica TVA **19%** (cota din ianuarie)!

**3. Termen rectificare:**
- Maxim 5 ani de la data operatiunii
- Rectificativele se cumuleaza
- Pastrati documentatia completa

**4. Penalitati:**
- Rectificativa in favoarea bugetului: fara penalitati (cu exceptii)
- Rectificativa in favoarea contribuabilului: posibil audit`,
                keyPoints: [
                  'Rectificativa = cota de la data operatiunii',
                  'NU cota de la data rectificarii',
                  'Termen: 5 ani',
                  'Documentati motivul rectificarii'
                ]
              }
            ],
            summary: [
              'D300 actualizat cu randuri pentru 21% si 11%',
              'August 2025 = perioada mixta',
              'Data livrarii determina cota',
              'Rectificative = cotele originale',
              'Documentati fiecare operatiune clar'
            ],
            quiz: [
              {
                question: 'Ce determina cota TVA aplicabila pentru o livrare?',
                options: [
                  'Data facturii',
                  'Data platii',
                  'Data livrarii bunurilor/prestarii serviciilor',
                  'Data comenzii'
                ],
                correct: 2,
                explanation: 'Faptul generator TVA este livrarea bunurilor sau prestarea serviciilor. Data acestui eveniment determina cota aplicabila.'
              },
              {
                question: 'Pentru o rectificativa la o factura din martie 2025, ce cota TVA se aplica?',
                options: [
                  'Cota actuala (21%)',
                  'Cota de la data operatiunii originale (19%)',
                  'Media cotelor',
                  'Cota cea mai mare'
                ],
                correct: 1,
                explanation: 'Rectificativele se fac intotdeauna cu cotele valabile la data operatiunii originale, nu cu cotele actuale.'
              }
            ]
          }
        },
        {
          id: 'l-205',
          title: 'Alte Masuri Fiscale Legea 141/2025',
          duration: 12,
          type: 'VIDEO',
          videoPlaceholder: true,
          content: {
            introduction: `Legea 141/2025 nu modifica doar TVA-ul. Include si alte masuri fiscale importante pe care trebuie sa le cunoasteti pentru planificarea completa.`,
            sections: [
              {
                title: 'Impozit Dividende',
                content: `**Modificare impozit dividende:**

**Pana la 31.12.2025:** 8%
**Din 01.01.2026:** 16%

**Impact:**
- Dublarea impozitului pe dividende!
- Distributiile din 2025 beneficiaza de 8%
- Planificati distributiile inainte de 2026

**Strategie recomandata:**
Daca aveti profit nedistribuit, luati in considerare:
- Distributie dividende in Q4 2025 (8%)
- Reinvestire in loc de distributie
- Analiza impact personal (CASS pe dividende)`,
                keyPoints: [
                  'Dividende: 8% → 16% din 2026',
                  'Dublare efectiva!',
                  'Distributii 2025 = 8%',
                  'Planificati din timp'
                ],
                warning: 'Impozitul pe dividende se DUBLEAZA din ianuarie 2026! Analizati optiunile de distributie.'
              },
              {
                title: 'Accize Carburanti',
                content: `**Crestere accize cu 10%:**

Aplicabil din 1 august 2025:
- Benzina fara plumb
- Motorina
- GPL carburant

**Impact asupra preturilor:**
- Estimare crestere: +0.30-0.50 RON/litru
- Se cumuleaza cu TVA 21%
- Impact semnificativ pentru transportatori

**Pentru companii:**
- Actualizati bugetele de combustibil
- Renegociati contractele de transport
- Analizati eficientizarea flotei`,
                keyPoints: [
                  'Accize carburanti +10%',
                  'Crestere cumulativa cu TVA',
                  'Impact major pentru transport',
                  'Revizuiti bugete combustibil'
                ]
              },
              {
                title: 'CASS pe Pensii Mari',
                content: `**Contributie sanatate (CASS) pe pensii:**

**Pensii peste 3.000 RON:**
- Se datoreaza CASS 10% pe diferenta
- Retinuta la sursa de casa de pensii

**Exemplu calcul:**
- Pensie bruta: 4.500 RON
- Diferenta: 4.500 - 3.000 = 1.500 RON
- CASS: 1.500 x 10% = 150 RON
- Pensie neta: 4.350 RON

**Impact pentru angajatori:**
- Verificati pensionarii angajati
- Ei pot datora CASS dublu
- Consultati expertul fiscal`,
                keyPoints: [
                  'CASS 10% pe pensii > 3.000 RON',
                  'Retinere la sursa',
                  'Calcul pe diferenta',
                  'Atentie la pensionari angajati'
                ]
              }
            ],
            summary: [
              'Dividende: cresc la 16% din 2026',
              'Accize carburanti: +10% din august 2025',
              'CASS pensii: 10% pe diferenta peste 3.000 RON',
              'Planificati distributii si bugete',
              'Consultati expert fiscal pentru situatia dvs.'
            ]
          }
        }
      ]
    }
  ]
};

// Course content database
const coursesContent: Record<string, CourseContent> = {
  'c-001': saftCourse,
  'c-002': efacturaCourse,
  'c-003': tvaCourse,
};

// ============================================================================
// LESSON PAGE COMPONENT
// ============================================================================

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const [isPlaying, setIsPlaying] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Get course and lesson
  const course = coursesContent[courseId];

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-semibold mb-2">Curs negasit</h1>
          <p className="text-gray-500 mb-4">Continutul nu este disponibil.</p>
          <Link href="/dashboard/lms" className="text-blue-600 hover:underline">
            Inapoi la cursuri
          </Link>
        </div>
      </div>
    );
  }

  // Find lesson
  let currentLesson: LessonContent | null = null;
  let currentModuleIndex = 0;
  let currentLessonIndex = 0;
  let allLessons: { lesson: LessonContent; moduleTitle: string }[] = [];

  course.modules.forEach((module, mIdx) => {
    module.lessons.forEach((lesson, lIdx) => {
      allLessons.push({ lesson, moduleTitle: module.title });
      if (lesson.id === lessonId) {
        currentLesson = lesson;
        currentModuleIndex = mIdx;
        currentLessonIndex = lIdx;
      }
    });
  });

  if (!currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-semibold mb-2">Lectie negasita</h1>
          <p className="text-gray-500 mb-4">Aceasta lectie nu exista.</p>
          <Link href={`/dashboard/lms/courses/${courseId}`} className="text-blue-600 hover:underline">
            Inapoi la curs
          </Link>
        </div>
      </div>
    );
  }

  const lesson: LessonContent = currentLesson;
  const currentIndex = allLessons.findIndex(l => l.lesson.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const checkQuiz = () => {
    setShowQuizResults(true);
  };

  const quizScore = (lesson.content.quiz || []).reduce((score, q, idx) => {
    return score + (quizAnswers[idx] === q.correct ? 1 : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - Course Navigation */}
      {showSidebar && (
        <div className="w-80 bg-white border-r flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between mb-2">
              <Link href={`/dashboard/lms/courses/${courseId}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Inapoi la curs
              </Link>
              <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="font-semibold text-gray-900 truncate">{course.title}</h2>
          </div>

          <div className="p-2">
            {course.modules.map((module, mIdx) => (
              <div key={module.id} className="mb-2">
                <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded">
                  {mIdx + 1}. {module.title}
                </div>
                <div className="ml-2">
                  {module.lessons.map((l, lIdx) => (
                    <Link
                      key={l.id}
                      href={`/dashboard/lms/courses/${courseId}/lessons/${l.id}`}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded ${
                        l.id === lessonId
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center text-xs bg-gray-200 rounded-full">
                        {lIdx + 1}
                      </span>
                      <span className="flex-1 truncate">{l.title}</span>
                      <span className="text-xs text-gray-400">{l.duration}m</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-gray-100 rounded">
                  <List className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className="font-semibold text-gray-900">{lesson.title}</h1>
                <p className="text-sm text-gray-500">{course.modules[currentModuleIndex].title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {lesson.duration} min
              </span>
              <button
                onClick={() => setCompleted(!completed)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
                  completed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                {completed ? 'Completat' : 'Marcheaza completat'}
              </button>
            </div>
          </div>
        </div>

        {/* Video Placeholder */}
        {lesson.videoPlaceholder && (
          <div className="bg-gray-900 aspect-video max-w-5xl mx-auto">
            <div className="h-full flex flex-col items-center justify-center text-white">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 cursor-pointer transition ${
                  isPlaying ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 ml-1" />
                )}
              </div>
              <p className="text-gray-400 mb-1">Video in pregatire</p>
              <p className="text-sm text-gray-500">Continutul text complet este disponibil mai jos</p>
              <div className="flex items-center gap-4 mt-4 text-gray-500">
                <button className="p-2 hover:text-white"><Volume2 className="h-5 w-5" /></button>
                <button className="p-2 hover:text-white"><Settings className="h-5 w-5" /></button>
                <button className="p-2 hover:text-white"><Maximize className="h-5 w-5" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Lesson Content */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Introduction */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Introducere</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {lesson.content.introduction}
            </p>
          </div>

          {/* Sections */}
          {lesson.content.sections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
              >
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                {expandedSections[section.title] ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {(expandedSections[section.title] !== false) && (
                <div className="p-6">
                  <div className="prose max-w-none text-gray-700 whitespace-pre-line mb-4">
                    {section.content}
                  </div>

                  {/* Key Points */}
                  {section.keyPoints && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Puncte cheie
                      </h4>
                      <ul className="space-y-1">
                        {section.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-blue-700">
                            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Example */}
                  {section.example && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2">{section.example.title}</h4>
                      {section.example.code && (
                        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto mb-2">
                          {section.example.code}
                        </pre>
                      )}
                      <p className="text-gray-600 text-sm">{section.example.explanation}</p>
                    </div>
                  )}

                  {/* Warning */}
                  {section.warning && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700">{section.warning}</p>
                      </div>
                    </div>
                  )}

                  {/* Tip */}
                  {section.tip && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-green-700">{section.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Summary */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white mb-6">
            <h3 className="text-lg font-bold mb-4">Rezumat</h3>
            <ul className="space-y-2">
              {lesson.content.summary.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Practice Exercise */}
          {lesson.content.practiceExercise && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                {lesson.content.practiceExercise.title}
              </h3>
              <p className="text-gray-600 mb-4">{lesson.content.practiceExercise.description}</p>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                {lesson.content.practiceExercise.steps.map((step, idx) => (
                  <li key={idx} className="text-gray-700">{step}</li>
                ))}
              </ol>
              {lesson.content.practiceExercise.solution && (
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-blue-600">Vezi solutia</summary>
                  <pre className="mt-3 text-sm text-gray-700 whitespace-pre-line">
                    {lesson.content.practiceExercise.solution}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Quiz */}
          {lesson.content.quiz && lesson.content.quiz.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">Test de verificare</h3>
              <div className="space-y-6">
                {lesson.content.quiz.map((q, qIdx) => (
                  <div key={qIdx} className="border-b pb-4 last:border-0">
                    <p className="font-medium mb-3">{qIdx + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                            quizAnswers[qIdx] === oIdx
                              ? 'bg-blue-50 border-2 border-blue-500'
                              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          } ${
                            showQuizResults && oIdx === q.correct
                              ? 'bg-green-50 border-green-500'
                              : ''
                          } ${
                            showQuizResults && quizAnswers[qIdx] === oIdx && oIdx !== q.correct
                              ? 'bg-red-50 border-red-500'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${qIdx}`}
                            checked={quizAnswers[qIdx] === oIdx}
                            onChange={() => handleQuizAnswer(qIdx, oIdx)}
                            disabled={showQuizResults}
                            className="w-4 h-4"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                    {showQuizResults && (
                      <div className={`mt-3 p-3 rounded-lg text-sm ${
                        quizAnswers[qIdx] === q.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!showQuizResults ? (
                <button
                  onClick={checkQuiz}
                  disabled={Object.keys(quizAnswers).length < (lesson.content.quiz?.length || 0)}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Verifica raspunsurile
                </button>
              ) : (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">
                    Scor: {quizScore} din {lesson.content.quiz?.length} corecte
                    {quizScore === lesson.content.quiz?.length && ' - Excelent!'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Resources */}
          {lesson.content.resources && lesson.content.resources.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Download className="h-5 w-5" />
                Resurse suplimentare
              </h3>
              <div className="space-y-2">
                {lesson.content.resources.map((resource, idx) => (
                  <a
                    key={idx}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    {resource.type === 'PDF' && <FileText className="h-5 w-5 text-red-500" />}
                    {resource.type === 'LINK' && <BookOpen className="h-5 w-5 text-blue-500" />}
                    {resource.type === 'DOWNLOAD' && <Download className="h-5 w-5 text-green-500" />}
                    <span className="flex-1">{resource.title}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            {prevLesson ? (
              <Link
                href={`/dashboard/lms/courses/${courseId}/lessons/${prevLesson.lesson.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <div className="text-left">
                  <p className="text-xs text-gray-500">Lectia anterioara</p>
                  <p className="font-medium text-sm">{prevLesson.lesson.title}</p>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {nextLesson ? (
              <Link
                href={`/dashboard/lms/courses/${courseId}/lessons/${nextLesson.lesson.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <div className="text-right">
                  <p className="text-xs text-blue-200">Lectia urmatoare</p>
                  <p className="font-medium text-sm">{nextLesson.lesson.title}</p>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/dashboard/lms/courses/${courseId}`}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Finalizeaza cursul
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
