import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type ConversationStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export type AssistantCapability =
  | 'CHAT'
  | 'DOCUMENT_ANALYSIS'
  | 'TAX_CALCULATION'
  | 'INVOICE_EXTRACTION'
  | 'COMPLIANCE_CHECK'
  | 'FINANCIAL_INSIGHTS'
  | 'FORECASTING';

export type DocumentAnalysisType = 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'TAX_DOCUMENT' | 'GENERAL';

export type InsightCategory = 'REVENUE' | 'EXPENSES' | 'TAX' | 'CASH_FLOW' | 'COMPLIANCE' | 'TREND';

export interface Conversation {
  id: string;
  customerId: string;
  title: string;
  status: ConversationStatus;
  messages: Message[];
  context?: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  contentRo?: string;
  attachments: Attachment[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  type: string;
  name: string;
  url: string;
  size: number;
  extractedData?: Record<string, any>;
}

export interface ConversationContext {
  recentDocuments?: string[];
  activeInvoices?: string[];
  complianceIssues?: string[];
  customData?: Record<string, any>;
}

export interface DocumentAnalysisResult {
  id: string;
  documentType: DocumentAnalysisType;
  confidence: number;
  extractedFields: ExtractedField[];
  summary: string;
  summaryRo: string;
  warnings: string[];
  warningsRo: string[];
  processingTime: number;
  createdAt: Date;
}

export interface ExtractedField {
  name: string;
  nameRo: string;
  value: string;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface TaxCalculation {
  id: string;
  type: 'VAT' | 'INCOME' | 'PROFIT' | 'CONTRIBUTION';
  baseAmount: number;
  rate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  breakdown: TaxBreakdownItem[];
  effectiveDate: Date;
  notes: string;
  notesRo: string;
  createdAt: Date;
}

export interface TaxBreakdownItem {
  description: string;
  descriptionRo: string;
  amount: number;
  rate?: number;
}

export interface FinancialInsight {
  id: string;
  customerId: string;
  category: InsightCategory;
  title: string;
  titleRo: string;
  description: string;
  descriptionRo: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  value?: number;
  percentageChange?: number;
  recommendation?: string;
  recommendationRo?: string;
  relatedData?: Record<string, any>;
  validUntil: Date;
  createdAt: Date;
}

export interface ForecastResult {
  id: string;
  customerId: string;
  metric: string;
  metricRo: string;
  currentValue: number;
  predictions: ForecastPrediction[];
  confidence: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  factors: string[];
  factorsRo: string[];
  methodology: string;
  createdAt: Date;
}

export interface ForecastPrediction {
  period: Date;
  value: number;
  lowerBound: number;
  upperBound: number;
}

export interface AssistantConfig {
  language: 'ro' | 'en';
  capabilities: AssistantCapability[];
  maxContextMessages: number;
  responseStyle: 'CONCISE' | 'DETAILED' | 'CONVERSATIONAL';
  includeExplanations: boolean;
  currencyFormat: string;
  dateFormat: string;
}

// Romanian translations for capabilities
const CAPABILITY_TRANSLATIONS: Record<AssistantCapability, string> = {
  CHAT: 'Conversație',
  DOCUMENT_ANALYSIS: 'Analiză Documente',
  TAX_CALCULATION: 'Calcul Taxe',
  INVOICE_EXTRACTION: 'Extragere Facturi',
  COMPLIANCE_CHECK: 'Verificare Conformitate',
  FINANCIAL_INSIGHTS: 'Analiză Financiară',
  FORECASTING: 'Prognoze',
};

// Romanian translations for insight categories
const INSIGHT_CATEGORY_TRANSLATIONS: Record<InsightCategory, string> = {
  REVENUE: 'Venituri',
  EXPENSES: 'Cheltuieli',
  TAX: 'Taxe',
  CASH_FLOW: 'Flux de Numerar',
  COMPLIANCE: 'Conformitate',
  TREND: 'Tendințe',
};

// Default assistant responses in Romanian
const ASSISTANT_RESPONSES = {
  GREETING: {
    en: 'Hello! I am your AI assistant for DocumentIulia. How can I help you today?',
    ro: 'Bună ziua! Sunt asistentul dumneavoastră AI pentru DocumentIulia. Cum vă pot ajuta astăzi?',
  },
  UNKNOWN_QUERY: {
    en: 'I apologize, but I could not understand your request. Could you please rephrase it?',
    ro: 'Îmi cer scuze, dar nu am înțeles solicitarea dumneavoastră. Puteți reformula, vă rog?',
  },
  PROCESSING: {
    en: 'I am processing your request. Please wait a moment...',
    ro: 'Procesez solicitarea dumneavoastră. Vă rog așteptați un moment...',
  },
  ERROR: {
    en: 'An error occurred while processing your request. Please try again.',
    ro: 'A apărut o eroare la procesarea solicitării. Vă rugăm încercați din nou.',
  },
};

// Common business queries patterns
const QUERY_PATTERNS = {
  VAT_CALCULATION: /(?:calc|comput|what|care|cât|câte?).*(?:vat|tva|tax|taxă)/i,
  INVOICE_HELP: /(?:invoice|factură|facturi|billing|facturare)/i,
  COMPLIANCE: /(?:anaf|compliance|conformitate|d406|saf-t|e-factura)/i,
  FINANCIAL: /(?:revenue|profit|loss|venit|pierdere|cash|numerar|flow)/i,
  DEADLINE: /(?:deadline|termen|când|when|due|scadent)/i,
};

@Injectable()
export class AIAssistantService implements OnModuleInit {
  private conversations: Map<string, Conversation> = new Map();
  private analyses: Map<string, DocumentAnalysisResult> = new Map();
  private calculations: Map<string, TaxCalculation> = new Map();
  private insights: Map<string, FinancialInsight> = new Map();
  private forecasts: Map<string, ForecastResult> = new Map();
  private configs: Map<string, AssistantConfig> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    // Initialize service
  }

  // Conversation Management
  async createConversation(
    customerId: string,
    title?: string,
    context?: ConversationContext,
  ): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: this.generateId('conv'),
      customerId,
      title: title || `Conversation ${now.toLocaleDateString('ro-RO')}`,
      status: 'ACTIVE',
      messages: [],
      context,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(conversation.id, conversation);

    // Add system greeting
    await this.addMessage(conversation.id, 'SYSTEM', ASSISTANT_RESPONSES.GREETING.ro, {
      contentRo: ASSISTANT_RESPONSES.GREETING.ro,
    });

    this.eventEmitter.emit('ai.conversation.created', {
      conversationId: conversation.id,
      customerId,
    });

    return conversation;
  }

  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    return this.conversations.get(conversationId);
  }

  async listConversations(
    customerId: string,
    options: { status?: ConversationStatus; limit?: number } = {},
  ): Promise<Conversation[]> {
    let conversations = Array.from(this.conversations.values()).filter(
      (c) => c.customerId === customerId,
    );

    if (options.status) {
      conversations = conversations.filter((c) => c.status === options.status);
    }

    conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (options.limit) {
      conversations = conversations.slice(0, options.limit);
    }

    return conversations;
  }

  async archiveConversation(conversationId: string): Promise<Conversation> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    conversation.status = 'ARCHIVED';
    conversation.updatedAt = new Date();
    this.conversations.set(conversationId, conversation);

    return conversation;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    conversation.status = 'DELETED';
    this.conversations.set(conversationId, conversation);
  }

  // Message Management
  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    options: {
      contentRo?: string;
      attachments?: Attachment[];
      metadata?: Record<string, any>;
    } = {},
  ): Promise<Message> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const message: Message = {
      id: this.generateId('msg'),
      conversationId,
      role,
      content,
      contentRo: options.contentRo,
      attachments: options.attachments || [],
      metadata: options.metadata,
      createdAt: new Date(),
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    this.conversations.set(conversationId, conversation);

    this.eventEmitter.emit('ai.message.added', {
      conversationId,
      messageId: message.id,
      role,
    });

    return message;
  }

  async chat(
    conversationId: string,
    userMessage: string,
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    // Add user message
    const user = await this.addMessage(conversationId, 'USER', userMessage);

    // Process and generate response
    const response = await this.processQuery(userMessage, conversationId);

    // Add assistant response
    const assistant = await this.addMessage(conversationId, 'ASSISTANT', response.content, {
      contentRo: response.contentRo,
      metadata: response.metadata,
    });

    this.eventEmitter.emit('ai.chat.completed', {
      conversationId,
      queryType: response.queryType,
    });

    return { userMessage: user, assistantMessage: assistant };
  }

  private async processQuery(
    query: string,
    conversationId: string,
  ): Promise<{
    content: string;
    contentRo: string;
    queryType: string;
    metadata?: Record<string, any>;
  }> {
    // Detect query type
    let queryType = 'GENERAL';
    let content = '';
    let contentRo = '';
    let metadata: Record<string, any> = {};

    if (QUERY_PATTERNS.VAT_CALCULATION.test(query)) {
      queryType = 'VAT_CALCULATION';
      content =
        'I can help you calculate VAT. The current standard rate is 19% (21% from August 2025). Please provide the base amount.';
      contentRo =
        'Vă pot ajuta cu calculul TVA. Cota standard actuală este 19% (21% din august 2025). Vă rugăm să furnizați suma de bază.';
    } else if (QUERY_PATTERNS.INVOICE_HELP.test(query)) {
      queryType = 'INVOICE_HELP';
      content =
        'I can help with invoices. Would you like to create a new invoice, upload one for analysis, or check e-Factura status?';
      contentRo =
        'Vă pot ajuta cu facturile. Doriți să creați o factură nouă, să încărcați una pentru analiză sau să verificați statusul e-Factura?';
    } else if (QUERY_PATTERNS.COMPLIANCE.test(query)) {
      queryType = 'COMPLIANCE';
      content =
        'I can help with compliance matters. ANAF requires e-Factura for B2B invoices and monthly D406 SAF-T submissions.';
      contentRo =
        'Vă pot ajuta cu problemele de conformitate. ANAF solicită e-Factura pentru facturi B2B și transmiterea lunară D406 SAF-T.';
    } else if (QUERY_PATTERNS.FINANCIAL.test(query)) {
      queryType = 'FINANCIAL';
      content = 'I can provide financial insights. Would you like to see revenue trends, expense analysis, or cash flow forecast?';
      contentRo =
        'Vă pot oferi analize financiare. Doriți să vedeți tendințele veniturilor, analiza cheltuielilor sau prognoza fluxului de numerar?';
    } else if (QUERY_PATTERNS.DEADLINE.test(query)) {
      queryType = 'DEADLINE';
      content =
        'Important deadlines: D406 SAF-T is due monthly by the 25th. e-Factura must be submitted within 5 working days of invoice issuance.';
      contentRo =
        'Termene importante: D406 SAF-T se depune lunar până pe 25. e-Factura trebuie transmisă în 5 zile lucrătoare de la emiterea facturii.';
    } else {
      content = ASSISTANT_RESPONSES.UNKNOWN_QUERY.en;
      contentRo = ASSISTANT_RESPONSES.UNKNOWN_QUERY.ro;
    }

    metadata = { queryType, processedAt: new Date() };

    return { content, contentRo, queryType, metadata };
  }

  // Document Analysis
  async analyzeDocument(
    fileUrl: string,
    fileName: string,
    mimeType: string,
    options: { type?: DocumentAnalysisType } = {},
  ): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();

    // Detect document type if not specified
    const documentType = options.type || this.detectDocumentType(fileName, mimeType);

    // Simulate OCR and field extraction
    const extractedFields = this.simulateFieldExtraction(documentType);

    const result: DocumentAnalysisResult = {
      id: this.generateId('analysis'),
      documentType,
      confidence: 0.95,
      extractedFields,
      summary: this.generateDocumentSummary(documentType, extractedFields),
      summaryRo: this.generateDocumentSummaryRo(documentType, extractedFields),
      warnings: this.generateWarnings(documentType, extractedFields),
      warningsRo: this.generateWarningsRo(documentType, extractedFields),
      processingTime: Date.now() - startTime,
      createdAt: new Date(),
    };

    this.analyses.set(result.id, result);

    this.eventEmitter.emit('ai.document.analyzed', {
      analysisId: result.id,
      documentType,
      confidence: result.confidence,
    });

    return result;
  }

  async getAnalysis(analysisId: string): Promise<DocumentAnalysisResult | undefined> {
    return this.analyses.get(analysisId);
  }

  private detectDocumentType(fileName: string, mimeType: string): DocumentAnalysisType {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('factur') || lowerName.includes('invoice')) return 'INVOICE';
    if (lowerName.includes('chitant') || lowerName.includes('receipt')) return 'RECEIPT';
    if (lowerName.includes('contract')) return 'CONTRACT';
    if (lowerName.includes('d406') || lowerName.includes('tax')) return 'TAX_DOCUMENT';
    return 'GENERAL';
  }

  private simulateFieldExtraction(type: DocumentAnalysisType): ExtractedField[] {
    const fields: ExtractedField[] = [];

    switch (type) {
      case 'INVOICE':
        fields.push(
          { name: 'Invoice Number', nameRo: 'Număr Factură', value: 'FV-2025-00123', confidence: 0.98 },
          { name: 'Issue Date', nameRo: 'Data Emiterii', value: '2025-01-15', confidence: 0.97 },
          { name: 'Supplier CUI', nameRo: 'CUI Furnizor', value: 'RO12345678', confidence: 0.99 },
          { name: 'Customer CUI', nameRo: 'CUI Client', value: 'RO87654321', confidence: 0.99 },
          { name: 'Subtotal', nameRo: 'Subtotal', value: '1000.00', confidence: 0.96 },
          { name: 'VAT Rate', nameRo: 'Cotă TVA', value: '19%', confidence: 0.98 },
          { name: 'VAT Amount', nameRo: 'Valoare TVA', value: '190.00', confidence: 0.96 },
          { name: 'Total', nameRo: 'Total', value: '1190.00', confidence: 0.97 },
        );
        break;
      case 'RECEIPT':
        fields.push(
          { name: 'Receipt Number', nameRo: 'Număr Chitanță', value: 'CH-2025-456', confidence: 0.97 },
          { name: 'Date', nameRo: 'Data', value: '2025-01-15', confidence: 0.98 },
          { name: 'Amount', nameRo: 'Sumă', value: '500.00', confidence: 0.96 },
          { name: 'Payment Method', nameRo: 'Metodă Plată', value: 'Card', confidence: 0.95 },
        );
        break;
      case 'CONTRACT':
        fields.push(
          { name: 'Contract Number', nameRo: 'Număr Contract', value: 'CTR-2025-001', confidence: 0.98 },
          { name: 'Start Date', nameRo: 'Data Început', value: '2025-01-01', confidence: 0.97 },
          { name: 'End Date', nameRo: 'Data Sfârșit', value: '2025-12-31', confidence: 0.97 },
          { name: 'Parties', nameRo: 'Părți', value: '2 parties identified', confidence: 0.94 },
        );
        break;
      case 'TAX_DOCUMENT':
        fields.push(
          { name: 'Form Type', nameRo: 'Tip Formular', value: 'D406', confidence: 0.99 },
          { name: 'Period', nameRo: 'Perioadă', value: '2025-01', confidence: 0.98 },
          { name: 'Taxpayer CUI', nameRo: 'CUI Contribuabil', value: 'RO12345678', confidence: 0.99 },
        );
        break;
      default:
        fields.push({ name: 'Document Type', nameRo: 'Tip Document', value: 'General', confidence: 0.85 });
    }

    return fields;
  }

  private generateDocumentSummary(type: DocumentAnalysisType, fields: ExtractedField[]): string {
    switch (type) {
      case 'INVOICE':
        const total = fields.find((f) => f.name === 'Total')?.value || 'N/A';
        return `Invoice detected with total amount of ${total} RON including VAT.`;
      case 'RECEIPT':
        const amount = fields.find((f) => f.name === 'Amount')?.value || 'N/A';
        return `Receipt for payment of ${amount} RON.`;
      case 'CONTRACT':
        return `Contract document with defined terms and parties.`;
      case 'TAX_DOCUMENT':
        const formType = fields.find((f) => f.name === 'Form Type')?.value || 'N/A';
        return `Tax document of type ${formType}.`;
      default:
        return `General document processed.`;
    }
  }

  private generateDocumentSummaryRo(type: DocumentAnalysisType, fields: ExtractedField[]): string {
    switch (type) {
      case 'INVOICE':
        const total = fields.find((f) => f.name === 'Total')?.value || 'N/A';
        return `Factură detectată cu suma totală de ${total} RON inclusiv TVA.`;
      case 'RECEIPT':
        const amount = fields.find((f) => f.name === 'Amount')?.value || 'N/A';
        return `Chitanță pentru plata de ${amount} RON.`;
      case 'CONTRACT':
        return `Document contract cu termeni și părți definite.`;
      case 'TAX_DOCUMENT':
        const formType = fields.find((f) => f.name === 'Form Type')?.value || 'N/A';
        return `Document fiscal de tip ${formType}.`;
      default:
        return `Document general procesat.`;
    }
  }

  private generateWarnings(type: DocumentAnalysisType, fields: ExtractedField[]): string[] {
    const warnings: string[] = [];

    if (type === 'INVOICE') {
      const vatRate = fields.find((f) => f.name === 'VAT Rate')?.value;
      if (vatRate && vatRate !== '19%' && vatRate !== '9%' && vatRate !== '5%') {
        warnings.push(`Unusual VAT rate detected: ${vatRate}`);
      }
    }

    // Check confidence levels
    const lowConfidence = fields.filter((f) => f.confidence < 0.9);
    if (lowConfidence.length > 0) {
      warnings.push(`${lowConfidence.length} field(s) have low confidence and may need verification`);
    }

    return warnings;
  }

  private generateWarningsRo(type: DocumentAnalysisType, fields: ExtractedField[]): string[] {
    const warnings: string[] = [];

    if (type === 'INVOICE') {
      const vatRate = fields.find((f) => f.name === 'VAT Rate')?.value;
      if (vatRate && vatRate !== '19%' && vatRate !== '9%' && vatRate !== '5%') {
        warnings.push(`Cotă TVA neobișnuită detectată: ${vatRate}`);
      }
    }

    const lowConfidence = fields.filter((f) => f.confidence < 0.9);
    if (lowConfidence.length > 0) {
      warnings.push(`${lowConfidence.length} câmp(uri) au încredere scăzută și pot necesita verificare`);
    }

    return warnings;
  }

  // Tax Calculations
  async calculateVAT(
    baseAmount: number,
    rate: number = 19,
    options: { includeBreakdown?: boolean; effectiveDate?: Date } = {},
  ): Promise<TaxCalculation> {
    const effectiveDate = options.effectiveDate || new Date();

    // Check if new rates apply (after August 2025)
    const newRatesDate = new Date('2025-08-01');
    let actualRate = rate;
    if (effectiveDate >= newRatesDate) {
      if (rate === 19) actualRate = 21;
      else if (rate === 9) actualRate = 11;
    }

    const taxAmount = baseAmount * (actualRate / 100);
    const totalAmount = baseAmount + taxAmount;

    const calculation: TaxCalculation = {
      id: this.generateId('calc'),
      type: 'VAT',
      baseAmount,
      rate: actualRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: 'RON',
      breakdown: [
        {
          description: 'Base Amount',
          descriptionRo: 'Sumă de Bază',
          amount: baseAmount,
        },
        {
          description: `VAT ${actualRate}%`,
          descriptionRo: `TVA ${actualRate}%`,
          amount: Math.round(taxAmount * 100) / 100,
          rate: actualRate,
        },
      ],
      effectiveDate,
      notes: `VAT calculated at ${actualRate}% rate`,
      notesRo: `TVA calculat la cota de ${actualRate}%`,
      createdAt: new Date(),
    };

    this.calculations.set(calculation.id, calculation);

    this.eventEmitter.emit('ai.tax.calculated', {
      calculationId: calculation.id,
      type: 'VAT',
      baseAmount,
      taxAmount: calculation.taxAmount,
    });

    return calculation;
  }

  async getCalculation(calculationId: string): Promise<TaxCalculation | undefined> {
    return this.calculations.get(calculationId);
  }

  // Financial Insights
  async generateInsight(
    customerId: string,
    category: InsightCategory,
    data: Record<string, any>,
  ): Promise<FinancialInsight> {
    const insight = this.createInsightFromData(customerId, category, data);
    this.insights.set(insight.id, insight);

    this.eventEmitter.emit('ai.insight.generated', {
      insightId: insight.id,
      customerId,
      category,
    });

    return insight;
  }

  async getInsight(insightId: string): Promise<FinancialInsight | undefined> {
    return this.insights.get(insightId);
  }

  async listInsights(
    customerId: string,
    options: { category?: InsightCategory; importance?: string } = {},
  ): Promise<FinancialInsight[]> {
    let insights = Array.from(this.insights.values()).filter((i) => i.customerId === customerId);

    // Filter out expired insights
    const now = new Date();
    insights = insights.filter((i) => i.validUntil > now);

    if (options.category) {
      insights = insights.filter((i) => i.category === options.category);
    }
    if (options.importance) {
      insights = insights.filter((i) => i.importance === options.importance);
    }

    return insights.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private createInsightFromData(
    customerId: string,
    category: InsightCategory,
    data: Record<string, any>,
  ): FinancialInsight {
    let title = '';
    let titleRo = '';
    let description = '';
    let descriptionRo = '';
    let impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
    let importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    let recommendation = '';
    let recommendationRo = '';

    switch (category) {
      case 'REVENUE':
        const revenueChange = data.percentageChange || 0;
        title = `Revenue ${revenueChange >= 0 ? 'Increase' : 'Decrease'} Detected`;
        titleRo = `${revenueChange >= 0 ? 'Creștere' : 'Scădere'} Venituri Detectată`;
        description = `Your revenue has ${revenueChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueChange)}%`;
        descriptionRo = `Veniturile dumneavoastră au ${revenueChange >= 0 ? 'crescut' : 'scăzut'} cu ${Math.abs(revenueChange)}%`;
        impact = revenueChange >= 0 ? 'POSITIVE' : 'NEGATIVE';
        importance = Math.abs(revenueChange) > 20 ? 'HIGH' : 'MEDIUM';
        break;

      case 'EXPENSES':
        title = 'Expense Pattern Analysis';
        titleRo = 'Analiză Model Cheltuieli';
        description = 'Analysis of your expense patterns reveals optimization opportunities';
        descriptionRo = 'Analiza modelelor de cheltuieli relevă oportunități de optimizare';
        recommendation = 'Review recurring expenses for potential savings';
        recommendationRo = 'Revizuiți cheltuielile recurente pentru posibile economii';
        break;

      case 'TAX':
        title = 'Tax Optimization Opportunity';
        titleRo = 'Oportunitate Optimizare Fiscală';
        description = 'Potential tax deductions identified';
        descriptionRo = 'Deduceri fiscale potențiale identificate';
        recommendation = 'Consult with your accountant about applicable deductions';
        recommendationRo = 'Consultați contabilul despre deducerile aplicabile';
        importance = 'HIGH';
        break;

      case 'CASH_FLOW':
        title = 'Cash Flow Alert';
        titleRo = 'Alertă Flux de Numerar';
        description = 'Cash flow projection requires attention';
        descriptionRo = 'Proiecția fluxului de numerar necesită atenție';
        impact = 'NEGATIVE';
        importance = 'HIGH';
        recommendation = 'Consider accelerating receivables collection';
        recommendationRo = 'Luați în considerare accelerarea colectării creanțelor';
        break;

      case 'COMPLIANCE':
        title = 'Compliance Reminder';
        titleRo = 'Reminder Conformitate';
        description = 'Upcoming compliance deadlines detected';
        descriptionRo = 'Termene de conformitate apropiate detectate';
        importance = 'CRITICAL';
        recommendation = 'Review and submit required documents before deadlines';
        recommendationRo = 'Revizuiți și transmiteți documentele necesare înainte de termene';
        break;

      case 'TREND':
        title = 'Business Trend Analysis';
        titleRo = 'Analiză Tendințe Afacere';
        description = 'Long-term business trends identified';
        descriptionRo = 'Tendințe pe termen lung identificate';
        break;
    }

    return {
      id: this.generateId('insight'),
      customerId,
      category,
      title,
      titleRo,
      description,
      descriptionRo,
      impact,
      importance,
      value: data.value,
      percentageChange: data.percentageChange,
      recommendation,
      recommendationRo,
      relatedData: data,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      createdAt: new Date(),
    };
  }

  // Forecasting
  async generateForecast(
    customerId: string,
    metric: string,
    currentValue: number,
    historicalData: number[],
    options: { periods?: number } = {},
  ): Promise<ForecastResult> {
    const periods = options.periods || 3;

    // Simple trend calculation
    const trend = this.calculateTrend(historicalData);
    const predictions = this.generatePredictions(currentValue, historicalData, periods);

    const forecast: ForecastResult = {
      id: this.generateId('forecast'),
      customerId,
      metric,
      metricRo: this.translateMetric(metric),
      currentValue,
      predictions,
      confidence: 0.85,
      trend,
      factors: this.identifyFactors(metric),
      factorsRo: this.identifyFactorsRo(metric),
      methodology: 'Time series analysis with trend extrapolation',
      createdAt: new Date(),
    };

    this.forecasts.set(forecast.id, forecast);

    this.eventEmitter.emit('ai.forecast.generated', {
      forecastId: forecast.id,
      customerId,
      metric,
      trend,
    });

    return forecast;
  }

  async getForecast(forecastId: string): Promise<ForecastResult | undefined> {
    return this.forecasts.get(forecastId);
  }

  private calculateTrend(data: number[]): 'UP' | 'DOWN' | 'STABLE' {
    if (data.length < 2) return 'STABLE';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = (avgSecond - avgFirst) / avgFirst;
    if (change > 0.05) return 'UP';
    if (change < -0.05) return 'DOWN';
    return 'STABLE';
  }

  private generatePredictions(
    currentValue: number,
    historical: number[],
    periods: number,
  ): ForecastPrediction[] {
    const predictions: ForecastPrediction[] = [];
    const avgGrowth =
      historical.length > 1
        ? (historical[historical.length - 1] - historical[0]) / (historical.length - 1)
        : 0;

    let lastValue = currentValue;
    for (let i = 0; i < periods; i++) {
      const predictedValue = lastValue + avgGrowth;
      const uncertainty = predictedValue * 0.1 * (i + 1); // Increasing uncertainty

      predictions.push({
        period: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
        value: Math.round(predictedValue * 100) / 100,
        lowerBound: Math.round((predictedValue - uncertainty) * 100) / 100,
        upperBound: Math.round((predictedValue + uncertainty) * 100) / 100,
      });

      lastValue = predictedValue;
    }

    return predictions;
  }

  private translateMetric(metric: string): string {
    const translations: Record<string, string> = {
      revenue: 'Venituri',
      expenses: 'Cheltuieli',
      profit: 'Profit',
      'cash_flow': 'Flux de Numerar',
      invoices: 'Facturi',
      customers: 'Clienți',
    };
    return translations[metric.toLowerCase()] || metric;
  }

  private identifyFactors(metric: string): string[] {
    return ['Seasonal patterns', 'Market trends', 'Historical performance', 'Economic indicators'];
  }

  private identifyFactorsRo(metric: string): string[] {
    return ['Modele sezoniere', 'Tendințe de piață', 'Performanță istorică', 'Indicatori economici'];
  }

  // Configuration
  async getConfig(customerId: string): Promise<AssistantConfig> {
    return (
      this.configs.get(customerId) || {
        language: 'ro',
        capabilities: ['CHAT', 'DOCUMENT_ANALYSIS', 'TAX_CALCULATION', 'FINANCIAL_INSIGHTS'],
        maxContextMessages: 10,
        responseStyle: 'CONVERSATIONAL',
        includeExplanations: true,
        currencyFormat: 'RON',
        dateFormat: 'DD.MM.YYYY',
      }
    );
  }

  async updateConfig(
    customerId: string,
    updates: Partial<AssistantConfig>,
  ): Promise<AssistantConfig> {
    const current = await this.getConfig(customerId);
    const updated = { ...current, ...updates };
    this.configs.set(customerId, updated);
    return updated;
  }

  // Romanian Localization Helpers
  getCapabilityName(capability: AssistantCapability): string {
    return CAPABILITY_TRANSLATIONS[capability];
  }

  getInsightCategoryName(category: InsightCategory): string {
    return INSIGHT_CATEGORY_TRANSLATIONS[category];
  }

  getAllCapabilities(): Array<{ capability: AssistantCapability; name: string; nameRo: string }> {
    return (Object.keys(CAPABILITY_TRANSLATIONS) as AssistantCapability[]).map((capability) => ({
      capability,
      name: capability.replace(/_/g, ' ').toLowerCase(),
      nameRo: CAPABILITY_TRANSLATIONS[capability],
    }));
  }

  getAllInsightCategories(): Array<{ category: InsightCategory; name: string; nameRo: string }> {
    return (Object.keys(INSIGHT_CATEGORY_TRANSLATIONS) as InsightCategory[]).map((category) => ({
      category,
      name: category.replace(/_/g, ' ').toLowerCase(),
      nameRo: INSIGHT_CATEGORY_TRANSLATIONS[category],
    }));
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
