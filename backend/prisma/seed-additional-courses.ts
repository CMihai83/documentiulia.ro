/**
 * DocumentIulia.ro - Additional Courses to reach 30+ target
 * Quick seed for specialized Romanian business courses
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const additionalCourses = [
  // ANAF & Compliance
  {
    title: 'e-Factura SPV - Ghid Practic',
    slug: 'efactura-spv-ghid-practic',
    description: 'Învață pas cu pas să folosești sistemul e-Factura SPV al ANAF. De la înregistrare până la transmiterea automată a facturilor.',
    category: 'FINANCE_OPS',
    level: 'BEGINNER',
    duration: 180,
    price: null,
    isFree: true,
    tags: ['e-Factura', 'SPV', 'ANAF', 'facturare'],
  },
  {
    title: 'SAF-T D406 pentru Începători',
    slug: 'saft-d406-incepatori',
    description: 'Înțelege formatul SAF-T și cum să pregătești declarația D406 pentru ANAF. Include template-uri și checklist-uri.',
    category: 'FINANCE_OPS',
    level: 'BEGINNER',
    duration: 240,
    price: 29,
    isFree: false,
    tags: ['SAF-T', 'D406', 'ANAF', 'contabilitate'],
  },
  {
    title: 'Declarații Fiscale 2025 - D100, D101, D300',
    slug: 'declaratii-fiscale-2025',
    description: 'Cum să completezi și transmiți corect declarațiile fiscale obligatorii: D100, D101, D300, D394.',
    category: 'FINANCE_OPS',
    level: 'INTERMEDIATE',
    duration: 360,
    price: 79,
    isFree: false,
    tags: ['declarații', 'fiscal', 'ANAF', 'D100', 'D101'],
  },
  // HR & Labor
  {
    title: 'REVISAL - Registrul Electronic al Salariaților',
    slug: 'revisal-registru-salariati',
    description: 'Tot ce trebuie să știi despre REVISAL: înregistrare, actualizare, transmitere ITM. Include erori frecvente și cum le eviți.',
    category: 'HR_COMPLIANCE',
    level: 'INTERMEDIATE',
    duration: 240,
    price: 49,
    isFree: false,
    tags: ['REVISAL', 'ITM', 'salariați', 'HR'],
  },
  {
    title: 'Concedii și Absențe - Ghid Complet',
    slug: 'concedii-absente-ghid',
    description: 'Toate tipurile de concedii în România: medical, maternitate, odihnă, fără plată. Calculul corect al zilelor și indemnizațiilor.',
    category: 'HR_COMPLIANCE',
    level: 'INTERMEDIATE',
    duration: 180,
    price: 39,
    isFree: false,
    tags: ['concedii', 'absențe', 'HR', 'indemnizații'],
  },
  {
    title: 'Contract Individual de Muncă - Model și Clauze',
    slug: 'contract-munca-model-clauze',
    description: 'Cum să redactezi un contract de muncă corect și complet. Include clauze esențiale, confidențialitate, și neconcurență.',
    category: 'HR_COMPLIANCE',
    level: 'BEGINNER',
    duration: 150,
    price: null,
    isFree: true,
    tags: ['contract', 'muncă', 'CIM', 'HR', 'clauze'],
  },
  // Excel & Automation
  {
    title: 'Power BI pentru Finanțe',
    slug: 'power-bi-finante',
    description: 'Creează dashboard-uri financiare profesionale cu Power BI. Conectare date contabile, KPI-uri, și rapoarte interactive.',
    category: 'EXCEL_VBA',
    level: 'ADVANCED',
    duration: 480,
    price: 149,
    isFree: false,
    tags: ['Power BI', 'dashboard', 'finanțe', 'rapoarte', 'KPI'],
  },
  {
    title: 'Excel pentru Contabili - Reconcilieri și Rapoarte',
    slug: 'excel-contabili-reconcilieri',
    description: 'Tehnici Excel avansate pentru contabilitate: reconcilieri bancare, balanțe, jurnale. Formula și automatizări specifice.',
    category: 'EXCEL_VBA',
    level: 'INTERMEDIATE',
    duration: 300,
    price: 69,
    isFree: false,
    tags: ['Excel', 'contabilitate', 'reconciliere', 'rapoarte'],
  },
  // Business & Strategy
  {
    title: 'Planul de Afaceri - De la Idee la Finanțare',
    slug: 'plan-afaceri-idee-finantare',
    description: 'Cum să scrii un plan de afaceri convingător pentru bănci, investitori, sau fonduri europene. Template inclus.',
    category: 'SOFT_SKILLS',
    level: 'BEGINNER',
    duration: 240,
    price: null,
    isFree: true,
    tags: ['plan afaceri', 'start-up', 'finanțare', 'antreprenoriat'],
  },
  {
    title: 'Analiza Cost-Beneficiu pentru Proiecte',
    slug: 'analiza-cost-beneficiu',
    description: 'Metodologia completă pentru analiza cost-beneficiu. Esențial pentru proiecte cu finanțare europeană.',
    category: 'PROJECT_MANAGEMENT',
    level: 'ADVANCED',
    duration: 300,
    price: 99,
    isFree: false,
    tags: ['cost-beneficiu', 'ACB', 'proiecte', 'fonduri'],
  },
  // Safety & Compliance
  {
    title: 'Instrucțiuni SSM Obligatorii',
    slug: 'instructiuni-ssm-obligatorii',
    description: 'Toate instructajele SSM obligatorii: introductiv general, la locul de muncă, periodic. Template-uri și registre.',
    category: 'HSE_SAFETY',
    level: 'BEGINNER',
    duration: 180,
    price: 39,
    isFree: false,
    tags: ['SSM', 'instructaj', 'siguranță', 'obligatorii'],
  },
  {
    title: 'Evaluarea Riscurilor Profesionale',
    slug: 'evaluare-riscuri-profesionale',
    description: 'Metodologia completă de evaluare a riscurilor la locul de muncă. Include matrice de risc și plan de măsuri.',
    category: 'HSE_SAFETY',
    level: 'INTERMEDIATE',
    duration: 240,
    price: 79,
    isFree: false,
    tags: ['evaluare', 'riscuri', 'SSM', 'prevenție'],
  },
  // Digital Transformation
  {
    title: 'Digitalizare pentru IMM-uri - Primii Pași',
    slug: 'digitalizare-imm-primi-pasi',
    description: 'Ghid practic pentru digitalizarea afacerii tale. De la email și cloud până la ERP și automatizări.',
    category: 'SOFT_SKILLS',
    level: 'BEGINNER',
    duration: 240,
    price: null,
    isFree: true,
    tags: ['digitalizare', 'IMM', 'cloud', 'automatizare'],
  },
  {
    title: 'GDPR pentru Afaceri Mici',
    slug: 'gdpr-afaceri-mici',
    description: 'Implementează GDPR corect în firma ta. Checklist complet, template-uri consimțământ, și proceduri obligatorii.',
    category: 'HR_COMPLIANCE',
    level: 'BEGINNER',
    duration: 180,
    price: 39,
    isFree: false,
    tags: ['GDPR', 'protecție date', 'conformitate', 'privacy'],
  },
];

async function seedAdditionalCourses() {
  console.log('📚 Seeding Additional Courses...\n');

  let created = 0;

  for (const course of additionalCourses) {
    const existing = await prisma.lMSCourse.findUnique({
      where: { slug: course.slug },
    });

    if (existing) {
      console.log(`  ⏭️  Exists: ${course.title.substring(0, 40)}...`);
      continue;
    }

    try {
      await prisma.lMSCourse.create({
        data: {
          title: course.title,
          slug: course.slug,
          description: course.description,
          category: course.category as any,
          level: course.level as any,
          duration: course.duration,
          price: course.price,
          isFree: course.isFree,
          language: 'ro',
          tags: course.tags,
          status: 'LMS_PUBLISHED',
          publishedAt: new Date(),
        },
      });
      created++;
      console.log(`  ✅ Created: ${course.title}`);
    } catch (error: any) {
      console.log(`  ❌ Failed: ${course.title} - ${error.message}`);
    }
  }

  const total = await prisma.lMSCourse.count();
  console.log(`\n📊 Summary: Created ${created} courses. Total: ${total}`);
}

async function main() {
  console.log('🚀 Adding Additional Courses to reach 30+ target\n');
  await seedAdditionalCourses();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
