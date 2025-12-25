import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  VendorPaymentsService,
  VendorInvoice,
  VendorPayment,
  PaymentBatch,
  PaymentDispute,
  CreditNote,
  PaymentSchedule,
  PaymentRemittance,
} from './vendor-payments.service';

describe('VendorPaymentsService', () => {
  let service: VendorPaymentsService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorPaymentsService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VendorPaymentsService>(VendorPaymentsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Vendor Invoices', () => {
    const invoiceData = {
      tenantId: 'tenant-1',
      vendorId: 'vendor-1',
      invoiceNumber: 'INV-001',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lineItems: [
        {
          description: 'Consulting Services',
          quantity: 10,
          unitPrice: 500,
          unit: 'hours',
          taxRate: 19,
        },
      ],
      submittedBy: 'user-1',
      submittedByName: 'Test User',
    };

    describe('createInvoice', () => {
      it('should create vendor invoice', async () => {
        const invoice = await service.createInvoice(invoiceData);

        expect(invoice.id).toBeDefined();
        expect(invoice.invoiceNumber).toBe('INV-001');
        expect(invoice.status).toBe('draft');
        expect(invoice.currency).toBe('RON');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.invoice_created', { invoice });
      });

      it('should calculate line item totals', async () => {
        const invoice = await service.createInvoice(invoiceData);

        expect(invoice.lineItems[0].totalAmount).toBeGreaterThan(0);
        expect(invoice.lineItems[0].taxAmount).toBeGreaterThan(0);
      });

      it('should calculate invoice totals', async () => {
        const invoice = await service.createInvoice(invoiceData);

        expect(invoice.subtotal).toBe(5000); // 10 * 500
        expect(invoice.taxAmount).toBe(950); // 5000 * 19%
        expect(invoice.totalAmount).toBe(5950);
        expect(invoice.balanceDue).toBe(5950);
        expect(invoice.paidAmount).toBe(0);
      });

      it('should apply discounts', async () => {
        const invoice = await service.createInvoice({
          ...invoiceData,
          invoiceNumber: 'INV-002',
          lineItems: [
            {
              description: 'Services',
              quantity: 10,
              unitPrice: 100,
              discountPercent: 10,
              taxRate: 19,
            },
          ],
        });

        expect(invoice.discountAmount).toBe(100); // 10% of 1000
      });

      it('should throw for duplicate invoice number', async () => {
        await service.createInvoice(invoiceData);

        await expect(service.createInvoice(invoiceData)).rejects.toThrow(
          'Invoice with this number already exists',
        );
      });

      it('should support attachments', async () => {
        const invoice = await service.createInvoice({
          ...invoiceData,
          invoiceNumber: 'INV-003',
          attachments: [
            { name: 'invoice.pdf', fileUrl: '/files/invoice.pdf', fileSize: 1024, mimeType: 'application/pdf' },
          ],
        });

        expect(invoice.attachments.length).toBe(1);
        expect(invoice.attachments[0].id).toBeDefined();
        expect(invoice.attachments[0].uploadedAt).toBeDefined();
      });

      it('should support bank details', async () => {
        const invoice = await service.createInvoice({
          ...invoiceData,
          invoiceNumber: 'INV-004',
          bankDetails: {
            bankName: 'BRD',
            accountNumber: 'RO123456789',
            iban: 'RO49AAAA1B31007593840000',
            accountHolderName: 'Vendor SRL',
          },
        });

        expect(invoice.bankDetails).toBeDefined();
        expect(invoice.bankDetails?.iban).toBe('RO49AAAA1B31007593840000');
      });
    });

    describe('getInvoice', () => {
      it('should return invoice by ID', async () => {
        const created = await service.createInvoice(invoiceData);
        const invoice = await service.getInvoice(created.id);

        expect(invoice).not.toBeNull();
        expect(invoice?.id).toBe(created.id);
      });

      it('should return null for non-existent ID', async () => {
        const invoice = await service.getInvoice('non-existent');
        expect(invoice).toBeNull();
      });
    });

    describe('getInvoices', () => {
      let invoice1: VendorInvoice;
      let invoice2: VendorInvoice;

      beforeEach(async () => {
        invoice1 = await service.createInvoice({ ...invoiceData, invoiceNumber: 'INV-A1' });
        // Small delay to ensure unique IDs (Date.now() based)
        await new Promise(r => setTimeout(r, 5));
        invoice2 = await service.createInvoice({ ...invoiceData, invoiceNumber: 'INV-A2', vendorId: 'vendor-2' });
      });

      it('should return invoices for tenant', async () => {
        const invoices = await service.getInvoices('tenant-1');
        expect(invoices.length).toBe(2);
        expect(invoices.some(i => i.id === invoice1.id)).toBe(true);
        expect(invoices.some(i => i.id === invoice2.id)).toBe(true);
      });

      it('should filter by vendor', async () => {
        const invoices = await service.getInvoices('tenant-1', { vendorId: 'vendor-1' });
        expect(invoices.length).toBe(1);
        expect(invoices[0].id).toBe(invoice1.id);
      });

      it('should filter by status', async () => {
        const invoices = await service.getInvoices('tenant-1', { status: 'draft' });
        expect(invoices.every(i => i.status === 'draft')).toBe(true);
      });

      it('should sort by creation date descending', async () => {
        const invoices = await service.getInvoices('tenant-1');
        for (let i = 1; i < invoices.length; i++) {
          expect(invoices[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
            invoices[i].createdAt.getTime(),
          );
        }
      });

      it('should respect limit', async () => {
        const invoices = await service.getInvoices('tenant-1', { limit: 1 });
        expect(invoices.length).toBe(1);
      });

      it('should search by invoice number', async () => {
        const invoices = await service.getInvoices('tenant-1', { search: 'A1' });
        expect(invoices.length).toBe(1);
        expect(invoices[0].id).toBe(invoice1.id);
      });
    });

    describe('Invoice Workflow', () => {
      let invoice: VendorInvoice;

      beforeEach(async () => {
        invoice = await service.createInvoice(invoiceData);
      });

      it('should submit invoice', async () => {
        const submitted = await service.submitInvoice(invoice.id);

        expect(submitted?.status).toBe('submitted');
        expect(submitted?.submittedAt).toBeDefined();
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.invoice_submitted', expect.any(Object));
      });

      it('should review invoice', async () => {
        await service.submitInvoice(invoice.id);
        const reviewed = await service.reviewInvoice(invoice.id, 'reviewer-1', 'Reviewer');

        expect(reviewed?.status).toBe('under_review');
        expect(reviewed?.reviewedBy).toBe('reviewer-1');
      });

      it('should approve invoice', async () => {
        await service.submitInvoice(invoice.id);
        const approved = await service.approveInvoice(invoice.id, 'approver-1', 'Approver');

        expect(approved?.status).toBe('approved');
        expect(approved?.approvedBy).toBe('approver-1');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.invoice_approved', expect.any(Object));
      });

      it('should reject invoice', async () => {
        await service.submitInvoice(invoice.id);
        const rejected = await service.rejectInvoice(invoice.id, 'rejector-1', 'Invalid amount');

        expect(rejected?.status).toBe('rejected');
        expect(rejected?.rejectionReason).toBe('Invalid amount');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.invoice_rejected', expect.any(Object));
      });

      it('should schedule payment after approval', async () => {
        await service.submitInvoice(invoice.id);
        await service.approveInvoice(invoice.id, 'approver-1', 'Approver');
        const scheduled = await service.scheduleInvoicePayment(invoice.id, new Date());

        expect(scheduled?.status).toBe('scheduled');
      });

      it('should update paid amount', async () => {
        const updated = await service.updateInvoicePayment(invoice.id, 1000);

        expect(updated?.paidAmount).toBe(1000);
        expect(updated?.status).toBe('partially_paid');
      });

      it('should mark as paid when fully paid', async () => {
        const updated = await service.updateInvoicePayment(invoice.id, invoice.totalAmount);

        expect(updated?.status).toBe('paid');
        expect(updated?.balanceDue).toBe(0);
      });
    });

    describe('Overdue Invoices', () => {
      it('should mark invoices as overdue', async () => {
        const pastDue = new Date();
        pastDue.setDate(pastDue.getDate() - 5);

        const invoice = await service.createInvoice({
          ...invoiceData,
          invoiceNumber: 'INV-OVERDUE',
          dueDate: pastDue,
        });

        await service.submitInvoice(invoice.id);
        await service.approveInvoice(invoice.id, 'approver', 'Approver');

        const overdueInvoices = await service.checkOverdueInvoices('tenant-1');

        expect(overdueInvoices.length).toBeGreaterThan(0);
        expect(overdueInvoices[0].status).toBe('overdue');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.invoice_overdue', expect.any(Object));
      });

      it('should filter overdue invoices', async () => {
        const pastDue = new Date();
        pastDue.setDate(pastDue.getDate() - 5);

        await service.createInvoice({
          ...invoiceData,
          invoiceNumber: 'INV-OVERDUE-2',
          dueDate: pastDue,
        });

        const invoices = await service.getInvoices('tenant-1', { overdue: true });
        expect(invoices.every(i => i.dueDate < new Date())).toBe(true);
      });
    });
  });

  describe('Payments', () => {
    let invoice: VendorInvoice;

    beforeEach(async () => {
      invoice = await service.createInvoice({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        invoiceNumber: `INV-${Date.now()}`,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lineItems: [{ description: 'Services', quantity: 1, unitPrice: 1000 }],
        submittedBy: 'user-1',
        submittedByName: 'User',
      });
    });

    describe('createPayment', () => {
      it('should create payment', async () => {
        const payment = await service.createPayment({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          invoiceIds: [invoice.id],
          method: 'bank_transfer',
          amount: 1000,
          createdBy: 'user-1',
          createdByName: 'User',
        });

        expect(payment.id).toBeDefined();
        expect(payment.paymentNumber).toBeDefined();
        expect(payment.status).toBe('pending');
        expect(payment.currency).toBe('RON');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.payment_created', expect.any(Object));
      });

      it('should calculate net amount with fees', async () => {
        const payment = await service.createPayment({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          invoiceIds: [invoice.id],
          method: 'bank_transfer',
          amount: 1000,
          feeAmount: 10,
          createdBy: 'user-1',
          createdByName: 'User',
        });

        expect(payment.netAmount).toBe(990);
      });

      it('should support multiple currencies', async () => {
        const payment = await service.createPayment({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          invoiceIds: [invoice.id],
          method: 'wire',
          amount: 200,
          currency: 'EUR',
          exchangeRate: 5,
          originalCurrency: 'RON',
          originalAmount: 1000,
          createdBy: 'user-1',
          createdByName: 'User',
        });

        expect(payment.currency).toBe('EUR');
        expect(payment.exchangeRate).toBe(5);
      });
    });

    describe('Payment Workflow', () => {
      let payment: VendorPayment;

      beforeEach(async () => {
        payment = await service.createPayment({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          invoiceIds: [invoice.id],
          method: 'bank_transfer',
          amount: 1000,
          createdBy: 'user-1',
          createdByName: 'User',
        });
      });

      it('should approve payment', async () => {
        const approved = await service.approvePayment(payment.id, 'approver-1', 'Approver');

        expect(approved?.status).toBe('processing');
        expect(approved?.approvedBy).toBe('approver-1');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.payment_approved', expect.any(Object));
      });

      it('should process payment', async () => {
        await service.approvePayment(payment.id, 'approver-1', 'Approver');
        const processed = await service.processPayment(payment.id, 'TXN-123');

        expect(processed?.transactionId).toBe('TXN-123');
        expect(processed?.processedDate).toBeDefined();
      });

      it('should complete payment', async () => {
        await service.approvePayment(payment.id, 'approver-1', 'Approver');
        const completed = await service.completePayment(payment.id);

        expect(completed?.status).toBe('completed');
        expect(completed?.completedDate).toBeDefined();
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.payment_completed', expect.any(Object));
      });

      it('should fail payment', async () => {
        await service.approvePayment(payment.id, 'approver-1', 'Approver');
        const failed = await service.failPayment(payment.id, 'Insufficient funds');

        expect(failed?.status).toBe('failed');
        expect(failed?.failureReason).toBe('Insufficient funds');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.payment_failed', expect.any(Object));
      });

      it('should cancel payment', async () => {
        const cancelled = await service.cancelPayment(payment.id);

        expect(cancelled?.status).toBe('cancelled');
      });
    });

    describe('getPayments', () => {
      let paymentA: VendorPayment;
      let paymentB: VendorPayment;

      beforeEach(async () => {
        paymentA = await service.createPayment({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          invoiceIds: [],
          method: 'bank_transfer',
          amount: 1000,
          createdBy: 'user-1',
          createdByName: 'User',
        });
        // Small delay to ensure unique IDs
        await new Promise(r => setTimeout(r, 5));
        paymentB = await service.createPayment({
          tenantId: 'tenant-1',
          vendorId: 'vendor-2',
          invoiceIds: [],
          method: 'wire',
          amount: 2000,
          createdBy: 'user-1',
          createdByName: 'User',
        });
      });

      it('should return payments for tenant', async () => {
        const payments = await service.getPayments('tenant-1');
        expect(payments.length).toBe(2);
        expect(payments.some(p => p.id === paymentA.id)).toBe(true);
        expect(payments.some(p => p.id === paymentB.id)).toBe(true);
      });

      it('should filter by vendor', async () => {
        const payments = await service.getPayments('tenant-1', { vendorId: 'vendor-1' });
        expect(payments.length).toBe(1);
        expect(payments[0].id).toBe(paymentA.id);
      });

      it('should filter by method', async () => {
        const payments = await service.getPayments('tenant-1', { method: 'wire' });
        expect(payments.length).toBe(1);
        expect(payments[0].id).toBe(paymentB.id);
      });
    });
  });

  describe('Payment Batches', () => {
    let payment1: VendorPayment;
    let payment2: VendorPayment;

    beforeEach(async () => {
      payment1 = await service.createPayment({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        invoiceIds: [],
        method: 'bank_transfer',
        amount: 1000,
        currency: 'RON',
        createdBy: 'user-1',
        createdByName: 'User',
      });
      // Small delay to ensure unique IDs
      await new Promise(r => setTimeout(r, 5));
      payment2 = await service.createPayment({
        tenantId: 'tenant-1',
        vendorId: 'vendor-2',
        invoiceIds: [],
        method: 'bank_transfer',
        amount: 2000,
        currency: 'RON',
        createdBy: 'user-1',
        createdByName: 'User',
      });
    });

    describe('createPaymentBatch', () => {
      it('should create payment batch', async () => {
        const batch = await service.createPaymentBatch({
          tenantId: 'tenant-1',
          name: 'Weekly Batch',
          paymentIds: [payment1.id, payment2.id],
          paymentMethod: 'bank_transfer',
          createdBy: 'user-1',
          createdByName: 'User',
        });

        expect(batch.id).toBeDefined();
        expect(batch.status).toBe('draft');
        expect(batch.totalAmount).toBe(3000);
      });

      it('should throw for mixed currencies', async () => {
        // Small delay to ensure unique ID
        await new Promise(r => setTimeout(r, 5));
        const eurPayment = await service.createPayment({
          tenantId: 'tenant-1',
          vendorId: 'vendor-3',
          invoiceIds: [],
          method: 'bank_transfer',
          amount: 500,
          currency: 'EUR',
          createdBy: 'user-1',
          createdByName: 'User',
        });

        await expect(
          service.createPaymentBatch({
            tenantId: 'tenant-1',
            name: 'Mixed Batch',
            paymentIds: [payment1.id, eurPayment.id],
            paymentMethod: 'bank_transfer',
            createdBy: 'user-1',
            createdByName: 'User',
          }),
        ).rejects.toThrow('All payments in a batch must have the same currency');
      });
    });

    describe('Batch Workflow', () => {
      let batch: PaymentBatch;

      beforeEach(async () => {
        batch = await service.createPaymentBatch({
          tenantId: 'tenant-1',
          name: 'Test Batch',
          paymentIds: [payment1.id, payment2.id],
          paymentMethod: 'bank_transfer',
          createdBy: 'user-1',
          createdByName: 'User',
        });
      });

      it('should submit batch for approval', async () => {
        const submitted = await service.submitBatchForApproval(batch.id);

        expect(submitted?.status).toBe('pending_approval');
      });

      it('should approve batch and its payments', async () => {
        await service.submitBatchForApproval(batch.id);
        const approved = await service.approveBatch(batch.id, 'approver-1', 'Approver');

        expect(approved?.status).toBe('approved');
        expect(approved?.approvedBy).toBe('approver-1');

        // Verify payments are approved
        const p1 = await service.getPayment(payment1.id);
        const p2 = await service.getPayment(payment2.id);
        expect(p1?.status).toBe('processing');
        expect(p2?.status).toBe('processing');
      });

      it('should process batch', async () => {
        await service.submitBatchForApproval(batch.id);
        await service.approveBatch(batch.id, 'approver-1', 'Approver');
        const processed = await service.processBatch(batch.id);

        expect(processed?.status).toBe('processing');
        expect(processed?.processedDate).toBeDefined();
      });

      it('should complete batch and its payments', async () => {
        await service.submitBatchForApproval(batch.id);
        await service.approveBatch(batch.id, 'approver-1', 'Approver');
        await service.processBatch(batch.id);
        const completed = await service.completeBatch(batch.id);

        expect(completed?.status).toBe('completed');
      });
    });
  });

  describe('Disputes', () => {
    describe('createDispute', () => {
      it('should create dispute', async () => {
        const dispute = await service.createDispute({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          invoiceId: 'inv-1',
          reason: 'Incorrect amount',
          description: 'Invoice amount does not match PO',
          disputedAmount: 500,
          raisedBy: 'user-1',
          raisedByName: 'User',
        });

        expect(dispute.id).toBeDefined();
        expect(dispute.status).toBe('open');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.dispute_created', expect.any(Object));
      });

      it('should support attachments', async () => {
        const dispute = await service.createDispute({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          reason: 'Damaged goods',
          description: 'Products arrived damaged',
          disputedAmount: 1000,
          attachments: [
            { name: 'photo.jpg', fileUrl: '/files/photo.jpg', fileSize: 2048, mimeType: 'image/jpeg' },
          ],
          raisedBy: 'user-1',
          raisedByName: 'User',
        });

        expect(dispute.attachments.length).toBe(1);
      });
    });

    describe('Dispute Workflow', () => {
      let dispute: PaymentDispute;

      beforeEach(async () => {
        dispute = await service.createDispute({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          reason: 'Test dispute',
          description: 'Test',
          disputedAmount: 100,
          raisedBy: 'user-1',
          raisedByName: 'User',
        });
      });

      it('should assign dispute', async () => {
        const assigned = await service.assignDispute(dispute.id, 'agent-1', 'Agent');

        expect(assigned?.status).toBe('under_review');
        expect(assigned?.assignedTo).toBe('agent-1');
      });

      it('should add comment', async () => {
        const updated = await service.addDisputeComment(dispute.id, {
          content: 'Looking into this',
          fromVendor: false,
          authorId: 'agent-1',
          authorName: 'Agent',
        });

        expect(updated?.comments.length).toBe(1);
        expect(updated?.comments[0].content).toBe('Looking into this');
      });

      it('should resolve dispute', async () => {
        const resolved = await service.resolveDispute(
          dispute.id,
          'Credit issued',
          50,
          'resolver-1',
          'Resolver',
        );

        expect(resolved?.status).toBe('resolved');
        expect(resolved?.resolution).toBe('Credit issued');
        expect(resolved?.resolvedAmount).toBe(50);
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.dispute_resolved', expect.any(Object));
      });

      it('should close resolved dispute', async () => {
        await service.resolveDispute(dispute.id, 'Resolved', 100, 'resolver-1', 'Resolver');
        const closed = await service.closeDispute(dispute.id);

        expect(closed?.status).toBe('closed');
      });
    });

    describe('getDisputes', () => {
      let dispute1: PaymentDispute;
      let dispute2: PaymentDispute;

      beforeEach(async () => {
        dispute1 = await service.createDispute({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          reason: 'Dispute 1',
          description: 'Test',
          disputedAmount: 100,
          raisedBy: 'user-1',
          raisedByName: 'User',
        });
        // Small delay to ensure unique IDs
        await new Promise(r => setTimeout(r, 5));
        dispute2 = await service.createDispute({
          tenantId: 'tenant-1',
          vendorId: 'vendor-2',
          reason: 'Dispute 2',
          description: 'Test',
          disputedAmount: 200,
          raisedBy: 'user-1',
          raisedByName: 'User',
        });
      });

      it('should return disputes for tenant', async () => {
        const disputes = await service.getDisputes('tenant-1');
        expect(disputes.length).toBe(2);
        expect(disputes.some(d => d.id === dispute1.id)).toBe(true);
        expect(disputes.some(d => d.id === dispute2.id)).toBe(true);
      });

      it('should filter by vendor', async () => {
        const disputes = await service.getDisputes('tenant-1', { vendorId: 'vendor-1' });
        expect(disputes.length).toBe(1);
        expect(disputes[0].id).toBe(dispute1.id);
      });

      it('should filter by status', async () => {
        const disputes = await service.getDisputes('tenant-1', { status: 'open' });
        expect(disputes.every(d => d.status === 'open')).toBe(true);
      });
    });
  });

  describe('Credit Notes', () => {
    describe('createCreditNote', () => {
      it('should create credit note', async () => {
        const creditNote = await service.createCreditNote({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          type: 'return',
          amount: 500,
          reason: 'Product return',
          issuedBy: 'user-1',
          issuedByName: 'User',
        });

        expect(creditNote.id).toBeDefined();
        expect(creditNote.creditNoteNumber).toBeDefined();
        expect(creditNote.status).toBe('draft');
        expect(creditNote.remainingAmount).toBe(500);
      });

      it('should support line items', async () => {
        const creditNote = await service.createCreditNote({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          type: 'discount',
          amount: 100,
          reason: 'Volume discount',
          lineItems: [
            { description: 'Discount on order', quantity: 1, unitPrice: 100, amount: 100 },
          ],
          issuedBy: 'user-1',
          issuedByName: 'User',
        });

        expect(creditNote.lineItems.length).toBe(1);
      });
    });

    describe('Credit Note Workflow', () => {
      let creditNote: CreditNote;
      let invoice: VendorInvoice;

      beforeEach(async () => {
        creditNote = await service.createCreditNote({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          type: 'overpayment',
          amount: 200,
          reason: 'Overpayment refund',
          issuedBy: 'user-1',
          issuedByName: 'User',
        });

        invoice = await service.createInvoice({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          invoiceNumber: `INV-CN-${Date.now()}`,
          invoiceDate: new Date(),
          dueDate: new Date(),
          lineItems: [{ description: 'Services', quantity: 1, unitPrice: 500 }],
          submittedBy: 'user-1',
          submittedByName: 'User',
        });
      });

      it('should issue credit note', async () => {
        const issued = await service.issueCreditNote(creditNote.id);

        expect(issued?.status).toBe('issued');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.credit_note_issued', expect.any(Object));
      });

      it('should apply credit note to invoice', async () => {
        await service.issueCreditNote(creditNote.id);
        const applied = await service.applyCreditNote(creditNote.id, invoice.id, 100, 'user-1');

        expect(applied?.appliedAmount).toBe(100);
        expect(applied?.remainingAmount).toBe(100);
        expect(applied?.appliedToInvoices.length).toBe(1);
      });

      it('should mark as fully applied', async () => {
        await service.issueCreditNote(creditNote.id);
        const applied = await service.applyCreditNote(creditNote.id, invoice.id, 200, 'user-1');

        expect(applied?.status).toBe('applied');
        expect(applied?.remainingAmount).toBe(0);
      });

      it('should not apply more than remaining', async () => {
        await service.issueCreditNote(creditNote.id);
        const result = await service.applyCreditNote(creditNote.id, invoice.id, 300, 'user-1');

        expect(result).toBeNull();
      });
    });

    describe('getVendorCreditNotes', () => {
      it('should return credit notes for vendor', async () => {
        await service.createCreditNote({
          tenantId: 'tenant-1',
          vendorId: 'vendor-cn',
          type: 'return',
          amount: 100,
          reason: 'Return',
          issuedBy: 'user-1',
          issuedByName: 'User',
        });

        const creditNotes = await service.getVendorCreditNotes('vendor-cn');
        expect(creditNotes.length).toBe(1);
      });
    });
  });

  describe('Payment Schedules', () => {
    describe('createPaymentSchedule', () => {
      it('should create weekly schedule', async () => {
        const schedule = await service.createPaymentSchedule({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          name: 'Weekly Payments',
          frequency: 'weekly',
          dayOfWeek: 5, // Friday
          paymentMethod: 'bank_transfer',
          createdBy: 'user-1',
        });

        expect(schedule.id).toBeDefined();
        expect(schedule.frequency).toBe('weekly');
        expect(schedule.isActive).toBe(true);
        expect(schedule.nextRunDate).toBeDefined();
      });

      it('should create monthly schedule', async () => {
        const schedule = await service.createPaymentSchedule({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          name: 'Monthly Payments',
          frequency: 'monthly',
          dayOfMonth: 25,
          paymentMethod: 'bank_transfer',
          createdBy: 'user-1',
        });

        expect(schedule.frequency).toBe('monthly');
        expect(schedule.dayOfMonth).toBe(25);
      });

      it('should support auto-approve', async () => {
        const schedule = await service.createPaymentSchedule({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          name: 'Auto Payments',
          frequency: 'monthly',
          paymentMethod: 'bank_transfer',
          autoApprove: true,
          autoApproveThreshold: 10000,
          createdBy: 'user-1',
        });

        expect(schedule.autoApprove).toBe(true);
        expect(schedule.autoApproveThreshold).toBe(10000);
      });

      it('should support amount limits', async () => {
        const schedule = await service.createPaymentSchedule({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          name: 'Limited Payments',
          frequency: 'weekly',
          paymentMethod: 'bank_transfer',
          minimumAmount: 100,
          maximumAmount: 50000,
          createdBy: 'user-1',
        });

        expect(schedule.minimumAmount).toBe(100);
        expect(schedule.maximumAmount).toBe(50000);
      });
    });

    describe('updatePaymentSchedule', () => {
      let schedule: PaymentSchedule;

      beforeEach(async () => {
        schedule = await service.createPaymentSchedule({
          tenantId: 'tenant-1',
          vendorId: 'vendor-1',
          name: 'Test Schedule',
          frequency: 'weekly',
          paymentMethod: 'bank_transfer',
          createdBy: 'user-1',
        });
      });

      it('should update schedule', async () => {
        const updated = await service.updatePaymentSchedule(schedule.id, {
          name: 'Updated Schedule',
          isActive: false,
        });

        expect(updated?.name).toBe('Updated Schedule');
        expect(updated?.isActive).toBe(false);
      });

      it('should recalculate next run date on frequency change', async () => {
        const originalNext = schedule.nextRunDate;

        const updated = await service.updatePaymentSchedule(schedule.id, {
          frequency: 'monthly',
          dayOfMonth: 15,
        });

        expect(updated?.nextRunDate).not.toEqual(originalNext);
      });
    });

    describe('getVendorPaymentSchedules', () => {
      it('should return schedules for vendor', async () => {
        await service.createPaymentSchedule({
          tenantId: 'tenant-1',
          vendorId: 'vendor-sched',
          name: 'Schedule 1',
          frequency: 'weekly',
          paymentMethod: 'bank_transfer',
          createdBy: 'user-1',
        });

        const schedules = await service.getVendorPaymentSchedules('vendor-sched');
        expect(schedules.length).toBe(1);
      });
    });
  });

  describe('Remittances', () => {
    let payment: VendorPayment;

    beforeEach(async () => {
      payment = await service.createPayment({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        invoiceIds: [],
        method: 'bank_transfer',
        amount: 1000,
        createdBy: 'user-1',
        createdByName: 'User',
      });
    });

    describe('createRemittance', () => {
      it('should create remittance', async () => {
        const remittance = await service.createRemittance({
          paymentId: payment.id,
          vendorId: 'vendor-1',
          deliveryMethod: 'email',
          recipientEmail: 'vendor@example.com',
          invoiceDetails: [
            {
              invoiceId: 'inv-1',
              invoiceNumber: 'INV-001',
              invoiceDate: new Date(),
              invoiceAmount: 1000,
              paidAmount: 1000,
              discountAmount: 0,
            },
          ],
          sentBy: 'user-1',
        });

        expect(remittance.id).toBeDefined();
        expect(remittance.remittanceNumber).toBeDefined();
        expect(remittance.totalAmount).toBe(1000);
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_payment.remittance_sent', expect.any(Object));
      });

      it('should throw for non-existent payment', async () => {
        await expect(
          service.createRemittance({
            paymentId: 'non-existent',
            vendorId: 'vendor-1',
            deliveryMethod: 'email',
            invoiceDetails: [],
            sentBy: 'user-1',
          }),
        ).rejects.toThrow('Payment not found');
      });
    });

    describe('getPaymentRemittances', () => {
      it('should return remittances for payment', async () => {
        await service.createRemittance({
          paymentId: payment.id,
          vendorId: 'vendor-1',
          deliveryMethod: 'portal',
          invoiceDetails: [],
          sentBy: 'user-1',
        });

        const remittances = await service.getPaymentRemittances(payment.id);
        expect(remittances.length).toBe(1);
      });
    });
  });

  describe('Statistics & Summary', () => {
    beforeEach(async () => {
      // Create test data
      const invoice = await service.createInvoice({
        tenantId: 'tenant-stats',
        vendorId: 'vendor-stats',
        invoiceNumber: 'STATS-001',
        invoiceDate: new Date(),
        dueDate: new Date(),
        lineItems: [{ description: 'Services', quantity: 1, unitPrice: 1000 }],
        submittedBy: 'user-1',
        submittedByName: 'User',
      });

      await service.submitInvoice(invoice.id);
      await service.approveInvoice(invoice.id, 'approver', 'Approver');

      const payment = await service.createPayment({
        tenantId: 'tenant-stats',
        vendorId: 'vendor-stats',
        invoiceIds: [invoice.id],
        method: 'bank_transfer',
        amount: 1000,
        createdBy: 'user-1',
        createdByName: 'User',
      });

      await service.approvePayment(payment.id, 'approver', 'Approver');
      await service.completePayment(payment.id);

      await service.createDispute({
        tenantId: 'tenant-stats',
        vendorId: 'vendor-stats',
        reason: 'Test dispute',
        description: 'Test',
        disputedAmount: 100,
        raisedBy: 'user-1',
        raisedByName: 'User',
      });
    });

    describe('getVendorPaymentSummary', () => {
      it('should return vendor payment summary', async () => {
        const summary = await service.getVendorPaymentSummary('vendor-stats');

        expect(summary.vendorId).toBe('vendor-stats');
        expect(summary.totalInvoices).toBeGreaterThan(0);
        expect(summary.totalInvoiceAmount).toBeGreaterThan(0);
      });
    });

    describe('getPaymentStatistics', () => {
      it('should return payment statistics', async () => {
        const stats = await service.getPaymentStatistics('tenant-stats');

        expect(stats.totalInvoices).toBeGreaterThan(0);
        expect(stats.totalPayments).toBeGreaterThan(0);
        expect(stats.completedPayments).toBeGreaterThan(0);
        expect(stats.openDisputes).toBeGreaterThan(0);
        expect(Array.isArray(stats.paymentsByMethod)).toBe(true);
        expect(Array.isArray(stats.invoicesByStatus)).toBe(true);
      });
    });
  });

  describe('Payment Methods', () => {
    it('should support bank transfer', async () => {
      const payment = await service.createPayment({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        invoiceIds: [],
        method: 'bank_transfer',
        amount: 1000,
        createdBy: 'user-1',
        createdByName: 'User',
      });

      expect(payment.method).toBe('bank_transfer');
    });

    it('should support wire transfer', async () => {
      const payment = await service.createPayment({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        invoiceIds: [],
        method: 'wire',
        amount: 1000,
        createdBy: 'user-1',
        createdByName: 'User',
      });

      expect(payment.method).toBe('wire');
    });

    it('should support ACH', async () => {
      const payment = await service.createPayment({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        invoiceIds: [],
        method: 'ach',
        amount: 1000,
        createdBy: 'user-1',
        createdByName: 'User',
      });

      expect(payment.method).toBe('ach');
    });

    it('should support check', async () => {
      const payment = await service.createPayment({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        invoiceIds: [],
        method: 'check',
        amount: 1000,
        createdBy: 'user-1',
        createdByName: 'User',
      });

      expect(payment.method).toBe('check');
    });

    it('should support virtual card', async () => {
      const payment = await service.createPayment({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        invoiceIds: [],
        method: 'virtual_card',
        amount: 1000,
        createdBy: 'user-1',
        createdByName: 'User',
      });

      expect(payment.method).toBe('virtual_card');
    });
  });

  describe('Credit Note Types', () => {
    it('should support return type', async () => {
      const cn = await service.createCreditNote({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        type: 'return',
        amount: 100,
        reason: 'Product return',
        issuedBy: 'user-1',
        issuedByName: 'User',
      });

      expect(cn.type).toBe('return');
    });

    it('should support discount type', async () => {
      const cn = await service.createCreditNote({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        type: 'discount',
        amount: 50,
        reason: 'Early payment discount',
        issuedBy: 'user-1',
        issuedByName: 'User',
      });

      expect(cn.type).toBe('discount');
    });

    it('should support correction type', async () => {
      const cn = await service.createCreditNote({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        type: 'correction',
        amount: 75,
        reason: 'Invoice correction',
        issuedBy: 'user-1',
        issuedByName: 'User',
      });

      expect(cn.type).toBe('correction');
    });

    it('should support overpayment type', async () => {
      const cn = await service.createCreditNote({
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        type: 'overpayment',
        amount: 200,
        reason: 'Overpayment refund',
        issuedBy: 'user-1',
        issuedByName: 'User',
      });

      expect(cn.type).toBe('overpayment');
    });
  });
});
