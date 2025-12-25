import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CAPAService,
  CAPAStatus,
  CAPAType,
  CAPAPriority,
  CAPASource,
  RootCauseMethod,
  ActionStatus,
  CreateCAPADto,
  RootCauseAnalysisDto,
  AddActionDto,
} from './capa.service';

describe('CAPAService', () => {
  let service: CAPAService;
  let eventEmitter: EventEmitter2;
  const tenantId = `tenant_capa_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const baseCAPADto: CreateCAPADto = {
    type: CAPAType.CORRECTIVE,
    priority: CAPAPriority.HIGH,
    source: CAPASource.NCR,
    title: 'Production Line Defect Issue',
    description: 'Multiple defects detected in production batch',
    problemStatement: 'High defect rate in batch 2024-001 causing customer complaints',
    ncrId: 'ncr_001',
    ncrNumber: 'NCR-2024-000001',
    productId: 'prod_001',
    productName: 'Widget A',
    processId: 'proc_001',
    processName: 'Assembly Line 1',
    departmentId: 'dept_001',
    departmentName: 'Manufacturing',
    initiatedBy: 'user_001',
    initiatedByName: 'John Quality',
    ownerId: 'user_002',
    ownerName: 'Jane Manager',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    estimatedCost: 5000,
    currency: 'RON',
    tags: ['urgent', 'production'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CAPAService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CAPAService>(CAPAService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('createCAPA', () => {
    it('should create a CAPA', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);

      expect(capa).toBeDefined();
      expect(capa.id).toBeDefined();
      expect(capa.capaNumber).toMatch(/^CAPA-\d{4}-\d{6}$/);
      expect(capa.status).toBe(CAPAStatus.DRAFT);
      expect(capa.type).toBe(CAPAType.CORRECTIVE);
      expect(capa.priority).toBe(CAPAPriority.HIGH);
      expect(capa.correctiveActions).toHaveLength(0);
      expect(capa.preventiveActions).toHaveLength(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('capa.created', expect.any(Object));
    });

    it('should generate unique CAPA numbers', async () => {
      const capa1 = await service.createCAPA(tenantId, baseCAPADto);
      const capa2 = await service.createCAPA(tenantId, baseCAPADto);

      expect(capa1.capaNumber).not.toBe(capa2.capaNumber);
    });
  });

  describe('openCAPA', () => {
    it('should open a draft CAPA', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      const opened = await service.openCAPA(tenantId, capa.id);

      expect(opened.status).toBe(CAPAStatus.OPEN);
      expect(eventEmitter.emit).toHaveBeenCalledWith('capa.opened', expect.any(Object));
    });

    it('should reject opening non-draft CAPA', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);

      await expect(service.openCAPA(tenantId, capa.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('investigation workflow', () => {
    it('should start investigation', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);
      const investigating = await service.startInvestigation(tenantId, capa.id);

      expect(investigating.status).toBe(CAPAStatus.INVESTIGATION);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'capa.investigation_started',
        expect.any(Object),
      );
    });

    it('should reject investigation on non-open CAPA', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);

      await expect(service.startInvestigation(tenantId, capa.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should record root cause analysis with Five Why', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);
      await service.startInvestigation(tenantId, capa.id);

      const rcaDto: RootCauseAnalysisDto = {
        method: RootCauseMethod.FIVE_WHY,
        rootCauses: ['Inadequate training', 'Machine calibration drift'],
        contributingFactors: ['High workload', 'Staff turnover'],
        analysis: 'Five Why analysis revealed training gaps',
        analyzedBy: 'user_003',
        analyzedByName: 'Engineer Smith',
        fiveWhySteps: [
          'Why defects? Poor assembly',
          'Why poor assembly? Operator error',
          'Why operator error? Insufficient training',
          'Why insufficient training? Budget cuts',
          'Why budget cuts? Economic downturn',
        ],
      };

      const analyzed = await service.recordRootCauseAnalysis(
        tenantId,
        capa.id,
        rcaDto,
      );

      expect(analyzed.status).toBe(CAPAStatus.ACTION_PLANNING);
      expect(analyzed.rootCauseAnalysis).toBeDefined();
      expect(analyzed.rootCauseAnalysis?.method).toBe(RootCauseMethod.FIVE_WHY);
      expect(analyzed.rootCauseAnalysis?.rootCauses).toHaveLength(2);
      expect(analyzed.rootCauseAnalysis?.fiveWhySteps).toHaveLength(5);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'capa.rca_completed',
        expect.any(Object),
      );
    });

    it('should record root cause analysis with Fishbone diagram', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);
      await service.startInvestigation(tenantId, capa.id);

      const rcaDto: RootCauseAnalysisDto = {
        method: RootCauseMethod.FISHBONE,
        rootCauses: ['Process variation'],
        analysis: 'Fishbone analysis identified multiple categories',
        analyzedBy: 'user_003',
        analyzedByName: 'Engineer Smith',
        fishboneDiagram: {
          problem: 'High defect rate',
          categories: [
            { name: 'People', causes: ['Training gaps', 'Fatigue'] },
            { name: 'Process', causes: ['No SOP', 'Variation'] },
            { name: 'Equipment', causes: ['Calibration', 'Wear'] },
            { name: 'Materials', causes: ['Supplier quality'] },
          ],
        },
      };

      const analyzed = await service.recordRootCauseAnalysis(
        tenantId,
        capa.id,
        rcaDto,
      );

      expect(analyzed.rootCauseAnalysis?.fishboneDiagram?.categories).toHaveLength(4);
    });
  });

  describe('action management', () => {
    let capaId: string;

    beforeEach(async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);
      await service.startInvestigation(tenantId, capa.id);
      await service.recordRootCauseAnalysis(tenantId, capa.id, {
        method: RootCauseMethod.FIVE_WHY,
        rootCauses: ['Training gap'],
        analysis: 'Root cause identified',
        analyzedBy: 'user_001',
        analyzedByName: 'Analyst',
      });
      capaId = capa.id;
    });

    it('should add corrective action', async () => {
      const actionDto: AddActionDto = {
        type: 'corrective',
        description: 'Retrain operators on assembly procedure',
        expectedOutcome: 'Zero defects in next batch',
        priority: CAPAPriority.HIGH,
        assignedTo: 'user_004',
        assignedToName: 'Training Lead',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        evidenceRequired: 'Training completion certificates',
      };

      const withAction = await service.addAction(tenantId, capaId, actionDto);

      expect(withAction.correctiveActions).toHaveLength(1);
      expect(withAction.correctiveActions[0].actionNumber).toBe('CA-1');
      expect(withAction.correctiveActions[0].status).toBe(ActionStatus.PENDING);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'capa.action_added',
        expect.any(Object),
      );
    });

    it('should add preventive action', async () => {
      const actionDto: AddActionDto = {
        type: 'preventive',
        description: 'Implement monthly training refresher',
        expectedOutcome: 'Sustained quality performance',
        priority: CAPAPriority.MEDIUM,
        assignedTo: 'user_005',
        assignedToName: 'HR Manager',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const withAction = await service.addAction(tenantId, capaId, actionDto);

      expect(withAction.preventiveActions).toHaveLength(1);
      expect(withAction.preventiveActions[0].actionNumber).toBe('PA-1');
    });

    it('should start implementation', async () => {
      await service.addAction(tenantId, capaId, {
        type: 'corrective',
        description: 'Test action',
        expectedOutcome: 'Test outcome',
        priority: CAPAPriority.HIGH,
        assignedTo: 'user_001',
        assignedToName: 'Test',
        dueDate: new Date(),
      });

      const implementing = await service.startImplementation(tenantId, capaId);

      expect(implementing.status).toBe(CAPAStatus.IMPLEMENTATION);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'capa.implementation_started',
        expect.any(Object),
      );
    });

    it('should reject implementation without actions', async () => {
      await expect(service.startImplementation(tenantId, capaId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('action lifecycle', () => {
    let capaId: string;
    let actionId: string;

    beforeEach(async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);
      await service.startInvestigation(tenantId, capa.id);
      await service.recordRootCauseAnalysis(tenantId, capa.id, {
        method: RootCauseMethod.FIVE_WHY,
        rootCauses: ['Test'],
        analysis: 'Test',
        analyzedBy: 'user_001',
        analyzedByName: 'Analyst',
      });
      const withAction = await service.addAction(tenantId, capa.id, {
        type: 'corrective',
        description: 'Test action',
        expectedOutcome: 'Test outcome',
        priority: CAPAPriority.HIGH,
        assignedTo: 'user_001',
        assignedToName: 'Test',
        dueDate: new Date(),
      });
      await service.startImplementation(tenantId, capa.id);
      capaId = capa.id;
      actionId = withAction.correctiveActions[0].id;
    });

    it('should start action', async () => {
      const started = await service.startAction(tenantId, capaId, actionId);

      const action = started.correctiveActions[0];
      expect(action.status).toBe(ActionStatus.IN_PROGRESS);
      expect(action.startedAt).toBeDefined();
    });

    it('should complete action', async () => {
      await service.startAction(tenantId, capaId, actionId);
      const completed = await service.completeAction(tenantId, capaId, actionId, {
        completedBy: 'user_002',
        completedByName: 'Worker',
        evidenceProvided: 'Training records attached',
        notes: 'Training completed for all operators',
      });

      const action = completed.correctiveActions[0];
      expect(action.status).toBe(ActionStatus.COMPLETED);
      expect(action.completedAt).toBeDefined();
      expect(action.evidenceProvided).toBe('Training records attached');
    });

    it('should verify action', async () => {
      await service.startAction(tenantId, capaId, actionId);
      await service.completeAction(tenantId, capaId, actionId, {
        completedBy: 'user_002',
        completedByName: 'Worker',
      });

      const verified = await service.verifyAction(tenantId, capaId, actionId, {
        verifiedBy: 'user_003',
        verifiedByName: 'Auditor',
        notes: 'Evidence verified',
      });

      const action = verified.correctiveActions[0];
      expect(action.status).toBe(ActionStatus.VERIFIED);
      expect(action.verifiedAt).toBeDefined();
    });

    it('should move to verification when all actions verified', async () => {
      await service.startAction(tenantId, capaId, actionId);
      await service.completeAction(tenantId, capaId, actionId, {
        completedBy: 'user_002',
        completedByName: 'Worker',
      });

      const capa = await service.verifyAction(tenantId, capaId, actionId, {
        verifiedBy: 'user_003',
        verifiedByName: 'Auditor',
      });

      expect(capa.status).toBe(CAPAStatus.VERIFICATION);
      expect(capa.completedDate).toBeDefined();
    });
  });

  describe('CAPA verification', () => {
    let capaId: string;

    beforeEach(async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);
      await service.startInvestigation(tenantId, capa.id);
      await service.recordRootCauseAnalysis(tenantId, capa.id, {
        method: RootCauseMethod.FIVE_WHY,
        rootCauses: ['Test'],
        analysis: 'Test',
        analyzedBy: 'user_001',
        analyzedByName: 'Analyst',
      });
      const withAction = await service.addAction(tenantId, capa.id, {
        type: 'corrective',
        description: 'Test',
        expectedOutcome: 'Test',
        priority: CAPAPriority.HIGH,
        assignedTo: 'user_001',
        assignedToName: 'Test',
        dueDate: new Date(),
      });
      await service.startImplementation(tenantId, capa.id);
      const actionId = withAction.correctiveActions[0].id;
      await service.startAction(tenantId, capa.id, actionId);
      await service.completeAction(tenantId, capa.id, actionId, {
        completedBy: 'user_002',
        completedByName: 'Worker',
      });
      await service.verifyAction(tenantId, capa.id, actionId, {
        verifiedBy: 'user_003',
        verifiedByName: 'Auditor',
      });
      capaId = capa.id;
    });

    it('should verify CAPA with pass result', async () => {
      const verified = await service.verifyCapa(tenantId, capaId, {
        verifiedBy: 'user_004',
        verifiedByName: 'QA Manager',
        method: 'Document review',
        criteria: 'All actions completed and evidence provided',
        result: 'pass',
        findings: 'All requirements met',
      });

      expect(verified.status).toBe(CAPAStatus.EFFECTIVENESS_CHECK);
      expect(verified.verification).toBeDefined();
      expect(verified.verification?.result).toBe('pass');
    });

    it('should return to action planning on fail result', async () => {
      const verified = await service.verifyCapa(tenantId, capaId, {
        verifiedBy: 'user_004',
        verifiedByName: 'QA Manager',
        method: 'Document review',
        criteria: 'All actions completed',
        result: 'fail',
        findings: 'Insufficient evidence',
      });

      expect(verified.status).toBe(CAPAStatus.ACTION_PLANNING);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'capa.verification_failed',
        expect.any(Object),
      );
    });
  });

  describe('effectiveness check', () => {
    let capaId: string;

    beforeEach(async () => {
      // Set up a CAPA in EFFECTIVENESS_CHECK status
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);
      await service.startInvestigation(tenantId, capa.id);
      await service.recordRootCauseAnalysis(tenantId, capa.id, {
        method: RootCauseMethod.FIVE_WHY,
        rootCauses: ['Test'],
        analysis: 'Test',
        analyzedBy: 'user_001',
        analyzedByName: 'Analyst',
      });
      const withAction = await service.addAction(tenantId, capa.id, {
        type: 'corrective',
        description: 'Test',
        expectedOutcome: 'Test',
        priority: CAPAPriority.HIGH,
        assignedTo: 'user_001',
        assignedToName: 'Test',
        dueDate: new Date(),
      });
      await service.startImplementation(tenantId, capa.id);
      const actionId = withAction.correctiveActions[0].id;
      await service.startAction(tenantId, capa.id, actionId);
      await service.completeAction(tenantId, capa.id, actionId, {
        completedBy: 'user_002',
        completedByName: 'Worker',
      });
      await service.verifyAction(tenantId, capa.id, actionId, {
        verifiedBy: 'user_003',
        verifiedByName: 'Auditor',
      });
      await service.verifyCapa(tenantId, capa.id, {
        verifiedBy: 'user_004',
        verifiedByName: 'QA',
        method: 'Review',
        criteria: 'All complete',
        result: 'pass',
      });
      capaId = capa.id;
    });

    it('should schedule effectiveness check', async () => {
      const scheduled = await service.scheduleEffectivenessCheck(tenantId, capaId, {
        scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        method: '30-day defect rate review',
        criteria: 'Defect rate below 1%',
      });

      expect(scheduled.effectivenessCheck).toBeDefined();
      expect(scheduled.effectivenessCheck?.scheduledDate).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'capa.effectiveness_check_scheduled',
        expect.any(Object),
      );
    });

    it('should complete effectiveness check with effective result', async () => {
      await service.scheduleEffectivenessCheck(tenantId, capaId, {
        scheduledDate: new Date(),
        method: 'Review',
        criteria: 'Pass criteria',
      });

      const completed = await service.completeEffectivenessCheck(tenantId, capaId, {
        checkedBy: 'user_005',
        checkedByName: 'QA Auditor',
        result: 'effective',
        findings: 'No recurrence observed',
        recurrenceCheck: true,
        furtherActionRequired: false,
        notes: 'CAPA successful',
      });

      expect(completed.status).toBe(CAPAStatus.CLOSED);
      expect(completed.closedDate).toBeDefined();
      expect(completed.effectivenessCheck?.result).toBe('effective');
      expect(eventEmitter.emit).toHaveBeenCalledWith('capa.closed', expect.any(Object));
    });

    it('should return to action planning if further action required', async () => {
      await service.scheduleEffectivenessCheck(tenantId, capaId, {
        scheduledDate: new Date(),
        method: 'Review',
        criteria: 'Pass criteria',
      });

      const completed = await service.completeEffectivenessCheck(tenantId, capaId, {
        checkedBy: 'user_005',
        checkedByName: 'QA Auditor',
        result: 'partially_effective',
        findings: 'Some improvement but issues remain',
        recurrenceCheck: true,
        furtherActionRequired: true,
      });

      expect(completed.status).toBe(CAPAStatus.ACTION_PLANNING);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'capa.further_action_required',
        expect.any(Object),
      );
    });
  });

  describe('cancelCAPA', () => {
    it('should cancel a CAPA', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      const cancelled = await service.cancelCAPA(
        tenantId,
        capa.id,
        'Duplicate CAPA',
      );

      expect(cancelled.status).toBe(CAPAStatus.CANCELLED);
      expect(cancelled.metadata?.cancellationReason).toBe('Duplicate CAPA');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'capa.cancelled',
        expect.any(Object),
      );
    });

    it('should reject cancelling closed CAPA', async () => {
      // Create and fully close a CAPA
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      await service.openCAPA(tenantId, capa.id);
      await service.startInvestigation(tenantId, capa.id);
      await service.recordRootCauseAnalysis(tenantId, capa.id, {
        method: RootCauseMethod.FIVE_WHY,
        rootCauses: ['Test'],
        analysis: 'Test',
        analyzedBy: 'user_001',
        analyzedByName: 'Test',
      });
      const withAction = await service.addAction(tenantId, capa.id, {
        type: 'corrective',
        description: 'Test',
        expectedOutcome: 'Test',
        priority: CAPAPriority.HIGH,
        assignedTo: 'user_001',
        assignedToName: 'Test',
        dueDate: new Date(),
      });
      await service.startImplementation(tenantId, capa.id);
      const actionId = withAction.correctiveActions[0].id;
      await service.startAction(tenantId, capa.id, actionId);
      await service.completeAction(tenantId, capa.id, actionId, {
        completedBy: 'user_001',
        completedByName: 'Test',
      });
      await service.verifyAction(tenantId, capa.id, actionId, {
        verifiedBy: 'user_001',
        verifiedByName: 'Test',
      });
      await service.verifyCapa(tenantId, capa.id, {
        verifiedBy: 'user_001',
        verifiedByName: 'Test',
        method: 'Review',
        criteria: 'Pass',
        result: 'pass',
      });
      await service.scheduleEffectivenessCheck(tenantId, capa.id, {
        scheduledDate: new Date(),
        method: 'Review',
        criteria: 'Pass',
      });
      await service.completeEffectivenessCheck(tenantId, capa.id, {
        checkedBy: 'user_001',
        checkedByName: 'Test',
        result: 'effective',
        recurrenceCheck: false,
        furtherActionRequired: false,
      });

      await expect(service.cancelCAPA(tenantId, capa.id, 'Test')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('setCost', () => {
    it('should set CAPA cost', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      const withCost = await service.setCost(tenantId, capa.id, 15000, 'RON');

      expect(withCost.actualCost).toBe(15000);
      expect(withCost.currency).toBe('RON');
    });
  });

  describe('getCAPA', () => {
    it('should get CAPA by id', async () => {
      const capa = await service.createCAPA(tenantId, baseCAPADto);
      const retrieved = await service.getCAPA(tenantId, capa.id);

      expect(retrieved.id).toBe(capa.id);
    });

    it('should throw if CAPA not found', async () => {
      await expect(service.getCAPA(tenantId, 'invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listCAPAs', () => {
    const listTenantId = `tenant_list_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    beforeEach(async () => {
      await service.createCAPA(listTenantId, {
        ...baseCAPADto,
        type: CAPAType.CORRECTIVE,
        priority: CAPAPriority.CRITICAL,
      });
      await service.createCAPA(listTenantId, {
        ...baseCAPADto,
        type: CAPAType.PREVENTIVE,
        priority: CAPAPriority.HIGH,
      });
      const capa3 = await service.createCAPA(listTenantId, {
        ...baseCAPADto,
        type: CAPAType.BOTH,
        priority: CAPAPriority.MEDIUM,
      });
      await service.openCAPA(listTenantId, capa3.id);
    });

    it('should list all CAPAs for tenant', async () => {
      const capas = await service.listCAPAs(listTenantId, {});
      expect(capas.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by status', async () => {
      const capas = await service.listCAPAs(listTenantId, {
        status: CAPAStatus.OPEN,
      });
      expect(capas.every((c) => c.status === CAPAStatus.OPEN)).toBe(true);
    });

    it('should filter by type', async () => {
      const capas = await service.listCAPAs(listTenantId, {
        type: CAPAType.CORRECTIVE,
      });
      expect(capas.every((c) => c.type === CAPAType.CORRECTIVE)).toBe(true);
    });

    it('should filter by priority', async () => {
      const capas = await service.listCAPAs(listTenantId, {
        priority: CAPAPriority.CRITICAL,
      });
      expect(capas.every((c) => c.priority === CAPAPriority.CRITICAL)).toBe(true);
    });
  });

  describe('getCAPAMetrics', () => {
    const metricsTenantId = `tenant_metrics_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    beforeEach(async () => {
      const capa1 = await service.createCAPA(metricsTenantId, {
        ...baseCAPADto,
        type: CAPAType.CORRECTIVE,
        estimatedCost: 5000,
      });
      await service.setCost(metricsTenantId, capa1.id, 4500, 'RON');

      await service.createCAPA(metricsTenantId, {
        ...baseCAPADto,
        type: CAPAType.PREVENTIVE,
        estimatedCost: 3000,
      });
    });

    it('should calculate CAPA metrics', async () => {
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const metrics = await service.getCAPAMetrics(metricsTenantId, dateFrom, dateTo);

      expect(metrics.totalCAPAs).toBeGreaterThanOrEqual(2);
      expect(metrics.byType[CAPAType.CORRECTIVE]).toBeGreaterThanOrEqual(1);
      expect(metrics.byType[CAPAType.PREVENTIVE]).toBeGreaterThanOrEqual(1);
      expect(metrics.estimatedCost).toBeGreaterThanOrEqual(8000);
      expect(metrics.actualCost).toBeGreaterThanOrEqual(4500);
    });

    it('should calculate action metrics', async () => {
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const metrics = await service.getCAPAMetrics(metricsTenantId, dateFrom, dateTo);

      expect(metrics.actionMetrics).toBeDefined();
      expect(metrics.actionMetrics.totalActions).toBeDefined();
    });
  });

  describe('CAPA workflow - complete cycle', () => {
    it('should complete full CAPA lifecycle', async () => {
      // Create
      const capa = await service.createCAPA(tenantId, {
        ...baseCAPADto,
        title: 'Complete Lifecycle Test',
      });
      expect(capa.status).toBe(CAPAStatus.DRAFT);

      // Open
      const opened = await service.openCAPA(tenantId, capa.id);
      expect(opened.status).toBe(CAPAStatus.OPEN);

      // Start investigation
      const investigating = await service.startInvestigation(tenantId, capa.id);
      expect(investigating.status).toBe(CAPAStatus.INVESTIGATION);

      // Record root cause analysis
      const analyzed = await service.recordRootCauseAnalysis(tenantId, capa.id, {
        method: RootCauseMethod.FIVE_WHY,
        rootCauses: ['Root cause 1', 'Root cause 2'],
        contributingFactors: ['Factor 1'],
        analysis: 'Detailed analysis',
        analyzedBy: 'user_analyst',
        analyzedByName: 'Analyst',
        fiveWhySteps: ['Why 1', 'Why 2', 'Why 3', 'Why 4', 'Why 5'],
      });
      expect(analyzed.status).toBe(CAPAStatus.ACTION_PLANNING);

      // Add corrective action
      const withCorrectiveAction = await service.addAction(tenantId, capa.id, {
        type: 'corrective',
        description: 'Corrective action',
        expectedOutcome: 'Issue resolved',
        priority: CAPAPriority.HIGH,
        assignedTo: 'user_worker',
        assignedToName: 'Worker',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      const correctiveActionId = withCorrectiveAction.correctiveActions[0].id;

      // Add preventive action
      const withPreventiveAction = await service.addAction(tenantId, capa.id, {
        type: 'preventive',
        description: 'Preventive action',
        expectedOutcome: 'Issue prevented',
        priority: CAPAPriority.MEDIUM,
        assignedTo: 'user_worker2',
        assignedToName: 'Worker 2',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
      const preventiveActionId = withPreventiveAction.preventiveActions[0].id;

      // Start implementation
      const implementing = await service.startImplementation(tenantId, capa.id);
      expect(implementing.status).toBe(CAPAStatus.IMPLEMENTATION);

      // Execute corrective action
      await service.startAction(tenantId, capa.id, correctiveActionId);
      await service.completeAction(tenantId, capa.id, correctiveActionId, {
        completedBy: 'user_worker',
        completedByName: 'Worker',
        evidenceProvided: 'Evidence attached',
      });
      await service.verifyAction(tenantId, capa.id, correctiveActionId, {
        verifiedBy: 'user_qa',
        verifiedByName: 'QA',
      });

      // Execute preventive action
      await service.startAction(tenantId, capa.id, preventiveActionId);
      await service.completeAction(tenantId, capa.id, preventiveActionId, {
        completedBy: 'user_worker2',
        completedByName: 'Worker 2',
      });
      const allVerified = await service.verifyAction(
        tenantId,
        capa.id,
        preventiveActionId,
        {
          verifiedBy: 'user_qa',
          verifiedByName: 'QA',
        },
      );
      expect(allVerified.status).toBe(CAPAStatus.VERIFICATION);

      // Verify CAPA
      const verified = await service.verifyCapa(tenantId, capa.id, {
        verifiedBy: 'user_manager',
        verifiedByName: 'Manager',
        method: 'Document review and inspection',
        criteria: 'All actions completed with evidence',
        result: 'pass',
        findings: 'All requirements satisfied',
      });
      expect(verified.status).toBe(CAPAStatus.EFFECTIVENESS_CHECK);

      // Schedule effectiveness check
      await service.scheduleEffectivenessCheck(tenantId, capa.id, {
        scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        method: 'Defect rate monitoring',
        criteria: 'Zero defects for 30 days',
      });

      // Complete effectiveness check
      const closed = await service.completeEffectivenessCheck(tenantId, capa.id, {
        checkedBy: 'user_auditor',
        checkedByName: 'Auditor',
        result: 'effective',
        findings: 'No recurrence in monitoring period',
        recurrenceCheck: true,
        furtherActionRequired: false,
        notes: 'CAPA successfully closed',
      });
      expect(closed.status).toBe(CAPAStatus.CLOSED);
      expect(closed.closedDate).toBeDefined();
    });
  });
});
