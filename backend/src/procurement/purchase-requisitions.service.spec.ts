import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PurchaseRequisitionsService,
  RequisitionStatus,
  RequisitionPriority,
  ApprovalAction,
  ApprovalStatus,
} from './purchase-requisitions.service';

describe('PurchaseRequisitionsService', () => {
  let service: PurchaseRequisitionsService;
  let eventEmitter: EventEmitter2;

  const mockTenantId = 'tenant_123';
  const mockUserId = 'user_123';
  const mockUserName = 'John Doe';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseRequisitionsService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PurchaseRequisitionsService>(PurchaseRequisitionsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Requisition Management', () => {
    it('should create a new requisition', async () => {
      const dto = {
        title: 'Office Supplies Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        requesterDepartment: 'IT',
        priority: RequisitionPriority.MEDIUM,
        lines: [
          {
            description: 'Laptop',
            category: 'Electronics',
            quantity: 5,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 5000,
            currency: 'RON',
          },
          {
            description: 'Mouse',
            category: 'Electronics',
            quantity: 10,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 100,
            currency: 'RON',
          },
        ],
        justification: 'New employee equipment',
      };

      const result = await service.createRequisition(mockTenantId, dto);

      expect(result.id).toBeDefined();
      expect(result.requisitionNumber).toMatch(/^PR-\d{4}-\d{6}$/);
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.title).toBe(dto.title);
      expect(result.status).toBe(RequisitionStatus.DRAFT);
      expect(result.lines.length).toBe(2);
      expect(result.totalAmount).toBe(26000); // 5*5000 + 10*100
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'requisition.created',
        expect.any(Object),
      );
    });

    it('should update a draft requisition', async () => {
      const createDto = {
        title: 'Initial Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item 1',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 100,
            currency: 'RON',
          },
        ],
      };

      const requisition = await service.createRequisition(mockTenantId, createDto);

      const updateDto = {
        title: 'Updated Request',
        priority: RequisitionPriority.HIGH,
      };

      const result = await service.updateRequisition(
        mockTenantId,
        requisition.id,
        updateDto,
      );

      expect(result.title).toBe('Updated Request');
      expect(result.priority).toBe(RequisitionPriority.HIGH);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'requisition.updated',
        expect.any(Object),
      );
    });

    it('should not update non-draft requisition', async () => {
      const requisition = await service.createRequisition(mockTenantId, {
        title: 'Test Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item 1',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 100,
            currency: 'RON',
          },
        ],
      });

      await service.submitForApproval(mockTenantId, requisition.id);

      await expect(
        service.updateRequisition(mockTenantId, requisition.id, {
          title: 'New Title',
        }),
      ).rejects.toThrow('Only draft requisitions can be modified');
    });

    it('should delete a draft requisition', async () => {
      const requisition = await service.createRequisition(mockTenantId, {
        title: 'Test Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item 1',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 100,
            currency: 'RON',
          },
        ],
      });

      await service.deleteRequisition(mockTenantId, requisition.id);

      await expect(
        service.getRequisition(mockTenantId, requisition.id),
      ).rejects.toThrow('not found');
    });

    it('should search requisitions with filters', async () => {
      // Create multiple requisitions
      await service.createRequisition(mockTenantId, {
        title: 'High Priority Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        priority: RequisitionPriority.HIGH,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      await service.createRequisition(mockTenantId, {
        title: 'Low Priority Request',
        requesterId: 'user_456',
        requesterName: 'Jane Doe',
        priority: RequisitionPriority.LOW,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 500,
            currency: 'RON',
          },
        ],
      });

      // Search by priority
      const highPriorityResults = await service.searchRequisitions(mockTenantId, {
        priority: RequisitionPriority.HIGH,
      });
      expect(highPriorityResults.data.length).toBe(1);
      expect(highPriorityResults.data[0].title).toBe('High Priority Request');

      // Search by requester
      const requesterResults = await service.searchRequisitions(mockTenantId, {
        requesterId: mockUserId,
      });
      expect(requesterResults.data.length).toBe(1);

      // Search by amount range
      const amountResults = await service.searchRequisitions(mockTenantId, {
        minAmount: 600,
      });
      expect(amountResults.data.length).toBe(1);
    });
  });

  describe('Approval Workflow', () => {
    it('should submit requisition for approval', async () => {
      const requisition = await service.createRequisition(mockTenantId, {
        title: 'Test Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item 1',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 100,
            currency: 'RON',
          },
        ],
      });

      const result = await service.submitForApproval(mockTenantId, requisition.id);

      // Without approval rules, should auto-approve
      expect(result.status).toBe(RequisitionStatus.APPROVED);
      expect(result.approvedAt).toBeDefined();
    });

    it('should follow approval workflow with rules', async () => {
      // Create approval rule
      await service.createApprovalRule(mockTenantId, {
        name: 'Standard Approval',
        conditions: [
          { field: 'totalAmount', operator: 'gt', value: 0 },
        ],
        approverLevels: [
          {
            level: 1,
            approverType: 'user',
            approverId: 'approver_1',
            requiredApprovals: 1,
            allowDelegation: true,
          },
          {
            level: 2,
            approverType: 'user',
            approverId: 'approver_2',
            requiredApprovals: 1,
            allowDelegation: false,
          },
        ],
      });

      const requisition = await service.createRequisition(mockTenantId, {
        title: 'Test Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      const submitted = await service.submitForApproval(mockTenantId, requisition.id);

      expect(submitted.status).toBe(RequisitionStatus.PENDING_APPROVAL);
      expect(submitted.approvalSteps.length).toBe(2);
      expect(submitted.currentApprovalLevel).toBe(1);

      // First approval
      const afterFirstApproval = await service.processApproval(
        mockTenantId,
        requisition.id,
        'approver_1',
        'First Approver',
        {
          action: ApprovalAction.APPROVE,
          comments: 'Looks good',
        },
      );

      expect(afterFirstApproval.currentApprovalLevel).toBe(2);

      // Second approval
      const afterSecondApproval = await service.processApproval(
        mockTenantId,
        requisition.id,
        'approver_2',
        'Second Approver',
        {
          action: ApprovalAction.APPROVE,
          comments: 'Final approval',
        },
      );

      expect(afterSecondApproval.status).toBe(RequisitionStatus.APPROVED);
      expect(afterSecondApproval.approvedAt).toBeDefined();
    });

    it('should handle rejection', async () => {
      // Create approval rule
      await service.createApprovalRule(mockTenantId, {
        name: 'Simple Approval',
        conditions: [{ field: 'totalAmount', operator: 'gt', value: 0 }],
        approverLevels: [
          {
            level: 1,
            approverType: 'user',
            approverId: 'approver_1',
            requiredApprovals: 1,
            allowDelegation: false,
          },
        ],
      });

      const requisition = await service.createRequisition(mockTenantId, {
        title: 'Test Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      await service.submitForApproval(mockTenantId, requisition.id);

      const result = await service.processApproval(
        mockTenantId,
        requisition.id,
        'approver_1',
        'Approver',
        {
          action: ApprovalAction.REJECT,
          comments: 'Budget exceeded',
        },
      );

      expect(result.status).toBe(RequisitionStatus.REJECTED);
      expect(result.rejectedAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'requisition.rejected',
        expect.objectContaining({
          requisitionId: requisition.id,
          reason: 'Budget exceeded',
        }),
      );
    });

    it('should handle delegation', async () => {
      await service.createApprovalRule(mockTenantId, {
        name: 'Delegation Test',
        conditions: [{ field: 'totalAmount', operator: 'gt', value: 0 }],
        approverLevels: [
          {
            level: 1,
            approverType: 'user',
            approverId: 'approver_1',
            requiredApprovals: 1,
            allowDelegation: true,
          },
        ],
      });

      const requisition = await service.createRequisition(mockTenantId, {
        title: 'Test Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      await service.submitForApproval(mockTenantId, requisition.id);

      const result = await service.processApproval(
        mockTenantId,
        requisition.id,
        'approver_1',
        'Original Approver',
        {
          action: ApprovalAction.DELEGATE,
          delegateTo: 'delegate_1',
          comments: 'Delegating while on vacation',
        },
      );

      expect(result.approvalSteps.length).toBe(2); // Original + delegated
      expect(
        result.approvalSteps.find((s) => s.status === ApprovalStatus.DELEGATED),
      ).toBeDefined();
      expect(
        result.approvalSteps.find(
          (s) => s.approverId === 'delegate_1' && s.status === ApprovalStatus.PENDING,
        ),
      ).toBeDefined();
    });

    it('should cancel requisition', async () => {
      const requisition = await service.createRequisition(mockTenantId, {
        title: 'Test Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      const result = await service.cancelRequisition(
        mockTenantId,
        requisition.id,
        mockUserId,
        mockUserName,
        'No longer needed',
      );

      expect(result.status).toBe(RequisitionStatus.CANCELLED);
      expect(result.cancelledAt).toBeDefined();
    });
  });

  describe('Approval Queue', () => {
    it('should get approval queue for approver', async () => {
      await service.createApprovalRule(mockTenantId, {
        name: 'Queue Test',
        conditions: [{ field: 'totalAmount', operator: 'gt', value: 0 }],
        approverLevels: [
          {
            level: 1,
            approverType: 'user',
            approverId: 'queue_approver',
            requiredApprovals: 1,
            allowDelegation: false,
          },
        ],
      });

      const req1 = await service.createRequisition(mockTenantId, {
        title: 'Request 1',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      const req2 = await service.createRequisition(mockTenantId, {
        title: 'Request 2',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 2000,
            currency: 'RON',
          },
        ],
      });

      await service.submitForApproval(mockTenantId, req1.id);
      await service.submitForApproval(mockTenantId, req2.id);

      const queue = await service.getApprovalQueue(mockTenantId, 'queue_approver');

      expect(queue.length).toBe(2);
      expect(queue[0].requisition).toBeDefined();
      expect(queue[0].pendingStep).toBeDefined();
      expect(queue[0].daysWaiting).toBeDefined();
    });
  });

  describe('Approval Rules', () => {
    it('should create and list approval rules', async () => {
      const rule = await service.createApprovalRule(mockTenantId, {
        name: 'High Value Approval',
        description: 'Requires manager approval for high value items',
        conditions: [
          { field: 'totalAmount', operator: 'gte', value: 10000 },
        ],
        approverLevels: [
          {
            level: 1,
            approverType: 'role',
            roleName: 'manager',
            requiredApprovals: 1,
            allowDelegation: true,
          },
        ],
        priority: 10,
      });

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('High Value Approval');
      expect(rule.isActive).toBe(true);

      const rules = await service.getApprovalRules(mockTenantId);
      expect(rules.length).toBeGreaterThanOrEqual(1);
      expect(rules.find((r) => r.id === rule.id)).toBeDefined();
    });

    it('should update approval rule', async () => {
      const rule = await service.createApprovalRule(mockTenantId, {
        name: 'Original Rule',
        conditions: [{ field: 'totalAmount', operator: 'gt', value: 0 }],
        approverLevels: [
          {
            level: 1,
            approverType: 'user',
            approverId: 'approver_1',
            requiredApprovals: 1,
            allowDelegation: false,
          },
        ],
      });

      const updated = await service.updateApprovalRule(mockTenantId, rule.id, {
        name: 'Updated Rule',
        priority: 5,
      });

      expect(updated.name).toBe('Updated Rule');
      expect(updated.priority).toBe(5);
    });

    it('should delete approval rule (soft delete)', async () => {
      const rule = await service.createApprovalRule(mockTenantId, {
        name: 'To Delete',
        conditions: [{ field: 'totalAmount', operator: 'gt', value: 0 }],
        approverLevels: [
          {
            level: 1,
            approverType: 'user',
            approverId: 'approver_1',
            requiredApprovals: 1,
            allowDelegation: false,
          },
        ],
      });

      await service.deleteApprovalRule(mockTenantId, rule.id);

      const rules = await service.getApprovalRules(mockTenantId);
      expect(rules.find((r) => r.id === rule.id)).toBeUndefined();
    });
  });

  describe('Analytics', () => {
    it('should get requisition analytics', async () => {
      // Create some requisitions
      const req1 = await service.createRequisition(mockTenantId, {
        title: 'Analytics Test 1',
        requesterId: mockUserId,
        requesterName: mockUserName,
        priority: RequisitionPriority.HIGH,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      await service.createRequisition(mockTenantId, {
        title: 'Analytics Test 2',
        requesterId: mockUserId,
        requesterName: mockUserName,
        priority: RequisitionPriority.LOW,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 2000,
            currency: 'RON',
          },
        ],
      });

      // Submit one for approval (auto-approve without rules)
      await service.submitForApproval(mockTenantId, req1.id);

      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const analytics = await service.getRequisitionAnalytics(
        mockTenantId,
        dateFrom,
        dateTo,
      );

      expect(analytics.totalRequisitions).toBeGreaterThanOrEqual(2);
      expect(analytics.totalAmount).toBeGreaterThanOrEqual(3000);
      expect(analytics.byPriority[RequisitionPriority.HIGH]).toBeGreaterThanOrEqual(1);
      expect(analytics.byPriority[RequisitionPriority.LOW]).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Convert to PO', () => {
    it('should mark approved requisition as converted to PO', async () => {
      const requisition = await service.createRequisition(mockTenantId, {
        title: 'PO Conversion Test',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      await service.submitForApproval(mockTenantId, requisition.id);

      const result = await service.markAsConvertedToPO(
        mockTenantId,
        requisition.id,
        'po_123',
      );

      expect(result.status).toBe(RequisitionStatus.CONVERTED_TO_PO);
      expect(result.linkedPurchaseOrderIds).toContain('po_123');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'requisition.converted',
        expect.objectContaining({
          purchaseOrderId: 'po_123',
        }),
      );
    });

    it('should not convert non-approved requisition', async () => {
      const requisition = await service.createRequisition(mockTenantId, {
        title: 'Draft Request',
        requesterId: mockUserId,
        requesterName: mockUserName,
        lines: [
          {
            description: 'Item',
            category: 'General',
            quantity: 1,
            unitOfMeasure: 'pcs',
            estimatedUnitPrice: 1000,
            currency: 'RON',
          },
        ],
      });

      await expect(
        service.markAsConvertedToPO(mockTenantId, requisition.id, 'po_123'),
      ).rejects.toThrow('Only approved requisitions');
    });
  });
});
