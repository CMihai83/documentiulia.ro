import { PrismaClient, InvoiceType, InvoiceStatus, ReportStatus, DocStatus, PaymentMethod, PaymentRecordStatus, SpvSubmissionType, SpvSubmissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding comprehensive mock data...');

  // Get demo user
  const user = await prisma.user.findUnique({
    where: { email: 'demo@documentiulia.ro' }
  });

  if (!user) {
    console.log('❌ Demo user not found. Run main seed first.');
    return;
  }

  const userId = user.id;
  console.log(`✅ Found user: ${user.email}`);

  // ===== MORE INVOICES FOR ANALYTICS =====
  console.log('📄 Creating invoices for analytics...');

  const invoiceData = [
    // January 2025
    { number: 'INV-2025-003', date: '2025-01-15', type: 'ISSUED', partner: 'Tech Solutions SRL', cui: 'RO44556677', net: 15000, vat: 21, status: 'PAID' },
    { number: 'INV-2025-004', date: '2025-01-20', type: 'ISSUED', partner: 'Digital Agency SA', cui: 'RO88990011', net: 8500, vat: 21, status: 'SUBMITTED' },
    { number: 'REC-2025-003', date: '2025-01-18', type: 'RECEIVED', partner: 'Office Supplies SRL', cui: 'RO11112222', net: 2500, vat: 21, status: 'APPROVED' },
    // February 2025
    { number: 'INV-2025-005', date: '2025-02-01', type: 'ISSUED', partner: 'Consulting Group SA', cui: 'RO33334444', net: 22000, vat: 21, status: 'PAID' },
    { number: 'INV-2025-006', date: '2025-02-10', type: 'ISSUED', partner: 'Marketing Pro SRL', cui: 'RO55556666', net: 12000, vat: 21, status: 'PAID' },
    { number: 'REC-2025-004', date: '2025-02-05', type: 'RECEIVED', partner: 'IT Services SRL', cui: 'RO77778888', net: 4500, vat: 21, status: 'APPROVED' },
    { number: 'REC-2025-005', date: '2025-02-15', type: 'RECEIVED', partner: 'Cloud Provider SA', cui: 'RO99990000', net: 3200, vat: 21, status: 'APPROVED' },
    // March 2025
    { number: 'INV-2025-007', date: '2025-03-01', type: 'ISSUED', partner: 'Enterprise Corp SRL', cui: 'RO12123434', net: 35000, vat: 21, status: 'SUBMITTED' },
    { number: 'INV-2025-008', date: '2025-03-10', type: 'ISSUED', partner: 'Startup Hub SA', cui: 'RO56567878', net: 18000, vat: 21, status: 'PENDING' },
    { number: 'REC-2025-006', date: '2025-03-08', type: 'RECEIVED', partner: 'Hardware Store SRL', cui: 'RO90901212', net: 6800, vat: 21, status: 'APPROVED' },
    // December 2024 (for year-over-year)
    { number: 'INV-2024-050', date: '2024-12-15', type: 'ISSUED', partner: 'Old Client SRL', cui: 'RO11223344', net: 9500, vat: 19, status: 'PAID' },
    { number: 'INV-2024-051', date: '2024-12-20', type: 'ISSUED', partner: 'Legacy Corp SA', cui: 'RO55667788', net: 14000, vat: 19, status: 'PAID' },
  ];

  for (const inv of invoiceData) {
    const vatAmount = (inv.net * inv.vat) / 100;
    try {
      await prisma.invoice.create({
        data: {
          userId,
          invoiceNumber: inv.number,
          invoiceDate: new Date(inv.date),
          dueDate: new Date(new Date(inv.date).getTime() + 30 * 24 * 60 * 60 * 1000),
          type: inv.type as InvoiceType,
          status: inv.status as InvoiceStatus,
          partnerName: inv.partner,
          partnerCui: inv.cui,
          partnerAddress: 'București, România',
          netAmount: inv.net,
          vatRate: inv.vat,
          vatAmount: vatAmount,
          grossAmount: inv.net + vatAmount,
          currency: 'RON',
          spvSubmitted: inv.status === 'SUBMITTED' || inv.status === 'PAID',
          spvSubmittedAt: inv.status === 'SUBMITTED' || inv.status === 'PAID' ? new Date(inv.date) : null,
        }
      });
    } catch (e: any) {
      if (e.code !== 'P2002') throw e; // Ignore duplicates
    }
  }
  console.log(`✅ Created ${invoiceData.length} invoices`);

  // ===== VAT REPORTS =====
  console.log('📊 Creating VAT reports...');

  const vatReports = [
    { period: '2025-01', collected: 8925, deductible: 3780, payable: 5145 },
    { period: '2025-02', collected: 7140, deductible: 1617, payable: 5523 },
    { period: '2025-03', collected: 11130, deductible: 1428, payable: 9702 },
    { period: '2024-12', collected: 4465, deductible: 1200, payable: 3265 },
  ];

  for (const vat of vatReports) {
    try {
      await prisma.vATReport.create({
        data: {
          userId,
          period: vat.period,
          vatCollected: vat.collected,
          vatDeductible: vat.deductible,
          vatPayable: vat.payable,
          vatRate: 21,
          status: ReportStatus.SUBMITTED,
          submittedAt: new Date(),
        }
      });
    } catch (e: any) {
      if (e.code !== 'P2002') throw e;
    }
  }
  console.log(`✅ Created ${vatReports.length} VAT reports`);

  // ===== SAF-T D406 REPORTS =====
  console.log('📋 Creating SAF-T reports...');

  const saftReports = [
    { period: '2025-01', status: 'SUBMITTED' },
    { period: '2025-02', status: 'SUBMITTED' },
    { period: '2025-03', status: 'DRAFT' },
  ];

  for (const saft of saftReports) {
    try {
      await prisma.sAFTReport.create({
        data: {
          userId,
          period: saft.period,
          reportType: 'D406',
          xmlUrl: `/exports/saft-${saft.period}.xml`,
          xmlSize: 125000,
          validated: saft.status === 'SUBMITTED',
          validatedAt: saft.status === 'SUBMITTED' ? new Date() : null,
          validationResult: { valid: true, errors: [], warnings: [] },
          status: saft.status as ReportStatus,
          submittedAt: saft.status === 'SUBMITTED' ? new Date() : null,
        }
      });
    } catch (e: any) {
      if (e.code !== 'P2002') throw e;
    }
  }
  console.log(`✅ Created ${saftReports.length} SAF-T reports`);

  // ===== SPV SUBMISSIONS (e-Factura) =====
  console.log('📤 Creating SPV submissions...');

  const spvSubmissions = [
    { uploadIndex: 'SPV-2025-00001', status: SpvSubmissionStatus.ACCEPTED },
    { uploadIndex: 'SPV-2025-00002', status: SpvSubmissionStatus.ACCEPTED },
    { uploadIndex: 'SPV-2025-00003', status: SpvSubmissionStatus.ACCEPTED },
    { uploadIndex: 'SPV-2025-00004', status: SpvSubmissionStatus.PENDING },
    { uploadIndex: 'SPV-2025-00005', status: SpvSubmissionStatus.PROCESSING },
  ];

  for (const spv of spvSubmissions) {
    try {
      await prisma.spvSubmission.create({
        data: {
          userId,
          cui: 'RO12345678',
          submissionType: SpvSubmissionType.EFACTURA_SEND,
          uploadIndex: spv.uploadIndex,
          documentType: 'invoice',
          xmlHash: 'sha256-mock-hash-' + spv.uploadIndex,
          xmlSize: 45000,
          status: spv.status,
          submittedAt: new Date(),
        }
      });
    } catch (e: any) {
      if (e.code !== 'P2002') throw e;
    }
  }
  console.log(`✅ Created ${spvSubmissions.length} SPV submissions`);

  // ===== MORE DOCUMENTS =====
  console.log('📁 Creating more documents...');

  const documents = [
    { name: 'contract-client-alpha.pdf', type: 'application/pdf', status: 'COMPLETED', confidence: 0.97 },
    { name: 'chitanta-plata-001.jpg', type: 'image/jpeg', status: 'COMPLETED', confidence: 0.94 },
    { name: 'factura-utilitati-feb.pdf', type: 'application/pdf', status: 'COMPLETED', confidence: 0.99 },
    { name: 'bon-fiscal-restaurant.jpg', type: 'image/jpeg', status: 'COMPLETED', confidence: 0.91 },
    { name: 'declaratie-tva-q1.pdf', type: 'application/pdf', status: 'COMPLETED', confidence: 0.98 },
    { name: 'scan-neclar.jpg', type: 'image/jpeg', status: 'FAILED', confidence: null },
    { name: 'factura-noua.pdf', type: 'application/pdf', status: 'PENDING', confidence: null },
  ];

  for (const doc of documents) {
    await prisma.document.create({
      data: {
        userId,
        filename: doc.name,
        fileUrl: `/uploads/${doc.name}`,
        fileType: doc.type,
        fileSize: Math.floor(Math.random() * 500000) + 50000,
        status: doc.status as DocStatus,
        confidence: doc.confidence,
        extractedText: doc.status === 'COMPLETED' ? `Extracted text from ${doc.name}` : null,
        ocrData: doc.status === 'COMPLETED' ? { processed: true, fields: ['vendor', 'total', 'date'] } : undefined,
        processedAt: doc.status === 'COMPLETED' ? new Date() : null,
      }
    });
  }
  console.log(`✅ Created ${documents.length} documents`);

  // ===== PAYMENTS =====
  console.log('💳 Creating payments...');

  // Get some invoices to link payments
  const invoices = await prisma.invoice.findMany({
    where: { userId, status: 'PAID' },
    take: 5,
  });

  for (const inv of invoices) {
    try {
      await prisma.payment.create({
        data: {
          invoiceId: inv.id,
          amount: inv.grossAmount,
          currency: 'RON',
          paymentDate: new Date(),
          method: PaymentMethod.BANK_TRANSFER,
          reference: `OP-${inv.invoiceNumber}`,
          status: PaymentRecordStatus.COMPLETED,
        }
      });
    } catch (e: any) {
      // Ignore errors
    }
  }
  console.log(`✅ Created payments for ${invoices.length} invoices`);

  // ===== AUDIT LOGS =====
  console.log('📝 Creating audit logs...');

  const auditLogs = [
    { action: 'LOGIN', entity: 'User', details: { message: 'User logged in successfully' } },
    { action: 'CREATE', entity: 'Invoice', details: { invoiceNumber: 'INV-2025-007' } },
    { action: 'SUBMIT', entity: 'SPV', details: { uploadIndex: 'SPV-2025-00001' } },
    { action: 'UPDATE', entity: 'Partner', details: { partnerId: 'partner-alpha' } },
    { action: 'EXPORT', entity: 'SAF-T', details: { period: '2025-01' } },
    { action: 'OCR', entity: 'Document', details: { filename: 'factura-alpha-001.pdf', confidence: 0.98 } },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: log.action,
        entity: log.entity,
        entityId: 'mock-entity-id',
        details: log.details,
        ipAddress: '192.168.1.100',
      }
    });
  }
  console.log(`✅ Created ${auditLogs.length} audit logs`);

  // ===== AI QUERIES =====
  console.log('🤖 Creating AI queries...');

  const aiQueries = [
    { question: 'Care este cota TVA pentru alimente în 2025?', answer: 'Conform Legea 141/2025, cota TVA redusă pentru alimente este 11% începând cu august 2025.' },
    { question: 'Când trebuie depus SAF-T D406?', answer: 'SAF-T D406 se depune lunar, conform Ordin 1783/2021, până în data de 25 a lunii următoare.' },
    { question: 'Ce este e-Factura B2B?', answer: 'e-Factura B2B este sistemul de facturare electronică obligatoriu pentru tranzacții între firme, în format UBL 2.1.' },
  ];

  for (const q of aiQueries) {
    await prisma.aIQuery.create({
      data: {
        userId,
        question: q.question,
        answer: q.answer,
        model: 'grok-2-latest',
        tokens: Math.floor(Math.random() * 500) + 100,
        latencyMs: Math.floor(Math.random() * 2000) + 500,
      }
    });
  }
  console.log(`✅ Created ${aiQueries.length} AI queries`);

  console.log('\n🎉 Mock data seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
