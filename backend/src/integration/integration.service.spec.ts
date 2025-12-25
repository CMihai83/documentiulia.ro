import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationService,
  EmployeeOnboardingEvent,
  SalaryChangeEvent,
  FreelancerAvailability,
  CourseCompletionEvent,
} from './integration.service';

describe('IntegrationService', () => {
  let service: IntegrationService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
    await service.onModuleInit();
  });

  describe('Event Bus', () => {
    it('should publish an event and return event id', async () => {
      const eventId = await service.publishEvent({
        type: 'test.event',
        sourceModule: 'HR',
        targetModules: ['HSE'],
        correlationId: 'corr-1',
        payload: { test: 'data' },
        metadata: {
          priority: 'normal',
          retryCount: 0,
          maxRetries: 3,
        },
      });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should retrieve published event', async () => {
      const eventId = await service.publishEvent({
        type: 'test.event',
        sourceModule: 'HR',
        targetModules: ['HSE'],
        correlationId: 'corr-2',
        payload: { test: 'data' },
        metadata: { priority: 'normal', retryCount: 0, maxRetries: 3 },
      });

      const event = service.getEvent(eventId);
      expect(event).toBeDefined();
      expect(event?.type).toBe('test.event');
    });

    it('should return undefined for non-existent event', () => {
      const event = service.getEvent('non-existent');
      expect(event).toBeUndefined();
    });

    it('should get events by module', async () => {
      await service.publishEvent({
        type: 'hr.event',
        sourceModule: 'HR',
        targetModules: ['HSE'],
        correlationId: 'corr-3',
        payload: {},
        metadata: { priority: 'normal', retryCount: 0, maxRetries: 3 },
      });

      const events = service.getEventsByModule('HR');
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.sourceModule === 'HR')).toBe(true);
    });

    it('should get event queue', () => {
      const queue = service.getEventQueue();
      expect(Array.isArray(queue)).toBe(true);
    });

    it('should subscribe to events and receive them', async () => {
      const received: any[] = [];
      const unsubscribe = service.subscribe('subscribe.test', async (event) => {
        received.push(event);
      });

      await service.publishEvent({
        type: 'subscribe.test',
        sourceModule: 'HR',
        targetModules: ['HSE'],
        correlationId: 'corr-4',
        payload: { value: 123 },
        metadata: { priority: 'normal', retryCount: 0, maxRetries: 3 },
      });

      expect(received.length).toBe(1);
      expect(received[0].payload.value).toBe(123);

      unsubscribe();
    });

    it('should unsubscribe from events', async () => {
      const received: any[] = [];
      const unsubscribe = service.subscribe('unsubscribe.test', async (event) => {
        received.push(event);
      });

      unsubscribe();

      await service.publishEvent({
        type: 'unsubscribe.test',
        sourceModule: 'HR',
        targetModules: ['HSE'],
        correlationId: 'corr-5',
        payload: {},
        metadata: { priority: 'normal', retryCount: 0, maxRetries: 3 },
      });

      expect(received.length).toBe(0);
    });

    it('should support wildcard subscription', async () => {
      const received: any[] = [];
      const unsubscribe = service.subscribe('*', async (event) => {
        received.push(event);
      });

      await service.publishEvent({
        type: 'any.event.type',
        sourceModule: 'HR',
        targetModules: ['HSE'],
        correlationId: 'corr-6',
        payload: {},
        metadata: { priority: 'normal', retryCount: 0, maxRetries: 3 },
      });

      expect(received.length).toBeGreaterThan(0);

      unsubscribe();
    });
  });

  describe('HR → HSE Integration (Onboarding Training)', () => {
    const onboardingEvent: EmployeeOnboardingEvent = {
      employeeId: 'emp-001',
      employeeName: 'John Doe',
      department: 'Warehouse',
      position: 'Operator',
      startDate: new Date(),
      requiredTrainings: [],
      contractType: 'full-time',
    };

    it('should assign mandatory trainings on onboarding', async () => {
      const assignments = await service.triggerOnboardingTraining(onboardingEvent);

      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments.every(a => a.employeeId === 'emp-001')).toBe(true);
      expect(assignments.every(a => a.status === 'assigned')).toBe(true);
    });

    it('should assign department-specific trainings', async () => {
      const assignments = await service.triggerOnboardingTraining(onboardingEvent);

      // Warehouse department should have forklift and manual handling
      const trainingNames = assignments.map(a => a.trainingName);
      expect(trainingNames).toContain('Forklift Operation');
      expect(trainingNames).toContain('Manual Handling');
    });

    it('should get training assignments by employee', () => {
      const assignments = service.getTrainingAssignments('emp-001');
      expect(Array.isArray(assignments)).toBe(true);
    });

    it('should get all training assignments', () => {
      const assignments = service.getTrainingAssignments();
      expect(Array.isArray(assignments)).toBe(true);
    });

    it('should update training status', async () => {
      const assignments = await service.triggerOnboardingTraining({
        ...onboardingEvent,
        employeeId: 'emp-002',
      });

      const assignmentId = assignments[0].id;
      const result = service.updateTrainingStatus(assignmentId, 'completed');

      expect(result).toBe(true);
    });

    it('should return false when updating non-existent assignment', () => {
      const result = service.updateTrainingStatus('non-existent', 'completed');
      expect(result).toBe(false);
    });

    it('should assign office trainings for office department', async () => {
      const assignments = await service.triggerOnboardingTraining({
        ...onboardingEvent,
        employeeId: 'emp-003',
        department: 'Office',
      });

      const trainingNames = assignments.map(a => a.trainingName);
      expect(trainingNames).toContain('Workplace Ergonomics');
    });

    it('should assign IT trainings for IT department', async () => {
      const assignments = await service.triggerOnboardingTraining({
        ...onboardingEvent,
        employeeId: 'emp-004',
        department: 'IT',
      });

      const trainingNames = assignments.map(a => a.trainingName);
      expect(trainingNames).toContain('Cybersecurity Awareness');
    });
  });

  describe('HR → Payroll → Finance Integration', () => {
    const salaryChange: SalaryChangeEvent = {
      employeeId: 'emp-100',
      previousSalary: 5000,
      newSalary: 6000,
      currency: 'RON',
      effectiveDate: new Date(),
      reason: 'Annual raise',
    };

    it('should create payroll entry on salary change', async () => {
      const payrollEntry = await service.syncSalaryToPayroll(salaryChange);

      expect(payrollEntry).toBeDefined();
      expect(payrollEntry.employeeId).toBe('emp-100');
      expect(payrollEntry.grossSalary).toBe(6000);
    });

    it('should calculate Romanian deductions correctly', async () => {
      const payrollEntry = await service.syncSalaryToPayroll(salaryChange);

      // 25% CAS
      expect(payrollEntry.deductions.cas).toBe(6000 * 0.25);
      // 10% CASS
      expect(payrollEntry.deductions.cass).toBe(6000 * 0.10);
      // 10% income tax on taxable income
      const taxableIncome = 6000 - payrollEntry.deductions.cas - payrollEntry.deductions.cass;
      expect(payrollEntry.deductions.impozit).toBe(taxableIncome * 0.10);
    });

    it('should calculate net salary correctly', async () => {
      const payrollEntry = await service.syncSalaryToPayroll(salaryChange);

      const expectedNet = 6000 -
        payrollEntry.deductions.cas -
        payrollEntry.deductions.cass -
        payrollEntry.deductions.impozit;

      expect(payrollEntry.netSalary).toBe(expectedNet);
    });

    it('should create finance transaction', async () => {
      await service.syncSalaryToPayroll(salaryChange);
      const transactions = service.getFinanceTransactions('Payroll');

      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions.some(t => t.type === 'payroll')).toBe(true);
    });

    it('should get payroll entries by employee', () => {
      const entries = service.getPayrollEntries('emp-100');
      expect(Array.isArray(entries)).toBe(true);
    });

    it('should get all payroll entries', () => {
      const entries = service.getPayrollEntries();
      expect(Array.isArray(entries)).toBe(true);
    });

    it('should get finance transactions by module', () => {
      const transactions = service.getFinanceTransactions('Payroll');
      expect(Array.isArray(transactions)).toBe(true);
    });

    it('should get all finance transactions', () => {
      const transactions = service.getFinanceTransactions();
      expect(Array.isArray(transactions)).toBe(true);
    });
  });

  describe('Freelancer → Logistics Integration', () => {
    const freelancerAvailability: FreelancerAvailability = {
      freelancerId: 'free-100',
      freelancerName: 'Test Freelancer',
      skills: ['driving', 'delivery'],
      availableFrom: new Date(),
      availableTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      hourlyRate: 60,
      currency: 'RON',
      location: 'Bucharest',
      vehicleType: 'van',
      hasOwnVehicle: true,
    };

    it('should register freelancer availability', () => {
      service.registerFreelancerAvailability(freelancerAvailability);
      const availabilities = service.getFreelancerAvailability('free-100');

      expect(availabilities.length).toBe(1);
      expect(availabilities[0].freelancerName).toBe('Test Freelancer');
    });

    it('should get all freelancer availabilities', () => {
      const availabilities = service.getFreelancerAvailability();
      expect(Array.isArray(availabilities)).toBe(true);
      expect(availabilities.length).toBeGreaterThan(0);
    });

    it('should create capacity request', () => {
      const request = service.createCapacityRequest({
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        requiredSkills: ['driving'],
        location: 'Bucharest',
        estimatedHours: 8,
        vehicleRequired: true,
        vehicleType: 'van',
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBeDefined();
    });

    it('should auto-match freelancers to requests', () => {
      service.registerFreelancerAvailability({
        ...freelancerAvailability,
        freelancerId: 'free-match-1',
      });

      const request = service.createCapacityRequest({
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        requiredSkills: ['driving'],
        location: 'Bucharest',
        estimatedHours: 8,
        vehicleRequired: true,
        vehicleType: 'van',
      });

      expect(request.matchedFreelancers.length).toBeGreaterThan(0);
      expect(request.status).toBe('matched');
    });

    it('should get capacity requests by status', () => {
      const requests = service.getCapacityRequests('open');
      expect(Array.isArray(requests)).toBe(true);
    });

    it('should get all capacity requests', () => {
      const requests = service.getCapacityRequests();
      expect(Array.isArray(requests)).toBe(true);
    });

    it('should confirm freelancer assignment', () => {
      service.registerFreelancerAvailability({
        ...freelancerAvailability,
        freelancerId: 'free-confirm-1',
      });

      const request = service.createCapacityRequest({
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        requiredSkills: ['driving'],
        location: 'Bucharest',
        estimatedHours: 8,
        vehicleRequired: true,
        vehicleType: 'van',
      });

      if (request.matchedFreelancers.length > 0) {
        const result = service.confirmFreelancerAssignment(request.id, request.matchedFreelancers[0]);
        expect(result).toBe(true);
      }
    });

    it('should return false when confirming with non-matched freelancer', () => {
      const request = service.createCapacityRequest({
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        requiredSkills: ['rare-skill'],
        location: 'Remote Location',
        estimatedHours: 8,
        vehicleRequired: false,
      });

      const result = service.confirmFreelancerAssignment(request.id, 'non-matched');
      expect(result).toBe(false);
    });
  });

  describe('LMS → HR Competency Integration', () => {
    const courseCompletion: CourseCompletionEvent = {
      employeeId: 'emp-lms-1',
      courseId: 'course-excel',
      courseName: 'Advanced Excel',
      category: 'skills',
      completedDate: new Date(),
      score: 85,
      certificateId: 'cert-001',
      skills: ['Excel', 'Data Analysis', 'Pivot Tables'],
    };

    it('should process course completion and update competencies', async () => {
      const updates = await service.processCourseCompletion(courseCompletion);

      expect(updates.length).toBe(3); // 3 skills
      expect(updates.every(u => u.employeeId === 'emp-lms-1')).toBe(true);
    });

    it('should calculate competency level based on score', async () => {
      const updates = await service.processCourseCompletion(courseCompletion);

      // Score 85 should result in level 4
      expect(updates[0].newLevel).toBe(4);
    });

    it('should calculate level 5 for score >= 90', async () => {
      const updates = await service.processCourseCompletion({
        ...courseCompletion,
        employeeId: 'emp-lms-2',
        score: 95,
      });

      expect(updates[0].newLevel).toBe(5);
    });

    it('should calculate level 3 for score >= 60', async () => {
      const updates = await service.processCourseCompletion({
        ...courseCompletion,
        employeeId: 'emp-lms-3',
        score: 65,
      });

      expect(updates[0].newLevel).toBe(3);
    });

    it('should get competency updates for employee', async () => {
      await service.processCourseCompletion(courseCompletion);
      const updates = service.getCompetencyUpdates('emp-lms-1');

      expect(updates.length).toBeGreaterThan(0);
    });

    it('should return empty array for employee with no updates', () => {
      const updates = service.getCompetencyUpdates('non-existent');
      expect(updates).toEqual([]);
    });

    it('should get employee competency matrix', async () => {
      await service.processCourseCompletion(courseCompletion);
      const matrix = service.getEmployeeCompetencyMatrix('emp-lms-1');

      expect(matrix.length).toBeGreaterThan(0);
      expect(matrix[0]).toHaveProperty('competency');
      expect(matrix[0]).toHaveProperty('level');
      expect(matrix[0]).toHaveProperty('lastUpdated');
    });

    it('should return empty matrix for employee with no competencies', () => {
      const matrix = service.getEmployeeCompetencyMatrix('non-existent');
      expect(matrix).toEqual([]);
    });
  });

  describe('Dashboard Aggregation', () => {
    it('should aggregate dashboard metrics', () => {
      const metrics = service.aggregateDashboardMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.hr).toBeDefined();
      expect(metrics.hse).toBeDefined();
      expect(metrics.finance).toBeDefined();
      expect(metrics.logistics).toBeDefined();
      expect(metrics.lms).toBeDefined();
    });

    it('should include HR metrics', () => {
      const metrics = service.aggregateDashboardMetrics();

      expect(metrics.hr.totalEmployees).toBeGreaterThan(0);
      expect(typeof metrics.hr.turnoverRate).toBe('number');
    });

    it('should include HSE metrics', () => {
      const metrics = service.aggregateDashboardMetrics();

      expect(typeof metrics.hse.openIncidents).toBe('number');
      expect(typeof metrics.hse.complianceScore).toBe('number');
      expect(['low', 'medium', 'high']).toContain(metrics.hse.riskLevel);
    });

    it('should include Finance metrics', () => {
      const metrics = service.aggregateDashboardMetrics();

      expect(typeof metrics.finance.monthlyPayroll).toBe('number');
      expect(typeof metrics.finance.budgetUtilization).toBe('number');
    });

    it('should include Logistics metrics', () => {
      const metrics = service.aggregateDashboardMetrics();

      expect(typeof metrics.logistics.activeDeliveries).toBe('number');
      expect(typeof metrics.logistics.onTimeDeliveryRate).toBe('number');
    });

    it('should include LMS metrics', () => {
      const metrics = service.aggregateDashboardMetrics();

      expect(typeof metrics.lms.activeCourses).toBe('number');
      expect(typeof metrics.lms.completionRate).toBe('number');
    });

    it('should store metrics history', () => {
      service.aggregateDashboardMetrics();
      service.aggregateDashboardMetrics();

      const history = service.getMetricsHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit metrics history', () => {
      const history = service.getMetricsHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entries on HR-HSE integration', async () => {
      await service.triggerOnboardingTraining({
        employeeId: 'audit-emp-1',
        employeeName: 'Audit Test',
        department: 'Office',
        position: 'Test',
        startDate: new Date(),
        requiredTrainings: [],
        contractType: 'full-time',
      });

      const audit = service.getAuditTrail({ sourceModule: 'HR' });
      expect(audit.length).toBeGreaterThan(0);
    });

    it('should filter audit by source module', () => {
      const audit = service.getAuditTrail({ sourceModule: 'HR' });
      expect(audit.every(e => e.sourceModule === 'HR')).toBe(true);
    });

    it('should filter audit by target module', () => {
      const audit = service.getAuditTrail({ targetModule: 'HSE' });
      expect(audit.every(e => e.targetModule === 'HSE')).toBe(true);
    });

    it('should get all audit entries', () => {
      const audit = service.getAuditTrail();
      expect(Array.isArray(audit)).toBe(true);
    });

    it('should get audit summary', () => {
      const summary = service.getAuditSummary();

      expect(summary.totalEntries).toBeDefined();
      expect(summary.bySourceModule).toBeDefined();
      expect(summary.byStatus).toBeDefined();
      expect(summary.recentActivity).toBeDefined();
    });
  });

  describe('Integration Rules', () => {
    it('should create integration rule', () => {
      const rule = service.createRule({
        name: 'Test Rule',
        description: 'Test Description',
        sourceModule: 'HR',
        targetModule: 'HSE',
        triggerEvent: 'test.event',
        enabled: true,
        conditions: [],
        actions: [],
        priority: 50,
      });

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Test Rule');
    });

    it('should get rule by id', () => {
      const created = service.createRule({
        name: 'Get Rule Test',
        description: 'Test',
        sourceModule: 'HR',
        targetModule: 'HSE',
        triggerEvent: 'test.event',
        enabled: true,
        conditions: [],
        actions: [],
        priority: 50,
      });

      const retrieved = service.getRule(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Get Rule Test');
    });

    it('should return undefined for non-existent rule', () => {
      const rule = service.getRule('non-existent');
      expect(rule).toBeUndefined();
    });

    it('should get all rules', () => {
      const rules = service.getAllRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0); // Default rules initialized
    });

    it('should update rule', () => {
      const rule = service.createRule({
        name: 'Update Test',
        description: 'Original',
        sourceModule: 'HR',
        targetModule: 'HSE',
        triggerEvent: 'test.event',
        enabled: true,
        conditions: [],
        actions: [],
        priority: 50,
      });

      const result = service.updateRule(rule.id, { description: 'Updated' });
      expect(result).toBe(true);

      const updated = service.getRule(rule.id);
      expect(updated?.description).toBe('Updated');
    });

    it('should return false when updating non-existent rule', () => {
      const result = service.updateRule('non-existent', { description: 'Test' });
      expect(result).toBe(false);
    });

    it('should delete rule', () => {
      const rule = service.createRule({
        name: 'Delete Test',
        description: 'Test',
        sourceModule: 'HR',
        targetModule: 'HSE',
        triggerEvent: 'test.event',
        enabled: true,
        conditions: [],
        actions: [],
        priority: 50,
      });

      const result = service.deleteRule(rule.id);
      expect(result).toBe(true);

      const deleted = service.getRule(rule.id);
      expect(deleted).toBeUndefined();
    });

    it('should return false when deleting non-existent rule', () => {
      const result = service.deleteRule('non-existent');
      expect(result).toBe(false);
    });

    it('should initialize default rules', () => {
      const rules = service.getAllRules();
      const defaultRuleNames = rules.map(r => r.name);

      expect(defaultRuleNames).toContain('Auto-assign Safety Training');
      expect(defaultRuleNames).toContain('Sync Salary to Payroll');
      expect(defaultRuleNames).toContain('Update Competencies on Course Completion');
    });
  });

  describe('Integration Status', () => {
    it('should return integration status', () => {
      const status = service.getIntegrationStatus();

      expect(status.eventsProcessed).toBeDefined();
      expect(status.pendingEvents).toBeDefined();
      expect(status.activeRules).toBeDefined();
      expect(status.auditEntries).toBeDefined();
      expect(status.modules).toBeDefined();
    });

    it('should list all connected modules', () => {
      const status = service.getIntegrationStatus();

      expect(status.modules.length).toBe(9);
      expect(status.modules.every(m => m.connected)).toBe(true);
    });
  });

  describe('Sample Data Initialization', () => {
    it('should initialize sample freelancers', () => {
      const availabilities = service.getFreelancerAvailability();
      expect(availabilities.length).toBeGreaterThan(0);
    });

    it('should initialize sample metrics', () => {
      const history = service.getMetricsHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });
});
