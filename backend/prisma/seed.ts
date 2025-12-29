import { PrismaClient, Tier, InvoiceType, InvoiceStatus, ReportStatus, EmployeeStatus, PayrollStatus, UserRole, OrgRole, PartnerType, DocStatus, PaymentMethod, PaymentRecordStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash passwords (using cost factor 12 for production-like security)
  const testPassword = await bcrypt.hash('Test123456', 12);
  const adminPassword = await bcrypt.hash('Admin123456', 12);
  const accountantPassword = await bcrypt.hash('Conta123456', 12);

  // ===== CREATE TEST USERS =====

  // 1. Admin User (BUSINESS tier, ADMIN role)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@documentiulia.ro' },
    update: { password: adminPassword },
    create: {
      email: 'admin@documentiulia.ro',
      password: adminPassword,
      name: 'Administrator Test',
      company: 'DocumentIulia Admin SRL',
      cui: 'RO11111111',
      address: 'Str. Admin 1, București, Sector 1',
      role: UserRole.ADMIN,
      tier: Tier.BUSINESS,
      language: 'ro',
    },
  });
  console.log(`✅ Created admin user: ${adminUser.email}`);

  // 2. Accountant User (PRO tier, ACCOUNTANT role)
  const accountantUser = await prisma.user.upsert({
    where: { email: 'contabil@documentiulia.ro' },
    update: { password: accountantPassword },
    create: {
      email: 'contabil@documentiulia.ro',
      password: accountantPassword,
      name: 'Contabil Expert',
      company: 'Contabilitate Pro SRL',
      cui: 'RO22222222',
      address: 'Str. Contabililor 22, Cluj-Napoca',
      role: UserRole.ACCOUNTANT,
      tier: Tier.PRO,
      language: 'ro',
    },
  });
  console.log(`✅ Created accountant user: ${accountantUser.email}`);

  // 3. Regular Test User (FREE tier, USER role)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@documentiulia.ro' },
    update: { password: testPassword },
    create: {
      email: 'test@documentiulia.ro',
      password: testPassword,
      name: 'Utilizator Test',
      company: 'Test Company SRL',
      cui: 'RO33333333',
      address: 'Str. Testului 33, Timișoara',
      role: UserRole.USER,
      tier: Tier.FREE,
      language: 'ro',
    },
  });
  console.log(`✅ Created test user: ${testUser.email}`);

  // 4. Demo User (for backward compatibility)
  const user = await prisma.user.upsert({
    where: { email: 'demo@documentiulia.ro' },
    update: { password: testPassword },
    create: {
      clerkId: 'demo_clerk_id',
      email: 'demo@documentiulia.ro',
      password: testPassword,
      name: 'Demo Company SRL',
      company: 'Demo Company SRL',
      cui: 'RO12345678',
      address: 'Str. Demo 100, București, Sector 2',
      tier: Tier.PRO,
      language: 'ro',
    },
  });
  console.log(`✅ Created demo user: ${user.email}`);

  // ===== CREATE TEST ORGANIZATION =====
  const testOrg = await prisma.organization.upsert({
    where: { slug: 'test-company' },
    update: {},
    create: {
      name: 'Test Company SRL',
      slug: 'test-company',
      cui: 'RO44444444',
      regCom: 'J40/1234/2024',
      address: 'Str. Organizației 44',
      city: 'București',
      county: 'București',
      postalCode: '010101',
      phone: '+40721234567',
      email: 'contact@testcompany.ro',
      website: 'https://testcompany.ro',
      bankName: 'Banca Transilvania',
      bankAccount: 'RO49BTRLRONCRT0123456789',
      tier: Tier.BUSINESS,
      maxUsers: 10,
      maxInvoices: 100,
      maxDocuments: 500,
      isActive: true,
      activatedAt: new Date(),
    },
  });
  console.log(`✅ Created test organization: ${testOrg.name}`);

  // Add users as members of the organization
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: testOrg.id } },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: testOrg.id,
      role: OrgRole.OWNER,
      canManageUsers: true,
      canManageInvoices: true,
      canManageDocuments: true,
      canViewReports: true,
      canSubmitAnaf: true,
      canExportData: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: accountantUser.id, organizationId: testOrg.id } },
    update: {},
    create: {
      userId: accountantUser.id,
      organizationId: testOrg.id,
      role: OrgRole.ACCOUNTANT,
      canManageUsers: false,
      canManageInvoices: true,
      canManageDocuments: true,
      canViewReports: true,
      canSubmitAnaf: true,
      canExportData: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: testUser.id, organizationId: testOrg.id } },
    update: {},
    create: {
      userId: testUser.id,
      organizationId: testOrg.id,
      role: OrgRole.MEMBER,
      canManageUsers: false,
      canManageInvoices: true,
      canManageDocuments: true,
      canViewReports: true,
      canSubmitAnaf: false,
      canExportData: true,
    },
  });

  // Add demo user to organization
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: testOrg.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: testOrg.id,
      role: OrgRole.OWNER,
      canManageUsers: true,
      canManageInvoices: true,
      canManageDocuments: true,
      canViewReports: true,
      canSubmitAnaf: true,
      canExportData: true,
    },
  });

  console.log(`✅ Added users to organization with different roles`);

  // ===== CREATE PARTNERS =====
  const partners = await Promise.all([
    prisma.partner.upsert({
      where: { id: 'partner-alpha' },
      update: {},
      create: {
        id: 'partner-alpha',
        userId: user.id,
        name: 'Client Alpha SRL',
        cui: 'RO87654321',
        address: 'Str. Exemplu 123, București',
        city: 'București',
        county: 'București',
        email: 'contact@alpha.ro',
        phone: '+40721111111',
        type: PartnerType.CUSTOMER,
        isActive: true,
      },
    }),
    prisma.partner.upsert({
      where: { id: 'partner-beta' },
      update: {},
      create: {
        id: 'partner-beta',
        userId: user.id,
        name: 'Client Beta SA',
        cui: 'RO11223344',
        address: 'Bd. Victoriei 45, Cluj-Napoca',
        city: 'Cluj-Napoca',
        county: 'Cluj',
        email: 'contact@beta.ro',
        phone: '+40722222222',
        type: PartnerType.CUSTOMER,
        isActive: true,
      },
    }),
    prisma.partner.upsert({
      where: { id: 'partner-gamma' },
      update: {},
      create: {
        id: 'partner-gamma',
        userId: user.id,
        name: 'Furnizor Gamma SRL',
        cui: 'RO55667788',
        address: 'Str. Fabricii 78, Timișoara',
        city: 'Timișoara',
        county: 'Timiș',
        email: 'contact@gamma.ro',
        phone: '+40723333333',
        type: PartnerType.SUPPLIER,
        isActive: true,
      },
    }),
    prisma.partner.upsert({
      where: { id: 'partner-delta' },
      update: {},
      create: {
        id: 'partner-delta',
        userId: user.id,
        name: 'Furnizor Delta SA',
        cui: 'RO99887766',
        address: 'Str. Industriei 12, Iași',
        city: 'Iași',
        county: 'Iași',
        email: 'contact@delta.ro',
        phone: '+40724444444',
        type: PartnerType.SUPPLIER,
        isActive: true,
      },
    }),
    prisma.partner.upsert({
      where: { id: 'partner-omega' },
      update: {},
      create: {
        id: 'partner-omega',
        userId: user.id,
        name: 'Omega Services SRL',
        cui: 'RO12121212',
        address: 'Str. Serviciilor 55, Brașov',
        city: 'Brașov',
        county: 'Brașov',
        email: 'contact@omega.ro',
        phone: '+40725555555',
        type: PartnerType.BOTH,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${partners.length} partners`);

  // ===== CLEANUP OLD DATA =====
  // Delete old invoices, payments, and documents to prevent duplicates
  await prisma.payment.deleteMany({ where: { invoice: { userId: user.id } } });
  await prisma.invoice.deleteMany({ where: { userId: user.id } });
  await prisma.document.deleteMany({ where: { userId: user.id } });
  console.log('🧹 Cleaned up old invoices, payments, and documents');

  // Create sample invoices
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        userId: user.id,
        invoiceNumber: 'INV-2025-001',
        invoiceDate: new Date('2025-01-05'),
        dueDate: new Date('2025-02-05'),
        type: InvoiceType.ISSUED,
        status: InvoiceStatus.PAID,
        partnerName: 'Client Alpha SRL',
        partnerCui: 'RO87654321',
        partnerAddress: 'Str. Exemplu 123, București',
        netAmount: 10000,
        vatRate: 21,
        vatAmount: 2100,
        grossAmount: 12100,
        currency: 'RON',
        spvSubmitted: true,
        spvSubmittedAt: new Date('2025-01-06'),
      },
    }),
    prisma.invoice.create({
      data: {
        userId: user.id,
        invoiceNumber: 'INV-2025-002',
        invoiceDate: new Date('2025-01-10'),
        dueDate: new Date('2025-02-10'),
        type: InvoiceType.ISSUED,
        status: InvoiceStatus.SUBMITTED,
        partnerName: 'Client Beta SA',
        partnerCui: 'RO11223344',
        partnerAddress: 'Bd. Victoriei 45, Cluj-Napoca',
        netAmount: 25000,
        vatRate: 21,
        vatAmount: 5250,
        grossAmount: 30250,
        currency: 'RON',
        spvSubmitted: true,
        spvSubmittedAt: new Date('2025-01-11'),
      },
    }),
    prisma.invoice.create({
      data: {
        userId: user.id,
        invoiceNumber: 'REC-2025-001',
        invoiceDate: new Date('2025-01-08'),
        type: InvoiceType.RECEIVED,
        status: InvoiceStatus.APPROVED,
        partnerName: 'Furnizor Gamma SRL',
        partnerCui: 'RO55667788',
        partnerAddress: 'Str. Fabricii 78, Timișoara',
        netAmount: 5000,
        vatRate: 21,
        vatAmount: 1050,
        grossAmount: 6050,
        currency: 'RON',
      },
    }),
    prisma.invoice.create({
      data: {
        userId: user.id,
        invoiceNumber: 'REC-2025-002',
        invoiceDate: new Date('2025-01-15'),
        type: InvoiceType.RECEIVED,
        status: InvoiceStatus.APPROVED,
        partnerName: 'Furnizor Delta SA',
        partnerCui: 'RO99887766',
        partnerAddress: 'Str. Industriei 12, Iași',
        netAmount: 3000,
        vatRate: 11, // Reduced rate for food
        vatAmount: 330,
        grossAmount: 3330,
        currency: 'RON',
      },
    }),
  ]);

  console.log(`✅ Created ${invoices.length} sample invoices`);

  // ===== CREATE DOCUMENTS =====
  const documents = await Promise.all([
    prisma.document.create({
      data: {
        userId: user.id,
        organizationId: testOrg.id,
        filename: 'factura-alpha-001.pdf',
        fileUrl: '/uploads/factura-alpha-001.pdf',
        fileType: 'application/pdf',
        fileSize: 245000,
        status: DocStatus.COMPLETED,
        ocrData: { vendor: 'Client Alpha SRL', total: 12100, currency: 'RON' },
        extractedText: 'FACTURA FISCALA Nr. INV-2025-001\nClient Alpha SRL\nTotal: 12,100 RON',
        confidence: 0.98,
        processedAt: new Date('2025-01-05'),
      },
    }),
    prisma.document.create({
      data: {
        userId: user.id,
        organizationId: testOrg.id,
        filename: 'factura-beta-002.pdf',
        fileUrl: '/uploads/factura-beta-002.pdf',
        fileType: 'application/pdf',
        fileSize: 312000,
        status: DocStatus.COMPLETED,
        ocrData: { vendor: 'Client Beta SA', total: 30250, currency: 'RON' },
        extractedText: 'FACTURA FISCALA Nr. INV-2025-002\nClient Beta SA\nTotal: 30,250 RON',
        confidence: 0.96,
        processedAt: new Date('2025-01-10'),
      },
    }),
    prisma.document.create({
      data: {
        userId: user.id,
        organizationId: testOrg.id,
        filename: 'chitanta-gamma-001.pdf',
        fileUrl: '/uploads/chitanta-gamma-001.pdf',
        fileType: 'application/pdf',
        fileSize: 128000,
        status: DocStatus.COMPLETED,
        ocrData: { vendor: 'Furnizor Gamma SRL', total: 6050, currency: 'RON' },
        extractedText: 'FACTURA Nr. REC-2025-001\nFurnizor Gamma SRL\nTotal: 6,050 RON',
        confidence: 0.95,
        processedAt: new Date('2025-01-08'),
      },
    }),
    prisma.document.create({
      data: {
        userId: user.id,
        organizationId: testOrg.id,
        filename: 'document-pending.jpg',
        fileUrl: '/uploads/document-pending.jpg',
        fileType: 'image/jpeg',
        fileSize: 1850000,
        status: DocStatus.PENDING,
      },
    }),
  ]);

  console.log(`✅ Created ${documents.length} sample documents`);

  // ===== CREATE PAYMENTS =====
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        invoiceId: invoices[0].id, // INV-2025-001 - PAID
        amount: 12100,
        currency: 'RON',
        paymentDate: new Date('2025-01-20'),
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'BT-2025-0120-001',
        description: 'Plată integrală factură INV-2025-001',
        bankName: 'Banca Transilvania',
        bankAccount: 'RO49BTRLRONCRT0123456789',
        status: PaymentRecordStatus.COMPLETED,
      },
    }),
    prisma.payment.create({
      data: {
        invoiceId: invoices[1].id, // INV-2025-002 - partial payment
        amount: 15000,
        currency: 'RON',
        paymentDate: new Date('2025-01-25'),
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'BT-2025-0125-002',
        description: 'Avans factură INV-2025-002',
        bankName: 'Banca Transilvania',
        bankAccount: 'RO49BTRLRONCRT0123456789',
        status: PaymentRecordStatus.COMPLETED,
      },
    }),
    prisma.payment.create({
      data: {
        invoiceId: invoices[2].id, // REC-2025-001 - supplier payment
        amount: 6050,
        currency: 'RON',
        paymentDate: new Date('2025-01-22'),
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'BT-2025-0122-003',
        description: 'Plată furnizor Gamma SRL',
        bankName: 'Banca Transilvania',
        bankAccount: 'RO49BTRLRONCRT0123456789',
        status: PaymentRecordStatus.COMPLETED,
      },
    }),
  ]);

  console.log(`✅ Created ${payments.length} sample payments`);

  // Create VAT report
  const vatReport = await prisma.vATReport.upsert({
    where: { userId_period: { userId: user.id, period: '2025-01' } },
    update: {},
    create: {
      userId: user.id,
      period: '2025-01',
      vatCollected: 7350, // Sum of issued invoices VAT
      vatDeductible: 1380, // Sum of received invoices VAT
      vatPayable: 5970, // Difference
      vatRate: 21,
      status: ReportStatus.DRAFT,
    },
  });

  console.log(`✅ Created VAT report for ${vatReport.period}`);

  // Create SAF-T report
  const saftReport = await prisma.sAFTReport.upsert({
    where: { userId_period: { userId: user.id, period: '2025-01' } },
    update: {},
    create: {
      userId: user.id,
      period: '2025-01',
      reportType: 'D406',
      status: ReportStatus.DRAFT,
    },
  });

  console.log(`✅ Created SAF-T D406 report for ${saftReport.period}`);

  // Create employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        userId: user.id,
        firstName: 'Ion',
        lastName: 'Popescu',
        email: 'ion.popescu@demo.ro',
        cnp: '1850315123456',
        position: 'Software Developer',
        department: 'IT',
        hireDate: new Date('2023-03-15'),
        salary: 8500,
        contractType: 'FULL_TIME',
        status: EmployeeStatus.ACTIVE,
      },
    }),
    prisma.employee.create({
      data: {
        userId: user.id,
        firstName: 'Maria',
        lastName: 'Ionescu',
        email: 'maria.ionescu@demo.ro',
        cnp: '2900720654321',
        position: 'Contabil',
        department: 'Finance',
        hireDate: new Date('2022-08-01'),
        salary: 7000,
        contractType: 'FULL_TIME',
        status: EmployeeStatus.ACTIVE,
      },
    }),
    prisma.employee.create({
      data: {
        userId: user.id,
        firstName: 'Alexandru',
        lastName: 'Vasile',
        email: 'alex.vasile@demo.ro',
        position: 'Project Manager',
        department: 'Management',
        hireDate: new Date('2024-01-10'),
        salary: 10000,
        contractType: 'FULL_TIME',
        status: EmployeeStatus.ACTIVE,
      },
    }),
  ]);

  console.log(`✅ Created ${employees.length} employees`);

  // Create payroll records
  for (const employee of employees) {
    const grossSalary = Number(employee.salary);
    const taxes = grossSalary * 0.1; // 10% income tax
    const contributions = grossSalary * 0.35; // 35% social contributions
    const netSalary = grossSalary - taxes - contributions;

    await prisma.payroll.create({
      data: {
        employeeId: employee.id,
        period: '2025-01',
        grossSalary,
        netSalary,
        taxes,
        contributions,
        status: PayrollStatus.PENDING,
      },
    });
  }

  console.log(`✅ Created payroll records for January 2025`);

  // Create AI query log
  await prisma.aIQuery.create({
    data: {
      userId: user.id,
      question: 'Care este cota de TVA pentru alimente în 2025?',
      answer: 'Conform Legii 141/2025, cota de TVA redusă pentru alimente este de 11% (anterior 9%). Această cotă se aplică produselor alimentare de bază, medicamentelor și cărților.',
      model: 'grok',
      tokens: 150,
      latencyMs: 450,
    },
  });

  console.log(`✅ Created sample AI query`);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { method: 'password', ip: '192.168.1.1' },
      ipAddress: '192.168.1.1',
    },
  });

  console.log(`✅ Created audit log entry`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('📊 Summary:');
  console.log('   - 4 test users:');
  console.log('     • admin@documentiulia.ro (password: Admin123456) - ADMIN/BUSINESS');
  console.log('     • contabil@documentiulia.ro (password: Conta123456) - ACCOUNTANT/PRO');
  console.log('     • test@documentiulia.ro (password: Test123456) - USER/FREE');
  console.log('     • demo@documentiulia.ro (password: Test123456) - USER/PRO');
  console.log('   - 1 test organization (Test Company SRL)');
  console.log('   - 5 partners (2 clients, 2 suppliers, 1 both)');
  console.log('   - 4 sample invoices');
  console.log('   - 4 documents (3 processed, 1 pending)');
  console.log('   - 3 payments');
  console.log('   - 1 VAT report');
  console.log('   - 1 SAF-T D406 report');
  console.log('   - 3 employees with payroll');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
