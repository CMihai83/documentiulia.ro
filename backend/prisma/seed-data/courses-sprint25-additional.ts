/**
 * DocumentIulia.ro - Sprint 25 Additional LMS Courses
 * Focused on practical business skills for Romanian entrepreneurs
 * Created: December 2025
 */

export const sprint25AdditionalCourses = [
  // PFA Registration Course
  {
    title: 'Ghid Complet PFA: De la Înregistrare la Primele Venituri',
    slug: 'pfa-ghid-complet-inregistrare',
    description: `Cursul esențial pentru freelanceri și consultanți care vor să-și deschidă un PFA în România.

Vei învăța:
• Procedura completă de înregistrare PFA
• Cele 3 sisteme de impozitare și cum să alegi
• Contribuții sociale: CAS și CASS explicate
• Cum să emiți facturi și să-ți gestionezi veniturile
• Greșeli frecvente și cum să le eviți

Cursul include modele de documente, calculatoare fiscale și exemple reale.`,
    category: 'BUSINESS',
    level: 'BEGINNER',
    duration: 360,
    price: 0,
    isFree: true,
    language: 'ro',
    tags: ['PFA', 'freelancer', 'înregistrare', 'fiscalitate', 'ANAF'],
    modules: [
      {
        title: 'Înregistrarea PFA',
        order: 1,
        duration: 90,
        lessons: [
          {
            title: 'Ce este un PFA și pentru cine e potrivit',
            type: 'TEXT',
            duration: 25,
            order: 1,
            content: `# Ce Este un PFA?

## Definiție

PFA (Persoană Fizică Autorizată) este o formă juridică simplă care permite unei persoane fizice să desfășoare activități economice în mod independent, fără a înființa o societate comercială.

## Caracteristici principale

### Identitate juridică
- PFA NU este o entitate juridică separată
- Activitatea se desfășoară în numele persoanei fizice
- CUI-ul PFA este același cu CNP-ul titularului

### Răspundere
- **Răspundere nelimitată** - risc personal
- Datoriile PFA pot fi urmărite din patrimoniul personal
- Important de înțeles înainte de a alege această formă

### Avantaje
1. **Simplitate administrativă** - contabilitate în partidă simplă
2. **Costuri reduse** - înregistrare și mentenanță ieftine
3. **Flexibilitate fiscală** - 3 opțiuni de impozitare
4. **Retragere imediată** - veniturile sunt ale tale direct

### Dezavantaje
1. **Răspundere nelimitată** - risc patrimoniu personal
2. **Fără angajați** - nu poți avea personal
3. **Credibilitate** - unii clienți preferă SRL
4. **Limitare activități** - doar cele autorizate

## Pentru cine e potrivit PFA?

### Ideal pentru:
- ✅ Freelanceri IT (programatori, designeri)
- ✅ Consultanți (business, marketing, HR)
- ✅ Profesii liberale (traducători, formatori)
- ✅ Creatori de conținut
- ✅ Artiști și meșteșugari
- ✅ Agenți de vânzări

### Nu e potrivit pentru:
- ❌ Activități cu risc mare
- ❌ Cei care vor să angajeze
- ❌ Afaceri care necesită credibilitate corporativă
- ❌ Atragere investitori

## PFA vs alte forme

| Criteriu | PFA | SRL | II |
|----------|-----|-----|-----|
| Răspundere | Nelimitată | Limitată | Nelimitată |
| Angajați | Nu | Da | Max 8 |
| Capital minim | 0 | 1 RON | 0 |
| Contabilitate | Simplă | Dublă | Simplă |

## Concluzie

PFA este forma juridică perfectă pentru cei care lucrează singuri, au activități cu risc scăzut și doresc simplitate administrativă. Analizează-ți situația și decide dacă avantajele depășesc dezavantajele în cazul tău specific.`
          },
          {
            title: 'Procedura de înregistrare pas cu pas',
            type: 'TEXT',
            duration: 30,
            order: 2,
            content: `# Procedura de Înregistrare PFA

## Unde se înregistrează?

PFA se înregistrează la **ONRC (Oficiul Național al Registrului Comerțului)** din județul în care vei avea sediul profesional.

## Documente necesare

### Lista completă:

| Document | De unde | Cost |
|----------|---------|------|
| Cerere înregistrare PFA | ONRC sau online | Gratuit |
| Copie CI | - | - |
| Specimen semnătură | Notar sau ONRC | 0-50 RON |
| Dovadă sediu | Contract/Comodat | Variabil |
| Dovadă calificare* | Diplome/certificate | - |
| Cazier fiscal | ANAF online | Gratuit |

*Pentru anumite activități reglementate

### Documente sediu profesional:
- Contract comodat (pentru spațiu personal)
- Contract închiriere (pentru spațiu închiriat)
- Extras CF (maxim 30 zile)
- Acord proprietar

## Procedura în 5 pași

### Pasul 1: Pregătire (1-2 zile)
1. Decide codul CAEN principal
2. Alege sediul profesional
3. Adună documentele

### Pasul 2: Depunere (1 zi)
**Online:**
- portal.onrc.ro
- Necesită semnătură electronică
- Disponibil 24/7

**La ghișeu:**
- Mergi la ONRC
- Program: L-V, 9-13
- Ia număr de ordine

### Pasul 3: Așteptare (1-3 zile)
- Verificare documente
- Eventual clarificări

### Pasul 4: Aprobare
- Primești certificat de înregistrare
- CUI = CNP-ul tău

### Pasul 5: Post-înregistrare
- Deschide cont bancar (opțional)
- Alege sistemul de impozitare
- Configurează facturarea

## Costuri înregistrare

| Element | Cost |
|---------|------|
| Taxă ONRC | ~100 RON |
| Notar (dacă e necesar) | 0-100 RON |
| **Total minim** | **~100 RON** |

## Timp total estimat

- **Pregătire:** 1-2 zile
- **Depunere și aprobare:** 1-5 zile
- **Total:** 3-7 zile lucrătoare

## Sfaturi practice

### DO:
- ✅ Pregătește toate documentele înainte
- ✅ Verifică corectitudinea datelor
- ✅ Alege coduri CAEN pentru flexibilitate
- ✅ Păstrează copii ale tuturor documentelor

### DON'T:
- ❌ Nu grăbi procesul fără pregătire
- ❌ Nu ignora dovada de calificare
- ❌ Nu uita să verifici restricțiile

## Concluzie

Înregistrarea PFA este un proces simplu și rapid. Cu pregătirea corectă, poți avea totul gata în câteva zile. Urmează pașii din acest ghid și vei evita problemele comune.`
          },
          {
            title: 'Alegerea codurilor CAEN pentru PFA',
            type: 'TEXT',
            duration: 20,
            order: 3,
            content: `# Coduri CAEN pentru PFA

## Importanța alegerii corecte

La PFA, codurile CAEN sunt și mai importante decât la SRL:
- Poți desfășura DOAR activitățile autorizate
- Unele necesită dovadă de calificare
- Afectează normele de venit

## Coduri CAEN populare pentru PFA

### IT și Digital
| Cod | Denumire | Normă venit* |
|-----|----------|--------------|
| 6201 | Software la comandă | 35.000-50.000 |
| 6202 | Consultanță IT | 30.000-45.000 |
| 6312 | Portale web | 25.000-40.000 |
| 7311 | Publicitate | 20.000-35.000 |

### Consultanță
| Cod | Denumire | Normă venit* |
|-----|----------|--------------|
| 7022 | Consultanță management | 25.000-40.000 |
| 7320 | Cercetare piață | 20.000-35.000 |
| 8559 | Alte forme învățământ | 15.000-25.000 |

### Servicii
| Cod | Denumire | Normă venit* |
|-----|----------|--------------|
| 7420 | Fotografie | 15.000-25.000 |
| 7430 | Traduceri | 20.000-30.000 |
| 9002 | Activități suport spectacole | 15.000-25.000 |

*Orientativ, variază pe județe

## Restricții și calificări

### Activități cu calificare obligatorie:
- Construcții - atestate profesionale
- Instalații - autorizații ANRE
- Contabilitate - certificat CECCAR
- Medicină - diplomă și drept de practică

### Activități interzise PFA:
- Comerț cu ridicata
- Producție industrială
- Activități bancare
- Asigurări

## Sfaturi alegere CAEN

1. **Alege codul principal** cel mai relevant pentru activitate
2. **Adaugă coduri secundare** pentru flexibilitate
3. **Verifică restricțiile** înainte de depunere
4. **Consultă normele** dacă vrei acest sistem

## Concluzie

Alegerea CAEN la PFA afectează direct ce poți face legal. Alege cu grijă și adaugă coduri pentru activități viitoare posibile.`
          }
        ]
      },
      {
        title: 'Fiscalitate PFA',
        order: 2,
        duration: 120,
        lessons: [
          {
            title: 'Cele 3 sisteme de impozitare PFA',
            type: 'TEXT',
            duration: 35,
            order: 1,
            content: `# Sistemele de Impozitare PFA

## Introducere

Ca PFA, ai 3 opțiuni de impozitare:
1. Norma de venit
2. Sistem real - cote forfetare
3. Sistem real - cheltuieli efective

Alegerea se face la înregistrare sau până pe 31 ianuarie pentru anul următor.

## 1. Norma de Venit

### Ce este?
Un venit fix stabilit de ANAF pe baza:
- Codului CAEN
- Județului
- Alți factori

### Cum funcționează?
- Plătești impozit pe normă, NU pe venitul real
- Normă fixă indiferent cât câștigi efectiv

### Calcul:
\`\`\`
Impozit = Normă de venit × 10%
\`\`\`

### Exemplu:
- Normă de venit IT București: 40.000 RON
- Impozit anual: 4.000 RON
- Indiferent dacă câștigi 50.000 sau 200.000 RON

### Avantaje:
- ✅ Predictibilitate - știi exact cât plătești
- ✅ Simplitate - fără evidență cheltuieli
- ✅ Avantajos pentru venituri mari

### Dezavantaje:
- ❌ Plătești chiar dacă nu ai venituri
- ❌ Nu deduci cheltuieli
- ❌ Nu pentru toate activitățile

## 2. Sistem Real - Cote Forfetare

### Ce este?
Cheltuieli estimate procentual din venituri.

### Cum funcționează?
- Venit brut - Cheltuieli forfetare (%) = Venit impozabil
- Impozit = 10% din venitul impozabil

### Cote forfetare:
| Activitate | Cotă cheltuieli |
|------------|-----------------|
| IT, consultanță | 40% |
| Comerț | 60% |
| Alte servicii | 25-40% |

### Exemplu:
- Venituri: 100.000 RON
- Cheltuieli forfetare 40%: 40.000 RON
- Venit impozabil: 60.000 RON
- Impozit: 6.000 RON

### Avantaje:
- ✅ Fără documente de cheltuieli
- ✅ Simplitate
- ✅ Bun pentru costuri mici

### Dezavantaje:
- ❌ Nu deduci cheltuieli mari
- ❌ Dezavantajos dacă ai costuri reale mari

## 3. Sistem Real - Cheltuieli Efective

### Ce este?
Impozit pe profit real (venituri - cheltuieli documentate).

### Cum funcționează?
- Ții evidență tuturor cheltuielilor
- Venit - Cheltuieli reale = Profit
- Impozit = 10% din profit

### Exemplu:
- Venituri: 100.000 RON
- Cheltuieli documentate: 35.000 RON
- Profit: 65.000 RON
- Impozit: 6.500 RON

### Avantaje:
- ✅ Plătești pe profit real
- ✅ Deduci toate cheltuielile legitime
- ✅ Avantajos pentru cheltuieli mari

### Dezavantaje:
- ❌ Evidență contabilă mai complexă
- ❌ Trebuie documente pentru tot
- ❌ Controale mai detaliate

## Comparație

| Criteriu | Normă | Forfetar | Real |
|----------|-------|----------|------|
| Simplitate | ★★★ | ★★☆ | ★☆☆ |
| Deduceri | Nu | Limitat | Da |
| Predictibilitate | ★★★ | ★★☆ | ★☆☆ |
| Flexibilitate | ★☆☆ | ★★☆ | ★★★ |

## Cum să alegi?

### Alege NORMA dacă:
- Venituri mari și stabile
- Cheltuieli mici
- Vrei simplitate maximă

### Alege FORFETAR dacă:
- Venituri moderate
- Cheltuieli sub cota forfetară
- Vrei simplitate

### Alege REAL dacă:
- Cheltuieli semnificative documentabile
- Venituri variabile
- Vrei optimizare maximă

## Concluzie

Nu există sistem "cel mai bun" - depinde de situația ta. Calculează pentru toate trei și alege cel mai avantajos.`
          },
          {
            title: 'Contribuții sociale: CAS și CASS',
            type: 'TEXT',
            duration: 30,
            order: 2,
            content: `# Contribuții Sociale PFA

## Ce sunt CAS și CASS?

### CAS (Contribuția de Asigurări Sociale)
- Pentru pensie
- 25% din baza de calcul
- Plată obligatorie sau opțională (depinde de venit)

### CASS (Contribuția de Asigurări Sociale de Sănătate)
- Pentru sistemul de sănătate
- 10% din baza de calcul
- Obligatorie dacă venituri > 6 salarii minime/an

## Când sunt obligatorii?

### CAS - Pensie
**Obligatoriu dacă:**
- Venitul anual ≥ 12 × salariul minim

**Opțional dacă:**
- Venit sub prag
- Dar recomandat pentru drept la pensie

### CASS - Sănătate
**Obligatoriu dacă:**
- Venitul anual ≥ 6 × salariul minim (~22.200 RON în 2025)

**Excepții:**
- Salariat în paralel (plătit deja)
- Pensionar
- Student

## Baza de calcul 2025

### Pentru venituri până la 24 salarii minime:
- Baza = 12 × salariul minim = 44.400 RON

### Pentru venituri peste 24 salarii minime:
- Baza = 24 × salariul minim = 88.800 RON

## Calcul contribuții

### Exemplu 1: Venit 100.000 RON/an
| Contribuție | Bază | Procent | Sumă |
|-------------|------|---------|------|
| CAS | 44.400 | 25% | 11.100 RON |
| CASS | 44.400 | 10% | 4.440 RON |
| **Total** | - | - | **15.540 RON** |

### Exemplu 2: Venit 200.000 RON/an
| Contribuție | Bază | Procent | Sumă |
|-------------|------|---------|------|
| CAS | 88.800 | 25% | 22.200 RON |
| CASS | 88.800 | 10% | 8.880 RON |
| **Total** | - | - | **31.080 RON** |

## Termene de plată

### Declarația unică (D212)
- Termen: 25 mai anul următor
- Include estimare venituri + contribuții

### Plată contribuții
- Opțiune 1: Integral până pe 25 mai
- Opțiune 2: Trimestrial (cu dobândă)

## Optimizări legale

### 1. Salariu în paralel
Dacă ești și angajat, CASS-ul e deja plătit → nu mai plătești din PFA.

### 2. Contract de management
Unii preferă contract de management la SRL propriu pentru optimizare.

### 3. Pensie opțională
Dacă ești sub prag dar vrei vechime, plătești voluntar CAS.

## Sfaturi practice

### DO:
- ✅ Calculează contribuțiile în avans
- ✅ Pune bani deoparte lunar
- ✅ Depune D212 la timp
- ✅ Verifică dacă ai excepții

### DON'T:
- ❌ Nu ignora contribuțiile
- ❌ Nu aștepta ultimul moment
- ❌ Nu subestima sumele

## Concluzie

Contribuțiile sociale sunt o parte semnificativă din obligațiile PFA. Planifică-le din timp și includ-le în calculul venitului net real.`
          }
        ]
      }
    ]
  },

  // First Year Business Finances
  {
    title: 'Finanțele Afacerii în Primul An: Ghid Practic pentru Start-up-uri',
    slug: 'finante-afacere-primul-an',
    description: `Cum să-ți gestionezi corect banii în primul an de afacere?

Acest curs te învață:
• Cum să stabilești prețurile corect
• Gestionarea cash flow-ului
• Când și cum să reinvestești
• Separarea banilor personali de cei ai firmei
• Planificare financiară pentru creștere

Perfect pentru antreprenori la început de drum.`,
    category: 'ACCOUNTING',
    level: 'BEGINNER',
    duration: 420,
    price: 79,
    isFree: false,
    language: 'ro',
    tags: ['finanțe', 'cash flow', 'buget', 'startup', 'management financiar'],
    modules: [
      {
        title: 'Bazele Finanțelor de Afaceri',
        order: 1,
        duration: 100,
        lessons: [
          {
            title: 'Separarea banilor: personal vs firmă',
            type: 'TEXT',
            duration: 25,
            order: 1,
            content: `# Separarea Banilor: Personal vs Firmă

## De ce este esențial?

### Motive legale:
- Răspundere separată (la SRL)
- Audit trail curat
- Conformitate fiscală
- Evitarea problemelor cu ANAF

### Motive practice:
- Claritate în contabilitate
- Decizii de business bazate pe date reale
- Ușurință în raportare
- Profesionalism

## Cum să separi corect

### Pasul 1: Conturi bancare separate
- **Cont firmă** - doar pentru tranzacții business
- **Cont personal** - doar pentru cheltuieli personale
- **Cont economii firmă** - pentru rezerve și taxe

### Pasul 2: Card business
- Folosește cardul firmei doar pentru cheltuieli firmă
- Păstrează TOATE bonurile și facturile
- Notează scopul fiecărei cheltuieli

### Pasul 3: Salariu fix
- Stabilește un "salariu" pentru tine
- Transfer lunar regulat din firmă
- Documentat corespunzător

## Ce NU trebuie să faci

### ❌ Greșeli frecvente:
- Plata facturii de telefon personal din cont firmă
- Cumpărături personale cu card business
- Depuneri cash nedocumentate
- Împrumuturi către firmă fără contract

## Consecințe

### La SRL:
- Pierderea protecției răspunderii limitate
- Probleme fiscale
- Penalități și amenzi

### La PFA:
- Contabilitate haotică
- Dificultate în determinarea profitului real
- Controale neplăcute

## Soluții practice

### Pentru cheltuieli mixte:
- Telefon: plan business separat
- Mașină: jurnal deplasări sau leasing pe firmă
- Birou acasă: calcul proporțional documentat

### Pentru extragere bani:
- SRL: dividende sau salariu
- PFA: retragere directă (documentată)

## Concluzie

Separarea este un obicei care trebuie format de la început. Cu cât o faci mai devreme și mai riguros, cu atât vei avea mai puține probleme pe viitor.`
          },
          {
            title: 'Cash flow 101: Înțelege fluxul de numerar',
            type: 'TEXT',
            duration: 30,
            order: 2,
            content: `# Cash Flow 101

## Ce este Cash Flow-ul?

Cash flow (fluxul de numerar) = banii care INTRĂ și IES din afacerea ta.

### De ce contează?
- Profitul ≠ Cash
- Poți fi profitabil și să dai faliment
- Cash-ul plătește facturile, nu profitul

## Componente Cash Flow

### Intrări (Cash In):
- Încasări de la clienți
- Împrumuturi primite
- Investiții de capital
- Vânzări de active

### Ieșiri (Cash Out):
- Plăți furnizori
- Salarii și contribuții
- Chirii și utilități
- Rate credite
- Taxe și impozite

## Calculul simplu

\`\`\`
Cash Flow = Încasări - Plăți

Sold final = Sold inițial + Cash Flow
\`\`\`

## Exemplu practic

### Luna Ianuarie:
| Element | Sumă |
|---------|------|
| Sold inițial | 5.000 RON |
| Încasări clienți | 15.000 RON |
| Plăți furnizori | -8.000 RON |
| Salarii | -4.000 RON |
| Chirie | -2.000 RON |
| **Cash Flow** | **1.000 RON** |
| **Sold final** | **6.000 RON** |

## Probleme comune

### 1. Decalaj încasări
- Facturezi azi
- Încasezi peste 30-60 zile
- Dar plătești salarii luna asta

### 2. Sezonalitate
- Luni cu vânzări mari
- Luni cu vânzări mici
- Cheltuieli fixe constante

### 3. Cheltuieli neprevăzute
- Reparații
- Penalități
- Oportunități de investiție

## Strategii de gestionare

### 1. Previzionare
- Prognozează cash flow pe 3-6 luni
- Actualizează săptămânal
- Identifică problemele din timp

### 2. Accelerează încasările
- Termene de plată mai scurte
- Discount pentru plată rapidă
- Facturare promptă

### 3. Întârzie plățile (legal)
- Negociază termene mai lungi
- Plătește la scadență, nu înainte
- Prioritizează plățile

### 4. Menține rezerve
- Minim 3 luni cheltuieli fixe
- Cont separat pentru urgențe

## Concluzie

Cash flow-ul este sângele afacerii tale. Monitorizează-l constant și anticipează problemele înainte să apară.`
          }
        ]
      }
    ]
  },

  // Digital Marketing Basics
  {
    title: 'Marketing Digital pentru Afaceri Mici: Ghid Practic',
    slug: 'marketing-digital-afaceri-mici',
    description: `Învață să-ți promovezi afacerea online fără buget mare!

Acest curs acoperă:
• Prezență online esențială (site, social media)
• Google My Business și SEO local
• Social media marketing pentru începători
• Email marketing eficient
• Publicitate online cu buget mic
• Măsurare rezultate și optimizare

Exemple practice și template-uri incluse.`,
    category: 'MARKETING',
    level: 'BEGINNER',
    duration: 480,
    price: 99,
    isFree: false,
    language: 'ro',
    tags: ['marketing digital', 'social media', 'SEO', 'publicitate online', 'IMM'],
    modules: [
      {
        title: 'Fundația Prezenței Online',
        order: 1,
        duration: 120,
        lessons: [
          {
            title: 'Site web: de la 0 la prezență profesională',
            type: 'TEXT',
            duration: 30,
            order: 1,
            content: `# Site Web pentru Afaceri Mici

## De ce ai nevoie de site?

### Statistici:
- 70% din consumatori cercetează online înainte de cumpărare
- 30% nu au încredere în afaceri fără site
- Site-ul lucrează 24/7

## Opțiuni de creare site

### 1. Platforme DIY (Do It Yourself)

**Wix, Squarespace, Webflow:**
- Cost: 100-300 EUR/an
- Timp: 1-2 zile
- Nivel tehnic: minim

**WordPress.com:**
- Cost: 0-300 EUR/an
- Timp: 2-5 zile
- Nivel tehnic: mediu

### 2. WordPress self-hosted

- Cost: 50-100 EUR/an (hosting) + teme
- Timp: 1-2 săptămâni
- Control total
- Necesită cunoștințe sau ajutor

### 3. Agenție/Freelancer

- Cost: 500-5.000+ EUR
- Timp: 2-8 săptămâni
- Rezultat profesional
- Întreținere necesară

## Pagini esențiale

### 1. Acasă (Homepage)
- Cine ești
- Ce faci
- Pentru cine
- CTA (Call to Action)

### 2. Despre noi
- Poveste
- Echipă
- Valori
- Credibilitate

### 3. Servicii/Produse
- Descrieri clare
- Prețuri (dacă e posibil)
- Beneficii, nu doar caracteristici

### 4. Contact
- Formular
- Email
- Telefon
- Adresă/Hartă

### 5. Blog (opțional dar recomandat)
- SEO
- Expertiză
- Conținut proaspăt

## Elemente de design esențiale

### Must-have:
- ✅ Logo profesional
- ✅ Responsive (mobil)
- ✅ Viteză rapidă
- ✅ SSL (https)
- ✅ Contact vizibil
- ✅ CTA clare

### De evitat:
- ❌ Animații excesive
- ❌ Text prea mult
- ❌ Fonturi greu de citit
- ❌ Imagini de proastă calitate
- ❌ Pop-up-uri agresive

## SEO de bază

### On-page:
- Titluri cu cuvinte cheie
- Meta descrieri
- URL-uri curate
- Alt text imagini

### Tehnic:
- Viteză pagină
- Mobile-first
- Sitemap XML
- Robots.txt

## Concluzie

Un site simplu dar profesional e mai bun decât niciunul. Începe cu minimul necesar și îmbunătățește pe parcurs.`
          },
          {
            title: 'Google My Business: vizibilitate locală gratuită',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Google My Business

## Ce este GMB?

Google My Business (acum Google Business Profile) este un instrument GRATUIT care permite afacerii tale să apară în:
- Căutările Google
- Google Maps
- Rezultatele locale

## De ce e important?

### Statistici:
- 46% din căutările Google sunt locale
- 88% din căutările locale pe mobil duc la acțiune
- Primele 3 rezultate locale primesc 75% din clicuri

## Cum să creezi un profil

### Pasul 1: Înregistrare
1. Accesează business.google.com
2. Loghează-te cu cont Google
3. Adaugă numele afacerii

### Pasul 2: Verificare
- Carte poștală (3-14 zile)
- Telefon (instant, nu mereu disponibil)
- Email (pentru unele categorii)

### Pasul 3: Completare profil
Completează 100% pentru rezultate maxime!

## Elemente profil

### Esențiale:
- Nume afacere (exact ca pe acte)
- Adresă completă
- Telefon
- Website
- Ore program
- Categorie principală

### Recomandate:
- Descriere (750 caractere)
- Fotografii (minim 5-10)
- Logo
- Atribute (Wi-Fi, acces dizabilități, etc.)

### Avansate:
- Produse/Servicii
- Postări regulate
- Q&A
- Mesaje

## Optimizare pentru vizibilitate

### 1. Cuvinte cheie
Include în descriere cuvintele după care caută clienții.

### 2. Fotografii
- Exteriorul clădirii
- Interiorul
- Produse/Servicii
- Echipa
- Actualizează regulat

### 3. Recenzii
- Încurajează clienții să lase review
- Răspunde la TOATE (și negative)
- Nu cumpăra recenzii false

### 4. Postări
- Oferte speciale
- Noutăți
- Evenimente
- Postează săptămânal

## Măsurare rezultate

### În GMB vezi:
- Vizualizări profil
- Căutări (directe vs. discovery)
- Acțiuni (apeluri, direcții, site)
- Performanță fotografii

## Greșeli de evitat

### ❌ Nume cu keyword stuffing
"Florărie București - Flori - Buchete" → Nu!
"Florăria Delia" → Da!

### ❌ Adresă falsă
Google penalizează și poate interzice.

### ❌ Recenzii false
Detectabile și penalizate.

### ❌ Profil neactualizat
Ore program greșite = clienți pierduți.

## Concluzie

GMB este poate cel mai important instrument de marketing local GRATUIT. Configurează-l corect și menține-l actualizat pentru rezultate excelente.`
          }
        ]
      }
    ]
  },

  // Contract Law Basics
  {
    title: 'Dreptul Contractelor pentru Antreprenori: Ghid Esențial',
    slug: 'drept-contracte-antreprenori',
    description: `Înțelege bazele legale ale contractelor de afaceri!

Acest curs te învață:
• Elementele esențiale ale unui contract valid
• Tipuri de contracte în afaceri
• Clauze esențiale și periculoase
• Negocierea contractelor
• Ce să faci când un contract e încălcat
• Template-uri și modele utile

Nu e nevoie de pregătire juridică - explicații simple și practice.`,
    category: 'LEGAL',
    level: 'BEGINNER',
    duration: 300,
    price: 69,
    isFree: false,
    language: 'ro',
    tags: ['contracte', 'drept comercial', 'clauze', 'negociere', 'legal'],
    modules: [
      {
        title: 'Bazele Contractelor',
        order: 1,
        duration: 80,
        lessons: [
          {
            title: 'Ce face un contract valid?',
            type: 'TEXT',
            duration: 25,
            order: 1,
            content: `# Elementele Contractului Valid

## Definiție

Un contract este un acord de voințe între două sau mai multe părți, care creează obligații juridice.

## Condiții de validitate

### 1. Capacitatea părților
- Persoane fizice: 18 ani sau emancipate
- Persoane juridice: reprezentate legal

### 2. Consimțământul
- Liber exprimat
- Fără eroare, dol sau violență
- Partea să înțeleagă ce semnează

### 3. Obiectul
- Determinat sau determinabil
- Posibil
- Licit (legal)

### 4. Cauza
- Să existe
- Să fie licită
- Să fie morală

## Forma contractului

### Contracte consensuale
- Valide prin simplu acord verbal
- Exemplu: vânzare bunuri mobile

### Contracte solemne
- Necesită formă specială
- Exemplu: vânzare imobiliare (notar)

### Contracte reale
- Se încheie prin remiterea bunului
- Exemplu: împrumut

## În practică

### De ce scris e mai bun?
- Probă în caz de litigiu
- Claritate obligații
- Evitarea neînțelegerilor
- Profesionalism

### Minim necesar în contract:
1. Identificarea părților
2. Obiectul contractului
3. Prețul/contravaloarea
4. Termenele
5. Semnăturile

## Concluzie

Un contract bine scris previne conflictele. Investește timp în claritate și completitudine.`
          },
          {
            title: 'Clauze esențiale în contractele de afaceri',
            type: 'TEXT',
            duration: 30,
            order: 2,
            content: `# Clauze Esențiale în Contracte

## Clauze obligatorii

### 1. Părțile contractante
\`\`\`
SC EXEMPLU SRL, cu sediul în București, str. Exemplu nr. 1,
înregistrată la Registrul Comerțului sub nr. J40/123/2024,
CUI 12345678, reprezentată de Ion Popescu, Administrator,
denumită în continuare "Prestator"

și

SC CLIENT SRL, cu sediul în Cluj-Napoca, str. Client nr. 2,
înregistrată la Registrul Comerțului sub nr. J12/456/2020,
CUI 87654321, reprezentată de Maria Ionescu, Director,
denumită în continuare "Beneficiar"
\`\`\`

### 2. Obiectul contractului
Descrierea clară a ce se livrează/prestează.

### 3. Prețul și modalitatea de plată
- Sumă (cu sau fără TVA)
- Termen de plată
- Modalitate (transfer, numerar)
- Penalități întârziere

### 4. Termenele
- Data începerii
- Termen de execuție
- Etape intermediare

## Clauze recomandate

### 5. Forța majoră
Situații imprevizibile care scuză neexecutarea.

### 6. Confidențialitate
Obligația de a nu divulga informații.

### 7. Proprietate intelectuală
Cine deține drepturile asupra rezultatelor.

### 8. Răspundere
Limite și excluderi de răspundere.

### 9. Reziliere
Condiții în care se poate înceta contractul.

### 10. Litigii
Cum se rezolvă conflictele:
- Negociere
- Mediere
- Instanța competentă

## Clauze periculoase

### ⚠️ De analizat cu atenție:
- Clauze penale excesive
- Renunțări la drepturi
- Limitări de răspundere în favoarea celeilalte părți
- Drepturi exclusive pe termene lungi
- Clauze de non-concurență

## Sfaturi practice

### Înainte de semnare:
1. Citește tot contractul
2. Clarifică ce nu înțelegi
3. Negociază clauzele problematice
4. Consultă un avocat pentru contracte mari

### La negociere:
- Nu te grăbi
- Cere modificări în scris
- Păstrează variantele intermediare
- Semnează doar varianta finală agreată

## Concluzie

Un contract bine structurat te protejează. Nu semna niciodată ceva ce nu înțelegi complet.`
          }
        ]
      }
    ]
  },

  // Romanian Tax System
  {
    title: 'Sistemul Fiscal Românesc: Ghid pentru Antreprenori',
    slug: 'sistem-fiscal-romanesc-antreprenori',
    description: `Înțelege fiscalitatea românească fără jargon complicat!

Acest curs explică:
• Impozite pe venituri (micro, profit, PFA)
• TVA: când, cât și cum
• Contribuții sociale (CAS, CASS)
• Taxe locale și alte obligații
• Calendar fiscal și termene
• Optimizare fiscală legală

Cu exemple practice și calculatoare.`,
    category: 'ACCOUNTING',
    level: 'BEGINNER',
    duration: 540,
    price: 129,
    isFree: false,
    language: 'ro',
    tags: ['fiscalitate', 'impozite', 'TVA', 'ANAF', 'taxe'],
    modules: [
      {
        title: 'Impozitele în România',
        order: 1,
        duration: 150,
        lessons: [
          {
            title: 'Panorama sistemului fiscal',
            type: 'TEXT',
            duration: 30,
            order: 1,
            content: `# Sistemul Fiscal Românesc - Privire Generală

## Structura sistemului

### Impozite directe:
- Impozit pe profit (16%)
- Impozit pe veniturile microîntreprinderilor (1-3%)
- Impozit pe venit persoane fizice (10%)
- Impozit pe dividende (8%)

### Impozite indirecte:
- TVA (21%/11%/5% din aug 2025)
- Accize
- Taxe vamale

### Contribuții sociale:
- CAS - pensii (25%)
- CASS - sănătate (10%)
- CAM - asigurări muncă (2.25%)

### Taxe locale:
- Impozit clădiri
- Impozit teren
- Impozit auto
- Taxe specifice

## Cine plătește ce?

### SRL/SA:
- Impozit profit sau micro
- TVA (dacă e înregistrat)
- Contribuții pentru angajați
- Taxe locale

### PFA:
- Impozit pe venit (10%)
- CAS (25%)
- CASS (10%)

### Angajați:
- Impozit salariu (10%)
- CAS (25%)
- CASS (10%)
*Reținute de angajator*

## Calendar fiscal cheie

| Termen | Obligație |
|--------|-----------|
| 25 lunar | D300 TVA, D112 contribuții |
| 25 lunar | Plată impozit micro |
| 25 trimestrial | Impozit profit trimestrial |
| 31 martie | Declarație impozit profit anual |
| 25 mai | Declarația unică (PFA) |
| 31 mai | Bilanț contabil |

## Instituții fiscale

### ANAF
- Administrarea impozitelor
- Control fiscal
- Sisteme electronice (SPV, e-Factura)

### Primării
- Taxe locale
- Impozit clădiri și terenuri

### ITM
- Contribuții sociale
- Inspecții muncă

## Concluzie

Sistemul fiscal român poate părea complex, dar se reduce la câteva categorii principale. Înțelegerea bazelor te ajută să planifici corect și să eviți surprizele.`
          }
        ]
      }
    ]
  }
];

export default sprint25AdditionalCourses;
