import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiChatAssistantService } from './ai-chat-assistant.service';

describe('AiChatAssistantService', () => {
  let service: AiChatAssistantService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiChatAssistantService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiChatAssistantService>(AiChatAssistantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('conversation management', () => {
    it('should create a conversation', async () => {
      const conversation = await service.createConversation(
        'user-123',
        'tenant-456',
        'ro',
      );

      expect(conversation.id).toBeDefined();
      expect(conversation.userId).toBe('user-123');
      expect(conversation.tenantId).toBe('tenant-456');
      expect(conversation.context.language).toBe('ro');
      expect(conversation.messages).toHaveLength(0);
    });

    it('should create conversation with initial context', async () => {
      const conversation = await service.createConversation(
        'user-123',
        'tenant-456',
        'en',
        { businessType: 'SRL' },
      );

      expect(conversation.context.language).toBe('en');
      expect(conversation.context.businessType).toBe('SRL');
    });

    it('should get conversation by ID', async () => {
      const created = await service.createConversation('user-1', 'tenant-1');
      const retrieved = await service.getConversation(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent conversation', async () => {
      const result = await service.getConversation('non-existent');
      expect(result).toBeNull();
    });

    it('should get user conversations', async () => {
      await service.createConversation('user-list', 'tenant-1');
      await service.createConversation('user-list', 'tenant-1');
      await service.createConversation('other-user', 'tenant-1');

      const conversations = await service.getUserConversations('user-list');
      expect(conversations.length).toBe(2);
    });

    it('should archive conversation', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      const result = await service.archiveConversation(conversation.id);

      expect(result).toBe(true);

      const conversations = await service.getUserConversations('user-1');
      expect(conversations.length).toBe(0);
    });

    it('should include archived conversations when requested', async () => {
      const conversation = await service.createConversation('user-archive', 'tenant-1');
      await service.archiveConversation(conversation.id);

      const withArchived = await service.getUserConversations('user-archive', true);
      expect(withArchived.length).toBe(1);
    });

    it('should delete conversation', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      const deleteResult = await service.deleteConversation(conversation.id);

      expect(deleteResult).toBe(true);

      const retrieved = await service.getConversation(conversation.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('message handling', () => {
    it('should send a message and get response', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const response = await service.sendMessage(
        conversation.id,
        'Bună ziua, am o întrebare despre TVA',
      );

      expect(response.messageId).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.intent).toBeDefined();
      expect(response.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should update conversation with messages', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      await service.sendMessage(conversation.id, 'Test message');

      const updated = await service.getConversation(conversation.id);
      expect(updated?.messages.length).toBe(2); // user + assistant
    });

    it('should generate conversation title from first message', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'en');
      await service.sendMessage(conversation.id, 'Help me with VAT calculation');

      const updated = await service.getConversation(conversation.id);
      expect(updated?.title).toContain('Help');
    });

    it('should throw error for non-existent conversation', async () => {
      await expect(
        service.sendMessage('non-existent', 'test'),
      ).rejects.toThrow('Conversation not found');
    });

    it('should regenerate last response', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      await service.sendMessage(conversation.id, 'Calculeaza TVA pentru 1000 RON');

      const regenerated = await service.regenerateLastResponse(conversation.id);
      expect(regenerated).toBeDefined();
      expect(regenerated?.messageId).toBeDefined();
    });

    it('should return null when cannot regenerate', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      const result = await service.regenerateLastResponse(conversation.id);
      expect(result).toBeNull();
    });
  });

  describe('intent classification', () => {
    it('should classify VAT calculation intent', () => {
      const intent = service.classifyIntent('Calculează TVA pentru 500 RON', 'ro');
      expect(intent.type).toBe('vat_calculation');
      expect(intent.confidence).toBeGreaterThan(0.4);
    });

    it('should extract amount entity from VAT query', () => {
      const intent = service.classifyIntent('Calculează TVA pentru 1000 RON', 'ro');
      expect(intent.entities.amount).toBe(1000);
    });

    it('should classify invoice creation intent', () => {
      const intent = service.classifyIntent('Vreau să fac o factură nouă', 'ro');
      expect(intent.type).toBe('invoice_create');
    });

    it('should classify compliance intent', () => {
      const intent = service.classifyIntent('Verifică conformitatea cu ANAF', 'ro');
      expect(intent.type).toBe('compliance_check');
    });

    it('should classify HR intent', () => {
      const intent = service.classifyIntent('Care sunt contribuțiile pe salariu?', 'ro');
      expect(intent.type).toBe('hr_query');
    });

    it('should classify deadline intent', () => {
      const intent = service.classifyIntent('Când e termenul pentru declarații?', 'ro');
      expect(intent.type).toBe('deadline_query');
    });

    it('should classify explanation intent', () => {
      const intent = service.classifyIntent('Explică cum funcționează sistemul', 'ro');
      expect(intent.type).toBe('explanation');
    });

    it('should return general intent for ambiguous messages', () => {
      const intent = service.classifyIntent('Bună ziua', 'ro');
      expect(intent.type).toBe('general');
    });

    it('should provide suggested actions based on intent', () => {
      const intent = service.classifyIntent('Calculează TVA', 'ro');
      expect(intent.suggestedActions).toBeDefined();
      expect(intent.suggestedActions?.length).toBeGreaterThan(0);
    });
  });

  describe('multi-language support', () => {
    it('should respond in Romanian', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const response = await service.sendMessage(conversation.id, 'Care sunt cotele TVA?');

      expect(response.content).toContain('TVA');
    });

    it('should respond in English', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'en');
      const response = await service.sendMessage(conversation.id, 'What are the VAT rates?');

      expect(response.content).toContain('VAT');
    });

    it('should classify intents in English', () => {
      const intent = service.classifyIntent('Calculate VAT please', 'en');
      expect(intent.type).toBe('vat_calculation');
    });
  });

  describe('context management', () => {
    it('should update conversation context', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const updated = await service.updateConversationContext(conversation.id, {
        language: 'en',
        businessType: 'SA',
      });

      expect(updated?.language).toBe('en');
      expect(updated?.businessType).toBe('SA');
    });

    it('should set business context', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      const success = await service.setBusinessContext(conversation.id, {
        companyName: 'Test SRL',
        vatNumber: 'RO12345678',
        pendingDeclarations: ['SAF-T', 'TVA'],
      });

      expect(success).toBe(true);

      const retrieved = await service.getConversation(conversation.id);
      expect(retrieved?.context.businessData?.companyName).toBe('Test SRL');
    });

    it('should track recent topics', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      await service.sendMessage(conversation.id, 'Calculează TVA');
      await service.sendMessage(conversation.id, 'Info despre salarii');

      const retrieved = await service.getConversation(conversation.id);
      expect(retrieved?.context.recentTopics).toContain('vat_calculation');
    });
  });

  describe('quick actions', () => {
    it('should execute VAT calculation action', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      const result = await service.executeQuickAction(conversation.id, 'calc-vat', {
        amount: 1000,
        rate: 21,
      });

      expect(result.success).toBe(true);
      expect(result.result?.vatAmount).toBe(210);
      expect(result.result?.grossAmount).toBe(1210);
    });

    it('should execute deadline check action', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      const result = await service.executeQuickAction(conversation.id, 'deadline-check');

      expect(result.success).toBe(true);
      expect(result.result?.saftDeadline).toBeDefined();
      expect(result.result?.daysRemaining).toBeGreaterThan(0);
    });

    it('should return error for unknown action', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      const result = await service.executeQuickAction(conversation.id, 'unknown-action');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown action');
    });

    it('should return error for missing parameters', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1');
      const result = await service.executeQuickAction(conversation.id, 'calc-vat', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Amount required');
    });
  });

  describe('analytics', () => {
    it('should get chat analytics', async () => {
      await service.createConversation('user-1', 'tenant-analytics', 'ro');
      await service.createConversation('user-2', 'tenant-analytics', 'en');

      const conv1 = await service.createConversation('user-3', 'tenant-analytics');
      await service.sendMessage(conv1.id, 'Calculeaza TVA');

      const analytics = await service.getChatAnalytics('tenant-analytics');

      expect(analytics.totalConversations).toBeGreaterThanOrEqual(3);
      expect(analytics.languageDistribution).toBeDefined();
    });

    it('should track top intents', async () => {
      const conv = await service.createConversation('user-1', 'tenant-intent');
      await service.sendMessage(conv.id, 'Calculează TVA');
      await service.sendMessage(conv.id, 'Alt calcul TVA');

      const analytics = await service.getChatAnalytics('tenant-intent');
      expect(analytics.topIntents.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('export', () => {
    it('should export conversation as markdown', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      await service.sendMessage(conversation.id, 'Test message');

      const markdown = await service.exportConversation(conversation.id);

      expect(markdown).toBeDefined();
      expect(markdown).toContain('# ');
      expect(markdown).toContain('Test message');
    });

    it('should return null for non-existent conversation', async () => {
      const result = await service.exportConversation('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('response generation', () => {
    it('should generate VAT calculation response with amount', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const response = await service.sendMessage(
        conversation.id,
        'Calculează TVA pentru 1000 RON',
      );

      expect(response.content).toContain('1000');
      expect(response.content).toContain('TVA');
    });

    it('should generate compliance response', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const response = await service.sendMessage(
        conversation.id,
        'Cum funcționează SAF-T?',
      );

      expect(response.content).toContain('SAF-T');
      expect(response.sources).toBeDefined();
    });

    it('should generate HR response', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const response = await service.sendMessage(
        conversation.id,
        'Care sunt contribuțiile pe salariu?',
      );

      expect(response.content).toContain('%');
    });

    it('should generate deadline response', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const response = await service.sendMessage(
        conversation.id,
        'Când e termenul pentru declarații?',
      );

      expect(response.content).toContain('zile');
    });

    it('should generate explanation response', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const response = await service.sendMessage(
        conversation.id,
        'Explică-mi ce este e-Factura',
      );

      expect(response.content).toContain('e-Factura');
    });

    it('should include follow-up questions', async () => {
      const conversation = await service.createConversation('user-1', 'tenant-1', 'ro');
      const response = await service.sendMessage(
        conversation.id,
        'Calculează TVA',
      );

      expect(response.followUpQuestions).toBeDefined();
      expect(response.followUpQuestions.length).toBeGreaterThanOrEqual(0);
    });
  });
});
