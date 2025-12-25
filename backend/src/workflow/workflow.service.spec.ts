import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkflowService,
  WorkflowTemplate,
  WorkflowInstance,
  ApprovalDecision,
} from './workflow.service';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should initialize with default templates', async () => {
      const templates = await service.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have Invoice Approval template', async () => {
      const template = await service.getTemplateByName('Invoice Approval');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Aprobare Factură');
      expect(template!.category).toBe('Finance');
    });

    it('should have ANAF Submission template', async () => {
      const template = await service.getTemplateByName('ANAF Submission');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Depunere ANAF');
      expect(template!.category).toBe('Tax');
    });

    it('should have Employee Onboarding template', async () => {
      const template = await service.getTemplateByName('Employee Onboarding');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Angajare Personal');
      expect(template!.category).toBe('HR');
    });

    it('should have Payment Processing template', async () => {
      const template = await service.getTemplateByName('Payment Processing');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Procesare Plăți');
    });

    it('should have Document Review template', async () => {
      const template = await service.getTemplateByName('Document Review');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Revizuire Documente');
    });

    it('should filter templates by category', async () => {
      const financeTemplates = await service.listTemplates('Finance');
      expect(financeTemplates.every((t) => t.category === 'Finance')).toBe(true);
    });

    it('should create custom template', async () => {
      const template = await service.createTemplate({
        name: 'Custom Workflow',
        nameRo: 'Flux Personalizat',
        description: 'A custom workflow',
        descriptionRo: 'Un flux de lucru personalizat',
        version: '1.0',
        category: 'Custom',
        tasks: [
          { id: 'start', name: 'Start', nameRo: 'Început', type: 'USER_TASK' },
        ],
        transitions: [],
        variables: [],
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Workflow');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.template.created', expect.any(Object));
    });

    it('should update template', async () => {
      const templates = await service.listTemplates();
      const templateId = templates[0].id;

      const updated = await service.updateTemplate(templateId, {
        description: 'Updated description',
      });

      expect(updated).toBeDefined();
      expect(updated!.description).toBe('Updated description');
    });

    it('should delete template', async () => {
      const template = await service.createTemplate({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: 'Template to delete',
        descriptionRo: 'Șablon de șters',
        version: '1.0',
        category: 'Test',
        tasks: [],
        transitions: [],
        variables: [],
      });

      const deleted = await service.deleteTemplate(template.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getTemplate(template.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Workflow Instances', () => {
    let invoiceTemplate: WorkflowTemplate;

    beforeEach(async () => {
      invoiceTemplate = (await service.getTemplateByName('Invoice Approval'))!;
    });

    it('should start workflow', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        {
          customerName: 'Test Customer',
          amount: 5000,
          dueDate: new Date(),
        },
        'user-1',
      );

      expect(instance.id).toBeDefined();
      expect(instance.status).toBe('ACTIVE');
      expect(instance.templateId).toBe(invoiceTemplate.id);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.started', expect.any(Object));
    });

    it('should apply default variable values', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        {
          customerName: 'Test Customer',
          amount: 5000,
          dueDate: new Date(),
        },
        'user-1',
      );

      expect(instance.variables.currency).toBe('RON');
    });

    it('should throw error for missing required variables', async () => {
      await expect(
        service.startWorkflow(invoiceTemplate.id, { amount: 5000 }, 'user-1'),
      ).rejects.toThrow('Missing required variable: customerName');
    });

    it('should throw error for invalid template', async () => {
      await expect(
        service.startWorkflow('invalid-id', {}, 'user-1'),
      ).rejects.toThrow('Template not found');
    });

    it('should set first task as in progress', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        {
          customerName: 'Test',
          amount: 1000,
          dueDate: new Date(),
        },
        'user-1',
      );

      const firstTask = instance.tasks[0];
      expect(firstTask.status).toBe('IN_PROGRESS');
      expect(firstTask.startedAt).toBeDefined();
    });

    it('should record history on start', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        {
          customerName: 'Test',
          amount: 1000,
          dueDate: new Date(),
        },
        'user-1',
      );

      expect(instance.history.length).toBeGreaterThan(0);
      expect(instance.history[0].action).toBe('WORKFLOW_STARTED');
      expect(instance.history[0].actionRo).toBe('Flux de lucru pornit');
    });

    it('should get instance by id', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        {
          customerName: 'Test',
          amount: 1000,
          dueDate: new Date(),
        },
        'user-1',
      );

      const retrieved = await service.getInstance(instance.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(instance.id);
    });

    it('should list instances', async () => {
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test 1', amount: 1000, dueDate: new Date() },
        'user-1',
      );
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test 2', amount: 2000, dueDate: new Date() },
        'user-1',
      );

      const instances = await service.listInstances();
      expect(instances.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter instances by status', async () => {
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      const activeInstances = await service.listInstances({ status: 'ACTIVE' });
      expect(activeInstances.every((i) => i.status === 'ACTIVE')).toBe(true);
    });

    it('should set priority', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
        5,
      );

      expect(instance.priority).toBe(5);
    });
  });

  describe('Task Operations', () => {
    let invoiceTemplate: WorkflowTemplate;
    let instance: WorkflowInstance;

    beforeEach(async () => {
      invoiceTemplate = (await service.getTemplateByName('Invoice Approval'))!;
      instance = await service.startWorkflow(
        invoiceTemplate.id,
        {
          customerName: 'Test Customer',
          amount: 5000,
          dueDate: new Date(),
        },
        'user-1',
      );
    });

    it('should complete task', async () => {
      const firstTaskId = invoiceTemplate.tasks[0].id;
      const updated = await service.completeTask(
        instance.id,
        firstTaskId,
        { invoiceNumber: 'INV-001' },
        'user-1',
      );

      const task = updated.tasks.find((t) => t.definitionId === firstTaskId);
      expect(task!.status).toBe('COMPLETED');
      expect(task!.completedAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.task.completed', expect.any(Object));
    });

    it('should update variables on task completion', async () => {
      const firstTaskId = invoiceTemplate.tasks[0].id;
      const updated = await service.completeTask(
        instance.id,
        firstTaskId,
        { invoiceNumber: 'INV-001' },
        'user-1',
      );

      expect(updated.variables.invoiceNumber).toBe('INV-001');
    });

    it('should advance to next task', async () => {
      const firstTaskId = invoiceTemplate.tasks[0].id;
      const updated = await service.completeTask(
        instance.id,
        firstTaskId,
        {},
        'user-1',
      );

      expect(updated.currentTaskId).not.toBe(firstTaskId);
      const newCurrentTask = updated.tasks.find((t) => t.definitionId === updated.currentTaskId);
      expect(newCurrentTask?.status).toBe('IN_PROGRESS');
    });

    it('should throw error for invalid instance', async () => {
      await expect(
        service.completeTask('invalid-id', 'task', {}, 'user-1'),
      ).rejects.toThrow('Instance not found');
    });

    it('should throw error for invalid task', async () => {
      await expect(
        service.completeTask(instance.id, 'invalid-task', {}, 'user-1'),
      ).rejects.toThrow('Task not found');
    });

    it('should throw error when completing non-in-progress task', async () => {
      const firstTaskId = invoiceTemplate.tasks[0].id;
      await service.completeTask(instance.id, firstTaskId, {}, 'user-1');

      await expect(
        service.completeTask(instance.id, firstTaskId, {}, 'user-1'),
      ).rejects.toThrow('Task is not in progress');
    });

    it('should add task comment', async () => {
      const firstTaskId = invoiceTemplate.tasks[0].id;
      const task = await service.addTaskComment(
        instance.id,
        firstTaskId,
        'user-1',
        'John Doe',
        'This needs attention',
      );

      expect(task.comments).toHaveLength(1);
      expect(task.comments![0].comment).toBe('This needs attention');
    });

    it('should reassign task', async () => {
      const firstTaskId = invoiceTemplate.tasks[0].id;
      const task = await service.reassignTask(
        instance.id,
        firstTaskId,
        'user-2',
        'user-1',
      );

      expect(task.assignee).toBe('user-2');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.task.reassigned', expect.any(Object));
    });
  });

  describe('Approval Tasks', () => {
    let invoiceTemplate: WorkflowTemplate;
    let instance: WorkflowInstance;

    beforeEach(async () => {
      invoiceTemplate = (await service.getTemplateByName('Invoice Approval'))!;
      instance = await service.startWorkflow(
        invoiceTemplate.id,
        {
          customerName: 'Test Customer',
          amount: 5000,
          dueDate: new Date(),
        },
        'user-1',
      );

      // Complete first task to reach approval
      const firstTaskId = invoiceTemplate.tasks[0].id;
      instance = await service.completeTask(instance.id, firstTaskId, {}, 'user-1');
    });

    it('should submit approval', async () => {
      const approvalTaskId = invoiceTemplate.tasks[1].id; // review task

      const updated = await service.submitApproval(
        instance.id,
        approvalTaskId,
        'APPROVED',
        'user-2',
        'Supervisor',
        'Looks good',
      );

      const task = updated.tasks.find((t) => t.definitionId === approvalTaskId);
      expect(task!.approvals).toHaveLength(1);
      expect(task!.approvals![0].decision).toBe('APPROVED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.approval.submitted', expect.any(Object));
    });

    it('should complete task after required approvals', async () => {
      const approvalTaskId = invoiceTemplate.tasks[1].id;

      const updated = await service.submitApproval(
        instance.id,
        approvalTaskId,
        'APPROVED',
        'user-2',
        'Supervisor',
      );

      const task = updated.tasks.find((t) => t.definitionId === approvalTaskId);
      expect(task!.status).toBe('COMPLETED');
    });

    it('should fail workflow on rejection', async () => {
      const approvalTaskId = invoiceTemplate.tasks[1].id;

      const updated = await service.submitApproval(
        instance.id,
        approvalTaskId,
        'REJECTED',
        'user-2',
        'Supervisor',
        'Missing information',
      );

      const task = updated.tasks.find((t) => t.definitionId === approvalTaskId);
      expect(task!.status).toBe('FAILED');
      expect(updated.status).toBe('FAILED');
    });

    it('should record approval in history', async () => {
      const approvalTaskId = invoiceTemplate.tasks[1].id;
      const historyLengthBefore = instance.history.length;

      const updated = await service.submitApproval(
        instance.id,
        approvalTaskId,
        'APPROVED',
        'user-2',
        'Supervisor',
      );

      expect(updated.history.length).toBeGreaterThan(historyLengthBefore);
      const approvalEntry = updated.history.find((h) => h.action === 'APPROVAL_APPROVED');
      expect(approvalEntry).toBeDefined();
    });

    it('should throw error for non-approval task', async () => {
      const firstTaskId = invoiceTemplate.tasks[0].id; // USER_TASK, not APPROVAL

      const newInstance = await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      await expect(
        service.submitApproval(newInstance.id, firstTaskId, 'APPROVED', 'user-2', 'Test'),
      ).rejects.toThrow('Task is not an approval task');
    });
  });

  describe('Workflow Control', () => {
    let invoiceTemplate: WorkflowTemplate;
    let instance: WorkflowInstance;

    beforeEach(async () => {
      invoiceTemplate = (await service.getTemplateByName('Invoice Approval'))!;
      instance = await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );
    });

    it('should pause workflow', async () => {
      const paused = await service.pauseWorkflow(instance.id, 'user-1');

      expect(paused.status).toBe('PAUSED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.paused', expect.any(Object));
    });

    it('should record pause in history', async () => {
      const paused = await service.pauseWorkflow(instance.id, 'user-1');

      const pauseEntry = paused.history.find((h) => h.action === 'WORKFLOW_PAUSED');
      expect(pauseEntry).toBeDefined();
      expect(pauseEntry!.actionRo).toBe('Flux de lucru în pauză');
    });

    it('should resume workflow', async () => {
      await service.pauseWorkflow(instance.id, 'user-1');
      const resumed = await service.resumeWorkflow(instance.id, 'user-1');

      expect(resumed.status).toBe('ACTIVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.resumed', expect.any(Object));
    });

    it('should throw error when resuming non-paused workflow', async () => {
      await expect(
        service.resumeWorkflow(instance.id, 'user-1'),
      ).rejects.toThrow('Workflow is not paused');
    });

    it('should cancel workflow', async () => {
      const cancelled = await service.cancelWorkflow(instance.id, 'user-1', 'No longer needed');

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.completedAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.cancelled', expect.any(Object));
    });

    it('should mark current task as cancelled', async () => {
      const cancelled = await service.cancelWorkflow(instance.id, 'user-1');

      const currentTask = cancelled.tasks.find((t) => t.definitionId === cancelled.tasks[0].definitionId);
      expect(currentTask!.status).toBe('CANCELLED');
    });

    it('should record cancellation in history', async () => {
      const cancelled = await service.cancelWorkflow(instance.id, 'user-1', 'Test reason');

      const cancelEntry = cancelled.history.find((h) => h.action === 'WORKFLOW_CANCELLED');
      expect(cancelEntry).toBeDefined();
      expect(cancelEntry!.details?.reason).toBe('Test reason');
    });
  });

  describe('Workflow Completion', () => {
    it('should complete workflow when all tasks done', async () => {
      // Create a simple template with one task
      const template = await service.createTemplate({
        name: 'Simple Flow',
        nameRo: 'Flux Simplu',
        description: 'Simple workflow',
        descriptionRo: 'Flux simplu',
        version: '1.0',
        category: 'Test',
        tasks: [
          { id: 'only_task', name: 'Only Task', nameRo: 'Singura Sarcină', type: 'USER_TASK' },
        ],
        transitions: [],
        variables: [],
      });

      const instance = await service.startWorkflow(template.id, {}, 'user-1');
      const completed = await service.completeTask(instance.id, 'only_task', {}, 'user-1');

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.completed', expect.any(Object));
    });

    it('should record completion in history', async () => {
      const template = await service.createTemplate({
        name: 'Complete Test',
        nameRo: 'Test Completare',
        description: 'Test',
        descriptionRo: 'Test',
        version: '1.0',
        category: 'Test',
        tasks: [{ id: 'task', name: 'Task', nameRo: 'Sarcină', type: 'USER_TASK' }],
        transitions: [],
        variables: [],
      });

      const instance = await service.startWorkflow(template.id, {}, 'user-1');
      const completed = await service.completeTask(instance.id, 'task', {}, 'user-1');

      const completionEntry = completed.history.find((h) => h.action === 'WORKFLOW_COMPLETED');
      expect(completionEntry).toBeDefined();
      expect(completionEntry!.actionRo).toBe('Flux de lucru finalizat');
    });
  });

  describe('Conditional Transitions', () => {
    let invoiceTemplate: WorkflowTemplate;

    beforeEach(async () => {
      invoiceTemplate = (await service.getTemplateByName('Invoice Approval'))!;
    });

    it('should follow condition for large amounts', async () => {
      // Large amount should require manager approval
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 15000, dueDate: new Date() },
        'user-1',
      );

      // Complete create task
      let updated = await service.completeTask(instance.id, 'create', {}, 'user-1');

      // Complete review task with approval
      updated = await service.submitApproval(updated.id, 'review', 'APPROVED', 'user-2', 'Supervisor');

      // Should now be at manager approval for large amounts
      expect(updated.currentTaskId).toBe('approve_large');
    });
  });

  describe('My Tasks', () => {
    let invoiceTemplate: WorkflowTemplate;

    beforeEach(async () => {
      invoiceTemplate = (await service.getTemplateByName('Invoice Approval'))!;
    });

    it('should get tasks assigned to user', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      // Reassign first task to specific user
      await service.reassignTask(instance.id, invoiceTemplate.tasks[0].id, 'accountant-1', 'user-1');

      const myTasks = await service.getMyTasks('accountant-1');
      expect(myTasks.some((t) => t.task.assignee === 'accountant-1')).toBe(true);
    });

    it('should get tasks by role', async () => {
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      const myTasks = await service.getMyTasks('any-user', 'accountant');
      expect(myTasks.some((t) => t.task.assigneeRole === 'accountant')).toBe(true);
    });

    it('should sort by priority', async () => {
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Low Priority', amount: 1000, dueDate: new Date() },
        'user-1',
        1,
      );
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'High Priority', amount: 1000, dueDate: new Date() },
        'user-1',
        10,
      );

      const myTasks = await service.getMyTasks('any-user', 'accountant');

      if (myTasks.length >= 2) {
        expect(myTasks[0].instance.priority).toBeGreaterThanOrEqual(myTasks[1].instance.priority);
      }
    });
  });

  describe('Statistics', () => {
    let invoiceTemplate: WorkflowTemplate;

    beforeEach(async () => {
      invoiceTemplate = (await service.getTemplateByName('Invoice Approval'))!;
    });

    it('should track total instances', async () => {
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test 1', amount: 1000, dueDate: new Date() },
        'user-1',
      );
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test 2', amount: 2000, dueDate: new Date() },
        'user-1',
      );

      const stats = service.getStats();
      expect(stats.totalInstances).toBeGreaterThanOrEqual(2);
    });

    it('should track by status', async () => {
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      const stats = service.getStats();
      expect(stats.byStatus.ACTIVE).toBeGreaterThanOrEqual(1);
    });

    it('should track by template', async () => {
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      const stats = service.getStats();
      expect(stats.byTemplate['Invoice Approval']).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian template names', async () => {
      const templates = await service.listTemplates();

      for (const template of templates) {
        expect(template.nameRo).toBeDefined();
        expect(template.nameRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian template descriptions', async () => {
      const templates = await service.listTemplates();

      for (const template of templates) {
        expect(template.descriptionRo).toBeDefined();
        expect(template.descriptionRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian task names', async () => {
      const templates = await service.listTemplates();

      for (const template of templates) {
        for (const task of template.tasks) {
          expect(task.nameRo).toBeDefined();
          expect(task.nameRo.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have Romanian variable names', async () => {
      const template = await service.getTemplateByName('Invoice Approval');

      for (const variable of template!.variables) {
        expect(variable.nameRo).toBeDefined();
        expect(variable.nameRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian diacritics in content', async () => {
      const templates = await service.listTemplates();
      const hasRomanianChars = templates.some((t) =>
        t.descriptionRo.match(/[ăîâșțĂÎÂȘȚ]/) || t.nameRo.match(/[ăîâșțĂÎÂȘȚ]/),
      );
      expect(hasRomanianChars).toBe(true);
    });

    it('should have Romanian history action names', async () => {
      const template = await service.getTemplateByName('Invoice Approval');
      const instance = await service.startWorkflow(
        template!.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      expect(instance.history[0].actionRo).toBe('Flux de lucru pornit');
    });
  });

  describe('Events', () => {
    let invoiceTemplate: WorkflowTemplate;

    beforeEach(async () => {
      invoiceTemplate = (await service.getTemplateByName('Invoice Approval'))!;
    });

    it('should emit workflow.started event', async () => {
      await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.started', expect.any(Object));
    });

    it('should emit workflow.task.completed event', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      jest.clearAllMocks();
      await service.completeTask(instance.id, invoiceTemplate.tasks[0].id, {}, 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.task.completed', expect.any(Object));
    });

    it('should emit workflow.paused event', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      jest.clearAllMocks();
      await service.pauseWorkflow(instance.id, 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.paused', expect.any(Object));
    });

    it('should emit workflow.cancelled event', async () => {
      const instance = await service.startWorkflow(
        invoiceTemplate.id,
        { customerName: 'Test', amount: 1000, dueDate: new Date() },
        'user-1',
      );

      jest.clearAllMocks();
      await service.cancelWorkflow(instance.id, 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.cancelled', expect.any(Object));
    });
  });
});
