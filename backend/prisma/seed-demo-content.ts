/**
 * DocumentIulia.ro - Comprehensive Demo Content Seed
 *
 * This file seeds the database with:
 * - 10 Demo Romanian SME businesses with full data
 * - 50+ LMS Courses across all categories
 * - Forum categories and threads
 * - Blog articles
 * - HR, HSE, Freelancer, and Logistics data
 */

// Import elite courses with comprehensive content
import { eliteBusinessCourses } from './seed-data/courses-comprehensive-content';

// ===== DEMO BUSINESSES =====
export const demoBusinesses = [
  {
    id: 'biz-translog',
    name: 'TransLog SRL',
    cui: 'RO15234567',
    industry: 'Logistics & Transportation',
    city: 'București',
    county: 'București',
    employees: 45,
    revenue: 8500000,
    tier: 'BUSINESS',
    description: 'Companie de transport și logistică cu flotă proprie de 30 de camioane, specializată în transport intern și internațional.',
    contacts: [
      { name: 'Maria Ionescu', role: 'Director Financiar', email: 'maria.ionescu@translog.ro', phone: '+40721234567' },
      { name: 'Andrei Marin', role: 'Director Operațiuni', email: 'andrei.marin@translog.ro', phone: '+40722345678' },
    ],
  },
  {
    id: 'biz-buildtech',
    name: 'BuildTech România SRL',
    cui: 'RO18456789',
    industry: 'Construction',
    city: 'Cluj-Napoca',
    county: 'Cluj',
    employees: 120,
    revenue: 25000000,
    tier: 'BUSINESS',
    description: 'Constructor general cu experiență în proiecte rezidențiale și comerciale, certificat ISO 9001 și ISO 14001.',
    contacts: [
      { name: 'Andrei Popescu', role: 'Contabil Șef', email: 'andrei.popescu@buildtech.ro', phone: '+40723456789' },
      { name: 'Cristian Dumitrescu', role: 'Director Tehnic', email: 'cristian.d@buildtech.ro', phone: '+40724567890' },
    ],
  },
  {
    id: 'biz-medicare',
    name: 'MediCare Plus SRL',
    cui: 'RO21567890',
    industry: 'Healthcare',
    city: 'Timișoara',
    county: 'Timiș',
    employees: 35,
    revenue: 4200000,
    tier: 'PRO',
    description: 'Rețea de cabinete medicale private, cu specializări în medicină internă, cardiologie și pediatrie.',
    contacts: [
      { name: 'Elena Dumitrescu', role: 'Administrator', email: 'elena.d@medicare.ro', phone: '+40725678901' },
      { name: 'Dr. Adrian Stan', role: 'Director Medical', email: 'adrian.stan@medicare.ro', phone: '+40726789012' },
    ],
  },
  {
    id: 'biz-agrofarm',
    name: 'AgroFarm Holding SA',
    cui: 'RO24678901',
    industry: 'Agriculture',
    city: 'Craiova',
    county: 'Dolj',
    employees: 85,
    revenue: 12000000,
    tier: 'BUSINESS',
    description: 'Fermă agricolă integrată cu 2,500 hectare teren arabil, depozite și capacitate de procesare cereale.',
    contacts: [
      { name: 'Ion Georgescu', role: 'Director General', email: 'ion.g@agrofarm.ro', phone: '+40727890123' },
      { name: 'Ana Voicu', role: 'CFO', email: 'ana.voicu@agrofarm.ro', phone: '+40728901234' },
    ],
  },
  {
    id: 'biz-techinnov',
    name: 'TechInnov Solutions SRL',
    cui: 'RO27789012',
    industry: 'IT Services',
    city: 'București',
    county: 'București',
    employees: 65,
    revenue: 9800000,
    tier: 'BUSINESS',
    description: 'Companie IT specializată în dezvoltare software custom, cloud computing și consultanță digitală.',
    contacts: [
      { name: 'Radu Mihai', role: 'CEO', email: 'radu.mihai@techinnov.ro', phone: '+40729012345' },
      { name: 'Simona Cristea', role: 'HR Manager', email: 'simona.c@techinnov.ro', phone: '+40730123456' },
    ],
  },
  {
    id: 'biz-retailhub',
    name: 'RetailHub Distribution SRL',
    cui: 'RO30890123',
    industry: 'Retail & E-commerce',
    city: 'Iași',
    county: 'Iași',
    employees: 150,
    revenue: 35000000,
    tier: 'BUSINESS',
    description: 'Distribuitor și retailer omnichannel cu 15 magazine fizice și platformă e-commerce cu 50,000+ produse.',
    contacts: [
      { name: 'Mihai Tudor', role: 'Director Comercial', email: 'mihai.tudor@retailhub.ro', phone: '+40731234567' },
      { name: 'Laura Nistor', role: 'E-commerce Manager', email: 'laura.n@retailhub.ro', phone: '+40732345678' },
    ],
  },
  {
    id: 'biz-manufprod',
    name: 'ManuProd Industries SA',
    cui: 'RO33901234',
    industry: 'Manufacturing',
    city: 'Brașov',
    county: 'Brașov',
    employees: 280,
    revenue: 48000000,
    tier: 'BUSINESS',
    description: 'Producător de componente auto și industriale, furnizor tier-2 pentru mari constructori europeni.',
    contacts: [
      { name: 'Alexandru Radu', role: 'Plant Manager', email: 'alexandru.radu@manufprod.ro', phone: '+40733456789' },
      { name: 'Diana Petrescu', role: 'Quality Manager', email: 'diana.p@manufprod.ro', phone: '+40734567890' },
    ],
  },
  {
    id: 'biz-servicepro',
    name: 'ServicePro Consulting SRL',
    cui: 'RO36012345',
    industry: 'Professional Services',
    city: 'București',
    county: 'București',
    employees: 28,
    revenue: 3500000,
    tier: 'PRO',
    description: 'Firmă de consultanță în management și strategie de afaceri, cu focus pe transformare digitală și eficiență operațională.',
    contacts: [
      { name: 'Bogdan Marinescu', role: 'Managing Partner', email: 'bogdan.m@servicepro.ro', phone: '+40735678901' },
      { name: 'Irina Vlad', role: 'Senior Consultant', email: 'irina.vlad@servicepro.ro', phone: '+40736789012' },
    ],
  },
  {
    id: 'biz-foodchain',
    name: 'FoodChain Distribution SRL',
    cui: 'RO39123456',
    industry: 'Food & Beverage',
    city: 'Constanța',
    county: 'Constanța',
    employees: 95,
    revenue: 22000000,
    tier: 'BUSINESS',
    description: 'Distribuitor regional de produse alimentare și băuturi, cu depozite frigorifice și flotă de distribuție proprie.',
    contacts: [
      { name: 'Vlad Constantinescu', role: 'Director Logistică', email: 'vlad.c@foodchain.ro', phone: '+40737890123' },
      { name: 'Monica Stancu', role: 'Procurement Manager', email: 'monica.s@foodchain.ro', phone: '+40738901234' },
    ],
  },
  {
    id: 'biz-greenenergy',
    name: 'GreenEnergy Power SRL',
    cui: 'RO42234567',
    industry: 'Renewable Energy',
    city: 'Sibiu',
    county: 'Sibiu',
    employees: 42,
    revenue: 18000000,
    tier: 'BUSINESS',
    description: 'Producător de energie verde din surse solare și eoliene, cu 25MW capacitate instalată și servicii de consultanță energie.',
    contacts: [
      { name: 'Dan Moldovan', role: 'CEO', email: 'dan.moldovan@greenenergy.ro', phone: '+40739012345' },
      { name: 'Alina Barbu', role: 'Sustainability Manager', email: 'alina.b@greenenergy.ro', phone: '+40740123456' },
    ],
  },
];

// ===== COURSE CATALOG =====
export const courseCatalog = {
  // EXCEL & VBA COURSES
  excelVba: [
    {
      id: 'course-excel-basics',
      title: 'Excel pentru Începători',
      titleEn: 'Excel Basics',
      category: 'EXCEL_VBA',
      level: 'BEGINNER',
      duration: 480, // minutes
      price: 0,
      description: 'Fundamente Microsoft Excel: navigare, formule de bază, formatare și grafice simple.',
      modules: [
        { title: 'Introducere în Excel', lessons: ['Interfața Excel', 'Navigare și selecție', 'Tipuri de date', 'Salvare și export'] },
        { title: 'Formule de Bază', lessons: ['Operatori aritmetici', 'SUM, AVERAGE, COUNT', 'MIN, MAX, IF simplu', 'Referințe relative și absolute'] },
        { title: 'Formatare', lessons: ['Formatare celule', 'Formatare condiționată', 'Stiluri și teme', 'Imprimare'] },
        { title: 'Grafice Simple', lessons: ['Tipuri de grafice', 'Creare grafic', 'Personalizare', 'Dashboards simple'] },
      ],
    },
    {
      id: 'course-excel-intermediate',
      title: 'Excel Intermediar',
      titleEn: 'Intermediate Excel',
      category: 'EXCEL_VBA',
      level: 'INTERMEDIATE',
      duration: 600,
      price: 49,
      description: 'Funcții avansate, Pivot Tables, validare date și tehnici de analiză pentru utilizatori cu experiență.',
      modules: [
        { title: 'Funcții Avansate', lessons: ['VLOOKUP și HLOOKUP', 'INDEX-MATCH', 'SUMIF/COUNTIF', 'Funcții text'] },
        { title: 'Pivot Tables', lessons: ['Creare Pivot', 'Câmpuri și valori', 'Slicers și Timeline', 'Pivot Charts'] },
        { title: 'Validare și Protecție', lessons: ['Data Validation', 'Protecție foi/celule', 'Named Ranges', 'Dropdown lists'] },
        { title: 'Analiză Date', lessons: ['Goal Seek', 'What-If Analysis', 'Data Tables', 'Solver basics'] },
      ],
    },
    {
      id: 'course-excel-advanced',
      title: 'Excel Avansat & Power Query',
      titleEn: 'Advanced Excel & Power Query',
      category: 'EXCEL_VBA',
      level: 'ADVANCED',
      duration: 720,
      price: 99,
      description: 'Power Query, Power Pivot, funcții array și tehnici avansate pentru analiști.',
      modules: [
        { title: 'Power Query', lessons: ['Conectare surse', 'Transformări date', 'Merge și Append', 'Automatizare refresh'] },
        { title: 'Power Pivot', lessons: ['Model de date', 'DAX basics', 'Relații tabele', 'Măsuri calculate'] },
        { title: 'Funcții Array', lessons: ['Dynamic Arrays', 'FILTER, SORT, UNIQUE', 'XLOOKUP', 'LET și LAMBDA'] },
        { title: 'Analiză Avansată', lessons: ['Monte Carlo', 'Regression', 'Forecasting', 'Custom functions'] },
      ],
    },
    {
      id: 'course-vba-fundamentals',
      title: 'VBA Fundamentals',
      titleEn: 'VBA Fundamentals',
      category: 'EXCEL_VBA',
      level: 'INTERMEDIATE',
      duration: 900,
      price: 149,
      description: 'Programare VBA de la zero: macro recording, variabile, structuri de control și automatizare.',
      modules: [
        { title: 'Introducere VBA', lessons: ['Ce este VBA', 'Macro Recorder', 'VBE Environment', 'Module și proceduri'] },
        { title: 'Programare de Bază', lessons: ['Variabile și tipuri', 'Operatori', 'If-Then-Else', 'Loops (For, Do While)'] },
        { title: 'Obiecte Excel', lessons: ['Range Object', 'Worksheet Object', 'Workbook Object', 'Application Object'] },
        { title: 'UserForms', lessons: ['Creare UserForm', 'Controale (TextBox, Button)', 'Event handling', 'Validare input'] },
        { title: 'Automatizare', lessons: ['File operations', 'Email automation', 'Error handling', 'Best practices'] },
      ],
    },
    {
      id: 'course-vba-advanced',
      title: 'VBA Avansat & API Integration',
      titleEn: 'Advanced VBA & API Integration',
      category: 'EXCEL_VBA',
      level: 'ADVANCED',
      duration: 1080,
      price: 199,
      description: 'Class modules, API calls, database connectivity și development profesional.',
      modules: [
        { title: 'OOP în VBA', lessons: ['Class Modules', 'Properties & Methods', 'Encapsulation', 'Collections custom'] },
        { title: 'Database Connectivity', lessons: ['ADO basics', 'SQL queries', 'Connection strings', 'Recordsets'] },
        { title: 'API Integration', lessons: ['HTTP requests', 'JSON parsing', 'REST APIs', 'Authentication'] },
        { title: 'Advanced Topics', lessons: ['Windows API', 'Multithreading', 'COM Add-ins', 'Performance optimization'] },
      ],
    },
  ],

  // PROJECT MANAGEMENT COURSES
  projectManagement: [
    {
      id: 'course-pm-fundamentals',
      title: 'Fundamente Project Management',
      titleEn: 'Project Management Fundamentals',
      category: 'PROJECT_MANAGEMENT',
      level: 'BEGINNER',
      duration: 600,
      price: 0,
      description: 'Introducere în managementul proiectelor: ciclul de viață, planificare, execuție și control.',
      modules: [
        { title: 'Introducere PM', lessons: ['Ce este un proiect', 'Rolul PM', 'Metodologii overview', 'Project Charter'] },
        { title: 'Planificare', lessons: ['WBS', 'Estimări', 'Gantt basics', 'Resource planning'] },
        { title: 'Execuție', lessons: ['Team management', 'Communication', 'Stakeholders', 'Progress tracking'] },
        { title: 'Control & Close', lessons: ['Change management', 'Risk basics', 'Quality', 'Lessons learned'] },
      ],
    },
    {
      id: 'course-agile-scrum',
      title: 'Agile & Scrum Mastery',
      titleEn: 'Agile & Scrum Mastery',
      category: 'PROJECT_MANAGEMENT',
      level: 'INTERMEDIATE',
      duration: 720,
      price: 99,
      description: 'Framework Agile și Scrum complet: sprints, ceremonies, artifacts și transformare organizațională.',
      modules: [
        { title: 'Agile Mindset', lessons: ['Agile Manifesto', 'Principles', 'Agile vs Waterfall', 'When to use Agile'] },
        { title: 'Scrum Framework', lessons: ['Roles (PO, SM, Team)', 'Events', 'Artifacts', 'Definition of Done'] },
        { title: 'Sprint Execution', lessons: ['Sprint Planning', 'Daily Scrum', 'Sprint Review', 'Retrospective'] },
        { title: 'Scaling & Tools', lessons: ['SAFe overview', 'Jira/Azure DevOps', 'Metrics', 'Continuous improvement'] },
      ],
    },
    {
      id: 'course-pmp-prep',
      title: 'PMP Exam Preparation',
      titleEn: 'PMP Exam Preparation',
      category: 'PROJECT_MANAGEMENT',
      level: 'ADVANCED',
      duration: 1800,
      price: 299,
      description: 'Pregătire completă pentru certificarea PMP: PMBOK 7, Process Groups, Knowledge Areas.',
      modules: [
        { title: 'PMBOK Overview', lessons: ['PMBOK 7 changes', 'Principles', 'Performance domains', 'Tailoring'] },
        { title: 'Predictive Approach', lessons: ['Integration', 'Scope', 'Schedule', 'Cost', 'Quality'] },
        { title: 'People & Process', lessons: ['Resource', 'Communications', 'Risk', 'Procurement', 'Stakeholder'] },
        { title: 'Agile & Hybrid', lessons: ['Agile practices', 'Hybrid approaches', 'Servant leadership', 'Value delivery'] },
        { title: 'Exam Prep', lessons: ['Exam format', 'Study strategies', 'Practice questions', 'Day of exam'] },
      ],
    },
  ],

  // FINANCE COURSES
  finance: [
    {
      id: 'course-finance-basics',
      title: 'Finanțe pentru Non-Financiari',
      titleEn: 'Finance for Non-Finance Professionals',
      category: 'FINANCE',
      level: 'BEGINNER',
      duration: 480,
      price: 0,
      description: 'Concepte financiare esențiale pentru manageri și profesioniști din alte domenii.',
      modules: [
        { title: 'Documente Financiare', lessons: ['Bilanț', 'Cont P&L', 'Cash Flow Statement', 'Interpretare'] },
        { title: 'Indicatori Financiari', lessons: ['Lichiditate', 'Profitabilitate', 'Solvabilitate', 'Eficiență'] },
        { title: 'Bugetare', lessons: ['Tipuri bugete', 'Proces bugetar', 'Variance analysis', 'Forecasting basics'] },
        { title: 'Decizii Financiare', lessons: ['Break-even', 'Make vs Buy', 'CapEx vs OpEx', 'ROI'] },
      ],
    },
    {
      id: 'course-budgeting-forecasting',
      title: 'Budgeting & Financial Forecasting',
      titleEn: 'Budgeting & Financial Forecasting',
      category: 'FINANCE',
      level: 'INTERMEDIATE',
      duration: 720,
      price: 149,
      description: 'Tehnici avansate de bugetare, forecasting și planificare financiară pentru CFO și controlleri.',
      modules: [
        { title: 'Advanced Budgeting', lessons: ['Zero-based budgeting', 'Rolling forecasts', 'Driver-based planning', 'Scenario planning'] },
        { title: 'Financial Modeling', lessons: ['Model structure', 'Assumptions', 'Sensitivity analysis', 'Best practices'] },
        { title: 'Cash Flow Management', lessons: ['Cash forecasting', 'Working capital', '13-week model', 'Treasury'] },
        { title: 'Performance Management', lessons: ['KPIs', 'Balanced Scorecard', 'Reporting', 'Board presentations'] },
      ],
    },
    {
      id: 'course-ro-accounting',
      title: 'Contabilitate Românească (RO GAAP)',
      titleEn: 'Romanian Accounting Standards',
      category: 'FINANCE',
      level: 'INTERMEDIATE',
      duration: 960,
      price: 199,
      description: 'Standarde contabile românești, OMFP 1802, plan de conturi și raportare ANAF.',
      modules: [
        { title: 'Cadru Legal', lessons: ['Legea contabilității', 'OMFP 1802/2014', 'Principii contabile', 'Documentare'] },
        { title: 'Plan de Conturi', lessons: ['Structura planului', 'Clase de conturi', 'Monografie contabilă', 'Închideri'] },
        { title: 'TVA și Taxe', lessons: ['TVA 21%/11%', 'Prorata', 'ANAF declarații', 'e-Factura'] },
        { title: 'SAF-T & Raportare', lessons: ['SAF-T D406', 'XML structure', 'DUKIntegrator', 'Audit trail'] },
      ],
    },
    {
      id: 'course-ifrs-essentials',
      title: 'IFRS Essentials',
      titleEn: 'IFRS Essentials',
      category: 'FINANCE',
      level: 'ADVANCED',
      duration: 1200,
      price: 249,
      description: 'Standarde IFRS pentru companii multinaționale și raportare consolidată.',
      modules: [
        { title: 'IFRS Framework', lessons: ['Conceptual framework', 'Fair value', 'First-time adoption', 'Disclosure requirements'] },
        { title: 'Key Standards', lessons: ['IFRS 15 Revenue', 'IFRS 16 Leases', 'IAS 36 Impairment', 'IAS 38 Intangibles'] },
        { title: 'Financial Instruments', lessons: ['IFRS 9 basics', 'Classification', 'Hedge accounting', 'Expected credit loss'] },
        { title: 'Consolidation', lessons: ['IFRS 10 Consolidation', 'Business combinations', 'Joint ventures', 'Group reporting'] },
      ],
    },
  ],

  // MBA/LEADERSHIP COURSES
  leadership: [
    {
      id: 'course-leadership-fundamentals',
      title: 'Fundamente Leadership',
      titleEn: 'Leadership Fundamentals',
      category: 'LEADERSHIP',
      level: 'BEGINNER',
      duration: 480,
      price: 0,
      description: 'Principiile leadership-ului eficient: stiluri, comunicare și motivare echipe.',
      modules: [
        { title: 'Self-Leadership', lessons: ['Autocunoaștere', 'Inteligența emoțională', 'Growth mindset', 'Time management'] },
        { title: 'Stiluri de Leadership', lessons: ['Tipuri de lideri', 'Situational leadership', 'Servant leadership', 'Authentic leadership'] },
        { title: 'Comunicare', lessons: ['Active listening', 'Feedback', 'Difficult conversations', 'Public speaking'] },
        { title: 'Motivare', lessons: ['Teorii motivaționale', 'Recognition', 'Team building', 'Culture'] },
      ],
    },
    {
      id: 'course-strategic-management',
      title: 'Strategic Management MBA',
      titleEn: 'Strategic Management MBA',
      category: 'LEADERSHIP',
      level: 'ADVANCED',
      duration: 1440,
      price: 349,
      description: 'Curs MBA în management strategic: analiză competitivă, planificare strategică și execuție.',
      modules: [
        { title: 'Strategic Analysis', lessons: ['PESTLE', 'Porter 5 Forces', 'SWOT', 'Value chain'] },
        { title: 'Strategy Formulation', lessons: ['Vision & Mission', 'Strategic options', 'Blue Ocean', 'Disruptive strategy'] },
        { title: 'Strategy Execution', lessons: ['OKRs', 'Strategy maps', 'Change management', 'Alignment'] },
        { title: 'Case Studies', lessons: ['Tesla', 'Amazon', 'Local champions', 'Turnaround stories'] },
      ],
    },
    {
      id: 'course-business-ethics',
      title: 'Business Ethics & ESG',
      titleEn: 'Business Ethics & ESG',
      category: 'LEADERSHIP',
      level: 'INTERMEDIATE',
      duration: 600,
      price: 99,
      description: 'Etică în afaceri, guvernanță corporativă și raportare ESG/sustainability.',
      modules: [
        { title: 'Business Ethics', lessons: ['Ethical frameworks', 'Dilemmas', 'Whistleblowing', 'Code of conduct'] },
        { title: 'Corporate Governance', lessons: ['Board roles', 'Compliance', 'Risk management', 'Internal audit'] },
        { title: 'ESG Fundamentals', lessons: ['What is ESG', 'Materiality', 'Reporting frameworks', 'GRI/SASB'] },
        { title: 'Sustainability', lessons: ['Carbon footprint', 'Net zero', 'Circular economy', 'Social impact'] },
      ],
    },
  ],

  // COMPLIANCE COURSES
  compliance: [
    {
      id: 'course-gdpr',
      title: 'GDPR Compliance',
      titleEn: 'GDPR Compliance',
      category: 'COMPLIANCE',
      level: 'INTERMEDIATE',
      duration: 600,
      price: 99,
      description: 'Regulamentul GDPR pentru profesioniști: principii, drepturi, obligații și implementare.',
      modules: [
        { title: 'GDPR Overview', lessons: ['Context și aplicare', 'Principii', 'Temeiuri legale', 'Drepturi persoane'] },
        { title: 'Implementare', lessons: ['DPO', 'DPIA', 'Records of processing', 'Privacy by design'] },
        { title: 'Security & Breach', lessons: ['Security measures', 'Breach notification', 'International transfers', 'SCCs'] },
        { title: 'Specific Contexts', lessons: ['HR data', 'Marketing', 'E-commerce', 'ANSPDCP'] },
      ],
    },
    {
      id: 'course-anaf-compliance',
      title: 'Conformitate ANAF',
      titleEn: 'ANAF Compliance',
      category: 'COMPLIANCE',
      level: 'INTERMEDIATE',
      duration: 720,
      price: 149,
      description: 'Cerințe ANAF complete: e-Factura, SAF-T D406, SPV și declarații fiscale.',
      modules: [
        { title: 'Cadrul Fiscal RO', lessons: ['Legea 141/2025', 'Ordin 1783/2021', 'Codul Fiscal', 'Codul de Procedură'] },
        { title: 'e-Factura SPV', lessons: ['UBL 2.1', 'Transmitere SPV', 'Validare', 'Rectificări'] },
        { title: 'SAF-T D406', lessons: ['Structura XML', 'Mapping', 'DUKIntegrator', 'Deadline-uri'] },
        { title: 'Controale ANAF', lessons: ['Inspecție fiscală', 'Documente', 'Contestații', 'Best practices'] },
      ],
    },
    {
      id: 'course-hse',
      title: 'HSE Compliance (SSM)',
      titleEn: 'Health Safety Environment',
      category: 'COMPLIANCE',
      level: 'INTERMEDIATE',
      duration: 900,
      price: 199,
      description: 'Sănătate și securitate în muncă: legislație, evaluare riscuri, ISO 45001.',
      modules: [
        { title: 'Legislație SSM', lessons: ['Legea 319/2006', 'HG 1425/2006', 'ISCIR', 'ITM'] },
        { title: 'Evaluare Riscuri', lessons: ['Metodologii', 'Fișe SSM', 'Instrucțiuni proprii', 'Plan prevenire'] },
        { title: 'ISO 45001', lessons: ['Cerințe standard', 'Implementare', 'Documentare', 'Audit intern'] },
        { title: 'Practici HSE', lessons: ['Incident investigation', 'Near miss', 'KPIs', 'Safety culture'] },
      ],
    },
  ],

  // HR COURSES
  hr: [
    {
      id: 'course-hr-fundamentals',
      title: 'HR Fundamentals',
      titleEn: 'HR Fundamentals',
      category: 'HR',
      level: 'BEGINNER',
      duration: 480,
      price: 0,
      description: 'Bazele managementului resurselor umane: recrutare, onboarding, performance.',
      modules: [
        { title: 'HR Overview', lessons: ['Rolul HR', 'HR Strategy', 'Employee lifecycle', 'HRIS basics'] },
        { title: 'Recruitment', lessons: ['Job analysis', 'Sourcing', 'Interviewing', 'Selection'] },
        { title: 'Onboarding', lessons: ['Pre-boarding', 'First day', '30-60-90', 'Culture integration'] },
        { title: 'Performance', lessons: ['Goal setting', 'Feedback', 'Appraisals', 'Development plans'] },
      ],
    },
    {
      id: 'course-labor-law-ro',
      title: 'Dreptul Muncii în România',
      titleEn: 'Romanian Labor Law',
      category: 'HR',
      level: 'INTERMEDIATE',
      duration: 720,
      price: 149,
      description: 'Codul Muncii complet: contracte, REVISAL, concedii, încetare raporturi muncă.',
      modules: [
        { title: 'Codul Muncii', lessons: ['Structura CM', 'CIM individual', 'Modificări contract', 'Suspendare'] },
        { title: 'Contracte Speciale', lessons: ['Probă', 'Part-time', 'Telemuncă', 'CIM determinat'] },
        { title: 'REVISAL & ITM', lessons: ['Înregistrare', 'Modificări', 'Sancțiuni', 'Control ITM'] },
        { title: 'Încetare CIM', lessons: ['Demisie', 'Concediere', 'Preaviz', 'Documente finale'] },
      ],
    },
  ],

  // OPERATIONS COURSES
  operations: [
    {
      id: 'course-lean-six-sigma',
      title: 'Lean Six Sigma Yellow Belt',
      titleEn: 'Lean Six Sigma Yellow Belt',
      category: 'OPERATIONS',
      level: 'INTERMEDIATE',
      duration: 720,
      price: 199,
      description: 'Metodologie Lean Six Sigma pentru îmbunătățire procese și reducere variabilitate.',
      modules: [
        { title: 'Lean Basics', lessons: ['What is Lean', '8 Wastes', 'Value Stream', '5S'] },
        { title: 'Six Sigma', lessons: ['DMAIC', 'Variation', 'Statistics basics', 'Process capability'] },
        { title: 'Tools', lessons: ['Fishbone', '5 Whys', 'Pareto', 'Control charts'] },
        { title: 'Projects', lessons: ['Project selection', 'A3 thinking', 'Kaizen', 'Sustaining gains'] },
      ],
    },
    {
      id: 'course-supply-chain',
      title: 'Supply Chain Management',
      titleEn: 'Supply Chain Management',
      category: 'OPERATIONS',
      level: 'INTERMEDIATE',
      duration: 900,
      price: 249,
      description: 'Managementul lanțului de aprovizionare: procurement, logistics, inventory.',
      modules: [
        { title: 'SCM Overview', lessons: ['Supply chain design', 'Strategy', 'Integration', 'Technology'] },
        { title: 'Procurement', lessons: ['Sourcing', 'Supplier management', 'Contracts', 'Cost reduction'] },
        { title: 'Inventory', lessons: ['Inventory models', 'Safety stock', 'ABC analysis', 'Demand planning'] },
        { title: 'Logistics', lessons: ['Transportation', '3PL', 'Warehouse management', 'Last mile'] },
      ],
    },
  ],

  // MARKETING COURSES
  marketing: [
    {
      id: 'course-digital-marketing',
      title: 'Digital Marketing Fundamentals',
      titleEn: 'Digital Marketing Fundamentals',
      category: 'MARKETING',
      level: 'BEGINNER',
      duration: 600,
      price: 49,
      description: 'Marketing digital complet: SEO, SEM, Social Media, Content și Analytics.',
      modules: [
        { title: 'Digital Strategy', lessons: ['Customer journey', 'Channels', 'Budget allocation', 'Measurement'] },
        { title: 'SEO', lessons: ['Technical SEO', 'On-page', 'Off-page', 'Local SEO'] },
        { title: 'Paid Media', lessons: ['Google Ads', 'Facebook Ads', 'Retargeting', 'Attribution'] },
        { title: 'Content & Social', lessons: ['Content strategy', 'Social media', 'Email marketing', 'Influencer'] },
      ],
    },
  ],

  // SOFT SKILLS COURSES
  softSkills: [
    {
      id: 'course-communication',
      title: 'Effective Communication',
      titleEn: 'Effective Communication',
      category: 'SOFT_SKILLS',
      level: 'BEGINNER',
      duration: 360,
      price: 0,
      description: 'Comunicare eficientă în business: prezentări, negocieri, email-uri profesionale.',
      modules: [
        { title: 'Communication Basics', lessons: ['Communication model', 'Active listening', 'Non-verbal', 'Cultural awareness'] },
        { title: 'Written', lessons: ['Email etiquette', 'Reports', 'Proposals', 'Clarity'] },
        { title: 'Presentations', lessons: ['Structure', 'Storytelling', 'Slides', 'Delivery'] },
        { title: 'Difficult Situations', lessons: ['Conflict resolution', 'Negotiation basics', 'Assertiveness', 'Feedback'] },
      ],
    },
    {
      id: 'course-time-management',
      title: 'Time Management & Productivity',
      titleEn: 'Time Management & Productivity',
      category: 'SOFT_SKILLS',
      level: 'BEGINNER',
      duration: 300,
      price: 0,
      description: 'Tehnici de productivitate: prioritizare, planificare, eliminare distrageri.',
      modules: [
        { title: 'Foundations', lessons: ['Eisenhower Matrix', 'Pareto Principle', 'Time audit', 'Goals'] },
        { title: 'Techniques', lessons: ['Pomodoro', 'Time blocking', 'Batch processing', 'Deep work'] },
        { title: 'Tools', lessons: ['Calendar', 'Task managers', 'Note-taking', 'Automation'] },
        { title: 'Sustainability', lessons: ['Energy management', 'Boundaries', 'Delegation', 'Work-life balance'] },
      ],
    },
  ],

  // TECHNOLOGY COURSES
  technology: [
    {
      id: 'course-cybersecurity',
      title: 'Cybersecurity for Business',
      titleEn: 'Cybersecurity for Business',
      category: 'TECHNOLOGY',
      level: 'INTERMEDIATE',
      duration: 720,
      price: 149,
      description: 'Securitate cibernetică pentru companii: riscuri, protecție, incident response.',
      modules: [
        { title: 'Threat Landscape', lessons: ['Attack types', 'Threat actors', 'Romanian context', 'Trends'] },
        { title: 'Protection', lessons: ['Defense in depth', 'Access control', 'Encryption', 'Backup'] },
        { title: 'Human Factor', lessons: ['Security awareness', 'Phishing', 'Social engineering', 'Training'] },
        { title: 'Incident Response', lessons: ['IR plan', 'Detection', 'Containment', 'Recovery', 'Lessons learned'] },
      ],
    },
    {
      id: 'course-ai-business',
      title: 'AI for Business Leaders',
      titleEn: 'AI for Business Leaders',
      category: 'TECHNOLOGY',
      level: 'INTERMEDIATE',
      duration: 600,
      price: 199,
      description: 'Inteligență artificială pentru decidenți: oportunități, implementare, etică.',
      modules: [
        { title: 'AI Fundamentals', lessons: ['What is AI/ML', 'Types of AI', 'Current capabilities', 'Limitations'] },
        { title: 'Business Applications', lessons: ['Use cases by function', 'ROI calculation', 'Build vs Buy', 'Vendors'] },
        { title: 'Implementation', lessons: ['Data requirements', 'Team structure', 'Pilots', 'Scaling'] },
        { title: 'Governance', lessons: ['AI ethics', 'Bias', 'Transparency', 'EU AI Act'] },
      ],
    },
  ],
};

// ===== FORUM CATEGORIES & THREADS =====
export const forumData = {
  categories: [
    {
      id: 'cat-hr',
      name: 'HR & Management Personal',
      nameEn: 'HR & People Management',
      description: 'Discuții despre recrutare, contracte de muncă, salarizare și management echipe.',
      icon: 'Users',
      threadCount: 45,
      postCount: 234,
    },
    {
      id: 'cat-compliance',
      name: 'Conformitate & Fiscalitate',
      nameEn: 'Compliance & Taxation',
      description: 'Întrebări și răspunsuri despre ANAF, TVA, SAF-T, e-Factura și legislație fiscală.',
      icon: 'Shield',
      threadCount: 78,
      postCount: 456,
    },
    {
      id: 'cat-hse',
      name: 'SSM / HSE',
      nameEn: 'Health Safety Environment',
      description: 'Securitate și sănătate în muncă, evaluare riscuri, ISO 45001.',
      icon: 'HardHat',
      threadCount: 32,
      postCount: 187,
    },
    {
      id: 'cat-finance',
      name: 'Finanțe & Contabilitate',
      nameEn: 'Finance & Accounting',
      description: 'Discuții despre bugetare, raportare financiară, IFRS și RO GAAP.',
      icon: 'Calculator',
      threadCount: 56,
      postCount: 312,
    },
    {
      id: 'cat-operations',
      name: 'Operațiuni & Supply Chain',
      nameEn: 'Operations & Supply Chain',
      description: 'Logistică, procurement, managementul stocurilor și optimizare procese.',
      icon: 'Truck',
      threadCount: 28,
      postCount: 145,
    },
    {
      id: 'cat-excel',
      name: 'Excel & Automatizări',
      nameEn: 'Excel & Automation',
      description: 'Tips & tricks Excel, formule, VBA și automatizare office.',
      icon: 'Table',
      threadCount: 89,
      postCount: 567,
    },
    {
      id: 'cat-pm',
      name: 'Project Management',
      nameEn: 'Project Management',
      description: 'Metodologii PM, Agile, Scrum, PMP și tools pentru manageri de proiecte.',
      icon: 'Target',
      threadCount: 34,
      postCount: 198,
    },
    {
      id: 'cat-marketing',
      name: 'Marketing & Vânzări',
      nameEn: 'Marketing & Sales',
      description: 'Strategii marketing, digital, CRM și tehnici de vânzare.',
      icon: 'TrendingUp',
      threadCount: 41,
      postCount: 223,
    },
    {
      id: 'cat-tech',
      name: 'Tehnologie & IT',
      nameEn: 'Technology & IT',
      description: 'Software, cybersecurity, AI și transformare digitală.',
      icon: 'Laptop',
      threadCount: 52,
      postCount: 289,
    },
    {
      id: 'cat-general',
      name: 'Discuții Generale',
      nameEn: 'General Discussion',
      description: 'Subiecte diverse despre business, economie și carieră.',
      icon: 'MessageSquare',
      threadCount: 67,
      postCount: 412,
    },
  ],

  threads: [
    // HR Threads
    {
      id: 'thread-min-wage-2026',
      categoryId: 'cat-hr',
      title: 'Impact salariu minim 2026 asupra contractelor existente',
      author: 'Maria_HR_Expert',
      createdAt: '2025-12-01',
      views: 1234,
      replies: 23,
      isPinned: true,
      content: `Bună ziua tuturor,

Cu noile reglementări privind salariul minim pentru 2026 (estimat 4,050 RON brut), aș vrea să discutăm despre impactul asupra contractelor de muncă existente.

**Întrebări principale:**
1. Trebuie să facem acte adiționale pentru toți angajații cu salariu minim?
2. Care este termenul limită pentru actualizare în REVISAL?
3. Cum gestionați diferențele de salarizare pentru poziții entry-level?

Aștept experiențele voastre!`,
    },
    {
      id: 'thread-telemunca',
      categoryId: 'cat-hr',
      title: '[Ghid] Telemuncă 2025 - OUG și bune practici',
      author: 'Andrei_Consultant',
      createdAt: '2025-11-15',
      views: 2456,
      replies: 45,
      isPinned: true,
      content: `Am compilat un ghid complet despre telemuncă conform OUG 53/2023 actualizat.

**Ce trebuie să conțină acordul de telemuncă:**
- Locul/locațiile de desfășurare
- Program de lucru și disponibilitate
- Echipamente și costuri
- Securitatea datelor
- Modalități de monitorizare

**Template disponibil în resurse!**`,
    },

    // Compliance Threads
    {
      id: 'thread-saft-errors',
      categoryId: 'cat-compliance',
      title: 'Erori frecvente SAF-T D406 și cum le rezolvați',
      author: 'ContabilChef',
      createdAt: '2025-12-05',
      views: 3421,
      replies: 67,
      isPinned: true,
      content: `După 6 luni de SAF-T obligatoriu, am întâlnit multiple erori frecvente:

1. **ERR001**: NIF invalid - verificați format CUI
2. **ERR045**: Sold negativ - reconciliați înregistrările
3. **ERR078**: Date lipsă factură - verificați câmpurile obligatorii

Ce alte erori ați întâmpinat și cum le-ați rezolvat?`,
    },
    {
      id: 'thread-efactura-b2b',
      categoryId: 'cat-compliance',
      title: 'e-Factura B2B obligatorie - Timeline și pregătire',
      author: 'FiscalPro',
      createdAt: '2025-11-28',
      views: 4567,
      replies: 89,
      isPinned: false,
      content: `Reminder: e-Factura B2B devine obligatorie din mid-2026!

**Timeline:**
- Pilot: Sept 2025 - Aug 2026
- Perioadă de grație: 6 luni
- Obligatoriu complet: din 2027

**Ce trebuie pregătit:**
- Integrare sistem ERP
- Training echipă
- Teste cu partenerii

Cine a început deja pregătirea?`,
    },

    // Excel Threads
    {
      id: 'thread-xlookup-vs-vlookup',
      categoryId: 'cat-excel',
      title: 'XLOOKUP vs VLOOKUP - care, când și de ce',
      author: 'ExcelMaster',
      createdAt: '2025-12-03',
      views: 1876,
      replies: 34,
      isPinned: false,
      content: `Am observat că mulți încă folosesc VLOOKUP când XLOOKUP e mult mai flexibil.

**Avantaje XLOOKUP:**
- Căutare bidirecțională
- Nu trebuie să numărați coloane
- Error handling built-in
- Mai rapid pe date mari

Exemplu:
\`\`\`excel
=XLOOKUP(A2,Products[ID],Products[Price],"Not Found",0)
\`\`\`

Ce formule folosiți cel mai des?`,
    },

    // Finance Threads
    {
      id: 'thread-cash-flow-crisis',
      categoryId: 'cat-finance',
      title: 'Managementul cash flow în perioada de criză',
      author: 'CFO_Romania',
      createdAt: '2025-12-07',
      views: 2134,
      replies: 41,
      isPinned: false,
      content: `În contextul economic actual, cash flow-ul devine critic.

**Măsuri implementate de noi:**
1. 13-week rolling forecast
2. Termene de plată renegociate cu furnizorii
3. Accelerare încasări (discount early payment)
4. Review costurilor fix vs variabile

Ce strategii folosiți voi pentru optimizare cash?`,
    },
  ],
};

// ===== BLOG ARTICLES =====
export const blogArticles = [
  {
    id: 'blog-saft-guide',
    title: 'Ghid Complet SAF-T D406: Tot Ce Trebuie Să Știi în 2025',
    titleEn: 'Complete SAF-T D406 Guide: Everything You Need to Know in 2025',
    slug: 'ghid-complet-saft-d406-2025',
    author: 'Echipa DocumentIulia',
    publishedAt: '2025-12-01',
    category: 'Compliance',
    tags: ['SAF-T', 'ANAF', 'D406', 'Conformitate'],
    readTime: 12,
    excerpt: 'Ghid detaliat pentru raportarea SAF-T D406 conform Ordinului 1783/2021, cu exemple practice și soluții pentru erori frecvente.',
    content: `
# Ghid Complet SAF-T D406: Tot Ce Trebuie Să Știi în 2025

## Introducere

Standard Audit File for Tax (SAF-T) reprezintă un format standardizat pentru schimbul de date contabile între contribuabili și autoritățile fiscale. În România, raportarea SAF-T D406 a devenit obligatorie conform Ordinului 1783/2021.

## Ce Este SAF-T D406?

SAF-T D406 este o declarație informativă lunară care conține date detaliate despre:
- Registrul jurnal
- Balanța de verificare
- Nomenclator parteneri
- Stocuri și mișcări

## Cine Trebuie Să Raporteze?

**Contribuabili obligați:**
- Marii contribuabili - din ianuarie 2022
- Contribuabili mijlocii - din ianuarie 2023
- Contribuabili mici - din ianuarie 2025

**Excepții:**
- PFA și II
- Entități non-profit sub anumite praguri

## Structura Fișierului XML

Fișierul SAF-T D406 conține următoarele secțiuni principale:

\`\`\`xml
<AuditFile>
  <Header>...</Header>
  <MasterFiles>
    <GeneralLedgerAccounts>...</GeneralLedgerAccounts>
    <Customers>...</Customers>
    <Suppliers>...</Suppliers>
    <Products>...</Products>
  </MasterFiles>
  <GeneralLedgerEntries>...</GeneralLedgerEntries>
  <SourceDocuments>...</SourceDocuments>
</AuditFile>
\`\`\`

## Termene de Depunere

- **Termen:** ultima zi a lunii următoare perioadei de raportare
- **Exemplu:** SAF-T pentru ianuarie 2025 se depune până la 28 februarie 2025

## Validare și Transmitere

### Etape de validare:
1. **Validare locală** cu DUKIntegrator
2. **Transmitere SPV** prin Spațiul Privat Virtual
3. **Confirmare ANAF** în 24-48 ore

### Erori frecvente și soluții:

| Cod Eroare | Descriere | Soluție |
|------------|-----------|---------|
| ERR001 | NIF invalid | Verificați formatul CUI |
| ERR045 | Sold negativ | Reconciliați înregistrările |
| ERR078 | Date lipsă | Completați câmpurile obligatorii |

## Bune Practici

1. **Automatizare** - Folosiți software specializat
2. **Reconciliere lunară** - Verificați datele înainte de export
3. **Backup** - Păstrați copii ale tuturor raportărilor
4. **Training** - Instruiți echipa contabilă

## Sancțiuni

Nedepunerea sau depunerea cu erori poate atrage:
- Amendă de la 1.000 la 5.000 lei
- Verificări fiscale suplimentare

## Concluzie

SAF-T D406 este un instrument esențial pentru conformitatea fiscală. Cu pregătire adecvată și software potrivit, raportarea devine un proces simplu și automatizat.

---

**Vrei să automatizezi raportarea SAF-T?** [Încearcă DocumentIulia gratuit](/register)
    `,
  },
  {
    id: 'blog-tva-2025',
    title: 'TVA 21% și 11%: Ghid Practic pentru Legea 141/2025',
    titleEn: 'VAT 21% and 11%: Practical Guide to Law 141/2025',
    slug: 'tva-21-11-legea-141-2025',
    author: 'Maria Ionescu, Expert Fiscal',
    publishedAt: '2025-11-25',
    category: 'Fiscalitate',
    tags: ['TVA', 'Legea 141/2025', 'ANAF', 'Taxe'],
    readTime: 8,
    excerpt: 'Tot ce trebuie să știți despre noile cote TVA din 2025: 21% standard și 11% redusă pentru alimente și medicamente.',
    content: `
# TVA 21% și 11%: Ghid Practic pentru Legea 141/2025

## Modificările Aduse de Legea 141/2025

Începând cu 1 ianuarie 2025, România aplică noi cote TVA conform Legii 141/2025:

- **Cota standard: 21%** (anterior 19%)
- **Cota redusă: 11%** (anterior 9%)
- **Cota super-redusă: 5%** (fără modificări)

## Produse și Servicii cu TVA 11%

### Alimente de bază:
- Pâine și produse de panificație
- Lapte și produse lactate
- Carne și preparate din carne
- Legume și fructe proaspete

### Alte categorii:
- Medicamente pentru uz uman
- Echipamente medicale
- Cărți și reviste (print)
- Servicii de cazare

## Produse cu TVA 5%

- Locuințe noi (anumite condiții)
- Energie termică
- Proteze și echipamente pentru persoane cu dizabilități

## Impactul asupra Afacerilor

### Prețuri:
Majorarea TVA de la 19% la 21% înseamnă o creștere de ~1.7% a prețurilor finale pentru consumatori.

### Cash Flow:
- TVA colectat mai mare
- TVA deductibil mai mare pentru achiziții
- Efect neutru pentru plătitorii de TVA

### Sisteme informatice:
Verificați că ERP-ul aplică corect noile cote!

## Calendar de Implementare

| Data | Acțiune |
|------|---------|
| 01.01.2025 | Intrare în vigoare |
| 31.01.2025 | Prima declarație cu noile cote |
| 28.02.2025 | SAF-T cu date actualizate |

## Recomandări Practice

1. **Actualizați software-ul** contabil și de facturare
2. **Revizuiți contractele** cu prețuri fixe
3. **Comunicați clienților** modificările de prețuri
4. **Instruiți echipa** despre noile cote

## FAQ

**Q: Ce fac cu facturile emise în decembrie pentru livrări în ianuarie?**
A: Se aplică cota valabilă la data livrării (TVA 21%).

**Q: Avansurile primite în 2024 cum se tratează?**
A: Se regularizează la cota nouă la facturare finală.

---

**DocumentIulia calculează automat TVA-ul corect.** [Începe gratuit](/register)
    `,
  },
  {
    id: 'blog-hr-digital',
    title: 'Transformarea Digitală în HR: De la REVISAL la People Analytics',
    titleEn: 'Digital Transformation in HR: From REVISAL to People Analytics',
    slug: 'transformare-digitala-hr-2025',
    author: 'Andrei Popescu, HR Consultant',
    publishedAt: '2025-11-20',
    category: 'HR',
    tags: ['HR', 'Digitalizare', 'REVISAL', 'People Analytics'],
    readTime: 10,
    excerpt: 'Cum să modernizezi departamentul HR: de la obligațiile legale la analytics avansat pentru decizii strategice.',
    content: `
# Transformarea Digitală în HR: De la REVISAL la People Analytics

## Starea Actuală a HR-ului în România

Multe companii românești încă gestionează HR-ul cu:
- Excel-uri multiple și neintegrate
- Procese manuale de pontaj
- Dosare fizice ale angajaților
- REVISAL actualizat reactiv

## Piramida Maturității HR Digital

### Nivel 1: Compliance (Obligatoriu)
- REVISAL
- Contracte de muncă
- Pontaj basic
- Declarații fiscale

### Nivel 2: Eficiență (Operațional)
- Self-service angajați
- Workflow aprobări
- Pontaj electronic
- Rapoarte automate

### Nivel 3: Strategic (Analytics)
- Predictive analytics
- Engagement surveys
- Succession planning
- Total rewards optimization

## Beneficii Cuantificabile

| Proces | Manual | Digital | Economie |
|--------|--------|---------|----------|
| Onboarding | 8 ore | 2 ore | 75% |
| Raportare lunară | 16 ore | 1 oră | 94% |
| Cereri concediu | 3 zile | 5 min | 99% |

## Roadmap de Implementare

### Faza 1 (0-3 luni): Fundament
1. Audit procese existente
2. Selectare soluție HRIS
3. Migrare date
4. Training echipă

### Faza 2 (3-6 luni): Automatizare
1. Self-service portal
2. Workflow digital
3. Integrare payroll
4. Mobile app

### Faza 3 (6-12 luni): Analytics
1. KPI dashboards
2. Turnover prediction
3. Engagement tracking
4. Compensation analytics

## Case Study: TechInnov Solutions

**Situație inițială:**
- 65 angajați
- HR manual cu Excel
- 2 FTE pentru administrare

**După implementare:**
- HRIS integrat
- 0.5 FTE administrare
- NPS angajați: +25 puncte

## Concluzie

Transformarea digitală în HR nu mai este opțională. Începeți cu compliance-ul, automatizați operațiunile și evoluați spre analytics.

---

**DocumentIulia integrează HR cu finance.** [Descoperă modulul HR](/features)
    `,
  },
  {
    id: 'blog-excel-pivot',
    title: '10 Trucuri Excel Pivot Tables pentru Analiză Financiară',
    titleEn: '10 Excel Pivot Table Tricks for Financial Analysis',
    slug: 'trucuri-excel-pivot-tables-finante',
    author: 'Elena Marinescu, Financial Analyst',
    publishedAt: '2025-11-15',
    category: 'Excel',
    tags: ['Excel', 'Pivot Tables', 'Analiză Financiară', 'Tutorial'],
    readTime: 15,
    excerpt: 'Tehnici avansate de Pivot Tables pentru rapoarte financiare: calculated fields, slicers, timeline și automatizare.',
    content: `
# 10 Trucuri Excel Pivot Tables pentru Analiză Financiară

## De ce Pivot Tables?

Pivot Tables sunt instrumentul cel mai puternic din Excel pentru analiză ad-hoc. Pentru finanțiști, ele permit:
- Analiză multi-dimensională instantanee
- Drill-down în detalii
- Rapoarte dinamice
- Zero formule manuale

## Truc #1: Calculated Fields pentru KPIs

\`\`\`excel
=Revenue-COGS  // Gross Profit
=Profit/Revenue  // Margin %
\`\`\`

**Pași:**
1. Click în Pivot
2. PivotTable Analyze → Fields, Items & Sets → Calculated Field
3. Introduceți formula

## Truc #2: Show Values As pentru Analiză Comparativă

Opțiuni utile:
- **% of Parent Row** - Structura cheltuielilor
- **Difference From** - Variance vs buget
- **% Running Total** - Cumul YTD

## Truc #3: Grupare Date pentru Perioade

Grupați automat datele în:
- Ani / Trimestre / Luni
- Custom intervals

Click dreapta pe câmp dată → Group → selectați opțiuni.

## Truc #4: Slicers pentru Dashboards Interactive

\`\`\`
PivotTable Analyze → Insert Slicer
\`\`\`

Conectați mai multe Pivots la același Slicer:
1. Click dreapta Slicer
2. Report Connections
3. Selectați toate Pivot-urile

## Truc #5: Timeline pentru Filtrare Temporală

Mai intuitiv decât Slicer pentru date:
- Slide pentru interval
- Zoom in/out (zi/lună/trimestru/an)

## Truc #6: GetPivotData pentru Rapoarte

Formula magică pentru a extrage valori din Pivot:

\`\`\`excel
=GETPIVOTDATA("Revenue",A3,"Year",2025,"Region","Nord")
\`\`\`

**Tip:** Dezactivați dacă vă încurcă: File → Options → Formulas → Uncheck "Use GetPivotData"

## Truc #7: Refresh Automat la Deschidere

1. Click dreapta pe Pivot
2. PivotTable Options → Data
3. Check "Refresh data when opening the file"

## Truc #8: Conditional Formatting în Pivot

Aplicați formatare condiționată care se păstrează la refresh:
- Data bars pentru volume
- Color scales pentru performanță
- Icon sets pentru status

## Truc #9: Power Pivot pentru Date Mari

Când datele depășesc 1 milion rânduri:
1. Încărcați în Data Model
2. Creați relații între tabele
3. Folosiți DAX pentru măsuri complexe

## Truc #10: Pivot Charts Dinamice

Cele mai bune tipuri pentru finance:
- Waterfall pentru bridge analysis
- Combo pentru revenue vs margin
- Small multiples pentru comparații

## Template Descărcabil

Am creat un template Excel cu toate aceste tehnici aplicate pentru:
- P&L Analysis
- Budget vs Actual
- Cash Flow Dashboard

[Download Template](#) (link demo)

---

**Vrei analiză financiară automată?** [Încearcă dashboard-urile DocumentIulia](/demo)
    `,
  },
  {
    id: 'blog-cybersecurity-sme',
    title: 'Cybersecurity pentru IMM-uri: Ghid Practic 2025',
    titleEn: 'Cybersecurity for SMEs: Practical Guide 2025',
    slug: 'cybersecurity-imm-ghid-2025',
    author: 'Radu Mihai, IT Security Expert',
    publishedAt: '2025-11-10',
    category: 'Tehnologie',
    tags: ['Cybersecurity', 'IMM', 'Securitate', 'GDPR'],
    readTime: 12,
    excerpt: 'Protejați-vă afacerea de atacuri cibernetice: măsuri esențiale, low-cost, pentru IMM-uri românești.',
    content: `
# Cybersecurity pentru IMM-uri: Ghid Practic 2025

## De Ce Contează pentru IMM-uri?

**Statistici îngrijorătoare:**
- 43% din atacuri vizează IMM-uri
- 60% din IMM-uri atacate falimentează în 6 luni
- Cost mediu incident: 50,000 EUR

## Top 5 Amenințări pentru IMM-uri

### 1. Phishing (85% din atacuri)
Email-uri false care par de la bănci, ANAF, furnizori.

### 2. Ransomware
Criptare date cu cerere de răscumpărare.

### 3. Business Email Compromise (BEC)
Impersonare CEO/CFO pentru transferuri frauduloase.

### 4. Atacuri asupra lanțului de aprovizionare
Compromise prin furnizori/parteneri.

### 5. Insider threats
Angajați nemulțumiți sau neglijenți.

## Checklist Securitate de Bază

### Imediat (0 cost):
- [ ] Activați 2FA pe toate conturile
- [ ] Parole unice și complexe (folosiți password manager)
- [ ] Training basic echipă (phishing awareness)
- [ ] Backup 3-2-1 (3 copii, 2 medii, 1 offsite)

### Luna 1 (cost minim):
- [ ] Antivirus/EDR pe toate dispozitivele
- [ ] Firewall configurat corect
- [ ] Update-uri automate activate
- [ ] Politică BYOD

### Trimestrul 1:
- [ ] Audit de securitate
- [ ] Plan de răspuns la incidente
- [ ] Asigurare cyber
- [ ] Segregarea rețelei

## Securitate Cloud (Office 365 / Google Workspace)

Setări esențiale:
1. **Conditional Access** - acces doar de pe dispozitive trusted
2. **DLP policies** - prevenire scurgeri date
3. **Audit logs** - monitorizare activitate
4. **Backup terț** - Office 365 NU face backup automat!

## Conformitate GDPR & NIS2

### GDPR (toate companiile):
- Inventar date personale
- Măsuri tehnice proporționale
- Breach notification < 72h

### NIS2 (companii esențiale/importante):
- Evaluare risc formalizată
- Raportare incidente
- Audituri de securitate

## ROI Investiții Securitate

| Măsură | Cost/an | Risc evitat |
|--------|---------|-------------|
| Password manager | 50 EUR/user | Compromitere conturi |
| Backup cloud | 500 EUR | Pierdere date |
| Training awareness | 1,000 EUR | 70% din atacuri |
| EDR/Antivirus | 30 EUR/device | Malware |

## Plan de Acțiune Recomandat

**Săptămâna 1:** 2FA + backup
**Luna 1:** Training + antivirus
**Trimestrul 1:** Audit + plan incident
**Anul 1:** Certificare ISO 27001 (opțional)

---

**DocumentIulia este securizat conform ISO 27001.** [Află mai multe](/security)
    `,
  },
];

// ===== EMPLOYEES DATA FOR DEMO BUSINESSES =====
export const employeeTemplates = {
  departments: ['Management', 'Finance', 'HR', 'IT', 'Operations', 'Sales', 'Marketing', 'Logistics', 'Production', 'Quality'],
  positions: {
    Management: ['CEO', 'COO', 'CFO', 'CTO', 'Director General', 'Director Executiv'],
    Finance: ['Contabil Șef', 'Contabil', 'Analist Financiar', 'Controller', 'Casier'],
    HR: ['HR Manager', 'HR Specialist', 'Recruiter', 'Training Manager', 'Payroll Specialist'],
    IT: ['IT Manager', 'Software Developer', 'System Administrator', 'DevOps Engineer', 'Support Specialist'],
    Operations: ['Operations Manager', 'Process Engineer', 'Quality Engineer', 'Planner', 'Coordinator'],
    Sales: ['Sales Manager', 'Account Manager', 'Sales Representative', 'Business Development'],
    Marketing: ['Marketing Manager', 'Digital Marketing Specialist', 'Content Creator', 'Brand Manager'],
    Logistics: ['Logistics Manager', 'Warehouse Manager', 'Dispatcher', 'Driver', 'Inventory Specialist'],
    Production: ['Production Manager', 'Shift Leader', 'Operator', 'Technician', 'Maintenance'],
    Quality: ['Quality Manager', 'Quality Inspector', 'Laboratory Technician', 'Auditor'],
  },
  salaryRanges: {
    CEO: [25000, 50000],
    CFO: [18000, 35000],
    CTO: [18000, 35000],
    COO: [18000, 35000],
    'Director General': [15000, 30000],
    Manager: [8000, 15000],
    Specialist: [5000, 9000],
    Coordinator: [5500, 8500],
    Engineer: [6000, 12000],
    Analyst: [5500, 10000],
    Representative: [4000, 7000],
    Operator: [3500, 5000],
    Driver: [4000, 6000],
    Default: [3500, 6000],
  },
};

// ===== HSE DATA =====
export const hseData = {
  hazardCategories: [
    { code: 'PHYS', name: 'Pericole Fizice', description: 'Zgomot, vibrații, radiații, temperaturi extreme' },
    { code: 'CHEM', name: 'Pericole Chimice', description: 'Substanțe toxice, corozive, inflamabile' },
    { code: 'BIO', name: 'Pericole Biologice', description: 'Bacterii, viruși, ciuperci, paraziți' },
    { code: 'ERGO', name: 'Pericole Ergonomice', description: 'Poziții forțate, mișcări repetitive, efort fizic' },
    { code: 'PSYCH', name: 'Pericole Psihosociale', description: 'Stres, hărțuire, burnout' },
    { code: 'MECH', name: 'Pericole Mecanice', description: 'Echipamente, mașini, căderi de obiecte' },
    { code: 'ELEC', name: 'Pericole Electrice', description: 'Electrocutare, arc electric' },
    { code: 'FIRE', name: 'Pericole de Incendiu', description: 'Surse de aprindere, materiale inflamabile' },
  ],
  incidentTypes: ['Accident de muncă', 'Incident minor', 'Near miss', 'Boală profesională', 'Avarie echipament'],
  severityLevels: ['Minor', 'Moderat', 'Major', 'Critic'],
  trainings: [
    { code: 'SSM-GEN', name: 'SSM General', duration: 8, validity: 12 },
    { code: 'SSM-LOC', name: 'SSM la locul de muncă', duration: 4, validity: 6 },
    { code: 'PSI', name: 'Prevenire și stingere incendii', duration: 4, validity: 12 },
    { code: 'PRIM-AJ', name: 'Prim ajutor', duration: 8, validity: 24 },
    { code: 'LUCRU-INAL', name: 'Lucru la înălțime', duration: 16, validity: 12 },
    { code: 'STIVUITOR', name: 'Autorizare stivuitor', duration: 40, validity: 24 },
    { code: 'CHIMICE', name: 'Manipulare substanțe chimice', duration: 8, validity: 12 },
  ],
};

// ===== LOGISTICS DATA =====
export const logisticsData = {
  transportModes: ['Road', 'Rail', 'Sea', 'Air', 'Multimodal'],
  vehicleTypes: ['Van', 'Truck 3.5t', 'Truck 7.5t', 'Truck 12t', 'TIR', 'Refrigerated'],
  warehouseZones: ['Receiving', 'Storage', 'Picking', 'Packing', 'Shipping', 'Returns', 'Cold Storage'],
  carriers: [
    { name: 'FAN Courier', type: 'Express', coverage: 'Romania' },
    { name: 'Cargus', type: 'Express', coverage: 'Romania' },
    { name: 'DHL', type: 'International', coverage: 'Global' },
    { name: 'UPS', type: 'International', coverage: 'Global' },
    { name: 'Raben', type: 'Pallets', coverage: 'Europe' },
  ],
};

// ===== ADDITIONAL COURSES TO REACH 50+ =====
export const additionalCourses = {
  // DATA ANALYTICS COURSES
  dataAnalytics: [
    {
      id: 'course-sql-fundamentals',
      title: 'SQL pentru Analiști',
      titleEn: 'SQL for Analysts',
      category: 'DATA_ANALYTICS',
      level: 'BEGINNER',
      duration: 600,
      price: 99,
      description: 'Bazele SQL pentru interogare și analiză date: SELECT, JOIN, GROUP BY, subqueries.',
      modules: [
        { title: 'Introducere SQL', lessons: ['Ce este SQL', 'Tipuri de baze de date', 'Instalare mediu', 'Prima interogare'] },
        { title: 'SELECT & Filtrare', lessons: ['SELECT basic', 'WHERE', 'ORDER BY', 'LIMIT/OFFSET'] },
        { title: 'Agregări', lessons: ['COUNT, SUM, AVG', 'GROUP BY', 'HAVING', 'Window functions intro'] },
        { title: 'JOIN-uri', lessons: ['INNER JOIN', 'LEFT/RIGHT JOIN', 'Self JOIN', 'Multiple tables'] },
      ],
    },
    {
      id: 'course-power-bi',
      title: 'Power BI pentru Business Intelligence',
      titleEn: 'Power BI for Business Intelligence',
      category: 'DATA_ANALYTICS',
      level: 'INTERMEDIATE',
      duration: 900,
      price: 199,
      description: 'Vizualizare date și dashboards cu Microsoft Power BI: conectare, modelare, DAX.',
      modules: [
        { title: 'Power BI Desktop', lessons: ['Interfață', 'Conectare date', 'Query Editor', 'Transformări'] },
        { title: 'Modelare Date', lessons: ['Relații', 'Schema stea', 'Măsuri vs Coloane', 'Calculated tables'] },
        { title: 'Vizualizări', lessons: ['Tipuri vizualizări', 'Formatare', 'Interactivitate', 'Custom visuals'] },
        { title: 'DAX Avansat', lessons: ['Funcții DAX', 'Time intelligence', 'Context', 'Best practices'] },
        { title: 'Publicare', lessons: ['Power BI Service', 'Workspaces', 'RLS', 'Refresh programat'] },
      ],
    },
    {
      id: 'course-python-data',
      title: 'Python pentru Analiză Date',
      titleEn: 'Python for Data Analysis',
      category: 'DATA_ANALYTICS',
      level: 'INTERMEDIATE',
      duration: 1200,
      price: 249,
      description: 'Analiză date cu Python: pandas, numpy, matplotlib, jupyter notebooks.',
      modules: [
        { title: 'Python Basics', lessons: ['Variabile și tipuri', 'Structuri date', 'Funcții', 'OOP basics'] },
        { title: 'Pandas', lessons: ['DataFrames', 'Citire/scriere', 'Filtrare/selecție', 'Merge/Join'] },
        { title: 'Vizualizare', lessons: ['Matplotlib', 'Seaborn', 'Plotly', 'Dashboards'] },
        { title: 'Analiză Avansată', lessons: ['Statistici descriptive', 'Corelații', 'Time series', 'ML intro'] },
      ],
    },
  ],

  // E-COMMERCE COURSES
  ecommerce: [
    {
      id: 'course-ecommerce-basics',
      title: 'E-commerce de la Zero',
      titleEn: 'E-commerce from Scratch',
      category: 'E_COMMERCE',
      level: 'BEGINNER',
      duration: 480,
      price: 49,
      description: 'Lansarea și gestionarea unui magazin online: platforme, produse, plăți, livrare.',
      modules: [
        { title: 'Strategie E-commerce', lessons: ['Model de afaceri', 'Nișă și produse', 'Competiție', 'Business plan'] },
        { title: 'Platforme', lessons: ['WooCommerce', 'Shopify', 'Comparație', 'Alegere platformă'] },
        { title: 'Setup Magazin', lessons: ['Configurare', 'Produse', 'Categorii', 'Checkout'] },
        { title: 'Operațiuni', lessons: ['Plăți', 'Livrare', 'Customer service', 'Retururi'] },
      ],
    },
    {
      id: 'course-marketplace-selling',
      title: 'Vânzare pe Marketplace-uri',
      titleEn: 'Selling on Marketplaces',
      category: 'E_COMMERCE',
      level: 'INTERMEDIATE',
      duration: 600,
      price: 149,
      description: 'Strategii pentru eMAG, Amazon, eBay: listing optimization, pricing, fulfillment.',
      modules: [
        { title: 'Marketplace Overview', lessons: ['eMAG Marketplace', 'Amazon', 'eBay', 'Comparație'] },
        { title: 'Listing Optimization', lessons: ['Titluri', 'Descrieri', 'Imagini', 'SEO intern'] },
        { title: 'Pricing & Buy Box', lessons: ['Strategie preț', 'Buy Box Amazon', 'Promotions', 'Competitor monitoring'] },
        { title: 'Fulfillment', lessons: ['FBM vs FBA', 'eMAG Fulfillment', 'Multi-channel', 'Returns'] },
      ],
    },
  ],

  // FREELANCER & ENTREPRENEUR COURSES
  freelancer: [
    {
      id: 'course-freelance-start',
      title: 'Freelancer în România: Ghid Complet',
      titleEn: 'Freelancing in Romania: Complete Guide',
      category: 'FREELANCER',
      level: 'BEGINNER',
      duration: 480,
      price: 0,
      description: 'Tot ce trebuie să știi pentru a începe ca freelancer: PFA, II, taxe, clienți.',
      modules: [
        { title: 'Alegere Formă Juridică', lessons: ['PFA vs II vs SRL', 'Avantaje/dezavantaje', 'Costuri', 'Când să treci la SRL'] },
        { title: 'Înregistrare & Fiscalitate', lessons: ['Înregistrare ONRC', 'ANAF', 'Impozit venit 10%', 'CAS/CASS'] },
        { title: 'Găsire Clienți', lessons: ['Upwork/Freelancer', 'LinkedIn', 'Networking', 'Portfolio'] },
        { title: 'Contractare & Facturare', lessons: ['Contract prestări servicii', 'Facturare', 'Încasări', 'e-Factura'] },
      ],
    },
    {
      id: 'course-startup-basics',
      title: 'De la Idee la Startup',
      titleEn: 'From Idea to Startup',
      category: 'FREELANCER',
      level: 'INTERMEDIATE',
      duration: 720,
      price: 149,
      description: 'Lansarea unui startup: validare, MVP, finanțare, scale-up.',
      modules: [
        { title: 'Validare Idee', lessons: ['Problem-solution fit', 'Customer discovery', 'MVP definition', 'Lean canvas'] },
        { title: 'Construcție MVP', lessons: ['No-code tools', 'Tech stack', 'Iterații', 'Metrics'] },
        { title: 'Finanțare', lessons: ['Bootstrapping', 'Angel investors', 'VC', 'Start-Up Nation/PNRR'] },
        { title: 'Scale-up', lessons: ['Product-market fit', 'Hiring', 'Operations', 'Internationalizare'] },
      ],
    },
  ],

  // LEGAL & CONTRACTS COURSES
  legal: [
    {
      id: 'course-business-contracts',
      title: 'Contracte Comerciale Esențiale',
      titleEn: 'Essential Business Contracts',
      category: 'LEGAL',
      level: 'INTERMEDIATE',
      duration: 600,
      price: 149,
      description: 'Înțelegerea și negocierea contractelor comerciale: vânzare, servicii, NDA.',
      modules: [
        { title: 'Drept Contractual', lessons: ['Principii', 'Elemente esențiale', 'Vicii de consimțământ', 'Nulitate'] },
        { title: 'Contracte Vânzare', lessons: ['B2B', 'Condiții livrare', 'Garanții', 'Clauze speciale'] },
        { title: 'Contracte Servicii', lessons: ['Prestări servicii', 'SLA', 'Răspundere', 'Terminare'] },
        { title: 'Contracte Speciale', lessons: ['NDA', 'Non-compete', 'Franchise', 'Joint venture'] },
      ],
    },
  ],

  // CUSTOMER SERVICE COURSES
  customerService: [
    {
      id: 'course-customer-service-excellence',
      title: 'Customer Service Excellence',
      titleEn: 'Customer Service Excellence',
      category: 'SOFT_SKILLS',
      level: 'BEGINNER',
      duration: 360,
      price: 49,
      description: 'Tehnici de customer service de înaltă performanță: comunicare, rezolvare reclamații.',
      modules: [
        { title: 'Fundamente CS', lessons: ['Importanța CS', 'Customer journey', 'Touchpoints', 'Metrics'] },
        { title: 'Comunicare', lessons: ['Active listening', 'Empatie', 'Ton și limbaj', 'Channels'] },
        { title: 'Handling Complaints', lessons: ['Process complaints', 'De-escalare', 'Soluții', 'Follow-up'] },
        { title: 'Excellence', lessons: ['Exceed expectations', 'Personalizare', 'Feedback loop', 'NPS'] },
      ],
    },
  ],

  // QUALITY MANAGEMENT COURSES
  quality: [
    {
      id: 'course-iso-9001',
      title: 'ISO 9001:2015 Implementation',
      titleEn: 'ISO 9001:2015 Implementation',
      category: 'COMPLIANCE',
      level: 'INTERMEDIATE',
      duration: 900,
      price: 249,
      description: 'Implementare sistem de management al calității conform ISO 9001:2015.',
      modules: [
        { title: 'ISO 9001 Overview', lessons: ['Structura HLS', 'Principii calitate', 'Context organizație', 'Părți interesate'] },
        { title: 'Documentare', lessons: ['Politica calității', 'Procese', 'Proceduri', 'Înregistrări'] },
        { title: 'Implementare', lessons: ['Gap analysis', 'Action plan', 'Training', 'Pilotare'] },
        { title: 'Audit & Certificare', lessons: ['Audit intern', 'Management review', 'Pre-audit', 'Certificare'] },
      ],
    },
  ],

  // ENERGY & SUSTAINABILITY COURSES
  sustainability: [
    {
      id: 'course-energy-management',
      title: 'Managementul Energiei în Companii',
      titleEn: 'Corporate Energy Management',
      category: 'OPERATIONS',
      level: 'INTERMEDIATE',
      duration: 600,
      price: 149,
      description: 'Eficiență energetică, audit energetic, ISO 50001 și surse regenerabile.',
      modules: [
        { title: 'Audit Energetic', lessons: ['Tipuri audit', 'Colectare date', 'Analiză consum', 'Raport'] },
        { title: 'Eficiență', lessons: ['Iluminat', 'HVAC', 'Motoare', 'Compresoare'] },
        { title: 'Surse Regenerabile', lessons: ['Solar PV', 'Eolian', 'Prosumer', 'PPA'] },
        { title: 'ISO 50001', lessons: ['Cerințe', 'EnMS', 'EnPIs', 'Îmbunătățire continuă'] },
      ],
    },
    {
      id: 'course-esg-reporting',
      title: 'Raportare ESG & Sustainability',
      titleEn: 'ESG & Sustainability Reporting',
      category: 'COMPLIANCE',
      level: 'ADVANCED',
      duration: 720,
      price: 199,
      description: 'Framework-uri de raportare ESG: CSRD, GRI, SASB, TCFD pentru conformitate EU.',
      modules: [
        { title: 'Cadru ESG', lessons: ['Ce este ESG', 'CSRD/ESRS', 'Timeline obligații', 'Materiality'] },
        { title: 'Environmental', lessons: ['Carbon footprint', 'Scope 1/2/3', 'Net zero', 'Circular economy'] },
        { title: 'Social & Governance', lessons: ['Human rights', 'DEI', 'Board composition', 'Ethics'] },
        { title: 'Raportare', lessons: ['GRI Standards', 'SASB', 'TCFD', 'Integrated reporting'] },
      ],
    },
  ],
};

// ===== ADDITIONAL BLOG ARTICLES =====
export const additionalBlogArticles = [
  {
    id: 'blog-efactura-implementation',
    title: 'Implementare e-Factura SPV: Pași Practici pentru Companii',
    titleEn: 'e-Invoice SPV Implementation: Practical Steps for Companies',
    slug: 'implementare-efactura-spv-pasi-practici',
    author: 'Echipa DocumentIulia',
    publishedAt: '2025-12-05',
    category: 'Compliance',
    tags: ['e-Factura', 'SPV', 'ANAF', 'UBL'],
    readTime: 10,
    excerpt: 'Ghid pas cu pas pentru implementarea e-Factura: de la configurare SPV la transmitere automată.',
    content: `
# Implementare e-Factura SPV: Pași Practici pentru Companii

## Ce Este e-Factura?

e-Factura este sistemul național de facturare electronică obligatorie, gestionat prin Spațiul Privat Virtual (SPV) al ANAF. Formatul utilizat este UBL 2.1 (Universal Business Language).

## Timeline Obligații

| Data | Obligație |
|------|-----------|
| 01.01.2024 | B2G obligatoriu |
| 01.07.2025 | B2B pilot |
| 01.01.2026 | B2B obligatoriu |

## Pașii de Implementare

### Pasul 1: Obținere Certificat Digital
- Achiziționați certificat calificat de la furnizor autorizat
- Tipuri: pe token USB sau cloud

### Pasul 2: Configurare SPV
1. Accesați [anaf.ro](https://www.anaf.ro)
2. Autentificare cu certificat
3. Activați modulul e-Factura
4. Setați delegări (dacă e cazul)

### Pasul 3: Integrare ERP
Opțiuni:
- Export manual XML din ERP → upload SPV
- Integrare API directă
- Soluție intermediară (DocumentIulia)

### Pasul 4: Testare
- Mediu de test ANAF
- Validare cu clienți pilot
- Verificare procesare răspunsuri

### Pasul 5: Go-Live
- Monitorizare transmisii
- Proces pentru erori
- Training utilizatori

## Erori Comune și Soluții

**ERR-001: Certificat invalid**
→ Verificați expirare, reinstalați dacă e necesar

**ERR-045: Format XML invalid**
→ Validați cu DUKIntegrator înainte de transmitere

**ERR-100: CIF beneficiar invalid**
→ Verificați în registrul ANAF

## Best Practices

1. **Automatizare completă** - evitați procesare manuală
2. **Monitorizare proactivă** - verificați status zilnic
3. **Arhivare** - păstrați toate XML-urile 10 ani
4. **Backup** - duplicare în cloud

---

**DocumentIulia automatizează e-Factura complet.** [Începe acum](/register)
    `,
  },
  {
    id: 'blog-revisal-changes-2025',
    title: 'Modificări REVISAL 2025: Ce Trebuie Să Știe Fiecare HR',
    titleEn: 'REVISAL Changes 2025: What Every HR Needs to Know',
    slug: 'modificari-revisal-2025-hr',
    author: 'Maria Ionescu, HR Expert',
    publishedAt: '2025-11-30',
    category: 'HR',
    tags: ['REVISAL', 'ITM', 'Codul Muncii', 'HR'],
    readTime: 8,
    excerpt: 'Toate modificările REVISAL din 2025: termene, sancțiuni, noi câmpuri obligatorii.',
    content: `
# Modificări REVISAL 2025: Ce Trebuie Să Știe Fiecare HR

## Context

REVISAL (Registrul General de Evidență a Salariaților) a suferit modificări importante în 2025, cu focus pe digitalizare și conformitate sporită.

## Principalele Modificări

### 1. Termene Mai Stricte

| Eveniment | Termen Vechi | Termen Nou |
|-----------|--------------|------------|
| Angajare | 1 zi înainte | 1 zi înainte |
| Modificare salariu | 20 zile | 5 zile |
| Suspendare | 20 zile | 3 zile |
| Încetare | 20 zile | 5 zile |

### 2. Câmpuri Noi Obligatorii

- **Cod COR actualizat** - conform nomenclatorului 2024
- **Tip contract** - categorii extinse
- **Telemuncă** - indicator explicit
- **Sporuri** - detaliere pe tipuri

### 3. Sancțiuni Majorate

- Prima abatere: 2.000 - 5.000 RON
- Abateri repetate: 5.000 - 10.000 RON
- Muncă nedeclarată: 20.000 RON/persoană

## Checklist Conformitate

- [ ] Software REVISAL actualizat la ultima versiune
- [ ] Coduri COR actualizate pentru toți angajații
- [ ] Indicator telemuncă completat
- [ ] Sporuri detaliate
- [ ] Procedură internă pentru termene

## Recomandări

1. **Automatizare** - conectați HRIS cu REVISAL
2. **Alerte** - setați notificări pentru termene
3. **Audit** - verificare lunară a conformității
4. **Training** - instruiți echipa HR

---

**DocumentIulia se integrează cu REVISAL.** [Află mai multe](/hr)
    `,
  },
  {
    id: 'blog-pnrr-opportunities',
    title: 'Fonduri PNRR 2025: Oportunități pentru Digitalizare IMM',
    titleEn: 'PNRR Funds 2025: Digitalization Opportunities for SMEs',
    slug: 'fonduri-pnrr-2025-digitalizare-imm',
    author: 'Andrei Popescu, Consultant Fonduri',
    publishedAt: '2025-11-25',
    category: 'Fonduri',
    tags: ['PNRR', 'Fonduri Europene', 'Digitalizare', 'IMM'],
    readTime: 15,
    excerpt: 'Ghid complet pentru accesarea fondurilor PNRR destinate digitalizării: eligibilitate, cheltuieli, aplicare.',
    content: `
# Fonduri PNRR 2025: Oportunități pentru Digitalizare IMM

## Context PNRR România

Planul Național de Redresare și Reziliență (PNRR) alocă **€21.6 miliarde** pentru România, din care o parte semnificativă pentru digitalizarea IMM-urilor.

## Componenta C7: Transformare Digitală

### Budget Total: €450 milioane

### Tipuri de Intervenții:
1. **Digitalizare IMM** - granturi pentru software, hardware, ecommerce
2. **Hub-uri digitale** - centre de competențe regionale
3. **Competențe digitale** - training angajați

## Eligibilitate IMM-uri

### Criterii de bază:
- Înregistrate în România
- Minim 1 an de activitate
- Minim 1 angajat
- Cifră de afaceri > 50.000 EUR

### Criterii excludere:
- Datorii la buget
- Insolvență/faliment
- Sancțiuni anterioare fonduri UE

## Cheltuieli Eligibile

| Categorie | Intensitate | Exemplu |
|-----------|-------------|---------|
| Software | 50-70% | ERP, CRM, ecommerce |
| Hardware | 50% | Servere, echipamente |
| Cloud | 70% | SaaS, IaaS |
| Training | 70% | Cursuri digitale |
| Consultanță | 50% | Implementare |

## Valori Granturi

- **Micro**: 10.000 - 50.000 EUR
- **Mici**: 50.000 - 100.000 EUR
- **Mijlocii**: 100.000 - 250.000 EUR

## Calendar 2025

| Luna | Activitate |
|------|------------|
| Ianuarie | Publicare ghid |
| Februarie | Deschidere aplicații |
| Martie-Mai | Evaluare |
| Iunie | Contractare |
| Q3-Q4 | Implementare |

## Pași Aplicare

### 1. Pregătire
- Elaborare plan digitalizare
- Identificare soluții
- Oferte furnizori

### 2. Depunere
- Completare formular online
- Încărcare documente
- Declarații pe proprie răspundere

### 3. Evaluare
- Verificare eligibilitate
- Scoring tehnic/financiar
- Vizită la fața locului (opțional)

### 4. Contractare
- Semnare contract finanțare
- Garanții de implementare

### 5. Implementare
- Achiziții
- Monitorizare
- Raportări

## Tips pentru Succes

1. **Aplică devreme** - fonduri limitate
2. **Proiect coerent** - digitalizare completă, nu punctuală
3. **Parteneri solizi** - furnizori cu experiență
4. **Documentație completă** - evită respingeri tehnice
5. **Capacitate implementare** - resurse interne dedicate

---

**DocumentIulia este eligibil pentru finanțare PNRR.** [Solicită ofertă](/contact)
    `,
  },
  {
    id: 'blog-remote-work-tools',
    title: 'Top 10 Tools pentru Munca Remote în 2025',
    titleEn: 'Top 10 Remote Work Tools in 2025',
    slug: 'top-10-tools-munca-remote-2025',
    author: 'Radu Mihai, Tech Expert',
    publishedAt: '2025-11-20',
    category: 'Tehnologie',
    tags: ['Remote Work', 'Productivitate', 'Tools', 'Colaborare'],
    readTime: 8,
    excerpt: 'Cele mai bune instrumente pentru echipe remote: comunicare, project management, productivitate.',
    content: `
# Top 10 Tools pentru Munca Remote în 2025

## De Ce Contează Tools-urile Potrivite?

Echipele remote performante au nevoie de:
- Comunicare asincronă eficientă
- Colaborare în timp real
- Vizibilitate asupra progresului
- Security adecvată

## Top 10 Tools

### 1. Slack (sau Microsoft Teams)
**Comunicare în echipă**
- Channels pe proiecte/departamente
- Integrări 2000+ apps
- Huddles pentru quick calls
- Preț: Gratuit - $12.50/user/lună

### 2. Notion
**Knowledge base & docs**
- Wiki-uri interne
- Templates puternice
- Database-uri flexibile
- Preț: Gratuit - $10/user/lună

### 3. Linear (sau Jira)
**Project management**
- Issue tracking modern
- Roadmaps
- Automations
- Preț: Gratuit - $8/user/lună

### 4. Figma
**Design collaboration**
- Real-time editing
- Components & libraries
- Prototyping
- Preț: Gratuit - $12/editor/lună

### 5. Loom
**Video messaging**
- Screen recording
- Instant sharing
- Reactions & comments
- Preț: Gratuit - $12.50/user/lună

### 6. Miro
**Whiteboarding**
- Brainstorming
- Workshops
- Retrospective
- Preț: Gratuit - $8/user/lună

### 7. Calendly
**Scheduling**
- Meeting booking
- Timezone smart
- Integrations
- Preț: Gratuit - $10/user/lună

### 8. 1Password (sau Bitwarden)
**Password management**
- Shared vaults
- SSO
- Security dashboard
- Preț: $7.99/user/lună

### 9. Around (sau Zoom)
**Video meetings**
- Floating heads
- Low bandwidth
- Noise cancellation
- Preț: Gratuit - $9.99/user/lună

### 10. Toggl Track
**Time tracking**
- Simple timer
- Reports
- Project billing
- Preț: Gratuit - $9/user/lună

## Stack Recomandat pe Buget

### Startup (< 10 persoane) - €0-50/lună
- Slack Free + Notion Free + Linear Free

### Growth (10-50 persoane) - €200-500/lună
- Slack Pro + Notion Team + Linear + 1Password

### Enterprise (50+ persoane) - €1000+/lună
- Full stack cu SSO și compliance

---

**DocumentIulia se integrează cu toate aceste tools.** [Vezi integrări](/integrations)
    `,
  },
  {
    id: 'blog-financial-kpis',
    title: 'KPIs Financiari Esențiali: Ghid pentru CFO și Manageri',
    titleEn: 'Essential Financial KPIs: Guide for CFOs and Managers',
    slug: 'kpis-financiari-esentiali-ghid',
    author: 'Elena Marinescu, CFO',
    publishedAt: '2025-11-15',
    category: 'Finance',
    tags: ['KPI', 'Finance', 'CFO', 'Performance'],
    readTime: 12,
    excerpt: 'Cei mai importanți indicatori financiari pentru monitorizarea performanței: profitabilitate, lichiditate, eficiență.',
    content: `
# KPIs Financiari Esențiali: Ghid pentru CFO și Manageri

## De Ce KPIs?

KPIs (Key Performance Indicators) permit:
- Monitorizare continuă
- Identificare tendințe
- Decizii informate
- Comunicare cu stakeholders

## Categorii de KPIs

### 1. Profitabilitate

**Gross Profit Margin**
\`\`\`
(Revenue - COGS) / Revenue × 100
Target: 30-50% (depinde de industrie)
\`\`\`

**EBITDA Margin**
\`\`\`
EBITDA / Revenue × 100
Target: 15-25%
\`\`\`

**Net Profit Margin**
\`\`\`
Net Income / Revenue × 100
Target: 5-15%
\`\`\`

### 2. Lichiditate

**Current Ratio**
\`\`\`
Current Assets / Current Liabilities
Target: 1.5-2.5
\`\`\`

**Quick Ratio**
\`\`\`
(Cash + Receivables) / Current Liabilities
Target: 1.0-1.5
\`\`\`

**Cash Conversion Cycle**
\`\`\`
DSO + DIO - DPO
Target: Cât mai scurt
\`\`\`

### 3. Eficiență

**DSO (Days Sales Outstanding)**
\`\`\`
(Accounts Receivable / Revenue) × 365
Target: 30-45 zile
\`\`\`

**DPO (Days Payables Outstanding)**
\`\`\`
(Accounts Payable / COGS) × 365
Target: 45-60 zile
\`\`\`

**Asset Turnover**
\`\`\`
Revenue / Total Assets
Target: 1.5-2.5
\`\`\`

### 4. Îndatorare

**Debt-to-Equity**
\`\`\`
Total Debt / Shareholders' Equity
Target: 0.5-1.5
\`\`\`

**Interest Coverage**
\`\`\`
EBIT / Interest Expense
Target: > 3x
\`\`\`

### 5. Creștere

**Revenue Growth**
\`\`\`
(Revenue YoY - Revenue LY) / Revenue LY × 100
Target: 10-30% YoY
\`\`\`

**Customer Acquisition Cost**
\`\`\`
Sales & Marketing Spend / New Customers
Target: CAC < LTV/3
\`\`\`

## Dashboard Minimal CFO

| KPI | Frecvență | Owner |
|-----|-----------|-------|
| Cash Balance | Daily | Treasury |
| Revenue MTD | Weekly | Sales |
| Gross Margin | Monthly | Finance |
| DSO/DPO | Monthly | Finance |
| EBITDA | Monthly | CFO |

## Benchmarks per Industrie

| Industrie | Gross Margin | Net Margin | Current Ratio |
|-----------|--------------|------------|---------------|
| Retail | 25-35% | 2-5% | 1.2-1.8 |
| Manufacturing | 30-45% | 5-10% | 1.5-2.0 |
| IT Services | 50-70% | 10-20% | 2.0-3.0 |
| Construction | 15-25% | 3-8% | 1.3-1.8 |

---

**DocumentIulia calculează automat toți KPIs.** [Vezi demo](/demo)
    `,
  },
  {
    id: 'blog-ai-accounting',
    title: 'Inteligența Artificială în Contabilitate: Viitorul Este Aici',
    titleEn: 'AI in Accounting: The Future Is Here',
    slug: 'inteligenta-artificiala-contabilitate-viitor',
    author: 'Echipa DocumentIulia',
    publishedAt: '2025-11-10',
    category: 'Tehnologie',
    tags: ['AI', 'Contabilitate', 'Automatizare', 'OCR'],
    readTime: 10,
    excerpt: 'Cum transformă AI-ul contabilitatea: OCR inteligent, reconciliere automată, predicții și anomalii.',
    content: `
# Inteligența Artificială în Contabilitate: Viitorul Este Aici

## Revoluția AI în Finance

Inteligența artificială transformă fundamental modul în care se face contabilitatea. De la procesare documente la predicții, AI-ul automatizează și îmbunătățește fiecare aspect.

## Aplicații AI în Contabilitate

### 1. OCR Inteligent (Document Processing)

**Ce face:**
- Extrage automat date din facturi, chitanțe, extrase
- Înțelege layout-uri diverse
- Identifică câmpuri fără template-uri

**Beneficii:**
- 95-99% acuratețe
- Procesare în secunde
- Reducere 80% timp manual

**Cum funcționează:**
\`\`\`
Document → OCR Engine → NLP Processing →
Structured Data → Validation → Accounting Entry
\`\`\`

### 2. Reconciliere Automată

**Ce face:**
- Potrivește tranzacții bancare cu înregistrări
- Identifică discrepanțe
- Sugerează corecții

**Beneficii:**
- Reconciliere în minute vs ore
- Erori reduse 90%+
- Audit trail complet

### 3. Detecție Anomalii

**Ce face:**
- Identifică tranzacții neobișnuite
- Detectează potențiale fraude
- Alertează pentru erori

**Exemple:**
- Factură duplicat
- Sumă neobișnuit de mare
- Furnizor nou cu plată imediată

### 4. Forecasting & Predicții

**Ce face:**
- Previziuni cash flow
- Proiecții revenue
- Trend analysis

**Modele utilizate:**
- Prophet (Facebook)
- ARIMA
- LSTM Neural Networks

### 5. Chatbot & Asistent Virtual

**Ce face:**
- Răspunde la întrebări contabile
- Generează rapoarte on-demand
- Ghidează utilizatorii

**Exemple:**
- "Care este soldul contului 401?"
- "Generează P&L pentru Q3"
- "Ce facturi sunt scadente?"

## ROI Implementare AI

| Proces | Timp Manual | Timp AI | Economie |
|--------|-------------|---------|----------|
| Procesare factură | 5 min | 30 sec | 90% |
| Reconciliere | 4 ore/zi | 30 min/zi | 87% |
| Raportare | 2 zile | 2 ore | 90% |
| Audit prep | 2 săptămâni | 2 zile | 85% |

## Considerații Implementare

### Cerințe date:
- Date curate și structurate
- Volum suficient pentru training
- Proces de validare

### Riscuri:
- Over-reliance pe AI
- Bias în modele
- Privacy/security

### Best practices:
1. Start cu use case clar
2. Human-in-the-loop
3. Monitorizare continuă
4. Training echipă

## Viitorul: Contabilitate Autonomă

Pe termen mediu (3-5 ani):
- Zero data entry manual
- Real-time reporting
- Predictive compliance
- Autonomous close

---

**DocumentIulia folosește AI pentru contabilitate 99% automată.** [Testează gratuit](/register)
    `,
  },
  {
    id: 'blog-inventory-management',
    title: 'Managementul Stocurilor: De la Excel la ERP',
    titleEn: 'Inventory Management: From Excel to ERP',
    slug: 'management-stocuri-excel-erp',
    author: 'Vlad Constantinescu, Operations Manager',
    publishedAt: '2025-11-05',
    category: 'Operations',
    tags: ['Stocuri', 'Inventory', 'ERP', 'Supply Chain'],
    readTime: 10,
    excerpt: 'Evoluția managementului stocurilor: când să treceți de la Excel la soluții profesionale.',
    content: `
# Managementul Stocurilor: De la Excel la ERP

## Etapele Evoluției

### Nivel 1: Excel Basic
- Tabel simplu cu produse și cantități
- Update manual
- Fără istoric

**Când funcționează:** < 50 SKU, 1 locație

### Nivel 2: Excel Avansat
- Formule SUMIF/VLOOKUP
- Multiple sheets
- Pivot tables pentru analiză

**Când funcționează:** 50-200 SKU, 1-2 locații

### Nivel 3: Software Dedicat
- Barcode scanning
- Alerts stoc minim
- Rapoarte automate

**Când funcționează:** 200-1000 SKU, 2-5 locații

### Nivel 4: ERP Integrat
- Multi-warehouse
- Lot tracking
- Integrare finance
- Forecasting

**Când funcționează:** 1000+ SKU, 5+ locații, complex

## Semne că Trebuie să Evoluați

1. **Discrepanțe frecvente** între fizic și sistem
2. **Stockout-uri** neașteptate
3. **Overstock** care blochează capital
4. **Timp mare** pentru inventariere
5. **Imposibilitate** trasabilitate lot/serie

## Metodologii de Gestiune

### ABC Analysis
- **A**: 20% produse, 80% valoare → control strict
- **B**: 30% produse, 15% valoare → control moderat
- **C**: 50% produse, 5% valoare → control relaxat

### Safety Stock
\`\`\`
Safety Stock = Z × σ × √LT

Z = factor serviciu (95% → 1.65)
σ = deviație standard cerere
LT = lead time
\`\`\`

### EOQ (Economic Order Quantity)
\`\`\`
EOQ = √(2 × D × S / H)

D = cerere anuală
S = cost per comandă
H = cost păstrare pe unitate
\`\`\`

## KPIs Stocuri

| KPI | Formula | Target |
|-----|---------|--------|
| Inventory Turnover | COGS / Avg Inventory | 6-12x/an |
| Days Inventory | 365 / Turnover | 30-60 zile |
| Stockout Rate | Stockouts / Total SKU | < 2% |
| Carrying Cost | (Avg Inv × rate) / COGS | 15-25% |

## Checklist Implementare ERP

- [ ] Audit stocuri actuale
- [ ] Curățare bază de date
- [ ] Definire categorii și atribute
- [ ] Setup locații și zone
- [ ] Import date
- [ ] Training echipă
- [ ] Go-live + suport

---

**DocumentIulia include modul complet de stocuri.** [Vezi funcționalități](/features)
    `,
  },
  {
    id: 'blog-team-performance',
    title: 'Evaluarea Performanței Echipei: Metodologii și Tools',
    titleEn: 'Team Performance Evaluation: Methods and Tools',
    slug: 'evaluare-performanta-echipa-metodologii',
    author: 'Simona Cristea, HR Manager',
    publishedAt: '2025-10-30',
    category: 'HR',
    tags: ['Performance', 'HR', 'OKR', 'Feedback'],
    readTime: 12,
    excerpt: 'Sisteme moderne de evaluare: OKR, 360 feedback, continuous performance management.',
    content: `
# Evaluarea Performanței Echipei: Metodologii și Tools

## Evoluția Evaluării Performanței

### Trecut: Annual Review
- O singură evaluare pe an
- Formulare lungi
- Top-down
- Rating numeric

### Prezent: Continuous PM
- Feedback ongoing
- Check-ins frecvente
- Multi-directional
- Focus pe dezvoltare

## Metodologii Moderne

### 1. OKR (Objectives & Key Results)

**Structură:**
\`\`\`
Obiectiv: Ce vrem să realizăm
Key Results: Cum măsurăm succesul (3-5)
\`\`\`

**Exemplu:**
\`\`\`
Obiectiv: Îmbunătățim satisfacția clienților

KR1: NPS crește de la 35 la 50
KR2: Timp răspuns support < 2 ore
KR3: CSAT > 4.5/5
\`\`\`

**Cadență:**
- Quarterly OKRs
- Weekly check-ins
- Monthly reviews

### 2. 360 Feedback

**Surse:**
- Manager (sus)
- Colegi (lateral)
- Subordonați (jos)
- Self-assessment

**Beneficii:**
- Perspectivă completă
- Reduce bias
- Identifică blind spots

**Risks:**
- Politizare
- Timp consumator
- Feedback vag

### 3. Continuous Feedback

**Elemente:**
- Kudos/recognition real-time
- 1:1s regulate
- Pulse surveys
- Check-ins săptămânale

### 4. Competency Framework

**Exemplu framework:**
| Nivel | Descriere |
|-------|-----------|
| 1 - Learning | Învață skill-ul |
| 2 - Developing | Aplică cu ghidare |
| 3 - Proficient | Lucrează independent |
| 4 - Advanced | Mentorează alții |
| 5 - Expert | Definește standarde |

## Implementare Practică

### Pasul 1: Design Framework
- Identificare competențe cheie
- Definire niveluri
- Aliniere cu strategia

### Pasul 2: Tooling
- Alegere platformă (Lattice, 15Five, Culture Amp)
- Configurare
- Integrare HRIS

### Pasul 3: Training
- Manageri: cum să dea feedback
- Angajați: cum să primească
- HR: cum să faciliteze

### Pasul 4: Rollout
- Pilot cu echipă
- Feedback și iterație
- Extindere graduală

### Pasul 5: Calibration
- Sesiuni manageri
- Reducere inconsistențe
- Distribuție normală

## KPIs Evaluare

| Metric | Target |
|--------|--------|
| Completion rate | > 95% |
| On-time delivery | > 90% |
| Employee satisfaction | > 4/5 |
| Development plans actioned | > 80% |

---

**DocumentIulia include modul HR complet.** [Descoperă](/hr)
    `,
  },
];

// ===== GENERATED EMPLOYEES FOR EACH BUSINESS =====
export function generateEmployees(business: typeof demoBusinesses[0]): any[] {
  const employees: any[] = [];
  const firstNames = ['Ion', 'Maria', 'Andrei', 'Elena', 'Mihai', 'Ana', 'Alexandru', 'Cristina', 'Bogdan', 'Ioana', 'Radu', 'Diana', 'George', 'Laura', 'Vlad', 'Simona', 'Dan', 'Monica', 'Adrian', 'Alina'];
  const lastNames = ['Popescu', 'Ionescu', 'Popa', 'Dumitrescu', 'Stan', 'Gheorghiu', 'Marin', 'Stoica', 'Rusu', 'Moldovan', 'Nistor', 'Barbu', 'Tudor', 'Dinu', 'Radu', 'Preda', 'Voicu', 'Lungu', 'Neagu', 'Toma'];

  let empId = 1;
  const targetCount = business.employees;

  // Add executives first
  const executives = [
    { department: 'Management', position: 'Director General', count: 1 },
    { department: 'Finance', position: 'Contabil Șef', count: 1 },
    { department: 'HR', position: 'HR Manager', count: 1 },
  ];

  executives.forEach(exec => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const salary = employeeTemplates.salaryRanges['Director General'] || employeeTemplates.salaryRanges.Default;

    employees.push({
      id: `${business.id}-emp-${empId++}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${business.name.toLowerCase().replace(/\s+/g, '')}.ro`,
      department: exec.department,
      position: exec.position,
      hireDate: new Date(2020 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), 1).toISOString().split('T')[0],
      salary: Math.floor(salary[0] + Math.random() * (salary[1] - salary[0])),
      contractType: 'FULL_TIME',
      status: 'ACTIVE',
    });
  });

  // Fill remaining with various roles
  const remainingCount = targetCount - employees.length;
  const departmentDistribution: Record<string, number> = {
    Operations: 0.3,
    Sales: 0.15,
    Production: 0.2,
    Logistics: 0.1,
    Finance: 0.1,
    IT: 0.08,
    Marketing: 0.05,
    Quality: 0.02,
  };

  Object.entries(departmentDistribution).forEach(([dept, ratio]) => {
    const deptCount = Math.floor(remainingCount * ratio);
    const positions = employeeTemplates.positions[dept as keyof typeof employeeTemplates.positions] || ['Specialist'];

    for (let i = 0; i < deptCount && employees.length < targetCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const salaryKey = Object.keys(employeeTemplates.salaryRanges).find(k => position.includes(k)) || 'Default';
      const salary = employeeTemplates.salaryRanges[salaryKey as keyof typeof employeeTemplates.salaryRanges];

      employees.push({
        id: `${business.id}-emp-${empId++}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${empId}@${business.name.toLowerCase().replace(/\s+/g, '')}.ro`,
        department: dept,
        position,
        hireDate: new Date(2018 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)).toISOString().split('T')[0],
        salary: Math.floor(salary[0] + Math.random() * (salary[1] - salary[0])),
        contractType: Math.random() > 0.9 ? 'PART_TIME' : 'FULL_TIME',
        status: Math.random() > 0.95 ? 'ON_LEAVE' : 'ACTIVE',
      });
    }
  });

  return employees;
}

// ===== HSE INCIDENTS GENERATOR =====
export function generateHSEIncidents(businessId: string, count: number = 5): any[] {
  const incidents: any[] = [];
  const descriptions = [
    'Alunecare pe suprafață umedă în zona depozit',
    'Contact minor cu echipament în mișcare',
    'Expunere la zgomot peste limită fără protecție',
    'Tăietură superficială la manipulare ambalaje',
    'Stres termic în perioada verii',
    'Dureri musculo-scheletice de la poziție prelungită',
    'Accident rutier minor în deplasare',
    'Inhalare vapori chimici - ventilație deficitară',
  ];

  for (let i = 0; i < count; i++) {
    incidents.push({
      id: `${businessId}-incident-${i + 1}`,
      date: new Date(2025 - Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)).toISOString().split('T')[0],
      type: hseData.incidentTypes[Math.floor(Math.random() * hseData.incidentTypes.length)],
      severity: hseData.severityLevels[Math.floor(Math.random() * hseData.severityLevels.length)],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      hazardCategory: hseData.hazardCategories[Math.floor(Math.random() * hseData.hazardCategories.length)].code,
      status: Math.random() > 0.3 ? 'CLOSED' : 'INVESTIGATING',
      daysLost: Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0,
    });
  }

  return incidents;
}

// ===== FINAL EXPORT =====
export const allCourses = [
  ...courseCatalog.excelVba,
  ...courseCatalog.projectManagement,
  ...courseCatalog.finance,
  ...courseCatalog.leadership,
  ...courseCatalog.compliance,
  ...courseCatalog.hr,
  ...courseCatalog.operations,
  ...courseCatalog.marketing,
  ...courseCatalog.softSkills,
  ...courseCatalog.technology,
  ...additionalCourses.dataAnalytics,
  ...additionalCourses.ecommerce,
  ...additionalCourses.freelancer,
  ...additionalCourses.legal,
  ...additionalCourses.customerService,
  ...additionalCourses.quality,
  ...additionalCourses.sustainability,
];

// Elite courses with full comprehensive content (exported separately for proper handling)
export { eliteBusinessCourses };

export const allBlogArticles = [...blogArticles, ...additionalBlogArticles];

// Generate all employee data
export const allEmployees: Record<string, any[]> = {};
demoBusinesses.forEach(biz => {
  allEmployees[biz.id] = generateEmployees(biz);
});

// Generate HSE data for each business
export const allHSEIncidents: Record<string, any[]> = {};
demoBusinesses.forEach(biz => {
  allHSEIncidents[biz.id] = generateHSEIncidents(biz.id, Math.floor(3 + Math.random() * 5));
});

console.log('Demo content definitions loaded successfully!');
console.log(`- ${demoBusinesses.length} demo businesses`);
console.log(`- ${allCourses.length} courses`);
console.log(`- ${forumData.categories.length} forum categories`);
console.log(`- ${forumData.threads.length} forum threads`);
console.log(`- ${allBlogArticles.length} blog articles`);
console.log(`- ${Object.values(allEmployees).flat().length} employees generated`);
