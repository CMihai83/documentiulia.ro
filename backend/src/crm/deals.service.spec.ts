import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealsService, Pipeline, Deal, DealTask } from './deals.service';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
}));

describe('DealsService', () => {
  let service: DealsService;
  let eventEmitter: EventEmitter2;

  const defaultStages = [
    { name: 'Lead', probability: 10, color: '#blue', order: 0 },
    { name: 'Qualification', probability: 25, color: '#green', order: 1 },
    { name: 'Proposal', probability: 50, color: '#yellow', order: 2 },
    { name: 'Negotiation', probability: 75, color: '#orange', order: 3 },
    { name: 'Closed Won', probability: 100, color: '#green', isWon: true, order: 4 },
    { name: 'Closed Lost', probability: 0, color: '#red', isLost: true, order: 5 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pipelines', () => {
    describe('createPipeline', () => {
      it('should create pipeline with stages', async () => {
        const pipeline = await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Sales Pipeline',
          stages: defaultStages,
        });

        expect(pipeline.id).toBeDefined();
        expect(pipeline.name).toBe('Sales Pipeline');
        expect(pipeline.stages.length).toBe(6);
        expect(pipeline.currency).toBe('RON');
      });

      it('should assign order to stages', async () => {
        const pipeline = await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Test Pipeline',
          stages: defaultStages,
        });

        pipeline.stages.forEach((stage, index) => {
          expect(stage.order).toBe(index);
          expect(stage.id).toBeDefined();
        });
      });

      it('should set default pipeline', async () => {
        const pipeline = await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Default Pipeline',
          stages: defaultStages,
          isDefault: true,
        });

        expect(pipeline.isDefault).toBe(true);
      });

      it('should unset other default when creating new default', async () => {
        await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'First Default',
          stages: defaultStages,
          isDefault: true,
        });

        await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Second Default',
          stages: defaultStages,
          isDefault: true,
        });

        const pipelines = await service.getPipelines('tenant-1');
        const defaults = pipelines.filter(p => p.isDefault);

        expect(defaults.length).toBe(1);
        expect(defaults[0].name).toBe('Second Default');
      });

      it('should initialize stats', async () => {
        const pipeline = await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Stats Pipeline',
          stages: defaultStages,
        });

        expect(pipeline.stats.totalDeals).toBe(0);
        expect(pipeline.stats.totalValue).toBe(0);
        expect(pipeline.stats.winRate).toBe(0);
      });
    });

    describe('getPipelines', () => {
      it('should return pipelines for tenant', async () => {
        await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Pipeline 1',
          stages: defaultStages,
        });

        await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Pipeline 2',
          stages: defaultStages,
        });

        const pipelines = await service.getPipelines('tenant-1');

        expect(pipelines.length).toBe(2);
      });

      it('should sort default pipeline first', async () => {
        await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Non-default',
          stages: defaultStages,
        });

        await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Default',
          stages: defaultStages,
          isDefault: true,
        });

        const pipelines = await service.getPipelines('tenant-1');

        expect(pipelines[0].isDefault).toBe(true);
      });
    });

    describe('getDefaultPipeline', () => {
      it('should return default pipeline', async () => {
        await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Default',
          stages: defaultStages,
          isDefault: true,
        });

        const pipeline = await service.getDefaultPipeline('tenant-1');

        expect(pipeline).not.toBeNull();
        expect(pipeline?.isDefault).toBe(true);
      });

      it('should return null when no default', async () => {
        const pipeline = await service.getDefaultPipeline('tenant-1');

        expect(pipeline).toBeNull();
      });
    });

    describe('updatePipeline', () => {
      it('should update pipeline', async () => {
        const pipeline = await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Original',
          stages: defaultStages,
        });

        const updated = await service.updatePipeline(pipeline.id, {
          name: 'Updated',
          description: 'New description',
        });

        expect(updated?.name).toBe('Updated');
        expect(updated?.description).toBe('New description');
      });

      it('should return null for non-existent pipeline', async () => {
        const result = await service.updatePipeline('non-existent', { name: 'New' });

        expect(result).toBeNull();
      });
    });

    describe('deletePipeline', () => {
      it('should delete empty pipeline', async () => {
        const pipeline = await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Delete Me',
          stages: defaultStages,
        });

        await service.deletePipeline(pipeline.id);

        const result = await service.getPipeline(pipeline.id);
        expect(result).toBeNull();
      });

      it('should throw when pipeline has deals', async () => {
        const pipeline = await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Has Deals',
          stages: defaultStages,
        });

        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Test Deal',
          pipelineId: pipeline.id,
          amount: 1000,
          ownerId: 'user-1',
        });

        await expect(service.deletePipeline(pipeline.id)).rejects.toThrow('Cannot delete pipeline with existing deals');
      });
    });

    describe('Stage Management', () => {
      let pipeline: Pipeline;

      beforeEach(async () => {
        pipeline = await service.createPipeline({
          tenantId: 'tenant-1',
          name: 'Stage Test',
          stages: [
            { name: 'Stage 1', probability: 25, color: '#blue', order: 0 },
            { name: 'Stage 2', probability: 50, color: '#green', order: 1 },
          ],
        });
      });

      it('should add stage', async () => {
        const updated = await service.addStage(pipeline.id, {
          name: 'Stage 3',
          probability: 75,
          color: '#yellow',
        });

        expect(updated?.stages.length).toBe(3);
        expect(updated?.stages[2].order).toBe(2);
      });

      it('should update stage', async () => {
        const stageId = pipeline.stages[0].id;

        const updated = await service.updateStage(pipeline.id, stageId, {
          name: 'Updated Stage',
          probability: 30,
        });

        expect(updated?.stages[0].name).toBe('Updated Stage');
        expect(updated?.stages[0].probability).toBe(30);
      });

      it('should reorder stages', async () => {
        const stageIds = [pipeline.stages[1].id, pipeline.stages[0].id];

        const updated = await service.reorderStages(pipeline.id, stageIds);

        expect(updated?.stages[0].id).toBe(stageIds[0]);
        expect(updated?.stages[1].id).toBe(stageIds[1]);
      });

      it('should delete stage without deals', async () => {
        const stageId = pipeline.stages[1].id;

        const updated = await service.deleteStage(pipeline.id, stageId);

        expect(updated?.stages.length).toBe(1);
      });

      it('should throw when deleting stage with deals', async () => {
        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Deal',
          pipelineId: pipeline.id,
          stageId: pipeline.stages[0].id,
          amount: 1000,
          ownerId: 'user-1',
        });

        await expect(
          service.deleteStage(pipeline.id, pipeline.stages[0].id),
        ).rejects.toThrow('Cannot delete stage with existing deals');
      });
    });
  });

  describe('Deals', () => {
    let pipeline: Pipeline;

    beforeEach(async () => {
      pipeline = await service.createPipeline({
        tenantId: 'tenant-1',
        name: 'Sales',
        stages: defaultStages,
        isDefault: true,
      });
    });

    describe('createDeal', () => {
      it('should create deal', async () => {
        const deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'New Deal',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });

        expect(deal.id).toBeDefined();
        expect(deal.name).toBe('New Deal');
        expect(deal.status).toBe('open');
        expect(deal.stageId).toBe(pipeline.stages[0].id);
        expect(eventEmitter.emit).toHaveBeenCalledWith('deal.created', expect.any(Object));
      });

      it('should use stage probability', async () => {
        const deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Probability Deal',
          pipelineId: pipeline.id,
          amount: 3000,
          ownerId: 'user-1',
        });

        expect(deal.probability).toBe(pipeline.stages[0].probability);
      });

      it('should use custom probability', async () => {
        const deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Custom Prob',
          pipelineId: pipeline.id,
          amount: 3000,
          probability: 60,
          ownerId: 'user-1',
        });

        expect(deal.probability).toBe(60);
      });

      it('should throw for non-existent pipeline', async () => {
        await expect(
          service.createDeal({
            tenantId: 'tenant-1',
            name: 'Bad Deal',
            pipelineId: 'non-existent',
            amount: 1000,
            ownerId: 'user-1',
          }),
        ).rejects.toThrow('Pipeline not found');
      });

      it('should support optional fields', async () => {
        const deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Full Deal',
          pipelineId: pipeline.id,
          amount: 10000,
          ownerId: 'user-1',
          contactId: 'contact-1',
          companyId: 'company-1',
          tags: ['important', 'q4'],
          priority: 'high',
          source: 'website',
          campaign: 'summer-promo',
        });

        expect(deal.contactId).toBe('contact-1');
        expect(deal.companyId).toBe('company-1');
        expect(deal.tags).toContain('important');
        expect(deal.priority).toBe('high');
        expect(deal.source).toBe('website');
      });

      it('should update pipeline stats', async () => {
        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Stats Deal',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });

        const updated = await service.getPipeline(pipeline.id);
        expect(updated?.stats.totalDeals).toBe(1);
        expect(updated?.stats.totalValue).toBe(5000);
      });
    });

    describe('getDeals', () => {
      beforeEach(async () => {
        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Deal A',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
          tags: ['urgent'],
          priority: 'high',
        });

        await new Promise(r => setTimeout(r, 5));

        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Deal B',
          pipelineId: pipeline.id,
          amount: 3000,
          ownerId: 'user-2',
          tags: ['normal'],
          priority: 'medium',
        });
      });

      it('should return deals for tenant', async () => {
        const { deals, total } = await service.getDeals('tenant-1');

        expect(total).toBe(2);
        expect(deals.length).toBe(2);
      });

      it('should filter by pipeline', async () => {
        const { deals } = await service.getDeals('tenant-1', { pipelineId: pipeline.id });

        expect(deals.every(d => d.pipelineId === pipeline.id)).toBe(true);
      });

      it('should filter by owner', async () => {
        const { deals } = await service.getDeals('tenant-1', { ownerId: 'user-1' });

        expect(deals.every(d => d.ownerId === 'user-1')).toBe(true);
      });

      it('should filter by status', async () => {
        const { deals } = await service.getDeals('tenant-1', { status: 'open' });

        expect(deals.every(d => d.status === 'open')).toBe(true);
      });

      it('should filter by amount range', async () => {
        const { deals } = await service.getDeals('tenant-1', { minAmount: 4000, maxAmount: 6000 });

        expect(deals.every(d => d.amount >= 4000 && d.amount <= 6000)).toBe(true);
      });

      it('should filter by tags', async () => {
        const { deals } = await service.getDeals('tenant-1', { tags: ['urgent'] });

        expect(deals.some(d => d.tags.includes('urgent'))).toBe(true);
      });

      it('should filter by priority', async () => {
        const { deals } = await service.getDeals('tenant-1', { priority: 'high' });

        expect(deals.every(d => d.priority === 'high')).toBe(true);
      });

      it('should search by name', async () => {
        const { deals } = await service.getDeals('tenant-1', { search: 'Deal A' });

        expect(deals.length).toBe(1);
        expect(deals[0].name).toBe('Deal A');
      });

      it('should paginate results', async () => {
        const { deals } = await service.getDeals('tenant-1', { limit: 1, offset: 0 });

        expect(deals.length).toBe(1);
      });

      it('should sort results', async () => {
        const { deals } = await service.getDeals('tenant-1', { sortBy: 'amount', sortOrder: 'desc' });

        expect(deals[0].amount).toBeGreaterThan(deals[1].amount);
      });
    });

    describe('updateDeal', () => {
      let deal: Deal;

      beforeEach(async () => {
        deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Update Test',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });
      });

      it('should update deal', async () => {
        const updated = await service.updateDeal(deal.id, {
          name: 'Updated Name',
          amount: 7500,
        }, 'user-1');

        expect(updated?.name).toBe('Updated Name');
        expect(updated?.amount).toBe(7500);
      });

      it('should record value change activity', async () => {
        await service.updateDeal(deal.id, { amount: 10000 }, 'user-1');

        const activities = await service.getActivities(deal.id);

        expect(activities.some(a => a.type === 'value_change')).toBe(true);
      });

      it('should return null for non-existent deal', async () => {
        const result = await service.updateDeal('non-existent', { name: 'New' }, 'user-1');

        expect(result).toBeNull();
      });
    });

    describe('moveDealToStage', () => {
      let deal: Deal;

      beforeEach(async () => {
        deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Move Test',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });
      });

      it('should move deal to stage', async () => {
        const targetStage = pipeline.stages[2]; // Proposal

        const moved = await service.moveDealToStage(deal.id, targetStage.id, 'user-1');

        expect(moved?.stageId).toBe(targetStage.id);
        expect(moved?.probability).toBe(targetStage.probability);
      });

      it('should mark as won when moving to won stage', async () => {
        const wonStage = pipeline.stages.find(s => s.isWon)!;

        const moved = await service.moveDealToStage(deal.id, wonStage.id, 'user-1');

        expect(moved?.status).toBe('won');
        expect(moved?.actualCloseDate).toBeDefined();
      });

      it('should mark as lost when moving to lost stage', async () => {
        const lostStage = pipeline.stages.find(s => s.isLost)!;

        const moved = await service.moveDealToStage(deal.id, lostStage.id, 'user-1');

        expect(moved?.status).toBe('lost');
        expect(moved?.actualCloseDate).toBeDefined();
      });

      it('should emit stage-changed event', async () => {
        const targetStage = pipeline.stages[1];

        await service.moveDealToStage(deal.id, targetStage.id, 'user-1');

        expect(eventEmitter.emit).toHaveBeenCalledWith('deal.stage-changed', expect.any(Object));
      });

      it('should record stage change activity', async () => {
        const targetStage = pipeline.stages[1];

        await service.moveDealToStage(deal.id, targetStage.id, 'user-1');

        const activities = await service.getActivities(deal.id);
        expect(activities.some(a => a.type === 'stage_change')).toBe(true);
      });
    });

    describe('closeDeal', () => {
      let deal: Deal;

      beforeEach(async () => {
        deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Close Test',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });
      });

      it('should close deal as won', async () => {
        const closed = await service.closeDeal(deal.id, 'won', 'user-1');

        expect(closed?.status).toBe('won');
        expect(closed?.actualCloseDate).toBeDefined();
        expect(eventEmitter.emit).toHaveBeenCalledWith('deal.won', expect.any(Object));
      });

      it('should close deal as lost with reason', async () => {
        const closed = await service.closeDeal(deal.id, 'lost', 'user-1', 'Price too high');

        expect(closed?.status).toBe('lost');
        expect(closed?.lostReason).toBe('Price too high');
        expect(eventEmitter.emit).toHaveBeenCalledWith('deal.lost', expect.any(Object));
      });

      it('should update pipeline stats', async () => {
        await service.closeDeal(deal.id, 'won', 'user-1');

        const updated = await service.getPipeline(pipeline.id);
        expect(updated?.stats.wonDeals).toBe(1);
      });
    });

    describe('reopenDeal', () => {
      it('should reopen closed deal', async () => {
        const deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Reopen Test',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });

        await service.closeDeal(deal.id, 'lost', 'user-1', 'Lost');
        const reopened = await service.reopenDeal(deal.id, 'user-1');

        expect(reopened?.status).toBe('open');
        expect(reopened?.lostReason).toBeUndefined();
        expect(reopened?.actualCloseDate).toBeUndefined();
      });
    });

    describe('deleteDeal', () => {
      it('should delete deal and related data', async () => {
        const deal = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Delete Test',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });

        await service.createTask({
          dealId: deal.id,
          title: 'Follow up',
          type: 'call',
          dueDate: new Date(),
          createdBy: 'user-1',
        });

        await service.deleteDeal(deal.id);

        const found = await service.getDeal(deal.id);
        const tasks = await service.getTasks(deal.id);

        expect(found).toBeNull();
        expect(tasks.length).toBe(0);
      });
    });
  });

  describe('Activities', () => {
    let deal: Deal;

    beforeEach(async () => {
      const pipeline = await service.createPipeline({
        tenantId: 'tenant-1',
        name: 'Activity Test',
        stages: defaultStages,
      });

      deal = await service.createDeal({
        tenantId: 'tenant-1',
        name: 'Activity Deal',
        pipelineId: pipeline.id,
        amount: 5000,
        ownerId: 'user-1',
      });
    });

    describe('recordActivity', () => {
      it('should record activity', async () => {
        const activity = await service.recordActivity({
          dealId: deal.id,
          type: 'note',
          description: 'Called customer',
          createdBy: 'user-1',
        });

        expect(activity.id).toBeDefined();
        expect(activity.type).toBe('note');
      });

      it('should update deal last activity', async () => {
        await service.recordActivity({
          dealId: deal.id,
          type: 'call',
          description: 'Follow up call',
          createdBy: 'user-1',
        });

        const updated = await service.getDeal(deal.id);
        expect(updated?.lastActivityAt).toBeDefined();
      });
    });

    describe('getActivities', () => {
      it('should return activities for deal', async () => {
        await service.recordActivity({
          dealId: deal.id,
          type: 'note',
          description: 'Note 1',
          createdBy: 'user-1',
        });

        await new Promise(r => setTimeout(r, 5));

        await service.recordActivity({
          dealId: deal.id,
          type: 'call',
          description: 'Call 1',
          createdBy: 'user-1',
        });

        const activities = await service.getActivities(deal.id);

        expect(activities.length).toBeGreaterThan(0);
      });

      it('should sort by date descending', async () => {
        await service.recordActivity({
          dealId: deal.id,
          type: 'note',
          description: 'First',
          createdBy: 'user-1',
        });

        await new Promise(r => setTimeout(r, 10));

        await service.recordActivity({
          dealId: deal.id,
          type: 'note',
          description: 'Second',
          createdBy: 'user-1',
        });

        const activities = await service.getActivities(deal.id);

        expect(activities[0].description).toBe('Second');
      });
    });
  });

  describe('Tasks', () => {
    let deal: Deal;

    beforeEach(async () => {
      const pipeline = await service.createPipeline({
        tenantId: 'tenant-1',
        name: 'Task Test',
        stages: defaultStages,
      });

      deal = await service.createDeal({
        tenantId: 'tenant-1',
        name: 'Task Deal',
        pipelineId: pipeline.id,
        amount: 5000,
        ownerId: 'user-1',
      });
    });

    describe('createTask', () => {
      it('should create task', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const task = await service.createTask({
          dealId: deal.id,
          title: 'Follow up call',
          type: 'call',
          dueDate: tomorrow,
          priority: 'high',
          createdBy: 'user-1',
        });

        expect(task.id).toBeDefined();
        expect(task.status).toBe('pending');
        expect(task.priority).toBe('high');
      });

      it('should mark as overdue if past due', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const task = await service.createTask({
          dealId: deal.id,
          title: 'Overdue Task',
          type: 'call',
          dueDate: yesterday,
          createdBy: 'user-1',
        });

        expect(task.status).toBe('overdue');
      });

      it('should update deal next activity', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        await service.createTask({
          dealId: deal.id,
          title: 'Next Task',
          type: 'meeting',
          dueDate: tomorrow,
          createdBy: 'user-1',
        });

        const updated = await service.getDeal(deal.id);
        expect(updated?.nextActivityType).toBe('meeting');
      });
    });

    describe('getTasks', () => {
      it('should return tasks for deal', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        await service.createTask({
          dealId: deal.id,
          title: 'Task 1',
          type: 'call',
          dueDate: tomorrow,
          createdBy: 'user-1',
        });

        const tasks = await service.getTasks(deal.id);

        expect(tasks.length).toBe(1);
      });

      it('should sort by due date', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        await service.createTask({
          dealId: deal.id,
          title: 'Later',
          type: 'call',
          dueDate: nextWeek,
          createdBy: 'user-1',
        });

        await service.createTask({
          dealId: deal.id,
          title: 'Sooner',
          type: 'call',
          dueDate: tomorrow,
          createdBy: 'user-1',
        });

        const tasks = await service.getTasks(deal.id);

        expect(tasks[0].title).toBe('Sooner');
      });
    });

    describe('completeTask', () => {
      it('should complete task', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const task = await service.createTask({
          dealId: deal.id,
          title: 'Complete Me',
          type: 'call',
          dueDate: tomorrow,
          createdBy: 'user-1',
        });

        const completed = await service.completeTask(task.id, 'user-1');

        expect(completed?.status).toBe('completed');
        expect(completed?.completedAt).toBeDefined();
      });

      it('should record activity', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const task = await service.createTask({
          dealId: deal.id,
          title: 'Activity Task',
          type: 'call',
          dueDate: tomorrow,
          createdBy: 'user-1',
        });

        await service.completeTask(task.id, 'user-1');

        const activities = await service.getActivities(deal.id);
        expect(activities.some(a => a.type === 'task')).toBe(true);
      });
    });

    describe('deleteTask', () => {
      it('should delete task', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const task = await service.createTask({
          dealId: deal.id,
          title: 'Delete Me',
          type: 'call',
          dueDate: tomorrow,
          createdBy: 'user-1',
        });

        await service.deleteTask(task.id);

        const tasks = await service.getTasks(deal.id);
        expect(tasks.find(t => t.id === task.id)).toBeUndefined();
      });
    });
  });

  describe('Stats & Forecast', () => {
    let pipeline: Pipeline;

    beforeEach(async () => {
      pipeline = await service.createPipeline({
        tenantId: 'tenant-1',
        name: 'Stats Pipeline',
        stages: defaultStages,
        isDefault: true,
      });
    });

    describe('getStats', () => {
      it('should return tenant stats', async () => {
        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Deal 1',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });

        const deal2 = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Deal 2',
          pipelineId: pipeline.id,
          amount: 3000,
          ownerId: 'user-1',
        });

        await service.closeDeal(deal2.id, 'won', 'user-1');

        const stats = await service.getStats('tenant-1');

        expect(stats.totalDeals).toBe(2);
        expect(stats.openDeals).toBe(1);
        expect(stats.wonDeals).toBe(1);
        expect(stats.totalValue).toBe(8000);
        expect(stats.wonValue).toBe(3000);
      });

      it('should calculate win rate', async () => {
        const deal1 = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Won Deal',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });

        const deal2 = await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Lost Deal',
          pipelineId: pipeline.id,
          amount: 3000,
          ownerId: 'user-1',
        });

        await service.closeDeal(deal1.id, 'won', 'user-1');
        await service.closeDeal(deal2.id, 'lost', 'user-1');

        const stats = await service.getStats('tenant-1');

        expect(stats.winRate).toBe(50);
      });
    });

    describe('getForecast', () => {
      it('should return forecast', async () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Forecast Deal',
          pipelineId: pipeline.id,
          amount: 10000,
          probability: 50,
          expectedCloseDate: nextMonth,
          ownerId: 'user-1',
        });

        const forecast = await service.getForecast('tenant-1');

        expect(forecast.bestCase).toBe(10000);
        expect(forecast.weighted).toBe(5000);
      });

      it('should group by stage', async () => {
        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Stage Deal',
          pipelineId: pipeline.id,
          amount: 5000,
          ownerId: 'user-1',
        });

        const forecast = await service.getForecast('tenant-1');

        expect(forecast.byStage.length).toBeGreaterThan(0);
      });

      it('should group by month', async () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await service.createDeal({
          tenantId: 'tenant-1',
          name: 'Monthly Deal',
          pipelineId: pipeline.id,
          amount: 5000,
          expectedCloseDate: nextMonth,
          ownerId: 'user-1',
        });

        const forecast = await service.getForecast('tenant-1');

        expect(forecast.byMonth.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Deal Priority', () => {
    let pipeline: Pipeline;

    beforeEach(async () => {
      pipeline = await service.createPipeline({
        tenantId: 'tenant-1',
        name: 'Priority Test',
        stages: defaultStages,
      });
    });

    it('should support low priority', async () => {
      const deal = await service.createDeal({
        tenantId: 'tenant-1',
        name: 'Low Priority',
        pipelineId: pipeline.id,
        amount: 1000,
        priority: 'low',
        ownerId: 'user-1',
      });

      expect(deal.priority).toBe('low');
    });

    it('should support urgent priority', async () => {
      const deal = await service.createDeal({
        tenantId: 'tenant-1',
        name: 'Urgent',
        pipelineId: pipeline.id,
        amount: 50000,
        priority: 'urgent',
        ownerId: 'user-1',
      });

      expect(deal.priority).toBe('urgent');
    });

    it('should default to medium priority', async () => {
      const deal = await service.createDeal({
        tenantId: 'tenant-1',
        name: 'Default Priority',
        pipelineId: pipeline.id,
        amount: 5000,
        ownerId: 'user-1',
      });

      expect(deal.priority).toBe('medium');
    });
  });
});
