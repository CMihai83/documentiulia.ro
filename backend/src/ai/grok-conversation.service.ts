import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Grok Conversational AI Service
 * Provides natural language business intelligence queries for DocumentIulia.ro
 *
 * Features:
 * - Multi-language support (Romanian, English)
 * - Business context awareness (financial KPIs, compliance, operations)
 * - RAG (Retrieval-Augmented Generation) with company data
 * - Rate limiting per tenant
 *
 * Example queries:
 * - "Care este marja de profit pentru Q4?" (What's my Q4 profit margin?)
 * - "When is the next ANAF SAF-T D406 deadline?"
 * - "Show me top 5 expenses this month"
 */
@Injectable()
export class GrokConversationService {
  private readonly logger = new Logger(GrokConversationService.name);
  private openai: OpenAI;
  private readonly modelName = 'grok-beta'; // x.ai model identifier

  constructor(private configService: ConfigService) {
    // Initialize OpenAI client for x.ai Grok API
    const apiKey = this.configService.get<string>('XAI_API_KEY') || 'xai-test-key';

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.x.ai/v1', // x.ai Grok endpoint
    });

    this.logger.log('Grok Conversation Service initialized with x.ai API');
  }

  /**
   * Process conversational query with business context
   * @param query User's natural language question
   * @param userId User identifier for rate limiting and context
   * @param locale Language preference (ro, en, de, fr, es)
   * @param companyContext Optional company-specific data for RAG
   */
  async processQuery(
    query: string,
    userId: string,
    locale: string = 'ro',
    companyContext?: Record<string, any>,
  ): Promise<{
    response: string;
    sources?: string[];
    confidence: number;
    tokenUsage: number;
  }> {
    try {
      this.logger.debug(`Processing query for user ${userId} in ${locale}: ${query.substring(0, 100)}`);

      // Build system prompt with Romanian business context
      const systemPrompt = this.buildSystemPrompt(locale, companyContext);

      // Build user context for RAG
      const userPrompt = this.buildUserPrompt(query, companyContext);

      // Call Grok API
      const completion = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      });

      const responseText = completion.choices[0]?.message?.content || 'Nu am putut genera un răspuns.';
      const tokenUsage = completion.usage?.total_tokens || 0;

      // Extract confidence based on response quality
      const confidence = this.calculateConfidence(responseText, query);

      // Extract sources if mentioned in response
      const sources = this.extractSources(responseText);

      this.logger.log(`Query processed successfully. Tokens: ${tokenUsage}, Confidence: ${confidence}`);

      return {
        response: responseText,
        sources,
        confidence,
        tokenUsage,
      };
    } catch (error) {
      this.logger.error(`Error processing Grok query: ${error.message}`, error.stack);

      // Fallback response
      if (locale === 'ro') {
        return {
          response: 'Ne cerem scuze, dar serviciul de asistență AI este temporar indisponibil. Vă rugăm încercați mai târziu sau contactați suportul.',
          confidence: 0,
          tokenUsage: 0,
        };
      }

      return {
        response: 'Sorry, the AI assistant service is temporarily unavailable. Please try again later or contact support.',
        confidence: 0,
        tokenUsage: 0,
      };
    }
  }

  /**
   * Build system prompt with Romanian compliance context
   */
  private buildSystemPrompt(locale: string, companyContext?: Record<string, any>): string {
    const basePrompts = {
      ro: `Ești un asistent AI specializat pentru platforma DocumentIulia.ro, un ERP/sistem de contabilitate pentru companii românești.

CUNOȘTINȚE OBLIGATORII:
- TVA: Cota standard 19% (sau 21% din august 2025 conform Legea 141/2025), cotă redusă 9% (11% din 2025)
- ANAF e-Factura: Obligatorie B2B/B2G din 1 ianuarie 2024, format XML RO_CIUS UBL 2.1
- SAF-T D406: Raportare lunară XML obligatorie din ianuarie 2025, pilot septembrie 2025-august 2026 cu grație 6 luni
- SPV (Spațiul Privat Virtual): Portal ANAF pentru declarații
- DUKIntegrator: Validare XML înainte de trimitere la ANAF

ABILITĂȚI:
- Răspunde la întrebări despre KPI-uri financiare (profit, marjă, cash flow)
- Explică termene de conformitate ANAF (declarații, rapoarte)
- Analizează tendințe operaționale (inventar, vânzări, cheltuieli)
- Sugerează acțiuni bazate pe date (ex: "Crește cheltuielile cu utilități - verifică contracte")

STIL:
- Profesional dar accesibil
- Utilizează termeni contabili români standard (CUI, CIF, TVA, PFA, SRL)
- Oferă răspunsuri structurate cu bullet points
- Citează surse de date când sunt disponibile`,

      en: `You are an AI assistant for DocumentIulia.ro, an ERP/accounting platform for Romanian businesses.

MANDATORY KNOWLEDGE:
- VAT: Standard rate 19% (21% from August 2025 per Law 141/2025), reduced 9% (11% from 2025)
- ANAF e-Factura: Mandatory B2B/B2G since January 1, 2024, XML format RO_CIUS UBL 2.1
- SAF-T D406: Monthly XML reporting mandatory from January 2025, pilot September 2025-August 2026 with 6-month grace period
- SPV (Private Virtual Space): ANAF portal for declarations
- DUKIntegrator: XML validation before ANAF submission

CAPABILITIES:
- Answer questions about financial KPIs (profit, margin, cash flow)
- Explain ANAF compliance deadlines (declarations, reports)
- Analyze operational trends (inventory, sales, expenses)
- Suggest data-driven actions (e.g., "Utilities expenses rising - review contracts")

STYLE:
- Professional yet accessible
- Use standard Romanian accounting terms (CUI, CIF, TVA, PFA, SRL)
- Provide structured responses with bullet points
- Cite data sources when available`,
    };

    const prompt = basePrompts[locale as keyof typeof basePrompts] || basePrompts['en'];

    // Add company context if provided
    if (companyContext) {
      const contextStr = JSON.stringify(companyContext, null, 2);
      return `${prompt}\n\nCOMPANY CONTEXT:\n${contextStr}`;
    }

    return prompt;
  }

  /**
   * Build user prompt with company data for RAG
   */
  private buildUserPrompt(query: string, companyContext?: Record<string, any>): string {
    if (!companyContext) {
      return query;
    }

    // Extract relevant context for the query
    const context = this.extractRelevantContext(query, companyContext);

    if (!context) {
      return query;
    }

    return `${query}\n\nDate relevante:\n${JSON.stringify(context, null, 2)}`;
  }

  /**
   * Extract relevant context based on query keywords
   */
  private extractRelevantContext(query: string, companyContext: Record<string, any>): Record<string, any> | null {
    const lowerQuery = query.toLowerCase();
    const relevantData: Record<string, any> = {};

    // Financial keywords
    if (lowerQuery.match(/profit|marja|venit|cheltui|financiar|kpi/i)) {
      if (companyContext.financials) {
        relevantData.financials = companyContext.financials;
      }
    }

    // Compliance keywords
    if (lowerQuery.match(/anaf|tva|vat|declarati|d406|e-factura|saf-t|spv/i)) {
      if (companyContext.compliance) {
        relevantData.compliance = companyContext.compliance;
      }
    }

    // Operations keywords
    if (lowerQuery.match(/inventar|stoc|comenzi|vanzari|achiziti/i)) {
      if (companyContext.operations) {
        relevantData.operations = companyContext.operations;
      }
    }

    // HR keywords
    if (lowerQuery.match(/salari|angajat|pontaj|concedi|hr|payroll/i)) {
      if (companyContext.hr) {
        relevantData.hr = companyContext.hr;
      }
    }

    return Object.keys(relevantData).length > 0 ? relevantData : null;
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(response: string, query: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if response is detailed (>100 chars)
    if (response.length > 100) {
      confidence += 0.2;
    }

    // Increase if response contains numbers (likely data-driven)
    if (/\d+/.test(response)) {
      confidence += 0.1;
    }

    // Increase if response is structured (bullet points, lists)
    if (response.includes('\n-') || response.includes('\n*') || response.includes('\n1.')) {
      confidence += 0.1;
    }

    // Decrease if response is too short (<50 chars)
    if (response.length < 50) {
      confidence -= 0.2;
    }

    // Decrease if response contains uncertainty phrases
    if (response.match(/nu sunt sigur|nu pot confirma|posibil|poate/i)) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Extract data sources mentioned in response
   */
  private extractSources(response: string): string[] {
    const sources: string[] = [];

    // Look for common source indicators
    const sourcePatterns = [
      /sursa: ([^\n]+)/gi,
      /date din: ([^\n]+)/gi,
      /conform ([^\n]+)/gi,
    ];

    sourcePatterns.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          sources.push(match[1].trim());
        }
      }
    });

    return sources;
  }

  /**
   * Generate business intelligence query suggestions
   */
  async generateQuerySuggestions(
    userId: string,
    locale: string = 'ro',
    companyContext?: Record<string, any>,
  ): Promise<string[]> {
    const suggestions = {
      ro: [
        'Care este marja de profit pentru trimestrul curent?',
        'Când este următorul termen de depunere D406 la ANAF?',
        'Care sunt primele 5 cheltuieli din această lună?',
        'Câți angajați activi am în acest moment?',
        'Care este nivelul stocului pentru produsele critice?',
        'Ce venituri am avut în ultimele 30 de zile?',
        'Care sunt facturile neachitate mai vechi de 60 zile?',
        'Cum se compară cheltuielile mele cu media industriei?',
      ],
      en: [
        'What is my profit margin for the current quarter?',
        'When is the next ANAF D406 filing deadline?',
        'What are my top 5 expenses this month?',
        'How many active employees do I have?',
        'What is the stock level for critical products?',
        'What revenue did I generate in the last 30 days?',
        'Which invoices are unpaid for more than 60 days?',
        'How do my expenses compare to industry average?',
      ],
    };

    return suggestions[locale as keyof typeof suggestions] || suggestions['en'];
  }

  /**
   * Rate limiting check (to be integrated with tenant quotas)
   */
  async checkRateLimit(userId: string, tier: 'free' | 'pro' | 'business'): Promise<boolean> {
    // Rate limits per tier (queries per day)
    const limits = {
      free: 10,
      pro: 50,
      business: 200,
    };

    // TODO: Implement Redis-based rate limiting
    // For now, return true (allow all queries)
    return true;
  }
}
