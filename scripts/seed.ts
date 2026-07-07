import { PrismaClient, Tier, InvoiceType, InvoiceStatus, DocStatus, UserRole } from '../backend/prisma/generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Test user credentials - DISPLAYED ON LOGIN PAGE
const TEST_USERS = [
  {
    email: 'demo@documentiulia.ro',
    password: 'Demo2025!',  // Plain text - will be hashed
    name: 'Demo User',
    company: 'Demo Company SRL',
    cui: 'RO12345678',
    tier: Tier.PRO,
    role: UserRole.USER,
    language: 'ro',
  },
  {
    email: 'admin@documentiulia.ro',
    password: 'Admin2025!',
    name: 'Administrator',
    company: 'DocumentIulia Admin',
    cui: 'RO87654321',
    tier: Tier.BUSINESS,
    role: UserRole.ADMIN,
    language: 'ro',
  },
  {
    email: 'contabil@documentiulia.ro',
    password: 'Contabil2025!',
    name: 'Expert Contabil',
    company: 'Cabinet Contabil Test',
    cui: 'RO11223344',
    tier: Tier.BUSINESS,
    role: UserRole.ACCOUNTANT,
    language: 'ro',
  },
  {
    email: 'free@documentiulia.ro',
    password: 'Free2025!',
    name: 'Free User',
    company: 'Free Test SRL',
    cui: 'RO55667788',
    tier: Tier.FREE,
    role: UserRole.USER,
    language: 'ro',
  },
  {
    email: 'test@example.com',
    password: 'Test2025!',
    name: 'Test User EN',
    company: 'Test Company Ltd',
    cui: 'RO99887766',
    tier: Tier.PRO,
    role: UserRole.USER,
    language: 'en',
  },
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding database with test users...');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   TEST USER CREDENTIALS (copy these for login testing)');
  console.log('═══════════════════════════════════════════════════════════');

  const createdUsers = [];

  for (const userData of TEST_USERS) {
    const hashedPassword = await hashPassword(userData.password);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: hashedPassword,
        name: userData.name,
        company: userData.company,
        cui: userData.cui,
        tier: userData.tier,
        role: userData.role,
        language: userData.language,
      },
      create: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        company: userData.company,
        cui: userData.cui,
        tier: userData.tier,
        role: userData.role,
        language: userData.language,
      },
    });

    createdUsers.push(user);
    console.log(`   ✅ ${userData.role.padEnd(10)} | ${userData.email.padEnd(30)} | ${userData.password}`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Create sample documents for demo user
  const demoUser = createdUsers.find(u => u.email === 'demo@documentiulia.ro');

  if (demoUser) {
    // Create sample documents
    const doc1 = await prisma.document.upsert({
      where: { id: 'demo-doc-001' },
      update: {},
      create: {
        id: 'demo-doc-001',
        userId: demoUser.id,
        filename: 'factura_furnizor_001.pdf',
        fileUrl: '/uploads/demo/factura_furnizor_001.pdf',
        fileType: 'application/pdf',
        fileSize: 102400,
        status: DocStatus.COMPLETED,
        ocrText: 'Factura fiscala nr. 001 din 15.01.2025\nFurnizor: Exemplu SRL\nCIF: RO12345678\nTotal: 1,210.00 RON (TVA inclus)',
      },
    });

    const doc2 = await prisma.document.upsert({
      where: { id: 'demo-doc-002' },
      update: {},
      create: {
        id: 'demo-doc-002',
        userId: demoUser.id,
        filename: 'factura_client_001.pdf',
        fileUrl: '/uploads/demo/factura_client_001.pdf',
        fileType: 'application/pdf',
        fileSize: 98765,
        status: DocStatus.COMPLETED,
        ocrText: 'Factura fiscala nr. FV-2025-0001\nClient: Beneficiar SRL\nCIF: RO87654321\nTotal: 5,950.00 RON (TVA inclus)',
      },
    });

    console.log('📄 Created sample documents');

    // Create sample invoices
    const invoice1 = await prisma.invoice.upsert({
      where: { id: 'demo-inv-001' },
      update: {},
      create: {
        id: 'demo-inv-001',
        userId: demoUser.id,
        documentId: doc1.id,
        invoiceNumber: 'FACT-2025-00001',
        invoiceDate: new Date('2025-01-15'),
        dueDate: new Date('2025-02-15'),
        type: InvoiceType.RECEIVED,
        status: InvoiceStatus.PENDING,
        partnerName: 'Furnizor Exemplu SRL',
        partnerCui: 'RO12345678',
        partnerAddress: 'Str. Exemplu Nr. 10, București, Sector 1',
        netAmount: 1000.00,
        vatRate: 21.00,
        vatAmount: 210.00,
        grossAmount: 1210.00,
        currency: 'RON',
      },
    });

    const invoice2 = await prisma.invoice.upsert({
      where: { id: 'demo-inv-002' },
      update: {},
      create: {
        id: 'demo-inv-002',
        userId: demoUser.id,
        documentId: doc2.id,
        invoiceNumber: 'FV-2025-0001',
        invoiceDate: new Date('2025-01-20'),
        dueDate: new Date('2025-02-20'),
        type: InvoiceType.ISSUED,
        status: InvoiceStatus.PENDING,
        partnerName: 'Client Beneficiar SRL',
        partnerCui: 'RO87654321',
        partnerAddress: 'Bd. Unirii Nr. 20, București, Sector 3',
        netAmount: 5000.00,
        vatRate: 19.00,
        vatAmount: 950.00,
        grossAmount: 5950.00,
        currency: 'RON',
      },
    });

    const invoice3 = await prisma.invoice.upsert({
      where: { id: 'demo-inv-003' },
      update: {},
      create: {
        id: 'demo-inv-003',
        userId: demoUser.id,
        invoiceNumber: 'FACT-2024-00456',
        invoiceDate: new Date('2024-12-20'),
        dueDate: new Date('2025-01-20'),
        type: InvoiceType.RECEIVED,
        status: InvoiceStatus.PAID,
        partnerName: 'Alt Furnizor SRL',
        partnerCui: 'RO55443322',
        partnerAddress: 'Calea Victoriei 100, București',
        netAmount: 2500.00,
        vatRate: 21.00,
        vatAmount: 525.00,
        grossAmount: 3025.00,
        currency: 'RON',
      },
    });

    console.log('📋 Created sample invoices');

    // Create sample AI queries
    await prisma.aIQuery.upsert({
      where: { id: 'demo-ai-001' },
      update: {},
      create: {
        id: 'demo-ai-001',
        userId: demoUser.id,
        query: 'Care este totalul TVA de plată pentru luna ianuarie 2025?',
        response: 'Pe baza facturilor înregistrate, totalul TVA colectat este de 950 RON, iar TVA deductibil este de 735 RON. TVA de plată pentru ianuarie 2025 este de 215 RON.',
        modelUsed: 'grok-beta',
        tokensUsed: 256,
      },
    });

    await prisma.aIQuery.upsert({
      where: { id: 'demo-ai-002' },
      update: {},
      create: {
        id: 'demo-ai-002',
        userId: demoUser.id,
        query: 'Arată-mi facturile neîncasate',
        response: 'Ai 2 facturi neîncasate:\n1. FV-2025-0001 - Client Beneficiar SRL - 5,950 RON - scadent 20.02.2025\n2. FACT-2025-00001 - Furnizor Exemplu SRL - 1,210 RON - scadent 15.02.2025',
        modelUsed: 'grok-beta',
        tokensUsed: 189,
      },
    });

    console.log('🤖 Created sample AI queries');

    // Create sample audit logs
    await prisma.auditLog.createMany({
      data: [
        {
          userId: demoUser.id,
          action: 'USER_LOGIN',
          entity: 'User',
          entityId: demoUser.id,
          details: { method: 'jwt', ip: '127.0.0.1' },
        },
        {
          userId: demoUser.id,
          action: 'DOCUMENT_UPLOAD',
          entity: 'Document',
          entityId: doc1.id,
          details: { filename: 'factura_furnizor_001.pdf', size: 102400 },
        },
        {
          userId: demoUser.id,
          action: 'INVOICE_CREATE',
          entity: 'Invoice',
          entityId: invoice1.id,
          details: { invoiceNumber: 'FACT-2025-00001', amount: 1210.00 },
        },
      ],
      skipDuplicates: true,
    });

    console.log('📝 Created sample audit logs');
  }

  console.log('');
  console.log('✅ Database seeding completed successfully!');
  console.log('');
  console.log('🔐 You can now login with any of the test credentials above.');
  console.log('   Recommended for testing: demo@documentiulia.ro / Demo2025!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
