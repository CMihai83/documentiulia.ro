/**
 * DocumentIulia.ro - Courses Seed Data Part 2
 * Finance, HR, HSE, Compliance, Soft Skills Courses
 */

export const financeCourses = [
  {
    title: 'Finanțe pentru Non-Financiari',
    slug: 'finante-pentru-non-financiari',
    description: `Înțelege limbajul finanțelor fără să fii contabil! Acest curs gratuit explică conceptele financiare esențiale pentru manageri, antreprenori și profesioniști din orice domeniu.

Vei învăța să:
• Citești și interpretezi situațiile financiare
• Calculezi și înțelegi indicatorii financiari cheie
• Participi activ la procesul de bugetare
• Iei decizii de business informate financiar

Nu necesită cunoștințe prealabile de contabilitate.`,
    category: 'FINANCE_OPS',
    level: 'BEGINNER',
    duration: 480,
    price: null,
    isFree: true,
    language: 'ro',
    tags: ['finanțe', 'bilanț', 'KPI', 'bugetare', 'management'],
    modules: [
      {
        title: 'Situațiile Financiare Explicate',
        order: 1,
        duration: 120,
        lessons: [
          { title: 'Bilanțul - Ce deține și ce datorează compania', type: 'VIDEO', duration: 30, order: 1, content: 'Active = Pasive + Capitaluri proprii. Active circulante vs imobilizate, datorii pe termen scurt vs lung, capital social și rezerve.' },
          { title: 'Contul de Profit și Pierdere', type: 'VIDEO', duration: 30, order: 2, content: 'Venituri - Cheltuieli = Profit. Marja brută, EBITDA, EBIT, profit net. Venituri din exploatare vs financiare.' },
          { title: 'Cash Flow Statement', type: 'VIDEO', duration: 30, order: 3, content: 'Fluxuri operaționale, de investiții, de finanțare. De ce profit nu înseamnă cash.' },
          { title: 'Exercițiu - Analiza unui set complet', type: 'EXERCISE', duration: 30, order: 4, content: 'Analizează situațiile financiare ale unei companii reale din România.' }
        ]
      },
      {
        title: 'Indicatori Financiari Cheie',
        order: 2,
        duration: 120,
        lessons: [
          { title: 'Indicatori de lichiditate', type: 'VIDEO', duration: 25, order: 1, content: 'Current ratio, Quick ratio, Cash ratio. Ce ne spun despre capacitatea de plată.' },
          { title: 'Indicatori de profitabilitate', type: 'VIDEO', duration: 30, order: 2, content: 'ROE, ROA, ROI, Marja netă, Marja brută. Benchmark-uri pe industrii.' },
          { title: 'Indicatori de solvabilitate', type: 'VIDEO', duration: 25, order: 3, content: 'Debt-to-Equity, Interest Coverage, Leverage. Riscul financiar.' },
          { title: 'Indicatori de eficiență', type: 'VIDEO', duration: 25, order: 4, content: 'Rotația stocurilor, Zile clienți/furnizori, Cash Conversion Cycle.' },
          { title: 'Quiz indicatori', type: 'QUIZ', duration: 15, order: 5, content: '15 întrebări despre calculul și interpretarea indicatorilor.' }
        ]
      },
      {
        title: 'Bugetare și Planificare Financiară',
        order: 3,
        duration: 120,
        lessons: [
          { title: 'Tipuri de bugete în companii', type: 'VIDEO', duration: 25, order: 1, content: 'Buget de venituri, cheltuieli, investiții, cash flow. Buget master.' },
          { title: 'Procesul de bugetare', type: 'VIDEO', duration: 30, order: 2, content: 'Bottom-up vs Top-down, calendar bugetar, revizuiri, forecast.' },
          { title: 'Analiza varianțelor', type: 'VIDEO', duration: 25, order: 3, content: 'Buget vs Actual, varianțe favorabile/nefavorabile, acțiuni corective.' },
          { title: 'Forecasting basics', type: 'VIDEO', duration: 25, order: 4, content: 'Rolling forecast, scenarii, sensitivity analysis.' },
          { title: 'Exercițiu bugetare', type: 'EXERCISE', duration: 15, order: 5, content: 'Creează un buget departamental simplificat.' }
        ]
      },
      {
        title: 'Decizii de Business cu Impact Financiar',
        order: 4,
        duration: 120,
        lessons: [
          { title: 'Break-even Analysis', type: 'VIDEO', duration: 25, order: 1, content: 'Punct de echilibru, costuri fixe vs variabile, margin of safety.' },
          { title: 'Make vs Buy', type: 'VIDEO', duration: 25, order: 2, content: 'Analiză cost-beneficiu pentru externalizare. Total Cost of Ownership.' },
          { title: 'CapEx vs OpEx', type: 'VIDEO', duration: 25, order: 3, content: 'Cheltuieli de capital vs operaționale. Impact pe P&L și bilanț.' },
          { title: 'Evaluarea investițiilor', type: 'VIDEO', duration: 30, order: 4, content: 'Payback period, NPV, IRR - când să investești.' },
          { title: 'Quiz final', type: 'QUIZ', duration: 15, order: 5, content: '20 întrebări din tot cursul.' }
        ]
      }
    ]
  },
  {
    title: 'Contabilitate Românească - RO GAAP Complet',
    slug: 'contabilitate-romaneasca-ro-gaap',
    description: `Curs complet de contabilitate românească bazat pe OMFP 1802/2014! Ideal pentru contabili, economiști și antreprenori care vor să înțeleagă în profunzime regulile contabile din România.

Vei învăța să:
• Aplici corect standardele RO GAAP
• Înregistrezi operațiuni contabile complexe
• Calculezi și declari TVA (21%/11%/5%)
• Generezi rapoarte pentru ANAF (SAF-T D406, e-Factura)
• Pregătești situații financiare anuale

Include exemple practice și monografii contabile.`,
    category: 'FINANCE_OPS',
    level: 'INTERMEDIATE',
    duration: 960,
    price: 199,
    isFree: false,
    language: 'ro',
    tags: ['contabilitate', 'OMFP', 'TVA', 'SAF-T', 'ANAF'],
    modules: [
      {
        title: 'Cadrul Legal și Principii Contabile',
        order: 1,
        duration: 150,
        lessons: [
          { title: 'Legea contabilității 82/1991', type: 'VIDEO', duration: 30, order: 1, content: 'Obligații de organizare, documente justificative, registre obligatorii, răspunderi.' },
          { title: 'OMFP 1802/2014 - Reglementări contabile', type: 'VIDEO', duration: 40, order: 2, content: 'Structura, criterii de mărime, entități de interes public, microentități.' },
          { title: 'Principii contabile fundamentale', type: 'VIDEO', duration: 35, order: 3, content: 'Continuitatea activității, permanența metodelor, prudența, independența exercițiilor, evaluare la cost, necompensare.' },
          { title: 'Politici contabile și estimări', type: 'VIDEO', duration: 25, order: 4, content: 'Alegerea politicilor, schimbări, corectarea erorilor, note explicative.' },
          { title: 'Quiz cadru legal', type: 'QUIZ', duration: 20, order: 5, content: '20 întrebări despre legislația contabilă.' }
        ]
      },
      {
        title: 'Planul de Conturi Românesc',
        order: 2,
        duration: 180,
        lessons: [
          { title: 'Structura planului de conturi', type: 'VIDEO', duration: 30, order: 1, content: 'Clase 1-9, conturi sintetice și analitice, funcțiunea conturilor.' },
          { title: 'Clasa 1 - Capitaluri', type: 'VIDEO', duration: 25, order: 2, content: 'Capital social, rezerve, rezultat reportat, provizioane, împrumuturi.' },
          { title: 'Clasa 2 - Imobilizări', type: 'VIDEO', duration: 30, order: 3, content: 'Imobilizări necorporale, corporale, financiare. Amortizare și depreciere.' },
          { title: 'Clasa 3 - Stocuri', type: 'VIDEO', duration: 25, order: 4, content: 'Materii prime, materiale, producție, mărfuri. Metode de evaluare (FIFO, CMP).' },
          { title: 'Clasa 4 - Terți', type: 'VIDEO', duration: 30, order: 5, content: 'Furnizori, clienți, personal, buget, debitori/creditori diverși.' },
          { title: 'Clasa 5 - Trezorerie', type: 'VIDEO', duration: 20, order: 6, content: 'Casa, bănci, viramente, acreditive, avansuri de trezorerie.' },
          { title: 'Clase 6-7 - Cheltuieli și Venituri', type: 'VIDEO', duration: 20, order: 7, content: 'Structura cheltuielilor și veniturilor, deductibilitate fiscală.' }
        ]
      },
      {
        title: 'TVA în România',
        order: 3,
        duration: 180,
        lessons: [
          { title: 'Mecanismul TVA și Legea 141/2025', type: 'VIDEO', duration: 35, order: 1, content: 'Ce este TVA, cote (21% standard, 11% reducere, 5% special), baza de impozitare, faptul generator.' },
          { title: 'TVA colectat și TVA deductibil', type: 'VIDEO', duration: 30, order: 2, content: 'Înregistrări contabile, jurnale vânzări/cumpărări, TVA de plată/recuperat.' },
          { title: 'Operațiuni scutite și exceptate', type: 'VIDEO', duration: 25, order: 3, content: 'Scutiri cu/fără drept de deducere, operațiuni neimpozabile.' },
          { title: 'TVA în tranzacții intracomunitare', type: 'VIDEO', duration: 30, order: 4, content: 'Achiziții și livrări intracomunitare, taxare inversă, declarații VIES.' },
          { title: 'Prorata TVA', type: 'VIDEO', duration: 25, order: 5, content: 'Când se aplică, calcul, ajustări, regularizări.' },
          { title: 'Declarația 300 și D394', type: 'VIDEO', duration: 20, order: 6, content: 'Completare, termene, corecții, penalități.' },
          { title: 'Exercițiu TVA complet', type: 'EXERCISE', duration: 15, order: 7, content: 'Calculează și declară TVA pentru o lună de operațiuni.' }
        ]
      },
      {
        title: 'Raportare ANAF - SAF-T și e-Factura',
        order: 4,
        duration: 150,
        lessons: [
          { title: 'SAF-T D406 - Cerințe și structură', type: 'VIDEO', duration: 35, order: 1, content: 'Ordin 1783/2021, deadline-uri lunare, structura XML, entități obligate.' },
          { title: 'Generarea fișierului SAF-T', type: 'VIDEO', duration: 30, order: 2, content: 'Mapare date contabile, DUKIntegrator pentru validare, erori comune.' },
          { title: 'e-Factura și SPV', type: 'VIDEO', duration: 30, order: 3, content: 'UBL 2.1 format, transmitere prin SPV, validare, semnătură electronică.' },
          { title: 'e-Transport și alte declarații', type: 'VIDEO', duration: 25, order: 4, content: 'Declarații transport, RO e-TVA, monitorizare completă ANAF.' },
          { title: 'Audit trail și conformitate', type: 'VIDEO', duration: 20, order: 5, content: 'Arhivare electronică, inspecții fiscale, pregătire documente.' },
          { title: 'Exercițiu SAF-T', type: 'EXERCISE', duration: 10, order: 6, content: 'Generează și validează un fișier SAF-T de test.' }
        ]
      },
      {
        title: 'Situații Financiare Anuale',
        order: 5,
        duration: 120,
        lessons: [
          { title: 'Componente și termene', type: 'VIDEO', duration: 25, order: 1, content: 'Bilanț, cont P&L, note explicative. Termene de depunere, sancțiuni.' },
          { title: 'Închiderea exercițiului', type: 'VIDEO', duration: 30, order: 2, content: 'Inventar, regularizări, provizioane, constituire rezerve, repartizare profit.' },
          { title: 'Întocmirea notelor explicative', type: 'VIDEO', duration: 30, order: 3, content: 'Politici contabile, detalierea posturilor, angajamente, evenimente ulterioare.' },
          { title: 'Raportul administratorilor', type: 'VIDEO', duration: 20, order: 4, content: 'Conținut minim, analiza activității, perspective, declarație conducere.' },
          { title: 'Exercițiu final', type: 'EXERCISE', duration: 15, order: 5, content: 'Întocmește un set simplificat de situații financiare.' }
        ]
      }
    ]
  },
  {
    title: 'Budgeting & Financial Forecasting Masterclass',
    slug: 'budgeting-forecasting-masterclass',
    description: `Devino expert în planificare financiară! Acest curs avansat te învață tehnicile moderne de bugetare și forecasting folosite de CFO-i și controlleri în companii de top.

Vei învăța să:
• Implementezi Zero-Based și Driver-Based Budgeting
• Construiești modele financiare robuste în Excel
• Faci rolling forecasts și analiză de scenarii
• Gestionezi eficient cash flow-ul
• Prezinți rezultatele financiare board-ului

Include studii de caz din companii românești și multinaționale.`,
    category: 'FINANCE_OPS',
    level: 'ADVANCED',
    duration: 720,
    price: 149,
    isFree: false,
    language: 'ro',
    tags: ['bugetare', 'forecast', 'FP&A', 'controller', 'CFO'],
    modules: [
      {
        title: 'Metodologii Moderne de Bugetare',
        order: 1,
        duration: 180,
        lessons: [
          { title: 'De la Traditional la Modern Budgeting', type: 'VIDEO', duration: 30, order: 1, content: 'Limitările bugetării tradiționale, Beyond Budgeting movement, best practices actuale.' },
          { title: 'Zero-Based Budgeting (ZBB)', type: 'VIDEO', duration: 40, order: 2, content: 'Principii ZBB, decision packages, prioritizare, implementare graduală, cazuri de succes.' },
          { title: 'Driver-Based Planning', type: 'VIDEO', duration: 35, order: 3, content: 'Identificarea driverilor de business, modelare, actualizare rapidă, scenario planning.' },
          { title: 'Activity-Based Budgeting', type: 'VIDEO', duration: 30, order: 4, content: 'Legătura cu ABC costing, alocare pe activități, overhead transparent.' },
          { title: 'Rolling Forecasts', type: 'VIDEO', duration: 25, order: 5, content: 'De ce rolling vs static, frecvența, nivelul de detaliu, integrare cu bugetul.' },
          { title: 'Exercițiu comparativ', type: 'EXERCISE', duration: 20, order: 6, content: 'Compară rezultatele tradițional vs ZBB pentru același departament.' }
        ]
      },
      {
        title: 'Modelare Financiară în Excel',
        order: 2,
        duration: 180,
        lessons: [
          { title: 'Arhitectura unui model financiar', type: 'VIDEO', duration: 35, order: 1, content: 'Separare Inputs-Calculations-Outputs, naming conventions, documentare, audit trail.' },
          { title: 'Best practices în modelare', type: 'VIDEO', duration: 30, order: 2, content: 'Consistență formule, error checking, flexibilitate, scalabilitate, version control.' },
          { title: 'Model integrat: P&L, Bilanț, Cash Flow', type: 'VIDEO', duration: 45, order: 3, content: 'Legarea celor trei statements, check-uri de bilanț, circularități.' },
          { title: 'Sensitivity și Scenario Analysis', type: 'VIDEO', duration: 35, order: 4, content: 'Data tables, scenario manager, tornado charts, Monte Carlo în Excel.' },
          { title: 'Dashboard financiar', type: 'VIDEO', duration: 20, order: 5, content: 'KPIs vizuali, sparklines, conditional formatting, executive summary.' },
          { title: 'Proiect - Model complet', type: 'EXERCISE', duration: 15, order: 6, content: 'Construiește un model financiar pe 3 ani pentru un start-up.' }
        ]
      },
      {
        title: 'Cash Flow Management',
        order: 3,
        duration: 150,
        lessons: [
          { title: 'Cash Flow Forecasting Methods', type: 'VIDEO', duration: 30, order: 1, content: 'Direct vs indirect method, short-term (13-week), long-term, accuracy improvement.' },
          { title: 'Working Capital Optimization', type: 'VIDEO', duration: 35, order: 2, content: 'DSO, DPO, DIO, Cash Conversion Cycle, strategii de reducere.' },
          { title: '13-Week Cash Flow Model', type: 'VIDEO', duration: 35, order: 3, content: 'Construcție pas cu pas, încasări, plăți, scenarii, cash cushion.' },
          { title: 'Treasury și Liquidity Management', type: 'VIDEO', duration: 25, order: 4, content: 'Cash pooling, linii de credit, investiții pe termen scurt, FX hedging basics.' },
          { title: 'Exercițiu cash forecast', type: 'EXERCISE', duration: 25, order: 5, content: 'Creează și actualizează un 13-week cash flow.' }
        ]
      },
      {
        title: 'Performance Management și Raportare',
        order: 4,
        duration: 120,
        lessons: [
          { title: 'KPIs și Balanced Scorecard', type: 'VIDEO', duration: 30, order: 1, content: 'Selectarea KPI-ilor, perspective BSC, Strategy Maps, cascading.' },
          { title: 'Variance Analysis în profunzime', type: 'VIDEO', duration: 25, order: 2, content: 'Price vs volume variance, mix variance, rate variance, bridge charts.' },
          { title: 'Management Reporting', type: 'VIDEO', duration: 25, order: 3, content: 'Flash reports, monthly packs, comentarii relevante, storytelling cu date.' },
          { title: 'Board Presentations', type: 'VIDEO', duration: 25, order: 4, content: 'Ce vrea să vadă board-ul, structură prezentare, grafice eficiente, Q&A prep.' },
          { title: 'Quiz performance mgmt', type: 'QUIZ', duration: 15, order: 5, content: '15 întrebări despre KPIs și raportare.' }
        ]
      }
    ]
  }
];

export const hrCourses = [
  {
    title: 'HR Fundamentals - Managementul Resurselor Umane',
    slug: 'hr-fundamentals',
    description: `Fundația completă pentru o carieră în HR! Acest curs gratuit acoperă toate aspectele esențiale ale managementului resurselor umane, de la recrutare până la exit.

Vei învăța să:
• Conduci procese de recrutare și selecție eficiente
• Implementezi programe de onboarding
• Gestionezi relațiile de muncă și contractele
• Aplici legislația muncii din România (Codul Muncii)
• Evaluezi performanța și dezvolți angajații

Include template-uri și checklist-uri practice.`,
    category: 'HR_COMPLIANCE',
    level: 'BEGINNER',
    duration: 600,
    price: null,
    isFree: true,
    language: 'ro',
    tags: ['HR', 'recrutare', 'onboarding', 'Codul Muncii', 'performanță'],
    modules: [
      {
        title: 'Introducere în HR',
        order: 1,
        duration: 90,
        lessons: [
          { title: 'Rolul HR în organizație', type: 'VIDEO', duration: 25, order: 1, content: 'HR strategic vs administrativ, funcțiile HR, parteneriat cu business-ul.' },
          { title: 'Ciclul de viață al angajatului', type: 'VIDEO', duration: 30, order: 2, content: 'Attract, Recruit, Onboard, Develop, Retain, Exit - touchpoints HR.' },
          { title: 'HR Technology și HRIS', type: 'VIDEO', duration: 20, order: 3, content: 'Sisteme HR moderne, automatizare, self-service, analytics.' },
          { title: 'HR Metrics esențiale', type: 'VIDEO', duration: 15, order: 4, content: 'Time to hire, cost per hire, turnover, engagement score, training hours.' }
        ]
      },
      {
        title: 'Recrutare și Selecție',
        order: 2,
        duration: 150,
        lessons: [
          { title: 'Job Analysis și Description', type: 'VIDEO', duration: 25, order: 1, content: 'Analiza postului, competențe, responsabilități, calificări, job description template.' },
          { title: 'Sourcing Candidates', type: 'VIDEO', duration: 30, order: 2, content: 'Canale de recrutare, employer branding, rețele sociale, referral programs.' },
          { title: 'Screening și Interviuri', type: 'VIDEO', duration: 35, order: 3, content: 'CV screening, phone screening, interview types (behavioral, situational), STAR method.' },
          { title: 'Assessment și Selecție', type: 'VIDEO', duration: 30, order: 4, content: 'Teste de competențe, assessment centers, reference checks, decision matrix.' },
          { title: 'Ofertă și Negociere', type: 'VIDEO', duration: 20, order: 5, content: 'Structura ofertei, salariu și beneficii, negociere, closing the deal.' },
          { title: 'Template Job Description', type: 'DOWNLOAD', duration: 10, order: 6, content: 'Template editabil pentru job description.' }
        ]
      },
      {
        title: 'Onboarding și Integrare',
        order: 3,
        duration: 90,
        lessons: [
          { title: 'Pre-boarding', type: 'VIDEO', duration: 20, order: 1, content: 'Ce se întâmplă între accept și prima zi: documente, echipament, comunicare.' },
          { title: 'Prima zi și săptămână', type: 'VIDEO', duration: 25, order: 2, content: 'Welcome kit, tour, introduceri, training inițial, buddy system.' },
          { title: 'Planul de integrare 30-60-90', type: 'VIDEO', duration: 25, order: 3, content: 'Obiective pe perioade, milestones, feedback sessions, evaluare probă.' },
          { title: 'Checklist Onboarding', type: 'DOWNLOAD', duration: 10, order: 4, content: 'Checklist complet pentru proces de onboarding.' },
          { title: 'Quiz onboarding', type: 'QUIZ', duration: 10, order: 5, content: '10 întrebări despre best practices în onboarding.' }
        ]
      },
      {
        title: 'Legislația Muncii în România',
        order: 4,
        duration: 150,
        lessons: [
          { title: 'Codul Muncii - Overview', type: 'VIDEO', duration: 30, order: 1, content: 'Legea 53/2003, principii fundamentale, drepturi și obligații angajat/angajator.' },
          { title: 'Contractul individual de muncă', type: 'VIDEO', duration: 35, order: 2, content: 'Tipuri de contract, elemente obligatorii, modificare, suspendare, încetare.' },
          { title: 'Timpul de muncă și concedii', type: 'VIDEO', duration: 30, order: 3, content: 'Normă de lucru, ore suplimentare, concediu de odihnă (min 20 zile), medical, maternitate.' },
          { title: 'Salarizare și beneficii', type: 'VIDEO', duration: 30, order: 4, content: 'Salariu minim (3,300 RON 2025), sporuri, tichete de masă, alte beneficii.' },
          { title: 'REVISAL și obligații declarative', type: 'VIDEO', duration: 15, order: 5, content: 'Registrul electronic, termene, modificări, inspecția muncii.' },
          { title: 'Quiz legislație', type: 'QUIZ', duration: 10, order: 6, content: '15 întrebări despre Codul Muncii.' }
        ]
      },
      {
        title: 'Managementul Performanței',
        order: 5,
        duration: 120,
        lessons: [
          { title: 'Sisteme de performance management', type: 'VIDEO', duration: 25, order: 1, content: 'MBO, OKRs, competency-based, continuous feedback. Avantaje și dezavantaje.' },
          { title: 'Goal setting și KPIs', type: 'VIDEO', duration: 25, order: 2, content: 'SMART goals, cascading objectives, individual vs team goals.' },
          { title: 'Evaluarea performanței', type: 'VIDEO', duration: 30, order: 3, content: 'Calibration sessions, rating scales, forced distribution, recency bias.' },
          { title: 'Feedback și Development', type: 'VIDEO', duration: 25, order: 4, content: 'Feedback constructiv, development plans, coaching, mentoring.' },
          { title: 'Template evaluare performanță', type: 'DOWNLOAD', duration: 15, order: 5, content: 'Formular de evaluare a performanței cu exemple.' }
        ]
      }
    ]
  },
  {
    title: 'Administrare Personal și Payroll România',
    slug: 'administrare-personal-payroll',
    description: `Curs complet de administrare personal pentru România! Învață să gestionezi întregul ciclu administrativ HR, de la angajare la calculul salariilor și raportări ANAF/ITM.

Vei învăța să:
• Întocmești corect contractele de muncă
• Calculezi salariile și contribuțiile sociale
• Gestionezi concediile și absențele
• Completezi și transmiți REVISAL
• Pregătești documente pentru controale ITM

Actualizat cu salariul minim 2025 (3,300 RON) și toate modificările legislative.`,
    category: 'HR_COMPLIANCE',
    level: 'INTERMEDIATE',
    duration: 720,
    price: 149,
    isFree: false,
    language: 'ro',
    tags: ['payroll', 'REVISAL', 'salariu', 'contribuții', 'administrare personal'],
    modules: [
      {
        title: 'Dosarul de Personal',
        order: 1,
        duration: 120,
        lessons: [
          { title: 'Documente la angajare', type: 'VIDEO', duration: 30, order: 1, content: 'CI, cazier (dacă e cazul), diplome, certificate medicale, acte stare civilă.' },
          { title: 'Contractul individual de muncă detaliat', type: 'VIDEO', duration: 35, order: 2, content: 'Clauze obligatorii, clauze opționale (mobilitate, confidențialitate, neconcurență).' },
          { title: 'Fișa postului', type: 'VIDEO', duration: 25, order: 3, content: 'Conținut, actualizare, legătura cu contractul, evaluarea competențelor.' },
          { title: 'Acte adiționale și modificări', type: 'VIDEO', duration: 20, order: 4, content: 'Când e nevoie de act adițional, procedură, notificare angajat.' },
          { title: 'Template-uri documente', type: 'DOWNLOAD', duration: 10, order: 5, content: 'Pack complet: CIM, act adițional, fișă post.' }
        ]
      },
      {
        title: 'REVISAL și Raportări ITM',
        order: 2,
        duration: 120,
        lessons: [
          { title: 'Ce este REVISAL', type: 'VIDEO', duration: 25, order: 1, content: 'Registrul general de evidență al salariaților, obligații, acces, responsabilități.' },
          { title: 'Înregistrări obligatorii', type: 'VIDEO', duration: 30, order: 2, content: 'Angajare (cel târziu cu o zi înainte), modificări, suspendări, încetări. Termene!' },
          { title: 'Coduri COR și utilizare', type: 'VIDEO', duration: 20, order: 3, content: 'Clasificarea Ocupațiilor din România, alegerea codului corect, modificări.' },
          { title: 'Transmitere și corecții', type: 'VIDEO', duration: 25, order: 4, content: 'Modalități de transmitere, erori frecvente, rectificări, amenzi.' },
          { title: 'Exercițiu REVISAL', type: 'EXERCISE', duration: 20, order: 5, content: 'Simulare înregistrare angajat nou și modificare salariu.' }
        ]
      },
      {
        title: 'Calculul Salariilor',
        order: 3,
        duration: 180,
        lessons: [
          { title: 'Structura salariului în România', type: 'VIDEO', duration: 30, order: 1, content: 'Salariu de bază, sporuri, bonusuri, indemnizații. Brut vs Net.' },
          { title: 'Contribuții sociale 2025', type: 'VIDEO', duration: 35, order: 2, content: 'CAS 25%, CASS 10%, impozit 10%. Calcul complet angajat și angajator.' },
          { title: 'Deduceri personale', type: 'VIDEO', duration: 25, order: 3, content: 'Deducere personală de bază, persoane în întreținere, calcul gradual.' },
          { title: 'Beneficii și impozitare', type: 'VIDEO', duration: 30, order: 4, content: 'Tichete de masă, pensie privată, abonamente sport - tratament fiscal.' },
          { title: 'Ore suplimentare și sporuri', type: 'VIDEO', duration: 25, order: 5, content: 'Compensare (timp liber sau plată), spor noapte, weekend, condiții speciale.' },
          { title: 'Exercițiu calcul salariu', type: 'EXERCISE', duration: 20, order: 6, content: 'Calculează salariul net pentru 3 scenarii diferite.' },
          { title: 'Quiz salarizare', type: 'QUIZ', duration: 15, order: 7, content: '20 întrebări despre calculul salariilor.' }
        ]
      },
      {
        title: 'Concedii și Absențe',
        order: 4,
        duration: 120,
        lessons: [
          { title: 'Concediul de odihnă', type: 'VIDEO', duration: 25, order: 1, content: 'Minim 20 zile lucrătoare, zile suplimentare, programare, report, compensare.' },
          { title: 'Concedii medicale', type: 'VIDEO', duration: 30, order: 2, content: 'Certificat medical, indemnizație (primele 5 zile angajator), recuperare CASS.' },
          { title: 'Concedii speciale', type: 'VIDEO', duration: 25, order: 3, content: 'Maternitate, paternitate, creștere copil, căsătorie, deces, studii.' },
          { title: 'Alte absențe', type: 'VIDEO', duration: 20, order: 4, content: 'Învoire, recuperare, absențe nemotivate, consecințe.' },
          { title: 'Gestionarea în software HR', type: 'VIDEO', duration: 20, order: 5, content: 'Tracking absențe, aprobare workflow, rapoarte, acuratețe pontaj.' }
        ]
      },
      {
        title: 'Declarații Fiscale HR',
        order: 5,
        duration: 90,
        lessons: [
          { title: 'Declarația 112', type: 'VIDEO', duration: 30, order: 1, content: 'Conținut, termen (25 ale lunii), completare, rectificative.' },
          { title: 'Declarația D100', type: 'VIDEO', duration: 20, order: 2, content: 'Impozit pe venit reținut la sursă, alte obligații.' },
          { title: 'Raportări anuale', type: 'VIDEO', duration: 25, order: 3, content: 'Declarații anuale angajați, adeverințe, certificate fiscale.' },
          { title: 'Quiz declarații', type: 'QUIZ', duration: 15, order: 4, content: '15 întrebări despre obligațiile declarative.' }
        ]
      }
    ]
  }
];

export const hseCourses = [
  {
    title: 'SSM Complet - Securitate și Sănătate în Muncă',
    slug: 'ssm-complet',
    description: `Curs complet de Securitate și Sănătate în Muncă conform legislației românești! Esențial pentru responsabili SSM, manageri și angajatori care vor să asigure conformitatea și siguranța la locul de muncă.

Vei învăța să:
• Aplici Legea 319/2006 și HG 1425/2006
• Evaluezi riscurile profesionale
• Întocmești documentația SSM obligatorie
• Conduci instructaje și training-uri
• Gestionezi incidentele și accidentele de muncă

Include toate formularele și template-urile necesare.`,
    category: 'HSE_SAFETY',
    level: 'INTERMEDIATE',
    duration: 900,
    price: 199,
    isFree: false,
    language: 'ro',
    tags: ['SSM', 'securitatea muncii', 'evaluare riscuri', 'instructaj', 'accidente'],
    modules: [
      {
        title: 'Cadrul Legal SSM',
        order: 1,
        duration: 150,
        lessons: [
          { title: 'Legea 319/2006 - Principii', type: 'VIDEO', duration: 30, order: 1, content: 'Obligațiile angajatorului, drepturile și obligațiile lucrătorilor, organizarea SSM.' },
          { title: 'HG 1425/2006 - Norme metodologice', type: 'VIDEO', duration: 35, order: 2, content: 'Detalierea cerințelor, documente obligatorii, controale ITM.' },
          { title: 'Organizarea activității SSM', type: 'VIDEO', duration: 30, order: 3, content: 'Lucrător desemnat vs serviciu extern, comitetul SSM, reprezentanți lucrători.' },
          { title: 'Legislație specifică pe domenii', type: 'VIDEO', duration: 25, order: 4, content: 'Construcții, chimice, electrice, lucru la înălțime - reglementări sectoriale.' },
          { title: 'Sancțiuni și răspunderi', type: 'VIDEO', duration: 20, order: 5, content: 'Amenzi, răspundere penală, cazuri jurisprudență.' },
          { title: 'Quiz legislație SSM', type: 'QUIZ', duration: 10, order: 6, content: '15 întrebări despre cadrul legal.' }
        ]
      },
      {
        title: 'Evaluarea Riscurilor',
        order: 2,
        duration: 180,
        lessons: [
          { title: 'Ce este evaluarea riscurilor', type: 'VIDEO', duration: 25, order: 1, content: 'Definiții (pericol, risc, măsuri), metodologii (5 pași), obligativitate.' },
          { title: 'Identificarea pericolelor', type: 'VIDEO', duration: 35, order: 2, content: 'Categorii de pericole: fizice, chimice, biologice, ergonomice, psihosociale.' },
          { title: 'Metode de evaluare', type: 'VIDEO', duration: 35, order: 3, content: 'Metoda INCDPM, matrice probabilitate-gravitate, evaluare cantitativă.' },
          { title: 'Ierarhia măsurilor de prevenire', type: 'VIDEO', duration: 30, order: 4, content: 'Eliminare > Substituție > Control ingineresc > Administrativ > EIP.' },
          { title: 'Documentarea evaluării', type: 'VIDEO', duration: 25, order: 5, content: 'Fișe de evaluare pe post, plan de prevenire, revizie periodică.' },
          { title: 'Exercițiu evaluare risc', type: 'EXERCISE', duration: 20, order: 6, content: 'Evaluează riscurile pentru un post de muncă din birouri.' },
          { title: 'Template evaluare riscuri', type: 'DOWNLOAD', duration: 10, order: 7, content: 'Fișă de evaluare completă cu exemple.' }
        ]
      },
      {
        title: 'Documentația SSM',
        order: 3,
        duration: 150,
        lessons: [
          { title: 'Instrucțiuni proprii SSM', type: 'VIDEO', duration: 30, order: 1, content: 'Conținut minim, specific pe activitate, aprobare, distribuire.' },
          { title: 'Fișele de instruire', type: 'VIDEO', duration: 25, order: 2, content: 'Model de fișă, completare, semnături, păstrare.' },
          { title: 'Evidențe obligatorii', type: 'VIDEO', duration: 25, order: 3, content: 'Registrul de accidente, evidența echipamentelor, medicine muncii.' },
          { title: 'Planuri de urgență și evacuare', type: 'VIDEO', duration: 30, order: 4, content: 'Plan de evacuare, exerciții, echipe intervenție, prim ajutor.' },
          { title: 'Semnalizarea de securitate', type: 'VIDEO', duration: 20, order: 5, content: 'Tipuri de panouri, culori, dimensiuni, amplasare.' },
          { title: 'Pack documente SSM', type: 'DOWNLOAD', duration: 20, order: 6, content: 'Set complet de documente și formulare SSM.' }
        ]
      },
      {
        title: 'Instruirea Lucrătorilor',
        order: 4,
        duration: 120,
        lessons: [
          { title: 'Tipuri de instruire', type: 'VIDEO', duration: 25, order: 1, content: 'Introductiv-generală, la locul de muncă, periodică, specială.' },
          { title: 'Planificarea instruirilor', type: 'VIDEO', duration: 25, order: 2, content: 'Calendar, durate minime, tematici, frecvență periodică.' },
          { title: 'Tehnici de training SSM', type: 'VIDEO', duration: 30, order: 3, content: 'Prezentări eficiente, demonstrații practice, studii de caz, testare.' },
          { title: 'Verificarea cunoștințelor', type: 'VIDEO', duration: 20, order: 4, content: 'Teste scrise, demonstrații practice, documentarea verificării.' },
          { title: 'Exercițiu instruire', type: 'EXERCISE', duration: 20, order: 5, content: 'Pregătește o sesiune de instruire periodică.' }
        ]
      },
      {
        title: 'Accidente de Muncă și Incidente',
        order: 5,
        duration: 150,
        lessons: [
          { title: 'Definiții și clasificare', type: 'VIDEO', duration: 25, order: 1, content: 'Accident de muncă vs incident, accident de traseu, boală profesională.' },
          { title: 'Cercetarea accidentelor', type: 'VIDEO', duration: 35, order: 2, content: 'Comisie de cercetare, metodologii (arbore cauze, 5 Why), dosar cercetare.' },
          { title: 'Raportarea și comunicarea', type: 'VIDEO', duration: 30, order: 3, content: 'Obligații de raportare ITM, ANSSM, termene, formulare FIAM.' },
          { title: 'Măsuri post-accident', type: 'VIDEO', duration: 25, order: 4, content: 'Acțiuni corective, prevenire recurență, modificare evaluare riscuri.' },
          { title: 'Near-miss reporting', type: 'VIDEO', duration: 20, order: 5, content: 'Importanța raportării near-miss, cultură de siguranță, lessons learned.' },
          { title: 'Quiz accidente', type: 'QUIZ', duration: 15, order: 6, content: '15 întrebări despre gestionarea accidentelor.' }
        ]
      }
    ]
  },
  {
    title: 'ISO 45001 - Sistem de Management SSM',
    slug: 'iso-45001-management-ssm',
    description: `Implementează și menține un sistem de management SSM conform ISO 45001:2018! Acest curs te pregătește pentru certificare și îți oferă instrumentele practice pentru un sistem eficient.

Vei învăța să:
• Înțelegi cerințele standardului ISO 45001
• Implementezi sistemul de management pas cu pas
• Documentezi procesele și procedurile
• Conduci audituri interne
• Pregătești organizația pentru certificare

Include checklist-uri de audit și template-uri documentație.`,
    category: 'HSE_SAFETY',
    level: 'ADVANCED',
    duration: 720,
    price: 249,
    isFree: false,
    language: 'ro',
    tags: ['ISO 45001', 'sistem management', 'certificare', 'audit', 'SSM'],
    modules: [
      {
        title: 'Introducere ISO 45001',
        order: 1,
        duration: 90,
        lessons: [
          { title: 'Evoluția standardelor SSM', type: 'VIDEO', duration: 25, order: 1, content: 'De la OHSAS 18001 la ISO 45001, Annex SL, integrare cu ISO 9001/14001.' },
          { title: 'Structura standardului', type: 'VIDEO', duration: 30, order: 2, content: 'Cele 10 clauze, PDCA, High Level Structure, termeni și definiții.' },
          { title: 'Beneficiile implementării', type: 'VIDEO', duration: 20, order: 3, content: 'Reducere accidente, conformitate, imagine, competitivitate, cultură.' },
          { title: 'Quiz introducere', type: 'QUIZ', duration: 15, order: 4, content: '10 întrebări despre structura ISO 45001.' }
        ]
      },
      {
        title: 'Contextul și Leadership (Cl. 4-5)',
        order: 2,
        duration: 120,
        lessons: [
          { title: 'Contextul organizației', type: 'VIDEO', duration: 30, order: 1, content: 'Părți interesate, cerințe aplicabile, domeniul SMSSO, procese.' },
          { title: 'Leadership și angajament', type: 'VIDEO', duration: 25, order: 2, content: 'Rolul managementului de top, politica SSM, responsabilități.' },
          { title: 'Consultare și participare', type: 'VIDEO', duration: 25, order: 3, content: 'Mecanisme de consultare, participarea lucrătorilor, comitet SSM.' },
          { title: 'Documentare context', type: 'EXERCISE', duration: 25, order: 4, content: 'Completează analiza contextului pentru propria organizație.' },
          { title: 'Template politică SSM', type: 'DOWNLOAD', duration: 15, order: 5, content: 'Model de politică SSM conformă ISO 45001.' }
        ]
      },
      {
        title: 'Planificare (Cl. 6)',
        order: 3,
        duration: 150,
        lessons: [
          { title: 'Riscuri și oportunități', type: 'VIDEO', duration: 30, order: 1, content: 'Identificare, evaluare, prioritizare, planificare acțiuni.' },
          { title: 'Identificarea pericolelor', type: 'VIDEO', duration: 35, order: 2, content: 'Metodologii sistematice, ierarhia controalelor, actualizare.' },
          { title: 'Cerințe legale și alte cerințe', type: 'VIDEO', duration: 25, order: 3, content: 'Identificare, access, evaluare conformitate, actualizare.' },
          { title: 'Obiective SSM și planificare', type: 'VIDEO', duration: 30, order: 4, content: 'Obiective SMART, indicatori, planuri de acțiune, resurse.' },
          { title: 'Exercițiu obiective', type: 'EXERCISE', duration: 20, order: 5, content: 'Definește 5 obiective SSM cu indicatori măsurabili.' },
          { title: 'Quiz planificare', type: 'QUIZ', duration: 10, order: 6, content: '15 întrebări despre planificarea SMSSO.' }
        ]
      },
      {
        title: 'Suport și Operare (Cl. 7-8)',
        order: 4,
        duration: 150,
        lessons: [
          { title: 'Resurse și competență', type: 'VIDEO', duration: 25, order: 1, content: 'Determinarea resurselor, competență, conștientizare, comunicare.' },
          { title: 'Informații documentate', type: 'VIDEO', duration: 30, order: 2, content: 'Ce să documentezi, control documente, păstrare înregistrări.' },
          { title: 'Controlul operațional', type: 'VIDEO', duration: 30, order: 3, content: 'Eliminare pericole, proceduri operaționale, managementul schimbării.' },
          { title: 'Pregătire pentru situații de urgență', type: 'VIDEO', duration: 25, order: 4, content: 'Identificare potențiale urgențe, planuri răspuns, exerciții, evaluare.' },
          { title: 'Achiziții și contractori', type: 'VIDEO', duration: 25, order: 5, content: 'Cerințe SSM în achiziții, evaluare furnizori, outsourcing.' },
          { title: 'Template procedură operațională', type: 'DOWNLOAD', duration: 15, order: 6, content: 'Model de procedură cu toate secțiunile cerute.' }
        ]
      },
      {
        title: 'Evaluare și Îmbunătățire (Cl. 9-10)',
        order: 5,
        duration: 120,
        lessons: [
          { title: 'Monitorizare și măsurare', type: 'VIDEO', duration: 25, order: 1, content: 'Ce să monitorizezi, frecvență, echipamente de măsurare, analiză.' },
          { title: 'Audit intern', type: 'VIDEO', duration: 30, order: 2, content: 'Program audit, competență auditori, planificare, raportare, follow-up.' },
          { title: 'Analiza de management', type: 'VIDEO', duration: 25, order: 3, content: 'Elemente de intrare/ieșire, frecvență, înregistrări, decizii.' },
          { title: 'Neconformități și acțiuni corective', type: 'VIDEO', duration: 25, order: 4, content: 'Tratarea neconformităților, analiza cauzei, acțiuni, eficacitate.' },
          { title: 'Checklist audit ISO 45001', type: 'DOWNLOAD', duration: 15, order: 5, content: 'Checklist complet pentru audit intern.' }
        ]
      }
    ]
  }
];

export const softSkillsCourses = [
  {
    title: 'Communication Skills pentru Profesioniști',
    slug: 'communication-skills-profesionisti',
    description: `Comunică cu impact în orice context profesional! Acest curs te ajută să îți dezvolți abilitățile de comunicare esențiale pentru succes în carieră.

Vei învăța să:
• Comunici clar și persuasiv verbal și în scris
• Asculți activ și înțelegi nevoile interlocutorilor
• Dai și primești feedback constructiv
• Gestionezi conversații dificile
• Prezinți idei cu încredere

Include exerciții practice și simulări.`,
    category: 'SOFT_SKILLS',
    level: 'BEGINNER',
    duration: 480,
    price: null,
    isFree: true,
    language: 'ro',
    tags: ['comunicare', 'prezentare', 'feedback', 'ascultare activă', 'soft skills'],
    modules: [
      {
        title: 'Fundamentele Comunicării',
        order: 1,
        duration: 90,
        lessons: [
          { title: 'Modelul comunicării eficiente', type: 'VIDEO', duration: 25, order: 1, content: 'Emițător-mesaj-canal-receptor, zgomot, feedback, bariere în comunicare.' },
          { title: 'Comunicare verbală și non-verbală', type: 'VIDEO', duration: 25, order: 2, content: '7-38-55 (Mehrabian), limbajul corpului, tonul vocii, congruență.' },
          { title: 'Stiluri de comunicare', type: 'VIDEO', duration: 25, order: 3, content: 'Asertiv, agresiv, pasiv, pasiv-agresiv. Self-assessment.' },
          { title: 'Quiz stiluri comunicare', type: 'QUIZ', duration: 15, order: 4, content: 'Identifică-ți stilul predominant de comunicare.' }
        ]
      },
      {
        title: 'Ascultare Activă',
        order: 2,
        duration: 90,
        lessons: [
          { title: 'Ce este ascultarea activă', type: 'VIDEO', duration: 20, order: 1, content: 'Diferența față de a auzi, niveluri de ascultare, beneficii.' },
          { title: 'Tehnici de ascultare activă', type: 'VIDEO', duration: 25, order: 2, content: 'Parafrazare, reflectare, clarificare, sumarizare, tăcere.' },
          { title: 'Bariere în ascultare', type: 'VIDEO', duration: 20, order: 3, content: 'Prejudecăți, distrageri, pregătirea răspunsului, emoții.' },
          { title: 'Exercițiu ascultare', type: 'EXERCISE', duration: 25, order: 4, content: 'Practică tehnicile de ascultare în perechi.' }
        ]
      },
      {
        title: 'Feedback Constructiv',
        order: 3,
        duration: 90,
        lessons: [
          { title: 'Importanța feedback-ului', type: 'VIDEO', duration: 20, order: 1, content: 'Feedback ca instrument de dezvoltare, frecvență, cultură.' },
          { title: 'Cum să dai feedback eficient', type: 'VIDEO', duration: 25, order: 2, content: 'Modelul SBI (Situație-Comportament-Impact), timing, specific.' },
          { title: 'Cum să primești feedback', type: 'VIDEO', duration: 20, order: 3, content: 'Deschidere, clarificare, reflecție, acțiune, mulțumire.' },
          { title: 'Simulare feedback', type: 'SIMULATION', duration: 25, order: 4, content: 'Scenarii de feedback: performanță, comportament, dezvoltare.' }
        ]
      },
      {
        title: 'Conversații Dificile',
        order: 4,
        duration: 90,
        lessons: [
          { title: 'Pregătirea conversației', type: 'VIDEO', duration: 25, order: 1, content: 'Identificare obiectiv, anticipare reacții, alegere moment, structură.' },
          { title: 'Tehnici pentru conversații dificile', type: 'VIDEO', duration: 25, order: 2, content: 'DESC model, sandwich (cu atenție), I-statements, de-escalare.' },
          { title: 'Gestionarea emoțiilor', type: 'VIDEO', duration: 20, order: 3, content: 'Recunoaștere, reglare, empatie, pauze strategice.' },
          { title: 'Exercițiu conversații', type: 'EXERCISE', duration: 20, order: 4, content: 'Role-play pentru scenarii dificile comune.' }
        ]
      },
      {
        title: 'Prezentări cu Impact',
        order: 5,
        duration: 120,
        lessons: [
          { title: 'Structura unei prezentări', type: 'VIDEO', duration: 25, order: 1, content: 'Hook, teză, 3 puncte principale, concluzie, call-to-action.' },
          { title: 'Slide design eficient', type: 'VIDEO', duration: 25, order: 2, content: 'Minimal text, vizual puternic, una idee/slide, consistență.' },
          { title: 'Tehnici de delivery', type: 'VIDEO', duration: 30, order: 3, content: 'Contact vizual, pauze, variație ton, gesturi, energie.' },
          { title: 'Gestionarea întrebărilor', type: 'VIDEO', duration: 20, order: 4, content: 'Anticipare, reformulare, recunoaștere limite, follow-up.' },
          { title: 'Quiz final comunicare', type: 'QUIZ', duration: 20, order: 5, content: '25 întrebări din tot cursul.' }
        ]
      }
    ]
  },
  {
    title: 'Time Management și Productivitate',
    slug: 'time-management-productivitate',
    description: `Stăpânește-ți timpul și crește-ți productivitatea! Acest curs te învață tehnicile dovedite pentru a face mai mult în mai puțin timp, fără burnout.

Vei învăța să:
• Prioritizezi sarcinile folosind tehnici validate
• Planifici eficient ziua, săptămâna, lunile
• Elimini distragerile și time wasters
• Delegi și spui "nu" strategic
• Menții echilibrul și energia pe termen lung

Bazat pe cercetări în psihologia productivității.`,
    category: 'SOFT_SKILLS',
    level: 'INTERMEDIATE',
    duration: 360,
    price: 49,
    isFree: false,
    language: 'ro',
    tags: ['productivitate', 'prioritizare', 'planificare', 'time management', 'eficiență'],
    modules: [
      {
        title: 'Fundamente Time Management',
        order: 1,
        duration: 60,
        lessons: [
          { title: 'Unde îți dispare timpul?', type: 'VIDEO', duration: 20, order: 1, content: 'Audit de timp, categorii de activități, time wasters, revelații.' },
          { title: 'Principii de productivitate', type: 'VIDEO', duration: 25, order: 2, content: 'Pareto 80/20, Parkinson Law, Eat the Frog, batching.' },
          { title: 'Exercițiu audit timp', type: 'EXERCISE', duration: 15, order: 3, content: 'Urmărește și categorisește activitățile timp de o zi.' }
        ]
      },
      {
        title: 'Prioritizare',
        order: 2,
        duration: 90,
        lessons: [
          { title: 'Matricea Eisenhower', type: 'VIDEO', duration: 25, order: 1, content: 'Urgent/Important, DO-SCHEDULE-DELEGATE-ELIMINATE, aplicare practică.' },
          { title: 'Alte tehnici de prioritizare', type: 'VIDEO', duration: 25, order: 2, content: 'MoSCoW, ABCDE method, value vs effort, ICE scoring.' },
          { title: 'Prioritizare în echipă', type: 'VIDEO', duration: 20, order: 3, content: 'Alinierea priorităților, OKRs, comunicarea priorităților, trade-offs.' },
          { title: 'Exercițiu prioritizare', type: 'EXERCISE', duration: 20, order: 4, content: 'Aplică Eisenhower pe lista ta de sarcini.' }
        ]
      },
      {
        title: 'Planificare și Execuție',
        order: 3,
        duration: 90,
        lessons: [
          { title: 'Planificarea zilei', type: 'VIDEO', duration: 25, order: 1, content: 'Time blocking, MIT (Most Important Tasks), buffer time, reviews.' },
          { title: 'Planificarea săptămânii și lunii', type: 'VIDEO', duration: 25, order: 2, content: 'Weekly review, monthly goals, ritualuri, ajustări.' },
          { title: 'Tehnici de focus', type: 'VIDEO', duration: 25, order: 3, content: 'Pomodoro, deep work, single-tasking, environment design.' },
          { title: 'Template planificare săptămânală', type: 'DOWNLOAD', duration: 15, order: 4, content: 'Template în Excel pentru planificare săptămânală.' }
        ]
      },
      {
        title: 'Eliminarea Time Wasters',
        order: 4,
        duration: 60,
        lessons: [
          { title: 'Identificarea distragerilor', type: 'VIDEO', duration: 20, order: 1, content: 'Notificări, email, meetings, social media, interruptions.' },
          { title: 'Strategii de eliminare', type: 'VIDEO', duration: 25, order: 2, content: 'Notification diet, email batching, meeting audit, focus apps.' },
          { title: 'Cum să spui "nu"', type: 'VIDEO', duration: 15, order: 3, content: 'Tehnici asertive pentru a refuza politic și eficient.' }
        ]
      },
      {
        title: 'Sustenabilitate și Energie',
        order: 5,
        duration: 60,
        lessons: [
          { title: 'Energy management', type: 'VIDEO', duration: 20, order: 1, content: 'Ultradian rhythms, energy audit, peak performance times.' },
          { title: 'Prevenirea burnout', type: 'VIDEO', duration: 20, order: 2, content: 'Semne de avertizare, boundaries, recovery, sustainable pace.' },
          { title: 'Quiz final productivitate', type: 'QUIZ', duration: 20, order: 3, content: '20 întrebări și plan personal de acțiune.' }
        ]
      }
    ]
  },
  {
    title: 'Negociere și Influențare',
    slug: 'negociere-influentare',
    description: `Obține ce vrei prin negociere inteligentă și influențare etică! Acest curs avansat te pregătește pentru negocieri de business, salariu, contracte și situații de zi cu zi.

Vei învăța să:
• Pregătești negocieri folosind frameworks dovedite
• Identifici interesele vs pozițiile
• Aplici tehnici de influențare etică
• Gestionezi tactici dure și impasuri
• Închizi acorduri win-win

Bazat pe Harvard Negotiation Project și cercetări în psihologie.`,
    category: 'SOFT_SKILLS',
    level: 'ADVANCED',
    duration: 480,
    price: 99,
    isFree: false,
    language: 'ro',
    tags: ['negociere', 'influențare', 'persuasiune', 'conflict', 'deal-making'],
    modules: [
      {
        title: 'Fundamente Negociere',
        order: 1,
        duration: 90,
        lessons: [
          { title: 'Ce este negocierea?', type: 'VIDEO', duration: 20, order: 1, content: 'Definiție, tipuri (distributivă vs integrativă), când negociezi.' },
          { title: 'Principled Negotiation (Harvard)', type: 'VIDEO', duration: 30, order: 2, content: 'Separă oamenii de problemă, focus pe interese, opțiuni, criterii obiective.' },
          { title: 'BATNA și zona de acord', type: 'VIDEO', duration: 25, order: 3, content: 'Best Alternative, WATNA, reservation price, ZOPA, aspiration point.' },
          { title: 'Quiz fundamente', type: 'QUIZ', duration: 15, order: 4, content: '15 întrebări despre conceptele de bază.' }
        ]
      },
      {
        title: 'Pregătirea Negocierii',
        order: 2,
        duration: 90,
        lessons: [
          { title: 'Research și intelligence', type: 'VIDEO', duration: 25, order: 1, content: 'Informații despre cealaltă parte, market intelligence, precedente.' },
          { title: 'Definirea obiectivelor', type: 'VIDEO', duration: 20, order: 2, content: 'Obiective SMART, prioritizare issues, trade-offs acceptabile.' },
          { title: 'Strategia de negociere', type: 'VIDEO', duration: 25, order: 3, content: 'Abordare competitivă vs cooperativă, primii pași, concesii planificate.' },
          { title: 'Checklist pregătire', type: 'DOWNLOAD', duration: 20, order: 4, content: 'Template pentru pregătirea oricărei negocieri.' }
        ]
      },
      {
        title: 'Tehnici de Influențare',
        order: 3,
        duration: 120,
        lessons: [
          { title: 'Principiile influenței (Cialdini)', type: 'VIDEO', duration: 35, order: 1, content: 'Reciprocitate, commitment, social proof, autoritate, liking, scarcity.' },
          { title: 'Framing și anchoring', type: 'VIDEO', duration: 25, order: 2, content: 'Cum să framing-uiești propuneri, anchor effect, reframing.' },
          { title: 'Storytelling persuasiv', type: 'VIDEO', duration: 25, order: 3, content: 'Structură poveste, emoție + logică, analogii, vizualizare.' },
          { title: 'Exercițiu influențare', type: 'EXERCISE', duration: 20, order: 4, content: 'Aplică 3 principii pentru o propunere reală.' },
          { title: 'Etică în influențare', type: 'VIDEO', duration: 15, order: 5, content: 'Linia fină: persuasiune vs manipulare, responsabilități.' }
        ]
      },
      {
        title: 'Tactici și Counter-Tactici',
        order: 4,
        duration: 90,
        lessons: [
          { title: 'Tactici comune de negociere', type: 'VIDEO', duration: 30, order: 1, content: 'Good cop/bad cop, highball/lowball, silence, deadline pressure, nibbling.' },
          { title: 'Cum să răspunzi la tactici dure', type: 'VIDEO', duration: 25, order: 2, content: 'Recunoaștere, nu reacționa, redirectare, walk away.' },
          { title: 'Gestionarea impasurilor', type: 'VIDEO', duration: 20, order: 3, content: 'De ce apar, tehnici de deblocare, cooling off, mediator.' },
          { title: 'Simulare negociere', type: 'SIMULATION', duration: 15, order: 4, content: 'Role-play: negocierea unui contract de furnizare.' }
        ]
      },
      {
        title: 'Închiderea și Follow-up',
        order: 5,
        duration: 90,
        lessons: [
          { title: 'Semnale de închidere', type: 'VIDEO', duration: 20, order: 1, content: 'Recunoașterea momentului, tehnici de closing, rezumare acord.' },
          { title: 'Documentarea acordului', type: 'VIDEO', duration: 20, order: 2, content: 'MOU, contract, clarificări, termeni și condiții.' },
          { title: 'Negocierea salariului', type: 'VIDEO', duration: 25, order: 3, content: 'Aplicare specifică: timing, research, presentare, negociere pachet.' },
          { title: 'Post-negociere', type: 'VIDEO', duration: 15, order: 4, content: 'Implementare, relația pe termen lung, lessons learned.' },
          { title: 'Quiz final negociere', type: 'QUIZ', duration: 10, order: 5, content: '20 întrebări din tot cursul.' }
        ]
      }
    ]
  }
];
