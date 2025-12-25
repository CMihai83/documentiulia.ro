import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AutomationTemplatesService,
  AutomationTemplate,
  TemplateInstance,
  TemplateCategory,
  TemplateComplexity,
  TemplateVariable,
  TemplateStep,
} from './automation-templates.service';

describe('AutomationTemplatesService', () => {
  let service: AutomationTemplatesService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationTemplatesService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AutomationTemplatesService>(AutomationTemplatesService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('System Templates', () => {
    it('should initialize with system templates', async () => {
      const templates = await service.getTemplates('tenant-1', { includeSystem: true });

      expect(templates.length).toBeGreaterThan(0);
      const systemTemplates = templates.filter(t => t.isSystem);
      expect(systemTemplates.length).toBeGreaterThan(0);
    });

    it('should have finance templates', async () => {
      const templates = await service.getTemplates('tenant-1', { category: 'finance' });

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name.includes('Invoice'))).toBe(true);
    });

    it('should have HR templates', async () => {
      const templates = await service.getTemplates('tenant-1', { category: 'hr' });

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name.includes('Onboarding') || t.name.includes('Leave'))).toBe(true);
    });

    it('should have compliance templates for Romanian ANAF', async () => {
      const templates = await service.getTemplates('tenant-1', { category: 'compliance' });

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name.includes('SAF-T') || t.name.includes('e-Factura'))).toBe(true);
    });

    it('should have sales templates', async () => {
      const templates = await service.getTemplates('tenant-1', { category: 'sales' });

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have operations templates', async () => {
      const templates = await service.getTemplates('tenant-1', { category: 'operations' });

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have integration templates', async () => {
      const templates = await service.getTemplates('tenant-1', { category: 'integrations' });

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have notification templates', async () => {
      const templates = await service.getTemplates('tenant-1', { category: 'notifications' });

      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('Template CRUD', () => {
    describe('getTemplates', () => {
      it('should return templates accessible to tenant', async () => {
        const templates = await service.getTemplates('tenant-1');

        expect(Array.isArray(templates)).toBe(true);
      });

      it('should filter by category', async () => {
        const templates = await service.getTemplates('tenant-1', { category: 'finance' });

        templates.forEach(t => expect(t.category).toBe('finance'));
      });

      it('should filter by complexity', async () => {
        const templates = await service.getTemplates('tenant-1', { complexity: 'simple' });

        templates.forEach(t => expect(t.complexity).toBe('simple'));
      });

      it('should filter by tag', async () => {
        const templates = await service.getTemplates('tenant-1', { tag: 'invoice' });

        templates.forEach(t => expect(t.tags).toContain('invoice'));
      });

      it('should search by name', async () => {
        const templates = await service.getTemplates('tenant-1', { search: 'invoice' });

        templates.forEach(t => {
          const matchesSearch =
            t.name.toLowerCase().includes('invoice') ||
            t.description.toLowerCase().includes('invoice') ||
            t.tags.some(tag => tag.toLowerCase().includes('invoice'));
          expect(matchesSearch).toBe(true);
        });
      });

      it('should exclude system templates when requested', async () => {
        const templates = await service.getTemplates('tenant-1', { includeSystem: false });

        templates.forEach(t => expect(t.isSystem).toBe(false));
      });

      it('should sort by usage count', async () => {
        const templates = await service.getTemplates('tenant-1');

        for (let i = 1; i < templates.length; i++) {
          expect(templates[i - 1].usageCount).toBeGreaterThanOrEqual(templates[i].usageCount);
        }
      });
    });

    describe('getTemplate', () => {
      it('should return template by ID', async () => {
        const templates = await service.getTemplates('tenant-1');
        const template = await service.getTemplate(templates[0].id);

        expect(template).toBeDefined();
        expect(template?.id).toBe(templates[0].id);
      });

      it('should return null for non-existent ID', async () => {
        const template = await service.getTemplate('non-existent');

        expect(template).toBeNull();
      });
    });

    describe('createTemplate', () => {
      it('should create custom template', async () => {
        const template = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Custom Template',
          description: 'My custom automation',
          category: 'custom',
          variables: [
            {
              name: 'threshold',
              type: 'number',
              label: 'Threshold',
              required: true,
              defaultValue: 100,
            },
          ],
          steps: [
            {
              id: 'trigger',
              name: 'Start',
              type: 'trigger',
              config: { type: 'event', event: 'test.event' },
            },
          ],
        });

        expect(template.id).toBeDefined();
        expect(template.name).toBe('Custom Template');
        expect(template.isSystem).toBe(false);
        expect(template.tenantId).toBe('tenant-1');
        expect(eventEmitter.emit).toHaveBeenCalledWith('automation.template.created', { template });
      });

      it('should create template with all options', async () => {
        const template = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Full Template',
          description: 'Complete template',
          category: 'finance',
          complexity: 'complex',
          tags: ['accounting', 'tax'],
          icon: 'calculator',
          variables: [],
          steps: [],
          estimatedTime: '30 min',
          isPublic: true,
        });

        expect(template.complexity).toBe('complex');
        expect(template.tags).toContain('accounting');
        expect(template.icon).toBe('calculator');
        expect(template.estimatedTime).toBe('30 min');
        expect(template.isPublic).toBe(true);
      });

      it('should default complexity to moderate', async () => {
        const template = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Default Complexity',
          description: 'Test',
          category: 'custom',
          variables: [],
          steps: [],
        });

        expect(template.complexity).toBe('moderate');
      });
    });

    describe('updateTemplate', () => {
      let customTemplate: AutomationTemplate;

      beforeEach(async () => {
        customTemplate = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Updatable Template',
          description: 'Original description',
          category: 'custom',
          variables: [],
          steps: [],
        });
      });

      it('should update template fields', async () => {
        const updated = await service.updateTemplate(customTemplate.id, {
          name: 'Updated Name',
          description: 'Updated description',
        });

        expect(updated?.name).toBe('Updated Name');
        expect(updated?.description).toBe('Updated description');
        expect(eventEmitter.emit).toHaveBeenCalledWith('automation.template.updated', expect.any(Object));
      });

      it('should not update system templates', async () => {
        const templates = await service.getTemplates('tenant-1', { includeSystem: true });
        const systemTemplate = templates.find(t => t.isSystem);

        const result = await service.updateTemplate(systemTemplate!.id, {
          name: 'Hacked Name',
        });

        expect(result).toBeNull();
      });

      it('should return null for non-existent template', async () => {
        const result = await service.updateTemplate('non-existent', { name: 'Test' });

        expect(result).toBeNull();
      });

      it('should update timestamp on update', async () => {
        const original = customTemplate.updatedAt;
        await new Promise(r => setTimeout(r, 5));

        const updated = await service.updateTemplate(customTemplate.id, { name: 'New' });

        expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(original.getTime());
      });
    });

    describe('deleteTemplate', () => {
      it('should delete custom template', async () => {
        const template = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'To Delete',
          description: 'Will be deleted',
          category: 'custom',
          variables: [],
          steps: [],
        });

        await service.deleteTemplate(template.id);

        const result = await service.getTemplate(template.id);
        expect(result).toBeNull();
        expect(eventEmitter.emit).toHaveBeenCalledWith('automation.template.deleted', { templateId: template.id });
      });

      it('should not delete system templates', async () => {
        const templates = await service.getTemplates('tenant-1', { includeSystem: true });
        const systemTemplate = templates.find(t => t.isSystem);

        await service.deleteTemplate(systemTemplate!.id);

        const result = await service.getTemplate(systemTemplate!.id);
        expect(result).not.toBeNull();
      });
    });

    describe('duplicateTemplate', () => {
      it('should duplicate template', async () => {
        const templates = await service.getTemplates('tenant-1');
        const original = templates[0];

        const duplicate = await service.duplicateTemplate(
          original.id,
          'Duplicated Template',
          'tenant-2',
          'user-2',
        );

        expect(duplicate).not.toBeNull();
        expect(duplicate?.id).not.toBe(original.id);
        expect(duplicate?.name).toBe('Duplicated Template');
        expect(duplicate?.tenantId).toBe('tenant-2');
        expect(duplicate?.createdBy).toBe('user-2');
        expect(duplicate?.isPublic).toBe(false);
        expect(duplicate?.steps.length).toBe(original.steps.length);
      });

      it('should return null for non-existent template', async () => {
        const result = await service.duplicateTemplate(
          'non-existent',
          'Copy',
          'tenant-1',
          'user-1',
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('Template Instances', () => {
    let template: AutomationTemplate;

    beforeEach(async () => {
      const templates = await service.getTemplates('tenant-1', { includeSystem: true });
      template = templates.find(t => t.variables.length > 0)!;
    });

    describe('createInstance', () => {
      it('should create instance with variables', async () => {
        const variables: Record<string, any> = {};
        template.variables.forEach(v => {
          variables[v.name] = v.defaultValue;
        });

        const instance = await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'My Instance',
          variables,
        });

        expect(instance.id).toBeDefined();
        expect(instance.templateId).toBe(template.id);
        expect(instance.status).toBe('draft');
        expect(eventEmitter.emit).toHaveBeenCalledWith('automation.template.instance.created', { instance });
      });

      it('should throw for missing required variables', async () => {
        const templateWithRequired = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'With Required',
          description: 'Test',
          category: 'custom',
          variables: [
            {
              name: 'required_var',
              type: 'string',
              label: 'Required',
              required: true,
            },
          ],
          steps: [],
        });

        await expect(
          service.createInstance({
            templateId: templateWithRequired.id,
            tenantId: 'tenant-1',
            createdBy: 'user-1',
            name: 'Bad Instance',
            variables: {},
          }),
        ).rejects.toThrow("Required variable 'required_var' is missing");
      });

      it('should throw for non-existent template', async () => {
        await expect(
          service.createInstance({
            templateId: 'non-existent',
            tenantId: 'tenant-1',
            createdBy: 'user-1',
            name: 'Bad Instance',
            variables: {},
          }),
        ).rejects.toThrow('Template not found');
      });

      it('should increment template usage count', async () => {
        const originalCount = template.usageCount;
        const variables: Record<string, any> = {};
        template.variables.forEach(v => {
          variables[v.name] = v.defaultValue;
        });

        await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Usage Test',
          variables,
        });

        const updatedTemplate = await service.getTemplate(template.id);
        expect(updatedTemplate?.usageCount).toBe(originalCount + 1);
      });
    });

    describe('getInstances', () => {
      beforeEach(async () => {
        const variables: Record<string, any> = {};
        template.variables.forEach(v => {
          variables[v.name] = v.defaultValue;
        });

        await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-instances',
          createdBy: 'user-1',
          name: 'Instance 1',
          variables,
        });

        await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-instances',
          createdBy: 'user-1',
          name: 'Instance 2',
          description: 'Searchable description',
          variables,
        });
      });

      it('should return instances for tenant', async () => {
        const instances = await service.getInstances('tenant-instances');

        expect(instances.length).toBe(2);
      });

      it('should filter by template ID', async () => {
        const instances = await service.getInstances('tenant-instances', {
          templateId: template.id,
        });

        instances.forEach(i => expect(i.templateId).toBe(template.id));
      });

      it('should filter by status', async () => {
        const instances = await service.getInstances('tenant-instances', {
          status: 'draft',
        });

        instances.forEach(i => expect(i.status).toBe('draft'));
      });

      it('should search by name or description', async () => {
        const instances = await service.getInstances('tenant-instances', {
          search: 'searchable',
        });

        expect(instances.length).toBe(1);
        expect(instances[0].description).toContain('Searchable');
      });

      it('should sort by creation date descending', async () => {
        const instances = await service.getInstances('tenant-instances');

        for (let i = 1; i < instances.length; i++) {
          expect(instances[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
            instances[i].createdAt.getTime(),
          );
        }
      });
    });

    describe('getInstance', () => {
      it('should return instance by ID', async () => {
        const variables: Record<string, any> = {};
        template.variables.forEach(v => {
          variables[v.name] = v.defaultValue;
        });

        const created = await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Get Test',
          variables,
        });

        const instance = await service.getInstance(created.id);

        expect(instance?.id).toBe(created.id);
      });

      it('should return null for non-existent ID', async () => {
        const instance = await service.getInstance('non-existent');

        expect(instance).toBeNull();
      });
    });

    describe('updateInstance', () => {
      let instance: TemplateInstance;

      beforeEach(async () => {
        const variables: Record<string, any> = {};
        template.variables.forEach(v => {
          variables[v.name] = v.defaultValue;
        });

        instance = await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Update Test',
          variables,
        });
      });

      it('should update instance fields', async () => {
        const updated = await service.updateInstance(instance.id, {
          name: 'New Name',
          description: 'New description',
        });

        expect(updated?.name).toBe('New Name');
        expect(updated?.description).toBe('New description');
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'automation.template.instance.updated',
          expect.any(Object),
        );
      });

      it('should update status', async () => {
        const updated = await service.updateInstance(instance.id, {
          status: 'active',
        });

        expect(updated?.status).toBe('active');
      });

      it('should update workflow/rule/trigger IDs', async () => {
        const updated = await service.updateInstance(instance.id, {
          workflowId: 'wf-123',
          ruleId: 'rule-456',
          triggerId: 'trig-789',
        });

        expect(updated?.workflowId).toBe('wf-123');
        expect(updated?.ruleId).toBe('rule-456');
        expect(updated?.triggerId).toBe('trig-789');
      });

      it('should return null for non-existent instance', async () => {
        const result = await service.updateInstance('non-existent', { name: 'Test' });

        expect(result).toBeNull();
      });
    });

    describe('deleteInstance', () => {
      it('should delete instance', async () => {
        const variables: Record<string, any> = {};
        template.variables.forEach(v => {
          variables[v.name] = v.defaultValue;
        });

        const instance = await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Delete Test',
          variables,
        });

        await service.deleteInstance(instance.id);

        const result = await service.getInstance(instance.id);
        expect(result).toBeNull();
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'automation.template.instance.deleted',
          { instanceId: instance.id },
        );
      });
    });

    describe('activateInstance', () => {
      it('should set instance status to active', async () => {
        const variables: Record<string, any> = {};
        template.variables.forEach(v => {
          variables[v.name] = v.defaultValue;
        });

        const instance = await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Activate Test',
          variables,
        });

        const activated = await service.activateInstance(instance.id);

        expect(activated?.status).toBe('active');
      });
    });

    describe('deactivateInstance', () => {
      it('should set instance status to paused', async () => {
        const variables: Record<string, any> = {};
        template.variables.forEach(v => {
          variables[v.name] = v.defaultValue;
        });

        const instance = await service.createInstance({
          templateId: template.id,
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Deactivate Test',
          variables,
        });

        await service.activateInstance(instance.id);
        const deactivated = await service.deactivateInstance(instance.id);

        expect(deactivated?.status).toBe('paused');
      });
    });
  });

  describe('Template Preview', () => {
    let template: AutomationTemplate;

    beforeEach(async () => {
      template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Preview Test',
        description: 'Test preview',
        category: 'custom',
        variables: [
          {
            name: 'amount',
            type: 'number',
            label: 'Amount',
            required: true,
          },
          {
            name: 'recipient',
            type: 'string',
            label: 'Recipient',
            required: false,
          },
        ],
        steps: [
          {
            id: 'step1',
            name: 'Check Amount',
            type: 'condition',
            config: {
              field: 'value',
              operator: 'gte',
              value: '{{amount}}',
            },
          },
          {
            id: 'step2',
            name: 'Send Notification',
            type: 'action',
            config: {
              actionId: 'send_email',
              to: '{{recipient}}',
              message: 'Amount is {{amount}}',
            },
          },
        ],
      });
    });

    it('should preview template with resolved variables', async () => {
      const preview = await service.previewTemplate(template.id, {
        amount: 1000,
        recipient: 'test@example.com',
      });

      expect(preview.steps.length).toBe(2);
      expect(preview.steps[0].resolvedConfig.value).toBe('1000');
      expect(preview.steps[1].resolvedConfig.to).toBe('test@example.com');
      expect(preview.steps[1].resolvedConfig.message).toBe('Amount is 1000');
      expect(preview.warnings.length).toBe(0);
    });

    it('should warn about missing required variables', async () => {
      const preview = await service.previewTemplate(template.id, {
        recipient: 'test@example.com',
      });

      expect(preview.warnings).toContain('Missing required variable: amount');
    });

    it('should keep placeholders for unresolved variables', async () => {
      const preview = await service.previewTemplate(template.id, {
        amount: 500,
      });

      expect(preview.steps[1].resolvedConfig.to).toBe('{{recipient}}');
    });

    it('should throw for non-existent template', async () => {
      await expect(
        service.previewTemplate('non-existent', {}),
      ).rejects.toThrow('Template not found');
    });
  });

  describe('Template Ratings', () => {
    let template: AutomationTemplate;

    beforeEach(async () => {
      template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Rating Test',
        description: 'Test ratings',
        category: 'custom',
        variables: [],
        steps: [],
      });
    });

    it('should rate template', async () => {
      const rated = await service.rateTemplate(template.id, 5);

      expect(rated?.rating).toBe(5);
      expect(rated?.ratingCount).toBe(1);
    });

    it('should calculate average rating', async () => {
      await service.rateTemplate(template.id, 5);
      await service.rateTemplate(template.id, 4);
      const rated = await service.rateTemplate(template.id, 3);

      expect(rated?.ratingCount).toBe(3);
      expect(rated?.rating).toBe(4); // (5+4+3)/3 = 4
    });

    it('should round rating to one decimal', async () => {
      await service.rateTemplate(template.id, 5);
      await service.rateTemplate(template.id, 4);
      const rated = await service.rateTemplate(template.id, 4);

      expect(rated?.rating).toBe(4.3); // (5+4+4)/3 = 4.33 -> 4.3
    });

    it('should return null for non-existent template', async () => {
      const result = await service.rateTemplate('non-existent', 5);

      expect(result).toBeNull();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create some custom templates
      const customTemplate = await service.createTemplate({
        tenantId: 'tenant-stats',
        createdBy: 'user-1',
        name: 'Stats Template',
        description: 'For stats',
        category: 'custom',
        variables: [],
        steps: [],
      });

      // Create some instances
      await service.createInstance({
        templateId: customTemplate.id,
        tenantId: 'tenant-stats',
        createdBy: 'user-1',
        name: 'Active Instance',
        variables: {},
      });

      const inst = await service.createInstance({
        templateId: customTemplate.id,
        tenantId: 'tenant-stats',
        createdBy: 'user-1',
        name: 'Another Instance',
        variables: {},
      });

      await service.activateInstance(inst.id);
    });

    describe('getStats', () => {
      it('should return comprehensive stats', async () => {
        const stats = await service.getStats('tenant-stats');

        expect(stats.totalTemplates).toBeGreaterThan(0);
        expect(stats.systemTemplates).toBeGreaterThan(0);
        expect(stats.customTemplates).toBeGreaterThanOrEqual(1);
        expect(stats.totalInstances).toBe(2);
        expect(stats.activeInstances).toBe(1);
        expect(stats.byCategory).toBeDefined();
        expect(stats.topTemplates).toBeDefined();
      });

      it('should group by category', async () => {
        const stats = await service.getStats('tenant-stats');

        expect(stats.byCategory['finance']).toBeGreaterThan(0);
        expect(stats.byCategory['hr']).toBeGreaterThan(0);
        expect(stats.byCategory['compliance']).toBeGreaterThan(0);
      });

      it('should return top templates by usage', async () => {
        const stats = await service.getStats('tenant-stats');

        expect(stats.topTemplates.length).toBeLessThanOrEqual(5);
        stats.topTemplates.forEach(t => {
          expect(t.id).toBeDefined();
          expect(t.name).toBeDefined();
          expect(typeof t.usageCount).toBe('number');
        });
      });
    });

    describe('getCategories', () => {
      it('should return all categories with counts', async () => {
        const categories = await service.getCategories();

        expect(categories.length).toBe(8);

        const financeCategory = categories.find(c => c.id === 'finance');
        expect(financeCategory?.name).toBe('Finance');
        expect(financeCategory?.count).toBeGreaterThan(0);
      });

      it('should include all category types', async () => {
        const categories = await service.getCategories();
        const categoryIds = categories.map(c => c.id);

        expect(categoryIds).toContain('finance');
        expect(categoryIds).toContain('hr');
        expect(categoryIds).toContain('sales');
        expect(categoryIds).toContain('operations');
        expect(categoryIds).toContain('compliance');
        expect(categoryIds).toContain('notifications');
        expect(categoryIds).toContain('integrations');
        expect(categoryIds).toContain('custom');
      });
    });
  });

  describe('Variable Types', () => {
    it('should support string variables', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'String Var',
        description: 'Test',
        category: 'custom',
        variables: [
          { name: 'text', type: 'string', label: 'Text', required: true },
        ],
        steps: [],
      });

      const instance = await service.createInstance({
        templateId: template.id,
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'String Test',
        variables: { text: 'hello world' },
      });

      expect(instance.variables.text).toBe('hello world');
    });

    it('should support number variables', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Number Var',
        description: 'Test',
        category: 'custom',
        variables: [
          { name: 'amount', type: 'number', label: 'Amount', required: true },
        ],
        steps: [],
      });

      const instance = await service.createInstance({
        templateId: template.id,
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Number Test',
        variables: { amount: 1000 },
      });

      expect(instance.variables.amount).toBe(1000);
    });

    it('should support boolean variables', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Boolean Var',
        description: 'Test',
        category: 'custom',
        variables: [
          { name: 'enabled', type: 'boolean', label: 'Enabled', required: true },
        ],
        steps: [],
      });

      const instance = await service.createInstance({
        templateId: template.id,
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Boolean Test',
        variables: { enabled: true },
      });

      expect(instance.variables.enabled).toBe(true);
    });

    it('should support select variables', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Select Var',
        description: 'Test',
        category: 'custom',
        variables: [
          {
            name: 'priority',
            type: 'select',
            label: 'Priority',
            required: true,
            options: [
              { value: 'low', label: 'Low' },
              { value: 'high', label: 'High' },
            ],
          },
        ],
        steps: [],
      });

      const instance = await service.createInstance({
        templateId: template.id,
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Select Test',
        variables: { priority: 'high' },
      });

      expect(instance.variables.priority).toBe('high');
    });

    it('should support array variables', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Array Var',
        description: 'Test',
        category: 'custom',
        variables: [
          { name: 'tags', type: 'array', label: 'Tags', required: true },
        ],
        steps: [],
      });

      const instance = await service.createInstance({
        templateId: template.id,
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Array Test',
        variables: { tags: ['finance', 'accounting'] },
      });

      expect(instance.variables.tags).toEqual(['finance', 'accounting']);
    });

    it('should support object variables', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Object Var',
        description: 'Test',
        category: 'custom',
        variables: [
          { name: 'config', type: 'object', label: 'Config', required: true },
        ],
        steps: [],
      });

      const instance = await service.createInstance({
        templateId: template.id,
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Object Test',
        variables: { config: { key: 'value', nested: { a: 1 } } },
      });

      expect(instance.variables.config.key).toBe('value');
      expect(instance.variables.config.nested.a).toBe(1);
    });
  });

  describe('Step Types', () => {
    it('should support trigger steps', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Trigger Step',
        description: 'Test',
        category: 'custom',
        variables: [],
        steps: [
          {
            id: 'trigger',
            name: 'Event Trigger',
            type: 'trigger',
            config: { type: 'event', event: 'invoice.created' },
            next: ['action'],
          },
        ],
      });

      expect(template.steps[0].type).toBe('trigger');
    });

    it('should support condition steps', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Condition Step',
        description: 'Test',
        category: 'custom',
        variables: [],
        steps: [
          {
            id: 'condition',
            name: 'Check Amount',
            type: 'condition',
            config: { field: 'amount', operator: 'gt', value: 100 },
            next: ['yes', 'no'],
          },
        ],
      });

      expect(template.steps[0].type).toBe('condition');
    });

    it('should support action steps', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Action Step',
        description: 'Test',
        category: 'custom',
        variables: [],
        steps: [
          {
            id: 'action',
            name: 'Send Email',
            type: 'action',
            config: { actionId: 'send_email', to: 'user@example.com' },
          },
        ],
      });

      expect(template.steps[0].type).toBe('action');
    });

    it('should support delay steps', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Delay Step',
        description: 'Test',
        category: 'custom',
        variables: [],
        steps: [
          {
            id: 'delay',
            name: 'Wait 1 Hour',
            type: 'delay',
            config: { duration: '1h' },
            next: ['action'],
          },
        ],
      });

      expect(template.steps[0].type).toBe('delay');
    });

    it('should support loop steps', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Loop Step',
        description: 'Test',
        category: 'custom',
        variables: [],
        steps: [
          {
            id: 'loop',
            name: 'Process Items',
            type: 'loop',
            config: { collection: 'items' },
            next: ['process'],
          },
        ],
      });

      expect(template.steps[0].type).toBe('loop');
    });

    it('should support parallel steps', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Parallel Step',
        description: 'Test',
        category: 'custom',
        variables: [],
        steps: [
          {
            id: 'parallel',
            name: 'Parallel Tasks',
            type: 'parallel',
            config: {},
            next: ['task1', 'task2', 'task3'],
          },
        ],
      });

      expect(template.steps[0].type).toBe('parallel');
    });
  });

  describe('Complexity Levels', () => {
    it('should support simple complexity', async () => {
      const templates = await service.getTemplates('tenant-1', { complexity: 'simple' });

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.complexity).toBe('simple'));
    });

    it('should support moderate complexity', async () => {
      const templates = await service.getTemplates('tenant-1', { complexity: 'moderate' });

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.complexity).toBe('moderate'));
    });

    it('should support complex complexity', async () => {
      const templates = await service.getTemplates('tenant-1', { complexity: 'complex' });

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.complexity).toBe('complex'));
    });
  });

  describe('Romanian Compliance Templates', () => {
    it('should have ANAF SAF-T D406 template', async () => {
      const templates = await service.getTemplates('tenant-1', { tag: 'd406' });

      expect(templates.length).toBeGreaterThan(0);
      const saftTemplate = templates.find(t => t.name.includes('SAF-T'));
      expect(saftTemplate).toBeDefined();
      expect(saftTemplate?.tags).toContain('anaf');
    });

    it('should have e-Factura B2B template', async () => {
      const templates = await service.getTemplates('tenant-1', { tag: 'e-factura' });

      expect(templates.length).toBeGreaterThan(0);
      const efacturaTemplate = templates.find(t => t.name.includes('e-Factura'));
      expect(efacturaTemplate).toBeDefined();
      expect(efacturaTemplate?.category).toBe('compliance');
    });

    it('should have Romanian-specific tags', async () => {
      const templates = await service.getTemplates('tenant-1', { tag: 'romania' });

      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Tenancy', () => {
    it('should isolate custom templates by tenant', async () => {
      await service.createTemplate({
        tenantId: 'tenant-A',
        createdBy: 'user-a',
        name: 'Tenant A Template',
        description: 'Private',
        category: 'custom',
        variables: [],
        steps: [],
        isPublic: false,
      });

      await service.createTemplate({
        tenantId: 'tenant-B',
        createdBy: 'user-b',
        name: 'Tenant B Template',
        description: 'Private',
        category: 'custom',
        variables: [],
        steps: [],
        isPublic: false,
      });

      const templatesA = await service.getTemplates('tenant-A', { includeSystem: false });
      const templatesB = await service.getTemplates('tenant-B', { includeSystem: false });

      expect(templatesA.some(t => t.name === 'Tenant A Template')).toBe(true);
      expect(templatesA.some(t => t.name === 'Tenant B Template')).toBe(false);

      expect(templatesB.some(t => t.name === 'Tenant B Template')).toBe(true);
      expect(templatesB.some(t => t.name === 'Tenant A Template')).toBe(false);
    });

    it('should share public templates across tenants', async () => {
      await service.createTemplate({
        tenantId: 'tenant-A',
        createdBy: 'user-a',
        name: 'Shared Template',
        description: 'Public',
        category: 'custom',
        variables: [],
        steps: [],
        isPublic: true,
      });

      const templatesB = await service.getTemplates('tenant-B', { includeSystem: false });

      expect(templatesB.some(t => t.name === 'Shared Template')).toBe(true);
    });

    it('should isolate instances by tenant', async () => {
      // Create a template without required variables
      const template = await service.createTemplate({
        tenantId: 'tenant-shared',
        createdBy: 'user-shared',
        name: 'Shared Template',
        description: 'For multi-tenant test',
        category: 'custom',
        variables: [],
        steps: [],
        isPublic: true,
      });

      await service.createInstance({
        templateId: template.id,
        tenantId: 'tenant-isolated-A',
        createdBy: 'user-a',
        name: 'Tenant A Instance',
        variables: {},
      });

      await service.createInstance({
        templateId: template.id,
        tenantId: 'tenant-isolated-B',
        createdBy: 'user-b',
        name: 'Tenant B Instance',
        variables: {},
      });

      const instancesA = await service.getInstances('tenant-isolated-A');
      const instancesB = await service.getInstances('tenant-isolated-B');

      expect(instancesA.length).toBe(1);
      expect(instancesA[0].name).toBe('Tenant A Instance');

      expect(instancesB.length).toBe(1);
      expect(instancesB[0].name).toBe('Tenant B Instance');
    });
  });
});
