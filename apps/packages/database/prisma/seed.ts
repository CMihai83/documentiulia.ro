import { PrismaClient, CompanyRole, ClientType, ProductType, ExpenseCategory, ProjectStatus, TaxType, CourseDifficulty, BlogPostStatus } from '@prisma/client';
import { blogCategories, blogPosts, forumTopics as blogForumTopics } from './seed-blog';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { clerkId: 'user_test_admin' },
    update: {},
    create: {
      clerkId: 'user_test_admin',
      email: 'admin@documentiulia.ro',
      firstName: 'Admin',
      lastName: 'Test',
      phone: '+40721234567',
      locale: 'ro',
      timezone: 'Europe/Bucharest',
    },
  });
  console.log('✅ Created user:', user.email);

  // Create test company
  const company = await prisma.company.upsert({
    where: { cui: 'RO12345678' },
    update: {},
    create: {
      name: 'Test Company SRL',
      cui: 'RO12345678',
      regCom: 'J40/123/2024',
      address: 'Str. Test nr. 1',
      city: 'București',
      county: 'București',
      postalCode: '010101',
      country: 'RO',
      email: 'contact@testcompany.ro',
      phone: '+40212345678',
      bankName: 'Banca Transilvania',
      iban: 'RO49BTRL0000000000000001',
      vatPayer: true,
      vatNumber: 'RO12345678',
      vatRate: 19,
      currency: 'RON',
      subscriptionPlan: 'professional',
    },
  });
  console.log('✅ Created company:', company.name);

  // Link user to company
  await prisma.companyUser.upsert({
    where: {
      userId_companyId: { userId: user.id, companyId: company.id },
    },
    update: {},
    create: {
      userId: user.id,
      companyId: company.id,
      role: CompanyRole.OWNER,
      canManageUsers: true,
      canManageFinances: true,
      canManageSettings: true,
      canViewReports: true,
    },
  });
  console.log('✅ Linked user to company');

  // Create tax codes (Romanian VAT)
  const taxCodes = [
    { code: 'TVA19', name: 'TVA 19%', rate: 19, type: TaxType.VAT_STANDARD, saftCode: 'S', isDefault: true },
    { code: 'TVA9', name: 'TVA 9%', rate: 9, type: TaxType.VAT_REDUCED_9, saftCode: 'R9' },
    { code: 'TVA5', name: 'TVA 5%', rate: 5, type: TaxType.VAT_REDUCED_5, saftCode: 'R5' },
    { code: 'TVA0', name: 'TVA 0%', rate: 0, type: TaxType.VAT_ZERO, saftCode: 'Z' },
    { code: 'SCUTIT', name: 'Scutit de TVA', rate: 0, type: TaxType.VAT_EXEMPT, saftCode: 'E' },
  ];

  for (const tc of taxCodes) {
    await prisma.taxCode.upsert({
      where: { companyId_code: { companyId: company.id, code: tc.code } },
      update: {},
      create: {
        companyId: company.id,
        code: tc.code,
        name: tc.name,
        rate: tc.rate,
        type: tc.type,
        saftCode: tc.saftCode,
        isDefault: tc.isDefault || false,
      },
    });
  }
  console.log('✅ Created tax codes');

  // Create test clients
  const clients = [
    {
      name: 'Client Alpha SRL',
      cui: 'RO11111111',
      type: ClientType.BUSINESS,
      contactName: 'Ion Popescu',
      contactEmail: 'ion@alpha.ro',
      city: 'Cluj-Napoca',
      county: 'Cluj',
    },
    {
      name: 'Client Beta SA',
      cui: 'RO22222222',
      type: ClientType.BUSINESS,
      contactName: 'Maria Ionescu',
      contactEmail: 'maria@beta.ro',
      city: 'Timișoara',
      county: 'Timiș',
    },
    {
      name: 'Gheorghe Vasile',
      type: ClientType.INDIVIDUAL,
      contactName: 'Gheorghe Vasile',
      contactEmail: 'gheorghe@email.com',
      city: 'Brașov',
      county: 'Brașov',
    },
  ];

  for (const c of clients) {
    await prisma.client.create({
      data: {
        companyId: company.id,
        name: c.name,
        cui: c.cui,
        type: c.type,
        contactName: c.contactName,
        contactEmail: c.contactEmail,
        city: c.city,
        county: c.county,
        country: 'RO',
        defaultPaymentTerms: 30,
      },
    });
  }
  console.log('✅ Created clients');

  // Create test products
  const products = [
    { name: 'Consultanță IT', type: ProductType.SERVICE, unitPrice: 500, unit: 'oră' },
    { name: 'Dezvoltare Software', type: ProductType.SERVICE, unitPrice: 800, unit: 'oră' },
    { name: 'Audit Financiar', type: ProductType.SERVICE, unitPrice: 1500, unit: 'zi' },
    { name: 'Laptop Dell', type: ProductType.PRODUCT, unitPrice: 4500, unit: 'buc', trackInventory: true, stockQuantity: 10 },
    { name: 'Monitor 27"', type: ProductType.PRODUCT, unitPrice: 1200, unit: 'buc', trackInventory: true, stockQuantity: 25 },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: {
        companyId: company.id,
        name: p.name,
        type: p.type,
        unitPrice: p.unitPrice,
        unit: p.unit,
        vatRate: 19,
        trackInventory: p.trackInventory || false,
        stockQuantity: p.stockQuantity || 0,
        currency: 'RON',
      },
    });
  }
  console.log('✅ Created products');

  // Create test expenses
  const expenses = [
    { description: 'Chirie birou Ianuarie', category: ExpenseCategory.RENT, amount: 2500, vendorName: 'Imobiliare SRL' },
    { description: 'Factura electricitate', category: ExpenseCategory.UTILITIES, amount: 450, vendorName: 'Enel' },
    { description: 'Rechizite birou', category: ExpenseCategory.SUPPLIES, amount: 350, vendorName: 'Papetărie SRL' },
    { description: 'Deplasare client Cluj', category: ExpenseCategory.TRAVEL, amount: 800, vendorName: 'CFR' },
  ];

  for (const e of expenses) {
    await prisma.expense.create({
      data: {
        companyId: company.id,
        description: e.description,
        category: e.category,
        amount: e.amount,
        vatAmount: e.amount * 0.19,
        vatRate: 19,
        vendorName: e.vendorName,
        expenseDate: new Date(),
        isPaid: true,
        currency: 'RON',
      },
    });
  }
  console.log('✅ Created expenses');

  // Create test project
  await prisma.project.create({
    data: {
      companyId: company.id,
      name: 'Proiect Implementare ERP',
      description: 'Implementare sistem ERP pentru client',
      code: 'PRJ-001',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-30'),
      budget: 50000,
      status: ProjectStatus.IN_PROGRESS,
      currency: 'RON',
    },
  });
  console.log('✅ Created project');

  // Create bank account
  await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      name: 'Cont Principal RON',
      bankName: 'Banca Transilvania',
      iban: 'RO49BTRL0000000000000001',
      currency: 'RON',
      balance: 25000,
      balanceDate: new Date(),
      isDefault: true,
    },
  });
  console.log('✅ Created bank account');

  // Create e-Factura config
  await prisma.efacturaConfig.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      isEnabled: false,
      autoUpload: false,
      autoDownload: false,
    },
  });
  console.log('✅ Created e-Factura config');

  // Create forum categories
  const forumCategories = [
    { name: 'Contabilitate', slug: 'contabilitate', description: 'Discuții despre contabilitate și raportări financiare', icon: 'calculator', color: '#3B82F6', sortOrder: 1 },
    { name: 'Fiscalitate', slug: 'fiscalitate', description: 'Întrebări despre taxe, TVA, impozite și declarații', icon: 'receipt', color: '#10B981', sortOrder: 2 },
    { name: 'e-Factura', slug: 'e-factura', description: 'Ajutor și discuții despre sistemul e-Factura ANAF', icon: 'file-invoice', color: '#F59E0B', sortOrder: 3 },
    { name: 'SAF-T', slug: 'saft', description: 'Implementare și utilizare raportări SAF-T', icon: 'database', color: '#8B5CF6', sortOrder: 4 },
    { name: 'Legislație', slug: 'legislatie', description: 'Noutăți și interpretări ale legislației fiscale', icon: 'scale-balanced', color: '#EF4444', sortOrder: 5 },
    { name: 'General', slug: 'general', description: 'Discuții generale despre platformă și comunitate', icon: 'comments', color: '#6B7280', sortOrder: 6 },
  ];

  for (const fc of forumCategories) {
    await prisma.forumCategory.upsert({
      where: { slug: fc.slug },
      update: {},
      create: fc,
    });
  }
  console.log('✅ Created forum categories');

  // Create sample courses
  const courses = [
    {
      title: 'Introducere în e-Factura',
      slug: 'introducere-e-factura',
      description: 'Ghid complet pentru înțelegerea și utilizarea sistemului e-Factura obligatoriu pentru toate firmele din România.',
      shortDescription: 'Învață cum să generezi și să trimiți facturi electronice către ANAF',
      category: 'e-Factura',
      difficulty: CourseDifficulty.BEGINNER,
      duration: 120,
      isFree: true,
      isPublished: true,
      publishedAt: new Date(),
      tags: ['e-factura', 'anaf', 'xml', 'ubl'],
      instructorId: user.id,
    },
    {
      title: 'SAF-T pentru Contabili',
      slug: 'saft-pentru-contabili',
      description: 'Curs detaliat despre generarea, validarea și transmiterea fișierelor SAF-T către ANAF.',
      shortDescription: 'Stăpânește raportarea SAF-T pas cu pas',
      category: 'SAF-T',
      difficulty: CourseDifficulty.INTERMEDIATE,
      duration: 180,
      isFree: false,
      price: 149,
      isPublished: true,
      publishedAt: new Date(),
      tags: ['saft', 'raportare', 'xml'],
      instructorId: user.id,
    },
    {
      title: 'Fiscalitate pentru Antreprenori',
      slug: 'fiscalitate-antreprenori',
      description: 'Tot ce trebuie să știi despre obligațiile fiscale ale unei firme în România: TVA, impozit pe profit, contribuții.',
      shortDescription: 'Înțelege obligațiile fiscale ale firmei tale',
      category: 'Fiscalitate',
      difficulty: CourseDifficulty.BEGINNER,
      duration: 240,
      isFree: true,
      isPublished: true,
      publishedAt: new Date(),
      tags: ['tva', 'impozit', 'contributii', 'declaratii'],
      instructorId: user.id,
    },
    {
      title: 'Contabilitate Avansată',
      slug: 'contabilitate-avansata',
      description: 'Tehnici avansate de contabilitate, închidere de an fiscal, și optimizare fiscală legală.',
      shortDescription: 'Tehnici avansate pentru contabili profesioniști',
      category: 'Contabilitate',
      difficulty: CourseDifficulty.ADVANCED,
      duration: 360,
      isFree: false,
      price: 299,
      isPublished: true,
      publishedAt: new Date(),
      tags: ['contabilitate', 'inchidere-an', 'optimizare'],
      instructorId: user.id,
    },
  ];

  for (const course of courses) {
    const created = await prisma.course.upsert({
      where: { slug: course.slug },
      update: {},
      create: course,
    });

    // Add sample lessons for free courses
    if (course.isFree) {
      await prisma.courseLesson.createMany({
        skipDuplicates: true,
        data: [
          {
            courseId: created.id,
            title: 'Introducere',
            slug: 'introducere',
            content: '# Introducere\n\nBine ați venit la acest curs! Vom acoperi bazele și conceptele fundamentale.',
            duration: 15,
            sortOrder: 0,
            isFree: true,
            isPublished: true,
          },
          {
            courseId: created.id,
            title: 'Concepte de Bază',
            slug: 'concepte-baza',
            content: '# Concepte de Bază\n\nÎn această lecție vom explora conceptele de bază necesare pentru înțelegerea materialului.',
            duration: 30,
            sortOrder: 1,
            isFree: true,
            isPublished: true,
          },
          {
            courseId: created.id,
            title: 'Practică și Exemple',
            slug: 'practica-exemple',
            content: '# Practică și Exemple\n\nHai să aplicăm ceea ce am învățat prin exemple practice.',
            duration: 45,
            sortOrder: 2,
            isFree: false,
            isPublished: true,
          },
        ],
      });
    }
  }
  console.log('✅ Created courses and lessons');

  // Create blog categories
  for (const bc of blogCategories) {
    await prisma.blogCategory.upsert({
      where: { slug: bc.slug },
      update: {},
      create: bc,
    });
  }
  console.log('✅ Created blog categories');

  // Create blog posts
  for (const post of blogPosts) {
    const category = await prisma.blogCategory.findUnique({
      where: { slug: post.categorySlug },
    });

    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        categoryId: category?.id,
        tags: post.tags,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        readingTime: post.readingTime,
        wordCount: post.wordCount,
        authorId: user.id,
        status: BlogPostStatus.PUBLISHED,
        publishedAt: new Date(),
        language: 'ro',
      },
    });
  }
  console.log('✅ Created blog posts');

  // Create additional forum topics
  for (const topic of blogForumTopics) {
    const category = await prisma.forumCategory.findUnique({
      where: { slug: topic.categorySlug },
    });

    if (category) {
      const slug = topic.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);

      await prisma.forumTopic.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug,
          },
        },
        update: {},
        create: {
          title: topic.title,
          slug,
          content: topic.content,
          tags: topic.tags,
          categoryId: category.id,
          authorId: user.id,
        },
      });

      // Update category count
      await prisma.forumCategory.update({
        where: { id: category.id },
        data: { topicCount: { increment: 1 } },
      });
    }
  }
  console.log('✅ Created forum topics');

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Test credentials:');
  console.log('  User: admin@documentiulia.ro');
  console.log('  Company: Test Company SRL (CUI: RO12345678)');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
