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
      console.log(`  ⏭️  Skipping existing: ${scenario.title}`);
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
