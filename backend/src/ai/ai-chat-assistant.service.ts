import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Advanced AI Chat Assistant for DocumentIulia.ro
// Provides conversational AI with context, memory, and business intelligence

// =================== INTERFACES ===================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    tokens?: number;
    latencyMs?: number;
  };
}

export interface ChatConversation {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  messages: ChatMessage[];
  context: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}

export interface ConversationContext {
  language: 'ro' | 'en' | 'de';
  businessType?: string;
  recentTopics: string[];
  userPreferences: Record<string, any>;
  businessData?: BusinessContext;
}

export interface BusinessContext {
  companyName?: string;
  vatNumber?: string;
  fiscalYear?: string;
  recentInvoices?: number;
  recentRevenue?: number;
  pendingDeclarations?: string[];
  upcomingDeadlines?: { type: string; date: Date }[];
}

export interface ChatIntent {
  type: string;
  confidence: number;
  entities: Record<string, any>;
  suggestedActions?: SuggestedAction[];
}

export interface SuggestedAction {
  id: string;
  type: 'navigate' | 'create' | 'calculate' | 'download' | 'explain';
  label: string;
  labelRo: string;
  route?: string;
  params?: Record<string, any>;
}

export interface ChatResponse {
  messageId: string;
  content: string;
  intent: ChatIntent;
  suggestedActions: SuggestedAction[];
  followUpQuestions: string[];
  sources?: { title: string; link?: string }[];
  processingTime: number;
}

export interface ChatSummary {
  conversationId: string;
  title: string;
  messageCount: number;
  lastMessage: Date;
  topics: string[];
}

// =================== SERVICE ===================

@Injectable()
export class AiChatAssistantService {
  private readonly logger = new Logger(AiChatAssistantService.name);

  // In-memory storage (replace with DB in production)
  private conversations: Map<string, ChatConversation> = new Map();
  private messageIdCounter = 0;
  private conversationIdCounter = 0;

  // Intent patterns for classification
  private readonly intentPatterns = {
    vat_calculation: [
      /calcul(ează|a|ate)?\s*(tva|vat)/i,
      /cat(a|e)?\s*e\s*tva/i,
      /what.*vat/i,
      /tva.*%/i,
      /vat\s*(for|calculation|rate)/i,
      /calculate\s*vat/i,
    ],
    invoice_create: [
      /cre(ează|ez)\s*.*factur(a|ă)/i,
      /create.*invoice/i,
      /emit(e)?\s*factur(a|ă)/i,
      /new invoice/i,
      /vreau.*factur(a|ă)/i,
      /factur(a|ă)\s*(nouă|noua)/i,
    ],
    invoice_status: [
      /stare\s*factur(a|ă)/i,
      /invoice.*status/i,
      /factur(a|ă|i).*trimis(ă|e)?/i,
    ],
    compliance_check: [
      /conformitate/i,
      /compliance/i,
      /anaf/i,
      /saf-?t\s*d?406/i,
      /d406/i,
    ],
    hr_query: [
      /salar(iu|ii)/i,
      /angaja(t|ți)/i,
      /hr/i,
      /employee/i,
      /payroll/i,
      /concediu/i,
      /leave/i,
      /contribuți(i|ile)/i,
    ],
    report_generate: [
      /genere(a)?ză\s*raport/i,
      /generate.*report/i,
      /raport\s*(financiar|vanzari|tva)/i,
    ],
    deadline_query: [
      /termen|deadline/i,
      /când\s*(trebuie|e|este)/i,
      /when.*due/i,
      /upcoming.*date/i,
    ],
    explanation: [
      /explic(ă|a)(-mi)?/i,
      /explain/i,
      /ce\s*(este|înseamnă)\s+(e-?factura|saf-?t|tva)/i,
      /what\s*(is|does)/i,
      /cum\s*funcționează/i,
      /how.*work/i,
    ],
    navigation: [
      /unde\s*(găsesc|este)/i,
      /where\s*(is|can)/i,
      /deschide/i,
      /open/i,
      /go\s*to/i,
    ],
  };

  // System prompts for different contexts
  private readonly systemPrompts = {
    ro: `Ești DocumentIulia AI, asistentul inteligent pentru contabilitate și ERP.

Cunoștințe principale:
- TVA România: 21% standard, 11% redus (alimente, medicamente), 5% social
- SAF-T D406: Raportare lunară XML obligatorie din ianuarie 2025
- e-Factura: Format UBL 2.1, obligatorie B2B din 2026
- GDPR: Protecția datelor personale conform regulamentului UE

Instrucțiuni:
1. Răspunde concis și profesionist
2. Oferă exemple practice și cifre exacte
3. Sugerează acțiuni relevante
4. Menționează termene limită importante
5. Folosește formatare markdown când e util`,

    en: `You are DocumentIulia AI, the intelligent assistant for accounting and ERP.

Key knowledge:
- Romania VAT: 21% standard, 11% reduced (food, medicine), 5% social
- SAF-T D406: Monthly XML reporting mandatory from January 2025
- e-Invoice: UBL 2.1 format, mandatory B2B from 2026
- GDPR: Personal data protection per EU regulation

Instructions:
1. Respond concisely and professionally
2. Provide practical examples and exact figures
3. Suggest relevant actions
4. Mention important deadlines
5. Use markdown formatting when useful`,

    de: `Sie sind DocumentIulia AI, der intelligente Assistent für Buchhaltung und ERP.

Hauptwissen:
- Rumänien MwSt: 21% Standard, 11% ermäßigt (Lebensmittel, Medizin), 5% Sozial
- SAF-T D406: Monatliche XML-Berichterstattung ab Januar 2025 Pflicht
- e-Rechnung: UBL 2.1 Format, B2B-Pflicht ab 2026
- DSGVO: Schutz personenbezogener Daten gemäß EU-Verordnung

Anweisungen:
1. Antworten Sie prägnant und professionell
2. Geben Sie praktische Beispiele und genaue Zahlen
3. Schlagen Sie relevante Aktionen vor
4. Erwähnen Sie wichtige Fristen
5. Verwenden Sie Markdown-Formatierung wenn nützlich`,
  };

  constructor(private configService: ConfigService) {}

  // =================== CONVERSATION MANAGEMENT ===================

  async createConversation(
    userId: string,
    tenantId: string,
    language: 'ro' | 'en' | 'de' = 'ro',
    initialContext?: Partial<ConversationContext>,
  ): Promise<ChatConversation> {
    const id = `conv-${++this.conversationIdCounter}-${Date.now()}`;

    const conversation: ChatConversation = {
      id,
      userId,
      tenantId,
      title: language === 'ro' ? 'Conversație nouă' :
             language === 'de' ? 'Neues Gespräch' : 'New Conversation',
      messages: [],
      context: {
        language,
        recentTopics: [],
        userPreferences: {},
        ...initialContext,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
    };

    this.conversations.set(id, conversation);
    this.logger.log(`Created conversation ${id} for user ${userId}`);

    return conversation;
  }

  async getConversation(conversationId: string): Promise<ChatConversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  async getUserConversations(userId: string, includeArchived = false): Promise<ChatSummary[]> {
    const userConversations: ChatSummary[] = [];

    for (const conv of this.conversations.values()) {
      if (conv.userId === userId && (includeArchived || !conv.archived)) {
        userConversations.push({
          conversationId: conv.id,
          title: conv.title,
          messageCount: conv.messages.length,
          lastMessage: conv.updatedAt,
          topics: conv.context.recentTopics.slice(0, 5),
        });
      }
    }

    return userConversations.sort((a, b) =>
      b.lastMessage.getTime() - a.lastMessage.getTime()
    );
  }

  async archiveConversation(conversationId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;

    conversation.archived = true;
    return true;
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.conversations.delete(conversationId);
  }

  // =================== CHAT FUNCTIONALITY ===================

  async sendMessage(
    conversationId: string,
    userMessage: string,
    additionalContext?: Record<string, any>,
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Add user message
    const userMsgId = `msg-${++this.messageIdCounter}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    conversation.messages.push(userMsg);

    // Classify intent
    const intent = this.classifyIntent(userMessage, conversation.context.language);

    // Update topics
    if (intent.type !== 'general') {
      if (!conversation.context.recentTopics.includes(intent.type)) {
        conversation.context.recentTopics.unshift(intent.type);
        if (conversation.context.recentTopics.length > 10) {
          conversation.context.recentTopics.pop();
        }
      }
    }

    // Generate response
    const response = await this.generateResponse(
      conversation,
      userMessage,
      intent,
      additionalContext,
    );

    // Add assistant message
    const assistantMsgId = `msg-${++this.messageIdCounter}`;
    const processingTime = Date.now() - startTime;

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      metadata: {
        intent: intent.type,
        confidence: intent.confidence,
        latencyMs: processingTime,
      },
    };
    conversation.messages.push(assistantMsg);

    // Update conversation title if this is first message
    if (conversation.messages.length <= 2) {
      conversation.title = this.generateTitle(userMessage, conversation.context.language);
    }

    conversation.updatedAt = new Date();

    return {
      messageId: assistantMsgId,
      content: response.content,
      intent,
      suggestedActions: response.suggestedActions,
      followUpQuestions: response.followUpQuestions,
      sources: response.sources,
      processingTime,
    };
  }

  async regenerateLastResponse(conversationId: string): Promise<ChatResponse | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.messages.length < 2) return null;

    // Find last user message
    let lastUserMsgIndex = -1;
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') {
        lastUserMsgIndex = i;
        break;
      }
    }

    if (lastUserMsgIndex === -1) return null;

    const lastUserMessage = conversation.messages[lastUserMsgIndex].content;

    // Remove messages after last user message
    conversation.messages = conversation.messages.slice(0, lastUserMsgIndex + 1);

    // Regenerate with sendMessage
    return this.sendMessage(conversationId, lastUserMessage);
  }

  // =================== INTENT CLASSIFICATION ===================

  classifyIntent(message: string, language: 'ro' | 'en' | 'de'): ChatIntent {
    let bestMatch = { type: 'general', confidence: 0.3 };
    const entities: Record<string, any> = {};

    // Check each intent pattern
    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          const confidence = this.calculateConfidence(message, pattern);
          if (confidence > bestMatch.confidence) {
            bestMatch = { type: intentType, confidence };
          }
        }
      }
    }

    // Extract entities based on intent
    if (bestMatch.type === 'vat_calculation') {
      const amountMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(ron|lei|eur|€)?/i);
      if (amountMatch) {
        entities.amount = parseFloat(amountMatch[1].replace(',', '.'));
        entities.currency = amountMatch[2]?.toUpperCase() || 'RON';
      }
      const rateMatch = message.match(/(\d+)\s*%/);
      if (rateMatch) {
        entities.rate = parseInt(rateMatch[1]);
      }
    }

    if (bestMatch.type === 'deadline_query') {
      const dateMatch = message.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
      if (dateMatch) {
        entities.date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
    }

    // Get suggested actions for intent
    const suggestedActions = this.getSuggestedActionsForIntent(bestMatch.type, language);

    return {
      type: bestMatch.type,
      confidence: bestMatch.confidence,
      entities,
      suggestedActions,
    };
  }

  private calculateConfidence(message: string, pattern: RegExp): number {
    const match = message.match(pattern);
    if (!match) return 0;

    // Higher confidence for longer matches and specific terms
    const matchLength = match[0].length;
    const messageLength = message.length;
    const coverage = matchLength / messageLength;

    return Math.min(0.95, 0.5 + (coverage * 0.4));
  }

  private getSuggestedActionsForIntent(intentType: string, language: 'ro' | 'en' | 'de'): SuggestedAction[] {
    const actions: Record<string, SuggestedAction[]> = {
      vat_calculation: [
        {
          id: 'calc-vat',
          type: 'calculate',
          label: 'Open VAT Calculator',
          labelRo: 'Deschide Calculator TVA',
          route: '/dashboard/finance/vat-calculator',
        },
        {
          id: 'vat-report',
          type: 'download',
          label: 'Generate VAT Report',
          labelRo: 'Generează Raport TVA',
          route: '/dashboard/reports/vat',
        },
      ],
      invoice_create: [
        {
          id: 'new-invoice',
          type: 'create',
          label: 'Create New Invoice',
          labelRo: 'Crează Factură Nouă',
          route: '/dashboard/invoices/new',
        },
        {
          id: 'invoice-templates',
          type: 'navigate',
          label: 'View Templates',
          labelRo: 'Vezi Șabloane',
          route: '/dashboard/invoices/templates',
        },
      ],
      compliance_check: [
        {
          id: 'compliance-dashboard',
          type: 'navigate',
          label: 'Compliance Dashboard',
          labelRo: 'Panou Conformitate',
          route: '/dashboard/compliance',
        },
        {
          id: 'saft-upload',
          type: 'create',
          label: 'Upload SAF-T',
          labelRo: 'Încarcă SAF-T',
          route: '/dashboard/anaf/saft',
        },
      ],
      hr_query: [
        {
          id: 'hr-dashboard',
          type: 'navigate',
          label: 'HR Dashboard',
          labelRo: 'Panou HR',
          route: '/dashboard/hr',
        },
        {
          id: 'payroll',
          type: 'navigate',
          label: 'Payroll',
          labelRo: 'Salarizare',
          route: '/dashboard/hr/payroll',
        },
      ],
      report_generate: [
        {
          id: 'reports',
          type: 'navigate',
          label: 'Reports Center',
          labelRo: 'Centru Rapoarte',
          route: '/dashboard/reports',
        },
      ],
      deadline_query: [
        {
          id: 'calendar',
          type: 'navigate',
          label: 'View Calendar',
          labelRo: 'Vezi Calendar',
          route: '/dashboard/calendar',
        },
        {
          id: 'deadlines',
          type: 'navigate',
          label: 'Upcoming Deadlines',
          labelRo: 'Termene Viitoare',
          route: '/dashboard/deadlines',
        },
      ],
    };

    return actions[intentType] || [];
  }

  // =================== RESPONSE GENERATION ===================

  private async generateResponse(
    conversation: ChatConversation,
    userMessage: string,
    intent: ChatIntent,
    additionalContext?: Record<string, any>,
  ): Promise<{
    content: string;
    suggestedActions: SuggestedAction[];
    followUpQuestions: string[];
    sources?: { title: string; link?: string }[];
  }> {
    const { language } = conversation.context;

    // Generate response based on intent
    let content: string;
    let sources: { title: string; link?: string }[] = [];

    switch (intent.type) {
      case 'vat_calculation':
        content = this.generateVatResponse(intent.entities, language);
        sources = [
          { title: 'Legea 141/2025 - Modificări TVA', link: '/docs/vat-law-141-2025' },
        ];
        break;

      case 'invoice_create':
        content = this.generateInvoiceResponse(language);
        break;

      case 'compliance_check':
        content = this.generateComplianceResponse(language, conversation.context.businessData);
        sources = [
          { title: 'Ordin 1783/2021 - SAF-T D406', link: '/docs/saft-d406' },
          { title: 'e-Factura B2B Requirements', link: '/docs/efactura-b2b' },
        ];
        break;

      case 'hr_query':
        content = this.generateHrResponse(userMessage, language);
        break;

      case 'deadline_query':
        content = this.generateDeadlineResponse(language, conversation.context.businessData);
        break;

      case 'explanation':
        content = this.generateExplanationResponse(userMessage, language);
        break;

      default:
        content = this.generateGeneralResponse(userMessage, language);
    }

    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUpQuestions(intent.type, language);

    return {
      content,
      suggestedActions: intent.suggestedActions || [],
      followUpQuestions,
      sources,
    };
  }

  private generateVatResponse(entities: Record<string, any>, language: 'ro' | 'en' | 'de'): string {
    if (entities.amount) {
      const amount = entities.amount;
      const rate = entities.rate || 21;
      const vat = amount * (rate / 100);
      const total = amount + vat;

      if (language === 'ro') {
        return `**Calcul TVA:**

| Element | Valoare |
|---------|---------|
| Bază impozabilă | ${amount.toFixed(2)} ${entities.currency || 'RON'} |
| Cota TVA | ${rate}% |
| TVA calculat | ${vat.toFixed(2)} ${entities.currency || 'RON'} |
| **Total cu TVA** | **${total.toFixed(2)} ${entities.currency || 'RON'}** |

**Cote TVA România (Legea 141/2025):**
- 21% - cota standard
- 11% - cota redusă (alimente, medicamente, utilități)
- 5% - locuințe sociale, cărți, jurnale`;
      } else if (language === 'de') {
        return `**MwSt-Berechnung:**

| Element | Wert |
|---------|------|
| Nettobetrag | ${amount.toFixed(2)} ${entities.currency || 'RON'} |
| MwSt-Satz | ${rate}% |
| MwSt | ${vat.toFixed(2)} ${entities.currency || 'RON'} |
| **Bruttobetrag** | **${total.toFixed(2)} ${entities.currency || 'RON'}** |`;
      }
      return `**VAT Calculation:**

| Item | Value |
|------|-------|
| Net amount | ${amount.toFixed(2)} ${entities.currency || 'RON'} |
| VAT rate | ${rate}% |
| VAT amount | ${vat.toFixed(2)} ${entities.currency || 'RON'} |
| **Gross total** | **${total.toFixed(2)} ${entities.currency || 'RON'}** |`;
    }

    if (language === 'ro') {
      return `**Cotele TVA în România (din august 2025):**

| Cotă | Aplicare |
|------|----------|
| **21%** | Cota standard - majoritatea bunurilor și serviciilor |
| **11%** | Cota redusă - alimente, medicamente, utilități |
| **5%** | Cota super-redusă - locuințe sociale, cărți |

Pentru a calcula TVA, specificați suma: *"Calculează TVA pentru 1000 RON"*`;
    }

    return `**VAT Rates in Romania (from August 2025):**

| Rate | Application |
|------|-------------|
| **21%** | Standard rate - most goods and services |
| **11%** | Reduced rate - food, medicine, utilities |
| **5%** | Super-reduced - social housing, books |

To calculate VAT, specify an amount: *"Calculate VAT for 1000 RON"*`;
  }

  private generateInvoiceResponse(language: 'ro' | 'en' | 'de'): string {
    if (language === 'ro') {
      return `**Crearea unei facturi noi:**

1. **Selectați clientul** - din lista de parteneri sau adăugați unul nou
2. **Adăugați produse/servicii** - cu preț, cantitate și cotă TVA
3. **Verificați datele** - seria, numărul, data scadenței
4. **Generați factura** - format PDF sau trimiteți direct e-Factura

**Sfaturi:**
- Asigurați-vă că aveți toate datele clientului pentru e-Factura
- Verificați cota TVA corectă pentru fiecare produs
- Salvați ca șablon pentru facturi recurente`;
    }

    return `**Creating a new invoice:**

1. **Select client** - from partner list or add new
2. **Add products/services** - with price, quantity, and VAT rate
3. **Verify details** - series, number, due date
4. **Generate invoice** - PDF format or send directly via e-Invoice

**Tips:**
- Ensure you have all client data for e-Invoice
- Verify correct VAT rate for each item
- Save as template for recurring invoices`;
  }

  private generateComplianceResponse(
    language: 'ro' | 'en' | 'de',
    businessData?: BusinessContext,
  ): string {
    const deadlines = businessData?.pendingDeclarations || [];

    if (language === 'ro') {
      return `**Status Conformitate ANAF:**

**Declarații obligatorii:**
- **SAF-T D406** - raportare lunară XML (termen: 25 ale lunii următoare)
- **e-Factura** - obligatorie B2B din 2026 (format UBL 2.1)
- **Declarația TVA** - lunar/trimestrial conform cifra afaceri

**Verificări importante:**
✅ Format XML valid conform schemelor ANAF
✅ Validare CUI/CIF parteneri comerciali
✅ Semnătură electronică pentru SPV
✅ Păstrare 10 ani documente justificative

${deadlines.length > 0 ? `\n**Declarații în așteptare:** ${deadlines.join(', ')}` : ''}

**Pilot SAF-T:** Septembrie 2025 - August 2026 (6 luni perioadă de grație)`;
    }

    return `**ANAF Compliance Status:**

**Mandatory declarations:**
- **SAF-T D406** - monthly XML reporting (due: 25th of following month)
- **e-Invoice** - mandatory B2B from 2026 (UBL 2.1 format)
- **VAT Declaration** - monthly/quarterly based on turnover

**Important checks:**
✅ Valid XML format per ANAF schemas
✅ Partner VAT number validation
✅ Electronic signature for SPV
✅ 10-year document retention

${deadlines.length > 0 ? `\n**Pending declarations:** ${deadlines.join(', ')}` : ''}

**SAF-T Pilot:** September 2025 - August 2026 (6 months grace period)`;
  }

  private generateHrResponse(message: string, language: 'ro' | 'en' | 'de'): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('salar') || lowerMessage.includes('payroll')) {
      if (language === 'ro') {
        return `**Informații Salarizare:**

**Contribuții angajator (2025):**
- CAS (pensii): 25%
- CASS (sănătate): 10%
- CAM (accidente muncă): 2.25%
- **Total contribuții:** 37.25%

**Contribuții angajat:**
- CAS: 25%
- CASS: 10%
- Impozit venit: 10%
- **Total rețineri:** 45%

**Salariul minim brut:** 3.700 RON (2025)`;
      }
      return `**Payroll Information:**

**Employer contributions (2025):**
- CAS (pension): 25%
- CASS (health): 10%
- CAM (work accidents): 2.25%
- **Total contributions:** 37.25%

**Employee contributions:**
- CAS: 25%
- CASS: 10%
- Income tax: 10%
- **Total deductions:** 45%

**Minimum gross salary:** 3,700 RON (2025)`;
    }

    if (language === 'ro') {
      return `**Modulul HR disponibil:**

- 📋 Gestionare angajați și contracte
- 💰 Calcul salarial automat
- 📅 Pontaj și concedii
- 📊 Rapoarte HR și statistici
- 📤 Export pentru Revisal și ANAF

Cum vă pot ajuta cu resursele umane?`;
    }

    return `**HR Module available:**

- 📋 Employee and contract management
- 💰 Automatic payroll calculation
- 📅 Timesheets and leave management
- 📊 HR reports and statistics
- 📤 Export for Revisal and ANAF

How can I help with human resources?`;
  }

  private generateDeadlineResponse(
    language: 'ro' | 'en' | 'de',
    businessData?: BusinessContext,
  ): string {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate next SAF-T deadline (25th of next month)
    const saftDeadline = new Date(currentYear, currentMonth + 1, 25);
    const vatDeadline = new Date(currentYear, currentMonth + 1, 25);
    const daysToSaft = Math.ceil((saftDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (language === 'ro') {
      return `**Termene fiscale importante:**

| Declarație | Termen | Zile rămase |
|------------|--------|-------------|
| SAF-T D406 | ${saftDeadline.toLocaleDateString('ro-RO')} | ${daysToSaft} zile |
| Declarație TVA | ${vatDeadline.toLocaleDateString('ro-RO')} | ${daysToSaft} zile |
| Contribuții sociale | ${saftDeadline.toLocaleDateString('ro-RO')} | ${daysToSaft} zile |

**Atenție:** ${daysToSaft <= 7 ? '⚠️ Mai puțin de o săptămână!' : daysToSaft <= 14 ? '📅 Pregătiți documentele' : '✅ Timp suficient'}

**Pilot SAF-T:** În vigoare până în august 2026`;
    }

    return `**Important tax deadlines:**

| Declaration | Deadline | Days left |
|-------------|----------|-----------|
| SAF-T D406 | ${saftDeadline.toLocaleDateString('en-US')} | ${daysToSaft} days |
| VAT Declaration | ${vatDeadline.toLocaleDateString('en-US')} | ${daysToSaft} days |
| Social contributions | ${saftDeadline.toLocaleDateString('en-US')} | ${daysToSaft} days |

**Notice:** ${daysToSaft <= 7 ? '⚠️ Less than a week!' : daysToSaft <= 14 ? '📅 Prepare documents' : '✅ Sufficient time'}

**SAF-T Pilot:** Active until August 2026`;
  }

  private generateExplanationResponse(message: string, language: 'ro' | 'en' | 'de'): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('saf-t') || lowerMessage.includes('d406')) {
      if (language === 'ro') {
        return `**Ce este SAF-T D406?**

SAF-T (Standard Audit File for Tax) este un standard internațional de raportare fiscală în format XML.

**Obligativitate în România:**
- Din ianuarie 2025 pentru firme mici și nerezidenți
- Raportare **lunară** până pe data de 25
- Format XML conform schemelor ANAF

**Conținut:**
- Date master (parteneri, produse, conturi)
- Tranzacții (facturi, plăți, încasări)
- Inventar și active fixe

**Beneficii:**
- Reducere birocratică
- Audit fiscal digital
- Conformitate europeană`;
      }
      return `**What is SAF-T D406?**

SAF-T (Standard Audit File for Tax) is an international tax reporting standard in XML format.

**Mandatory in Romania:**
- From January 2025 for small companies and non-residents
- **Monthly** reporting by the 25th
- XML format per ANAF schemas

**Content:**
- Master data (partners, products, accounts)
- Transactions (invoices, payments, receipts)
- Inventory and fixed assets

**Benefits:**
- Reduced bureaucracy
- Digital tax audit
- European compliance`;
    }

    if (lowerMessage.includes('e-factura') || lowerMessage.includes('e-invoice')) {
      if (language === 'ro') {
        return `**Ce este e-Factura?**

E-Factura este sistemul electronic de facturare al ANAF, obligatoriu pentru tranzacții B2B.

**Format:** UBL 2.1 (Universal Business Language)
**Transmitere:** Prin SPV (Spațiul Privat Virtual)

**Timeline:**
- 2024: Obligatorie B2G (către instituții publice)
- 2026: Obligatorie B2B (între firme)

**Avantaje:**
- Validare automată date
- Reducere erori facturare
- Traceabilitate completă`;
      }
      return `**What is e-Invoice?**

E-Invoice is ANAF's electronic invoicing system, mandatory for B2B transactions.

**Format:** UBL 2.1 (Universal Business Language)
**Transmission:** Via SPV (Private Virtual Space)

**Timeline:**
- 2024: Mandatory B2G (to public institutions)
- 2026: Mandatory B2B (between companies)

**Advantages:**
- Automatic data validation
- Reduced invoicing errors
- Complete traceability`;
    }

    // Generic explanation
    if (language === 'ro') {
      return `Desigur! Vă pot explica diverse aspecte despre:

- **Contabilitate** - TVA, declarații, balanțe
- **Fiscalitate** - SAF-T, e-Factura, ANAF
- **HR** - Salarizare, contribuții, concedii
- **ERP** - Module, funcționalități, integrări

Ce anume doriți să vă explic mai detaliat?`;
    }

    return `Of course! I can explain various aspects about:

- **Accounting** - VAT, declarations, balances
- **Tax** - SAF-T, e-Invoice, ANAF
- **HR** - Payroll, contributions, leave
- **ERP** - Modules, features, integrations

What would you like me to explain in more detail?`;
  }

  private generateGeneralResponse(message: string, language: 'ro' | 'en' | 'de'): string {
    if (language === 'ro') {
      return `Înțeleg întrebarea dumneavoastră. Ca asistent DocumentIulia, vă pot ajuta cu:

📊 **Contabilitate & Finanțe**
- Calcule TVA și declarații fiscale
- Rapoarte financiare și analize

📋 **Conformitate ANAF**
- SAF-T D406 și e-Factura
- Validări și termene limită

👥 **Resurse Umane**
- Salarizare și contribuții
- Gestiune angajați

📦 **Operațiuni**
- Gestiune stocuri și inventar
- Facturare și încasări

Cum vă pot ajuta astăzi?`;
    }

    return `I understand your question. As DocumentIulia assistant, I can help with:

📊 **Accounting & Finance**
- VAT calculations and tax declarations
- Financial reports and analysis

📋 **ANAF Compliance**
- SAF-T D406 and e-Invoice
- Validations and deadlines

👥 **Human Resources**
- Payroll and contributions
- Employee management

📦 **Operations**
- Inventory and stock management
- Invoicing and collections

How can I help you today?`;
  }

  private generateFollowUpQuestions(intentType: string, language: 'ro' | 'en' | 'de'): string[] {
    const questions: Record<string, Record<string, string[]>> = {
      vat_calculation: {
        ro: [
          'Doriți să generez un raport TVA?',
          'Aveți nevoie de calcul pentru alte sume?',
          'Vreți să vedeți istoricul declarațiilor TVA?',
        ],
        en: [
          'Would you like me to generate a VAT report?',
          'Do you need calculations for other amounts?',
          'Want to see VAT declaration history?',
        ],
        de: [
          'Möchten Sie einen MwSt-Bericht erstellen?',
          'Brauchen Sie Berechnungen für andere Beträge?',
          'Möchten Sie die MwSt-Erklärungshistorie sehen?',
        ],
      },
      compliance_check: {
        ro: [
          'Doriți să verificăm conformitatea documentelor?',
          'Aveți nevoie de ajutor cu SAF-T D406?',
          'Vreți să setăm alerte pentru termene?',
        ],
        en: [
          'Would you like us to check document compliance?',
          'Do you need help with SAF-T D406?',
          'Want to set up deadline alerts?',
        ],
        de: [
          'Möchten Sie die Dokumentenkonformität prüfen?',
          'Brauchen Sie Hilfe mit SAF-T D406?',
          'Möchten Sie Fristen-Benachrichtigungen einrichten?',
        ],
      },
      hr_query: {
        ro: [
          'Doriți să calculăm un salariu net?',
          'Aveți nevoie de raport contributii?',
          'Vreți să vedeți situația concediilor?',
        ],
        en: [
          'Would you like to calculate a net salary?',
          'Do you need a contributions report?',
          'Want to see the leave situation?',
        ],
        de: [
          'Möchten Sie ein Nettogehalt berechnen?',
          'Brauchen Sie einen Beitragsbericht?',
          'Möchten Sie den Urlaubsstatus sehen?',
        ],
      },
    };

    const intentQuestions = questions[intentType];
    if (!intentQuestions) return [];

    return intentQuestions[language] || intentQuestions['en'] || [];
  }

  private generateTitle(message: string, language: 'ro' | 'en' | 'de'): string {
    // Extract key topic from first message
    const words = message.split(/\s+/).slice(0, 5).join(' ');
    const truncated = words.length > 40 ? words.substring(0, 40) + '...' : words;
    return truncated || (language === 'ro' ? 'Conversație nouă' : 'New conversation');
  }

  // =================== CONTEXT MANAGEMENT ===================

  async updateConversationContext(
    conversationId: string,
    contextUpdate: Partial<ConversationContext>,
  ): Promise<ConversationContext | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    conversation.context = {
      ...conversation.context,
      ...contextUpdate,
    };

    return conversation.context;
  }

  async setBusinessContext(
    conversationId: string,
    businessData: BusinessContext,
  ): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;

    conversation.context.businessData = businessData;
    return true;
  }

  // =================== QUICK ACTIONS ===================

  async executeQuickAction(
    conversationId: string,
    actionId: string,
    params?: Record<string, any>,
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    switch (actionId) {
      case 'calc-vat':
        if (params?.amount) {
          const rate = params.rate || 21;
          const vat = params.amount * (rate / 100);
          return {
            success: true,
            result: {
              netAmount: params.amount,
              vatRate: rate,
              vatAmount: vat,
              grossAmount: params.amount + vat,
            },
          };
        }
        return { success: false, error: 'Amount required' };

      case 'deadline-check':
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 25);
        return {
          success: true,
          result: {
            saftDeadline: nextMonth,
            daysRemaining: Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          },
        };

      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  // =================== ANALYTICS ===================

  async getChatAnalytics(tenantId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    avgMessagesPerConversation: number;
    topIntents: { intent: string; count: number }[];
    languageDistribution: Record<string, number>;
  }> {
    let totalConversations = 0;
    let totalMessages = 0;
    const intentCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};

    for (const conv of this.conversations.values()) {
      if (conv.tenantId === tenantId) {
        totalConversations++;
        totalMessages += conv.messages.length;

        // Count languages
        const lang = conv.context.language;
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;

        // Count intents from messages
        for (const msg of conv.messages) {
          if (msg.metadata?.intent) {
            const intent = msg.metadata.intent;
            intentCounts[intent] = (intentCounts[intent] || 0) + 1;
          }
        }
      }
    }

    const topIntents = Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalConversations,
      totalMessages,
      avgMessagesPerConversation: totalConversations > 0 ? totalMessages / totalConversations : 0,
      topIntents,
      languageDistribution: languageCounts,
    };
  }

  // =================== EXPORT ===================

  async exportConversation(conversationId: string): Promise<string | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const lines: string[] = [
      `# ${conversation.title}`,
      `Date: ${conversation.createdAt.toISOString()}`,
      `Language: ${conversation.context.language}`,
      '',
      '---',
      '',
    ];

    for (const msg of conversation.messages) {
      const role = msg.role === 'user' ? '**Utilizator:**' : '**DocumentIulia AI:**';
      lines.push(role);
      lines.push(msg.content);
      lines.push('');
    }

    return lines.join('\n');
  }
}
