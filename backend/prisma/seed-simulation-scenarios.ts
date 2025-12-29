/**
 * DocumentIulia.ro - Simulation Scenarios Seeder
 * Sprint 25 - Seeds business simulation scenarios
 * Run with: npx tsx prisma/seed-simulation-scenarios.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const simulationScenarios = [
  // Tutorial Scenarios
  {
    slug: 'prima-mea-firma',
    title: 'Prima Mea Firmă',
    titleEn: 'My First Company',
    description: `Bine ai venit în lumea antreprenoriatului!

În acest scenariu tutorial, vei învăța bazele gestionării unei afaceri în România. Pornești cu un SRL nou-nouț și 50.000 RON capital inițial.

**Obiectivele tale:**
- Supraviețuiește primele 12 luni
- Atinge profitabilitatea (profit lunar pozitiv)
- Angajează primul tău salariat
- Menține conformitatea fiscală

Vei învăța despre cash flow, angajări, obligații fiscale și multe altele. AI-ul nostru te va ghida la fiecare pas!`,
    descriptionEn: 'Learn the basics of running a business in Romania. Start with a new SRL and €10,000 capital.',
    difficulty: 'SIM_TUTORIAL',
    type: 'SCENARIO_TUTORIAL',
    initialState: {
      cash: 50000,
      revenue: 0,
      expenses: 0,
      profit: 0,
      receivables: 0,
      payables: 0,
      inventory: 0,
      equipment: 5000,
      loans: 0,
      employees: 1,
      capacity: 100,
      utilization: 0,
      quality: 80,
      marketShare: 0,
      customerCount: 0,
      reputation: 50,
      taxOwed: 0,
      vatBalance: 0,
      penaltiesRisk: 0,
      auditRisk: 5,
    },
    objectives: [
      { id: 'survive_12', description: 'Supraviețuiește 12 luni', condition: 'months >= 12', xp: 200 },
      { id: 'profit_positive', description: 'Atinge profit lunar pozitiv', condition: 'profit > 0', xp: 150 },
      { id: 'first_employee', description: 'Angajează primul salariat', condition: 'employees >= 2', xp: 150 },
    ],
    timeLimit: 24,
    xpReward: 500,
    badgeId: 'badge-first-company',
    relatedCourseIds: ['ghid-complet-infiintare-afacere-romania', 'conformitate-legala-firme-noi'],
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    slug: 'primii-angajati',
    title: 'Primii Angajați',
    titleEn: 'First Employees',
    description: `Afacerea ta crește și ai nevoie de echipă!

În acest tutorial vei învăța tot ce trebuie să știi despre angajări în România:

**Ce vei învăța:**
- Procesul de angajare legal
- Contracte de muncă și REVISAL
- Calculul salariilor și contribuțiilor
- Managementul productivității
- Retenția angajaților

**Obiective:**
- Construiește o echipă de 5 persoane
- Menține productivitatea peste 80%
- Evită fluctuația de personal`,
    descriptionEn: 'Learn to hire employees, manage payroll, and build a productive team.',
    difficulty: 'SIM_TUTORIAL',
    type: 'SCENARIO_TUTORIAL',
    initialState: {
      cash: 80000,
      revenue: 25000,
      expenses: 18000,
      profit: 7000,
      receivables: 8000,
      payables: 5000,
      inventory: 10000,
      equipment: 15000,
      loans: 0,
      employees: 1,
      capacity: 100,
      utilization: 90,
      quality: 85,
      marketShare: 0.5,
      customerCount: 20,
      reputation: 65,
      taxOwed: 1200,
      vatBalance: 3500,
      penaltiesRisk: 0,
      auditRisk: 5,
    },
    objectives: [
      { id: 'hire_5', description: 'Angajează 5 salariați', condition: 'employees >= 5', xp: 200 },
      { id: 'productivity_80', description: 'Menține productivitatea > 80%', condition: 'quality >= 80 && utilization >= 70', xp: 150 },
      { id: 'no_turnover', description: 'Zero demisii în 6 luni', condition: 'turnover == 0', xp: 150 },
    ],
    timeLimit: 12,
    xpReward: 400,
    badgeId: 'badge-team-builder',
    relatedCourseIds: [],
    isActive: true,
    isFeatured: false,
    sortOrder: 2,
  },

  // Challenge Scenarios
  {
    slug: 'supravietuirea-crizei',
    title: 'Supraviețuirea Crizei',
    titleEn: 'Crisis Survival',
    description: `ALERTĂ: Criză economică!

Economia a intrat în recesiune. Veniturile tale au scăzut brusc cu 40%, clienții amână plățile, și furnizorii cer plata în avans.

**Situația:**
- Venituri reduse cu 40%
- Creanțe în creștere
- Furnizori nervoși
- Echipa demoralizată

**Obiective:**
- Supraviețuiește 6 luni fără faliment
- Recuperează la minimum 80% din veniturile inițiale
- Păstrează membrii cheie ai echipei

Aceasta este o provocare dificilă. Vei avea nevoie de toate cunoștințele tale de management financiar!`,
    descriptionEn: 'Your business is hit by an economic crisis. Revenue drops 40%. Can you survive and recover?',
    difficulty: 'SIM_HARD',
    type: 'SCENARIO_CRISIS_SURVIVAL',
    initialState: {
      cash: 35000,
      revenue: 18000, // down from 30000
      expenses: 28000,
      profit: -10000,
      receivables: 25000,
      payables: 15000,
      inventory: 12000,
      equipment: 40000,
      loans: 20000,
      employees: 8,
      capacity: 100,
      utilization: 45,
      quality: 75,
      marketShare: 1.5,
      customerCount: 35,
      reputation: 60,
      taxOwed: 4500,
      vatBalance: 2800,
      penaltiesRisk: 15,
      auditRisk: 10,
    },
    objectives: [
      { id: 'survive_6', description: 'Supraviețuiește 6 luni', condition: 'months >= 6 && cash > 0', xp: 400 },
      { id: 'recover_80', description: 'Recuperează 80% venituri', condition: 'revenue >= 24000', xp: 300 },
      { id: 'keep_team', description: 'Păstrează 70% din echipă', condition: 'employees >= 6', xp: 300 },
    ],
    timeLimit: 12,
    xpReward: 1000,
    badgeId: 'badge-crisis-survivor',
    relatedCourseIds: [],
    isActive: true,
    isFeatured: true,
    sortOrder: 10,
  },
  {
    slug: 'crestere-rapida',
    title: 'Creștere Rapidă',
    titleEn: 'Rapid Growth',
    description: `OPORTUNITATE: Comandă majoră!

Tocmai ai primit vestea vieții - un client mare vrea să semneze un contract care îți va tripla cererea. Dar poți face față?

**Provocarea:**
- Cererea crește de 3x
- Capacitatea actuală insuficientă
- Cash flow-ul va fi testat
- Calitatea nu trebuie să scadă

**Obiective:**
- Scalează capacitatea pentru a face față cererii
- Menține calitatea produselor/serviciilor > 75%
- Asigură cash flow pozitiv pe tot parcursul

Atenție: Creșterea prea rapidă poate fi la fel de periculoasă ca stagnarea!`,
    descriptionEn: 'A major order triples your demand. Scale operations without losing quality or cash.',
    difficulty: 'SIM_NORMAL',
    type: 'SCENARIO_GROWTH_RACE',
    initialState: {
      cash: 60000,
      revenue: 35000,
      expenses: 28000,
      profit: 7000,
      receivables: 12000,
      payables: 8000,
      inventory: 8000,
      equipment: 25000,
      loans: 0,
      employees: 5,
      capacity: 100,
      utilization: 85,
      quality: 85,
      marketShare: 2,
      customerCount: 50,
      reputation: 75,
      taxOwed: 2100,
      vatBalance: 5200,
      penaltiesRisk: 0,
      auditRisk: 8,
    },
    objectives: [
      { id: 'scale_capacity', description: 'Capacitate 3x (300%)', condition: 'capacity >= 300', xp: 300 },
      { id: 'maintain_quality', description: 'Calitate > 75%', condition: 'quality >= 75', xp: 250 },
      { id: 'positive_cashflow', description: 'Cash flow pozitiv', condition: 'cash > initialCash', xp: 250 },
    ],
    timeLimit: 12,
    xpReward: 800,
    badgeId: 'badge-growth-master',
    relatedCourseIds: ['finantare-startup-romania-2025'],
    isActive: true,
    isFeatured: false,
    sortOrder: 11,
  },
  {
    slug: 'audit-anaf',
    title: 'Audit ANAF',
    titleEn: 'ANAF Audit',
    description: `NOTIFICARE: Control fiscal programat!

ANAF a anunțat un control fiscal la firma ta. Ai 3 luni să-ți pui toate documentele în ordine.

**Situația:**
- Unele documente lipsesc
- Declarații întârziate
- SAF-T D406 neimplementat
- e-Facturi nesubmise

**Obiective:**
- Pregătește toată documentația
- Treci auditul cu penalități < 5%
- Implementează SAF-T D406 corect
- Regularizează toate obligațiile

Aceasta este șansa ta să înveți conformitatea fiscală românească în profunzime!`,
    descriptionEn: 'ANAF announces a tax audit. You have 3 months to prepare and pass with minimal penalties.',
    difficulty: 'SIM_HARD',
    type: 'SCENARIO_COMPLIANCE_TEST',
    initialState: {
      cash: 45000,
      revenue: 42000,
      expenses: 35000,
      profit: 7000,
      receivables: 18000,
      payables: 12000,
      inventory: 15000,
      equipment: 35000,
      loans: 10000,
      employees: 6,
      capacity: 100,
      utilization: 70,
      quality: 80,
      marketShare: 1.8,
      customerCount: 65,
      reputation: 70,
      taxOwed: 8500,
      vatBalance: 6200,
      penaltiesRisk: 35,
      auditRisk: 85,
    },
    objectives: [
      { id: 'prepare_docs', description: 'Documentație completă', condition: 'auditRisk < 20', xp: 350 },
      { id: 'pass_audit', description: 'Penalități < 5%', condition: 'penaltiesRisk < 5', xp: 350 },
      { id: 'implement_saft', description: 'SAF-T D406 implementat', condition: 'saftCompliant == true', xp: 200 },
    ],
    timeLimit: 6,
    xpReward: 900,
    badgeId: 'badge-compliance-champion',
    relatedCourseIds: ['conformitate-legala-firme-noi'],
    isActive: true,
    isFeatured: true,
    sortOrder: 12,
  },

  // Freeplay
  {
    slug: 'mod-liber',
    title: 'Mod Liber',
    titleEn: 'Free Play',
    description: `Libertate totală!

În Modul Liber, tu decizi totul. Nu există obiective fixe, nu există limite de timp, nu există presiune.

**Ce poți face:**
- Experimentează cu diferite strategii
- Testează scenarii "what if"
- Învață din greșeli fără consecințe
- Construiește afacerea visurilor tale

**Start:**
- Capital inițial: 100.000 RON
- Un angajat (tu!)
- Piață deschisă

Folosește acest mod pentru a te pregăti pentru provocările reale sau pur și simplu pentru a te distra construind un imperiu!`,
    descriptionEn: 'No objectives, no time limits. Build your business exactly as you want.',
    difficulty: 'SIM_EASY',
    type: 'SCENARIO_FREEPLAY',
    initialState: {
      cash: 100000,
      revenue: 0,
      expenses: 0,
      profit: 0,
      receivables: 0,
      payables: 0,
      inventory: 0,
      equipment: 10000,
      loans: 0,
      employees: 1,
      capacity: 100,
      utilization: 0,
      quality: 80,
      marketShare: 0,
      customerCount: 0,
      reputation: 50,
      taxOwed: 0,
      vatBalance: 0,
      penaltiesRisk: 0,
      auditRisk: 5,
    },
    objectives: [],
    timeLimit: null,
    xpReward: 100,
    badgeId: null,
    relatedCourseIds: [],
    isActive: true,
    isFeatured: false,
    sortOrder: 100,
  },

  // Advanced Romanian Market Scenarios
  {
    slug: 'criza-energetica-2025',
    title: 'Criza Energetică 2025',
    titleEn: 'Energy Crisis 2025',
    description: `ALERTĂ: Cea mai mare criză energetică din ultimii 30 de ani lovește România!

**Context:**
- Prețurile la energie cresc cu 300%
- Inflația ajunge la 15%
- Clienții reduc comenzile
- Furnizorii cer plăți anticipate

**Provocarea ta:**
- Redu costurile cu energia cu 50%
- Menține marjele de profit
- Nu concedia angajați
- Treci la surse regenerabile

**Obiective:**
- Energie regenerabilă implementată
- Costuri reduse cu 40%
- Profitabilitate menținută
- Zero concedieri`,
    descriptionEn: 'Romania faces its biggest energy crisis in 30 years. Adapt your business to survive skyrocketing energy costs.',
    difficulty: 'SIM_HARD',
    type: 'SCENARIO_CRISIS_SURVIVAL',
    initialState: {
      cash: 80000,
      revenue: 55000,
      expenses: 45000,
      profit: 10000,
      receivables: 22000,
      payables: 15000,
      inventory: 25000,
      equipment: 60000,
      loans: 20000,
      employees: 8,
      capacity: 120,
      utilization: 75,
      quality: 82,
      marketShare: 3.2,
      customerCount: 85,
      reputation: 72,
      taxOwed: 3200,
      vatBalance: 4800,
      penaltiesRisk: 5,
      auditRisk: 12,
    },
    objectives: [
      { id: 'green_energy', description: 'Energie verde implementată', condition: 'greenEnergy == true', xp: 400 },
      { id: 'cost_reduction', description: 'Costuri reduse 40%', condition: 'energyCosts < initialEnergyCosts * 0.6', xp: 350 },
      { id: 'maintain_profit', description: 'Profit > 5000/lună', condition: 'profit >= 5000', xp: 300 },
      { id: 'no_layoffs', description: 'Zero concedieri', condition: 'employees >= initialEmployees', xp: 250 },
    ],
    timeLimit: 9,
    xpReward: 1300,
    badgeId: 'badge-sustainability-pioneer',
    relatedCourseIds: ['sustainability-business'],
    isActive: true,
    isFeatured: true,
    sortOrder: 13,
  },

  {
    slug: 'digitalizare-obligatorie',
    title: 'Digitalizare Obligatoratorie',
    titleEn: 'Mandatory Digitalization',
    description: `Legea digitalizării intră în vigoare! Toate firmele trebuie să fie 100% digitale până în 6 luni.

**Cerințe:**
- Facturare electronică (e-Factura)
- Sistem de gestiune digital
- Semnătură electronică
- Arhivare digitală

**Provocarea:**
- Buget limitat pentru digitalizare
- Angajați rezistenți la schimbare
- Procese actuale ineficiente
- Termen strâns

**Obiective:**
- Sistem ERP implementat
- e-Factura activ
- Productivitate +30%
- Costuri administrative -25%`,
    descriptionEn: 'New Romanian law requires all businesses to go fully digital within 6 months. Transform your operations.',
    difficulty: 'SIM_NORMAL',
    type: 'SCENARIO_CHALLENGE',
    initialState: {
      cash: 70000,
      revenue: 48000,
      expenses: 40000,
      profit: 8000,
      receivables: 16000,
      payables: 12000,
      inventory: 18000,
      equipment: 45000,
      loans: 0,
      employees: 7,
      capacity: 110,
      utilization: 68,
      quality: 78,
      marketShare: 2.8,
      customerCount: 72,
      reputation: 68,
      taxOwed: 2400,
      vatBalance: 3600,
      penaltiesRisk: 8,
      auditRisk: 15,
    },
    objectives: [
      { id: 'erp_system', description: 'ERP implementat', condition: 'erpSystem == true', xp: 350 },
      { id: 'e_invoice', description: 'e-Factura activ', condition: 'eInvoiceActive == true', xp: 300 },
      { id: 'productivity_boost', description: 'Productivitate +30%', condition: 'productivity >= initialProductivity * 1.3', xp: 350 },
      { id: 'cost_reduction', description: 'Costuri admin -25%', condition: 'adminCosts < initialAdminCosts * 0.75', xp: 250 },
    ],
    timeLimit: 6,
    xpReward: 1250,
    badgeId: 'badge-digital-champion',
    relatedCourseIds: ['digitalizare-afaceri'],
    isActive: true,
    isFeatured: true,
    sortOrder: 14,
  },

  {
    slug: 'fonduri-ue-agricultura',
    title: 'Fonduri UE pentru Agricultură',
    titleEn: 'EU Funds for Agriculture',
    description: `AFIR lansează programul "Dezvoltare Rurală 2025" cu fonduri nerambursabile!

**Oportunități:**
- Subvenții până la 500.000€
- Investiții în echipamente moderne
- Dezvoltare durabilă
- Creșterea competitivității

**Provocarea:**
- Aplicație complexă (200+ pagini)
- Criterii stricte de eligibilitate
- Verificări ample post-aprobare
- Implementare în termen de 2 ani

**Obiective:**
- Aplicație completată și depusă
- Finanțare aprobată
- Proiect implementat cu succes
- Raportare conformă`,
    descriptionEn: 'Apply for substantial EU agricultural development funds. Master the complex application and implementation process.',
    difficulty: 'SIM_NORMAL',
    type: 'SCENARIO_CHALLENGE',
    initialState: {
      cash: 60000,
      revenue: 42000,
      expenses: 38000,
      profit: 4000,
      receivables: 14000,
      payables: 10000,
      inventory: 12000,
      equipment: 80000,
      loans: 15000,
      employees: 6,
      capacity: 95,
      utilization: 72,
      quality: 75,
      marketShare: 1.9,
      customerCount: 58,
      reputation: 65,
      taxOwed: 1800,
      vatBalance: 2800,
      penaltiesRisk: 3,
      auditRisk: 8,
    },
    objectives: [
      { id: 'application_complete', description: 'Aplicație depusă', condition: 'applicationSubmitted == true', xp: 300 },
      { id: 'funding_approved', description: 'Finanțare aprobată', condition: 'fundingApproved == true', xp: 400 },
      { id: 'project_implemented', description: 'Proiect implementat', condition: 'projectCompleted == true', xp: 350 },
      { id: 'reporting_compliant', description: 'Raportare conformă', condition: 'reportingComplete == true', xp: 250 },
    ],
    timeLimit: 18,
    xpReward: 1300,
    badgeId: 'badge-eu-funds-expert',
    relatedCourseIds: ['fonduri-europene'],
    isActive: true,
    isFeatured: false,
    sortOrder: 15,
  },

  {
    slug: 'pandemia-sanatate',
    title: 'Management în Pandemie',
    titleEn: 'Pandemic Management',
    description: `ALERTĂ SANITARĂ: Pandemie globală! Economia se închide, clienții dispar.

**Criza:**
- 80% din clienți își suspendă comenzile
- Lucru de acasă obligatoriu
- Costuri sanitare cresc
- Supply chain întrerupt

**Provocarea:**
- Menține 50% din venituri
- Protejează angajații
- Treci la digital complet
- Supraviețuiește 12 luni

**Obiective:**
- Venituri menținute > 50%
- Zero îmbolnăviri la muncă
- Digitalizare completă
- Profit pozitiv în Q4`,
    descriptionEn: 'Global pandemic hits! Adapt your business to remote work, supply chain disruptions, and changing customer behavior.',
    difficulty: 'SIM_EXPERT',
    type: 'SCENARIO_CRISIS_SURVIVAL',
    initialState: {
      cash: 120000,
      revenue: 65000,
      expenses: 52000,
      profit: 13000,
      receivables: 28000,
      payables: 18000,
      inventory: 35000,
      equipment: 75000,
      loans: 0,
      employees: 12,
      capacity: 140,
      utilization: 78,
      quality: 85,
      marketShare: 4.1,
      customerCount: 110,
      reputation: 78,
      taxOwed: 3900,
      vatBalance: 5800,
      penaltiesRisk: 2,
      auditRisk: 6,
    },
    objectives: [
      { id: 'revenue_maintained', description: 'Venituri > 50%', condition: 'revenue >= initialRevenue * 0.5', xp: 400 },
      { id: 'employee_safety', description: 'Siguranța angajaților', condition: 'employeeSafetyScore >= 95', xp: 350 },
      { id: 'digital_transformation', description: 'Digitalizare completă', condition: 'digitalReadiness == 100', xp: 400 },
      { id: 'profit_recovery', description: 'Profit pozitiv Q4', condition: 'quarterlyProfit > 0', xp: 350 },
    ],
    timeLimit: 12,
    xpReward: 1500,
    badgeId: 'badge-crisis-manager',
    relatedCourseIds: ['managementul-productiei'],
    isActive: true,
    isFeatured: true,
    sortOrder: 16,
  },

  {
    slug: 'expansiune-internationala',
    title: 'Expansiune Internațională',
    titleEn: 'International Expansion',
    description: `Primul contract internațional! Export în Germania valorează 200.000€.

**Provocări:**
- Incoterms și logistică internațională
- Vamă și accize
- Plăți în valută străină
- Certificate de origine
- Standarde europene de calitate

**Obiective:**
- Contract semnat și onorat
- Marje de profit menținute
- Conformitate vamală perfectă
- Poziționare pentru export viitor

**Bonus:** Dacă reușești, deschizi piața europeană!`,
    descriptionEn: 'Your first international contract! Export to Germany worth €200,000. Master international trade, customs, and foreign currency.',
    difficulty: 'SIM_HARD',
    type: 'SCENARIO_CHALLENGE',
    initialState: {
      cash: 90000,
      revenue: 58000,
      expenses: 48000,
      profit: 10000,
      receivables: 24000,
      payables: 16000,
      inventory: 22000,
      equipment: 55000,
      loans: 0,
      employees: 9,
      capacity: 125,
      utilization: 80,
      quality: 88,
      marketShare: 3.5,
      customerCount: 95,
      reputation: 75,
      taxOwed: 3000,
      vatBalance: 4500,
      penaltiesRisk: 4,
      auditRisk: 10,
    },
    objectives: [
      { id: 'contract_signed', description: 'Contract semnat', condition: 'internationalContract == true', xp: 350 },
      { id: 'export_delivered', description: 'Export livrat', condition: 'exportDelivered == true', xp: 400 },
      { id: 'customs_compliant', description: 'Conformitate vamală', condition: 'customsCompliant == true', xp: 300 },
      { id: 'profit_maintained', description: 'Profit menținut', condition: 'profit >= initialProfit * 0.9', xp: 300 },
    ],
    timeLimit: 8,
    xpReward: 1350,
    badgeId: 'badge-international-trader',
    relatedCourseIds: ['export-romania-2025'],
    isActive: true,
    isFeatured: true,
    sortOrder: 17,
  },

  {
    slug: 'achizitie-concurent',
    title: 'Achiziție Concurent',
    titleEn: 'Competitor Acquisition',
    description: `Oportunitate unică: Concurentul principal vrea să vândă! Preț: 800.000 RON.

**Analiza concurentului:**
- Cota de piață: 8%
- 45 angajați
- Tehnologie superioară
- Probleme financiare

**Provocarea:**
- Due diligence complet
- Finanțare achiziție
- Integrare echipelor
- Sinergii operaționale

**Obiective:**
- Achiziție finalizată
- Integrare reușită
- Costuri optimizate
- Cota de piață mărită`,
    descriptionEn: 'Your main competitor is for sale! Acquire them to double your market share, but manage the integration challenges.',
    difficulty: 'SIM_EXPERT',
    type: 'SCENARIO_CHALLENGE',
    initialState: {
      cash: 150000,
      revenue: 75000,
      expenses: 60000,
      profit: 15000,
      receivables: 32000,
      payables: 24000,
      inventory: 28000,
      equipment: 90000,
      loans: 0,
      employees: 15,
      capacity: 160,
      utilization: 82,
      quality: 87,
      marketShare: 5.2,
      customerCount: 125,
      reputation: 80,
      taxOwed: 4500,
      vatBalance: 6800,
      penaltiesRisk: 2,
      auditRisk: 7,
    },
    objectives: [
      { id: 'due_diligence', description: 'Due diligence complet', condition: 'dueDiligenceComplete == true', xp: 400 },
      { id: 'acquisition_complete', description: 'Achiziție finalizată', condition: 'acquisitionComplete == true', xp: 500 },
      { id: 'integration_success', description: 'Integrare reușită', condition: 'integrationScore >= 85', xp: 450 },
      { id: 'synergies_realized', description: 'Sinergii realizate', condition: 'costSynergies >= 20000', xp: 350 },
    ],
    timeLimit: 15,
    xpReward: 1700,
    badgeId: 'badge-maestro',
    relatedCourseIds: ['strategie-afaceri'],
    isActive: true,
    isFeatured: false,
    sortOrder: 18,
  },

  {
    slug: 'inovatii-tehnologice',
    title: 'Revoluție Tehnologică',
    titleEn: 'Technology Revolution',
    description: `IA generativă transformă industria! Concurenții investesc masiv în tech.

**Trenduri:**
- ChatGPT pentru customer service
- RPA pentru procese administrative
- IoT pentru supply chain
- Blockchain pentru trasabilitate

**Provocarea:**
- Buget R&D limitat
- Echipă tehnică insuficientă
- Rezistență la schimbare
- ROI incert

**Obiective:**
- Sistem IA implementat
- Productivitate +50%
- Costuri -30%
- Leadership tehnologic`,
    descriptionEn: 'AI revolution hits your industry! Invest in cutting-edge technology or risk being left behind.',
    difficulty: 'SIM_HARD',
    type: 'SCENARIO_CHALLENGE',
    initialState: {
      cash: 100000,
      revenue: 62000,
      expenses: 51000,
      profit: 11000,
      receivables: 26000,
      payables: 17000,
      inventory: 20000,
      equipment: 65000,
      loans: 0,
      employees: 10,
      capacity: 130,
      utilization: 76,
      quality: 83,
      marketShare: 3.8,
      customerCount: 98,
      reputation: 74,
      taxOwed: 3300,
      vatBalance: 4900,
      penaltiesRisk: 3,
      auditRisk: 9,
    },
    objectives: [
      { id: 'ai_system', description: 'Sistem IA implementat', condition: 'aiSystemActive == true', xp: 400 },
      { id: 'productivity_boost', description: 'Productivitate +50%', condition: 'productivity >= initialProductivity * 1.5', xp: 450 },
      { id: 'cost_reduction', description: 'Costuri -30%', condition: 'costs < initialCosts * 0.7', xp: 400 },
      { id: 'innovation_leadership', description: 'Leadership inovativ', condition: 'innovationScore >= 90', xp: 350 },
    ],
    timeLimit: 10,
    xpReward: 1600,
    badgeId: 'badge-innovation-leader',
    relatedCourseIds: ['digitalizare-afaceri'],
    isActive: true,
    isFeatured: true,
    sortOrder: 19,
  },

  {
    slug: 'schimbari-climaterice',
    title: 'Schimbări Climaterice',
    titleEn: 'Climate Change Impact',
    description: `Evenimente meteo extreme lovesc România! Inundații, secetă, furtuni.

**Impacturi:**
- Supply chain întrerupt
- Costuri transport cresc 200%
- Asigurări mai scumpe
- Cerere schimbată (produse eco)

**Provocarea:**
- Reziliență operațională
- Supply chain alternativ
- Produse sustenabile
- Management riscuri

**Obiective:**
- Continuity plan activ
- Supply chain rezilient
- Produse eco lansate
- Riscuri reduse 80%`,
    descriptionEn: 'Extreme weather events disrupt your operations. Build climate resilience and adapt to changing market demands.',
    difficulty: 'SIM_NORMAL',
    type: 'SCENARIO_CHALLENGE',
    initialState: {
      cash: 85000,
      revenue: 53000,
      expenses: 44000,
      profit: 9000,
      receivables: 20000,
      payables: 14000,
      inventory: 18000,
      equipment: 58000,
      loans: 10000,
      employees: 8,
      capacity: 115,
      utilization: 74,
      quality: 80,
      marketShare: 3.1,
      customerCount: 78,
      reputation: 71,
      taxOwed: 2700,
      vatBalance: 4000,
      penaltiesRisk: 4,
      auditRisk: 11,
    },
    objectives: [
      { id: 'continuity_plan', description: 'Plan continuitate activ', condition: 'continuityPlanActive == true', xp: 350 },
      { id: 'supply_chain_backup', description: 'Supply chain alternativ', condition: 'backupSupplyChain == true', xp: 400 },
      { id: 'eco_products', description: 'Produse eco lansate', condition: 'ecoProductsLaunched == true', xp: 350 },
      { id: 'risk_reduction', description: 'Riscuri reduse 80%', condition: 'climateRisk < initialRisk * 0.2', xp: 300 },
    ],
    timeLimit: 12,
    xpReward: 1400,
    badgeId: 'badge-climate-resilient',
    relatedCourseIds: ['sustainability-business'],
    isActive: true,
    isFeatured: false,
    sortOrder: 20,
  },
];

async function seedSimulationScenarios() {
  console.log('🎮 Seeding Simulation Scenarios...\n');

  let created = 0;
  let skipped = 0;

  for (const scenario of simulationScenarios) {
    const existing = await prisma.simulationScenario.findUnique({
      where: { slug: scenario.slug },
    });

    if (existing) {
      // Force update isActive to true for all existing scenarios
      await prisma.simulationScenario.update({
        where: { slug: scenario.slug },
        data: { isActive: true },
      });
      console.log(`  ✅ Ensured active: ${scenario.title}`);
      skipped++;
      continue;
    }

    await prisma.simulationScenario.create({
      data: {
        slug: scenario.slug,
        title: scenario.title,
        titleEn: scenario.titleEn,
        description: scenario.description,
        descriptionEn: scenario.descriptionEn,
        difficulty: scenario.difficulty as any,
        type: scenario.type as any,
        initialState: scenario.initialState,
        objectives: scenario.objectives,
        timeLimit: scenario.timeLimit,
        xpReward: scenario.xpReward,
        badgeId: scenario.badgeId,
        relatedCourseIds: scenario.relatedCourseIds,
        isActive: scenario.isActive,
        isFeatured: scenario.isFeatured,
        sortOrder: scenario.sortOrder,
      },
    });

    console.log(`  ✅ Created: ${scenario.title}`);
    created++;
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Simulation Scenarios Summary:`);
  console.log(`   - Created: ${created}`);
  console.log(`   - Skipped: ${skipped}`);
  console.log(`   - Total: ${simulationScenarios.length}`);
  console.log('═'.repeat(50));
}

async function main() {
  console.log('\n' + '═'.repeat(50));
  console.log('🎮 Simulation Scenarios Seeder');
  console.log('═'.repeat(50) + '\n');

  try {
    await seedSimulationScenarios();

    const count = await prisma.simulationScenario.count();
    console.log(`\n✨ Total scenarios in database: ${count}\n`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
