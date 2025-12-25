import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SupplierQuotationsService,
  RFQStatus,
  QuotationStatus,
  ComparisonCriteria,
} from './supplier-quotations.service';

describe('SupplierQuotationsService', () => {
  let service: SupplierQuotationsService;
  let eventEmitter: EventEmitter2;

  const mockTenantId = 'tenant_123';
  const mockUserId = 'user_123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierQuotationsService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SupplierQuotationsService>(SupplierQuotationsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('RFQ Management', () => {
    it('should create a new RFQ', async () => {
      const dto = {
        title: 'Office Equipment RFQ',
        description: 'Request for quotation for office equipment',
        lineItems: [
          {
            description: 'Laptop',
            specifications: 'Intel i7, 16GB RAM',
            quantity: 10,
            unitOfMeasure: 'pcs',
            targetUnitPrice: 5000,
          },
          {
            description: 'Monitor',
            specifications: '27 inch, 4K',
            quantity: 10,
            unitOfMeasure: 'pcs',
            targetUnitPrice: 2000,
          },
        ],
        invitedSupplierIds: ['supplier_1', 'supplier_2', 'supplier_3'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deliveryAddress: 'Bucharest, Romania',
        createdBy: mockUserId,
      };

      const result = await service.createRFQ(mockTenantId, dto);

      expect(result.id).toBeDefined();
      expect(result.rfqNumber).toMatch(/^RFQ-\d{4}-\d{6}$/);
      expect(result.status).toBe(RFQStatus.DRAFT);
      expect(result.lineItems.length).toBe(2);
      expect(result.invitedSupplierIds.length).toBe(3);
      expect(result.evaluationCriteria.length).toBeGreaterThan(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'rfq.created',
        expect.any(Object),
      );
    });

    it('should publish an RFQ', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Test RFQ',
        lineItems: [
          {
            description: 'Item',
            quantity: 1,
            unitOfMeasure: 'pcs',
          },
        ],
        invitedSupplierIds: ['supplier_1'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: mockUserId,
      });

      const result = await service.publishRFQ(mockTenantId, rfq.id);

      expect(result.status).toBe(RFQStatus.PUBLISHED);
      expect(result.publishedAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'rfq.published',
        expect.objectContaining({
          rfqId: rfq.id,
          supplierIds: ['supplier_1'],
        }),
      );
    });

    it('should not publish RFQ without line items', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Empty RFQ',
        lineItems: [],
        invitedSupplierIds: ['supplier_1'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: mockUserId,
      });

      await expect(
        service.publishRFQ(mockTenantId, rfq.id),
      ).rejects.toThrow('must have at least one line item');
    });

    it('should close an RFQ', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Test RFQ',
        lineItems: [{ description: 'Item', quantity: 1, unitOfMeasure: 'pcs' }],
        invitedSupplierIds: ['supplier_1'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: mockUserId,
      });

      await service.publishRFQ(mockTenantId, rfq.id);
      const result = await service.closeRFQ(mockTenantId, rfq.id);

      expect(result.status).toBe(RFQStatus.CLOSED);
      expect(result.closedAt).toBeDefined();
    });

    it('should award RFQ to supplier', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Award Test RFQ',
        lineItems: [{ description: 'Item', quantity: 1, unitOfMeasure: 'pcs' }],
        invitedSupplierIds: ['supplier_1', 'supplier_2'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: mockUserId,
      });

      await service.publishRFQ(mockTenantId, rfq.id);

      // Create quotation from supplier
      const quotation = await service.createQuotation(mockTenantId, {
        rfqId: rfq.id,
        supplierId: 'supplier_1',
        supplierName: 'Supplier One',
        lineItems: [
          {
            rfqLineId: rfq.lineItems[0].id,
            description: 'Item',
            quantity: 1,
            unitOfMeasure: 'pcs',
            unitPrice: 1000,
            currency: 'RON',
          },
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await service.submitQuotation(mockTenantId, quotation.id);
      await service.closeRFQ(mockTenantId, rfq.id);

      const result = await service.awardRFQ(mockTenantId, rfq.id, 'supplier_1');

      expect(result.status).toBe(RFQStatus.AWARDED);
      expect(result.awardedSupplierId).toBe('supplier_1');

      const updatedQuotation = await service.getQuotation(mockTenantId, quotation.id);
      expect(updatedQuotation.status).toBe(QuotationStatus.ACCEPTED);
    });

    it('should cancel RFQ', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Cancel Test',
        lineItems: [{ description: 'Item', quantity: 1, unitOfMeasure: 'pcs' }],
        invitedSupplierIds: ['supplier_1'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: mockUserId,
      });

      const result = await service.cancelRFQ(
        mockTenantId,
        rfq.id,
        'Requirements changed',
      );

      expect(result.status).toBe(RFQStatus.CANCELLED);
      expect(result.metadata?.cancellationReason).toBe('Requirements changed');
    });
  });

  describe('Quotation Management', () => {
    let rfq: any;

    beforeEach(async () => {
      rfq = await service.createRFQ(mockTenantId, {
        title: 'Quotation Test RFQ',
        lineItems: [
          { description: 'Item A', quantity: 10, unitOfMeasure: 'pcs' },
          { description: 'Item B', quantity: 5, unitOfMeasure: 'pcs' },
        ],
        invitedSupplierIds: ['supplier_1', 'supplier_2', 'supplier_3'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        evaluationCriteria: [
          { criterion: ComparisonCriteria.PRICE, weight: 50 },
          { criterion: ComparisonCriteria.QUALITY, weight: 30 },
          { criterion: ComparisonCriteria.DELIVERY_TIME, weight: 20 },
        ],
        createdBy: mockUserId,
      });

      await service.publishRFQ(mockTenantId, rfq.id);
    });

    it('should create a quotation', async () => {
      const dto = {
        rfqId: rfq.id,
        supplierId: 'supplier_1',
        supplierName: 'Supplier One',
        supplierEmail: 'supplier1@example.com',
        lineItems: [
          {
            rfqLineId: rfq.lineItems[0].id,
            description: 'Item A',
            quantity: 10,
            unitOfMeasure: 'pcs',
            unitPrice: 100,
            currency: 'RON',
            leadTimeDays: 14,
          },
          {
            rfqLineId: rfq.lineItems[1].id,
            description: 'Item B',
            quantity: 5,
            unitOfMeasure: 'pcs',
            unitPrice: 200,
            currency: 'RON',
            leadTimeDays: 7,
          },
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deliveryTerms: 'DAP Bucharest',
        paymentTerms: 'Net 30',
        shippingCost: 100,
      };

      const result = await service.createQuotation(mockTenantId, dto);

      expect(result.id).toBeDefined();
      expect(result.quotationNumber).toMatch(/^QT-\d{4}-\d{6}$/);
      expect(result.status).toBe(QuotationStatus.DRAFT);
      expect(result.lineItems.length).toBe(2);
      expect(result.totalAmount).toBe(2000); // 10*100 + 5*200
      expect(result.grandTotal).toBe(2100); // 2000 + 100 shipping
    });

    it('should submit a quotation', async () => {
      const quotation = await service.createQuotation(mockTenantId, {
        rfqId: rfq.id,
        supplierId: 'supplier_1',
        supplierName: 'Supplier One',
        lineItems: [
          {
            rfqLineId: rfq.lineItems[0].id,
            description: 'Item',
            quantity: 10,
            unitOfMeasure: 'pcs',
            unitPrice: 100,
            currency: 'RON',
          },
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.submitQuotation(mockTenantId, quotation.id);

      expect(result.status).toBe(QuotationStatus.RECEIVED);
      expect(result.submittedAt).toBeDefined();

      // Check RFQ updated
      const updatedRFQ = await service.getRFQ(mockTenantId, rfq.id);
      expect(updatedRFQ.respondedSupplierIds).toContain('supplier_1');
    });

    it('should not allow duplicate quotations from same supplier', async () => {
      await service.createQuotation(mockTenantId, {
        rfqId: rfq.id,
        supplierId: 'supplier_1',
        supplierName: 'Supplier One',
        lineItems: [
          {
            rfqLineId: rfq.lineItems[0].id,
            description: 'Item',
            quantity: 10,
            unitOfMeasure: 'pcs',
            unitPrice: 100,
            currency: 'RON',
          },
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await expect(
        service.createQuotation(mockTenantId, {
          rfqId: rfq.id,
          supplierId: 'supplier_1',
          supplierName: 'Supplier One',
          lineItems: [
            {
              rfqLineId: rfq.lineItems[0].id,
              description: 'Item',
              quantity: 10,
              unitOfMeasure: 'pcs',
              unitPrice: 90,
              currency: 'RON',
            },
          ],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      ).rejects.toThrow('already has a quotation');
    });

    it('should calculate discount correctly', async () => {
      const quotation = await service.createQuotation(mockTenantId, {
        rfqId: rfq.id,
        supplierId: 'supplier_2',
        supplierName: 'Supplier Two',
        lineItems: [
          {
            rfqLineId: rfq.lineItems[0].id,
            description: 'Item',
            quantity: 10,
            unitOfMeasure: 'pcs',
            unitPrice: 100,
            currency: 'RON',
            discount: 10,
            discountType: 'percentage',
          },
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      expect(quotation.lineItems[0].totalPrice).toBe(900); // 1000 - 10%
    });

    it('should withdraw a quotation', async () => {
      const quotation = await service.createQuotation(mockTenantId, {
        rfqId: rfq.id,
        supplierId: 'supplier_1',
        supplierName: 'Supplier One',
        lineItems: [
          {
            rfqLineId: rfq.lineItems[0].id,
            description: 'Item',
            quantity: 10,
            unitOfMeasure: 'pcs',
            unitPrice: 100,
            currency: 'RON',
          },
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.withdrawQuotation(
        mockTenantId,
        quotation.id,
        'Cannot fulfill requirements',
      );

      expect(result.status).toBe(QuotationStatus.WITHDRAWN);
    });
  });

  describe('Quotation Scoring & Comparison', () => {
    let rfq: any;
    let quotations: any[];

    beforeEach(async () => {
      quotations = []; // Reset quotations array for each test
      rfq = await service.createRFQ(mockTenantId, {
        title: 'Comparison Test RFQ',
        lineItems: [
          {
            description: 'Item',
            quantity: 10,
            unitOfMeasure: 'pcs',
            targetUnitPrice: 100,
          },
        ],
        invitedSupplierIds: ['supplier_1', 'supplier_2', 'supplier_3'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        evaluationCriteria: [
          { criterion: ComparisonCriteria.PRICE, weight: 40 },
          { criterion: ComparisonCriteria.QUALITY, weight: 30 },
          { criterion: ComparisonCriteria.DELIVERY_TIME, weight: 30 },
        ],
        createdBy: mockUserId,
      });

      await service.publishRFQ(mockTenantId, rfq.id);

      // Create and submit quotations from multiple suppliers
      for (const [index, supplierId] of ['supplier_1', 'supplier_2', 'supplier_3'].entries()) {
        const quotation = await service.createQuotation(mockTenantId, {
          rfqId: rfq.id,
          supplierId,
          supplierName: `Supplier ${index + 1}`,
          lineItems: [
            {
              rfqLineId: rfq.lineItems[0].id,
              description: 'Item',
              quantity: 10,
              unitOfMeasure: 'pcs',
              unitPrice: 90 + index * 10, // 90, 100, 110
              currency: 'RON',
              leadTimeDays: 10 + index * 5, // 10, 15, 20 days
            },
          ],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          qualityCertifications: index === 0 ? ['ISO 9001'] : undefined,
        });

        await service.submitQuotation(mockTenantId, quotation.id);
        quotations.push(quotation);
      }
    });

    it('should score a quotation', async () => {
      const result = await service.scoreQuotation(
        mockTenantId,
        quotations[0].id,
        {
          priceScore: 90,
          qualityScore: 85,
          deliveryScore: 80,
        },
        mockUserId,
      );

      expect(result.scores).toBeDefined();
      expect(result.scores?.priceScore).toBe(90);
      expect(result.scores?.qualityScore).toBe(85);
      expect(result.scores?.deliveryScore).toBe(80);
      expect(result.scores?.totalWeightedScore).toBeGreaterThan(0);
      expect(result.status).toBe(QuotationStatus.UNDER_REVIEW);
      expect(result.reviewedBy).toBe(mockUserId);
    });

    it('should compare quotations', async () => {
      const comparison = await service.compareQuotations(mockTenantId, rfq.id);

      expect(comparison.rfqId).toBe(rfq.id);
      expect(comparison.quotations.length).toBe(3);
      expect(comparison.bestByPrice).toBe('supplier_1'); // Lowest price
      expect(comparison.bestByDelivery).toBe('supplier_1'); // Fastest delivery
      expect(comparison.bestOverall).toBeDefined();

      // Verify rankings are assigned
      const rankings = comparison.quotations.map((q) => q.ranking);
      expect(rankings).toContain(1);
      expect(rankings).toContain(2);
      expect(rankings).toContain(3);
    });

    it('should generate recommendation', async () => {
      const comparison = await service.compareQuotations(mockTenantId, rfq.id);

      expect(comparison.recommendation).toBeDefined();
      expect(comparison.recommendation?.recommendedSupplierId).toBeDefined();
      expect(comparison.recommendation?.reasons.length).toBeGreaterThan(0);
    });

    it('should shortlist a quotation', async () => {
      const result = await service.shortlistQuotation(
        mockTenantId,
        quotations[0].id,
      );

      expect(result.status).toBe(QuotationStatus.SHORTLISTED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'quotation.shortlisted',
        expect.objectContaining({
          quotationId: quotations[0].id,
        }),
      );
    });
  });

  describe('Analytics', () => {
    it('should get quotation analytics', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Analytics RFQ',
        lineItems: [{ description: 'Item', quantity: 1, unitOfMeasure: 'pcs' }],
        invitedSupplierIds: ['supplier_1', 'supplier_2'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: mockUserId,
      });

      await service.publishRFQ(mockTenantId, rfq.id);

      const quotation = await service.createQuotation(mockTenantId, {
        rfqId: rfq.id,
        supplierId: 'supplier_1',
        supplierName: 'Supplier One',
        lineItems: [
          {
            rfqLineId: rfq.lineItems[0].id,
            description: 'Item',
            quantity: 1,
            unitOfMeasure: 'pcs',
            unitPrice: 1000,
            currency: 'RON',
            leadTimeDays: 14,
          },
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await service.submitQuotation(mockTenantId, quotation.id);

      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const analytics = await service.getQuotationAnalytics(
        mockTenantId,
        dateFrom,
        dateTo,
      );

      expect(analytics.totalRFQs).toBeGreaterThanOrEqual(1);
      expect(analytics.totalQuotations).toBeGreaterThanOrEqual(1);
      expect(analytics.averageResponseRate).toBeGreaterThan(0);
      expect(analytics.totalValue).toBeGreaterThanOrEqual(1000);
      expect(analytics.averageLeadTime).toBe(14);
    });
  });

  describe('Edge Cases', () => {
    it('should not allow quotation from uninvited supplier', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Test RFQ',
        lineItems: [{ description: 'Item', quantity: 1, unitOfMeasure: 'pcs' }],
        invitedSupplierIds: ['supplier_1'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: mockUserId,
      });

      await service.publishRFQ(mockTenantId, rfq.id);

      await expect(
        service.createQuotation(mockTenantId, {
          rfqId: rfq.id,
          supplierId: 'uninvited_supplier',
          supplierName: 'Uninvited',
          lineItems: [
            {
              rfqLineId: rfq.lineItems[0].id,
              description: 'Item',
              quantity: 1,
              unitOfMeasure: 'pcs',
              unitPrice: 100,
              currency: 'RON',
            },
          ],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      ).rejects.toThrow('not invited');
    });

    it('should not allow quotation after deadline', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Expired RFQ',
        lineItems: [{ description: 'Item', quantity: 1, unitOfMeasure: 'pcs' }],
        invitedSupplierIds: ['supplier_1'],
        deadline: new Date(Date.now() + 100), // Very short deadline
        createdBy: mockUserId,
      });

      await service.publishRFQ(mockTenantId, rfq.id);

      // Wait for deadline to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      await expect(
        service.createQuotation(mockTenantId, {
          rfqId: rfq.id,
          supplierId: 'supplier_1',
          supplierName: 'Supplier',
          lineItems: [
            {
              rfqLineId: rfq.lineItems[0].id,
              description: 'Item',
              quantity: 1,
              unitOfMeasure: 'pcs',
              unitPrice: 100,
              currency: 'RON',
            },
          ],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      ).rejects.toThrow('deadline has passed');
    });

    it('should not award to supplier without quotation', async () => {
      const rfq = await service.createRFQ(mockTenantId, {
        title: 'Test RFQ',
        lineItems: [{ description: 'Item', quantity: 1, unitOfMeasure: 'pcs' }],
        invitedSupplierIds: ['supplier_1', 'supplier_2'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: mockUserId,
      });

      await service.publishRFQ(mockTenantId, rfq.id);
      await service.closeRFQ(mockTenantId, rfq.id);

      await expect(
        service.awardRFQ(mockTenantId, rfq.id, 'supplier_1'),
      ).rejects.toThrow('has no quotation');
    });
  });
});
