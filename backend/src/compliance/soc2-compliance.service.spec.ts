import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  Soc2ComplianceService,
  ComplianceStatus,
  IncidentSeverity,
  DataClassification,
} from './soc2-compliance.service';

describe('Soc2ComplianceService', () => {
  let service: Soc2ComplianceService;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockPrismaService = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Soc2ComplianceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<Soc2ComplianceService>(Soc2ComplianceService);
  });

  describe('Compliance Controls', () => {
    describe('getAllControls', () => {
      it('should return all SOC 2 controls', () => {
        const controls = service.getAllControls();

        expect(controls).toBeInstanceOf(Array);
        expect(controls.length).toBeGreaterThan(20);
      });

      it('should have all required fields for each control', () => {
        const controls = service.getAllControls();

        for (const control of controls) {
          expect(control.id).toBeDefined();
          expect(control.category).toBeDefined();
          expect(control.name).toBeDefined();
          expect(control.description).toBeDefined();
          expect(control.status).toBeDefined();
          expect(control.lastAssessed).toBeDefined();
        }
      });

      it('should initialize all controls as not_assessed', () => {
        const controls = service.getAllControls();

        for (const control of controls) {
          expect(control.status).toBe('not_assessed');
        }
      });
    });

    describe('getControlsByCategory', () => {
      it('should return controls for CC1 category', () => {
        const controls = service.getControlsByCategory('CC1');

        expect(controls.length).toBeGreaterThan(0);
        for (const control of controls) {
          expect(control.category).toBe('CC1');
        }
      });

      it('should return controls for CC6 (Access Controls)', () => {
        const controls = service.getControlsByCategory('CC6');

        expect(controls.length).toBeGreaterThan(5);
        expect(controls.some((c) => c.id === 'CC6.1')).toBe(true);
      });

      it('should return empty array for invalid category', () => {
        const controls = service.getControlsByCategory('INVALID');

        expect(controls).toHaveLength(0);
      });
    });

    describe('getControl', () => {
      it('should return control by ID', () => {
        const control = service.getControl('CC1.1');

        expect(control).toBeDefined();
        expect(control?.id).toBe('CC1.1');
        expect(control?.category).toBe('CC1');
      });

      it('should return null for non-existent control', () => {
        const control = service.getControl('INVALID');

        expect(control).toBeNull();
      });
    });

    describe('updateControlStatus', () => {
      it('should update control status', () => {
        const updated = service.updateControlStatus('CC1.1', 'compliant');

        expect(updated).toBeDefined();
        expect(updated?.status).toBe('compliant');
        expect(updated?.lastAssessed).toBeInstanceOf(Date);
      });

      it('should update control with evidence', () => {
        const evidence = ['Policy document v1.0', 'Training records'];
        const updated = service.updateControlStatus('CC1.1', 'compliant', evidence);

        expect(updated?.evidence).toEqual(evidence);
      });

      it('should update control with gaps and remediation', () => {
        const gaps = ['Missing annual review'];
        const remediation = 'Schedule quarterly reviews';
        const updated = service.updateControlStatus(
          'CC1.1',
          'partial',
          undefined,
          gaps,
          remediation,
        );

        expect(updated?.gaps).toEqual(gaps);
        expect(updated?.remediation).toBe(remediation);
      });

      it('should return null for non-existent control', () => {
        const updated = service.updateControlStatus('INVALID', 'compliant');

        expect(updated).toBeNull();
      });
    });

    describe('getComplianceSummaryByCategory', () => {
      it('should return summary for all categories', () => {
        const summary = service.getComplianceSummaryByCategory();

        expect(summary['CC1']).toBeDefined();
        expect(summary['CC6']).toBeDefined();
        expect(summary['CC9']).toBeDefined();
      });

      it('should calculate correct percentages', () => {
        // Update some controls to compliant
        service.updateControlStatus('CC1.1', 'compliant');
        service.updateControlStatus('CC1.2', 'compliant');

        const summary = service.getComplianceSummaryByCategory();

        expect(summary['CC1'].compliant).toBeGreaterThanOrEqual(2);
        expect(summary['CC1'].percentage).toBeGreaterThan(0);
      });
    });
  });

  describe('Security Incidents', () => {
    describe('reportIncident', () => {
      it('should create a new incident', () => {
        const incident = service.reportIncident(
          'Data Breach Attempt',
          'Suspicious login attempts detected',
          'high',
          ['auth-service', 'user-db'],
          'security-team',
        );

        expect(incident.id).toBeDefined();
        expect(incident.title).toBe('Data Breach Attempt');
        expect(incident.severity).toBe('high');
        expect(incident.status).toBe('open');
        expect(incident.detectedAt).toBeInstanceOf(Date);
      });

      it('should include affected users count', () => {
        const incident = service.reportIncident(
          'Password Reset Required',
          'Compromised credentials',
          'critical',
          ['user-service'],
          'admin',
          150,
        );

        expect(incident.affectedUsers).toBe(150);
      });

      it('should assign unique IDs', () => {
        const incident1 = service.reportIncident('Incident 1', 'Desc', 'low', [], 'user1');
        const incident2 = service.reportIncident('Incident 2', 'Desc', 'low', [], 'user2');

        expect(incident1.id).not.toBe(incident2.id);
      });
    });

    describe('updateIncidentStatus', () => {
      it('should update incident status to investigating', () => {
        const incident = service.reportIncident('Test', 'Desc', 'medium', [], 'user');
        const updated = service.updateIncidentStatus(incident.id, 'investigating');

        expect(updated?.status).toBe('investigating');
        expect(updated?.respondedAt).toBeInstanceOf(Date);
      });

      it('should update incident status to resolved', () => {
        const incident = service.reportIncident('Test', 'Desc', 'low', [], 'user');
        const updated = service.updateIncidentStatus(incident.id, 'resolved', {
          rootCause: 'Misconfigured firewall',
          remediation: 'Updated firewall rules',
          lessonsLearned: 'Implement configuration validation',
        });

        expect(updated?.status).toBe('resolved');
        expect(updated?.resolvedAt).toBeInstanceOf(Date);
        expect(updated?.rootCause).toBe('Misconfigured firewall');
      });

      it('should return null for non-existent incident', () => {
        const updated = service.updateIncidentStatus('INVALID', 'resolved');

        expect(updated).toBeNull();
      });
    });

    describe('getAllIncidents', () => {
      it('should return all incidents sorted by date', () => {
        service.reportIncident('First', 'Desc', 'low', [], 'user');
        service.reportIncident('Second', 'Desc', 'medium', [], 'user');

        const incidents = service.getAllIncidents();

        expect(incidents.length).toBeGreaterThanOrEqual(2);
        expect(incidents[0].detectedAt.getTime()).toBeGreaterThanOrEqual(
          incidents[1].detectedAt.getTime(),
        );
      });
    });

    describe('getOpenIncidents', () => {
      it('should return only open incidents', () => {
        const incident1 = service.reportIncident('Open', 'Desc', 'low', [], 'user');
        const incident2 = service.reportIncident('Resolved', 'Desc', 'low', [], 'user');
        service.updateIncidentStatus(incident2.id, 'resolved');

        const openIncidents = service.getOpenIncidents();

        expect(openIncidents.some((i) => i.id === incident1.id)).toBe(true);
        expect(openIncidents.some((i) => i.id === incident2.id)).toBe(false);
      });
    });

    describe('getIncidentMetrics', () => {
      it('should return incident metrics', () => {
        service.reportIncident('Critical', 'Desc', 'critical', [], 'user');
        service.reportIncident('High', 'Desc', 'high', [], 'user');
        service.reportIncident('Low', 'Desc', 'low', [], 'user');

        const metrics = service.getIncidentMetrics();

        expect(metrics.total).toBeGreaterThanOrEqual(3);
        expect(metrics.bySeverity.critical).toBeGreaterThanOrEqual(1);
        expect(metrics.bySeverity.high).toBeGreaterThanOrEqual(1);
      });

      it('should calculate mean time to respond', () => {
        const incident = service.reportIncident('Test', 'Desc', 'medium', [], 'user');
        service.updateIncidentStatus(incident.id, 'investigating');

        const metrics = service.getIncidentMetrics();

        expect(typeof metrics.meanTimeToRespond).toBe('number');
      });
    });
  });

  describe('Access Reviews', () => {
    describe('createAccessReview', () => {
      it('should create access review', () => {
        const review = service.createAccessReview(
          'user-123',
          'reviewer-456',
          'admin',
          true,
          'maintain',
          'Access appropriate for role',
        );

        expect(review.id).toBeDefined();
        expect(review.userId).toBe('user-123');
        expect(review.isAppropriate).toBe(true);
        expect(review.action).toBe('maintain');
      });

      it('should record revoke decision', () => {
        const review = service.createAccessReview(
          'user-456',
          'reviewer-789',
          'admin',
          false,
          'revoke',
          'User no longer needs admin access',
        );

        expect(review.isAppropriate).toBe(false);
        expect(review.action).toBe('revoke');
      });
    });

    describe('getAccessReviewsForUser', () => {
      it('should return reviews for specific user', () => {
        service.createAccessReview('target-user', 'reviewer', 'user', true, 'maintain');
        service.createAccessReview('target-user', 'reviewer', 'admin', false, 'revoke');
        service.createAccessReview('other-user', 'reviewer', 'user', true, 'maintain');

        const reviews = service.getAccessReviewsForUser('target-user');

        expect(reviews.length).toBe(2);
        for (const review of reviews) {
          expect(review.userId).toBe('target-user');
        }
      });
    });

    describe('getAccessReviewStats', () => {
      it('should calculate review statistics', () => {
        service.createAccessReview('user1', 'rev', 'admin', true, 'maintain');
        service.createAccessReview('user2', 'rev', 'admin', false, 'revoke');
        service.createAccessReview('user3', 'rev', 'user', true, 'modify');

        const stats = service.getAccessReviewStats();

        expect(stats.total).toBeGreaterThanOrEqual(3);
        expect(stats.appropriate).toBeGreaterThanOrEqual(2);
        expect(stats.inappropriate).toBeGreaterThanOrEqual(1);
        expect(stats.byAction.maintain).toBeGreaterThanOrEqual(1);
        expect(stats.byAction.revoke).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Risk Assessment', () => {
    describe('createRiskAssessment', () => {
      it('should create risk assessment with calculated score', () => {
        const risk = service.createRiskAssessment(
          'Data Breach Risk',
          'Risk of unauthorized data access',
          'Security',
          4,
          5,
          ['Encryption', 'Access Controls'],
          'security-team',
        );

        expect(risk.id).toBeDefined();
        expect(risk.riskScore).toBe(20); // 4 * 5
        expect(risk.riskLevel).toBe('critical');
      });

      it('should calculate risk levels correctly', () => {
        const lowRisk = service.createRiskAssessment(
          'Low Risk', 'Desc', 'Operational', 1, 2, [], 'owner',
        );
        const mediumRisk = service.createRiskAssessment(
          'Medium Risk', 'Desc', 'Operational', 2, 3, [], 'owner',
        );
        const highRisk = service.createRiskAssessment(
          'High Risk', 'Desc', 'Operational', 3, 4, [], 'owner',
        );
        const criticalRisk = service.createRiskAssessment(
          'Critical Risk', 'Desc', 'Operational', 5, 5, [], 'owner',
        );

        expect(lowRisk.riskLevel).toBe('low');
        expect(mediumRisk.riskLevel).toBe('medium');
        expect(highRisk.riskLevel).toBe('high');
        expect(criticalRisk.riskLevel).toBe('critical');
      });

      it('should reduce residual risk based on mitigations', () => {
        const riskWithMitigations = service.createRiskAssessment(
          'Mitigated Risk',
          'Description',
          'Security',
          4,
          5,
          ['Control 1', 'Control 2', 'Control 3'],
          'owner',
        );

        // Critical risk with 3 mitigations should reduce residual risk
        expect(riskWithMitigations.residualRisk).not.toBe('critical');
      });

      it('should set next review date based on risk level', () => {
        const criticalRisk = service.createRiskAssessment(
          'Critical', 'Desc', 'Security', 5, 5, [], 'owner',
        );
        const lowRisk = service.createRiskAssessment(
          'Low', 'Desc', 'Security', 1, 1, [], 'owner',
        );

        const criticalNextReview = criticalRisk.nextReview.getTime();
        const lowNextReview = lowRisk.nextReview.getTime();

        // Critical risks should be reviewed sooner
        expect(criticalNextReview).toBeLessThan(lowNextReview);
      });
    });

    describe('getAllRiskAssessments', () => {
      it('should return risks sorted by score', () => {
        service.createRiskAssessment('Low', 'Desc', 'Cat', 1, 1, [], 'owner');
        service.createRiskAssessment('High', 'Desc', 'Cat', 4, 4, [], 'owner');
        service.createRiskAssessment('Medium', 'Desc', 'Cat', 2, 3, [], 'owner');

        const risks = service.getAllRiskAssessments();

        // Should be sorted by score descending
        for (let i = 1; i < risks.length; i++) {
          expect(risks[i - 1].riskScore).toBeGreaterThanOrEqual(risks[i].riskScore);
        }
      });
    });

    describe('getRiskSummary', () => {
      it('should summarize risks by level', () => {
        service.createRiskAssessment('Critical1', 'Desc', 'Security', 5, 5, [], 'owner');
        service.createRiskAssessment('High1', 'Desc', 'Security', 3, 4, [], 'owner');
        service.createRiskAssessment('Low1', 'Desc', 'Operational', 1, 2, [], 'owner');

        const summary = service.getRiskSummary();

        expect(summary.total).toBeGreaterThanOrEqual(3);
        expect(summary.byLevel.critical).toBeGreaterThanOrEqual(1);
        expect(summary.byLevel.high).toBeGreaterThanOrEqual(1);
        expect(summary.byCategory['Security']).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Data Classification', () => {
    describe('registerDataAsset', () => {
      it('should register data asset', () => {
        const asset = service.registerDataAsset(
          'Customer Database',
          'Production customer data',
          'confidential',
          'data-team',
          'AWS RDS',
          365,
          true,
        );

        expect(asset.id).toBeDefined();
        expect(asset.classification).toBe('confidential');
        expect(asset.personalData).toBe(true);
        expect(asset.encryptionRequired).toBe(true);
      });

      it('should set encryption required for confidential data', () => {
        const confidential = service.registerDataAsset(
          'Confidential', 'Desc', 'confidential', 'owner', 'loc', 30,
        );
        const restricted = service.registerDataAsset(
          'Restricted', 'Desc', 'restricted', 'owner', 'loc', 30,
        );
        const publicData = service.registerDataAsset(
          'Public', 'Desc', 'public', 'owner', 'loc', 30,
        );

        expect(confidential.encryptionRequired).toBe(true);
        expect(restricted.encryptionRequired).toBe(true);
        expect(publicData.encryptionRequired).toBe(false);
      });

      it('should set backup required for non-public data', () => {
        const internal = service.registerDataAsset(
          'Internal', 'Desc', 'internal', 'owner', 'loc', 30,
        );
        const publicData = service.registerDataAsset(
          'Public', 'Desc', 'public', 'owner', 'loc', 30,
        );

        expect(internal.backupRequired).toBe(true);
        expect(publicData.backupRequired).toBe(false);
      });
    });

    describe('getDataAssetsByClassification', () => {
      it('should filter assets by classification', () => {
        service.registerDataAsset('Conf1', 'Desc', 'confidential', 'owner', 'loc', 30);
        service.registerDataAsset('Conf2', 'Desc', 'confidential', 'owner', 'loc', 30);
        service.registerDataAsset('Public1', 'Desc', 'public', 'owner', 'loc', 30);

        const confidential = service.getDataAssetsByClassification('confidential');

        expect(confidential.length).toBeGreaterThanOrEqual(2);
        for (const asset of confidential) {
          expect(asset.classification).toBe('confidential');
        }
      });
    });

    describe('getDataClassificationSummary', () => {
      it('should summarize data classification', () => {
        service.registerDataAsset('Conf', 'Desc', 'confidential', 'owner', 'loc', 30, true);
        service.registerDataAsset('Restricted', 'Desc', 'restricted', 'owner', 'loc', 30);
        service.registerDataAsset('Public', 'Desc', 'public', 'owner', 'loc', 30);

        const summary = service.getDataClassificationSummary();

        expect(summary.total).toBeGreaterThanOrEqual(3);
        expect(summary.byClassification.confidential).toBeGreaterThanOrEqual(1);
        expect(summary.personalDataAssets).toBeGreaterThanOrEqual(1);
        expect(summary.encryptionRequired).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Compliance Reporting', () => {
    describe('generateComplianceReport', () => {
      it('should generate comprehensive report', () => {
        const report = service.generateComplianceReport();

        expect(report.generatedAt).toBeInstanceOf(Date);
        expect(report.period.start).toBeInstanceOf(Date);
        expect(report.period.end).toBeInstanceOf(Date);
        expect(report.controlsSummary).toBeDefined();
        expect(report.riskSummary).toBeDefined();
        expect(report.incidentSummary).toBeDefined();
        expect(report.recommendations).toBeInstanceOf(Array);
      });

      it('should set overall status based on control compliance', () => {
        // All controls start as not_assessed
        const report = service.generateComplianceReport();

        expect(['partial', 'non_compliant', 'not_assessed']).toContain(report.overallStatus);
      });

      it('should include recommendations for non-compliant controls', () => {
        service.updateControlStatus('CC1.1', 'non_compliant');

        const report = service.generateComplianceReport();

        expect(report.recommendations.some((r) => r.includes('non-compliant'))).toBe(true);
      });
    });

    describe('getComplianceDashboard', () => {
      it('should return dashboard data', () => {
        const dashboard = service.getComplianceDashboard();

        expect(typeof dashboard.overallCompliance).toBe('number');
        expect(dashboard.controlsByCategory).toBeDefined();
        expect(dashboard.riskSummary).toBeDefined();
        expect(dashboard.incidentMetrics).toBeDefined();
        expect(dashboard.accessReviewStats).toBeDefined();
        expect(dashboard.dataClassification).toBeDefined();
        expect(dashboard.recentActivity).toBeInstanceOf(Array);
      });

      it('should calculate overall compliance percentage', () => {
        // Mark some controls as compliant
        service.updateControlStatus('CC1.1', 'compliant');
        service.updateControlStatus('CC1.2', 'compliant');
        service.updateControlStatus('CC1.3', 'compliant');

        const dashboard = service.getComplianceDashboard();

        expect(dashboard.overallCompliance).toBeGreaterThan(0);
      });
    });
  });

  describe('Audit Log Integration', () => {
    describe('logComplianceEvent', () => {
      it('should log compliance event to audit log', async () => {
        await service.logComplianceEvent(
          'user-123',
          'CONTROL_UPDATED',
          'ComplianceControl',
          'CC1.1',
          { status: 'compliant' },
        );

        expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'user-123',
            action: 'COMPLIANCE_CONTROL_UPDATED',
            entity: 'ComplianceControl',
            entityId: 'CC1.1',
          }),
        });
      });
    });

    describe('getComplianceAuditLogs', () => {
      it('should retrieve compliance audit logs', async () => {
        await service.getComplianceAuditLogs(50);

        expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { action: { startsWith: 'COMPLIANCE_' } },
            take: 50,
          }),
        );
      });

      it('should filter by date range', async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');

        await service.getComplianceAuditLogs(100, startDate, endDate);

        expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdAt: { gte: startDate, lte: endDate },
            }),
          }),
        );
      });
    });
  });

  describe('SOC 2 Control Categories', () => {
    it('should have controls for all 9 categories', () => {
      const categories = ['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9'];

      for (const category of categories) {
        const controls = service.getControlsByCategory(category);
        expect(controls.length).toBeGreaterThan(0);
      }
    });

    it('should have CC6 access controls', () => {
      const accessControls = service.getControlsByCategory('CC6');

      expect(accessControls.length).toBeGreaterThanOrEqual(8);
      expect(accessControls.some((c) => c.name.includes('Access'))).toBe(true);
    });

    it('should have CC7 system operations controls', () => {
      const opsControls = service.getControlsByCategory('CC7');

      expect(opsControls.some((c) => c.name.includes('Incident'))).toBe(true);
      expect(opsControls.some((c) => c.name.includes('Backup'))).toBe(true);
    });
  });
});
