import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  HSEDashboardService,
  ISOStandard,
  AuditType,
  FindingType,
  NCRPriority,
  SAFETY_KPI_TARGETS,
  ENVIRONMENTAL_KPI_TARGETS,
} from './hse-dashboard.service';

describe('HSEDashboardService', () => {
  let service: HSEDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HSEDashboardService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => null),
          },
        },
      ],
    }).compile();

    service = module.get<HSEDashboardService>(HSEDashboardService);
    service.resetState();
  });

  describe('Safety KPIs', () => {
    it('should calculate LTIR correctly', async () => {
      const kpis = await service.calculateSafetyKPIs(
        { from: new Date('2025-01-01'), to: new Date('2025-12-31') },
        {
          hoursWorked: 200000,
          totalIncidents: 10,
          recordableIncidents: 5,
          lostTimeIncidents: 2,
          nearMisses: 20,
          firstAidCases: 5,
          lostDays: 10,
          restrictedDays: 5,
        },
      );

      expect(kpis.rates.LTIR).toBe(2); // (2/200000) * 200000 = 2
      expect(kpis.rates.TRIR).toBe(5); // (5/200000) * 200000 = 5
      expect(kpis.targets).toEqual(SAFETY_KPI_TARGETS);
    });

    it('should determine performance vs targets', async () => {
      const kpis = await service.calculateSafetyKPIs(
        { from: new Date('2025-01-01'), to: new Date('2025-06-30') },
        {
          hoursWorked: 100000,
          totalIncidents: 2,
          recordableIncidents: 1,
          lostTimeIncidents: 0,
          nearMisses: 10,
          firstAidCases: 1,
          lostDays: 0,
          restrictedDays: 0,
        },
      );

      expect(kpis.rates.LTIR).toBe(0);
      expect(kpis.performance.LTIR).toBe('EXCEEDS'); // 0 < 1.6 (80% of 2.0)
      expect(kpis.trend).toBe('IMPROVING');
    });

    it('should calculate near miss ratio', async () => {
      const kpis = await service.calculateSafetyKPIs(
        { from: new Date('2025-01-01'), to: new Date('2025-03-31') },
        {
          hoursWorked: 50000,
          totalIncidents: 5,
          recordableIncidents: 2,
          lostTimeIncidents: 1,
          nearMisses: 20,
          firstAidCases: 3,
          lostDays: 3,
          restrictedDays: 2,
        },
      );

      expect(kpis.rates.nearMissRatio).toBe(10); // 20 near misses / 2 recordable
    });
  });

  describe('Environmental KPIs', () => {
    it('should calculate recycling rate', async () => {
      const kpis = await service.calculateEnvironmentalKPIs(
        { from: new Date('2025-01-01'), to: new Date('2025-12-31') },
        {
          wasteTotal: 1000,
          wasteRecycled: 800,
          wasteHazardous: 50,
          energyConsumption: 50000,
          energyRenewable: 15000,
          waterConsumption: 200,
          waterRecycled: 20,
          co2Total: 100,
          co2Scope1: 40,
          co2Scope2: 50,
          co2Scope3: 10,
          spillCount: 0,
          spillVolume: 0,
        },
      );

      expect(kpis.waste.recyclingRate).toBe(80); // 800/1000 * 100
      expect(kpis.compliance.recyclingRate).toBe('MEETS'); // 80 >= 75
    });

    it('should track energy efficiency', async () => {
      const kpis = await service.calculateEnvironmentalKPIs(
        { from: new Date('2025-01-01'), to: new Date('2025-12-31') },
        {
          wasteTotal: 500,
          wasteRecycled: 300,
          wasteHazardous: 25,
          energyConsumption: 100000,
          energyRenewable: 10000,
          waterConsumption: 300,
          waterRecycled: 30,
          co2Total: 150,
          co2Scope1: 60,
          co2Scope2: 70,
          co2Scope3: 20,
          spillCount: 1,
          spillVolume: 5,
        },
      );

      expect(kpis.energy.efficiencyScore).toBe(10); // 10000/100000 * 100
      expect(kpis.compliance.energyEfficiency).toBe('MEETS'); // 10 >= 5
      expect(kpis.spills.count).toBe(1);
    });
  });

  describe('ISO Clauses', () => {
    it('should return ISO 45001 clauses', async () => {
      const clauses = await service.getISOClauses('ISO_45001');

      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses[0].standard).toBe('ISO_45001');
      expect(clauses.some(c => c.number === '5')).toBe(true); // Leadership clause
    });

    it('should return ISO 14001 clauses', async () => {
      const clauses = await service.getISOClauses('ISO_14001');

      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses[0].standard).toBe('ISO_14001');
    });

    it('should have checklist items for each clause', async () => {
      const clauses = await service.getISOClauses('ISO_45001');

      for (const clause of clauses) {
        expect(clause.checklistItems.length).toBeGreaterThan(0);
        expect(clause.checklistItems[0].clauseNumber).toContain(clause.number);
      }
    });
  });

  describe('Audit Management', () => {
    it('should create an audit with checklist', async () => {
      const audit = await service.createAudit({
        standard: 'ISO_45001',
        type: 'INTERNAL',
        title: 'Q4 Internal Audit',
        scope: 'All departments',
        scheduledDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-17'),
        location: 'Main Office',
        leadAuditor: {
          id: 'auditor-1',
          name: 'John Auditor',
          email: 'john@audit.com',
          organization: 'Internal',
          certifications: ['ISO 45001 Lead Auditor'],
          role: 'LEAD_AUDITOR',
        },
        auditees: ['Production', 'Maintenance'],
      });

      expect(audit.id).toBeDefined();
      expect(audit.auditNumber).toContain('AUD-45');
      expect(audit.status).toBe('PLANNED');
      expect(audit.checklist.length).toBeGreaterThan(0);
    });

    it('should start an audit', async () => {
      const audit = await service.createAudit({
        standard: 'ISO_14001',
        type: 'SURVEILLANCE',
        title: 'Surveillance Audit',
        scope: 'EMS scope',
        scheduledDate: new Date(),
        endDate: new Date(),
        location: 'Factory',
        leadAuditor: { id: 'a1', name: 'Auditor', email: 'a@test.com', organization: 'Cert Body', certifications: [], role: 'LEAD_AUDITOR' },
        auditees: ['EHS Team'],
      });

      const started = await service.startAudit(audit.id);
      expect(started.status).toBe('IN_PROGRESS');
    });

    it('should update checklist item', async () => {
      const audit = await service.createAudit({
        standard: 'ISO_45001',
        type: 'INTERNAL',
        title: 'Test Audit',
        scope: 'Test',
        scheduledDate: new Date(),
        endDate: new Date(),
        location: 'Test',
        leadAuditor: { id: 'a1', name: 'Auditor', email: 'a@test.com', organization: 'Internal', certifications: [], role: 'LEAD_AUDITOR' },
        auditees: ['Test'],
      });

      const itemId = audit.checklist[0].itemId;
      const updated = await service.updateChecklistItem(audit.id, itemId, {
        status: 'CONFORMING',
        evidence: ['Policy document reviewed', 'Interview with manager'],
        notes: 'All requirements met',
      });

      const item = updated.checklist.find(c => c.itemId === itemId);
      expect(item!.status).toBe('CONFORMING');
      expect(item!.evidence.length).toBe(2);
    });

    it('should add audit finding', async () => {
      const audit = await service.createAudit({
        standard: 'ISO_45001',
        type: 'INTERNAL',
        title: 'Finding Test',
        scope: 'Test',
        scheduledDate: new Date(),
        endDate: new Date(),
        location: 'Test',
        leadAuditor: { id: 'a1', name: 'Auditor', email: 'a@test.com', organization: 'Internal', certifications: [], role: 'LEAD_AUDITOR' },
        auditees: ['Test'],
      });

      const finding = await service.addAuditFinding(audit.id, {
        type: 'MINOR_NC',
        clauseNumber: '7.2',
        description: 'Training records incomplete for new employees',
        evidence: ['Training matrix shows gaps'],
        correctiveAction: 'Update training records',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        assignedTo: 'HR Manager',
      });

      expect(finding.id).toBeDefined();
      expect(finding.type).toBe('MINOR_NC');
      expect(finding.ncrId).toBeDefined(); // Auto-created NCR
    });

    it('should complete audit with score calculation', async () => {
      const audit = await service.createAudit({
        standard: 'ISO_45001',
        type: 'INTERNAL',
        title: 'Complete Test',
        scope: 'Test',
        scheduledDate: new Date(),
        endDate: new Date(),
        location: 'Test',
        leadAuditor: { id: 'a1', name: 'Auditor', email: 'a@test.com', organization: 'Internal', certifications: [], role: 'LEAD_AUDITOR' },
        auditees: ['Test'],
      });

      // Mark some items as conforming
      for (let i = 0; i < 5; i++) {
        await service.updateChecklistItem(audit.id, audit.checklist[i].itemId, {
          status: 'CONFORMING',
          evidence: ['Evidence'],
          notes: '',
        });
      }

      const completed = await service.completeAudit(audit.id, {
        executiveSummary: 'Audit completed successfully',
        recommendation: 'MAINTAIN',
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.overallScore).toBeGreaterThan(0);
      expect(completed.completedAt).toBeDefined();
    });

    it('should list audits with filters', async () => {
      await service.createAudit({
        standard: 'ISO_45001',
        type: 'INTERNAL',
        title: 'Audit 1',
        scope: 'Test',
        scheduledDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-02'),
        location: 'A',
        leadAuditor: { id: 'a1', name: 'Auditor', email: 'a@test.com', organization: 'Internal', certifications: [], role: 'LEAD_AUDITOR' },
        auditees: ['Test'],
      });

      await service.createAudit({
        standard: 'ISO_14001',
        type: 'EXTERNAL',
        title: 'Audit 2',
        scope: 'Test',
        scheduledDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-02'),
        location: 'B',
        leadAuditor: { id: 'a1', name: 'Auditor', email: 'a@test.com', organization: 'External', certifications: [], role: 'LEAD_AUDITOR' },
        auditees: ['Test'],
      });

      const iso45001Audits = await service.listAudits({ standard: 'ISO_45001' });
      expect(iso45001Audits.length).toBe(1);

      const allAudits = await service.listAudits();
      expect(allAudits.length).toBe(2);
    });
  });

  describe('Non-Conformance Reports', () => {
    it('should create NCR', async () => {
      const ncr = await service.createNCR({
        standard: 'ISO_45001',
        source: 'INSPECTION',
        title: 'Missing fire extinguisher',
        description: 'Fire extinguisher not present at required location',
        clauseNumber: '8.2',
        priority: 'HIGH',
        detectedBy: 'Safety Inspector',
        department: 'Warehouse',
        location: 'Building B',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      expect(ncr.id).toBeDefined();
      expect(ncr.ncrNumber).toContain('NCR-45');
      expect(ncr.status).toBe('OPEN');
      expect(ncr.priority).toBe('HIGH');
    });

    it('should add root cause analysis', async () => {
      const ncr = await service.createNCR({
        standard: 'ISO_45001',
        source: 'INCIDENT',
        title: 'Slip hazard',
        description: 'Worker slipped on wet floor',
        clauseNumber: '8.1',
        priority: 'MEDIUM',
        detectedBy: 'Supervisor',
        department: 'Production',
        location: 'Line 1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const updated = await service.addRootCauseAnalysis(ncr.id, {
        method: 'FIVE_WHY',
        analysis: '5-Why analysis performed',
        rootCauses: ['Inadequate cleaning schedule', 'No wet floor signs'],
        contributingFactors: ['High humidity', 'Worn floor surface'],
        completedBy: 'Safety Manager',
        completedAt: new Date(),
      });

      expect(updated.rootCauseAnalysis).toBeDefined();
      expect(updated.status).toBe('ROOT_CAUSE_ANALYSIS');
    });

    it('should add corrective action plan', async () => {
      const ncr = await service.createNCR({
        standard: 'ISO_14001',
        source: 'SELF_IDENTIFIED',
        title: 'Waste segregation issue',
        description: 'Mixed waste found in recycling bin',
        clauseNumber: '8.1',
        priority: 'MEDIUM',
        detectedBy: 'EHS Officer',
        department: 'Office',
        location: 'Admin Building',
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      });

      const updated = await service.addCorrectiveActionPlan(ncr.id, {
        actions: [
          {
            id: 'action-1',
            description: 'Install color-coded bins',
            assignedTo: 'Facilities Manager',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'PENDING',
          },
          {
            id: 'action-2',
            description: 'Train staff on waste segregation',
            assignedTo: 'EHS Officer',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'PENDING',
          },
        ],
        preventiveActions: ['Monthly waste audits', 'Signage improvements'],
        resourcesRequired: 'New bins, training materials',
        estimatedCost: 500,
      });

      expect(updated.correctiveAction).toBeDefined();
      expect(updated.correctiveAction!.actions.length).toBe(2);
      expect(updated.status).toBe('CORRECTIVE_ACTION');
    });

    it('should update corrective action status', async () => {
      const ncr = await service.createNCR({
        standard: 'ISO_45001',
        source: 'AUDIT',
        title: 'PPE issue',
        description: 'Workers not wearing required PPE',
        clauseNumber: '8.1.2',
        priority: 'HIGH',
        detectedBy: 'Auditor',
        department: 'Maintenance',
        location: 'Workshop',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      await service.addCorrectiveActionPlan(ncr.id, {
        actions: [
          { id: 'ca-1', description: 'PPE training', assignedTo: 'Supervisor', dueDate: new Date(), status: 'PENDING' },
        ],
        preventiveActions: [],
        resourcesRequired: 'Training materials',
      });

      const updated = await service.updateCorrectiveActionStatus(ncr.id, 'ca-1', 'COMPLETED', ['Training record']);
      expect(updated.correctiveAction!.actions[0].status).toBe('COMPLETED');
      expect(updated.status).toBe('VERIFICATION'); // All actions completed
    });

    it('should verify and close NCR', async () => {
      const ncr = await service.createNCR({
        standard: 'ISO_45001',
        source: 'COMPLAINT',
        title: 'Noise complaint',
        description: 'Excessive noise from equipment',
        clauseNumber: '6.1.2',
        priority: 'MEDIUM',
        detectedBy: 'Community Liaison',
        department: 'Production',
        location: 'Factory',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const closed = await service.verifyNCR(ncr.id, {
        verifiedBy: 'Quality Manager',
        verifiedAt: new Date(),
        effectivenessRating: 4,
        effectivenessEvidence: ['Noise measurements within limits', 'No further complaints'],
        recurrencePrevented: true,
        notes: 'Silencers installed, effective',
      });

      expect(closed.status).toBe('CLOSED');
      expect(closed.closedDate).toBeDefined();
      expect(closed.verification!.effectivenessRating).toBe(4);
    });

    it('should list NCRs with filters', async () => {
      await service.createNCR({
        standard: 'ISO_45001',
        source: 'AUDIT',
        title: 'NCR 1',
        description: 'Test',
        clauseNumber: '5.1',
        priority: 'CRITICAL',
        detectedBy: 'Test',
        department: 'Test',
        location: 'Test',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await service.createNCR({
        standard: 'ISO_14001',
        source: 'INSPECTION',
        title: 'NCR 2',
        description: 'Test',
        clauseNumber: '6.1',
        priority: 'LOW',
        detectedBy: 'Test',
        department: 'Test',
        location: 'Test',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const criticalNCRs = await service.listNCRs({ priority: 'CRITICAL' });
      expect(criticalNCRs.length).toBe(1);

      const iso14001NCRs = await service.listNCRs({ standard: 'ISO_14001' });
      expect(iso14001NCRs.length).toBe(1);
    });

    it('should get NCR statistics', async () => {
      await service.createNCR({
        standard: 'ISO_45001',
        source: 'AUDIT',
        title: 'Stat Test 1',
        description: 'Test',
        clauseNumber: '5.1',
        priority: 'HIGH',
        detectedBy: 'Test',
        department: 'Test',
        location: 'Test',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await service.createNCR({
        standard: 'ISO_45001',
        source: 'INCIDENT',
        title: 'Stat Test 2',
        description: 'Test',
        clauseNumber: '8.1',
        priority: 'MEDIUM',
        detectedBy: 'Test',
        department: 'Test',
        location: 'Test',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Overdue
      });

      const stats = await service.getNCRStatistics();
      expect(stats.total).toBe(2);
      expect(stats.byStatus.OPEN).toBe(2);
      expect(stats.overdue).toBe(1);
    });
  });

  describe('Management Reviews', () => {
    it('should create management review', async () => {
      const review = await service.createManagementReview({
        standard: 'ISO_45001',
        period: { from: new Date('2025-01-01'), to: new Date('2025-12-31') },
        scheduledDate: new Date('2026-01-15'),
        chairperson: 'CEO',
        attendees: ['COO', 'HSE Manager', 'HR Director', 'Operations Manager'],
        agenda: {
          items: [
            { order: 1, topic: 'Review of previous actions', presenter: 'HSE Manager', duration: 15 },
            { order: 2, topic: 'Audit results summary', presenter: 'Quality Manager', duration: 20 },
            { order: 3, topic: 'Incident statistics', presenter: 'HSE Manager', duration: 15 },
          ],
        },
      });

      expect(review.id).toBeDefined();
      expect(review.reviewNumber).toContain('MR-45');
      expect(review.status).toBe('SCHEDULED');
      expect(review.attendees.length).toBe(4);
    });

    it('should update management review inputs', async () => {
      const review = await service.createManagementReview({
        standard: 'ISO_14001',
        period: { from: new Date('2025-01-01'), to: new Date('2025-06-30') },
        scheduledDate: new Date('2025-07-15'),
        chairperson: 'Managing Director',
        attendees: ['EHS Manager'],
        agenda: { items: [] },
      });

      const updated = await service.updateManagementReviewInputs(review.id, {
        auditResults: { audits: 2, findings: 5, closedNCRs: 3 },
        incidentSummary: { total: 10, recordable: 2, trend: 'IMPROVING' },
        trainingStatus: { compliance: 95, gaps: ['First Aid refresher due'] },
      });

      expect(updated.inputs.auditResults.audits).toBe(2);
      expect(updated.inputs.incidentSummary.trend).toBe('IMPROVING');
    });

    it('should record management review outputs', async () => {
      const review = await service.createManagementReview({
        standard: 'ISO_45001',
        period: { from: new Date('2024-01-01'), to: new Date('2024-12-31') },
        scheduledDate: new Date('2025-01-20'),
        chairperson: 'CEO',
        attendees: ['Team'],
        agenda: { items: [] },
      });

      const completed = await service.recordManagementReviewOutputs(
        review.id,
        {
          decisionsAndActions: ['Increase safety training budget by 10%'],
          resourceAllocations: ['2 additional EHS officers'],
          objectivesRevisions: ['Target LTIR < 1.5'],
          policyChanges: [],
          improvementOpportunities: ['Implement behavioral safety program'],
          nextReviewDate: new Date('2026-01-20'),
        },
        'Meeting minutes documented...',
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.outputs.decisionsAndActions.length).toBe(1);
      expect(completed.minutes).toBeDefined();
    });

    it('should add management review action', async () => {
      const review = await service.createManagementReview({
        standard: 'ISO_45001',
        period: { from: new Date('2025-01-01'), to: new Date('2025-12-31') },
        scheduledDate: new Date('2026-01-10'),
        chairperson: 'Director',
        attendees: ['Team'],
        agenda: { items: [] },
      });

      const updated = await service.addManagementReviewAction(review.id, {
        action: 'Review contractor safety program',
        assignedTo: 'Procurement Manager',
        dueDate: new Date('2026-03-31'),
        priority: 'HIGH',
      });

      expect(updated.actionItems.length).toBe(1);
      expect(updated.actionItems[0].status).toBe('PENDING');
    });

    it('should approve management review', async () => {
      const review = await service.createManagementReview({
        standard: 'ISO_14001',
        period: { from: new Date('2025-01-01'), to: new Date('2025-12-31') },
        scheduledDate: new Date('2026-01-25'),
        chairperson: 'CEO',
        attendees: ['Team'],
        agenda: { items: [] },
      });

      await service.recordManagementReviewOutputs(review.id, {
        decisionsAndActions: [],
        resourceAllocations: [],
        objectivesRevisions: [],
        policyChanges: [],
        improvementOpportunities: [],
        nextReviewDate: new Date('2027-01-25'),
      }, 'Minutes');

      const approved = await service.approveManagementReview(review.id, 'CEO');
      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe('CEO');
      expect(approved.approvedAt).toBeDefined();
    });
  });

  describe('Dashboard', () => {
    it('should generate HSE dashboard', async () => {
      const dashboard = await service.generateHSEDashboard({
        from: new Date('2025-01-01'),
        to: new Date('2025-12-31'),
      });

      expect(dashboard.generatedAt).toBeDefined();
      expect(dashboard.safetyKPIs).toBeDefined();
      expect(dashboard.environmentalKPIs).toBeDefined();
      expect(dashboard.complianceScore).toBeDefined();
      expect(dashboard.widgets.length).toBeGreaterThan(0);
    });

    it('should include KPI widgets', async () => {
      const dashboard = await service.generateHSEDashboard({
        from: new Date('2025-01-01'),
        to: new Date('2025-06-30'),
      });

      const ltirWidget = dashboard.widgets.find(w => w.id === 'widget-ltir');
      expect(ltirWidget).toBeDefined();
      expect(ltirWidget!.type).toBe('KPI_GAUGE');

      const ncrWidget = dashboard.widgets.find(w => w.id === 'widget-ncr');
      expect(ncrWidget).toBeDefined();
      expect(ncrWidget!.type).toBe('NCR_SUMMARY');
    });

    it('should generate alerts for overdue NCRs', async () => {
      // Create an overdue NCR
      await service.createNCR({
        standard: 'ISO_45001',
        source: 'AUDIT',
        title: 'Overdue NCR',
        description: 'This should trigger an alert',
        clauseNumber: '5.1',
        priority: 'HIGH',
        detectedBy: 'Auditor',
        department: 'Test',
        location: 'Test',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });

      const dashboard = await service.generateHSEDashboard({
        from: new Date('2025-01-01'),
        to: new Date('2025-12-31'),
      });

      expect(dashboard.openNCRs.overdue).toBe(1);
      const overdueAlert = dashboard.alerts.find(a => a.type === 'NCR_OVERDUE');
      expect(overdueAlert).toBeDefined();
      expect(overdueAlert!.severity).toBe('CRITICAL');
    });
  });

  describe('Reporting', () => {
    it('should generate audit report', async () => {
      const audit = await service.createAudit({
        standard: 'ISO_45001',
        type: 'INTERNAL',
        title: 'Report Test Audit',
        scope: 'Full scope',
        scheduledDate: new Date(),
        endDate: new Date(),
        location: 'HQ',
        leadAuditor: { id: 'a1', name: 'Lead', email: 'l@test.com', organization: 'Internal', certifications: [], role: 'LEAD_AUDITOR' },
        auditees: ['All'],
      });

      // Mark some items
      for (let i = 0; i < 3; i++) {
        await service.updateChecklistItem(audit.id, audit.checklist[i].itemId, {
          status: 'CONFORMING',
          evidence: ['Doc'],
          notes: '',
        });
      }

      await service.addAuditFinding(audit.id, {
        type: 'OBSERVATION',
        clauseNumber: '7.3',
        description: 'Could improve awareness training',
        evidence: ['Interview notes'],
      });

      await service.completeAudit(audit.id, {
        executiveSummary: 'Good audit',
        recommendation: 'MAINTAIN',
      });

      const report = await service.generateAuditReport(audit.id);

      expect(report.audit).toBeDefined();
      expect(report.summary.conforming).toBe(3);
      expect(report.findingsByClause['7.3']).toBeDefined();
    });

    it('should generate NCR report', async () => {
      await service.createNCR({
        standard: 'ISO_45001',
        source: 'AUDIT',
        title: 'Report NCR 1',
        description: 'Test',
        clauseNumber: '5.1',
        priority: 'MEDIUM',
        detectedBy: 'Test',
        department: 'Test',
        location: 'Test',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const report = await service.generateNCRReport({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(report.statistics).toBeDefined();
      expect(report.ncrs.length).toBe(1);
      expect(report.trends).toBeDefined();
    });
  });
});
