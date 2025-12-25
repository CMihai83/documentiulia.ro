import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  SupplierQualityService,
  SupplierQualificationStatus,
  SupplierRiskLevel,
  EvaluationCriteria,
  AuditType,
  AuditResult,
  CreateSupplierQualificationDto,
} from './supplier-quality.service';

describe('SupplierQualityService', () => {
  let service: SupplierQualityService;
  let eventEmitter: EventEmitter2;
  const tenantId = `tenant_sq_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const baseQualificationDto: CreateSupplierQualificationDto = {
    supplierId: 'supplier_001',
    supplierCode: 'SUP-001',
    supplierName: 'Acme Supplies Ltd',
    riskLevel: SupplierRiskLevel.MEDIUM,
    notes: 'New supplier for raw materials',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierQualityService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SupplierQualityService>(SupplierQualityService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('createSupplierQualification', () => {
    it('should create a supplier qualification', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );

      expect(qual).toBeDefined();
      expect(qual.id).toBeDefined();
      expect(qual.status).toBe(SupplierQualificationStatus.PENDING);
      expect(qual.riskLevel).toBe(SupplierRiskLevel.MEDIUM);
      expect(qual.supplierName).toBe('Acme Supplies Ltd');
      expect(qual.approvedCategories).toHaveLength(0);
      expect(qual.overallScore).toBe(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.qualification.created',
        expect.any(Object),
      );
    });
  });

  describe('qualification workflow', () => {
    it('should start evaluation', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const evaluating = await service.startEvaluation(tenantId, qual.id);

      expect(evaluating.status).toBe(SupplierQualificationStatus.UNDER_EVALUATION);
    });

    it('should reject evaluation start from non-pending status', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      await service.startEvaluation(tenantId, qual.id);

      await expect(service.startEvaluation(tenantId, qual.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should qualify supplier', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      await service.startEvaluation(tenantId, qual.id);

      const expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const qualified = await service.qualifySupplier(
        tenantId,
        qual.id,
        'user_qa',
        'QA Manager',
        expirationDate,
      );

      expect(qualified.status).toBe(SupplierQualificationStatus.QUALIFIED);
      expect(qualified.qualifiedBy).toBe('user_qa');
      expect(qualified.expirationDate).toEqual(expirationDate);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.qualification.qualified',
        expect.any(Object),
      );
    });

    it('should conditionally qualify supplier', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      await service.startEvaluation(tenantId, qual.id);

      const qualified = await service.qualifySupplier(
        tenantId,
        qual.id,
        'user_qa',
        'QA Manager',
        undefined,
        ['Must complete ISO certification within 6 months'],
      );

      expect(qualified.status).toBe(
        SupplierQualificationStatus.CONDITIONALLY_QUALIFIED,
      );
      expect(qualified.conditions).toHaveLength(1);
    });

    it('should put supplier on hold', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const onHold = await service.putOnHold(
        tenantId,
        qual.id,
        'Quality issues detected',
      );

      expect(onHold.status).toBe(SupplierQualificationStatus.ON_HOLD);
      expect(onHold.metadata?.holdReason).toBe('Quality issues detected');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.qualification.on_hold',
        expect.any(Object),
      );
    });

    it('should disqualify supplier', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const disqualified = await service.disqualifySupplier(
        tenantId,
        qual.id,
        'Failed audit',
      );

      expect(disqualified.status).toBe(SupplierQualificationStatus.DISQUALIFIED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.qualification.disqualified',
        expect.any(Object),
      );
    });
  });

  describe('risk level management', () => {
    it('should set risk level', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const updated = await service.setRiskLevel(
        tenantId,
        qual.id,
        SupplierRiskLevel.HIGH,
      );

      expect(updated.riskLevel).toBe(SupplierRiskLevel.HIGH);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.risk_level_changed',
        expect.any(Object),
      );
    });
  });

  describe('category management', () => {
    it('should add approved category', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const withCategory = await service.addApprovedCategory(tenantId, qual.id, {
        categoryId: 'cat_001',
        categoryName: 'Raw Materials',
        approvedBy: 'user_qa',
        approvedByName: 'QA Manager',
        specifications: 'Grade A materials only',
      });

      expect(withCategory.approvedCategories).toHaveLength(1);
      expect(withCategory.approvedCategories[0].categoryName).toBe('Raw Materials');
    });

    it('should reject duplicate category', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      await service.addApprovedCategory(tenantId, qual.id, {
        categoryId: 'cat_001',
        categoryName: 'Raw Materials',
        approvedBy: 'user_qa',
        approvedByName: 'QA',
      });

      await expect(
        service.addApprovedCategory(tenantId, qual.id, {
          categoryId: 'cat_001',
          categoryName: 'Raw Materials',
          approvedBy: 'user_qa',
          approvedByName: 'QA',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove approved category', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      await service.addApprovedCategory(tenantId, qual.id, {
        categoryId: 'cat_001',
        categoryName: 'Raw Materials',
        approvedBy: 'user_qa',
        approvedByName: 'QA',
      });

      const removed = await service.removeApprovedCategory(
        tenantId,
        qual.id,
        'cat_001',
      );

      expect(removed.approvedCategories).toHaveLength(0);
    });
  });

  describe('certification management', () => {
    it('should add certification', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const withCert = await service.addCertification(tenantId, qual.id, {
        certificationType: 'ISO 9001',
        certificateNumber: 'ISO-2024-12345',
        issuingBody: 'TUV',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      expect(withCert.certifications).toHaveLength(1);
      expect(withCert.certifications[0].verified).toBe(false);
    });

    it('should verify certification', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const withCert = await service.addCertification(tenantId, qual.id, {
        certificationType: 'ISO 9001',
        certificateNumber: 'ISO-2024-12345',
        issuingBody: 'TUV',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const certId = withCert.certifications[0].certificationId;
      const verified = await service.verifyCertification(
        tenantId,
        qual.id,
        certId,
        'user_verifier',
      );

      expect(verified.certifications[0].verified).toBe(true);
      expect(verified.certifications[0].verifiedBy).toBe('user_verifier');
    });
  });

  describe('evaluation management', () => {
    it('should create evaluation', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const evaluated = await service.createEvaluation(tenantId, qual.id, {
        evaluatedBy: 'user_evaluator',
        evaluatedByName: 'Evaluator',
        period: 'Q1 2024',
        scores: {
          [EvaluationCriteria.QUALITY]: 85,
          [EvaluationCriteria.DELIVERY]: 90,
          [EvaluationCriteria.PRICE]: 80,
          [EvaluationCriteria.SERVICE]: 88,
          [EvaluationCriteria.TECHNICAL]: 82,
          [EvaluationCriteria.FINANCIAL]: 75,
          [EvaluationCriteria.COMPLIANCE]: 95,
          [EvaluationCriteria.SUSTAINABILITY]: 70,
        },
        comments: 'Good performance overall',
        strengths: ['Delivery reliability', 'Quality consistency'],
        weaknesses: ['Price competitiveness'],
        recommendations: ['Negotiate better pricing'],
      });

      expect(evaluated.evaluations).toHaveLength(1);
      expect(evaluated.overallScore).toBeGreaterThan(0);
      expect(evaluated.scoreBreakdown[EvaluationCriteria.QUALITY]).toBe(85);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.evaluation.completed',
        expect.any(Object),
      );
    });
  });

  describe('audit management', () => {
    let qualificationId: string;

    beforeEach(async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      qualificationId = qual.id;
    });

    it('should schedule audit', async () => {
      const scheduled = await service.scheduleAudit(tenantId, qualificationId, {
        type: AuditType.INITIAL,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        auditorId: 'user_auditor',
        auditorName: 'Lead Auditor',
        scope: 'Quality management system',
      });

      expect(scheduled.audits).toHaveLength(1);
      expect(scheduled.audits[0].status).toBe('scheduled');
      expect(scheduled.audits[0].auditNumber).toMatch(/^SA-\d{4}-\d{5}$/);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.audit.scheduled',
        expect.any(Object),
      );
    });

    it('should start audit', async () => {
      const scheduled = await service.scheduleAudit(tenantId, qualificationId, {
        type: AuditType.INITIAL,
        scheduledDate: new Date(),
        auditorId: 'user_auditor',
        auditorName: 'Auditor',
        scope: 'QMS',
      });

      const auditId = scheduled.audits[0].id;
      const started = await service.startAudit(tenantId, qualificationId, auditId);

      expect(started.audits[0].status).toBe('in_progress');
    });

    it('should complete audit with pass result', async () => {
      const scheduled = await service.scheduleAudit(tenantId, qualificationId, {
        type: AuditType.INITIAL,
        scheduledDate: new Date(),
        auditorId: 'user_auditor',
        auditorName: 'Auditor',
        scope: 'QMS',
      });

      const auditId = scheduled.audits[0].id;
      await service.startAudit(tenantId, qualificationId, auditId);

      const completed = await service.completeAudit(tenantId, qualificationId, auditId, {
        actualDate: new Date(),
        result: AuditResult.PASS,
        score: 92,
        findings: [
          {
            type: 'observation',
            description: 'Consider improving documentation',
            correctiveActionRequired: false,
          },
        ],
        capaRequired: false,
        notes: 'Successful audit',
      });

      expect(completed.audits[0].status).toBe('completed');
      expect(completed.audits[0].result).toBe(AuditResult.PASS);
      expect(completed.lastAuditDate).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.audit.completed',
        expect.any(Object),
      );
    });

    it('should put supplier on hold after failed audit', async () => {
      const scheduled = await service.scheduleAudit(tenantId, qualificationId, {
        type: AuditType.SURVEILLANCE,
        scheduledDate: new Date(),
        auditorId: 'user_auditor',
        auditorName: 'Auditor',
        scope: 'QMS',
      });

      const auditId = scheduled.audits[0].id;
      await service.startAudit(tenantId, qualificationId, auditId);

      const completed = await service.completeAudit(tenantId, qualificationId, auditId, {
        actualDate: new Date(),
        result: AuditResult.FAIL,
        score: 45,
        findings: [
          {
            type: 'critical',
            description: 'Major non-conformity in quality control',
            correctiveActionRequired: true,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
        capaRequired: true,
      });

      expect(completed.status).toBe(SupplierQualificationStatus.ON_HOLD);
    });

    it('should cancel audit', async () => {
      const scheduled = await service.scheduleAudit(tenantId, qualificationId, {
        type: AuditType.PERIODIC,
        scheduledDate: new Date(),
        auditorId: 'user_auditor',
        auditorName: 'Auditor',
        scope: 'QMS',
      });

      const auditId = scheduled.audits[0].id;
      const cancelled = await service.cancelAudit(
        tenantId,
        qualificationId,
        auditId,
        'Supplier unavailable',
      );

      expect(cancelled.audits[0].status).toBe('cancelled');
    });
  });

  describe('performance management', () => {
    it('should record performance', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const withPerformance = await service.recordPerformance(tenantId, qual.id, {
        period: '2024-Q1',
        ordersCount: 100,
        defectsCount: 2,
        lateDeliveriesCount: 5,
        returnsCount: 1,
      });

      expect(withPerformance.performanceHistory).toHaveLength(1);
      expect(withPerformance.performanceMetrics.totalOrders).toBe(100);
      expect(withPerformance.performanceMetrics.qualityRate).toBe(98);
      expect(withPerformance.performanceMetrics.onTimeDeliveryRate).toBe(95);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'supplier.performance.recorded',
        expect.any(Object),
      );
    });

    it('should automatically adjust risk level based on performance', async () => {
      const qual = await service.createSupplierQualification(tenantId, {
        ...baseQualificationDto,
        riskLevel: SupplierRiskLevel.LOW,
      });

      // Record poor performance
      await service.recordPerformance(tenantId, qual.id, {
        period: '2024-Q1',
        ordersCount: 100,
        defectsCount: 15,
        lateDeliveriesCount: 20,
      });

      const updated = await service.getSupplierQualification(tenantId, qual.id);

      // Risk level should have been elevated due to poor performance
      expect(updated.riskLevel).not.toBe(SupplierRiskLevel.LOW);
    });
  });

  describe('NCR and CAPA linking', () => {
    it('should link NCR', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const linked = await service.linkNCR(tenantId, qual.id, 'ncr_001');

      expect(linked.ncrIds).toContain('ncr_001');
      expect(linked.activeNCRCount).toBe(1);
    });

    it('should link CAPA', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const linked = await service.linkCAPA(tenantId, qual.id, 'capa_001');

      expect(linked.capaIds).toContain('capa_001');
      expect(linked.activeCAPACount).toBe(1);
    });
  });

  describe('getSupplierQualification', () => {
    it('should get qualification by id', async () => {
      const qual = await service.createSupplierQualification(
        tenantId,
        baseQualificationDto,
      );
      const retrieved = await service.getSupplierQualification(tenantId, qual.id);

      expect(retrieved.id).toBe(qual.id);
    });

    it('should throw if qualification not found', async () => {
      await expect(
        service.getSupplierQualification(tenantId, 'invalid_id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBySupplier', () => {
    it('should get qualification by supplier id', async () => {
      await service.createSupplierQualification(tenantId, baseQualificationDto);
      const retrieved = await service.getBySupplier(tenantId, 'supplier_001');

      expect(retrieved).toBeDefined();
      expect(retrieved?.supplierId).toBe('supplier_001');
    });

    it('should return null if supplier not found', async () => {
      const retrieved = await service.getBySupplier(tenantId, 'nonexistent');
      expect(retrieved).toBeNull();
    });
  });

  describe('listSupplierQualifications', () => {
    const listTenantId = `tenant_sqlist_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    beforeEach(async () => {
      const qual1 = await service.createSupplierQualification(listTenantId, {
        ...baseQualificationDto,
        supplierId: 'sup_1',
        riskLevel: SupplierRiskLevel.HIGH,
      });
      await service.startEvaluation(listTenantId, qual1.id);
      await service.qualifySupplier(listTenantId, qual1.id, 'user', 'User');

      await service.createSupplierQualification(listTenantId, {
        ...baseQualificationDto,
        supplierId: 'sup_2',
        riskLevel: SupplierRiskLevel.LOW,
      });

      await service.createSupplierQualification(listTenantId, {
        ...baseQualificationDto,
        supplierId: 'sup_3',
        riskLevel: SupplierRiskLevel.CRITICAL,
      });
    });

    it('should list all qualifications for tenant', async () => {
      const quals = await service.listSupplierQualifications(listTenantId, {});
      expect(quals.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by status', async () => {
      const quals = await service.listSupplierQualifications(listTenantId, {
        status: SupplierQualificationStatus.QUALIFIED,
      });
      expect(quals.every((q) => q.status === SupplierQualificationStatus.QUALIFIED)).toBe(
        true,
      );
    });

    it('should filter by risk level', async () => {
      const quals = await service.listSupplierQualifications(listTenantId, {
        riskLevel: SupplierRiskLevel.CRITICAL,
      });
      expect(quals.every((q) => q.riskLevel === SupplierRiskLevel.CRITICAL)).toBe(true);
    });
  });

  describe('getSupplierQualityMetrics', () => {
    const metricsTenantId = `tenant_sqmetrics_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    beforeEach(async () => {
      const qual1 = await service.createSupplierQualification(metricsTenantId, {
        ...baseQualificationDto,
        supplierId: 'sup_m1',
        riskLevel: SupplierRiskLevel.LOW,
      });
      await service.recordPerformance(metricsTenantId, qual1.id, {
        period: '2024-Q1',
        ordersCount: 100,
        defectsCount: 1,
        lateDeliveriesCount: 2,
      });

      const qual2 = await service.createSupplierQualification(metricsTenantId, {
        ...baseQualificationDto,
        supplierId: 'sup_m2',
        riskLevel: SupplierRiskLevel.HIGH,
      });
      await service.recordPerformance(metricsTenantId, qual2.id, {
        period: '2024-Q1',
        ordersCount: 50,
        defectsCount: 5,
        lateDeliveriesCount: 10,
      });
    });

    it('should calculate supplier quality metrics', async () => {
      const metrics = await service.getSupplierQualityMetrics(metricsTenantId);

      expect(metrics.totalSuppliers).toBeGreaterThanOrEqual(2);
      expect(metrics.byStatus[SupplierQualificationStatus.PENDING]).toBeGreaterThanOrEqual(2);
      // Risk levels may be auto-adjusted by performance thresholds, so just check totals
      const totalByRisk = Object.values(metrics.byRiskLevel).reduce((a: number, b: number) => a + b, 0);
      expect(totalByRisk).toBeGreaterThanOrEqual(2);
      expect(metrics.averageQualityRate).toBeGreaterThan(0);
    });
  });
});
