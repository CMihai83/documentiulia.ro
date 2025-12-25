import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  DocumentTemplateService,
  TemplateType,
  TemplateStatus,
  OutputFormat,
  VariableType,
} from './document-template.service';

describe('DocumentTemplateService', () => {
  let service: DocumentTemplateService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentTemplateService, EventEmitter2],
    }).compile();

    service = module.get<DocumentTemplateService>(DocumentTemplateService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('System Templates', () => {
    it('should initialize with system templates', () => {
      const templates = service.getAllTemplates({ isSystem: true });
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have invoice template', () => {
      const templates = service.getAllTemplates({ type: 'INVOICE', isSystem: true });
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have contract template', () => {
      const templates = service.getAllTemplates({ type: 'CONTRACT', isSystem: true });
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have receipt template', () => {
      const templates = service.getAllTemplates({ type: 'RECEIPT', isSystem: true });
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have active status for system templates', () => {
      const templates = service.getAllTemplates({ isSystem: true });
      expect(templates.every(t => t.status === 'ACTIVE')).toBe(true);
    });
  });

  describe('Template Creation', () => {
    it('should create a template', () => {
      const template = service.createTemplate({
        name: 'Test Template',
        nameRo: 'Șablon Test',
        description: 'Test description',
        descriptionRo: 'Descriere test',
        type: 'CUSTOM',
        content: { body: '<p>Hello {{name}}</p>', language: 'EN' },
        variables: [
          { name: 'name', label: 'Name', labelRo: 'Nume', type: 'STRING', required: true },
        ],
        createdBy: 'user-1',
      });

      expect(template.id).toContain('template-');
      expect(template.name).toBe('Test Template');
      expect(template.status).toBe('DRAFT');
      expect(template.version).toBe(1);
    });

    it('should create template with sections', () => {
      const template = service.createTemplate({
        name: 'With Sections',
        nameRo: 'Cu Secțiuni',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'LETTER',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        sections: [
          { id: 'sec1', name: 'Header', nameRo: 'Antet', type: 'STATIC', content: '', order: 1, isVisible: true },
          { id: 'sec2', name: 'Body', nameRo: 'Corp', type: 'STATIC', content: '', order: 2, isVisible: true },
        ],
        createdBy: 'user-1',
      });

      expect(template.sections.length).toBe(2);
    });

    it('should create template with custom styling', () => {
      const template = service.createTemplate({
        name: 'Styled Template',
        nameRo: 'Șablon Stilizat',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'REPORT',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        styling: {
          primaryColor: '#FF0000',
          fontSize: 14,
          pageSize: 'A3',
        },
        createdBy: 'user-1',
      });

      expect(template.styling.primaryColor).toBe('#FF0000');
      expect(template.styling.fontSize).toBe(14);
      expect(template.styling.pageSize).toBe('A3');
    });

    it('should create template with tenant', () => {
      const template = service.createTemplate({
        name: 'Tenant Template',
        nameRo: 'Șablon Tenant',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      expect(template.tenantId).toBe('tenant-1');
    });

    it('should initialize version history', () => {
      const template = service.createTemplate({
        name: 'Version Test',
        nameRo: 'Test Versiune',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const versions = service.getTemplateVersions(template.id);
      expect(versions.length).toBe(1);
      expect(versions[0].version).toBe(1);
    });
  });

  describe('Template Retrieval', () => {
    it('should get template by id', () => {
      const created = service.createTemplate({
        name: 'Get Test',
        nameRo: 'Test Get',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const template = service.getTemplate(created.id);
      expect(template.id).toBe(created.id);
    });

    it('should throw NotFoundException for invalid id', () => {
      expect(() => service.getTemplate('invalid-id')).toThrow(NotFoundException);
    });

    it('should get all templates', () => {
      const templates = service.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should filter by type', () => {
      service.createTemplate({
        name: 'Quote Template',
        nameRo: 'Șablon Ofertă',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'QUOTE',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const templates = service.getAllTemplates({ type: 'QUOTE' });
      expect(templates.every(t => t.type === 'QUOTE')).toBe(true);
    });

    it('should filter by status', () => {
      const templates = service.getAllTemplates({ status: 'ACTIVE' });
      expect(templates.every(t => t.status === 'ACTIVE')).toBe(true);
    });

    it('should filter by category', () => {
      const templates = service.getAllTemplates({ category: 'Invoicing' });
      expect(templates.every(t => t.metadata.category === 'Invoicing')).toBe(true);
    });

    it('should filter by tenant including system templates', () => {
      service.createTemplate({
        name: 'Tenant Specific',
        nameRo: 'Specific Tenant',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
        tenantId: 'filter-tenant',
      });

      const templates = service.getAllTemplates({ tenantId: 'filter-tenant' });
      const hasSystem = templates.some(t => t.isSystem);
      const hasTenant = templates.some(t => t.tenantId === 'filter-tenant');

      expect(hasSystem).toBe(true);
      expect(hasTenant).toBe(true);
    });
  });

  describe('Template Updates', () => {
    it('should update template', () => {
      const created = service.createTemplate({
        name: 'Original',
        nameRo: 'Original',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const updated = service.updateTemplate(created.id, { name: 'Updated' }, 'user-1');

      expect(updated.name).toBe('Updated');
    });

    it('should not modify system templates', () => {
      const systemTemplates = service.getAllTemplates({ isSystem: true });

      expect(() => service.updateTemplate(systemTemplates[0].id, { name: 'Hacked' }, 'user-1')).toThrow(BadRequestException);
    });

    it('should preserve immutable fields', () => {
      const created = service.createTemplate({
        name: 'Preserve Test',
        nameRo: 'Test Păstrare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'original-user',
      });

      const updated = service.updateTemplate(created.id, { createdBy: 'hacker' } as any, 'user-1');

      expect(updated.createdBy).toBe('original-user');
    });
  });

  describe('Template Publishing', () => {
    it('should publish template', () => {
      const created = service.createTemplate({
        name: 'Publish Test',
        nameRo: 'Test Publicare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const published = service.publishTemplate(created.id, 'Initial release', 'user-1');

      expect(published.status).toBe('ACTIVE');
      expect(published.publishedAt).toBeInstanceOf(Date);
    });

    it('should increment version on re-publish', () => {
      const created = service.createTemplate({
        name: 'Version Increment',
        nameRo: 'Incrementare Versiune',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(created.id, 'v1', 'user-1');
      const v2 = service.publishTemplate(created.id, 'v2', 'user-1');

      expect(v2.version).toBe(2);
    });

    it('should add version to history', () => {
      const created = service.createTemplate({
        name: 'History Test',
        nameRo: 'Test Istoric',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(created.id, 'Published', 'user-1');

      const versions = service.getTemplateVersions(created.id);
      expect(versions.length).toBe(2);
    });
  });

  describe('Template Archiving & Deletion', () => {
    it('should archive template', () => {
      const created = service.createTemplate({
        name: 'Archive Test',
        nameRo: 'Test Arhivare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const archived = service.archiveTemplate(created.id);

      expect(archived.status).toBe('ARCHIVED');
    });

    it('should not archive system templates', () => {
      const systemTemplates = service.getAllTemplates({ isSystem: true });

      expect(() => service.archiveTemplate(systemTemplates[0].id)).toThrow(BadRequestException);
    });

    it('should delete template', () => {
      const created = service.createTemplate({
        name: 'Delete Test',
        nameRo: 'Test Ștergere',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.deleteTemplate(created.id);

      expect(() => service.getTemplate(created.id)).toThrow(NotFoundException);
    });

    it('should not delete system templates', () => {
      const systemTemplates = service.getAllTemplates({ isSystem: true });

      expect(() => service.deleteTemplate(systemTemplates[0].id)).toThrow(BadRequestException);
    });

    it('should throw when deleting non-existent template', () => {
      expect(() => service.deleteTemplate('non-existent')).toThrow(NotFoundException);
    });
  });

  describe('Template Cloning', () => {
    it('should clone template', () => {
      const original = service.createTemplate({
        name: 'Original',
        nameRo: 'Original',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'INVOICE',
        content: { body: 'Content', language: 'EN' },
        variables: [
          { name: 'test', label: 'Test', labelRo: 'Test', type: 'STRING', required: true },
        ],
        createdBy: 'user-1',
      });

      const cloned = service.cloneTemplate(original.id, 'Cloned', 'Clonat', 'user-2');

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe('Cloned');
      expect(cloned.type).toBe(original.type);
      expect(cloned.variables.length).toBe(original.variables.length);
      expect(cloned.createdBy).toBe('user-2');
    });

    it('should clone system template', () => {
      const systemTemplates = service.getAllTemplates({ isSystem: true });
      const cloned = service.cloneTemplate(systemTemplates[0].id, 'Custom Invoice', 'Factură Personalizată', 'user-1');

      expect(cloned.isSystem).toBe(false);
      expect(cloned.status).toBe('DRAFT');
    });
  });

  describe('Version Management', () => {
    it('should get template versions', () => {
      const template = service.createTemplate({
        name: 'Versions',
        nameRo: 'Versiuni',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const versions = service.getTemplateVersions(template.id);
      expect(versions.length).toBeGreaterThanOrEqual(1);
    });

    it('should get specific version', () => {
      const template = service.createTemplate({
        name: 'Specific Version',
        nameRo: 'Versiune Specifică',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'v1 content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const version = service.getTemplateVersion(template.id, 1);
      expect(version?.version).toBe(1);
    });

    it('should return undefined for non-existent version', () => {
      const template = service.createTemplate({
        name: 'Non-existent',
        nameRo: 'Inexistent',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      const version = service.getTemplateVersion(template.id, 999);
      expect(version).toBeUndefined();
    });

    it('should restore version', () => {
      const template = service.createTemplate({
        name: 'Restore Test',
        nameRo: 'Test Restaurare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Original content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.updateTemplate(template.id, { content: { body: 'Modified', language: 'EN' } }, 'user-1');
      service.publishTemplate(template.id, 'Modified version', 'user-1');

      const restored = service.restoreVersion(template.id, 1, 'user-1');

      expect(restored.content.body).toBe('Original content');
    });

    it('should throw for non-existent version restore', () => {
      const template = service.createTemplate({
        name: 'Restore Error',
        nameRo: 'Eroare Restaurare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      expect(() => service.restoreVersion(template.id, 999, 'user-1')).toThrow(NotFoundException);
    });
  });

  describe('Document Generation', () => {
    it('should render document', async () => {
      const template = service.createTemplate({
        name: 'Render Test',
        nameRo: 'Test Randare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: '<p>Hello {{name}}</p>', language: 'EN' },
        variables: [
          { name: 'name', label: 'Name', labelRo: 'Nume', type: 'STRING', required: true },
        ],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      const document = await service.renderDocument(
        template.id,
        { name: 'World' },
        { format: 'HTML', language: 'EN' },
        'user-1',
      );

      expect(document.id).toContain('doc-');
      expect(document.content).toContain('Hello World');
    });

    it('should throw for inactive template', async () => {
      const template = service.createTemplate({
        name: 'Inactive',
        nameRo: 'Inactiv',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      await expect(
        service.renderDocument(template.id, {}, { format: 'PDF', language: 'EN' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for unsupported format', async () => {
      const template = service.createTemplate({
        name: 'Format Test',
        nameRo: 'Test Format',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        outputFormats: ['PDF'],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      await expect(
        service.renderDocument(template.id, {}, { format: 'XML', language: 'EN' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate required variables', async () => {
      const template = service.createTemplate({
        name: 'Validation Test',
        nameRo: 'Test Validare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: '{{required}}', language: 'EN' },
        variables: [
          { name: 'required', label: 'Required', labelRo: 'Obligatoriu', type: 'STRING', required: true },
        ],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      await expect(
        service.renderDocument(template.id, {}, { format: 'HTML', language: 'EN' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process conditional content', async () => {
      const template = service.createTemplate({
        name: 'Conditional',
        nameRo: 'Condițional',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: '{{#if showMessage}}Visible{{/if}}', language: 'EN' },
        variables: [
          { name: 'showMessage', label: 'Show', labelRo: 'Arată', type: 'BOOLEAN', required: false },
        ],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      const docWithTrue = await service.renderDocument(
        template.id,
        { showMessage: true },
        { format: 'HTML', language: 'EN' },
        'user-1',
      );

      const docWithFalse = await service.renderDocument(
        template.id,
        { showMessage: false },
        { format: 'HTML', language: 'EN' },
        'user-1',
      );

      expect(docWithTrue.content).toContain('Visible');
      expect(docWithFalse.content).not.toContain('Visible');
    });

    it('should process loops', async () => {
      const template = service.createTemplate({
        name: 'Loop Test',
        nameRo: 'Test Buclă',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: '{{#each items}}<li>{{this.name}}</li>{{/each}}', language: 'EN' },
        variables: [
          { name: 'items', label: 'Items', labelRo: 'Articole', type: 'LIST', required: true },
        ],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      const document = await service.renderDocument(
        template.id,
        { items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
        { format: 'HTML', language: 'EN' },
        'user-1',
      );

      expect(document.content).toContain('<li>A</li>');
      expect(document.content).toContain('<li>B</li>');
      expect(document.content).toContain('<li>C</li>');
    });

    it('should apply date filter', async () => {
      const template = service.createTemplate({
        name: 'Date Filter',
        nameRo: 'Filtru Dată',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: '{{date | date}}', language: 'EN' },
        variables: [
          { name: 'date', label: 'Date', labelRo: 'Dată', type: 'DATE', required: true },
        ],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      const document = await service.renderDocument(
        template.id,
        { date: new Date('2025-01-15') },
        { format: 'HTML', language: 'EN' },
        'user-1',
      );

      expect(document.content).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should apply currency filter', async () => {
      const template = service.createTemplate({
        name: 'Currency Filter',
        nameRo: 'Filtru Monedă',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: '{{amount | currency}}', language: 'EN' },
        variables: [
          { name: 'amount', label: 'Amount', labelRo: 'Sumă', type: 'CURRENCY', required: true },
        ],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      const document = await service.renderDocument(
        template.id,
        { amount: 1000 },
        { format: 'HTML', language: 'RO' },
        'user-1',
      );

      expect(document.content).toContain('RON');
    });

    it('should increment usage count', async () => {
      const template = service.createTemplate({
        name: 'Usage Count',
        nameRo: 'Contor Utilizare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      await service.renderDocument(template.id, {}, { format: 'HTML', language: 'EN' }, 'user-1');
      await service.renderDocument(template.id, {}, { format: 'HTML', language: 'EN' }, 'user-1');

      const updated = service.getTemplate(template.id);
      expect(updated.metadata.usageCount).toBe(2);
    });
  });

  describe('Document Management', () => {
    it('should get document by id', async () => {
      const template = service.createTemplate({
        name: 'Get Doc',
        nameRo: 'Obține Doc',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      const generated = await service.renderDocument(
        template.id,
        {},
        { format: 'HTML', language: 'EN' },
        'user-1',
      );

      const document = service.getDocument(generated.id);
      expect(document.id).toBe(generated.id);
    });

    it('should throw for invalid document id', () => {
      expect(() => service.getDocument('invalid-doc')).toThrow(NotFoundException);
    });

    it('should get all documents', async () => {
      const template = service.createTemplate({
        name: 'All Docs',
        nameRo: 'Toate Doc',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      await service.renderDocument(template.id, {}, { format: 'HTML', language: 'EN' }, 'user-1');
      await service.renderDocument(template.id, {}, { format: 'HTML', language: 'EN' }, 'user-1');

      const documents = service.getAllDocuments();
      expect(documents.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter documents by template', async () => {
      const template = service.createTemplate({
        name: 'Filter Docs',
        nameRo: 'Filtru Doc',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      await service.renderDocument(template.id, {}, { format: 'HTML', language: 'EN' }, 'user-1');

      const documents = service.getAllDocuments({ templateId: template.id });
      expect(documents.every(d => d.templateId === template.id)).toBe(true);
    });

    it('should delete document', async () => {
      const template = service.createTemplate({
        name: 'Delete Doc',
        nameRo: 'Șterge Doc',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');

      const doc = await service.renderDocument(template.id, {}, { format: 'HTML', language: 'EN' }, 'user-1');

      service.deleteDocument(doc.id);

      expect(() => service.getDocument(doc.id)).toThrow(NotFoundException);
    });
  });

  describe('Categories', () => {
    it('should get categories', () => {
      const categories = service.getCategories();
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should get category by id', () => {
      const categories = service.getCategories();
      const category = service.getCategory(categories[0].id);
      expect(category.id).toBe(categories[0].id);
    });

    it('should throw for invalid category', () => {
      expect(() => service.getCategory('invalid-cat')).toThrow(NotFoundException);
    });

    it('should have category names in both languages', () => {
      const categories = service.getCategories();
      expect(categories.every(c => c.name && c.nameRo)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should get service stats', () => {
      const stats = service.getServiceStats();

      expect(stats).toHaveProperty('totalTemplates');
      expect(stats).toHaveProperty('activeTemplates');
      expect(stats).toHaveProperty('systemTemplates');
      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('templatesByType');
      expect(stats).toHaveProperty('documentsByFormat');
    });

    it('should count templates by type', () => {
      const stats = service.getServiceStats();
      expect(stats.templatesByType).toHaveProperty('INVOICE');
      expect(stats.templatesByType).toHaveProperty('CONTRACT');
    });

    it('should count active templates', () => {
      const stats = service.getServiceStats();
      expect(stats.activeTemplates).toBeGreaterThan(0);
    });
  });

  describe('Template Types', () => {
    const types: TemplateType[] = ['INVOICE', 'CONTRACT', 'REPORT', 'LETTER', 'RECEIPT', 'QUOTE', 'ORDER', 'CERTIFICATE', 'CUSTOM'];

    types.forEach((type) => {
      it(`should create ${type} template`, () => {
        const template = service.createTemplate({
          name: `${type} Template`,
          nameRo: `Șablon ${type}`,
          description: 'Test',
          descriptionRo: 'Test',
          type,
          content: { body: 'Content', language: 'EN' },
          variables: [],
          createdBy: 'user-1',
        });

        expect(template.type).toBe(type);
      });
    });
  });

  describe('Output Formats', () => {
    const formats: OutputFormat[] = ['PDF', 'DOCX', 'HTML', 'TXT', 'XML'];

    it('should support multiple output formats', () => {
      const template = service.createTemplate({
        name: 'Multi Format',
        nameRo: 'Multi Format',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        outputFormats: formats,
        createdBy: 'user-1',
      });

      expect(template.outputFormats).toEqual(formats);
    });
  });

  describe('Event Emission', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(eventEmitter, 'emit');
    });

    afterEach(() => {
      emitSpy.mockRestore();
    });

    it('should emit template created event', () => {
      service.createTemplate({
        name: 'Event Test',
        nameRo: 'Test Eveniment',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      expect(emitSpy).toHaveBeenCalledWith('template.created', expect.any(Object));
    });

    it('should emit template published event', () => {
      const template = service.createTemplate({
        name: 'Publish Event',
        nameRo: 'Eveniment Publicare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Published', 'user-1');

      expect(emitSpy).toHaveBeenCalledWith('template.published', expect.any(Object));
    });

    it('should emit document generated event', async () => {
      const template = service.createTemplate({
        name: 'Doc Event',
        nameRo: 'Eveniment Doc',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'CUSTOM',
        content: { body: 'Content', language: 'EN' },
        variables: [],
        createdBy: 'user-1',
      });

      service.publishTemplate(template.id, 'Ready', 'user-1');
      await service.renderDocument(template.id, {}, { format: 'HTML', language: 'EN' }, 'user-1');

      expect(emitSpy).toHaveBeenCalledWith('document.generated', expect.any(Object));
    });
  });
});
