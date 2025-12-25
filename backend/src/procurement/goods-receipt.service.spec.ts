import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GoodsReceiptService,
  GRStatus,
  InspectionResult,
  QualityCheckType,
  DispositionAction,
} from './goods-receipt.service';

describe('GoodsReceiptService', () => {
  let service: GoodsReceiptService;
  let eventEmitter: EventEmitter2;

  const mockTenantId = 'tenant_123';
  const mockUserId = 'user_123';
  const mockUserName = 'John Doe';

  const createBasicGRDto = () => ({
    purchaseOrderId: 'po_123',
    purchaseOrderNumber: 'PO-2024-000001',
    supplierId: 'supplier_123',
    supplierName: 'Office Depot',
    lines: [
      {
        poLineId: 'po_line_1',
        poLineNumber: 1,
        itemCode: 'LAPTOP-001',
        description: 'Laptop',
        orderedQuantity: 10,
        receivedQuantity: 10,
        unitOfMeasure: 'pcs',
        unitPrice: 5000,
        lotNumber: 'LOT-2024-001',
        inspectionRequired: true,
      },
      {
        poLineId: 'po_line_2',
        poLineNumber: 2,
        itemCode: 'MONITOR-001',
        description: 'Monitor',
        orderedQuantity: 20,
        receivedQuantity: 18,
        unitOfMeasure: 'pcs',
        unitPrice: 2000,
        inspectionRequired: true,
      },
    ],
    receivedDate: new Date(),
    deliveryNoteNumber: 'DN-001',
    carrierName: 'DHL',
    warehouseId: 'warehouse_1',
    warehouseName: 'Main Warehouse',
    createdBy: mockUserId,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GoodsReceiptService>(GoodsReceiptService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Goods Receipt Creation', () => {
    it('should create a new goods receipt', async () => {
      const dto = createBasicGRDto();

      const result = await service.createGoodsReceipt(mockTenantId, dto);

      expect(result.id).toBeDefined();
      expect(result.grNumber).toMatch(/^GR-\d{4}-\d{6}$/);
      expect(result.status).toBe(GRStatus.DRAFT);
      expect(result.lines.length).toBe(2);
      expect(result.totalReceivedQuantity).toBe(28); // 10 + 18
      expect(result.totalValue).toBe(86000); // 10*5000 + 18*2000
      expect(result.totalAcceptedQuantity).toBe(0);
      expect(result.totalRejectedQuantity).toBe(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'goods_receipt.created',
        expect.any(Object),
      );
    });

    it('should track partial delivery correctly', async () => {
      const dto = createBasicGRDto();

      const result = await service.createGoodsReceipt(mockTenantId, dto);

      const line2 = result.lines.find((l) => l.itemCode === 'MONITOR-001');
      expect(line2?.orderedQuantity).toBe(20);
      expect(line2?.receivedQuantity).toBe(18);
    });
  });

  describe('Inspection Workflow', () => {
    let gr: any;

    beforeEach(async () => {
      gr = await service.createGoodsReceipt(mockTenantId, createBasicGRDto());
    });

    it('should start inspection', async () => {
      const result = await service.startInspection(
        mockTenantId,
        gr.id,
        mockUserId,
        mockUserName,
      );

      expect(result.status).toBe(GRStatus.INSPECTION_IN_PROGRESS);
      expect(result.inspectorId).toBe(mockUserId);
      expect(result.inspectorName).toBe(mockUserName);
      expect(result.inspectionStartedAt).toBeDefined();
    });

    it('should auto-accept when no inspection required', async () => {
      const dto = {
        ...createBasicGRDto(),
        lines: createBasicGRDto().lines.map((l) => ({
          ...l,
          inspectionRequired: false,
        })),
      };

      const noInspectionGR = await service.createGoodsReceipt(mockTenantId, dto);

      const result = await service.startInspection(
        mockTenantId,
        noInspectionGR.id,
        mockUserId,
        mockUserName,
      );

      expect(result.status).toBe(GRStatus.ACCEPTED);
      expect(result.overallInspectionResult).toBe(InspectionResult.WAIVED);
      expect(result.totalAcceptedQuantity).toBe(result.totalReceivedQuantity);
    });

    it('should record inspection results', async () => {
      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);

      const result = await service.recordInspection(
        mockTenantId,
        gr.id,
        [
          {
            lineId: gr.lines[0].id,
            qualityChecks: [
              {
                checkType: QualityCheckType.VISUAL,
                checkName: 'Visual Inspection',
                specification: 'No visible damage',
                result: InspectionResult.PASSED,
              },
              {
                checkType: QualityCheckType.FUNCTIONAL,
                checkName: 'Power On Test',
                specification: 'Device powers on',
                result: InspectionResult.PASSED,
              },
            ],
            overallResult: InspectionResult.PASSED,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
          },
        ],
        mockUserId,
      );

      const line = result.lines.find((l) => l.id === gr.lines[0].id);
      expect(line?.qualityChecks?.length).toBe(2);
      expect(line?.inspectionResult).toBe(InspectionResult.PASSED);
      expect(line?.acceptedQuantity).toBe(10);
    });

    it('should record inspection with deviations', async () => {
      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);

      const result = await service.recordInspection(
        mockTenantId,
        gr.id,
        [
          {
            lineId: gr.lines[1].id,
            qualityChecks: [
              {
                checkType: QualityCheckType.VISUAL,
                checkName: 'Visual Inspection',
                result: InspectionResult.PASSED_WITH_DEVIATION,
                notes: 'Minor scratches on 2 units',
              },
            ],
            overallResult: InspectionResult.PASSED_WITH_DEVIATION,
            acceptedQuantity: 16,
            rejectedQuantity: 2,
            deviations: [
              {
                type: 'quality',
                description: 'Surface scratches',
                severity: 'minor',
                action: DispositionAction.ACCEPT_WITH_CONCESSION,
                notes: 'Cosmetic only',
              },
            ],
          },
        ],
        mockUserId,
      );

      const line = result.lines.find((l) => l.id === gr.lines[1].id);
      expect(line?.deviations?.length).toBe(1);
      expect(line?.deviations?.[0].severity).toBe('minor');
    });

    it('should validate inspection quantities', async () => {
      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);

      await expect(
        service.recordInspection(
          mockTenantId,
          gr.id,
          [
            {
              lineId: gr.lines[0].id,
              qualityChecks: [],
              overallResult: InspectionResult.PASSED,
              acceptedQuantity: 5, // Should be 10
              rejectedQuantity: 3, // 5 + 3 != 10
            },
          ],
          mockUserId,
        ),
      ).rejects.toThrow('must equal received quantity');
    });

    it('should complete inspection', async () => {
      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);

      // Record all inspections
      await service.recordInspection(
        mockTenantId,
        gr.id,
        [
          {
            lineId: gr.lines[0].id,
            qualityChecks: [],
            overallResult: InspectionResult.PASSED,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
          },
          {
            lineId: gr.lines[1].id,
            qualityChecks: [],
            overallResult: InspectionResult.PASSED,
            acceptedQuantity: 18,
            rejectedQuantity: 0,
          },
        ],
        mockUserId,
      );

      const result = await service.completeInspection(
        mockTenantId,
        gr.id,
        mockUserId,
      );

      expect(result.status).toBe(GRStatus.INSPECTION_COMPLETED);
      expect(result.inspectionCompletedAt).toBeDefined();
      expect(result.overallInspectionResult).toBe(InspectionResult.PASSED);
    });

    it('should not complete inspection with uninspected lines', async () => {
      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);

      // Only inspect one line
      await service.recordInspection(
        mockTenantId,
        gr.id,
        [
          {
            lineId: gr.lines[0].id,
            qualityChecks: [],
            overallResult: InspectionResult.PASSED,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
          },
        ],
        mockUserId,
      );

      await expect(
        service.completeInspection(mockTenantId, gr.id, mockUserId),
      ).rejects.toThrow('have not been inspected');
    });
  });

  describe('Disposition', () => {
    let inspectedGR: any;

    beforeEach(async () => {
      inspectedGR = await service.createGoodsReceipt(
        mockTenantId,
        createBasicGRDto(),
      );

      await service.startInspection(
        mockTenantId,
        inspectedGR.id,
        mockUserId,
        mockUserName,
      );

      await service.recordInspection(
        mockTenantId,
        inspectedGR.id,
        [
          {
            lineId: inspectedGR.lines[0].id,
            qualityChecks: [],
            overallResult: InspectionResult.PASSED,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
          },
          {
            lineId: inspectedGR.lines[1].id,
            qualityChecks: [],
            overallResult: InspectionResult.FAILED,
            acceptedQuantity: 15,
            rejectedQuantity: 3,
          },
        ],
        mockUserId,
      );

      await service.completeInspection(mockTenantId, inspectedGR.id, mockUserId);
    });

    it('should set disposition for lines', async () => {
      const result = await service.setDisposition(
        mockTenantId,
        inspectedGR.id,
        [
          {
            lineId: inspectedGR.lines[0].id,
            disposition: DispositionAction.ACCEPT_TO_STOCK,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
          },
          {
            lineId: inspectedGR.lines[1].id,
            disposition: DispositionAction.RETURN_TO_SUPPLIER,
            acceptedQuantity: 15,
            rejectedQuantity: 3,
            notes: 'Defective units',
            returnReason: 'Quality issue',
          },
        ],
        mockUserId,
      );

      expect(result.status).toBe(GRStatus.PARTIALLY_ACCEPTED);
      expect(result.totalAcceptedQuantity).toBe(25);
      expect(result.totalRejectedQuantity).toBe(3);
    });

    it('should set status to REJECTED when all rejected', async () => {
      // Create a GR with all failed inspection
      const allFailedGR = await service.createGoodsReceipt(mockTenantId, {
        ...createBasicGRDto(),
        lines: [createBasicGRDto().lines[0]],
      });

      await service.startInspection(
        mockTenantId,
        allFailedGR.id,
        mockUserId,
        mockUserName,
      );

      await service.recordInspection(
        mockTenantId,
        allFailedGR.id,
        [
          {
            lineId: allFailedGR.lines[0].id,
            qualityChecks: [],
            overallResult: InspectionResult.FAILED,
            acceptedQuantity: 0,
            rejectedQuantity: 10,
          },
        ],
        mockUserId,
      );

      await service.completeInspection(mockTenantId, allFailedGR.id, mockUserId);

      const result = await service.setDisposition(
        mockTenantId,
        allFailedGR.id,
        [
          {
            lineId: allFailedGR.lines[0].id,
            disposition: DispositionAction.RETURN_TO_SUPPLIER,
            acceptedQuantity: 0,
            rejectedQuantity: 10,
          },
        ],
        mockUserId,
      );

      expect(result.status).toBe(GRStatus.REJECTED);
    });
  });

  describe('Inventory Posting', () => {
    it('should post accepted goods to inventory', async () => {
      const gr = await service.createGoodsReceipt(mockTenantId, {
        ...createBasicGRDto(),
        lines: createBasicGRDto().lines.map((l) => ({
          ...l,
          inspectionRequired: false,
        })),
      });

      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);

      const result = await service.postToInventory(
        mockTenantId,
        gr.id,
        mockUserId,
      );

      expect(result.status).toBe(GRStatus.POSTED);
      expect(result.postedToInventory).toBe(true);
      expect(result.postedAt).toBeDefined();
      expect(result.postedBy).toBe(mockUserId);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'goods_receipt.posted_to_inventory',
        expect.any(Object),
      );
    });

    it('should not post twice', async () => {
      const gr = await service.createGoodsReceipt(mockTenantId, {
        ...createBasicGRDto(),
        lines: createBasicGRDto().lines.map((l) => ({
          ...l,
          inspectionRequired: false,
        })),
      });

      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);
      await service.postToInventory(mockTenantId, gr.id, mockUserId);

      // After posting, status is POSTED which is not a postable status
      await expect(
        service.postToInventory(mockTenantId, gr.id, mockUserId),
      ).rejects.toThrow('Cannot post to inventory');
    });
  });

  describe('Cancellation', () => {
    it('should cancel draft goods receipt', async () => {
      const gr = await service.createGoodsReceipt(
        mockTenantId,
        createBasicGRDto(),
      );

      const result = await service.cancelGoodsReceipt(
        mockTenantId,
        gr.id,
        mockUserId,
        'Duplicate receipt',
      );

      expect(result.status).toBe(GRStatus.CANCELLED);
      expect(result.metadata?.cancellationReason).toBe('Duplicate receipt');
    });

    it('should not cancel posted goods receipt', async () => {
      const gr = await service.createGoodsReceipt(mockTenantId, {
        ...createBasicGRDto(),
        lines: createBasicGRDto().lines.map((l) => ({
          ...l,
          inspectionRequired: false,
        })),
      });

      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);
      await service.postToInventory(mockTenantId, gr.id, mockUserId);

      await expect(
        service.cancelGoodsReceipt(mockTenantId, gr.id, mockUserId, 'Try cancel'),
      ).rejects.toThrow('Cannot cancel posted');
    });
  });

  describe('Return Request', () => {
    it('should create return request for rejected items', async () => {
      const gr = await service.createGoodsReceipt(
        mockTenantId,
        createBasicGRDto(),
      );

      await service.startInspection(mockTenantId, gr.id, mockUserId, mockUserName);

      await service.recordInspection(
        mockTenantId,
        gr.id,
        [
          {
            lineId: gr.lines[0].id,
            qualityChecks: [],
            overallResult: InspectionResult.PASSED,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
          },
          {
            lineId: gr.lines[1].id,
            qualityChecks: [],
            overallResult: InspectionResult.FAILED,
            acceptedQuantity: 15,
            rejectedQuantity: 3,
          },
        ],
        mockUserId,
      );

      await service.completeInspection(mockTenantId, gr.id, mockUserId);

      await service.setDisposition(
        mockTenantId,
        gr.id,
        [
          {
            lineId: gr.lines[0].id,
            disposition: DispositionAction.ACCEPT_TO_STOCK,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
          },
          {
            lineId: gr.lines[1].id,
            disposition: DispositionAction.RETURN_TO_SUPPLIER,
            acceptedQuantity: 15,
            rejectedQuantity: 3,
          },
        ],
        mockUserId,
      );

      const { returnRequestId, goodsReceipt } = await service.createReturnRequest(
        mockTenantId,
        gr.id,
        [gr.lines[1].id],
        'Defective units',
        mockUserId,
      );

      expect(returnRequestId).toBeDefined();
      expect(goodsReceipt.returnRequestId).toBe(returnRequestId);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'goods_receipt.return_requested',
        expect.objectContaining({
          returnRequestId,
          lines: expect.arrayContaining([
            expect.objectContaining({
              quantity: 3,
            }),
          ]),
        }),
      );
    });
  });

  describe('Search', () => {
    it('should search goods receipts with filters', async () => {
      await service.createGoodsReceipt(mockTenantId, {
        ...createBasicGRDto(),
        supplierId: 'supplier_A',
        supplierName: 'Supplier A',
      });

      await service.createGoodsReceipt(mockTenantId, {
        ...createBasicGRDto(),
        supplierId: 'supplier_B',
        supplierName: 'Supplier B',
      });

      // Search by supplier
      const results = await service.searchGoodsReceipts(mockTenantId, {
        supplierId: 'supplier_A',
      });

      expect(results.data.length).toBe(1);
      expect(results.data[0].supplierName).toBe('Supplier A');
    });
  });

  describe('Analytics', () => {
    it('should get goods receipt analytics', async () => {
      const gr1 = await service.createGoodsReceipt(
        mockTenantId,
        createBasicGRDto(),
      );

      await service.createGoodsReceipt(mockTenantId, createBasicGRDto());

      // Process first GR
      await service.startInspection(mockTenantId, gr1.id, mockUserId, mockUserName);
      await service.recordInspection(
        mockTenantId,
        gr1.id,
        gr1.lines.map((line) => ({
          lineId: line.id,
          qualityChecks: [],
          overallResult: InspectionResult.PASSED,
          acceptedQuantity: line.receivedQuantity,
          rejectedQuantity: 0,
        })),
        mockUserId,
      );
      await service.completeInspection(mockTenantId, gr1.id, mockUserId);

      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const analytics = await service.getGRAnalytics(
        mockTenantId,
        dateFrom,
        dateTo,
      );

      expect(analytics.totalReceipts).toBe(2);
      expect(analytics.totalValue).toBeGreaterThan(0);
      expect(analytics.totalQuantityReceived).toBe(56); // 28 * 2
      expect(analytics.byStatus[GRStatus.DRAFT]).toBe(1);
      expect(analytics.byStatus[GRStatus.INSPECTION_COMPLETED]).toBe(1);
    });
  });
});
