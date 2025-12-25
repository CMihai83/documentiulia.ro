import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PurchaseOrdersService,
  POStatus,
  POLineStatus,
  PaymentTerms,
  DeliveryTerms,
} from './purchase-orders.service';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let eventEmitter: EventEmitter2;

  const mockTenantId = 'tenant_123';
  const mockUserId = 'user_123';
  const mockUserName = 'John Doe';

  const createBasicPODto = () => ({
    title: 'Office Supplies PO',
    supplierId: 'supplier_123',
    supplierName: 'Office Depot',
    supplierEmail: 'sales@officedepot.com',
    supplierAddress: 'Bucharest, Romania',
    supplierTaxId: 'RO12345678',
    buyerCompany: 'Acme Corp',
    buyerAddress: 'Cluj-Napoca, Romania',
    buyerTaxId: 'RO87654321',
    lines: [
      {
        description: 'Laptop',
        quantity: 5,
        unitOfMeasure: 'pcs',
        unitPrice: 5000,
        taxRate: 19,
      },
      {
        description: 'Monitor',
        quantity: 10,
        unitOfMeasure: 'pcs',
        unitPrice: 2000,
        taxRate: 19,
      },
    ],
    deliveryAddress: 'Warehouse A, Bucharest',
    paymentTerms: PaymentTerms.NET_30,
    deliveryTerms: DeliveryTerms.DAP,
    createdBy: mockUserId,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('PO Creation', () => {
    it('should create a new purchase order', async () => {
      const dto = createBasicPODto();

      const result = await service.createPurchaseOrder(mockTenantId, dto);

      expect(result.id).toBeDefined();
      expect(result.poNumber).toMatch(/^PO-\d{4}-\d{6}$/);
      expect(result.status).toBe(POStatus.DRAFT);
      expect(result.lines.length).toBe(2);
      expect(result.revision).toBe(0);
      expect(result.subtotal).toBe(45000); // 5*5000 + 10*2000
      expect(result.totalTax).toBe(8550); // 45000 * 19%
      expect(result.grandTotal).toBe(53550); // 45000 + 8550
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'purchase_order.created',
        expect.any(Object),
      );
    });

    it('should calculate discount correctly', async () => {
      const dto = {
        ...createBasicPODto(),
        lines: [
          {
            description: 'Item',
            quantity: 10,
            unitOfMeasure: 'pcs',
            unitPrice: 100,
            discount: 10,
            discountType: 'percentage' as const,
            taxRate: 19,
          },
        ],
      };

      const result = await service.createPurchaseOrder(mockTenantId, dto);

      expect(result.lines[0].lineTotal).toBe(900); // 1000 - 10%
      expect(result.subtotal).toBe(900);
    });

    it('should set default payment and delivery terms', async () => {
      const dto = createBasicPODto();
      delete (dto as any).paymentTerms;
      delete (dto as any).deliveryTerms;

      const result = await service.createPurchaseOrder(mockTenantId, dto);

      expect(result.paymentTerms).toBe(PaymentTerms.NET_30);
      expect(result.deliveryTerms).toBe(DeliveryTerms.DAP);
    });
  });

  describe('PO Updates', () => {
    it('should update a draft PO', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      const result = await service.updatePurchaseOrder(mockTenantId, po.id, {
        title: 'Updated Title',
        deliveryInstructions: 'Leave at reception',
        shippingCost: 500,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.deliveryInstructions).toBe('Leave at reception');
      expect(result.shippingCost).toBe(500);
      expect(result.grandTotal).toBe(54050); // Previous + 500 shipping
    });

    it('should not update non-draft PO directly', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        { ...createBasicPODto(), approvalRequired: false },
      );

      await service.submitForApproval(mockTenantId, po.id);

      await expect(
        service.updatePurchaseOrder(mockTenantId, po.id, {
          title: 'New Title',
        }),
      ).rejects.toThrow('Only draft POs can be updated');
    });
  });

  describe('Line Amendments', () => {
    it('should add a new line item', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      const result = await service.addLineItem(
        mockTenantId,
        po.id,
        {
          description: 'Keyboard',
          quantity: 10,
          unitOfMeasure: 'pcs',
          unitPrice: 200,
          taxRate: 19,
        },
        mockUserId,
        mockUserName,
        'Additional equipment needed',
      );

      expect(result.lines.length).toBe(3);
      expect(result.amendments.length).toBe(1);
      expect(result.amendments[0].changeType).toBe('add_line');
      expect(result.revision).toBe(1);
    });

    it('should amend line quantity', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      const result = await service.amendLine(
        mockTenantId,
        po.id,
        {
          lineId: po.lines[0].id,
          changeType: 'quantity',
          newValue: 10,
          reason: 'Increased requirement',
        },
        mockUserId,
        mockUserName,
      );

      expect(result.lines[0].quantity).toBe(10);
      expect(result.amendments.length).toBe(1);
      expect(result.amendments[0].previousValue).toBe(5);
      expect(result.amendments[0].newValue).toBe(10);
    });

    it('should amend line price', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      const originalSubtotal = po.subtotal;

      const result = await service.amendLine(
        mockTenantId,
        po.id,
        {
          lineId: po.lines[0].id,
          changeType: 'price',
          newValue: 4500,
          reason: 'Negotiated discount',
        },
        mockUserId,
        mockUserName,
      );

      expect(result.lines[0].unitPrice).toBe(4500);
      expect(result.subtotal).toBeLessThan(originalSubtotal);
    });

    it('should cancel a line', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      const result = await service.amendLine(
        mockTenantId,
        po.id,
        {
          lineId: po.lines[0].id,
          changeType: 'cancel',
          reason: 'Item no longer needed',
        },
        mockUserId,
        mockUserName,
      );

      expect(result.lines[0].status).toBe(POLineStatus.CANCELLED);
      expect(result.lines[0].remainingQuantity).toBe(0);
    });

    it('should not cancel line with received quantity', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        { ...createBasicPODto(), approvalRequired: false },
      );

      await service.submitForApproval(mockTenantId, po.id);
      await service.sendToSupplier(mockTenantId, po.id);
      await service.acknowledgeBySupplier(mockTenantId, po.id);

      // Receive some items
      await service.recordReceipt(
        mockTenantId,
        po.id,
        [
          {
            lineId: po.lines[0].id,
            receivedQuantity: 2,
            receivedDate: new Date(),
          },
        ],
        mockUserId,
      );

      await expect(
        service.amendLine(
          mockTenantId,
          po.id,
          {
            lineId: po.lines[0].id,
            changeType: 'cancel',
            reason: 'Try to cancel',
          },
          mockUserId,
          mockUserName,
        ),
      ).rejects.toThrow('Cannot cancel line with received quantity');
    });
  });

  describe('Approval Workflow', () => {
    it('should submit PO for approval', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      const result = await service.submitForApproval(mockTenantId, po.id);

      expect(result.status).toBe(POStatus.PENDING_APPROVAL);
    });

    it('should auto-approve when approval not required', async () => {
      const po = await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        approvalRequired: false,
      });

      const result = await service.submitForApproval(mockTenantId, po.id);

      expect(result.status).toBe(POStatus.APPROVED);
      expect(result.approvedAt).toBeDefined();
    });

    it('should approve PO', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      await service.submitForApproval(mockTenantId, po.id);

      const result = await service.approvePurchaseOrder(
        mockTenantId,
        po.id,
        'approver_123',
      );

      expect(result.status).toBe(POStatus.APPROVED);
      expect(result.approvedBy).toBe('approver_123');
      expect(result.approvedAt).toBeDefined();
    });

    it('should reject PO', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      await service.submitForApproval(mockTenantId, po.id);

      const result = await service.rejectPurchaseOrder(
        mockTenantId,
        po.id,
        'approver_123',
        'Budget exceeded',
      );

      expect(result.status).toBe(POStatus.DRAFT);
      expect(result.metadata?.rejectionReason).toBe('Budget exceeded');
    });
  });

  describe('Supplier Workflow', () => {
    let approvedPO: any;

    beforeEach(async () => {
      approvedPO = await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        approvalRequired: false,
      });

      await service.submitForApproval(mockTenantId, approvedPO.id);
    });

    it('should send PO to supplier', async () => {
      const result = await service.sendToSupplier(mockTenantId, approvedPO.id);

      expect(result.status).toBe(POStatus.SENT_TO_SUPPLIER);
      expect(result.sentToSupplierAt).toBeDefined();
    });

    it('should acknowledge PO', async () => {
      await service.sendToSupplier(mockTenantId, approvedPO.id);

      const promisedDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const result = await service.acknowledgeBySupplier(
        mockTenantId,
        approvedPO.id,
        promisedDate,
      );

      expect(result.status).toBe(POStatus.ACKNOWLEDGED);
      expect(result.acknowledgedAt).toBeDefined();
      expect(result.promisedDeliveryDate).toEqual(promisedDate);
    });
  });

  describe('Receipt Processing', () => {
    let acknowledgedPO: any;

    beforeEach(async () => {
      acknowledgedPO = await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        approvalRequired: false,
      });

      await service.submitForApproval(mockTenantId, acknowledgedPO.id);
      await service.sendToSupplier(mockTenantId, acknowledgedPO.id);
      await service.acknowledgeBySupplier(mockTenantId, acknowledgedPO.id);
    });

    it('should record partial receipt', async () => {
      const result = await service.recordReceipt(
        mockTenantId,
        acknowledgedPO.id,
        [
          {
            lineId: acknowledgedPO.lines[0].id,
            receivedQuantity: 2,
            receivedDate: new Date(),
          },
        ],
        mockUserId,
      );

      expect(result.status).toBe(POStatus.PARTIALLY_RECEIVED);
      expect(result.lines[0].receivedQuantity).toBe(2);
      expect(result.lines[0].remainingQuantity).toBe(3);
      expect(result.lines[0].status).toBe(POLineStatus.PARTIALLY_RECEIVED);
    });

    it('should record full receipt', async () => {
      const result = await service.recordReceipt(
        mockTenantId,
        acknowledgedPO.id,
        [
          {
            lineId: acknowledgedPO.lines[0].id,
            receivedQuantity: 5,
            receivedDate: new Date(),
          },
          {
            lineId: acknowledgedPO.lines[1].id,
            receivedQuantity: 10,
            receivedDate: new Date(),
          },
        ],
        mockUserId,
      );

      expect(result.status).toBe(POStatus.FULLY_RECEIVED);
      expect(result.lines[0].status).toBe(POLineStatus.FULLY_RECEIVED);
      expect(result.lines[1].status).toBe(POLineStatus.FULLY_RECEIVED);
    });

    it('should not allow over-receipt', async () => {
      await expect(
        service.recordReceipt(
          mockTenantId,
          acknowledgedPO.id,
          [
            {
              lineId: acknowledgedPO.lines[0].id,
              receivedQuantity: 100,
              receivedDate: new Date(),
            },
          ],
          mockUserId,
        ),
      ).rejects.toThrow('exceeds remaining quantity');
    });
  });

  describe('Invoice & Close', () => {
    it('should mark fully received PO as invoiced', async () => {
      const po = await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        approvalRequired: false,
      });

      await service.submitForApproval(mockTenantId, po.id);
      await service.sendToSupplier(mockTenantId, po.id);
      await service.acknowledgeBySupplier(mockTenantId, po.id);
      await service.recordReceipt(
        mockTenantId,
        po.id,
        [
          { lineId: po.lines[0].id, receivedQuantity: 5, receivedDate: new Date() },
          { lineId: po.lines[1].id, receivedQuantity: 10, receivedDate: new Date() },
        ],
        mockUserId,
      );

      const result = await service.markAsInvoiced(
        mockTenantId,
        po.id,
        'INV-001',
      );

      expect(result.status).toBe(POStatus.INVOICED);
      expect(result.metadata?.invoiceId).toBe('INV-001');
    });

    it('should close an invoiced PO', async () => {
      const po = await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        approvalRequired: false,
      });

      await service.submitForApproval(mockTenantId, po.id);
      await service.sendToSupplier(mockTenantId, po.id);
      await service.acknowledgeBySupplier(mockTenantId, po.id);
      await service.recordReceipt(
        mockTenantId,
        po.id,
        [
          { lineId: po.lines[0].id, receivedQuantity: 5, receivedDate: new Date() },
          { lineId: po.lines[1].id, receivedQuantity: 10, receivedDate: new Date() },
        ],
        mockUserId,
      );
      await service.markAsInvoiced(mockTenantId, po.id, 'INV-001');

      const result = await service.closePurchaseOrder(
        mockTenantId,
        po.id,
        mockUserId,
      );

      expect(result.status).toBe(POStatus.CLOSED);
    });
  });

  describe('Cancellation', () => {
    it('should cancel draft PO', async () => {
      const po = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      const result = await service.cancelPurchaseOrder(
        mockTenantId,
        po.id,
        mockUserId,
        'Requirements changed',
      );

      expect(result.status).toBe(POStatus.CANCELLED);
      expect(result.metadata?.cancellationReason).toBe('Requirements changed');
      result.lines.forEach((line) => {
        expect(line.status).toBe(POLineStatus.CANCELLED);
      });
    });

    it('should not cancel fully received PO', async () => {
      const po = await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        approvalRequired: false,
      });

      await service.submitForApproval(mockTenantId, po.id);
      await service.sendToSupplier(mockTenantId, po.id);
      await service.acknowledgeBySupplier(mockTenantId, po.id);
      await service.recordReceipt(
        mockTenantId,
        po.id,
        [
          { lineId: po.lines[0].id, receivedQuantity: 5, receivedDate: new Date() },
          { lineId: po.lines[1].id, receivedQuantity: 10, receivedDate: new Date() },
        ],
        mockUserId,
      );

      await expect(
        service.cancelPurchaseOrder(
          mockTenantId,
          po.id,
          mockUserId,
          'Cancel attempt',
        ),
      ).rejects.toThrow('cannot be cancelled');
    });

    it('should not cancel PO with received items', async () => {
      const po = await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        approvalRequired: false,
      });

      await service.submitForApproval(mockTenantId, po.id);
      await service.sendToSupplier(mockTenantId, po.id);
      await service.acknowledgeBySupplier(mockTenantId, po.id);
      await service.recordReceipt(
        mockTenantId,
        po.id,
        [{ lineId: po.lines[0].id, receivedQuantity: 1, receivedDate: new Date() }],
        mockUserId,
      );

      await expect(
        service.cancelPurchaseOrder(
          mockTenantId,
          po.id,
          mockUserId,
          'Cancel attempt',
        ),
      ).rejects.toThrow('received items');
    });
  });

  describe('Duplication', () => {
    it('should duplicate a purchase order', async () => {
      const original = await service.createPurchaseOrder(
        mockTenantId,
        createBasicPODto(),
      );

      const duplicate = await service.duplicatePurchaseOrder(
        mockTenantId,
        original.id,
        mockUserId,
      );

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.poNumber).not.toBe(original.poNumber);
      expect(duplicate.title).toBe(`Copy of ${original.title}`);
      expect(duplicate.status).toBe(POStatus.DRAFT);
      expect(duplicate.lines.length).toBe(original.lines.length);
      expect(duplicate.supplierId).toBe(original.supplierId);
    });
  });

  describe('Search', () => {
    it('should search POs with filters', async () => {
      await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        title: 'PO Alpha',
      });

      await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        title: 'PO Beta',
        supplierId: 'supplier_456',
        supplierName: 'Different Supplier',
      });

      // Search by supplier
      const supplierResults = await service.searchPurchaseOrders(mockTenantId, {
        supplierId: 'supplier_123',
      });
      expect(supplierResults.data.length).toBe(1);
      expect(supplierResults.data[0].title).toBe('PO Alpha');

      // Search by text
      const searchResults = await service.searchPurchaseOrders(mockTenantId, {
        search: 'Beta',
      });
      expect(searchResults.data.length).toBe(1);
      expect(searchResults.data[0].title).toBe('PO Beta');
    });
  });

  describe('Analytics', () => {
    it('should get PO analytics', async () => {
      const po1 = await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        approvalRequired: false,
      });

      await service.createPurchaseOrder(mockTenantId, {
        ...createBasicPODto(),
        supplierId: 'supplier_456',
        supplierName: 'Supplier B',
      });

      // Process first PO
      await service.submitForApproval(mockTenantId, po1.id);
      await service.sendToSupplier(mockTenantId, po1.id);
      await service.acknowledgeBySupplier(mockTenantId, po1.id);

      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const analytics = await service.getPOAnalytics(
        mockTenantId,
        dateFrom,
        dateTo,
      );

      expect(analytics.totalPOs).toBe(2);
      expect(analytics.totalValue).toBeGreaterThan(0);
      expect(analytics.byStatus[POStatus.DRAFT]).toBe(1);
      expect(analytics.byStatus[POStatus.ACKNOWLEDGED]).toBe(1);
      expect(analytics.bySupplier.length).toBe(2);
    });
  });
});
