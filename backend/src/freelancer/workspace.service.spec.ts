import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    service.resetState();
  });

  describe('Workspace Management', () => {
    it('should create a workspace with default settings', async () => {
      const workspace = await service.createWorkspace({
        name: 'Test Project Workspace',
        description: 'Workspace for testing',
        projectId: 'proj-123',
        ownerId: 'owner-123',
        ownerType: 'CLIENT',
      });

      expect(workspace).toBeDefined();
      expect(workspace.id).toMatch(/^ws-/);
      expect(workspace.name).toBe('Test Project Workspace');
      expect(workspace.status).toBe('ACTIVE');
      expect(workspace.members).toHaveLength(1);
      expect(workspace.members[0].role).toBe('OWNER');
      expect(workspace.settings.requireScreenshots).toBe(true);
      expect(workspace.settings.maxWeeklyHours).toBe(48);
    });

    it('should create a workspace with custom settings', async () => {
      const workspace = await service.createWorkspace({
        name: 'Custom Workspace',
        description: 'With custom settings',
        projectId: 'proj-456',
        ownerId: 'owner-456',
        ownerType: 'AGENCY',
        settings: {
          requireScreenshots: false,
          screenshotInterval: 15,
          maxDailyHours: 8,
        },
      });

      expect(workspace.settings.requireScreenshots).toBe(false);
      expect(workspace.settings.screenshotInterval).toBe(15);
      expect(workspace.settings.maxDailyHours).toBe(8);
      expect(workspace.settings.requireManualApproval).toBe(true); // default
    });

    it('should get a workspace by ID', async () => {
      const created = await service.createWorkspace({
        name: 'Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });

      const found = await service.getWorkspace(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should return null for non-existent workspace', async () => {
      const found = await service.getWorkspace('non-existent');
      expect(found).toBeNull();
    });

    it('should update workspace', async () => {
      const workspace = await service.createWorkspace({
        name: 'Original',
        description: 'Original desc',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });

      const updated = await service.updateWorkspace(workspace.id, {
        name: 'Updated Name',
        status: 'PAUSED',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.status).toBe('PAUSED');
    });

    it('should add a member to workspace', async () => {
      const workspace = await service.createWorkspace({
        name: 'Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });

      const updated = await service.addWorkspaceMember(
        workspace.id,
        'freelancer-1',
        'MEMBER',
        50,
        'EUR'
      );

      expect(updated.members).toHaveLength(2);
      const member = updated.members.find(m => m.userId === 'freelancer-1');
      expect(member).toBeDefined();
      expect(member!.role).toBe('MEMBER');
      expect(member!.hourlyRate).toBe(50);
      expect(member!.permissions.canTrackTime).toBe(true);
      expect(member!.permissions.canApproveTime).toBe(false);
    });

    it('should not add duplicate member', async () => {
      const workspace = await service.createWorkspace({
        name: 'Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });

      await expect(
        service.addWorkspaceMember(workspace.id, 'owner-1', 'ADMIN')
      ).rejects.toThrow('User is already a member');
    });

    it('should remove a member from workspace', async () => {
      const workspace = await service.createWorkspace({
        name: 'Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });

      await service.addWorkspaceMember(workspace.id, 'freelancer-1', 'MEMBER');
      const updated = await service.removeWorkspaceMember(workspace.id, 'freelancer-1');

      expect(updated.members).toHaveLength(1);
      expect(updated.members[0].userId).toBe('owner-1');
    });

    it('should not remove workspace owner', async () => {
      const workspace = await service.createWorkspace({
        name: 'Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });

      await expect(
        service.removeWorkspaceMember(workspace.id, 'owner-1')
      ).rejects.toThrow('Cannot remove workspace owner');
    });
  });

  describe('Time Tracking', () => {
    let workspaceId: string;

    beforeEach(async () => {
      const workspace = await service.createWorkspace({
        name: 'Time Tracking Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });
      workspaceId = workspace.id;
      await service.addWorkspaceMember(workspaceId, 'freelancer-1', 'MEMBER', 50, 'EUR');
    });

    it('should start time tracking', async () => {
      const entry = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Working on feature X',
        hourlyRate: 50,
        currency: 'EUR',
      });

      expect(entry).toBeDefined();
      expect(entry.id).toMatch(/^te-/);
      expect(entry.status).toBe('TRACKING');
      expect(entry.startTime).toBeInstanceOf(Date);
      expect(entry.duration).toBe(0);
    });

    it('should not start duplicate tracking session', async () => {
      await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'First session',
        hourlyRate: 50,
        currency: 'EUR',
      });

      await expect(
        service.startTimeTracking({
          workspaceId,
          userId: 'freelancer-1',
          description: 'Second session',
          hourlyRate: 50,
          currency: 'EUR',
        })
      ).rejects.toThrow('User already has an active time tracking session');
    });

    it('should pause and resume time tracking', async () => {
      const entry = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Test task',
        hourlyRate: 50,
        currency: 'EUR',
      });

      const paused = await service.pauseTimeTracking(entry.id);
      expect(paused.status).toBe('PAUSED');

      const resumed = await service.resumeTimeTracking(paused.id);
      expect(resumed.status).toBe('TRACKING');
    });

    it('should stop time tracking and calculate amount', async () => {
      const entry = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Test task',
        hourlyRate: 60,
        currency: 'EUR',
      });

      // Simulate some time passing by manipulating startTime
      const modifiedEntry = await service.getTimeEntry(entry.id);
      if (modifiedEntry) {
        modifiedEntry.startTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      }

      const stopped = await service.stopTimeTracking(entry.id);
      expect(stopped.status).toBe('COMPLETED');
      expect(stopped.endTime).toBeInstanceOf(Date);
      expect(stopped.duration).toBeGreaterThan(0);
      expect(stopped.amount).toBeGreaterThan(0);
    });

    it('should add screenshot to time entry', async () => {
      const entry = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Test task',
        hourlyRate: 50,
        currency: 'EUR',
      });

      const updated = await service.addScreenshot(entry.id, {
        timestamp: new Date(),
        url: 'https://storage.example.com/screenshot-1.png',
        activityLevel: 85,
        blurred: false,
        flagged: false,
      });

      expect(updated.screenshots).toHaveLength(1);
      expect(updated.screenshots[0].activityLevel).toBe(85);
      expect(updated.activityLevel).toBe(85);
    });

    it('should approve time entry', async () => {
      const entry = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Test task',
        hourlyRate: 50,
        currency: 'EUR',
      });

      await service.stopTimeTracking(entry.id);
      const approved = await service.approveTimeEntry(entry.id, 'owner-1');

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe('owner-1');
      expect(approved.approvedAt).toBeInstanceOf(Date);
    });

    it('should reject time entry with reason', async () => {
      const entry = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Test task',
        hourlyRate: 50,
        currency: 'EUR',
      });

      await service.stopTimeTracking(entry.id);
      const rejected = await service.rejectTimeEntry(entry.id, 'Insufficient documentation');

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejectionReason).toBe('Insufficient documentation');
    });

    it('should create manual time entry', async () => {
      const startTime = new Date('2025-12-10T09:00:00Z');
      const endTime = new Date('2025-12-10T12:00:00Z');

      const entry = await service.createManualTimeEntry({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Manual entry for meeting',
        startTime,
        endTime,
        hourlyRate: 50,
        currency: 'EUR',
        notes: 'Client meeting',
      });

      expect(entry.duration).toBe(180); // 3 hours in minutes
      expect(entry.amount).toBe(150); // 3 hours * 50 EUR
      expect(entry.notes).toBe('Client meeting');
    });

    it('should filter time entries by various criteria', async () => {
      await service.addWorkspaceMember(workspaceId, 'freelancer-2', 'MEMBER', 60, 'EUR');

      // Create entries for different users
      const entry1 = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Task 1',
        hourlyRate: 50,
        currency: 'EUR',
      });
      await service.stopTimeTracking(entry1.id);

      const entry2 = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-2',
        description: 'Task 2',
        hourlyRate: 60,
        currency: 'EUR',
      });
      await service.stopTimeTracking(entry2.id);
      await service.approveTimeEntry(entry2.id, 'owner-1');

      const allEntries = await service.getTimeEntriesForWorkspace(workspaceId);
      expect(allEntries).toHaveLength(2);

      const user1Entries = await service.getTimeEntriesForWorkspace(workspaceId, {
        userId: 'freelancer-1',
      });
      expect(user1Entries).toHaveLength(1);

      const approvedEntries = await service.getTimeEntriesForWorkspace(workspaceId, {
        status: 'APPROVED',
      });
      expect(approvedEntries).toHaveLength(1);
    });
  });

  describe('Task Management', () => {
    let workspaceId: string;

    beforeEach(async () => {
      const workspace = await service.createWorkspace({
        name: 'Task Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });
      workspaceId = workspace.id;
    });

    it('should create a task', async () => {
      const task = await service.createTask({
        workspaceId,
        title: 'Implement feature X',
        description: 'Build the new feature',
        priority: 'HIGH',
        estimatedHours: 8,
        createdBy: 'owner-1',
        tags: ['feature', 'frontend'],
      });

      expect(task).toBeDefined();
      expect(task.id).toMatch(/^task-/);
      expect(task.title).toBe('Implement feature X');
      expect(task.status).toBe('TODO');
      expect(task.priority).toBe('HIGH');
      expect(task.trackedHours).toBe(0);
      expect(task.tags).toContain('feature');
    });

    it('should update task status and mark completion', async () => {
      const task = await service.createTask({
        workspaceId,
        title: 'Test task',
        priority: 'MEDIUM',
        createdBy: 'owner-1',
      });

      const updated = await service.updateTask(task.id, {
        status: 'COMPLETED',
      });

      expect(updated.status).toBe('COMPLETED');
      expect(updated.completedAt).toBeInstanceOf(Date);
    });

    it('should filter tasks by status, assignee, and priority', async () => {
      await service.addWorkspaceMember(workspaceId, 'dev-1', 'MEMBER');

      await service.createTask({
        workspaceId,
        title: 'Task 1',
        priority: 'HIGH',
        assigneeId: 'dev-1',
        createdBy: 'owner-1',
      });

      const task2 = await service.createTask({
        workspaceId,
        title: 'Task 2',
        priority: 'LOW',
        createdBy: 'owner-1',
      });
      await service.updateTask(task2.id, { status: 'COMPLETED' });

      await service.createTask({
        workspaceId,
        title: 'Task 3',
        priority: 'HIGH',
        createdBy: 'owner-1',
      });

      const highPriority = await service.getTasksForWorkspace(workspaceId, {
        priority: 'HIGH',
      });
      expect(highPriority).toHaveLength(2);

      const completed = await service.getTasksForWorkspace(workspaceId, {
        status: 'COMPLETED',
      });
      expect(completed).toHaveLength(1);

      const assignedTasks = await service.getTasksForWorkspace(workspaceId, {
        assigneeId: 'dev-1',
      });
      expect(assignedTasks).toHaveLength(1);
    });

    it('should add attachment to task', async () => {
      const task = await service.createTask({
        workspaceId,
        title: 'Task with attachments',
        priority: 'MEDIUM',
        createdBy: 'owner-1',
      });

      const updated = await service.addTaskAttachment(task.id, {
        filename: 'design.pdf',
        url: 'https://storage.example.com/design.pdf',
        size: 1024000,
        mimeType: 'application/pdf',
        uploadedBy: 'owner-1',
        uploadedAt: new Date(),
      });

      expect(updated.attachments).toHaveLength(1);
      expect(updated.attachments[0].filename).toBe('design.pdf');
    });
  });

  describe('NDA Management', () => {
    let workspaceId: string;

    beforeEach(async () => {
      const workspace = await service.createWorkspace({
        name: 'NDA Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });
      workspaceId = workspace.id;
    });

    it('should generate NDA document', async () => {
      const nda = await service.generateNDA({
        workspaceId,
        templateType: 'MUTUAL',
        parties: [
          { type: 'MUTUAL', name: 'Client Corp', email: 'client@corp.com', company: 'Client Corp SRL' },
          { type: 'MUTUAL', name: 'Freelancer', email: 'freelancer@email.com' },
        ],
        confidentialityPeriod: 5,
        governingLaw: 'Romanian Law',
      });

      expect(nda).toBeDefined();
      expect(nda.id).toMatch(/^nda-/);
      expect(nda.templateType).toBe('MUTUAL');
      expect(nda.status).toBe('DRAFT');
      expect(nda.parties).toHaveLength(2);
      expect(nda.confidentialityPeriod).toBe(5);
      expect(nda.content).toContain('MUTUAL NON-DISCLOSURE AGREEMENT');
    });

    it('should send NDA for signature', async () => {
      const nda = await service.generateNDA({
        workspaceId,
        templateType: 'STANDARD',
        parties: [
          { type: 'DISCLOSER', name: 'Client', email: 'client@email.com' },
          { type: 'RECIPIENT', name: 'Freelancer', email: 'freelancer@email.com' },
        ],
      });

      const sent = await service.sendNDAForSignature(nda.id);
      expect(sent.status).toBe('PENDING_SIGNATURES');
    });

    it('should sign NDA and update status', async () => {
      const nda = await service.generateNDA({
        workspaceId,
        templateType: 'MUTUAL',
        parties: [
          { type: 'MUTUAL', name: 'Client', email: 'client@email.com' },
          { type: 'MUTUAL', name: 'Freelancer', email: 'freelancer@email.com' },
        ],
      });

      await service.sendNDAForSignature(nda.id);

      // First signature
      const partialSigned = await service.signNDA(
        nda.id,
        'client@email.com',
        'signature-hash-1',
        '192.168.1.1'
      );
      expect(partialSigned.status).toBe('PARTIALLY_SIGNED');
      expect(partialSigned.parties[0].signedAt).toBeInstanceOf(Date);

      // Second signature
      const fullySigned = await service.signNDA(
        nda.id,
        'freelancer@email.com',
        'signature-hash-2',
        '192.168.1.2'
      );
      expect(fullySigned.status).toBe('FULLY_EXECUTED');
      expect(fullySigned.executedAt).toBeInstanceOf(Date);
    });

    it('should not allow duplicate signature', async () => {
      const nda = await service.generateNDA({
        workspaceId,
        templateType: 'STANDARD',
        parties: [
          { type: 'DISCLOSER', name: 'Client', email: 'client@email.com' },
        ],
      });

      await service.sendNDAForSignature(nda.id);
      await service.signNDA(nda.id, 'client@email.com', 'signature-hash');

      await expect(
        service.signNDA(nda.id, 'client@email.com', 'signature-hash-2')
      ).rejects.toThrow('Party has already signed');
    });

    it('should get NDAs for workspace', async () => {
      await service.generateNDA({
        workspaceId,
        templateType: 'STANDARD',
        parties: [{ type: 'DISCLOSER', name: 'Client', email: 'client@email.com' }],
      });

      await service.generateNDA({
        workspaceId,
        templateType: 'MUTUAL',
        parties: [
          { type: 'MUTUAL', name: 'Client', email: 'client@email.com' },
          { type: 'MUTUAL', name: 'Freelancer', email: 'freelancer@email.com' },
        ],
      });

      const ndas = await service.getNDAsForWorkspace(workspaceId);
      expect(ndas).toHaveLength(2);
    });
  });

  describe('IP Agreement Management', () => {
    let workspaceId: string;

    beforeEach(async () => {
      const workspace = await service.createWorkspace({
        name: 'IP Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });
      workspaceId = workspace.id;
    });

    it('should create work-for-hire IP agreement', async () => {
      const agreement = await service.createIPAgreement({
        workspaceId,
        type: 'WORK_FOR_HIRE',
        ownership: 'CLIENT',
        scope: 'All software code, designs, and documentation created during the project',
        parties: [
          { role: 'CREATOR', name: 'Freelancer', email: 'freelancer@email.com' },
          { role: 'ASSIGNEE', name: 'Client Corp', email: 'client@corp.com', company: 'Client Corp SRL' },
        ],
      });

      expect(agreement).toBeDefined();
      expect(agreement.id).toMatch(/^ip-/);
      expect(agreement.type).toBe('WORK_FOR_HIRE');
      expect(agreement.ownership).toBe('CLIENT');
      expect(agreement.status).toBe('DRAFT');
    });

    it('should create license IP agreement with rights', async () => {
      const agreement = await service.createIPAgreement({
        workspaceId,
        type: 'LICENSE',
        ownership: 'FREELANCER',
        scope: 'UI/UX designs and mockups',
        licensedRights: {
          commercial: true,
          modification: true,
          distribution: false,
          sublicensing: false,
          territory: 'WORLDWIDE',
          duration: 'PERPETUAL',
        },
        parties: [
          { role: 'LICENSOR', name: 'Designer', email: 'designer@email.com' },
          { role: 'LICENSEE', name: 'Client', email: 'client@email.com' },
        ],
      });

      expect(agreement.licensedRights).toBeDefined();
      expect(agreement.licensedRights!.commercial).toBe(true);
      expect(agreement.licensedRights!.territory).toBe('WORLDWIDE');
    });

    it('should acknowledge IP agreement', async () => {
      const agreement = await service.createIPAgreement({
        workspaceId,
        type: 'WORK_FOR_HIRE',
        ownership: 'CLIENT',
        scope: 'All work',
        parties: [
          { role: 'CREATOR', name: 'Freelancer', email: 'freelancer@email.com' },
          { role: 'ASSIGNEE', name: 'Client', email: 'client@email.com' },
        ],
      });

      // First acknowledgment
      let updated = await service.acknowledgeIPAgreement(agreement.id, 'freelancer@email.com');
      expect(updated.parties[0].acknowledgedAt).toBeInstanceOf(Date);
      expect(updated.status).toBe('DRAFT');

      // Second acknowledgment
      updated = await service.acknowledgeIPAgreement(agreement.id, 'client@email.com');
      expect(updated.status).toBe('ACTIVE');
    });
  });

  describe('Activity Feed', () => {
    it('should track activity across workspace actions', async () => {
      const workspace = await service.createWorkspace({
        name: 'Activity Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });

      await service.addWorkspaceMember(workspace.id, 'freelancer-1', 'MEMBER', 50, 'EUR');

      await service.createTask({
        workspaceId: workspace.id,
        title: 'Test Task',
        priority: 'HIGH',
        createdBy: 'owner-1',
      });

      const feed = await service.getActivityFeed(workspace.id);
      expect(feed.length).toBeGreaterThanOrEqual(3);

      const types = feed.map(f => f.type);
      expect(types).toContain('WORKSPACE_UPDATED');
      expect(types).toContain('MEMBER_JOINED');
      expect(types).toContain('TASK_CREATED');
    });

    it('should limit activity feed results', async () => {
      const workspace = await service.createWorkspace({
        name: 'Feed Limit Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
      });

      // Create multiple tasks to generate activity
      for (let i = 0; i < 10; i++) {
        await service.createTask({
          workspaceId: workspace.id,
          title: `Task ${i}`,
          priority: 'LOW',
          createdBy: 'owner-1',
        });
      }

      const limitedFeed = await service.getActivityFeed(workspace.id, 5);
      expect(limitedFeed).toHaveLength(5);
    });
  });

  describe('Invoicing', () => {
    let workspaceId: string;

    beforeEach(async () => {
      const workspace = await service.createWorkspace({
        name: 'Invoice Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'client-1',
        ownerType: 'CLIENT',
        settings: {
          requireManualApproval: true,
        },
      });
      workspaceId = workspace.id;
      await service.addWorkspaceMember(workspaceId, 'freelancer-1', 'MEMBER', 50, 'EUR');
    });

    it('should generate invoice from approved time entries', async () => {
      // Create and approve time entries
      const entry1 = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Task 1',
        hourlyRate: 50,
        currency: 'EUR',
      });
      await service.stopTimeTracking(entry1.id);
      await service.approveTimeEntry(entry1.id, 'client-1');

      const entry2 = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Task 2',
        hourlyRate: 50,
        currency: 'EUR',
      });
      await service.stopTimeTracking(entry2.id);
      await service.approveTimeEntry(entry2.id, 'client-1');

      const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const invoice = await service.generateInvoiceFromTimeEntries({
        workspaceId,
        freelancerId: 'freelancer-1',
        clientId: 'client-1',
        periodStart,
        periodEnd,
        vatRate: 19,
      });

      expect(invoice).toBeDefined();
      expect(invoice.id).toMatch(/^winv-/);
      expect(invoice.invoiceNumber).toMatch(/^WS-\d{4}-\d{5}$/);
      expect(invoice.timeEntries).toHaveLength(2);
      expect(invoice.vatRate).toBe(19);
      expect(invoice.status).toBe('DRAFT');
    });

    it('should throw error if no approved entries found', async () => {
      const periodStart = new Date();
      const periodEnd = new Date();

      await expect(
        service.generateInvoiceFromTimeEntries({
          workspaceId,
          freelancerId: 'freelancer-1',
          clientId: 'client-1',
          periodStart,
          periodEnd,
        })
      ).rejects.toThrow('No approved time entries found for the period');
    });

    it('should update invoice status', async () => {
      // Create approved entry first
      const entry = await service.startTimeTracking({
        workspaceId,
        userId: 'freelancer-1',
        description: 'Work',
        hourlyRate: 50,
        currency: 'EUR',
      });
      await service.stopTimeTracking(entry.id);
      await service.approveTimeEntry(entry.id, 'client-1');

      const invoice = await service.generateInvoiceFromTimeEntries({
        workspaceId,
        freelancerId: 'freelancer-1',
        clientId: 'client-1',
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const updated = await service.updateInvoiceStatus(
        invoice.id,
        'PAID',
        'efactura-123'
      );

      expect(updated.status).toBe('PAID');
      expect(updated.paidAt).toBeInstanceOf(Date);
      expect(updated.eFacturaId).toBe('efactura-123');
    });
  });

  describe('Time Reports', () => {
    let workspaceId: string;

    beforeEach(async () => {
      const workspace = await service.createWorkspace({
        name: 'Report Test',
        description: 'Test',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        ownerType: 'CLIENT',
        settings: { requireManualApproval: false },
      });
      workspaceId = workspace.id;
      await service.addWorkspaceMember(workspaceId, 'dev-1', 'MEMBER', 50, 'EUR');
      await service.addWorkspaceMember(workspaceId, 'dev-2', 'MEMBER', 60, 'EUR');
    });

    it('should generate comprehensive time report', async () => {
      // Create task
      const task = await service.createTask({
        workspaceId,
        title: 'Test Task',
        priority: 'HIGH',
        estimatedHours: 10,
        assigneeId: 'dev-1',
        createdBy: 'owner-1',
      });

      // Create time entries
      const entry1 = await service.startTimeTracking({
        workspaceId,
        userId: 'dev-1',
        taskId: task.id,
        description: 'Working on task',
        hourlyRate: 50,
        currency: 'EUR',
      });
      await service.stopTimeTracking(entry1.id);
      await service.approveTimeEntry(entry1.id, 'owner-1');

      const entry2 = await service.startTimeTracking({
        workspaceId,
        userId: 'dev-2',
        description: 'General work',
        hourlyRate: 60,
        currency: 'EUR',
      });
      await service.stopTimeTracking(entry2.id);

      const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const report = await service.generateTimeReport(workspaceId, periodStart, periodEnd);

      expect(report).toBeDefined();
      expect(report.workspaceId).toBe(workspaceId);
      expect(report.totalHours).toBeGreaterThanOrEqual(0);
      expect(report.byMember.length).toBeGreaterThanOrEqual(0);
      expect(report.byTask).toBeDefined();
      expect(report.byDay).toBeDefined();
    });
  });

  describe('Reference Data', () => {
    it('should return default workspace settings', () => {
      const settings = service.getDefaultWorkspaceSettings();

      expect(settings.requireScreenshots).toBe(true);
      expect(settings.screenshotInterval).toBe(10);
      expect(settings.maxWeeklyHours).toBe(48);
      expect(settings.ipClauseType).toBe('CLIENT_OWNS_ALL');
    });

    it('should return IP agreement types', () => {
      const types = service.getIPAgreementTypes();

      expect(types.length).toBe(5);
      expect(types.map(t => t.type)).toContain('WORK_FOR_HIRE');
      expect(types.map(t => t.type)).toContain('LICENSE');
      expect(types.map(t => t.type)).toContain('JOINT_OWNERSHIP');
    });

    it('should return NDA template types', () => {
      const types = service.getNDATemplateTypes();

      expect(types.length).toBe(4);
      expect(types.map(t => t.type)).toContain('STANDARD');
      expect(types.map(t => t.type)).toContain('MUTUAL');
      expect(types.map(t => t.type)).toContain('UNILATERAL');
    });
  });
});
