/**
 * DocumentIulia.ro - Forum Content Seed Data
 * 10+ Categories with threads and posts
 */

export const forumCategories = [
  {
    name: 'Contabilitate și Fiscalitate',
    nameEn: 'Accounting & Tax',
    slug: 'contabilitate-fiscalitate',
    description: 'Discuții despre contabilitate românească, TVA, SAF-T, e-Factura și conformitate ANAF',
    icon: '📊',
    sortOrder: 1
  },
  {
    name: 'HR și Legislația Muncii',
    nameEn: 'HR & Labor Law',
    slug: 'hr-legislatia-muncii',
    description: 'Întrebări și sfaturi despre Codul Muncii, contracte, salarizare, REVISAL',
    icon: '👥',
    sortOrder: 2
  },
  {
    name: 'SSM și Protecția Muncii',
    nameEn: 'Health & Safety',
    slug: 'ssm-protectia-muncii',
    description: 'Sănătate și securitate în muncă, evaluare riscuri, instruiri, accidente',
    icon: '🛡️',
    sortOrder: 3
  },
  {
    name: 'Excel și Automatizare',
    nameEn: 'Excel & Automation',
    slug: 'excel-automatizare',
    description: 'Trucuri Excel, formule, VBA, Power Query și automatizări',
    icon: '📈',
    sortOrder: 4
  },
  {
    name: 'Management și Strategie',
    nameEn: 'Management & Strategy',
    slug: 'management-strategie',
    description: 'Leadership, management de proiecte, planificare strategică',
    icon: '🎯',
    sortOrder: 5
  },
  {
    name: 'Antreprenoriat și Start-up',
    nameEn: 'Entrepreneurship',
    slug: 'antreprenoriat-startup',
    description: 'Sfaturi pentru antreprenori, finanțări, scale-up',
    icon: '🚀',
    sortOrder: 6
  },
  {
    name: 'IT și Digitalizare',
    nameEn: 'IT & Digital',
    slug: 'it-digitalizare',
    description: 'Transformare digitală, software ERP, automatizare procese',
    icon: '💻',
    sortOrder: 7
  },
  {
    name: 'Finanțare și Fonduri',
    nameEn: 'Funding & Grants',
    slug: 'finantare-fonduri',
    description: 'PNRR, fonduri europene, granturi, Start-Up Nation',
    icon: '💰',
    sortOrder: 8
  },
  {
    name: 'Operațiuni și Logistică',
    nameEn: 'Operations & Logistics',
    slug: 'operatiuni-logistica',
    description: 'Supply chain, management stocuri, eficiență operațională',
    icon: '📦',
    sortOrder: 9
  },
  {
    name: 'Comunitate și Off-topic',
    nameEn: 'Community',
    slug: 'comunitate-off-topic',
    description: 'Networking, evenimente, discuții generale',
    icon: '💬',
    sortOrder: 10
  }
];

export const forumThreads = [
  // Contabilitate threads
  {
    categorySlug: 'contabilitate-fiscalitate',
    title: 'TVA 21% și 11% din August 2025 - Ce trebuie să știm?',
    slug: 'tva-21-11-august-2025',
    content: `Bună ziua tuturor,

Cu noile modificări aduse de Legea 141/2025, de la 1 august 2025 vom avea cote de TVA modificate:
- TVA standard: 21% (față de 19%)
- TVA redus: 11% (față de 9%)

Sunt curios ce pași pregătiți pentru tranziție:
1. Actualizarea sistemelor de facturare
2. Comunicarea către clienți
3. Gestionarea contractelor existente cu prețuri fixe

Ce experiențe aveți din tranziții similare anterioare?`,
    authorName: 'AndreiContabil',
    isPinned: true,
    tags: ['TVA', 'Legea 141', 'fiscalitate'],
    posts: [
      {
        content: `Din experiență, cel mai important e să verifici toate sistemele de facturare cu cel puțin 2 săptămâni înainte. La trecerea de la 24% la 19% au fost multe probleme cu software-urile.

Recomand:
- Test complet pe mediu de test
- Backup înainte de actualizare
- Plan B pentru facturare manuală`,
        authorName: 'MariaEconomist'
      },
      {
        content: `Pentru contractele cu preț fix, am pregătit deja acte adiționale. Clauza de modificare TVA era prevăzută în contract, dar vrem să fim transparenți cu clienții.

@AndreiContabil ce software de facturare folosiți?`,
        authorName: 'IonCFO'
      },
      {
        content: `Folosim DocumentIulia și am văzut că au anunțat actualizare automată pentru cote. Sper că va fi smooth!

Un aspect important: facturile emise înainte de 1 august dar livrate după - ce cotă se aplică?`,
        authorName: 'AndreiContabil'
      },
      {
        content: `@AndreiContabil - pentru facturi emise înainte dar cu livrare după, se aplică cota la data faptului generator (livrarea). Deci 21% dacă livrezi în august.

Recomand să verifici Art. 282 Cod Fiscal pentru detalii.`,
        authorName: 'ConsultantFiscal'
      }
    ]
  },
  {
    categorySlug: 'contabilitate-fiscalitate',
    title: 'SAF-T D406 - Erori frecvente și cum le rezolvați',
    slug: 'saft-d406-erori-frecvente',
    content: `Salut comunitate!

De când cu obligativitatea SAF-T lunar, am întâlnit diverse erori la validare. Haideți să facem o listă cu cele mai frecvente și soluțiile lor.

Încep eu:
1. Eroare "CUI invalid" - de multe ori e o problemă de format (lipsește RO sau are spații)
2. Eroare "Balanță dezechilibrată" - verificați rulajele pe luna respectivă
3. Eroare "Curs valutar lipsă" - asigurați-vă că aveți cursul BNR pentru toate datele

Ce alte erori ați întâlnit?`,
    authorName: 'GeorgeController',
    isPinned: false,
    tags: ['SAF-T', 'D406', 'ANAF', 'erori'],
    posts: [
      {
        content: `Adaug la listă:

4. "Document duplicat" - verificați seria și numărul, uneori sunt goluri în numerotare
5. "Tip document nerecunoscut" - maparea codurilor de document la tipurile SAF-T
6. "Perioadă fiscală invalidă" - format YYYY-MM incorect

DUKIntegrator de pe site-ul ANAF e foarte util pentru validare înainte de transmitere.`,
        authorName: 'AlinaFinance'
      },
      {
        content: `Am avut recent o problemă cu partenerii străini - trebuie CIF-ul din țara de origine, nu cel românesc.

Plus, pentru furnizorii fără CUI (persoane fizice din străinătate) se folosește un cod generic.`,
        authorName: 'MihaiImportExport'
      }
    ]
  },
  {
    categorySlug: 'contabilitate-fiscalitate',
    title: 'e-Factura B2B - Pregătire pentru 2026',
    slug: 'efactura-b2b-pregatire-2026',
    content: `De la mijlocul lui 2026, e-Factura devine obligatorie și pentru tranzacțiile B2B (nu doar B2G).

Ce pași faceți pentru pregătire?

Personal, am început să:
1. Testez transmiterea pe SPV
2. Verific că toate datele partenerilor sunt complete
3. Instruiesc echipa pe noul flow

Ce sfaturi aveți pentru cine nu a început încă?`,
    authorName: 'CristinaAccountant',
    isPinned: false,
    tags: ['e-Factura', 'B2B', 'SPV', 'digitalizare'],
    posts: [
      {
        content: `Cel mai important: verificați că aveți adresele complete ale clienților. e-Factura UBL 2.1 cere adresă completă, nu merge doar cu "București".

Am avut multe respingeri din cauza asta la facturile B2G.`,
        authorName: 'IonelDigital'
      },
      {
        content: `Recomand să începeți cu facturile către clienți mari care oricum cer e-Factura. Așa vă obișnuiți cu procesul înainte să devină obligatoriu pentru toți.

Plus, puteți obține feedback și rezolva problemele din timp.`,
        authorName: 'AnaFinanciar'
      }
    ]
  },

  // HR threads
  {
    categorySlug: 'hr-legislatia-muncii',
    title: 'Salariu minim 2025: 3,300 RON - Impact și strategii',
    slug: 'salariu-minim-2025-impact',
    content: `Salariul minim brut a crescut la 3,300 RON de la 1 ianuarie 2025.

Pentru cei cu angajați pe salariu minim:
- Ce strategii folosiți pentru a absorbi creșterea?
- Cum gestionați compresiunea salarială (angajații vechi care ajung aproape de minim)?
- Ați făcut ajustări la grila de salarizare?

Mulțumesc pentru împărtășirea experiențelor!`,
    authorName: 'SimonaHR',
    isPinned: true,
    tags: ['salariu minim', 'HR', '2025'],
    posts: [
      {
        content: `La noi am făcut o revizuire completă a grilei salariale. Principiile:

1. Nimeni să nu fie la minim dacă are vechime peste 1 an
2. Diferență minimă de 200 RON între niveluri
3. Comunicare transparentă cu toată echipa despre criterii

A fost greu, dar echipa a apreciat transparența.`,
        authorName: 'AndreiManager'
      },
      {
        content: `Problema compresiunii salariale e reală. Am avut colegi cu 5 ani experiență aproape de noii angajați.

Soluția noastră: bonus de fidelitate lunar pentru vechime. Nu crește baza (deci nu crește costul la overtime/concedii), dar recunoaște experiența.`,
        authorName: 'LauraPayroll'
      },
      {
        content: `Pentru firmele mici, creșterea de la 3,000 la 3,300 RON (+10%) e semnificativă. Costul total angajator ajunge la ~4,100 RON.

Câteva strategii:
- Revizuire prețuri/tarife
- Eficientizare procese
- Automatizare unde e posibil`,
        authorName: 'MihaiAntreprenor'
      }
    ]
  },
  {
    categorySlug: 'hr-legislatia-muncii',
    title: 'Telemuncă 2025 - Obligații angajator',
    slug: 'telemunca-2025-obligatii',
    content: `Bună ziua,

Suntem în proces de formalizare a politicii de telemuncă. Am câteva întrebări:

1. Este obligatoriu acordul scris pentru telemuncă sau e suficient act adițional?
2. Ce cheltuieli sunteți obligați să acoperiți (internet, echipament)?
3. Cum gestionați SSM pentru angajații în telemuncă?

Mulțumesc!`,
    authorName: 'CristianHRManager',
    isPinned: false,
    tags: ['telemuncă', 'work from home', 'HR'],
    posts: [
      {
        content: `Din punctul meu de vedere:

1. Act adițional la CIM e obligatoriu (Legea 81/2018)
2. Cheltuielile se negociază - noi dăm 200 RON/lună indemnizație
3. SSM - fișă de evaluare a locului de muncă de acasă, completată de angajat

Important: păstrați evidența zilelor de telemuncă vs birou!`,
        authorName: 'AlinaJurist'
      },
      {
        content: `Noi am optat pentru model hibrid: act adițional cu 3 zile telemuncă/săptămână, 2 zile obligatoriu la birou.

Pentru SSM, am trimis un checklist angajaților și am făcut training online despre ergonomia la birou de acasă.`,
        authorName: 'GeorgeIT'
      }
    ]
  },

  // SSM threads
  {
    categorySlug: 'ssm-protectia-muncii',
    title: 'Evaluare riscuri 2025 - Metodologii și exemple',
    slug: 'evaluare-riscuri-2025-metodologii',
    content: `Salutare,

Trebuie să actualizez evaluările de risc pentru toate locurile de muncă.

Ce metodologie folosiți?
- INCDPM?
- Matrice probabilitate-severitate?
- Altă metodologie?

De asemenea, cum gestionați riscurile noi (cybersecurity, telemuncă, burnout)?`,
    authorName: 'BogdanSSM',
    isPinned: false,
    tags: ['evaluare riscuri', 'SSM', 'metodologie'],
    posts: [
      {
        content: `Folosesc metoda INCDPM pentru că e recunoscută de ITM și are ghiduri clare.

Pentru riscuri noi:
- Telemuncă: am adăugat secțiune despre ergonomie și izolare socială
- Cybersecurity: am colaborat cu IT pentru riscuri de phishing/social engineering
- Burnout: chestionar periodic + acces la consiliere`,
        authorName: 'MariaSSM'
      },
      {
        content: `Metodologia e importantă, dar și mai important e să implici lucrătorii în identificare. Ei știu cel mai bine ce riscuri întâlnesc zilnic.

Organizăm sesiuni de "safety walk" lunar cu echipa - identificăm pericole pe teren, nu din birou.`,
        authorName: 'FlorinSafety'
      }
    ]
  },

  // Excel threads
  {
    categorySlug: 'excel-automatizare',
    title: 'XLOOKUP vs VLOOKUP - Când să folosești fiecare?',
    slug: 'xlookup-vs-vlookup-cand',
    content: `Văd că mulți trec la XLOOKUP, dar încă folosesc VLOOKUP în multe situații.

Când preferați XLOOKUP și când rămâneți la VLOOKUP?

Eu folosesc XLOOKUP pentru:
- Căutări la stânga
- Când vreau valoare default pentru negăsit
- Pentru sintaxă mai clară

VLOOKUP pentru:
- Compatibilitate cu Excel mai vechi
- Când lucrez cu alți colegi care nu au 365`,
    authorName: 'ExcelPro',
    isPinned: false,
    tags: ['Excel', 'XLOOKUP', 'VLOOKUP', 'formule'],
    posts: [
      {
        content: `Tot VLOOKUP pentru că:
1. Toată lumea o știe
2. Merge peste tot
3. INDEX-MATCH pentru cazuri complexe

XLOOKUP e nice-to-have, dar nu e must-have.`,
        authorName: 'ContabilVechiGuard'
      },
      {
        content: `Am trecut complet pe XLOOKUP pentru:
- Mai puțin error-prone (nu mai număr coloane)
- Sintaxă mai intuitivă
- Return array pentru multiple coloane

Pentru fișierele pe care le trimit altora, convertesc la VLOOKUP sau INDEX-MATCH.`,
        authorName: 'AnalystPro'
      }
    ]
  },
  {
    categorySlug: 'excel-automatizare',
    title: 'Power Query pentru rapoarte lunare automate',
    slug: 'power-query-rapoarte-lunare',
    content: `Salut!

Am descoperit recent Power Query și vreau să automatizez rapoartele lunare. Acum petrec 2-3 ore/lună cu copy-paste și curățare date.

Ce faceți cu Power Query? Exemple de automatizări?`,
    authorName: 'IoanaBeginner',
    isPinned: false,
    tags: ['Power Query', 'Excel', 'automatizare', 'rapoarte'],
    posts: [
      {
        content: `Power Query m-a salvat ore întregi! Folosesc pentru:

1. Import automat din 5 fișiere Excel separate
2. Curățare date (remove duplicates, trim, proper case)
3. Merge tabele (echivalent VLOOKUP dar pentru mii de rânduri)
4. Append lunar (adaug date noi la istoric)

Sfat: salvează query-urile ca template pentru luna următoare - doar dai Refresh!`,
        authorName: 'DataWizard'
      },
      {
        content: `Cel mai util: conectare la folder întreg.

Am un folder "RapoarteVanzari" unde primesc CSV-uri zilnice. Power Query le combină automat pe toate.

Get Data > From Folder > selectezi folderul > Combine & Transform

Apoi doar Refresh când ai fișiere noi!`,
        authorName: 'AutomationKing'
      }
    ]
  },

  // Management threads
  {
    categorySlug: 'management-strategie',
    title: 'OKRs vs KPIs - Ce funcționează mai bine?',
    slug: 'okrs-vs-kpis-comparatie',
    content: `Suntem o companie de ~50 angajați și evaluăm sistemul de management al performanței.

Unii propun OKRs (Objectives & Key Results), alții preferă KPIs clasici.

Ce experiențe aveți? Ce funcționează în companiile românești de mărime medie?`,
    authorName: 'CEOStartup',
    isPinned: false,
    tags: ['OKRs', 'KPIs', 'management', 'performanță'],
    posts: [
      {
        content: `Am implementat OKRs acum 2 ani. Experiența mea:

Pro:
- Focus pe ce contează
- Aliniere cross-departament
- Transparență

Contra:
- Curba de învățare (6+ luni să meargă bine)
- Necesită coaching constant
- Nu funcționează pentru toate rolurile (ex: suport, contabilitate)

Recomand: OKRs pentru echipe de produs/sales, KPIs pentru operațional.`,
        authorName: 'COOExperimentat'
      },
      {
        content: `La 50 angajați, aș recomanda să începi simplu:
1. 3-5 KPIs pe companie
2. Fiecare departament are 3-5 KPIs
3. Review lunar

OKRs sunt mai complexe și necesită maturitate organizațională. Poți trece la ele mai târziu când KPIs funcționează bine.`,
        authorName: 'ConsultantStrategy'
      }
    ]
  },

  // Antreprenoriat threads
  {
    categorySlug: 'antreprenoriat-startup',
    title: 'Primii 100 de clienți - Cum i-ați obținut?',
    slug: 'primii-100-clienti-cum',
    content: `Tocmai am lansat un SaaS pentru managementul proiectelor, targetat pe agenții de marketing.

Cum ați obținut primii 100 de clienți? Ce a funcționat și ce nu?

Buget de marketing limitat (~500 EUR/lună).`,
    authorName: 'FounderSaaS',
    isPinned: false,
    tags: ['startup', 'clienți', 'growth', 'SaaS'],
    posts: [
      {
        content: `Primii 100 sunt cei mai grei. Ce a funcționat pentru mine:

1. Direct outreach pe LinkedIn (50% din primii clienți)
2. Content marketing - articole pe problemele țintei
3. Webinarii gratuite cu valoare reală
4. Referral de la primii clienți fericiți

CE NU a funcționat: Facebook Ads (prea scump pentru B2B nicșat)`,
        authorName: 'SaaSVeteran'
      },
      {
        content: `Pentru agenții de marketing, recomand:
1. Parteneriate cu freelanceri care lucrează cu agenții
2. Grupuri de Facebook specifice (Marketerii din România, etc.)
3. Review pe platforme (Capterra, G2 - au și versiune gratuită)

Și foarte important: primii clienți să fie extrem de mulțumiți. Word of mouth e king în nișe mici.`,
        authorName: 'GrowthHacker'
      }
    ]
  },

  // Finanțare threads
  {
    categorySlug: 'finantare-fonduri',
    title: 'PNRR pentru IMM-uri - Ghid practic 2025',
    slug: 'pnrr-imm-ghid-2025',
    content: `Vreau să aplic pentru finanțare PNRR dar mă simt pierdut în birocrația documentelor.

Ce sfaturi aveți pentru:
1. Alegerea măsurii potrivite
2. Pregătirea documentației
3. Evitarea capcanelor comune

Avem o firmă de producție cu 30 angajați, 2M EUR cifră de afaceri.`,
    authorName: 'AntreprenorCurios',
    isPinned: true,
    tags: ['PNRR', 'finanțare', 'IMM', 'fonduri europene'],
    posts: [
      {
        content: `Pentru producție, verifică:
- Componenta C3 (economie verde)
- Componenta C9 (sprijin IMM)

Documente esențiale:
1. Plan de afaceri detaliat (e crucial!)
2. Situații financiare pe 3 ani
3. Certificate fiscale impecabile
4. Documente proprietate/spațiu

Capcan principală: subestimarea timpului de pregătire. Începe cu 3+ luni înainte de deadline!`,
        authorName: 'ConsultantFonduri'
      },
      {
        content: `Am obținut PNRR anul trecut. Sfaturi:

1. Angajează consultant experimentat (costă, dar merită)
2. Fii realist cu bugetul - verificările sunt stricte
3. Documentează TOT de la început
4. Pregătește-te pentru raportări lunare post-finanțare

Și cel mai important: nu aplica dacă nu ai cash flow să susții proiectul până vine finanțarea (3-6 luni de la aprobare).`,
        authorName: 'BeneficiarPNRR'
      }
    ]
  },

  // IT threads
  {
    categorySlug: 'it-digitalizare',
    title: 'Ce ERP folosiți în 2025?',
    slug: 'ce-erp-folositi-2025',
    content: `Suntem în căutare de ERP nou (actualul e on-premise și outdated).

Criterii:
- Cloud-based
- Integrare cu ANAF (e-Factura, SAF-T)
- Modul HR inclus
- Buget: 500-1000 EUR/lună

Ce folosiți și ce recomandați?`,
    authorName: 'ITManager',
    isPinned: false,
    tags: ['ERP', 'software', 'digitalizare', 'cloud'],
    posts: [
      {
        content: `Am evaluat mai multe pentru o firmă similară:

1. **Saga (local)**: Bun pentru contabilitate, mai slab pe operațional
2. **SAP Business One**: Complet dar costisitor
3. **Odoo**: Flexibil, open source, dar necesită customizare
4. **KeySoft**: Local, bun raport preț-calitate

Recomand demo-uri cu date reale înainte de decizie!`,
        authorName: 'ERPConsultant'
      },
      {
        content: `Noi am ales Odoo pentru flexibilitate. Integrarea cu ANAF am făcut-o custom (există module).

Pro: poți adăuga module pe măsură ce crești
Contra: learning curve, necesită implementator bun

Budget: ~700 EUR/lună cu hosting și suport.`,
        authorName: 'CTOScale'
      }
    ]
  },

  // Operațiuni threads
  {
    categorySlug: 'operatiuni-logistica',
    title: 'Optimizare stocuri - Metode și instrumente',
    slug: 'optimizare-stocuri-metode',
    content: `Avem probleme cu:
1. Stocuri în exces la unele produse
2. Rupturi de stoc la altele
3. Cash flow blocat în inventar

Ce metode și instrumente folosiți pentru optimizare?`,
    authorName: 'LogisticsManager',
    isPinned: false,
    tags: ['stocuri', 'inventory', 'cash flow', 'supply chain'],
    posts: [
      {
        content: `Metodele clasice funcționează:

1. **ABC Analysis**: Focus pe articolele A (80% din valoare)
2. **EOQ (Economic Order Quantity)**: Calcul lot optim
3. **Safety Stock**: Buffer bazat pe variabilitate cerere

Tool-uri: Excel pentru început, WMS dedicat când crești.

Sfat: măsoară **Inventory Turnover** lunar - țintește 6-12x/an pentru cele mai multe industrii.`,
        authorName: 'SupplyChainPro'
      },
      {
        content: `Am implementat **Demand Forecasting** cu Power BI + Excel și ne-a ajutat enorm.

Pași:
1. Date istorice vânzări pe SKU
2. Identificare sezonalitate
3. Forecast simplu (moving average sau exponential smoothing)
4. Comparație lunară forecast vs actual

Accuracy rate de 80%+ e realizabil!`,
        authorName: 'DataDrivenOps'
      }
    ]
  },

  // Comunitate threads
  {
    categorySlug: 'comunitate-off-topic',
    title: 'Networking events în București 2025',
    slug: 'networking-events-bucuresti-2025',
    content: `Căut evenimente de networking pentru profesioniști în finanțe/contabilitate în București.

Ce evenimente recomandați? (Conferințe, meetups, comunități)`,
    authorName: 'NetworkerActiv',
    isPinned: false,
    tags: ['networking', 'evenimente', 'București', 'comunitate'],
    posts: [
      {
        content: `Recomand:
1. **CECCAR** - conferințe pentru contabili
2. **TechHub Bucharest** - mai tech dar și finance/business
3. **Romanian Business Leaders** - pentru poziții senior
4. **Meetup.com** - caută "Finance Bucharest"

Plus: grupuri LinkedIn locale - mult networking virtual acum.`,
        authorName: 'NetworkingPro'
      },
      {
        content: `Nu subestima grupurile de WhatsApp/Telegram ale absolvenților ASE. Foarte activi pe networking informal.

Și conferința anuală **Romanian Tax & Legal** (organizată de Big4) e bună pentru networking în industrie.`,
        authorName: 'AlumniASE'
      }
    ]
  }
];
