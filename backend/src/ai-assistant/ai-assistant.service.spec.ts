import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AIAssistantService,
  Conversation,
  Message,
  DocumentAnalysisResult,
  TaxCalculation,
  FinancialInsight,
  ForecastResult,
  AssistantCapability,
  InsightCategory,
  DocumentAnalysisType,
} from './ai-assistant.service';

describe('AIAssistantService', () => {
  let service: AIAssistantService;
  let eventEmitter: EventEmitter2;
  const emittedEvents: Array<{ event: string; payload: any }> = [];

  beforeEach(async () => {
    emittedEvents.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAssistantService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn((event: string, payload: any) => {
              emittedEvents.push({ event, payload });
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AIAssistantService>(AIAssistantService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    await service.onModuleInit();
  });

  describe('Conversation Management', () => {
    it('should create conversation', async () => {
      const conversation = await service.createConversation('cust-1');

      expect(conversation.id).toMatch(/^conv-/);
      expect(conversation.customerId).toBe('cust-1');
      expect(conversation.status).toBe('ACTIVE');
      expect(conversation.messages.length).toBe(1); // System greeting
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ai.conversation.created' }),
      );
    });

    it('should create conversation with custom title', async () => {
      const conversation = await service.createConversation('cust-2', 'Tax Questions');

      expect(conversation.title).toBe('Tax Questions');
    });

    it('should create conversation with context', async () => {
      const context = {
        recentDocuments: ['doc-1', 'doc-2'],
        activeInvoices: ['inv-1'],
      };
      const conversation = await service.createConversation('cust-3', 'With Context', context);

      expect(conversation.context).toEqual(context);
    });

    it('should add system greeting in Romanian', async () => {
      const conversation = await service.createConversation('cust-4');
      const greeting = conversation.messages[0];

      expect(greeting.role).toBe('SYSTEM');
      expect(greeting.contentRo).toContain('Bună ziua');
    });

    it('should get conversation by ID', async () => {
      const created = await service.createConversation('cust-5');
      const retrieved = await service.getConversation(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should list conversations by customer', async () => {
      await service.createConversation('cust-6');
      await service.createConversation('cust-6');
      await service.createConversation('cust-7');

      const conversations = await service.listConversations('cust-6');
      expect(conversations.length).toBe(2);
    });

    it('should filter conversations by status', async () => {
      const conv1 = await service.createConversation('cust-8');
      await service.createConversation('cust-8');
      await service.archiveConversation(conv1.id);

      const active = await service.listConversations('cust-8', { status: 'ACTIVE' });
      const archived = await service.listConversations('cust-8', { status: 'ARCHIVED' });

      expect(active.length).toBe(1);
      expect(archived.length).toBe(1);
    });

    it('should limit conversation list', async () => {
      for (let i = 0; i < 5; i++) {
        await service.createConversation('cust-9');
      }

      const conversations = await service.listConversations('cust-9', { limit: 3 });
      expect(conversations.length).toBe(3);
    });

    it('should sort conversations by update date descending', async () => {
      await service.createConversation('cust-10');
      await new Promise((r) => setTimeout(r, 10));
      await service.createConversation('cust-10');

      const conversations = await service.listConversations('cust-10');
      expect(conversations[0].updatedAt.getTime()).toBeGreaterThan(
        conversations[1].updatedAt.getTime(),
      );
    });

    it('should archive conversation', async () => {
      const conversation = await service.createConversation('cust-11');
      const archived = await service.archiveConversation(conversation.id);

      expect(archived.status).toBe('ARCHIVED');
    });

    it('should throw error when archiving non-existent conversation', async () => {
      await expect(service.archiveConversation('non-existent')).rejects.toThrow(
        'Conversation not found',
      );
    });

    it('should delete conversation', async () => {
      const conversation = await service.createConversation('cust-12');
      await service.deleteConversation(conversation.id);

      const retrieved = await service.getConversation(conversation.id);
      expect(retrieved?.status).toBe('DELETED');
    });

    it('should throw error when deleting non-existent conversation', async () => {
      await expect(service.deleteConversation('non-existent')).rejects.toThrow(
        'Conversation not found',
      );
    });
  });

  describe('Message Management', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await service.createConversation('msg-test');
      conversationId = conversation.id;
    });

    it('should add message', async () => {
      const message = await service.addMessage(conversationId, 'USER', 'Hello');

      expect(message.id).toMatch(/^msg-/);
      expect(message.role).toBe('USER');
      expect(message.content).toBe('Hello');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ai.message.added' }),
      );
    });

    it('should add message with Romanian content', async () => {
      const message = await service.addMessage(conversationId, 'ASSISTANT', 'Hello', {
        contentRo: 'Bună',
      });

      expect(message.contentRo).toBe('Bună');
    });

    it('should add message with attachments', async () => {
      const attachments = [
        { id: 'att-1', type: 'pdf', name: 'invoice.pdf', url: '/files/invoice.pdf', size: 1000 },
      ];
      const message = await service.addMessage(conversationId, 'USER', 'See attachment', {
        attachments,
      });

      expect(message.attachments).toHaveLength(1);
      expect(message.attachments[0].name).toBe('invoice.pdf');
    });

    it('should add message with metadata', async () => {
      const message = await service.addMessage(conversationId, 'ASSISTANT', 'Calculated', {
        metadata: { queryType: 'TAX_CALCULATION', result: 190 },
      });

      expect(message.metadata?.queryType).toBe('TAX_CALCULATION');
    });

    it('should throw error when adding message to non-existent conversation', async () => {
      await expect(
        service.addMessage('non-existent', 'USER', 'Test'),
      ).rejects.toThrow('Conversation not found');
    });

    it('should update conversation updatedAt when adding message', async () => {
      const before = await service.getConversation(conversationId);
      await new Promise((r) => setTimeout(r, 10));
      await service.addMessage(conversationId, 'USER', 'New message');
      const after = await service.getConversation(conversationId);

      expect(after!.updatedAt.getTime()).toBeGreaterThanOrEqual(before!.updatedAt.getTime());
    });
  });

  describe('Chat Functionality', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await service.createConversation('chat-test');
      conversationId = conversation.id;
    });

    it('should process chat and return both messages', async () => {
      const { userMessage, assistantMessage } = await service.chat(
        conversationId,
        'Hello',
      );

      expect(userMessage.role).toBe('USER');
      expect(userMessage.content).toBe('Hello');
      expect(assistantMessage.role).toBe('ASSISTANT');
      expect(assistantMessage.content).toBeTruthy();
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ai.chat.completed' }),
      );
    });

    it('should respond to VAT calculation queries', async () => {
      const { assistantMessage } = await service.chat(conversationId, 'Calculate VAT for me');

      expect(assistantMessage.content).toContain('VAT');
      expect(assistantMessage.contentRo).toContain('TVA');
      expect(assistantMessage.metadata?.queryType).toBe('VAT_CALCULATION');
    });

    it('should respond to invoice queries', async () => {
      const { assistantMessage } = await service.chat(conversationId, 'Help with invoice');

      expect(assistantMessage.content).toContain('invoice');
      expect(assistantMessage.metadata?.queryType).toBe('INVOICE_HELP');
    });

    it('should respond to compliance queries', async () => {
      const { assistantMessage } = await service.chat(conversationId, 'What about ANAF compliance?');

      expect(assistantMessage.content).toContain('compliance');
      expect(assistantMessage.metadata?.queryType).toBe('COMPLIANCE');
    });

    it('should respond to financial queries', async () => {
      const { assistantMessage } = await service.chat(conversationId, 'Show me revenue analysis');

      expect(assistantMessage.content).toContain('financial');
      expect(assistantMessage.metadata?.queryType).toBe('FINANCIAL');
    });

    it('should respond to deadline queries', async () => {
      const { assistantMessage } = await service.chat(conversationId, 'When is the deadline?');

      expect(assistantMessage.content).toContain('deadline');
      expect(assistantMessage.metadata?.queryType).toBe('DEADLINE');
    });

    it('should handle unknown queries gracefully', async () => {
      const { assistantMessage } = await service.chat(conversationId, 'xyzzy');

      expect(assistantMessage.content).toBeTruthy();
      expect(assistantMessage.contentRo).toBeTruthy();
    });

    it('should include Romanian translations in responses', async () => {
      const { assistantMessage } = await service.chat(conversationId, 'Calculate TVA');

      expect(assistantMessage.contentRo).toBeTruthy();
      expect(assistantMessage.contentRo).toContain('TVA');
    });
  });

  describe('Document Analysis', () => {
    it('should analyze document', async () => {
      const result = await service.analyzeDocument(
        '/files/invoice.pdf',
        'invoice.pdf',
        'application/pdf',
      );

      expect(result.id).toMatch(/^analysis-/);
      expect(result.documentType).toBe('INVOICE');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.extractedFields.length).toBeGreaterThan(0);
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ai.document.analyzed' }),
      );
    });

    it('should detect invoice document type', async () => {
      const result = await service.analyzeDocument(
        '/files/factura-001.pdf',
        'factura-001.pdf',
        'application/pdf',
      );

      expect(result.documentType).toBe('INVOICE');
    });

    it('should detect receipt document type', async () => {
      const result = await service.analyzeDocument(
        '/files/chitanta.pdf',
        'chitanta.pdf',
        'application/pdf',
      );

      expect(result.documentType).toBe('RECEIPT');
    });

    it('should detect contract document type', async () => {
      const result = await service.analyzeDocument(
        '/files/contract.pdf',
        'contract.pdf',
        'application/pdf',
      );

      expect(result.documentType).toBe('CONTRACT');
    });

    it('should detect tax document type', async () => {
      const result = await service.analyzeDocument(
        '/files/d406.xml',
        'd406.xml',
        'application/xml',
      );

      expect(result.documentType).toBe('TAX_DOCUMENT');
    });

    it('should use specified document type', async () => {
      const result = await service.analyzeDocument(
        '/files/doc.pdf',
        'doc.pdf',
        'application/pdf',
        { type: 'CONTRACT' },
      );

      expect(result.documentType).toBe('CONTRACT');
    });

    it('should extract invoice fields', async () => {
      const result = await service.analyzeDocument(
        '/files/invoice.pdf',
        'invoice.pdf',
        'application/pdf',
        { type: 'INVOICE' },
      );

      expect(result.extractedFields.some((f) => f.name === 'Invoice Number')).toBe(true);
      expect(result.extractedFields.some((f) => f.name === 'Total')).toBe(true);
      expect(result.extractedFields.some((f) => f.name === 'VAT Rate')).toBe(true);
    });

    it('should include Romanian field names', async () => {
      const result = await service.analyzeDocument(
        '/files/invoice.pdf',
        'invoice.pdf',
        'application/pdf',
        { type: 'INVOICE' },
      );

      for (const field of result.extractedFields) {
        expect(field.nameRo).toBeTruthy();
      }
    });

    it('should generate document summary', async () => {
      const result = await service.analyzeDocument(
        '/files/invoice.pdf',
        'invoice.pdf',
        'application/pdf',
        { type: 'INVOICE' },
      );

      expect(result.summary).toContain('Invoice');
      expect(result.summaryRo).toContain('Factură');
    });

    it('should track processing time', async () => {
      const result = await service.analyzeDocument(
        '/files/doc.pdf',
        'doc.pdf',
        'application/pdf',
      );

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should get analysis by ID', async () => {
      const created = await service.analyzeDocument(
        '/files/doc.pdf',
        'doc.pdf',
        'application/pdf',
      );
      const retrieved = await service.getAnalysis(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Tax Calculations', () => {
    it('should calculate VAT at 19% (before Aug 2025)', async () => {
      const calculation = await service.calculateVAT(1000, 19, {
        effectiveDate: new Date('2025-06-01'),
      });

      expect(calculation.id).toMatch(/^calc-/);
      expect(calculation.type).toBe('VAT');
      expect(calculation.baseAmount).toBe(1000);
      expect(calculation.rate).toBe(19);
      expect(calculation.taxAmount).toBe(190);
      expect(calculation.totalAmount).toBe(1190);
      expect(calculation.currency).toBe('RON');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ai.tax.calculated' }),
      );
    });

    it('should calculate VAT at 9% (before Aug 2025)', async () => {
      const calculation = await service.calculateVAT(1000, 9, {
        effectiveDate: new Date('2025-06-01'),
      });

      expect(calculation.rate).toBe(9);
      expect(calculation.taxAmount).toBe(90);
      expect(calculation.totalAmount).toBe(1090);
    });

    it('should calculate VAT at 5%', async () => {
      const calculation = await service.calculateVAT(1000, 5);

      expect(calculation.rate).toBe(5);
      expect(calculation.taxAmount).toBe(50);
      expect(calculation.totalAmount).toBe(1050);
    });

    it('should use current rate (21% after Aug 2025)', async () => {
      const calculation = await service.calculateVAT(1000);

      // After Aug 2025, 19% becomes 21%
      expect(calculation.rate).toBe(21);
    });

    it('should apply new 21% rate after August 2025', async () => {
      const calculation = await service.calculateVAT(1000, 19, {
        effectiveDate: new Date('2025-09-01'),
      });

      expect(calculation.rate).toBe(21);
      expect(calculation.taxAmount).toBe(210);
      expect(calculation.totalAmount).toBe(1210);
    });

    it('should apply new 11% rate after August 2025', async () => {
      const calculation = await service.calculateVAT(1000, 9, {
        effectiveDate: new Date('2025-09-01'),
      });

      expect(calculation.rate).toBe(11);
      expect(calculation.taxAmount).toBe(110);
    });

    it('should include breakdown', async () => {
      const calculation = await service.calculateVAT(1000, 19);

      expect(calculation.breakdown.length).toBe(2);
      expect(calculation.breakdown[0].description).toBe('Base Amount');
      expect(calculation.breakdown[0].descriptionRo).toBe('Sumă de Bază');
    });

    it('should round amounts to 2 decimal places', async () => {
      const calculation = await service.calculateVAT(999.99, 19, {
        effectiveDate: new Date('2025-06-01'),
      });

      // Check that amounts are properly rounded (may or may not have decimals)
      expect(calculation.taxAmount).toBe(Math.round(999.99 * 0.19 * 100) / 100);
      expect(calculation.totalAmount).toBe(
        Math.round((999.99 + 999.99 * 0.19) * 100) / 100,
      );
    });

    it('should include Romanian notes', async () => {
      const calculation = await service.calculateVAT(1000, 19, {
        effectiveDate: new Date('2025-06-01'),
      });

      expect(calculation.notesRo).toContain('TVA');
      expect(calculation.notesRo).toContain('19%');
    });

    it('should get calculation by ID', async () => {
      const created = await service.calculateVAT(1000, 19);
      const retrieved = await service.getCalculation(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Financial Insights', () => {
    it('should generate revenue insight', async () => {
      const insight = await service.generateInsight('cust-1', 'REVENUE', {
        percentageChange: 15,
        value: 50000,
      });

      expect(insight.id).toMatch(/^insight-/);
      expect(insight.category).toBe('REVENUE');
      expect(insight.title).toContain('Increase');
      expect(insight.titleRo).toContain('Creștere');
      expect(insight.impact).toBe('POSITIVE');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ai.insight.generated' }),
      );
    });

    it('should detect negative revenue change', async () => {
      const insight = await service.generateInsight('cust-2', 'REVENUE', {
        percentageChange: -10,
      });

      expect(insight.title).toContain('Decrease');
      expect(insight.impact).toBe('NEGATIVE');
    });

    it('should set high importance for large changes', async () => {
      const insight = await service.generateInsight('cust-3', 'REVENUE', {
        percentageChange: 25,
      });

      expect(insight.importance).toBe('HIGH');
    });

    it('should generate expense insight', async () => {
      const insight = await service.generateInsight('cust-4', 'EXPENSES', {});

      expect(insight.category).toBe('EXPENSES');
      expect(insight.titleRo).toContain('Cheltuieli');
      expect(insight.recommendation).toBeTruthy();
      expect(insight.recommendationRo).toBeTruthy();
    });

    it('should generate tax insight', async () => {
      const insight = await service.generateInsight('cust-5', 'TAX', {});

      expect(insight.category).toBe('TAX');
      expect(insight.importance).toBe('HIGH');
    });

    it('should generate cash flow insight', async () => {
      const insight = await service.generateInsight('cust-6', 'CASH_FLOW', {});

      expect(insight.category).toBe('CASH_FLOW');
      expect(insight.impact).toBe('NEGATIVE');
      expect(insight.importance).toBe('HIGH');
    });

    it('should generate compliance insight', async () => {
      const insight = await service.generateInsight('cust-7', 'COMPLIANCE', {});

      expect(insight.category).toBe('COMPLIANCE');
      expect(insight.importance).toBe('CRITICAL');
    });

    it('should generate trend insight', async () => {
      const insight = await service.generateInsight('cust-8', 'TREND', {});

      expect(insight.category).toBe('TREND');
    });

    it('should set validity period', async () => {
      const insight = await service.generateInsight('cust-9', 'REVENUE', {});

      expect(insight.validUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('should get insight by ID', async () => {
      const created = await service.generateInsight('cust-10', 'REVENUE', {});
      const retrieved = await service.getInsight(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should list insights by customer', async () => {
      await service.generateInsight('cust-11', 'REVENUE', {});
      await service.generateInsight('cust-11', 'EXPENSES', {});
      await service.generateInsight('cust-12', 'REVENUE', {});

      const insights = await service.listInsights('cust-11');
      expect(insights.length).toBe(2);
    });

    it('should filter insights by category', async () => {
      await service.generateInsight('cust-13', 'REVENUE', {});
      await service.generateInsight('cust-13', 'EXPENSES', {});

      const revenue = await service.listInsights('cust-13', { category: 'REVENUE' });
      expect(revenue.every((i) => i.category === 'REVENUE')).toBe(true);
    });

    it('should filter out expired insights', async () => {
      const insight = await service.generateInsight('cust-14', 'REVENUE', {});
      // Manually expire the insight
      insight.validUntil = new Date(Date.now() - 1000);

      const insights = await service.listInsights('cust-14');
      expect(insights.length).toBe(0);
    });
  });

  describe('Forecasting', () => {
    it('should generate forecast', async () => {
      const forecast = await service.generateForecast(
        'cust-1',
        'revenue',
        10000,
        [8000, 9000, 10000],
      );

      expect(forecast.id).toMatch(/^forecast-/);
      expect(forecast.metric).toBe('revenue');
      expect(forecast.metricRo).toBe('Venituri');
      expect(forecast.currentValue).toBe(10000);
      expect(forecast.predictions.length).toBe(3);
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ai.forecast.generated' }),
      );
    });

    it('should detect upward trend', async () => {
      const forecast = await service.generateForecast(
        'cust-2',
        'revenue',
        15000,
        [10000, 11000, 12000, 13000, 14000, 15000],
      );

      expect(forecast.trend).toBe('UP');
    });

    it('should detect downward trend', async () => {
      const forecast = await service.generateForecast(
        'cust-3',
        'revenue',
        5000,
        [10000, 9000, 8000, 7000, 6000, 5000],
      );

      expect(forecast.trend).toBe('DOWN');
    });

    it('should detect stable trend', async () => {
      const forecast = await service.generateForecast(
        'cust-4',
        'revenue',
        10000,
        [10000, 10100, 9900, 10050, 9950, 10000],
      );

      expect(forecast.trend).toBe('STABLE');
    });

    it('should generate specified number of predictions', async () => {
      const forecast = await service.generateForecast(
        'cust-5',
        'revenue',
        10000,
        [9000, 10000],
        { periods: 6 },
      );

      expect(forecast.predictions.length).toBe(6);
    });

    it('should include confidence bounds', async () => {
      const forecast = await service.generateForecast(
        'cust-6',
        'revenue',
        10000,
        [9000, 10000],
      );

      for (const prediction of forecast.predictions) {
        expect(prediction.lowerBound).toBeLessThan(prediction.value);
        expect(prediction.upperBound).toBeGreaterThan(prediction.value);
      }
    });

    it('should include factors in both languages', async () => {
      const forecast = await service.generateForecast(
        'cust-7',
        'revenue',
        10000,
        [9000, 10000],
      );

      expect(forecast.factors.length).toBeGreaterThan(0);
      expect(forecast.factorsRo.length).toBeGreaterThan(0);
    });

    it('should translate metric names', async () => {
      const forecastRevenue = await service.generateForecast('cust-8', 'revenue', 10000, [10000]);
      const forecastExpenses = await service.generateForecast('cust-8', 'expenses', 5000, [5000]);

      expect(forecastRevenue.metricRo).toBe('Venituri');
      expect(forecastExpenses.metricRo).toBe('Cheltuieli');
    });

    it('should get forecast by ID', async () => {
      const created = await service.generateForecast('cust-9', 'revenue', 10000, [10000]);
      const retrieved = await service.getForecast(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Configuration', () => {
    it('should get default config', async () => {
      const config = await service.getConfig('new-customer');

      expect(config.language).toBe('ro');
      expect(config.capabilities.length).toBeGreaterThan(0);
      expect(config.currencyFormat).toBe('RON');
      expect(config.dateFormat).toBe('DD.MM.YYYY');
    });

    it('should update config', async () => {
      await service.updateConfig('cust-config', {
        language: 'en',
        responseStyle: 'CONCISE',
      });

      const config = await service.getConfig('cust-config');
      expect(config.language).toBe('en');
      expect(config.responseStyle).toBe('CONCISE');
    });

    it('should preserve unmodified config values', async () => {
      await service.updateConfig('cust-config-2', { language: 'en' });
      const config = await service.getConfig('cust-config-2');

      expect(config.language).toBe('en');
      expect(config.currencyFormat).toBe('RON'); // Unchanged
    });
  });

  describe('Romanian Localization', () => {
    it('should translate capabilities', () => {
      expect(service.getCapabilityName('CHAT')).toBe('Conversație');
      expect(service.getCapabilityName('DOCUMENT_ANALYSIS')).toBe('Analiză Documente');
      expect(service.getCapabilityName('TAX_CALCULATION')).toBe('Calcul Taxe');
      expect(service.getCapabilityName('INVOICE_EXTRACTION')).toBe('Extragere Facturi');
      expect(service.getCapabilityName('COMPLIANCE_CHECK')).toBe('Verificare Conformitate');
      expect(service.getCapabilityName('FINANCIAL_INSIGHTS')).toBe('Analiză Financiară');
      expect(service.getCapabilityName('FORECASTING')).toBe('Prognoze');
    });

    it('should translate insight categories', () => {
      expect(service.getInsightCategoryName('REVENUE')).toBe('Venituri');
      expect(service.getInsightCategoryName('EXPENSES')).toBe('Cheltuieli');
      expect(service.getInsightCategoryName('TAX')).toBe('Taxe');
      expect(service.getInsightCategoryName('CASH_FLOW')).toBe('Flux de Numerar');
      expect(service.getInsightCategoryName('COMPLIANCE')).toBe('Conformitate');
      expect(service.getInsightCategoryName('TREND')).toBe('Tendințe');
    });

    it('should get all capabilities with translations', () => {
      const capabilities = service.getAllCapabilities();

      expect(capabilities.length).toBe(7);
      expect(capabilities).toContainEqual({
        capability: 'CHAT',
        name: 'chat',
        nameRo: 'Conversație',
      });
    });

    it('should get all insight categories with translations', () => {
      const categories = service.getAllInsightCategories();

      expect(categories.length).toBe(6);
      expect(categories).toContainEqual({
        category: 'REVENUE',
        name: 'revenue',
        nameRo: 'Venituri',
      });
    });

    it('should use Romanian diacritics correctly', () => {
      expect(service.getCapabilityName('DOCUMENT_ANALYSIS')).toContain('ă'); // Analiză
      expect(service.getCapabilityName('FINANCIAL_INSIGHTS')).toContain('ă'); // Analiză Financiară
      expect(service.getInsightCategoryName('TREND')).toContain('ț'); // Tendințe
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete chat workflow', async () => {
      // Create conversation
      const conversation = await service.createConversation('workflow-customer');

      // Ask about VAT
      const { assistantMessage: vatResponse } = await service.chat(
        conversation.id,
        'How do I calculate VAT?',
      );
      expect(vatResponse.content).toContain('VAT');

      // Ask about compliance
      const { assistantMessage: complianceResponse } = await service.chat(
        conversation.id,
        'Tell me about ANAF requirements',
      );
      expect(complianceResponse.content).toContain('ANAF');

      // Verify messages are in conversation
      const updated = await service.getConversation(conversation.id);
      // 1 system greeting + 2 user + 2 assistant = 5
      expect(updated?.messages.length).toBe(5);
    });

    it('should analyze document and generate insights', async () => {
      // Analyze invoice
      const analysis = await service.analyzeDocument(
        '/files/invoice.pdf',
        'factura.pdf',
        'application/pdf',
      );
      expect(analysis.documentType).toBe('INVOICE');

      // Generate related insight
      const insight = await service.generateInsight('insight-workflow', 'REVENUE', {
        value: parseFloat(
          analysis.extractedFields.find((f) => f.name === 'Total')?.value || '0',
        ),
        percentageChange: 10,
      });
      expect(insight.category).toBe('REVENUE');
    });

    it('should calculate VAT and forecast', async () => {
      // Calculate VAT at pre-Aug 2025 rate
      const calculation = await service.calculateVAT(5000, 19, {
        effectiveDate: new Date('2025-06-01'),
      });
      expect(calculation.totalAmount).toBe(5950);

      // Generate forecast based on historical
      const forecast = await service.generateForecast(
        'forecast-workflow',
        'revenue',
        5950,
        [5000, 5200, 5500, 5700, 5950],
      );
      expect(forecast.trend).toBe('UP');
    });

    it('should emit all relevant events', async () => {
      emittedEvents.length = 0;

      // Create conversation and chat
      const conversation = await service.createConversation('events-workflow');
      await service.chat(conversation.id, 'Hello');

      // Analyze document
      await service.analyzeDocument('/files/doc.pdf', 'doc.pdf', 'application/pdf');

      // Calculate tax
      await service.calculateVAT(1000, 19);

      // Generate insight
      await service.generateInsight('events-workflow', 'REVENUE', {});

      // Generate forecast
      await service.generateForecast('events-workflow', 'revenue', 1000, [1000]);

      const eventNames = emittedEvents.map((e) => e.event);
      expect(eventNames).toContain('ai.conversation.created');
      expect(eventNames).toContain('ai.message.added');
      expect(eventNames).toContain('ai.chat.completed');
      expect(eventNames).toContain('ai.document.analyzed');
      expect(eventNames).toContain('ai.tax.calculated');
      expect(eventNames).toContain('ai.insight.generated');
      expect(eventNames).toContain('ai.forecast.generated');
    });

    it('should handle multi-language support', async () => {
      // Create conversation
      const conversation = await service.createConversation('lang-workflow');

      // Chat in Romanian
      const { assistantMessage } = await service.chat(conversation.id, 'Calculează TVA');

      expect(assistantMessage.contentRo).toBeTruthy();
      expect(assistantMessage.contentRo).toContain('TVA');

      // Generate insight with Romanian content
      const insight = await service.generateInsight('lang-workflow', 'REVENUE', {
        percentageChange: 15,
      });
      expect(insight.titleRo).toBeTruthy();
      expect(insight.descriptionRo).toBeTruthy();
    });
  });
});
