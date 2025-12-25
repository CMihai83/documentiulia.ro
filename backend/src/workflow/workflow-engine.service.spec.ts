import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkflowEngineService,
  CreateWorkflowDto,
  CreateStepDto,
  TriggerType,
  ActionType,
  StepType,
} from './workflow-engine.service';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  const createTestWorkflow = (): CreateWorkflowDto => ({
    name: 'Test Workflow',
    nameRo: 'Flux de Lucru Test',
    description: 'A test workflow',
    descriptionRo: 'Un flux de lucru de test',
    category: 'TEST',
    triggers: [{ type: 'MANUAL' as TriggerType }],
    steps: [
      {
        type: 'ACTION' as StepType,
        name: 'Test Step',
        nameRo: 'Pas Test',
        order: 1,
        action: {
          type: 'NOTIFICATION' as ActionType,
          name: 'Test Action',
          nameRo: 'Acțiune Test',
          config: { channel: 'email', recipient: 'test@test.com' },
        },
      },
    ],
    variables: { testVar: 'value' },
    createdBy: 'user-1',
    tags: ['test'],
  });

  describe('Workflow CRUD', () => {
    it('should create a workflow', async () => {
      const dto = createTestWorkflow();
      const workflow = await service.createWorkflow(dto);

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.nameRo).toBe('Flux de Lucru Test');
      expect(workflow.status).toBe('DRAFT');
      expect(workflow.version).toBe(1);
      expect(workflow.steps.length).toBe(1);
      expect(workflow.triggers.length).toBe(1);
    });

    it('should throw error when name is missing', async () => {
      const dto = createTestWorkflow();
      dto.name = '';

      await expect(service.createWorkflow(dto)).rejects.toThrow('Name is required');
    });

    it('should throw error when steps are missing', async () => {
      const dto = createTestWorkflow();
      dto.steps = [];

      await expect(service.createWorkflow(dto)).rejects.toThrow('At least one step is required');
    });

    it('should update a workflow', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      const updated = await service.updateWorkflow(workflow.id, {
        name: 'Updated Workflow',
        nameRo: 'Flux Actualizat',
      });

      expect(updated.name).toBe('Updated Workflow');
      expect(updated.nameRo).toBe('Flux Actualizat');
      expect(updated.version).toBe(2);
    });

    it('should throw error when updating non-existent workflow', async () => {
      await expect(service.updateWorkflow('non-existent', { name: 'Test' }))
        .rejects.toThrow('not found');
    });

    it('should get workflow by ID', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      const retrieved = service.getWorkflow(workflow.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(workflow.id);
    });

    it('should get all workflows', async () => {
      await service.createWorkflow(createTestWorkflow());
      await service.createWorkflow({
        ...createTestWorkflow(),
        name: 'Another Workflow',
        nameRo: 'Alt Flux',
        category: 'OTHER',
      });

      const all = service.getAllWorkflows();
      expect(all.length).toBe(2);
    });

    it('should filter workflows by status', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      const active = service.getAllWorkflows({ status: 'ACTIVE' });
      const draft = service.getAllWorkflows({ status: 'DRAFT' });

      expect(active.length).toBe(1);
      expect(draft.length).toBe(0);
    });

    it('should filter workflows by category', async () => {
      await service.createWorkflow(createTestWorkflow());
      await service.createWorkflow({
        ...createTestWorkflow(),
        name: 'Finance Workflow',
        nameRo: 'Flux Financiar',
        category: 'FINANCE',
      });

      const testWorkflows = service.getAllWorkflows({ category: 'TEST' });
      const financeWorkflows = service.getAllWorkflows({ category: 'FINANCE' });

      expect(testWorkflows.length).toBe(1);
      expect(financeWorkflows.length).toBe(1);
    });

    it('should delete a workflow', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.deleteWorkflow(workflow.id);

      const retrieved = service.getWorkflow(workflow.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Workflow Status Management', () => {
    it('should activate a workflow', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      const activated = await service.activateWorkflow(workflow.id);

      expect(activated.status).toBe('ACTIVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'workflow.activated',
        expect.objectContaining({ workflowId: workflow.id }),
      );
    });

    it('should pause a workflow', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);
      const paused = await service.pauseWorkflow(workflow.id);

      expect(paused.status).toBe('PAUSED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'workflow.paused',
        expect.objectContaining({ workflowId: workflow.id }),
      );
    });

    it('should archive a workflow', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      const archived = await service.archiveWorkflow(workflow.id);

      expect(archived.status).toBe('ARCHIVED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'workflow.archived',
        expect.objectContaining({ workflowId: workflow.id }),
      );
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a workflow manually', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
        triggerType: 'MANUAL',
      });

      expect(execution.id).toBeDefined();
      expect(execution.workflowId).toBe(workflow.id);
      expect(execution.status).toBe('COMPLETED');
      expect(execution.triggeredBy).toBe('user-1');
    });

    it('should allow manual execution of draft workflows', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      // Not activating - workflow stays in DRAFT

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
        triggerType: 'MANUAL',
      });

      expect(execution.status).toBe('COMPLETED');
    });

    it('should track step results', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.stepResults.length).toBe(1);
      expect(execution.stepResults[0].status).toBe('COMPLETED');
      expect(execution.stepResults[0].stepName).toBe('Test Step');
    });

    it('should include logs in execution', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.logs.length).toBeGreaterThan(0);
      expect(execution.logs.some(l => l.message.includes('started'))).toBe(true);
    });

    it('should pass variables to execution', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
        variables: { customVar: 'custom' },
      });

      expect(execution.variables.testVar).toBe('value');
      expect(execution.variables.customVar).toBe('custom');
    });

    it('should emit event on execution completion', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'workflow.execution.completed',
        expect.objectContaining({ status: 'COMPLETED' }),
      );
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(service.executeWorkflow({
        workflowId: 'non-existent',
        triggeredBy: 'user-1',
      })).rejects.toThrow('not found');
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate condition steps with true branch', async () => {
      const steps: CreateStepDto[] = [
        {
          type: 'CONDITION' as StepType,
          name: 'Check Amount',
          nameRo: 'Verificare Sumă',
          order: 1,
          conditions: [{ field: 'amount', operator: 'GREATER_THAN', value: 100 }],
          trueBranch: 'step-true',
          falseBranch: 'step-false',
        },
        {
          type: 'ACTION' as StepType,
          name: 'True Branch',
          nameRo: 'Ramură Adevărat',
          order: 2,
          action: {
            type: 'NOTIFICATION' as ActionType,
            name: 'High Amount',
            nameRo: 'Sumă Mare',
            config: { channel: 'email' },
          },
        },
      ];

      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps,
        variables: { amount: 500 },
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      const conditionResult = execution.stepResults.find(r => r.stepName === 'Check Amount');
      expect(conditionResult?.output?.conditionResult).toBe(true);
    });

    it('should evaluate EQUALS operator', async () => {
      const steps: CreateStepDto[] = [
        {
          type: 'CONDITION' as StepType,
          name: 'Check Status',
          nameRo: 'Verificare Status',
          order: 1,
          conditions: [{ field: 'status', operator: 'EQUALS', value: 'ACTIVE' }],
        },
      ];

      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps,
        variables: { status: 'ACTIVE' },
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.stepResults[0].output?.conditionResult).toBe(true);
    });

    it('should evaluate CONTAINS operator', async () => {
      const steps: CreateStepDto[] = [
        {
          type: 'CONDITION' as StepType,
          name: 'Check Name',
          nameRo: 'Verificare Nume',
          order: 1,
          conditions: [{ field: 'name', operator: 'CONTAINS', value: 'Test' }],
        },
      ];

      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps,
        variables: { name: 'Test Company SRL' },
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.stepResults[0].output?.conditionResult).toBe(true);
    });

    it('should evaluate IS_NULL operator', async () => {
      const steps: CreateStepDto[] = [
        {
          type: 'CONDITION' as StepType,
          name: 'Check Null',
          nameRo: 'Verificare Null',
          order: 1,
          conditions: [{ field: 'nullField', operator: 'IS_NULL', value: null }],
        },
      ];

      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps,
        variables: {},
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.stepResults[0].output?.conditionResult).toBe(true);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute parallel steps', async () => {
      const steps: CreateStepDto[] = [
        {
          type: 'PARALLEL' as StepType,
          name: 'Parallel Tasks',
          nameRo: 'Sarcini Paralele',
          order: 1,
          parallelSteps: ['step-2', 'step-3'],
        },
        {
          type: 'ACTION' as StepType,
          name: 'Task 1',
          nameRo: 'Sarcină 1',
          order: 2,
          action: {
            type: 'NOTIFICATION' as ActionType,
            name: 'Notify 1',
            nameRo: 'Notificare 1',
            config: { channel: 'email' },
          },
        },
        {
          type: 'ACTION' as StepType,
          name: 'Task 2',
          nameRo: 'Sarcină 2',
          order: 3,
          action: {
            type: 'NOTIFICATION' as ActionType,
            name: 'Notify 2',
            nameRo: 'Notificare 2',
            config: { channel: 'sms' },
          },
        },
      ];

      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps,
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.status).toBe('COMPLETED');
      const parallelResult = execution.stepResults.find(r => r.stepName === 'Parallel Tasks');
      expect(parallelResult?.output?.parallelResults).toBeDefined();
    });
  });

  describe('Wait Steps', () => {
    it('should execute wait steps', async () => {
      const steps: CreateStepDto[] = [
        {
          type: 'WAIT' as StepType,
          name: 'Wait Step',
          nameRo: 'Pas Așteptare',
          order: 1,
          waitConfig: { durationMs: 10 },
        },
      ];

      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps,
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.status).toBe('COMPLETED');
      expect(execution.stepResults[0].output?.waited).toBe(true);
    });
  });

  describe('Loop Steps', () => {
    it('should execute loop steps', async () => {
      const steps: CreateStepDto[] = [
        {
          type: 'LOOP' as StepType,
          name: 'Loop Items',
          nameRo: 'Bucla Elemente',
          order: 1,
          loopConfig: {
            collection: 'items',
            itemVariable: 'currentItem',
            maxIterations: 5,
          },
        },
      ];

      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps,
        variables: { items: ['a', 'b', 'c'] },
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.status).toBe('COMPLETED');
      expect(execution.stepResults[0].output?.iterations).toBe(3);
    });
  });

  describe('Action Types', () => {
    it.each([
      ['EMAIL', { template: 'test', recipient: 'test@test.com' }],
      ['NOTIFICATION', { channel: 'push', message: 'Hello' }],
      ['API_CALL', { endpoint: '/api/test', method: 'POST' }],
      ['DATA_UPDATE', { entity: 'user', field: 'status', value: 'active' }],
      ['DOCUMENT', { format: 'PDF', template: 'invoice' }],
      ['INTEGRATION', { service: 'erp', action: 'sync' }],
      ['CUSTOM', { handler: 'customHandler' }],
    ])('should execute %s action', async (actionType, config) => {
      const steps: CreateStepDto[] = [
        {
          type: 'ACTION' as StepType,
          name: `${actionType} Action`,
          nameRo: `Acțiune ${actionType}`,
          order: 1,
          action: {
            type: actionType as ActionType,
            name: 'Test Action',
            nameRo: 'Acțiune Test',
            config,
          },
        },
      ];

      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps,
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(execution.status).toBe('COMPLETED');
    });
  });

  describe('Execution Management', () => {
    it('should get execution by ID', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      const retrieved = service.getExecution(execution.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(execution.id);
    });

    it('should get all executions for a workflow', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      await service.executeWorkflow({ workflowId: workflow.id, triggeredBy: 'user-1' });
      await service.executeWorkflow({ workflowId: workflow.id, triggeredBy: 'user-2' });

      const executions = service.getExecutions(workflow.id);
      expect(executions.length).toBe(2);
    });

    it('should cancel an execution', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      // Note: Execution may already be completed for simple workflows
      const cancelled = await service.cancelExecution(execution.id, 'Testing cancellation');
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.error).toBe('Testing cancellation');
    });
  });

  describe('Templates', () => {
    it('should get all templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should get templates by category', () => {
      const financeTemplates = service.getTemplates('FINANCE');
      const hrTemplates = service.getTemplates('HR');

      expect(financeTemplates.every(t => t.category === 'FINANCE')).toBe(true);
      expect(hrTemplates.every(t => t.category === 'HR')).toBe(true);
    });

    it('should get template by ID', () => {
      const template = service.getTemplate('tpl-invoice-approval');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Invoice Approval Workflow');
    });

    it('should create workflow from template', async () => {
      const workflow = await service.createFromTemplate('tpl-invoice-approval', {
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Invoice Approval');
      expect(workflow.createdBy).toBe('user-1');
      expect(workflow.tenantId).toBe('tenant-1');
    });

    it('should throw error for non-existent template', async () => {
      await expect(service.createFromTemplate('non-existent', { createdBy: 'user-1' }))
        .rejects.toThrow('not found');
    });

    it('should increment template usage count', async () => {
      const templateBefore = service.getTemplate('tpl-employee-onboarding');
      const usageBefore = templateBefore!.usageCount;

      await service.createFromTemplate('tpl-employee-onboarding', { createdBy: 'user-1' });

      const templateAfter = service.getTemplate('tpl-employee-onboarding');
      expect(templateAfter!.usageCount).toBe(usageBefore + 1);
    });

    it('should have ANAF compliance template', () => {
      const template = service.getTemplate('tpl-anaf-submission');
      expect(template).toBeDefined();
      expect(template?.name).toBe('ANAF Document Submission');
      expect(template?.workflow.tags).toContain('anaf');
      expect(template?.workflow.tags).toContain('e-factura');
    });

    it('should have inventory reorder template', () => {
      const template = service.getTemplate('tpl-inventory-reorder');
      expect(template).toBeDefined();
      expect(template?.category).toBe('LOGISTICS');
    });
  });

  describe('Webhook Handling', () => {
    it('should handle webhook trigger', async () => {
      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        triggers: [{ type: 'WEBHOOK' as TriggerType, webhookPath: '/webhooks/test' }],
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.handleWebhook('/webhooks/test', { data: 'test' });

      expect(execution).toBeDefined();
      expect(execution?.triggerType).toBe('WEBHOOK');
      expect(execution?.triggerData.payload.data).toBe('test');
    });

    it('should return null for unknown webhook path', async () => {
      const execution = await service.handleWebhook('/unknown/path', {});
      expect(execution).toBeNull();
    });
  });

  describe('Analytics', () => {
    it('should generate analytics for a workflow', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      await service.executeWorkflow({ workflowId: workflow.id, triggeredBy: 'user-1' });
      await service.executeWorkflow({ workflowId: workflow.id, triggeredBy: 'user-2' });

      const analytics = service.getAnalytics(workflow.id);

      expect(analytics.workflowId).toBe(workflow.id);
      expect(analytics.totalExecutions).toBe(2);
      expect(analytics.successfulExecutions).toBe(2);
      expect(analytics.failedExecutions).toBe(0);
    });

    it('should calculate average duration', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      await service.executeWorkflow({ workflowId: workflow.id, triggeredBy: 'user-1' });

      const analytics = service.getAnalytics(workflow.id);
      expect(analytics.averageDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should track step performance', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      await service.executeWorkflow({ workflowId: workflow.id, triggeredBy: 'user-1' });

      const analytics = service.getAnalytics(workflow.id);
      expect(analytics.stepPerformance.length).toBeGreaterThan(0);
    });

    it('should group executions by day', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      await service.executeWorkflow({ workflowId: workflow.id, triggeredBy: 'user-1' });

      const analytics = service.getAnalytics(workflow.id);
      expect(analytics.executionsByDay.length).toBeGreaterThan(0);
    });

    it('should identify bottlenecks', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      await service.executeWorkflow({ workflowId: workflow.id, triggeredBy: 'user-1' });

      const analytics = service.getAnalytics(workflow.id);
      expect(Array.isArray(analytics.bottlenecks)).toBe(true);
    });
  });

  describe('Approval Workflow', () => {
    it('should handle approval decision', async () => {
      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps: [
          {
            type: 'APPROVAL' as StepType,
            name: 'Manager Approval',
            nameRo: 'Aprobare Manager',
            order: 1,
            approvalConfig: {
              approvers: ['manager-1'],
              requiredApprovals: 1,
              timeoutHours: 24,
            },
          },
        ],
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      // Find the approval
      if (execution.approvals.length > 0) {
        const approval = await service.handleApproval(
          execution.id,
          execution.approvals[0].id,
          'APPROVED',
          'manager-1',
          'Looks good',
        );

        expect(approval.status).toBe('APPROVED');
        expect(approval.comment).toBe('Looks good');
      }
    });

    it('should emit approval requested event', async () => {
      const dto: CreateWorkflowDto = {
        ...createTestWorkflow(),
        steps: [
          {
            type: 'APPROVAL' as StepType,
            name: 'CFO Approval',
            nameRo: 'Aprobare CFO',
            order: 1,
            approvalConfig: {
              approvers: ['cfo-1'],
              requiredApprovals: 1,
            },
          },
        ],
      };

      const workflow = await service.createWorkflow(dto);
      await service.activateWorkflow(workflow.id);

      await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'workflow.approval.requested',
        expect.objectContaining({ approvers: ['cfo-1'] }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error for approval on non-existent execution', async () => {
      await expect(service.handleApproval('non-existent', 'apr-1', 'APPROVED', 'user-1'))
        .rejects.toThrow('not found');
    });

    it('should throw error for non-existent approval', async () => {
      const workflow = await service.createWorkflow(createTestWorkflow());
      await service.activateWorkflow(workflow.id);

      const execution = await service.executeWorkflow({
        workflowId: workflow.id,
        triggeredBy: 'user-1',
      });

      await expect(service.handleApproval(execution.id, 'non-existent', 'APPROVED', 'user-1'))
        .rejects.toThrow('not found');
    });
  });
});
