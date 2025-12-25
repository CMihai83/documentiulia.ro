import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DocumentGeneratorService,
  DocumentTemplate,
  GeneratedDocument,
  BatchGenerationJob,
  DocumentSection,
  DocumentStyling,
} from './document-generator.service';

describe('DocumentGeneratorService', () => {
  let service: DocumentGeneratorService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentGeneratorService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentGeneratorService>(DocumentGeneratorService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultStyling: DocumentStyling = {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    fonts: { primary: 'Arial' },
    colors: { primary: '#000', secondary: '#666', text: '#333', background: '#fff' },
  };

  const defaultSection: DocumentSection = {
    id: 'main',
    name: 'Main Section',
    type: 'body',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'content', type: 'text', label: 'Content', required: false },
    ],
  };

  describe('System Templates', () => {
    it('should initialize system templates', async () => {
      const templates = await service.getTemplates('any-tenant');

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.isSystem)).toBe(true);
    });

    it('should have Standard Invoice template', async () => {
      const templates = await service.getTemplates('any-tenant', { type: 'invoice' });

      expect(templates.some(t => t.name === 'Standard Invoice')).toBe(true);
    });

    it('should have Employment Contract template', async () => {
      const templates = await service.getTemplates('any-tenant', { type: 'contract' });

      expect(templates.some(t => t.name === 'Employment Contract')).toBe(true);
    });

    it('should have Business Proposal template', async () => {
      const templates = await service.getTemplates('any-tenant', { type: 'proposal' });

      expect(templates.some(t => t.name === 'Business Proposal')).toBe(true);
    });

    it('should have Payment Receipt template', async () => {
      const templates = await service.getTemplates('any-tenant', { type: 'receipt' });

      expect(templates.some(t => t.name === 'Payment Receipt')).toBe(true);
    });

    it('should have Romanian Invoice template', async () => {
      const templates = await service.getTemplates('any-tenant', { language: 'ro' });

      expect(templates.some(t => t.name === 'Factură Fiscală')).toBe(true);
    });
  });

  describe('Template Management', () => {
    describe('createTemplate', () => {
      it('should create a template', async () => {
        const template = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Custom Template',
          description: 'A custom template',
          type: 'invoice',
          category: 'finance',
          language: 'en',
          outputFormats: ['pdf', 'html'],
          sections: [defaultSection],
          styling: defaultStyling,
        });

        expect(template.id).toBeDefined();
        expect(template.name).toBe('Custom Template');
        expect(template.isSystem).toBe(false);
        expect(template.isActive).toBe(true);
        expect(template.version).toBe(1);
        expect(eventEmitter.emit).toHaveBeenCalledWith('document.template.created', { template });
      });

      it('should set default values', async () => {
        const template = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Minimal Template',
          type: 'custom',
          language: 'en',
          outputFormats: ['pdf'],
          sections: [],
          styling: defaultStyling,
        });

        expect(template.variables).toEqual({});
        expect(template.metadata).toEqual({});
      });
    });

    describe('getTemplates', () => {
      let customTemplate: DocumentTemplate;

      beforeEach(async () => {
        customTemplate = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Test Template',
          type: 'report',
          category: 'analytics',
          language: 'en',
          outputFormats: ['pdf'],
          sections: [defaultSection],
          styling: defaultStyling,
        });
      });

      it('should return templates for tenant', async () => {
        const templates = await service.getTemplates('tenant-1');

        // Should include system templates + custom template
        expect(templates.length).toBeGreaterThan(0);
        expect(templates.some(t => t.id === customTemplate.id)).toBe(true);
      });

      it('should filter by type', async () => {
        const templates = await service.getTemplates('tenant-1', { type: 'report' });

        expect(templates.every(t => t.type === 'report')).toBe(true);
        expect(templates.some(t => t.id === customTemplate.id)).toBe(true);
      });

      it('should filter by category', async () => {
        const templates = await service.getTemplates('tenant-1', { category: 'analytics' });

        expect(templates.every(t => t.category === 'analytics')).toBe(true);
      });

      it('should filter by language', async () => {
        const templates = await service.getTemplates('tenant-1', { language: 'ro' });

        expect(templates.every(t => t.language === 'ro')).toBe(true);
      });

      it('should filter by active status', async () => {
        const templates = await service.getTemplates('tenant-1', { isActive: true });

        expect(templates.every(t => t.isActive === true)).toBe(true);
      });

      it('should search by name', async () => {
        const templates = await service.getTemplates('tenant-1', { search: 'Test' });

        expect(templates.some(t => t.name.includes('Test'))).toBe(true);
      });

      it('should sort by name', async () => {
        const templates = await service.getTemplates('tenant-1');

        for (let i = 1; i < templates.length; i++) {
          expect(templates[i - 1].name.localeCompare(templates[i].name)).toBeLessThanOrEqual(0);
        }
      });
    });

    describe('getTemplate', () => {
      it('should return template by ID', async () => {
        const created = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Lookup Template',
          type: 'memo',
          language: 'en',
          outputFormats: ['pdf'],
          sections: [defaultSection],
          styling: defaultStyling,
        });

        const template = await service.getTemplate(created.id);

        expect(template).not.toBeNull();
        expect(template?.id).toBe(created.id);
      });

      it('should return null for non-existent ID', async () => {
        const template = await service.getTemplate('non-existent');

        expect(template).toBeNull();
      });
    });

    describe('updateTemplate', () => {
      let template: DocumentTemplate;

      beforeEach(async () => {
        template = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Update Test',
          type: 'letter',
          language: 'en',
          outputFormats: ['pdf'],
          sections: [defaultSection],
          styling: defaultStyling,
        });
      });

      it('should update template', async () => {
        const updated = await service.updateTemplate(template.id, {
          name: 'Updated Name',
          description: 'Updated Description',
        });

        expect(updated?.name).toBe('Updated Name');
        expect(updated?.description).toBe('Updated Description');
        expect(updated?.version).toBe(2);
        expect(eventEmitter.emit).toHaveBeenCalledWith('document.template.updated', { template: updated });
      });

      it('should not update system template', async () => {
        const systemTemplates = await service.getTemplates('tenant-1');
        const systemTemplate = systemTemplates.find(t => t.isSystem);

        const result = await service.updateTemplate(systemTemplate!.id, { name: 'Hacked' });

        expect(result).toBeNull();
      });

      it('should return null for non-existent ID', async () => {
        const result = await service.updateTemplate('non-existent', { name: 'New' });

        expect(result).toBeNull();
      });

      it('should update output formats', async () => {
        const updated = await service.updateTemplate(template.id, {
          outputFormats: ['pdf', 'docx', 'html'],
        });

        expect(updated?.outputFormats).toEqual(['pdf', 'docx', 'html']);
      });

      it('should update styling', async () => {
        const newStyling: DocumentStyling = {
          ...defaultStyling,
          pageSize: 'Letter',
          orientation: 'landscape',
        };

        const updated = await service.updateTemplate(template.id, { styling: newStyling });

        expect(updated?.styling.pageSize).toBe('Letter');
        expect(updated?.styling.orientation).toBe('landscape');
      });
    });

    describe('deleteTemplate', () => {
      it('should delete custom template', async () => {
        const template = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Delete Test',
          type: 'custom',
          language: 'en',
          outputFormats: ['pdf'],
          sections: [],
          styling: defaultStyling,
        });

        await service.deleteTemplate(template.id);

        const result = await service.getTemplate(template.id);
        expect(result).toBeNull();
        expect(eventEmitter.emit).toHaveBeenCalledWith('document.template.deleted', { templateId: template.id });
      });

      it('should not delete system template', async () => {
        const systemTemplates = await service.getTemplates('tenant-1');
        const systemTemplate = systemTemplates.find(t => t.isSystem);

        await service.deleteTemplate(systemTemplate!.id);

        const result = await service.getTemplate(systemTemplate!.id);
        expect(result).not.toBeNull();
      });
    });

    describe('duplicateTemplate', () => {
      it('should duplicate template', async () => {
        const original = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Original',
          description: 'Original description',
          type: 'invoice',
          category: 'finance',
          language: 'en',
          outputFormats: ['pdf', 'html'],
          sections: [defaultSection],
          styling: defaultStyling,
          variables: { key: 'value' },
        });

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
        expect(duplicate?.type).toBe(original.type);
        expect(duplicate?.description).toBe(original.description);
        expect(duplicate?.metadata.duplicatedFrom).toBe(original.id);
      });

      it('should duplicate system template', async () => {
        const systemTemplates = await service.getTemplates('tenant-1');
        const systemTemplate = systemTemplates.find(t => t.isSystem && t.type === 'invoice');

        const duplicate = await service.duplicateTemplate(
          systemTemplate!.id,
          'My Custom Invoice',
          'tenant-1',
          'user-1',
        );

        expect(duplicate).not.toBeNull();
        expect(duplicate?.isSystem).toBe(false);
      });

      it('should return null for non-existent template', async () => {
        const result = await service.duplicateTemplate(
          'non-existent',
          'Name',
          'tenant-1',
          'user-1',
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('Document Generation', () => {
    let template: DocumentTemplate;

    beforeEach(async () => {
      template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Generation Test',
        type: 'report',
        language: 'en',
        outputFormats: ['pdf', 'html', 'docx'],
        sections: [
          {
            id: 'header',
            name: 'Header',
            type: 'header',
            fields: [
              { name: 'title', type: 'text', label: 'Title', required: true },
              { name: 'date', type: 'date', label: 'Date', required: true, format: 'DD/MM/YYYY' },
            ],
          },
          {
            id: 'content',
            name: 'Content',
            type: 'body',
            fields: [
              { name: 'amount', type: 'currency', label: 'Amount', required: true },
              { name: 'quantity', type: 'number', label: 'Quantity', required: true },
              { name: 'isApproved', type: 'boolean', label: 'Approved', required: false },
              { name: 'items', type: 'list', label: 'Items', required: false },
            ],
          },
        ],
        styling: {
          ...defaultStyling,
          watermark: { text: 'CONFIDENTIAL', opacity: 0.1, rotation: -45 },
        },
      });
    });

    describe('generateDocument', () => {
      it('should generate document', async () => {
        const document = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: template.id,
          name: 'Test Report',
          data: {
            title: 'Monthly Report',
            date: new Date('2024-01-15'),
            amount: 1500.50,
            quantity: 10,
            isApproved: true,
          },
          options: { format: 'html' },
          generatedBy: 'user-1',
        });

        expect(document.id).toBeDefined();
        expect(document.name).toBe('Test Report');
        expect(document.status).toBe('completed');
        expect(document.format).toBe('html');
        expect(document.content).toBeDefined();
        expect(document.fileUrl).toBeDefined();
        expect(document.checksum).toBeDefined();
        expect(eventEmitter.emit).toHaveBeenCalledWith('document.generated', { document });
      });

      it('should throw for non-existent template', async () => {
        await expect(
          service.generateDocument({
            tenantId: 'tenant-1',
            templateId: 'non-existent',
            name: 'Test',
            data: {},
            options: { format: 'pdf' },
            generatedBy: 'user-1',
          }),
        ).rejects.toThrow('Template not found');
      });

      it('should throw for unsupported format', async () => {
        await expect(
          service.generateDocument({
            tenantId: 'tenant-1',
            templateId: template.id,
            name: 'Test',
            data: {},
            options: { format: 'xlsx' },
            generatedBy: 'user-1',
          }),
        ).rejects.toThrow('Format xlsx not supported by this template');
      });

      it('should set expiration date', async () => {
        const document = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: template.id,
          name: 'Expiring Doc',
          data: { title: 'Test' },
          options: { format: 'html', expiresIn: 3600 },
          generatedBy: 'user-1',
        });

        expect(document.expiresAt).toBeDefined();
        expect(document.expiresAt!.getTime()).toBeGreaterThan(Date.now());
      });

      it('should apply watermark', async () => {
        const document = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: template.id,
          name: 'Watermarked',
          data: { title: 'Test' },
          options: { format: 'html', watermark: true },
          generatedBy: 'user-1',
        });

        expect(document.content).toContain('CONFIDENTIAL');
        expect(document.content).toContain('watermark');
      });

      it('should format date fields', async () => {
        const document = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: template.id,
          name: 'Date Test',
          data: {
            title: 'Test',
            date: new Date('2024-03-15'),
          },
          options: { format: 'html' },
          generatedBy: 'user-1',
        });

        expect(document.content).toContain('15/03/2024');
      });

      it('should format currency fields', async () => {
        const document = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: template.id,
          name: 'Currency Test',
          data: {
            title: 'Test',
            amount: 1234.56,
          },
          options: { format: 'html' },
          generatedBy: 'user-1',
        });

        expect(document.content).toContain('1,234.56');
      });

      it('should format boolean fields', async () => {
        const document = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: template.id,
          name: 'Boolean Test',
          data: {
            title: 'Test',
            isApproved: true,
          },
          options: { format: 'html' },
          generatedBy: 'user-1',
        });

        expect(document.content).toContain('Yes');
      });

      it('should format list fields', async () => {
        const document = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: template.id,
          name: 'List Test',
          data: {
            title: 'Test',
            items: ['Item 1', 'Item 2', 'Item 3'],
          },
          options: { format: 'html' },
          generatedBy: 'user-1',
        });

        expect(document.content).toContain('• Item 1');
        expect(document.content).toContain('• Item 2');
      });
    });

    describe('Conditional Sections', () => {
      it('should include section when condition is met', async () => {
        const conditionalTemplate = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Conditional Test',
          type: 'custom',
          language: 'en',
          outputFormats: ['html'],
          sections: [
            {
              id: 'always',
              name: 'Always Shown',
              type: 'body',
              fields: [{ name: 'title', type: 'text', label: 'Title', required: true }],
            },
            {
              id: 'conditional',
              name: 'Conditional Section',
              type: 'body',
              conditional: { field: 'showExtra', operator: 'equals', value: true },
              fields: [{ name: 'extra', type: 'text', label: 'Extra', required: false }],
            },
          ],
          styling: defaultStyling,
        });

        const docWith = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: conditionalTemplate.id,
          name: 'With Conditional',
          data: { title: 'Test', showExtra: true, extra: 'Extra Content' },
          options: { format: 'html' },
          generatedBy: 'user-1',
        });

        expect(docWith.content).toContain('Conditional Section');
        expect(docWith.content).toContain('Extra Content');
      });

      it('should exclude section when condition is not met', async () => {
        const conditionalTemplate = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'Conditional Test 2',
          type: 'custom',
          language: 'en',
          outputFormats: ['html'],
          sections: [
            {
              id: 'always',
              name: 'Always Shown',
              type: 'body',
              fields: [{ name: 'title', type: 'text', label: 'Title', required: true }],
            },
            {
              id: 'conditional',
              name: 'Hidden Section',
              type: 'body',
              conditional: { field: 'showExtra', operator: 'equals', value: true },
              fields: [{ name: 'extra', type: 'text', label: 'Extra', required: false }],
            },
          ],
          styling: defaultStyling,
        });

        const docWithout = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: conditionalTemplate.id,
          name: 'Without Conditional',
          data: { title: 'Test', showExtra: false },
          options: { format: 'html' },
          generatedBy: 'user-1',
        });

        expect(docWithout.content).not.toContain('Hidden Section');
      });
    });
  });

  describe('Document Retrieval', () => {
    let template: DocumentTemplate;
    let document1: GeneratedDocument;
    let document2: GeneratedDocument;

    beforeEach(async () => {
      template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Retrieval Test',
        type: 'report',
        language: 'en',
        outputFormats: ['html'],
        sections: [defaultSection],
        styling: defaultStyling,
      });

      document1 = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'Doc 1',
        data: { title: 'First' },
        options: { format: 'html' },
        generatedBy: 'user-1',
      });

      // Small delay for unique timestamps
      await new Promise(r => setTimeout(r, 5));

      document2 = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'Doc 2',
        data: { title: 'Second' },
        options: { format: 'html' },
        generatedBy: 'user-1',
      });
    });

    describe('getDocuments', () => {
      it('should return documents for tenant', async () => {
        const documents = await service.getDocuments('tenant-1');

        expect(documents.length).toBe(2);
        expect(documents.some(d => d.id === document1.id)).toBe(true);
        expect(documents.some(d => d.id === document2.id)).toBe(true);
      });

      it('should filter by template', async () => {
        const documents = await service.getDocuments('tenant-1', { templateId: template.id });

        expect(documents.every(d => d.templateId === template.id)).toBe(true);
      });

      it('should filter by type', async () => {
        const documents = await service.getDocuments('tenant-1', { type: 'report' });

        expect(documents.every(d => d.type === 'report')).toBe(true);
      });

      it('should filter by status', async () => {
        const documents = await service.getDocuments('tenant-1', { status: 'completed' });

        expect(documents.every(d => d.status === 'completed')).toBe(true);
      });

      it('should search by name', async () => {
        const documents = await service.getDocuments('tenant-1', { search: 'Doc 1' });

        expect(documents.length).toBe(1);
        expect(documents[0].name).toBe('Doc 1');
      });

      it('should sort by generation date descending', async () => {
        const documents = await service.getDocuments('tenant-1');

        for (let i = 1; i < documents.length; i++) {
          expect(documents[i - 1].generatedAt.getTime()).toBeGreaterThanOrEqual(
            documents[i].generatedAt.getTime(),
          );
        }
      });

      it('should respect limit', async () => {
        const documents = await service.getDocuments('tenant-1', { limit: 1 });

        expect(documents.length).toBe(1);
      });
    });

    describe('getDocument', () => {
      it('should return document by ID', async () => {
        const document = await service.getDocument(document1.id);

        expect(document).not.toBeNull();
        expect(document?.id).toBe(document1.id);
      });

      it('should return null for non-existent ID', async () => {
        const document = await service.getDocument('non-existent');

        expect(document).toBeNull();
      });
    });

    describe('downloadDocument', () => {
      it('should return download data', async () => {
        const download = await service.downloadDocument(document1.id);

        expect(download).not.toBeNull();
        expect(download?.content).toBeDefined();
        expect(download?.mimeType).toBe('text/html');
        expect(download?.fileName).toBe('Doc 1.html');
      });

      it('should increment download count', async () => {
        await service.downloadDocument(document1.id);
        await service.downloadDocument(document1.id);

        const document = await service.getDocument(document1.id);
        expect(document?.downloadCount).toBe(2);
      });

      it('should update last downloaded date', async () => {
        const beforeDownload = new Date();
        await service.downloadDocument(document1.id);

        const document = await service.getDocument(document1.id);
        expect(document?.lastDownloadedAt).toBeDefined();
        expect(document?.lastDownloadedAt!.getTime()).toBeGreaterThanOrEqual(beforeDownload.getTime());
      });

      it('should return null for non-existent document', async () => {
        const download = await service.downloadDocument('non-existent');

        expect(download).toBeNull();
      });

      it('should return correct mime types', async () => {
        // Create templates for different formats
        const pdfTemplate = await service.createTemplate({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
          name: 'PDF Template',
          type: 'report',
          language: 'en',
          outputFormats: ['pdf', 'docx', 'xlsx', 'txt', 'xml', 'json'],
          sections: [defaultSection],
          styling: defaultStyling,
        });

        const pdfDoc = await service.generateDocument({
          tenantId: 'tenant-1',
          templateId: pdfTemplate.id,
          name: 'PDF Doc',
          data: { title: 'Test' },
          options: { format: 'pdf' },
          generatedBy: 'user-1',
        });

        const download = await service.downloadDocument(pdfDoc.id);
        expect(download?.mimeType).toBe('application/pdf');
      });
    });

    describe('deleteDocument', () => {
      it('should delete document', async () => {
        await service.deleteDocument(document1.id);

        const result = await service.getDocument(document1.id);
        expect(result).toBeNull();
        expect(eventEmitter.emit).toHaveBeenCalledWith('document.deleted', { documentId: document1.id });
      });
    });

    describe('archiveDocument', () => {
      it('should archive document', async () => {
        const archived = await service.archiveDocument(document1.id);

        expect(archived?.status).toBe('archived');
        expect(eventEmitter.emit).toHaveBeenCalledWith('document.archived', { document: archived });
      });

      it('should return null for non-existent document', async () => {
        const result = await service.archiveDocument('non-existent');

        expect(result).toBeNull();
      });
    });
  });

  describe('Batch Generation', () => {
    let template: DocumentTemplate;

    beforeEach(async () => {
      template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Batch Test Template',
        type: 'letter',
        language: 'en',
        outputFormats: ['html', 'pdf'],
        sections: [
          {
            id: 'main',
            name: 'Main',
            type: 'body',
            fields: [
              { name: 'recipient', type: 'text', label: 'Recipient', required: true },
              { name: 'message', type: 'text', label: 'Message', required: true },
            ],
          },
        ],
        styling: defaultStyling,
      });
    });

    describe('createBatchJob', () => {
      it('should create batch job', async () => {
        const job = await service.createBatchJob({
          tenantId: 'tenant-1',
          templateId: template.id,
          dataSource: 'manual',
          data: [
            { recipient: 'Alice', message: 'Hello Alice' },
            { recipient: 'Bob', message: 'Hello Bob' },
          ],
          options: { format: 'html' },
          createdBy: 'user-1',
        });

        expect(job.id).toBeDefined();
        expect(job.totalDocuments).toBe(2);
        expect(job.createdBy).toBe('user-1');
      });

      it('should throw for non-existent template', async () => {
        await expect(
          service.createBatchJob({
            tenantId: 'tenant-1',
            templateId: 'non-existent',
            dataSource: 'manual',
            data: [{ recipient: 'Test' }],
            options: { format: 'html' },
            createdBy: 'user-1',
          }),
        ).rejects.toThrow('Template not found');
      });

      it('should process batch asynchronously', async () => {
        const job = await service.createBatchJob({
          tenantId: 'tenant-1',
          templateId: template.id,
          dataSource: 'manual',
          data: [
            { recipient: 'Alice', message: 'Test 1' },
            { recipient: 'Bob', message: 'Test 2' },
            { recipient: 'Charlie', message: 'Test 3' },
          ],
          options: { format: 'html' },
          createdBy: 'user-1',
        });

        // Wait for processing
        await new Promise(r => setTimeout(r, 100));

        const updatedJob = await service.getBatchJob(job.id);
        expect(updatedJob?.completedDocuments).toBe(3);
        expect(updatedJob?.status).toBe('completed');
      });
    });

    describe('getBatchJob', () => {
      it('should return batch job by ID', async () => {
        const created = await service.createBatchJob({
          tenantId: 'tenant-1',
          templateId: template.id,
          dataSource: 'manual',
          data: [{ recipient: 'Test', message: 'Test' }],
          options: { format: 'html' },
          createdBy: 'user-1',
        });

        const job = await service.getBatchJob(created.id);

        expect(job).not.toBeNull();
        expect(job?.id).toBe(created.id);
      });

      it('should return null for non-existent ID', async () => {
        const job = await service.getBatchJob('non-existent');

        expect(job).toBeNull();
      });
    });

    describe('getBatchJobs', () => {
      beforeEach(async () => {
        await service.createBatchJob({
          tenantId: 'tenant-1',
          templateId: template.id,
          dataSource: 'csv',
          data: [{ recipient: 'Test 1' }],
          options: { format: 'html' },
          createdBy: 'user-1',
        });
        await new Promise(r => setTimeout(r, 10));
        await service.createBatchJob({
          tenantId: 'tenant-1',
          templateId: template.id,
          dataSource: 'manual',
          data: [{ recipient: 'Test 2' }],
          options: { format: 'html' },
          createdBy: 'user-1',
        });
      });

      it('should return jobs for tenant', async () => {
        const jobs = await service.getBatchJobs('tenant-1');

        expect(jobs.length).toBe(2);
      });

      it('should filter by status', async () => {
        // Wait for processing
        await new Promise(r => setTimeout(r, 100));

        const jobs = await service.getBatchJobs('tenant-1', { status: 'completed' });

        expect(jobs.every(j => j.status === 'completed')).toBe(true);
      });

      it('should sort by creation date descending', async () => {
        const jobs = await service.getBatchJobs('tenant-1');

        for (let i = 1; i < jobs.length; i++) {
          expect(jobs[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
            jobs[i].createdAt.getTime(),
          );
        }
      });

      it('should respect limit', async () => {
        const jobs = await service.getBatchJobs('tenant-1', { limit: 1 });

        expect(jobs.length).toBe(1);
      });
    });

    describe('cancelBatchJob', () => {
      it('should cancel processing job', async () => {
        // Create a large job that takes time to process
        const job = await service.createBatchJob({
          tenantId: 'tenant-1',
          templateId: template.id,
          dataSource: 'manual',
          data: Array(50).fill({ recipient: 'Test', message: 'Test' }),
          options: { format: 'html' },
          createdBy: 'user-1',
        });

        // Cancel immediately while processing
        const cancelled = await service.cancelBatchJob(job.id);

        expect(cancelled?.status).toBe('cancelled');
      });

      it('should return null for non-existent job', async () => {
        const result = await service.cancelBatchJob('non-existent');

        expect(result).toBeNull();
      });
    });
  });

  describe('Statistics', () => {
    let template: DocumentTemplate;

    beforeEach(async () => {
      template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Stats Template',
        type: 'invoice',
        language: 'en',
        outputFormats: ['html'],
        sections: [defaultSection],
        styling: defaultStyling,
      });

      await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'Invoice 1',
        data: { title: 'Test' },
        options: { format: 'html' },
        generatedBy: 'user-1',
      });

      await new Promise(r => setTimeout(r, 5));

      const doc2 = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'Invoice 2',
        data: { title: 'Test' },
        options: { format: 'html' },
        generatedBy: 'user-1',
      });

      // Simulate downloads
      await service.downloadDocument(doc2.id);
      await service.downloadDocument(doc2.id);
    });

    it('should return stats', async () => {
      const stats = await service.getStats('tenant-1');

      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.customTemplates).toBeGreaterThan(0);
      expect(stats.totalDocuments).toBe(2);
      expect(stats.documentsByType.invoice).toBe(2);
      expect(stats.documentsByStatus.completed).toBe(2);
      expect(stats.totalDownloads).toBe(2);
      expect(stats.recentDocuments.length).toBe(2);
    });
  });

  describe('Document Types', () => {
    const createTemplateForType = async (type: any) => {
      return service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: `${type} Template`,
        type,
        language: 'en',
        outputFormats: ['html'],
        sections: [defaultSection],
        styling: defaultStyling,
      });
    };

    it('should support invoice type', async () => {
      const template = await createTemplateForType('invoice');
      expect(template.type).toBe('invoice');
    });

    it('should support contract type', async () => {
      const template = await createTemplateForType('contract');
      expect(template.type).toBe('contract');
    });

    it('should support proposal type', async () => {
      const template = await createTemplateForType('proposal');
      expect(template.type).toBe('proposal');
    });

    it('should support report type', async () => {
      const template = await createTemplateForType('report');
      expect(template.type).toBe('report');
    });

    it('should support letter type', async () => {
      const template = await createTemplateForType('letter');
      expect(template.type).toBe('letter');
    });

    it('should support certificate type', async () => {
      const template = await createTemplateForType('certificate');
      expect(template.type).toBe('certificate');
    });

    it('should support receipt type', async () => {
      const template = await createTemplateForType('receipt');
      expect(template.type).toBe('receipt');
    });

    it('should support statement type', async () => {
      const template = await createTemplateForType('statement');
      expect(template.type).toBe('statement');
    });

    it('should support memo type', async () => {
      const template = await createTemplateForType('memo');
      expect(template.type).toBe('memo');
    });

    it('should support policy type', async () => {
      const template = await createTemplateForType('policy');
      expect(template.type).toBe('policy');
    });

    it('should support custom type', async () => {
      const template = await createTemplateForType('custom');
      expect(template.type).toBe('custom');
    });
  });

  describe('Document Formats', () => {
    let template: DocumentTemplate;

    beforeEach(async () => {
      template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Multi-format Template',
        type: 'report',
        language: 'en',
        outputFormats: ['pdf', 'docx', 'xlsx', 'html', 'txt', 'xml', 'json'],
        sections: [defaultSection],
        styling: defaultStyling,
      });
    });

    it('should generate PDF', async () => {
      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'PDF Test',
        data: { title: 'Test' },
        options: { format: 'pdf' },
        generatedBy: 'user-1',
      });

      expect(doc.format).toBe('pdf');
    });

    it('should generate DOCX', async () => {
      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'DOCX Test',
        data: { title: 'Test' },
        options: { format: 'docx' },
        generatedBy: 'user-1',
      });

      expect(doc.format).toBe('docx');
    });

    it('should generate XLSX', async () => {
      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'XLSX Test',
        data: { title: 'Test' },
        options: { format: 'xlsx' },
        generatedBy: 'user-1',
      });

      expect(doc.format).toBe('xlsx');
    });

    it('should generate HTML', async () => {
      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'HTML Test',
        data: { title: 'Test' },
        options: { format: 'html' },
        generatedBy: 'user-1',
      });

      expect(doc.format).toBe('html');
    });

    it('should generate TXT', async () => {
      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'TXT Test',
        data: { title: 'Test' },
        options: { format: 'txt' },
        generatedBy: 'user-1',
      });

      expect(doc.format).toBe('txt');
    });

    it('should generate XML', async () => {
      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'XML Test',
        data: { title: 'Test' },
        options: { format: 'xml' },
        generatedBy: 'user-1',
      });

      expect(doc.format).toBe('xml');
    });

    it('should generate JSON', async () => {
      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'JSON Test',
        data: { title: 'Test' },
        options: { format: 'json' },
        generatedBy: 'user-1',
      });

      expect(doc.format).toBe('json');
    });
  });

  describe('Page Breaks', () => {
    it('should add page break before section', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Page Break Test',
        type: 'report',
        language: 'en',
        outputFormats: ['html'],
        sections: [
          {
            id: 'section1',
            name: 'Section 1',
            type: 'body',
            fields: [{ name: 'content', type: 'text', label: 'Content', required: false }],
          },
          {
            id: 'section2',
            name: 'Section 2',
            type: 'body',
            pageBreakBefore: true,
            fields: [{ name: 'content', type: 'text', label: 'Content', required: false }],
          },
        ],
        styling: defaultStyling,
      });

      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'Page Break Doc',
        data: { content: 'Test' },
        options: { format: 'html' },
        generatedBy: 'user-1',
      });

      expect(doc.content).toContain('page-break');
    });

    it('should add page break after section', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Page Break After Test',
        type: 'report',
        language: 'en',
        outputFormats: ['html'],
        sections: [
          {
            id: 'section1',
            name: 'Section 1',
            type: 'body',
            pageBreakAfter: true,
            fields: [{ name: 'content', type: 'text', label: 'Content', required: false }],
          },
        ],
        styling: defaultStyling,
      });

      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'Page Break After Doc',
        data: { content: 'Test' },
        options: { format: 'html' },
        generatedBy: 'user-1',
      });

      expect(doc.content).toContain('page-break');
    });
  });

  describe('Default Values', () => {
    it('should use field default values', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Default Values Test',
        type: 'invoice',
        language: 'en',
        outputFormats: ['html'],
        sections: [
          {
            id: 'main',
            name: 'Main',
            type: 'body',
            fields: [
              { name: 'currency', type: 'text', label: 'Currency', required: true, defaultValue: 'RON' },
              { name: 'vatRate', type: 'number', label: 'VAT Rate', required: true, defaultValue: 19 },
            ],
          },
        ],
        styling: defaultStyling,
      });

      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'Default Values Doc',
        data: {},
        options: { format: 'html' },
        generatedBy: 'user-1',
      });

      expect(doc.content).toContain('RON');
      expect(doc.content).toContain('19');
    });
  });

  describe('Styling', () => {
    it('should apply page size styling', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        name: 'Styling Test',
        type: 'report',
        language: 'en',
        outputFormats: ['html'],
        sections: [defaultSection],
        styling: {
          pageSize: 'Letter',
          orientation: 'landscape',
          margins: { top: 30, right: 30, bottom: 30, left: 30 },
          fonts: { primary: 'Georgia', secondary: 'Verdana' },
          colors: { primary: '#ff0000', secondary: '#00ff00', text: '#000000', background: '#ffffff' },
        },
      });

      const doc = await service.generateDocument({
        tenantId: 'tenant-1',
        templateId: template.id,
        name: 'Styled Doc',
        data: { title: 'Test' },
        options: { format: 'html' },
        generatedBy: 'user-1',
      });

      expect(doc.content).toContain('Letter');
      expect(doc.content).toContain('landscape');
      expect(doc.content).toContain('Georgia');
      expect(doc.content).toContain('#ff0000');
    });
  });
});
