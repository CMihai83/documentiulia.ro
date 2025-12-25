import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  NonConformanceService,
  NCRStatus,
  NCRType,
  NCRSeverity,
  NCRSource,
  DispositionType,
  CreateNCRDto,
  AddContainmentActionDto,
  SetDispositionDto,
  InvestigationDto,
} from './non-conformance.service';

describe('NonConformanceService', () => {
  let service: NonConformanceService;
  let eventEmitter: EventEmitter2;
  const tenantId = `tenant_ncr_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const baseNCRDto: CreateNCRDto = {
    type: NCRType.PRODUCT,
    severity: NCRSeverity.MAJOR,
    source: NCRSource.INSPECTION,
    title: 'Defective Product Batch',
    description: 'Product batch 2024-001 failed quality inspection',
    itemId: 'item_001',
    itemCode: 'PRD-001',
    itemName: 'Widget A',
    lotNumber: 'LOT-2024-001',
    quantity: 100,
    unitOfMeasure: 'units',
    supplierId: 'supplier_001',
    supplierName: 'Acme Corp',
    locationId: 'loc_001',
    locationName: 'Warehouse A',
    detectedDate: new Date(),
    detectedBy: 'user_001',
    detectedByName: 'John Inspector',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    tags: ['urgent', 'supplier-issue'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NonConformanceService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NonConformanceService>(NonConformanceService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('createNCR', () => {
    it('should create a non-conformance report', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);

      expect(ncr).toBeDefined();
      expect(ncr.id).toBeDefined();
      expect(ncr.ncrNumber).toMatch(/^NCR-\d{4}-\d{6}$/);
      expect(ncr.status).toBe(NCRStatus.DRAFT);
      expect(ncr.type).toBe(NCRType.PRODUCT);
      expect(ncr.severity).toBe(NCRSeverity.MAJOR);
      expect(ncr.title).toBe('Defective Product Batch');
      expect(ncr.containmentActions).toHaveLength(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('ncr.created', expect.any(Object));
    });

    it('should generate unique NCR numbers', async () => {
      const ncr1 = await service.createNCR(tenantId, baseNCRDto);
      const ncr2 = await service.createNCR(tenantId, baseNCRDto);

      expect(ncr1.ncrNumber).not.toBe(ncr2.ncrNumber);
    });
  });

  describe('openNCR', () => {
    it('should open a draft NCR', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      const opened = await service.openNCR(tenantId, ncr.id);

      expect(opened.status).toBe(NCRStatus.OPEN);
      expect(eventEmitter.emit).toHaveBeenCalledWith('ncr.opened', expect.any(Object));
    });

    it('should reject opening non-draft NCR', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await service.openNCR(tenantId, ncr.id);

      await expect(service.openNCR(tenantId, ncr.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignNCR', () => {
    it('should assign NCR to a user', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      const assigned = await service.assignNCR(
        tenantId,
        ncr.id,
        'user_002',
        'Jane Manager',
      );

      expect(assigned.assignedTo).toBe('user_002');
      expect(assigned.assignedToName).toBe('Jane Manager');
      expect(eventEmitter.emit).toHaveBeenCalledWith('ncr.assigned', expect.any(Object));
    });
  });

  describe('containment actions', () => {
    it('should add containment action', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await service.openNCR(tenantId, ncr.id);

      const actionDto: AddContainmentActionDto = {
        action: 'Quarantine affected batch',
        description: 'Move all units to quarantine zone',
        assignedTo: 'user_003',
        assignedToName: 'Mike Warehouse',
        dueDate: new Date(),
      };

      const updated = await service.addContainmentAction(tenantId, ncr.id, actionDto);

      expect(updated.containmentActions).toHaveLength(1);
      expect(updated.containmentActions[0].action).toBe('Quarantine affected batch');
      expect(updated.containmentActions[0].status).toBe('pending');
    });

    it('should reject adding action to closed NCR', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await service.cancelNCR(tenantId, ncr.id, 'Test cancellation');

      const actionDto: AddContainmentActionDto = {
        action: 'Test action',
        assignedTo: 'user_001',
        assignedToName: 'Test User',
      };

      await expect(
        service.addContainmentAction(tenantId, ncr.id, actionDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update containment action status', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await service.openNCR(tenantId, ncr.id);

      const actionDto: AddContainmentActionDto = {
        action: 'Test action',
        assignedTo: 'user_001',
        assignedToName: 'Test User',
      };

      const withAction = await service.addContainmentAction(tenantId, ncr.id, actionDto);
      const actionId = withAction.containmentActions[0].id;

      const updated = await service.updateContainmentAction(
        tenantId,
        ncr.id,
        actionId,
        'completed',
        'Action completed successfully',
      );

      expect(updated.containmentActions[0].status).toBe('completed');
      expect(updated.containmentActions[0].completedAt).toBeDefined();
      expect(updated.containmentActions[0].notes).toBe('Action completed successfully');
    });

    it('should throw if action not found', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);

      await expect(
        service.updateContainmentAction(tenantId, ncr.id, 'invalid_action', 'completed'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('investigation workflow', () => {
    it('should start investigation', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await service.openNCR(tenantId, ncr.id);
      const investigating = await service.startInvestigation(tenantId, ncr.id);

      expect(investigating.status).toBe(NCRStatus.UNDER_INVESTIGATION);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ncr.investigation_started',
        expect.any(Object),
      );
    });

    it('should reject investigation on non-open NCR', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);

      await expect(service.startInvestigation(tenantId, ncr.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should record investigation findings', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await service.openNCR(tenantId, ncr.id);
      await service.startInvestigation(tenantId, ncr.id);

      const investigationDto: InvestigationDto = {
        rootCause: 'Supplier material defect',
        findings: 'Raw material batch 2024-005 contained impurities',
        investigatedBy: 'user_004',
        investigatedByName: 'Sarah Engineer',
      };

      const investigated = await service.recordInvestigation(
        tenantId,
        ncr.id,
        investigationDto,
      );

      expect(investigated.status).toBe(NCRStatus.PENDING_DISPOSITION);
      expect(investigated.rootCause).toBe('Supplier material defect');
      expect(investigated.metadata?.investigationFindings).toBe(
        'Raw material batch 2024-005 contained impurities',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ncr.investigation_completed',
        expect.any(Object),
      );
    });
  });

  describe('disposition workflow', () => {
    let preparedNCRId: string;

    beforeEach(async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await service.openNCR(tenantId, ncr.id);
      await service.startInvestigation(tenantId, ncr.id);
      await service.recordInvestigation(tenantId, ncr.id, {
        rootCause: 'Material defect',
        investigatedBy: 'user_001',
        investigatedByName: 'Test',
      });
      preparedNCRId = ncr.id;
    });

    it('should set disposition', async () => {
      const dispositionDto: SetDispositionDto = {
        type: DispositionType.REWORK,
        description: 'Rework units to meet specification',
        quantity: 100,
        approvedBy: 'user_005',
        approvedByName: 'Quality Manager',
        notes: 'Approved for rework process',
      };

      const withDisposition = await service.setDisposition(
        tenantId,
        preparedNCRId,
        dispositionDto,
      );

      expect(withDisposition.status).toBe(NCRStatus.DISPOSITION_APPROVED);
      expect(withDisposition.disposition).toBeDefined();
      expect(withDisposition.disposition?.type).toBe(DispositionType.REWORK);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ncr.disposition_set',
        expect.any(Object),
      );
    });

    it('should implement disposition', async () => {
      await service.setDisposition(tenantId, preparedNCRId, {
        type: DispositionType.SCRAP,
        description: 'Scrap defective units',
        quantity: 100,
        approvedBy: 'user_005',
        approvedByName: 'Quality Manager',
      });

      const implemented = await service.implementDisposition(
        tenantId,
        preparedNCRId,
        'user_006',
        'Production Lead',
      );

      expect(implemented.status).toBe(NCRStatus.IN_PROGRESS);
      expect(implemented.disposition?.implementedBy).toBe('user_006');
      expect(implemented.disposition?.implementedAt).toBeDefined();
    });

    it('should request verification', async () => {
      await service.setDisposition(tenantId, preparedNCRId, {
        type: DispositionType.REWORK,
        description: 'Rework',
        quantity: 100,
        approvedBy: 'user_005',
        approvedByName: 'QA',
      });
      await service.implementDisposition(tenantId, preparedNCRId, 'user_006', 'Lead');

      const pending = await service.requestVerification(tenantId, preparedNCRId);

      expect(pending.status).toBe(NCRStatus.PENDING_VERIFICATION);
    });

    it('should verify and close NCR', async () => {
      await service.setDisposition(tenantId, preparedNCRId, {
        type: DispositionType.REWORK,
        description: 'Rework',
        quantity: 100,
        approvedBy: 'user_005',
        approvedByName: 'QA',
      });
      await service.implementDisposition(tenantId, preparedNCRId, 'user_006', 'Lead');
      await service.requestVerification(tenantId, preparedNCRId);

      const closed = await service.verifyAndClose(
        tenantId,
        preparedNCRId,
        'user_007',
        'QA Auditor',
        'Verified rework successful',
      );

      expect(closed.status).toBe(NCRStatus.CLOSED);
      expect(closed.verifiedBy).toBe('user_007');
      expect(closed.closedDate).toBeDefined();
      expect(closed.disposition?.verifiedAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('ncr.closed', expect.any(Object));
    });
  });

  describe('cancelNCR', () => {
    it('should cancel an NCR', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      const cancelled = await service.cancelNCR(
        tenantId,
        ncr.id,
        'Created in error',
      );

      expect(cancelled.status).toBe(NCRStatus.CANCELLED);
      expect(cancelled.metadata?.cancellationReason).toBe('Created in error');
      expect(eventEmitter.emit).toHaveBeenCalledWith('ncr.cancelled', expect.any(Object));
    });

    it('should reject cancelling closed NCR', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await service.openNCR(tenantId, ncr.id);
      await service.startInvestigation(tenantId, ncr.id);
      await service.recordInvestigation(tenantId, ncr.id, {
        rootCause: 'Test',
        investigatedBy: 'user_001',
        investigatedByName: 'Test',
      });
      await service.setDisposition(tenantId, ncr.id, {
        type: DispositionType.USE_AS_IS,
        description: 'Test',
        quantity: 100,
        approvedBy: 'user_001',
        approvedByName: 'Test',
      });
      await service.implementDisposition(tenantId, ncr.id, 'user_001', 'Test');
      await service.requestVerification(tenantId, ncr.id);
      await service.verifyAndClose(tenantId, ncr.id, 'user_001', 'Test');

      await expect(
        service.cancelNCR(tenantId, ncr.id, 'Test'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('linkToCAPA', () => {
    it('should link NCR to CAPA', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      const linked = await service.linkToCAPA(
        tenantId,
        ncr.id,
        'capa_001',
        'CAPA-2024-000001',
      );

      expect(linked.capaId).toBe('capa_001');
      expect(linked.capaNumber).toBe('CAPA-2024-000001');
    });
  });

  describe('setCost', () => {
    it('should set NCR cost', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      const withCost = await service.setCost(tenantId, ncr.id, 5000, 'RON');

      expect(withCost.cost).toBe(5000);
      expect(withCost.currency).toBe('RON');
    });
  });

  describe('getNCR', () => {
    it('should get NCR by id', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      const retrieved = await service.getNCR(tenantId, ncr.id);

      expect(retrieved.id).toBe(ncr.id);
    });

    it('should throw if NCR not found', async () => {
      await expect(service.getNCR(tenantId, 'invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if tenant mismatch', async () => {
      const ncr = await service.createNCR(tenantId, baseNCRDto);
      await expect(service.getNCR('other_tenant', ncr.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listNCRs', () => {
    const listTenantId = `tenant_list_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    beforeEach(async () => {
      // Create multiple NCRs with different attributes
      await service.createNCR(listTenantId, {
        ...baseNCRDto,
        type: NCRType.PRODUCT,
        severity: NCRSeverity.CRITICAL,
      });
      await service.createNCR(listTenantId, {
        ...baseNCRDto,
        type: NCRType.SUPPLIER,
        severity: NCRSeverity.MAJOR,
      });
      const ncr3 = await service.createNCR(listTenantId, {
        ...baseNCRDto,
        type: NCRType.PROCESS,
        severity: NCRSeverity.MINOR,
      });
      await service.openNCR(listTenantId, ncr3.id);
    });

    it('should list all NCRs for tenant', async () => {
      const ncrs = await service.listNCRs(listTenantId, {});
      expect(ncrs.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by status', async () => {
      const ncrs = await service.listNCRs(listTenantId, {
        status: NCRStatus.OPEN,
      });
      expect(ncrs.every((n) => n.status === NCRStatus.OPEN)).toBe(true);
    });

    it('should filter by type', async () => {
      const ncrs = await service.listNCRs(listTenantId, {
        type: NCRType.PRODUCT,
      });
      expect(ncrs.every((n) => n.type === NCRType.PRODUCT)).toBe(true);
    });

    it('should filter by severity', async () => {
      const ncrs = await service.listNCRs(listTenantId, {
        severity: NCRSeverity.CRITICAL,
      });
      expect(ncrs.every((n) => n.severity === NCRSeverity.CRITICAL)).toBe(true);
    });

    it('should filter by hasCAPA', async () => {
      const ncr = await service.createNCR(listTenantId, baseNCRDto);
      await service.linkToCAPA(listTenantId, ncr.id, 'capa_001', 'CAPA-001');

      const withCAPA = await service.listNCRs(listTenantId, { hasCAPA: true });
      const withoutCAPA = await service.listNCRs(listTenantId, { hasCAPA: false });

      expect(withCAPA.every((n) => n.capaId != null)).toBe(true);
      expect(withoutCAPA.every((n) => n.capaId == null)).toBe(true);
    });
  });

  describe('getNCRMetrics', () => {
    const metricsTenantId = `tenant_metrics_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    beforeEach(async () => {
      // Create various NCRs for metrics
      const ncr1 = await service.createNCR(metricsTenantId, {
        ...baseNCRDto,
        type: NCRType.PRODUCT,
        severity: NCRSeverity.CRITICAL,
      });
      await service.setCost(metricsTenantId, ncr1.id, 1000, 'RON');

      const ncr2 = await service.createNCR(metricsTenantId, {
        ...baseNCRDto,
        type: NCRType.SUPPLIER,
        severity: NCRSeverity.MAJOR,
      });
      await service.setCost(metricsTenantId, ncr2.id, 2000, 'RON');

      // Create and close one NCR
      const ncr3 = await service.createNCR(metricsTenantId, {
        ...baseNCRDto,
        type: NCRType.PRODUCT,
        severity: NCRSeverity.MINOR,
      });
      await service.openNCR(metricsTenantId, ncr3.id);
      await service.startInvestigation(metricsTenantId, ncr3.id);
      await service.recordInvestigation(metricsTenantId, ncr3.id, {
        rootCause: 'Test',
        investigatedBy: 'user_001',
        investigatedByName: 'Test',
      });
      await service.setDisposition(metricsTenantId, ncr3.id, {
        type: DispositionType.SCRAP,
        description: 'Test',
        quantity: 10,
        approvedBy: 'user_001',
        approvedByName: 'Test',
      });
      await service.implementDisposition(metricsTenantId, ncr3.id, 'user_001', 'Test');
      await service.requestVerification(metricsTenantId, ncr3.id);
      await service.verifyAndClose(metricsTenantId, ncr3.id, 'user_001', 'Test');
    });

    it('should calculate NCR metrics', async () => {
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const metrics = await service.getNCRMetrics(metricsTenantId, dateFrom, dateTo);

      expect(metrics.totalNCRs).toBeGreaterThanOrEqual(3);
      expect(metrics.closedNCRs).toBeGreaterThanOrEqual(1);
      expect(metrics.totalCost).toBeGreaterThanOrEqual(3000);
      expect(metrics.byType[NCRType.PRODUCT]).toBeGreaterThanOrEqual(2);
      expect(metrics.bySeverity[NCRSeverity.CRITICAL]).toBeGreaterThanOrEqual(1);
      expect(metrics.byDisposition[DispositionType.SCRAP]).toBeGreaterThanOrEqual(1);
    });

    it('should return top suppliers', async () => {
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const metrics = await service.getNCRMetrics(metricsTenantId, dateFrom, dateTo);

      expect(metrics.topSuppliers).toBeDefined();
      expect(Array.isArray(metrics.topSuppliers)).toBe(true);
    });

    it('should return top items', async () => {
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const metrics = await service.getNCRMetrics(metricsTenantId, dateFrom, dateTo);

      expect(metrics.topItems).toBeDefined();
      expect(Array.isArray(metrics.topItems)).toBe(true);
    });
  });

  describe('NCR workflow - complete cycle', () => {
    it('should complete full NCR lifecycle', async () => {
      // Create
      const ncr = await service.createNCR(tenantId, {
        ...baseNCRDto,
        title: 'Complete Lifecycle Test',
      });
      expect(ncr.status).toBe(NCRStatus.DRAFT);

      // Open
      const opened = await service.openNCR(tenantId, ncr.id);
      expect(opened.status).toBe(NCRStatus.OPEN);

      // Assign
      const assigned = await service.assignNCR(
        tenantId,
        ncr.id,
        'user_lead',
        'Team Lead',
      );
      expect(assigned.assignedTo).toBe('user_lead');

      // Add containment
      await service.addContainmentAction(tenantId, ncr.id, {
        action: 'Isolate batch',
        assignedTo: 'user_worker',
        assignedToName: 'Worker',
      });

      // Start investigation
      const investigating = await service.startInvestigation(tenantId, ncr.id);
      expect(investigating.status).toBe(NCRStatus.UNDER_INVESTIGATION);

      // Record findings
      const investigated = await service.recordInvestigation(tenantId, ncr.id, {
        rootCause: 'Process deviation',
        findings: 'Temperature exceeded tolerance',
        investigatedBy: 'user_eng',
        investigatedByName: 'Engineer',
      });
      expect(investigated.status).toBe(NCRStatus.PENDING_DISPOSITION);

      // Set disposition
      const dispositioned = await service.setDisposition(tenantId, ncr.id, {
        type: DispositionType.REWORK,
        description: 'Re-process with correct temperature',
        quantity: 100,
        approvedBy: 'user_qa',
        approvedByName: 'QA Manager',
      });
      expect(dispositioned.status).toBe(NCRStatus.DISPOSITION_APPROVED);

      // Implement
      const implemented = await service.implementDisposition(
        tenantId,
        ncr.id,
        'user_prod',
        'Production',
      );
      expect(implemented.status).toBe(NCRStatus.IN_PROGRESS);

      // Request verification
      const pending = await service.requestVerification(tenantId, ncr.id);
      expect(pending.status).toBe(NCRStatus.PENDING_VERIFICATION);

      // Link CAPA
      const linked = await service.linkToCAPA(
        tenantId,
        ncr.id,
        'capa_001',
        'CAPA-2024-000001',
      );
      expect(linked.capaId).toBe('capa_001');

      // Set cost
      const costed = await service.setCost(tenantId, ncr.id, 5000, 'RON');
      expect(costed.cost).toBe(5000);

      // Verify and close
      const closed = await service.verifyAndClose(
        tenantId,
        ncr.id,
        'user_auditor',
        'Auditor',
        'All corrective actions verified',
      );
      expect(closed.status).toBe(NCRStatus.CLOSED);
      expect(closed.closedDate).toBeDefined();
    });
  });
});
