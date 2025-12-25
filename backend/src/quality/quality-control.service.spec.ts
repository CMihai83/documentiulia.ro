import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  QualityControlService,
  InspectionType,
  InspectionStatus,
  InspectionResult,
  SamplingMethod,
  DefectSeverity,
  CheckType,
  CreateInspectionDto,
  CreateChecklistDto,
} from './quality-control.service';

describe('QualityControlService', () => {
  let service: QualityControlService;
  let eventEmitter: EventEmitter2;
  let tenantId: string;

  beforeEach(async () => {
    tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityControlService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QualityControlService>(QualityControlService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Inspection Operations', () => {
    const createInspectionDto: CreateInspectionDto = {
      type: InspectionType.INCOMING,
      referenceType: 'purchase_order',
      referenceId: 'po_123',
      referenceNumber: 'PO-2025-001',
      itemId: 'item_1',
      itemCode: 'SKU001',
      itemName: 'Test Product',
      lotNumber: 'LOT001',
      supplierId: 'supplier_1',
      supplierName: 'Test Supplier',
      samplingMethod: SamplingMethod.AQL,
      sampleSize: 50,
      totalQuantity: 500,
      plannedDate: new Date(),
    };

    it('should create an inspection', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);

      expect(inspection).toBeDefined();
      expect(inspection.id).toBeDefined();
      expect(inspection.inspectionNumber).toMatch(/^QI-\d{4}-\d{6}$/);
      expect(inspection.status).toBe(InspectionStatus.PLANNED);
      expect(inspection.result).toBe(InspectionResult.PENDING);
      expect(inspection.type).toBe(InspectionType.INCOMING);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'quality_inspection.created',
        expect.any(Object),
      );
    });

    it('should start an inspection', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      const started = await service.startInspection(tenantId, inspection.id);

      expect(started.status).toBe(InspectionStatus.IN_PROGRESS);
      expect(started.startedAt).toBeDefined();
    });

    it('should not start non-planned inspection', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);

      await expect(
        service.startInspection(tenantId, inspection.id),
      ).rejects.toThrow('Inspection is not in planned status');
    });

    it('should add check to inspection', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      const updated = await service.addCheck(tenantId, inspection.id, {
        checkType: CheckType.VISUAL,
        checkName: 'Surface Quality',
        description: 'Check for scratches',
        sequence: 1,
      });

      expect(updated.checks).toHaveLength(1);
      expect(updated.checks[0].checkName).toBe('Surface Quality');
    });

    it('should record check result', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      const withCheck = await service.addCheck(tenantId, inspection.id, {
        checkType: CheckType.DIMENSIONAL,
        checkName: 'Length Check',
        specification: '100mm ± 2mm',
        minValue: 98,
        maxValue: 102,
        targetValue: 100,
        unit: 'mm',
        sequence: 1,
      });
      await service.startInspection(tenantId, inspection.id);

      const updated = await service.recordCheckResult(tenantId, inspection.id, {
        checkId: withCheck.checks[0].id,
        actualValue: 101,
        result: InspectionResult.PASS,
        notes: 'Within tolerance',
      });

      expect(updated.checks[0].actualValue).toBe(101);
      expect(updated.checks[0].result).toBe(InspectionResult.PASS);
    });

    it('should record defect', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);

      const updated = await service.recordDefect(tenantId, inspection.id, {
        defectCode: 'DEF001',
        defectName: 'Surface Scratch',
        severity: DefectSeverity.MINOR,
        quantity: 3,
        description: 'Light scratches on surface',
      });

      expect(updated.defects).toHaveLength(1);
      expect(updated.totalDefects).toBe(3);
      expect(updated.minorDefects).toBe(3);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'quality_defect.recorded',
        expect.any(Object),
      );
    });

    it('should record critical defect', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);

      const updated = await service.recordDefect(tenantId, inspection.id, {
        defectCode: 'DEF002',
        defectName: 'Safety Issue',
        severity: DefectSeverity.CRITICAL,
        quantity: 1,
        description: 'Critical safety defect',
      });

      expect(updated.criticalDefects).toBe(1);
    });

    it('should complete inspection with pass result', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);

      const completed = await service.completeInspection(tenantId, inspection.id, {
        passedQuantity: 48,
        failedQuantity: 2,
        inspectedBy: 'inspector_1',
        inspectedByName: 'John Inspector',
      });

      expect(completed.status).toBe(InspectionStatus.PENDING_REVIEW);
      expect(completed.result).toBe(InspectionResult.PASS);
      expect(completed.acceptanceRate).toBe(96);
    });

    it('should complete inspection with conditional pass', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);

      const completed = await service.completeInspection(tenantId, inspection.id, {
        passedQuantity: 42,
        failedQuantity: 8,
        inspectedBy: 'inspector_1',
        inspectedByName: 'John Inspector',
      });

      expect(completed.result).toBe(InspectionResult.CONDITIONAL_PASS);
      expect(completed.acceptanceRate).toBe(84);
    });

    it('should complete inspection with fail result', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);

      const completed = await service.completeInspection(tenantId, inspection.id, {
        passedQuantity: 35,
        failedQuantity: 15,
        inspectedBy: 'inspector_1',
        inspectedByName: 'John Inspector',
      });

      expect(completed.result).toBe(InspectionResult.FAIL);
      expect(completed.acceptanceRate).toBe(70);
    });

    it('should fail inspection with critical defects', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);
      await service.recordDefect(tenantId, inspection.id, {
        defectCode: 'CRIT001',
        defectName: 'Critical Defect',
        severity: DefectSeverity.CRITICAL,
        quantity: 1,
        description: 'Critical issue found',
      });

      const completed = await service.completeInspection(tenantId, inspection.id, {
        passedQuantity: 49,
        failedQuantity: 1,
        inspectedBy: 'inspector_1',
        inspectedByName: 'John Inspector',
      });

      expect(completed.result).toBe(InspectionResult.FAIL);
    });

    it('should not complete inspection exceeding sample size', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);

      await expect(
        service.completeInspection(tenantId, inspection.id, {
          passedQuantity: 40,
          failedQuantity: 20,
          inspectedBy: 'inspector_1',
          inspectedByName: 'Inspector',
        }),
      ).rejects.toThrow('Quantities exceed sample size');
    });

    it('should review and approve inspection', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);
      await service.completeInspection(tenantId, inspection.id, {
        passedQuantity: 48,
        failedQuantity: 2,
        inspectedBy: 'inspector_1',
        inspectedByName: 'Inspector',
      });

      const reviewed = await service.reviewInspection(
        tenantId,
        inspection.id,
        true,
        'reviewer_1',
        'John Reviewer',
        'Approved',
      );

      expect(reviewed.status).toBe(InspectionStatus.APPROVED);
      expect(reviewed.reviewedBy).toBe('reviewer_1');
    });

    it('should review and reject inspection', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);
      await service.completeInspection(tenantId, inspection.id, {
        passedQuantity: 35,
        failedQuantity: 15,
        inspectedBy: 'inspector_1',
        inspectedByName: 'Inspector',
      });

      const reviewed = await service.reviewInspection(
        tenantId,
        inspection.id,
        false,
        'reviewer_1',
        'John Reviewer',
        'Quality too low',
      );

      expect(reviewed.status).toBe(InspectionStatus.REJECTED);
    });

    it('should put inspection on hold', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      const onHold = await service.putOnHold(
        tenantId,
        inspection.id,
        'Awaiting clarification',
      );

      expect(onHold.status).toBe(InspectionStatus.ON_HOLD);
      expect(onHold.metadata?.holdReason).toBe('Awaiting clarification');
    });

    it('should release from hold', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.putOnHold(tenantId, inspection.id, 'Reason');
      const released = await service.releaseFromHold(tenantId, inspection.id);

      expect(released.status).toBe(InspectionStatus.IN_PROGRESS);
    });

    it('should cancel inspection', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      const cancelled = await service.cancelInspection(
        tenantId,
        inspection.id,
        'PO cancelled',
      );

      expect(cancelled.status).toBe(InspectionStatus.CANCELLED);
      expect(cancelled.metadata?.cancellationReason).toBe('PO cancelled');
    });

    it('should not cancel approved inspection', async () => {
      const inspection = await service.createInspection(tenantId, createInspectionDto);
      await service.startInspection(tenantId, inspection.id);
      await service.completeInspection(tenantId, inspection.id, {
        passedQuantity: 50,
        failedQuantity: 0,
        inspectedBy: 'inspector_1',
        inspectedByName: 'Inspector',
      });
      await service.reviewInspection(tenantId, inspection.id, true, 'reviewer_1', 'Reviewer');

      await expect(
        service.cancelInspection(tenantId, inspection.id, 'Reason'),
      ).rejects.toThrow('Cannot cancel approved inspection');
    });

    it('should get inspection by id', async () => {
      const created = await service.createInspection(tenantId, createInspectionDto);
      const inspection = await service.getInspection(tenantId, created.id);

      expect(inspection.id).toBe(created.id);
    });

    it('should throw when inspection not found', async () => {
      await expect(
        service.getInspection(tenantId, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should list inspections with filters', async () => {
      await service.createInspection(tenantId, createInspectionDto);
      await service.createInspection(tenantId, {
        ...createInspectionDto,
        type: InspectionType.FINAL,
      });

      const inspections = await service.listInspections(tenantId, {
        type: InspectionType.INCOMING,
      });

      expect(inspections).toHaveLength(1);
      expect(inspections[0].type).toBe(InspectionType.INCOMING);
    });
  });

  describe('Checklist Operations', () => {
    const createChecklistDto: CreateChecklistDto = {
      code: 'CL001',
      name: 'Incoming Inspection Checklist',
      description: 'Standard checklist for incoming goods',
      inspectionType: InspectionType.INCOMING,
      checks: [
        {
          checkType: CheckType.VISUAL,
          checkName: 'Packaging Condition',
          description: 'Check packaging for damage',
          isMandatory: true,
          isPassFail: true,
          sequence: 1,
        },
        {
          checkType: CheckType.DOCUMENTATION,
          checkName: 'Certificate of Analysis',
          description: 'Verify COA is present',
          isMandatory: true,
          isPassFail: true,
          sequence: 2,
        },
      ],
      createdBy: 'user_1',
    };

    it('should create a checklist', async () => {
      const checklist = await service.createChecklist(tenantId, createChecklistDto);

      expect(checklist).toBeDefined();
      expect(checklist.id).toBeDefined();
      expect(checklist.code).toBe('CL001');
      expect(checklist.checks).toHaveLength(2);
      expect(checklist.isActive).toBe(true);
      expect(checklist.version).toBe(1);
    });

    it('should update a checklist', async () => {
      const checklist = await service.createChecklist(tenantId, createChecklistDto);
      const updated = await service.updateChecklist(tenantId, checklist.id, {
        name: 'Updated Checklist Name',
      });

      expect(updated.name).toBe('Updated Checklist Name');
    });

    it('should increment version when checks updated', async () => {
      const checklist = await service.createChecklist(tenantId, createChecklistDto);
      const updated = await service.updateChecklist(tenantId, checklist.id, {
        checks: [
          {
            checkType: CheckType.VISUAL,
            checkName: 'New Check',
            isMandatory: true,
            isPassFail: true,
            sequence: 1,
          },
        ],
      });

      expect(updated.version).toBe(2);
      expect(updated.checks).toHaveLength(1);
    });

    it('should toggle checklist active status', async () => {
      const checklist = await service.createChecklist(tenantId, createChecklistDto);
      const deactivated = await service.toggleChecklist(tenantId, checklist.id, false);

      expect(deactivated.isActive).toBe(false);
    });

    it('should list checklists with filters', async () => {
      await service.createChecklist(tenantId, createChecklistDto);
      await service.createChecklist(tenantId, {
        ...createChecklistDto,
        code: 'CL002',
        inspectionType: InspectionType.FINAL,
      });

      const checklists = await service.listChecklists(tenantId, {
        inspectionType: InspectionType.INCOMING,
      });

      expect(checklists).toHaveLength(1);
    });

    it('should create inspection with checklist', async () => {
      const checklist = await service.createChecklist(tenantId, createChecklistDto);
      const inspection = await service.createInspection(tenantId, {
        type: InspectionType.INCOMING,
        referenceType: 'purchase_order',
        referenceId: 'po_123',
        referenceNumber: 'PO-001',
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        sampleSize: 10,
        totalQuantity: 100,
        checklistId: checklist.id,
        checklistName: checklist.name,
        plannedDate: new Date(),
      });

      expect(inspection.checks).toHaveLength(2);
      expect(inspection.checks[0].checkName).toBe('Packaging Condition');
    });
  });

  describe('Defect Codes', () => {
    it('should create a defect code', async () => {
      const defectCode = await service.createDefectCode(tenantId, {
        code: 'DEF001',
        name: 'Surface Scratch',
        description: 'Visible scratches on surface',
        severity: DefectSeverity.MINOR,
        category: 'Visual',
      });

      expect(defectCode).toBeDefined();
      expect(defectCode.code).toBe('DEF001');
      expect(defectCode.severity).toBe(DefectSeverity.MINOR);
    });

    it('should list defect codes with filters', async () => {
      await service.createDefectCode(tenantId, {
        code: 'DEF001',
        name: 'Minor Defect',
        severity: DefectSeverity.MINOR,
        category: 'Visual',
      });
      await service.createDefectCode(tenantId, {
        code: 'DEF002',
        name: 'Major Defect',
        severity: DefectSeverity.MAJOR,
        category: 'Functional',
      });

      const codes = await service.listDefectCodes(tenantId, {
        severity: DefectSeverity.MINOR,
      });

      expect(codes).toHaveLength(1);
      expect(codes[0].code).toBe('DEF001');
    });
  });

  describe('Quality Metrics', () => {
    it('should calculate quality metrics', async () => {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + 1);

      // Create and complete passing inspection
      const inspection1 = await service.createInspection(tenantId, {
        type: InspectionType.INCOMING,
        referenceType: 'purchase_order',
        referenceId: 'po_1',
        referenceNumber: 'PO-001',
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product 1',
        sampleSize: 50,
        totalQuantity: 500,
        plannedDate: new Date(),
      });
      await service.startInspection(tenantId, inspection1.id);
      await service.completeInspection(tenantId, inspection1.id, {
        passedQuantity: 48,
        failedQuantity: 2,
        inspectedBy: 'inspector',
        inspectedByName: 'Inspector',
      });
      await service.reviewInspection(tenantId, inspection1.id, true, 'reviewer', 'Reviewer');

      // Create and complete failing inspection
      const inspection2 = await service.createInspection(tenantId, {
        type: InspectionType.INCOMING,
        referenceType: 'purchase_order',
        referenceId: 'po_2',
        referenceNumber: 'PO-002',
        itemId: 'item_2',
        itemCode: 'SKU002',
        itemName: 'Product 2',
        sampleSize: 50,
        totalQuantity: 500,
        plannedDate: new Date(),
      });
      await service.startInspection(tenantId, inspection2.id);
      await service.recordDefect(tenantId, inspection2.id, {
        defectCode: 'DEF001',
        defectName: 'Defect',
        severity: DefectSeverity.MAJOR,
        quantity: 5,
        description: 'Multiple defects',
      });
      await service.completeInspection(tenantId, inspection2.id, {
        passedQuantity: 35,
        failedQuantity: 15,
        inspectedBy: 'inspector',
        inspectedByName: 'Inspector',
      });
      await service.reviewInspection(tenantId, inspection2.id, true, 'reviewer', 'Reviewer');

      const metrics = await service.getQualityMetrics(tenantId, dateFrom, dateTo);

      expect(metrics.totalInspections).toBe(2);
      expect(metrics.passRate).toBe(50); // 1 out of 2
      expect(metrics.totalDefects).toBe(5);
      expect(metrics.defectsBySeverity[DefectSeverity.MAJOR]).toBe(5);
      expect(metrics.topDefects).toHaveLength(1);
    });
  });
});
