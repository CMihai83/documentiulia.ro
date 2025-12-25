import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ComplianceCalendarService,
  ComplianceDeadline,
} from './compliance-calendar.service';

describe('ComplianceCalendarService', () => {
  let service: ComplianceCalendarService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const createDeadlineData = {
    title: 'Declarație TVA D300',
    description: 'Depunere lunară declarație TVA la ANAF',
    category: 'tax' as const,
    jurisdiction: 'RO',
    authority: 'ANAF',
    dueDate: new Date('2025-01-25'),
    frequency: 'monthly' as const,
    priority: 'critical' as const,
    reminderDays: [7, 3, 1],
    penalty: { amount: 1000, currency: 'RON', description: 'Penalitate întârziere' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceCalendarService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ComplianceCalendarService>(ComplianceCalendarService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with template deadlines for demo tenant', async () => {
      const deadlines = await service.getDeadlines('tenant_demo');
      expect(deadlines.length).toBeGreaterThan(0);
    });

    it('should include Romanian ANAF deadlines in templates', async () => {
      const deadlines = await service.getDeadlines('tenant_demo');
      const anafDeadlines = deadlines.filter(d => d.authority === 'ANAF');
      expect(anafDeadlines.length).toBeGreaterThan(0);
    });
  });

  describe('Create Deadline', () => {
    it('should create a new deadline', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      expect(deadline).toBeDefined();
      expect(deadline.id).toBeDefined();
      expect(deadline.title).toBe(createDeadlineData.title);
    });

    it('should set initial status to pending', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      expect(deadline.status).toBe('pending');
    });

    it('should set timestamps', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      expect(deadline.createdAt).toBeInstanceOf(Date);
      expect(deadline.updatedAt).toBeInstanceOf(Date);
    });

    it('should emit deadline.created event', async () => {
      await service.createDeadline('tenant_123', createDeadlineData);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'compliance.deadline.created',
        expect.objectContaining({
          tenantId: 'tenant_123',
          deadline: expect.any(Object),
        })
      );
    });

    it('should store penalty information', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      expect(deadline.penalty).toBeDefined();
      expect(deadline.penalty?.amount).toBe(1000);
      expect(deadline.penalty?.currency).toBe('RON');
    });

    it('should support different categories', async () => {
      const categories: Array<ComplianceDeadline['category']> = ['tax', 'financial', 'hr', 'regulatory', 'audit', 'custom'];

      for (const category of categories) {
        const deadline = await service.createDeadline('tenant_123', {
          ...createDeadlineData,
          category,
        });
        expect(deadline.category).toBe(category);
      }
    });

    it('should support different frequencies', async () => {
      const frequencies: Array<ComplianceDeadline['frequency']> = ['one-time', 'monthly', 'quarterly', 'annual', 'custom'];

      for (const frequency of frequencies) {
        const deadline = await service.createDeadline('tenant_123', {
          ...createDeadlineData,
          frequency,
        });
        expect(deadline.frequency).toBe(frequency);
      }
    });

    it('should support assigned users', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        assignedTo: ['user_1', 'user_2'],
      });

      expect(deadline.assignedTo).toEqual(['user_1', 'user_2']);
    });
  });

  describe('Update Deadline', () => {
    it('should update deadline', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      const updated = await service.updateDeadline(deadline.id, {
        title: 'Declarație TVA Actualizată',
      });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Declarație TVA Actualizată');
    });

    it('should update updatedAt timestamp', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);
      const originalUpdatedAt = deadline.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await service.updateDeadline(deadline.id, {
        description: 'Updated description',
      });

      expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should return null for non-existent deadline', async () => {
      const result = await service.updateDeadline('non_existent', {
        title: 'Test',
      });

      expect(result).toBeNull();
    });

    it('should allow updating priority', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      const updated = await service.updateDeadline(deadline.id, {
        priority: 'low',
      });

      expect(updated!.priority).toBe('low');
    });

    it('should allow updating due date', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);
      const newDueDate = new Date('2025-02-28');

      const updated = await service.updateDeadline(deadline.id, {
        dueDate: newDueDate,
      });

      expect(updated!.dueDate).toEqual(newDueDate);
    });
  });

  describe('Complete Deadline', () => {
    it('should complete deadline', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      const completed = await service.completeDeadline(
        deadline.id,
        'user_123',
        'Depus cu succes',
        ['doc_1', 'doc_2']
      );

      expect(completed).toBeDefined();
      expect(completed!.status).toBe('completed');
    });

    it('should set completion details', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      const completed = await service.completeDeadline(
        deadline.id,
        'user_123',
        'Notes here',
        ['doc_1']
      );

      expect(completed!.completedAt).toBeInstanceOf(Date);
      expect(completed!.completedBy).toBe('user_123');
      expect(completed!.notes).toBe('Notes here');
      expect(completed!.documents).toEqual(['doc_1']);
    });

    it('should emit deadline.completed event', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      await service.completeDeadline(deadline.id, 'user_123');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'compliance.deadline.completed',
        expect.objectContaining({
          deadlineId: deadline.id,
          completedBy: 'user_123',
        })
      );
    });

    it('should create next occurrence for recurring deadlines', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        frequency: 'monthly',
      });

      const deadlinesBefore = await service.getDeadlines('tenant_123');

      await service.completeDeadline(deadline.id, 'user_123');

      const deadlinesAfter = await service.getDeadlines('tenant_123');

      expect(deadlinesAfter.length).toBe(deadlinesBefore.length + 1);
    });

    it('should not create next occurrence for one-time deadlines', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        frequency: 'one-time',
      });

      const deadlinesBefore = await service.getDeadlines('tenant_123');

      await service.completeDeadline(deadline.id, 'user_123');

      const deadlinesAfter = await service.getDeadlines('tenant_123');

      expect(deadlinesAfter.length).toBe(deadlinesBefore.length);
    });

    it('should return null for non-existent deadline', async () => {
      const result = await service.completeDeadline('non_existent', 'user_123');

      expect(result).toBeNull();
    });
  });

  describe('Waive Deadline', () => {
    it('should waive deadline', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      const waived = await service.waiveDeadline(
        deadline.id,
        'manager_123',
        'Nu se aplică în acest caz'
      );

      expect(waived).toBeDefined();
      expect(waived!.status).toBe('waived');
    });

    it('should store waiver reason in notes', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      const waived = await service.waiveDeadline(
        deadline.id,
        'manager_123',
        'Company exempt'
      );

      expect(waived!.notes).toContain('manager_123');
      expect(waived!.notes).toContain('Company exempt');
    });

    it('should return null for non-existent deadline', async () => {
      const result = await service.waiveDeadline('non_existent', 'user', 'reason');

      expect(result).toBeNull();
    });
  });

  describe('Get Deadlines', () => {
    beforeEach(async () => {
      // Create multiple deadlines with different properties
      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        title: 'Tax Deadline 1',
        category: 'tax',
        priority: 'critical',
        dueDate: new Date('2025-01-15'),
      });

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        title: 'HR Deadline',
        category: 'hr',
        priority: 'high',
        dueDate: new Date('2025-01-20'),
      });

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        title: 'Tax Deadline 2',
        category: 'tax',
        priority: 'medium',
        dueDate: new Date('2025-02-15'),
      });
    });

    it('should get all deadlines for tenant', async () => {
      const deadlines = await service.getDeadlines('tenant_123');

      expect(deadlines.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by category', async () => {
      const deadlines = await service.getDeadlines('tenant_123', { category: 'tax' });

      expect(deadlines.length).toBeGreaterThanOrEqual(2);
      deadlines.forEach(d => expect(d.category).toBe('tax'));
    });

    it('should filter by priority', async () => {
      const deadlines = await service.getDeadlines('tenant_123', { priority: 'critical' });

      deadlines.forEach(d => expect(d.priority).toBe('critical'));
    });

    it('should filter by status', async () => {
      const deadlines = await service.getDeadlines('tenant_123', { status: 'pending' });

      deadlines.forEach(d => expect(d.status).toBe('pending'));
    });

    it('should filter by date range', async () => {
      const deadlines = await service.getDeadlines('tenant_123', {
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      deadlines.forEach(d => {
        expect(d.dueDate.getTime()).toBeGreaterThanOrEqual(new Date('2025-01-01').getTime());
        expect(d.dueDate.getTime()).toBeLessThanOrEqual(new Date('2025-01-31').getTime());
      });
    });

    it('should sort by due date', async () => {
      const deadlines = await service.getDeadlines('tenant_123');

      for (let i = 1; i < deadlines.length; i++) {
        expect(deadlines[i].dueDate.getTime()).toBeGreaterThanOrEqual(
          deadlines[i - 1].dueDate.getTime()
        );
      }
    });

    it('should not return deadlines from other tenants', async () => {
      const deadlines = await service.getDeadlines('other_tenant');

      const tenant123Deadlines = deadlines.filter(d => d.tenantId === 'tenant_123');
      expect(tenant123Deadlines.length).toBe(0);
    });
  });

  describe('Get Upcoming Deadlines', () => {
    it('should get upcoming deadlines within specified days', async () => {
      // Create a deadline in the near future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        dueDate: futureDate,
      });

      const upcoming = await service.getUpcomingDeadlines('tenant_123', 7);

      const found = upcoming.find(d => d.title === createDeadlineData.title);
      expect(found).toBeDefined();
    });

    it('should default to 30 days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 25);

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        dueDate: futureDate,
      });

      const upcoming = await service.getUpcomingDeadlines('tenant_123');

      expect(upcoming.length).toBeGreaterThan(0);
    });

    it('should only return pending deadlines', async () => {
      const upcoming = await service.getUpcomingDeadlines('tenant_123');

      upcoming.forEach(d => expect(d.status).toBe('pending'));
    });
  });

  describe('Get Overdue Deadlines', () => {
    it('should get overdue deadlines', async () => {
      // Create an overdue deadline
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        dueDate: pastDate,
      });

      const overdue = await service.getOverdueDeadlines('tenant_123');

      expect(overdue.length).toBeGreaterThan(0);
      overdue.forEach(d => {
        expect(d.dueDate.getTime()).toBeLessThan(Date.now());
      });
    });

    it('should only return pending deadlines as overdue', async () => {
      const overdue = await service.getOverdueDeadlines('tenant_123');

      overdue.forEach(d => expect(d.status).toBe('pending'));
    });
  });

  describe('Calendar Stats', () => {
    beforeEach(async () => {
      // Create diverse deadlines for stats
      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        category: 'tax',
        priority: 'critical',
      });

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        category: 'hr',
        priority: 'high',
      });

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        category: 'tax',
        priority: 'medium',
      });
    });

    it('should return calendar statistics', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats).toBeDefined();
      expect(stats.totalDeadlines).toBeGreaterThan(0);
    });

    it('should include category breakdown', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats.byCategory).toBeDefined();
      expect(stats.byCategory.tax).toBeGreaterThanOrEqual(2);
    });

    it('should include priority breakdown', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats.byPriority).toBeDefined();
    });

    it('should calculate compliance score', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats.complianceScore).toBeDefined();
      expect(stats.complianceScore).toBeLessThanOrEqual(100);
      expect(stats.complianceScore).toBeGreaterThanOrEqual(0);
    });

    it('should track pending deadlines', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats.pendingDeadlines).toBeGreaterThanOrEqual(0);
    });

    it('should track overdue deadlines', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats.overdueDeadlines).toBeGreaterThanOrEqual(0);
    });

    it('should track upcoming deadlines this week', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats.upcomingThisWeek).toBeGreaterThanOrEqual(0);
    });

    it('should track upcoming deadlines this month', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats.upcomingThisMonth).toBeGreaterThanOrEqual(0);
    });

    it('should track completed this month', async () => {
      const stats = await service.getCalendarStats('tenant_123');

      expect(stats.completedThisMonth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Calendar View', () => {
    it('should return deadlines grouped by day', async () => {
      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        dueDate: new Date('2025-01-15'),
      });

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        title: 'Another Deadline',
        dueDate: new Date('2025-01-15'),
      });

      const view = await service.getCalendarView('tenant_123', 2025, 1);

      expect(view).toBeDefined();
      expect(view[15]).toBeDefined();
      expect(view[15].length).toBeGreaterThanOrEqual(2);
    });

    it('should only include deadlines for specified month', async () => {
      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        dueDate: new Date('2025-02-15'),
      });

      const view = await service.getCalendarView('tenant_123', 2025, 1);

      // Day 15 of February should not be in January view
      const allDeadlines = Object.values(view).flat();
      allDeadlines.forEach(d => {
        expect(d.dueDate.getMonth()).toBe(0); // January = 0
      });
    });
  });

  describe('Process Reminders', () => {
    it('should process reminders without errors', async () => {
      await service.createDeadline('tenant_123', createDeadlineData);

      await expect(service.processReminders()).resolves.not.toThrow();
    });

    it('should emit reminder events for due reminders', async () => {
      // Create deadline with reminder due today
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        reminderDays: [1], // Reminder 1 day before = today
      });

      await service.processReminders();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'compliance.reminder',
        expect.objectContaining({
          deadlineId: deadline.id,
        })
      );
    });
  });

  describe('Check Overdue Deadlines', () => {
    it('should mark overdue deadlines', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        dueDate: pastDate,
      });

      await service.checkOverdueDeadlines();

      const deadlines = await service.getDeadlines('tenant_123');
      const updated = deadlines.find(d => d.id === deadline.id);

      expect(updated?.status).toBe('overdue');
    });

    it('should emit overdue event', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        dueDate: pastDate,
      });

      await service.checkOverdueDeadlines();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'compliance.deadline.overdue',
        expect.any(Object)
      );
    });
  });

  describe('Import Templates', () => {
    it('should import Romanian templates', async () => {
      const imported = await service.importTemplates('new_tenant', 'RO');

      expect(imported).toBeGreaterThan(0);
    });

    it('should create deadlines from templates', async () => {
      await service.importTemplates('import_tenant', 'RO');

      const deadlines = await service.getDeadlines('import_tenant');

      expect(deadlines.length).toBeGreaterThan(0);
    });

    it('should return 0 for unknown jurisdictions', async () => {
      const imported = await service.importTemplates('tenant_123', 'UNKNOWN');

      expect(imported).toBe(0);
    });

    it('should include ANAF deadlines for Romanian templates', async () => {
      await service.importTemplates('ro_tenant', 'RO');

      const deadlines = await service.getDeadlines('ro_tenant');
      const anafDeadlines = deadlines.filter(d => d.authority === 'ANAF');

      expect(anafDeadlines.length).toBeGreaterThan(0);
    });
  });

  describe('Export Calendar', () => {
    beforeEach(async () => {
      await service.createDeadline('tenant_123', createDeadlineData);
    });

    it('should export as JSON', async () => {
      const exported = await service.exportCalendar('tenant_123', 'json');

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(parsed.deadlines).toBeDefined();
    });

    it('should export as iCal format', async () => {
      const exported = await service.exportCalendar('tenant_123', 'ical');

      expect(exported).toContain('BEGIN:VCALENDAR');
      expect(exported).toContain('END:VCALENDAR');
      expect(exported).toContain('BEGIN:VEVENT');
      expect(exported).toContain('END:VEVENT');
    });

    it('should include deadline title in iCal', async () => {
      const exported = await service.exportCalendar('tenant_123', 'ical');

      expect(exported).toContain('SUMMARY:');
    });

    it('should include deadline category in iCal', async () => {
      const exported = await service.exportCalendar('tenant_123', 'ical');

      expect(exported).toContain('CATEGORIES:');
    });

    it('should set priority in iCal based on deadline priority', async () => {
      const exported = await service.exportCalendar('tenant_123', 'ical');

      expect(exported).toContain('PRIORITY:');
    });
  });

  describe('Romanian Compliance Templates', () => {
    it('should include VAT D300 deadline', async () => {
      const deadlines = await service.getDeadlines('tenant_demo');

      const vatDeadline = deadlines.find(d => d.title.includes('VAT') || d.title.includes('D300'));
      expect(vatDeadline).toBeDefined();
    });

    it('should include SAF-T D406 deadline', async () => {
      const deadlines = await service.getDeadlines('tenant_demo');

      const saftDeadline = deadlines.find(d => d.title.includes('SAF-T') || d.title.includes('D406'));
      expect(saftDeadline).toBeDefined();
    });

    it('should include e-Factura deadline', async () => {
      const deadlines = await service.getDeadlines('tenant_demo');

      const efacturaDeadline = deadlines.find(d => d.title.includes('e-Factura'));
      expect(efacturaDeadline).toBeDefined();
    });

    it('should include D112 payroll deadline', async () => {
      const deadlines = await service.getDeadlines('tenant_demo');

      const d112Deadline = deadlines.find(d => d.title.includes('D112'));
      expect(d112Deadline).toBeDefined();
    });

    it('should include GDPR compliance deadline', async () => {
      const deadlines = await service.getDeadlines('tenant_demo');

      const gdprDeadline = deadlines.find(d => d.title.includes('GDPR'));
      expect(gdprDeadline).toBeDefined();
    });

    it('should set ANAF deadlines with RON penalties', async () => {
      const deadlines = await service.getDeadlines('tenant_demo');

      const anafWithPenalty = deadlines.find(d =>
        d.authority === 'ANAF' && d.penalty?.currency === 'RON'
      );
      expect(anafWithPenalty).toBeDefined();
    });
  });

  describe('Deadline Frequencies', () => {
    it('should calculate monthly due date correctly', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        frequency: 'monthly',
        dueDate: new Date('2025-01-25'),
      });

      // Complete and check next occurrence
      await service.completeDeadline(deadline.id, 'user_123');

      const deadlines = await service.getDeadlines('tenant_123');
      const nextOccurrence = deadlines.find(
        d => d.title === deadline.title && d.id !== deadline.id
      );

      expect(nextOccurrence).toBeDefined();
      expect(nextOccurrence!.dueDate.getMonth()).toBe(1); // February
    });

    it('should calculate quarterly due date correctly', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        frequency: 'quarterly',
        dueDate: new Date('2025-01-15'),
      });

      await service.completeDeadline(deadline.id, 'user_123');

      const deadlines = await service.getDeadlines('tenant_123');
      const nextOccurrence = deadlines.find(
        d => d.title === deadline.title && d.id !== deadline.id
      );

      expect(nextOccurrence).toBeDefined();
    });

    it('should calculate annual due date correctly', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        frequency: 'annual',
        dueDate: new Date('2025-03-31'),
      });

      await service.completeDeadline(deadline.id, 'user_123');

      const deadlines = await service.getDeadlines('tenant_123');
      const nextOccurrence = deadlines.find(
        d => d.title === deadline.title && d.id !== deadline.id
      );

      expect(nextOccurrence).toBeDefined();
      // Next occurrence should be in the following year
      expect(nextOccurrence!.dueDate.getFullYear()).toBeGreaterThanOrEqual(2026);
    });
  });

  describe('Linked Deadlines', () => {
    it('should support linked deadlines', async () => {
      const deadline1 = await service.createDeadline('tenant_123', createDeadlineData);

      const deadline2 = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        title: 'Related Deadline',
        linkedDeadlines: [deadline1.id],
      });

      expect(deadline2.linkedDeadlines).toContain(deadline1.id);
    });
  });

  describe('Metadata', () => {
    it('should support custom metadata', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        metadata: {
          formNumber: 'D300',
          submissionMethod: 'SPV',
          requiresSignature: true,
        },
      });

      expect(deadline.metadata).toBeDefined();
      expect(deadline.metadata?.formNumber).toBe('D300');
    });
  });

  describe('Priority Levels', () => {
    it('should support low priority', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        priority: 'low',
      });

      expect(deadline.priority).toBe('low');
    });

    it('should support medium priority', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        priority: 'medium',
      });

      expect(deadline.priority).toBe('medium');
    });

    it('should support high priority', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        priority: 'high',
      });

      expect(deadline.priority).toBe('high');
    });

    it('should support critical priority', async () => {
      const deadline = await service.createDeadline('tenant_123', {
        ...createDeadlineData,
        priority: 'critical',
      });

      expect(deadline.priority).toBe('critical');
    });
  });

  describe('Document Attachments', () => {
    it('should support document attachments on completion', async () => {
      const deadline = await service.createDeadline('tenant_123', createDeadlineData);

      const completed = await service.completeDeadline(
        deadline.id,
        'user_123',
        'Completed with attachments',
        ['doc_vat_return.pdf', 'proof_of_payment.pdf']
      );

      expect(completed!.documents).toBeDefined();
      expect(completed!.documents!.length).toBe(2);
    });
  });

  describe('Compliance Score', () => {
    it('should decrease score with overdue deadlines', async () => {
      const statsClean = await service.getCalendarStats('clean_tenant');

      // Create an overdue deadline
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      await service.createDeadline('overdue_tenant', {
        ...createDeadlineData,
        dueDate: pastDate,
      });

      const statsOverdue = await service.getCalendarStats('overdue_tenant');

      // Score should be lower when there are overdue items
      expect(statsOverdue.complianceScore).toBeLessThan(100);
    });

    it('should cap score at 100', async () => {
      const stats = await service.getCalendarStats('perfect_tenant');

      expect(stats.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should floor score at 0', async () => {
      // Create many overdue deadlines
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      for (let i = 0; i < 15; i++) {
        await service.createDeadline('bad_tenant', {
          ...createDeadlineData,
          title: `Overdue ${i}`,
          dueDate: pastDate,
        });
      }

      const stats = await service.getCalendarStats('bad_tenant');

      expect(stats.complianceScore).toBeGreaterThanOrEqual(0);
    });
  });
});
