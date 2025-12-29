import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tier } from '@prisma/client';

// Pricing plans for Romanian market (in RON)
export interface PricingPlan {
  tier: Tier;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: PlanFeature[];
  limits: PlanLimits;
  recommended?: boolean;
}

export interface PlanFeature {
  key: string;
  name: string;
  nameRo: string;
  included: boolean;
  limit?: number | string;
}

export interface PlanLimits {
  maxUsers: number;
  maxInvoices: number;        // Per month
  maxDocuments: number;       // Per month
  maxOcrPages: number;        // Per month
  maxAiQueries: number;       // Per month
  maxSaftReports: number;     // Per month
  maxStorageGb: number;
  apiAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;
  sagaIntegration: boolean;
  multiCurrency: boolean;
  contractAnalysis: boolean;
  bulkOperations: boolean;
  // Premium AI Features
  aiContractAnalysis: boolean;
  aiForecasting: boolean;
  aiAnomalyDetection: boolean;
  aiSmartCategorization: boolean;
  aiGrokAssistant: boolean;
  aiDocumentSummary: boolean;
  maxAiContractAnalyses: number;
  maxAiForecasts: number;
  maxAiAnomalyScans: number;
}

// Premium AI Add-on Package
export interface AiAddOnPackage {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: AiFeature[];
  limits: AiLimits;
}

export interface AiFeature {
  key: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  included: boolean;
}

export interface AiLimits {
  contractAnalyses: number;
  forecasts: number;
  anomalyScans: number;
  grokQueries: number;
  documentSummaries: number;
  smartCategorizations: number;
}

export interface AiUsageStats {
  organizationId: string;
  period: string;
  hasAiAddOn: boolean;
  usage: {
    contractAnalyses: { used: number; limit: number; percentage: number };
    forecasts: { used: number; limit: number; percentage: number };
    anomalyScans: { used: number; limit: number; percentage: number };
    grokQueries: { used: number; limit: number; percentage: number };
    documentSummaries: { used: number; limit: number; percentage: number };
    smartCategorizations: { used: number; limit: number; percentage: number };
  };
  costBreakdown: {
    baseSubscription: number;
    aiAddOn: number;
    overage: number;
    total: number;
  };
  warnings: string[];
}

export interface UsageStats {
  organizationId: string;
  period: string;
  currentTier: Tier;
  usage: {
    users: { used: number; limit: number; percentage: number };
    invoices: { used: number; limit: number; percentage: number };
    documents: { used: number; limit: number; percentage: number };
    ocrPages: { used: number; limit: number; percentage: number };
    aiQueries: { used: number; limit: number; percentage: number };
    saftReports: { used: number; limit: number; percentage: number };
    storageGb: { used: number; limit: number; percentage: number };
  };
  warnings: string[];
  upgradeRecommendation?: Tier;
}

export interface SubscriptionStatus {
  organizationId: string;
  currentTier: Tier;
  plan: PricingPlan;
  usage: UsageStats;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate?: Date;
  trialEndsAt?: Date;
  isTrialActive: boolean;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  // Pricing plans per Grok recommendation: Gratuit/Pro/Business
  private readonly pricingPlans: Map<Tier, PricingPlan> = new Map([
    [Tier.FREE, {
      tier: Tier.FREE,
      name: 'Free',
      nameRo: 'Gratuit',
      description: 'Perfect for freelancers and small businesses just getting started',
      descriptionRo: 'Perfect pentru freelanceri și afaceri mici la început',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'RON',
      features: [
        { key: 'vat_calculator', name: 'VAT Calculator', nameRo: 'Calculator TVA', included: true },
        { key: 'basic_ocr', name: 'Basic OCR', nameRo: 'OCR de bază', included: true, limit: '10 pages/month' },
        { key: 'invoice_management', name: 'Invoice Management', nameRo: 'Gestiune Facturi', included: true, limit: '10/month' },
        { key: 'document_storage', name: 'Document Storage', nameRo: 'Stocare Documente', included: true, limit: '1 GB' },
        { key: 'saft_generation', name: 'SAF-T D406 Generation', nameRo: 'Generare SAF-T D406', included: true, limit: '1/month' },
        { key: 'efactura', name: 'e-Factura Generation', nameRo: 'Generare e-Factura', included: true, limit: '5/month' },
        { key: 'ai_assistant', name: 'AI Assistant', nameRo: 'Asistent AI', included: true, limit: '10 queries/month' },
        { key: 'hr_module', name: 'HR Module', nameRo: 'Modul HR', included: false },
        { key: 'saga_integration', name: 'SAGA Integration', nameRo: 'Integrare SAGA', included: false },
        { key: 'advanced_analytics', name: 'Advanced Analytics', nameRo: 'Analiză Avansată', included: false },
        { key: 'api_access', name: 'API Access', nameRo: 'Acces API', included: false },
        { key: 'priority_support', name: 'Priority Support', nameRo: 'Suport Prioritar', included: false },
      ],
      limits: {
        maxUsers: 1,
        maxInvoices: 10,
        maxDocuments: 50,
        maxOcrPages: 10,
        maxAiQueries: 10,
        maxSaftReports: 1,
        maxStorageGb: 1,
        apiAccess: false,
        prioritySupport: false,
        customBranding: false,
        advancedAnalytics: false,
        sagaIntegration: false,
        multiCurrency: false,
        contractAnalysis: false,
        bulkOperations: false,
        // Premium AI Features - Not available on Free tier
        aiContractAnalysis: false,
        aiForecasting: false,
        aiAnomalyDetection: false,
        aiSmartCategorization: false,
        aiGrokAssistant: false,
        aiDocumentSummary: false,
        maxAiContractAnalyses: 0,
        maxAiForecasts: 0,
        maxAiAnomalyScans: 0,
      },
    }],
    [Tier.PRO, {
      tier: Tier.PRO,
      name: 'Pro',
      nameRo: 'Pro',
      description: 'For growing businesses that need more power and flexibility',
      descriptionRo: 'Pentru afaceri în creștere care au nevoie de mai multă putere și flexibilitate',
      priceMonthly: 49,
      priceYearly: 490, // 2 months free
      currency: 'RON',
      recommended: true,
      features: [
        { key: 'vat_calculator', name: 'VAT Calculator', nameRo: 'Calculator TVA', included: true },
        { key: 'advanced_ocr', name: 'Advanced OCR', nameRo: 'OCR Avansat', included: true, limit: '500 pages/month' },
        { key: 'invoice_management', name: 'Unlimited Invoices', nameRo: 'Facturi Nelimitate', included: true },
        { key: 'document_storage', name: 'Document Storage', nameRo: 'Stocare Documente', included: true, limit: '50 GB' },
        { key: 'saft_generation', name: 'SAF-T D406 Generation', nameRo: 'Generare SAF-T D406', included: true, limit: 'Unlimited' },
        { key: 'efactura', name: 'e-Factura Generation', nameRo: 'Generare e-Factura', included: true, limit: 'Unlimited' },
        { key: 'ai_assistant', name: 'AI Assistant', nameRo: 'Asistent AI', included: true, limit: '500 queries/month' },
        { key: 'hr_module', name: 'HR Module', nameRo: 'Modul HR', included: true, limit: 'Up to 10 employees' },
        { key: 'saga_integration', name: 'SAGA Integration', nameRo: 'Integrare SAGA', included: true },
        { key: 'multi_currency', name: 'Multi-Currency', nameRo: 'Multi-Valută', included: true },
        { key: 'smart_categorization', name: 'Smart Categorization', nameRo: 'Categorizare Inteligentă', included: true },
        { key: 'advanced_analytics', name: 'Advanced Analytics', nameRo: 'Analiză Avansată', included: false },
        { key: 'api_access', name: 'API Access', nameRo: 'Acces API', included: false },
        { key: 'priority_support', name: 'Priority Support', nameRo: 'Suport Prioritar', included: false },
      ],
      limits: {
        maxUsers: 5,
        maxInvoices: 500,
        maxDocuments: 1000,
        maxOcrPages: 500,
        maxAiQueries: 500,
        maxSaftReports: 12,
        maxStorageGb: 50,
        apiAccess: false,
        prioritySupport: false,
        customBranding: false,
        advancedAnalytics: false,
        sagaIntegration: true,
        multiCurrency: true,
        contractAnalysis: false,
        bulkOperations: true,
        // Premium AI Features - Basic access on Pro tier
        aiContractAnalysis: false,
        aiForecasting: true,
        aiAnomalyDetection: false,
        aiSmartCategorization: true,
        aiGrokAssistant: true,
        aiDocumentSummary: true,
        maxAiContractAnalyses: 0,
        maxAiForecasts: 10,
        maxAiAnomalyScans: 0,
      },
    }],
    [Tier.BUSINESS, {
      tier: Tier.BUSINESS,
      name: 'Business',
      nameRo: 'Business',
      description: 'Enterprise-grade features for established businesses',
      descriptionRo: 'Funcționalități de nivel enterprise pentru afaceri consacrate',
      priceMonthly: 149,
      priceYearly: 1490, // 2 months free
      currency: 'RON',
      features: [
        { key: 'vat_calculator', name: 'VAT Calculator', nameRo: 'Calculator TVA', included: true },
        { key: 'advanced_ocr', name: 'Unlimited OCR', nameRo: 'OCR Nelimitat', included: true },
        { key: 'invoice_management', name: 'Unlimited Invoices', nameRo: 'Facturi Nelimitate', included: true },
        { key: 'document_storage', name: 'Document Storage', nameRo: 'Stocare Documente', included: true, limit: '500 GB' },
        { key: 'saft_generation', name: 'SAF-T D406 Generation', nameRo: 'Generare SAF-T D406', included: true, limit: 'Unlimited' },
        { key: 'efactura', name: 'e-Factura Generation', nameRo: 'Generare e-Factura', included: true, limit: 'Unlimited' },
        { key: 'ai_assistant', name: 'Unlimited AI Assistant', nameRo: 'Asistent AI Nelimitat', included: true },
        { key: 'hr_module', name: 'Full HR Suite', nameRo: 'Suită HR Completă', included: true, limit: 'Unlimited employees' },
        { key: 'saga_integration', name: 'SAGA Integration', nameRo: 'Integrare SAGA', included: true },
        { key: 'multi_currency', name: 'Multi-Currency', nameRo: 'Multi-Valută', included: true },
        { key: 'smart_categorization', name: 'Smart Categorization', nameRo: 'Categorizare Inteligentă', included: true },
        { key: 'contract_analysis', name: 'Contract Analysis AI', nameRo: 'Analiză Contracte AI', included: true },
        { key: 'advanced_analytics', name: 'Advanced Analytics & Forecasting', nameRo: 'Analiză Avansată & Prognoze', included: true },
        { key: 'api_access', name: 'Full API Access', nameRo: 'Acces API Complet', included: true },
        { key: 'priority_support', name: '24/7 Priority Support', nameRo: 'Suport Prioritar 24/7', included: true },
        { key: 'custom_branding', name: 'Custom Branding', nameRo: 'Branding Personalizat', included: true },
        { key: 'dedicated_account', name: 'Dedicated Account Manager', nameRo: 'Manager Cont Dedicat', included: true },
      ],
      limits: {
        maxUsers: 50,
        maxInvoices: 10000,
        maxDocuments: 50000,
        maxOcrPages: 10000,
        maxAiQueries: 10000,
        maxSaftReports: 999,
        maxStorageGb: 500,
        apiAccess: true,
        prioritySupport: true,
        customBranding: true,
        advancedAnalytics: true,
        sagaIntegration: true,
        multiCurrency: true,
        contractAnalysis: true,
        bulkOperations: true,
        // Premium AI Features - Full access on Business tier
        aiContractAnalysis: true,
        aiForecasting: true,
        aiAnomalyDetection: true,
        aiSmartCategorization: true,
        aiGrokAssistant: true,
        aiDocumentSummary: true,
        maxAiContractAnalyses: 100,
        maxAiForecasts: 500,
        maxAiAnomalyScans: 100,
      },
    }],
    [Tier.ENTERPRISE, {
      tier: Tier.ENTERPRISE,
      name: 'Enterprise',
      nameRo: 'Enterprise',
      description: 'Ultimate solution for large organizations with dedicated support',
      descriptionRo: 'Soluție ultimă pentru organizații mari cu suport dedicat',
      priceMonthly: 299,
      priceYearly: 2990,
      currency: 'RON',
      features: [
        { key: 'vat_calculator', name: 'VAT Calculator', nameRo: 'Calculator TVA', included: true },
        { key: 'advanced_ocr', name: 'Unlimited OCR', nameRo: 'OCR Nelimitat', included: true },
        { key: 'invoice_management', name: 'Unlimited Invoices', nameRo: 'Facturi Nelimitate', included: true },
        { key: 'document_storage', name: 'Unlimited Storage', nameRo: 'Stocare Nelimitată', included: true },
        { key: 'saft_generation', name: 'SAF-T D406 Generation', nameRo: 'Generare SAF-T D406', included: true, limit: 'Unlimited' },
        { key: 'efactura', name: 'e-Factura Generation', nameRo: 'Generare e-Factura', included: true, limit: 'Unlimited' },
        { key: 'ai_assistant', name: 'Unlimited AI Assistant', nameRo: 'Asistent AI Nelimitat', included: true },
        { key: 'hr_module', name: 'Full HR Suite', nameRo: 'Suită HR Completă', included: true, limit: 'Unlimited employees' },
        { key: 'saga_integration', name: 'SAGA Integration', nameRo: 'Integrare SAGA', included: true },
        { key: 'multi_currency', name: 'Multi-Currency', nameRo: 'Multi-Valută', included: true },
        { key: 'smart_categorization', name: 'Smart Categorization', nameRo: 'Categorizare Inteligentă', included: true },
        { key: 'contract_analysis', name: 'Contract Analysis AI', nameRo: 'Analiză Contracte AI', included: true },
        { key: 'advanced_analytics', name: 'Advanced Analytics & Forecasting', nameRo: 'Analiză Avansată & Prognoze', included: true },
        { key: 'api_access', name: 'Full API Access', nameRo: 'Acces API Complet', included: true },
        { key: 'priority_support', name: '24/7 Priority Support', nameRo: 'Suport Prioritar 24/7', included: true },
        { key: 'custom_branding', name: 'Custom Branding', nameRo: 'Branding Personalizat', included: true },
        { key: 'dedicated_account', name: 'Dedicated Account Manager', nameRo: 'Manager Cont Dedicat', included: true },
        { key: 'sso_saml', name: 'SSO & SAML', nameRo: 'SSO & SAML', included: true },
        { key: 'on_premise', name: 'On-Premise Option', nameRo: 'Opțiune On-Premise', included: true },
        { key: 'sla_guarantee', name: '99.9% SLA Guarantee', nameRo: 'Garanție SLA 99.9%', included: true },
        { key: 'custom_training', name: 'Custom Training', nameRo: 'Training Personalizat', included: true },
      ],
      limits: {
        maxUsers: 999,
        maxInvoices: 999999,
        maxDocuments: 999999,
        maxOcrPages: 999999,
        maxAiQueries: 999999,
        maxSaftReports: 999,
        maxStorageGb: 9999,
        apiAccess: true,
        prioritySupport: true,
        customBranding: true,
        advancedAnalytics: true,
        sagaIntegration: true,
        multiCurrency: true,
        contractAnalysis: true,
        bulkOperations: true,
        aiContractAnalysis: true,
        aiForecasting: true,
        aiAnomalyDetection: true,
        aiSmartCategorization: true,
        aiGrokAssistant: true,
        aiDocumentSummary: true,
        maxAiContractAnalyses: 999,
        maxAiForecasts: 999,
        maxAiAnomalyScans: 999,
      },
    }],
  ]);

  // Premium AI Add-on Packages
  private readonly aiAddOnPackages: Map<string, AiAddOnPackage> = new Map([
    ['ai-starter', {
      id: 'ai-starter',
      name: 'AI Starter',
      nameRo: 'AI Începător',
      description: 'Essential AI features for small businesses',
      descriptionRo: 'Funcții AI esențiale pentru afaceri mici',
      priceMonthly: 29,
      priceYearly: 290,
      currency: 'RON',
      features: [
        { key: 'smart_categorization', name: 'Smart Categorization', nameRo: 'Categorizare Inteligentă', description: 'Automatic transaction categorization', descriptionRo: 'Categorizare automată a tranzacțiilor', included: true },
        { key: 'document_summary', name: 'Document Summary', nameRo: 'Rezumat Documente', description: 'AI-powered document summaries', descriptionRo: 'Rezumate documente cu AI', included: true },
        { key: 'grok_assistant', name: 'Grok Assistant', nameRo: 'Asistent Grok', description: 'Basic AI chat assistant', descriptionRo: 'Asistent chat AI de bază', included: true },
        { key: 'basic_forecasting', name: 'Basic Forecasting', nameRo: 'Prognoză de Bază', description: 'Revenue and expense forecasts', descriptionRo: 'Prognoze venituri și cheltuieli', included: true },
      ],
      limits: {
        contractAnalyses: 0,
        forecasts: 20,
        anomalyScans: 0,
        grokQueries: 100,
        documentSummaries: 50,
        smartCategorizations: 500,
      },
    }],
    ['ai-professional', {
      id: 'ai-professional',
      name: 'AI Professional',
      nameRo: 'AI Profesional',
      description: 'Advanced AI capabilities for growing businesses',
      descriptionRo: 'Capabilități AI avansate pentru afaceri în creștere',
      priceMonthly: 79,
      priceYearly: 790,
      currency: 'RON',
      features: [
        { key: 'smart_categorization', name: 'Smart Categorization', nameRo: 'Categorizare Inteligentă', description: 'Automatic transaction categorization', descriptionRo: 'Categorizare automată a tranzacțiilor', included: true },
        { key: 'document_summary', name: 'Document Summary', nameRo: 'Rezumat Documente', description: 'AI-powered document summaries', descriptionRo: 'Rezumate documente cu AI', included: true },
        { key: 'grok_assistant', name: 'Grok Assistant', nameRo: 'Asistent Grok', description: 'Advanced AI chat assistant', descriptionRo: 'Asistent chat AI avansat', included: true },
        { key: 'advanced_forecasting', name: 'Advanced Forecasting', nameRo: 'Prognoză Avansată', description: 'Prophet-based forecasting with Monte Carlo', descriptionRo: 'Prognoze Prophet cu simulări Monte Carlo', included: true },
        { key: 'contract_analysis', name: 'Contract Analysis', nameRo: 'Analiză Contracte', description: 'AI-powered contract review', descriptionRo: 'Analiză contracte cu AI', included: true },
        { key: 'anomaly_detection', name: 'Anomaly Detection', nameRo: 'Detectare Anomalii', description: 'Fraud and error detection', descriptionRo: 'Detectare fraude și erori', included: true },
      ],
      limits: {
        contractAnalyses: 25,
        forecasts: 100,
        anomalyScans: 50,
        grokQueries: 500,
        documentSummaries: 200,
        smartCategorizations: 2000,
      },
    }],
    ['ai-enterprise', {
      id: 'ai-enterprise',
      name: 'AI Enterprise',
      nameRo: 'AI Enterprise',
      description: 'Unlimited AI power for enterprise operations',
      descriptionRo: 'Putere AI nelimitată pentru operațiuni enterprise',
      priceMonthly: 199,
      priceYearly: 1990,
      currency: 'RON',
      features: [
        { key: 'smart_categorization', name: 'Unlimited Categorization', nameRo: 'Categorizare Nelimitată', description: 'Unlimited transaction categorization', descriptionRo: 'Categorizare tranzacții nelimitată', included: true },
        { key: 'document_summary', name: 'Unlimited Summaries', nameRo: 'Rezumate Nelimitate', description: 'Unlimited document summaries', descriptionRo: 'Rezumate documente nelimitate', included: true },
        { key: 'grok_assistant', name: 'Grok Pro', nameRo: 'Grok Pro', description: 'Priority AI assistant with advanced reasoning', descriptionRo: 'Asistent AI prioritar cu raționament avansat', included: true },
        { key: 'advanced_forecasting', name: 'Enterprise Forecasting', nameRo: 'Prognoză Enterprise', description: 'Full forecasting suite with custom models', descriptionRo: 'Suită completă prognoze cu modele personalizate', included: true },
        { key: 'contract_analysis', name: 'Enterprise Contract AI', nameRo: 'AI Contracte Enterprise', description: 'Unlimited contract analysis with GDPR compliance', descriptionRo: 'Analiză contracte nelimitată cu conformitate GDPR', included: true },
        { key: 'anomaly_detection', name: 'Real-time Monitoring', nameRo: 'Monitorizare în Timp Real', description: 'Continuous fraud and anomaly monitoring', descriptionRo: 'Monitorizare continuă fraude și anomalii', included: true },
        { key: 'dedicated_ai', name: 'Dedicated AI Resources', nameRo: 'Resurse AI Dedicate', description: 'Priority processing and custom fine-tuning', descriptionRo: 'Procesare prioritară și ajustări personalizate', included: true },
      ],
      limits: {
        contractAnalyses: 999,
        forecasts: 999,
        anomalyScans: 999,
        grokQueries: 9999,
        documentSummaries: 999,
        smartCategorizations: 99999,
      },
    }],
  ]);

  // In-memory usage tracking (would be in Redis in production)
  private usageCache: Map<string, Map<string, number>> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all pricing plans
   */
  getPricingPlans(): PricingPlan[] {
    return Array.from(this.pricingPlans.values());
  }

  /**
   * Get a specific pricing plan
   */
  getPlan(tier: Tier): PricingPlan {
    const plan = this.pricingPlans.get(tier);
    if (!plan) {
      throw new BadRequestException(`Invalid tier: ${tier}`);
    }
    return plan;
  }

  /**
   * Get current subscription status for an organization
   */
  async getSubscriptionStatus(organizationId: string): Promise<SubscriptionStatus> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: true,
      },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const plan = this.getPlan(org.tier);
    const usage = await this.getUsageStats(organizationId);

    return {
      organizationId,
      currentTier: org.tier,
      plan,
      usage,
      billingCycle: 'monthly', // Would come from billing system
      nextBillingDate: this.getNextBillingDate(),
      isTrialActive: false,
    };
  }

  /**
   * Get usage statistics for an organization
   */
  async getUsageStats(organizationId: string): Promise<UsageStats> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: true,
        invoices: {
          where: {
            createdAt: {
              gte: this.getMonthStart(),
            },
          },
        },
        documents: {
          where: {
            createdAt: {
              gte: this.getMonthStart(),
            },
          },
        },
        saftReports: {
          where: {
            createdAt: {
              gte: this.getMonthStart(),
            },
          },
        },
      },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const plan = this.getPlan(org.tier);
    const limits = plan.limits;

    // Get usage from cache or calculate
    const ocrPages = this.getUsageValue(organizationId, 'ocr_pages');
    const aiQueries = this.getUsageValue(organizationId, 'ai_queries');
    const storageUsed = await this.calculateStorageUsage(organizationId);

    const usage = {
      users: {
        used: org.members.length,
        limit: limits.maxUsers,
        percentage: Math.round((org.members.length / limits.maxUsers) * 100),
      },
      invoices: {
        used: org.invoices.length,
        limit: limits.maxInvoices,
        percentage: Math.round((org.invoices.length / limits.maxInvoices) * 100),
      },
      documents: {
        used: org.documents.length,
        limit: limits.maxDocuments,
        percentage: Math.round((org.documents.length / limits.maxDocuments) * 100),
      },
      ocrPages: {
        used: ocrPages,
        limit: limits.maxOcrPages,
        percentage: Math.round((ocrPages / limits.maxOcrPages) * 100),
      },
      aiQueries: {
        used: aiQueries,
        limit: limits.maxAiQueries,
        percentage: Math.round((aiQueries / limits.maxAiQueries) * 100),
      },
      saftReports: {
        used: org.saftReports.length,
        limit: limits.maxSaftReports,
        percentage: Math.round((org.saftReports.length / limits.maxSaftReports) * 100),
      },
      storageGb: {
        used: storageUsed,
        limit: limits.maxStorageGb,
        percentage: Math.round((storageUsed / limits.maxStorageGb) * 100),
      },
    };

    // Generate warnings
    const warnings: string[] = [];
    Object.entries(usage).forEach(([key, value]) => {
      if (value.percentage >= 90) {
        warnings.push(`${key} usage is at ${value.percentage}% - consider upgrading`);
      } else if (value.percentage >= 75) {
        warnings.push(`${key} usage is at ${value.percentage}%`);
      }
    });

    // Recommend upgrade if needed
    let upgradeRecommendation: Tier | undefined;
    const highUsageCount = Object.values(usage).filter(v => v.percentage >= 80).length;
    if (highUsageCount >= 2 && org.tier !== Tier.BUSINESS) {
      upgradeRecommendation = org.tier === Tier.FREE ? Tier.PRO : Tier.BUSINESS;
    }

    return {
      organizationId,
      period: this.getCurrentPeriod(),
      currentTier: org.tier,
      usage,
      warnings,
      upgradeRecommendation,
    };
  }

  /**
   * Check if organization can perform an action based on limits
   */
  async checkLimit(
    organizationId: string,
    limitType: keyof PlanLimits,
    currentCount?: number,
  ): Promise<{ allowed: boolean; limit: number; current: number; message?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return { allowed: false, limit: 0, current: 0, message: 'Organization not found' };
    }

    const plan = this.getPlan(org.tier);
    const limit = plan.limits[limitType];

    // Boolean limits
    if (typeof limit === 'boolean') {
      return {
        allowed: limit,
        limit: limit ? 1 : 0,
        current: 0,
        message: limit ? undefined : `${limitType} is not available on your ${org.tier} plan`,
      };
    }

    // Numeric limits
    const current = currentCount ?? 0;
    const allowed = current < limit;

    return {
      allowed,
      limit: limit as number,
      current,
      message: allowed ? undefined : `You've reached your ${limitType} limit (${limit}). Please upgrade to continue.`,
    };
  }

  /**
   * Check if a specific feature is available
   */
  async hasFeature(organizationId: string, featureKey: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) return false;

    const plan = this.getPlan(org.tier);
    const feature = plan.features.find(f => f.key === featureKey);

    return feature?.included ?? false;
  }

  /**
   * Increment usage counter
   */
  incrementUsage(organizationId: string, metric: string, amount: number = 1): void {
    const key = `${organizationId}:${this.getCurrentPeriod()}`;
    if (!this.usageCache.has(key)) {
      this.usageCache.set(key, new Map());
    }
    const orgUsage = this.usageCache.get(key)!;
    const current = orgUsage.get(metric) || 0;
    orgUsage.set(metric, current + amount);
  }

  /**
   * Get usage value from cache
   */
  private getUsageValue(organizationId: string, metric: string): number {
    const key = `${organizationId}:${this.getCurrentPeriod()}`;
    return this.usageCache.get(key)?.get(metric) || 0;
  }

  /**
   * Upgrade organization tier
   */
  async upgradeTier(
    organizationId: string,
    newTier: Tier,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
  ): Promise<{ success: boolean; message: string; newPlan: PricingPlan }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const currentPlan = this.getPlan(org.tier);
    const newPlan = this.getPlan(newTier);

    // Validate upgrade
    if (newPlan.priceMonthly <= currentPlan.priceMonthly && newTier !== Tier.FREE) {
      throw new BadRequestException('Cannot downgrade to a higher or equal priced plan');
    }

    // Update organization
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        tier: newTier,
        maxUsers: newPlan.limits.maxUsers,
        maxInvoices: newPlan.limits.maxInvoices,
        maxDocuments: newPlan.limits.maxDocuments,
      },
    });

    this.logger.log(`Organization ${organizationId} upgraded from ${org.tier} to ${newTier}`);

    return {
      success: true,
      message: `Successfully upgraded to ${newPlan.name} plan`,
      newPlan,
    };
  }

  /**
   * Downgrade organization tier
   */
  async downgradeTier(
    organizationId: string,
    newTier: Tier,
  ): Promise<{ success: boolean; message: string; warnings: string[] }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { members: true },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const newPlan = this.getPlan(newTier);
    const warnings: string[] = [];

    // Check if current usage exceeds new limits
    if (org.members.length > newPlan.limits.maxUsers) {
      warnings.push(`You have ${org.members.length} users but new plan allows ${newPlan.limits.maxUsers}`);
    }

    // Update organization
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        tier: newTier,
        maxUsers: newPlan.limits.maxUsers,
        maxInvoices: newPlan.limits.maxInvoices,
        maxDocuments: newPlan.limits.maxDocuments,
      },
    });

    this.logger.log(`Organization ${organizationId} downgraded from ${org.tier} to ${newTier}`);

    return {
      success: true,
      message: `Successfully downgraded to ${newPlan.name} plan. Changes take effect at next billing cycle.`,
      warnings,
    };
  }

  /**
   * Compare two plans
   */
  comparePlans(tier1: Tier, tier2: Tier): {
    plan1: PricingPlan;
    plan2: PricingPlan;
    differences: Array<{ feature: string; plan1Value: string; plan2Value: string }>;
  } {
    const plan1 = this.getPlan(tier1);
    const plan2 = this.getPlan(tier2);

    const differences: Array<{ feature: string; plan1Value: string; plan2Value: string }> = [];

    // Compare features
    const allFeatureKeys = new Set([
      ...plan1.features.map(f => f.key),
      ...plan2.features.map(f => f.key),
    ]);

    allFeatureKeys.forEach(key => {
      const f1 = plan1.features.find(f => f.key === key);
      const f2 = plan2.features.find(f => f.key === key);

      const v1 = f1 ? (f1.included ? (f1.limit || 'Yes') : 'No') : 'No';
      const v2 = f2 ? (f2.included ? (f2.limit || 'Yes') : 'No') : 'No';

      if (v1 !== v2) {
        differences.push({
          feature: f1?.name || f2?.name || key,
          plan1Value: String(v1),
          plan2Value: String(v2),
        });
      }
    });

    // Compare limits
    Object.entries(plan1.limits).forEach(([key, value]) => {
      const plan2Value = plan2.limits[key as keyof PlanLimits];
      if (value !== plan2Value) {
        differences.push({
          feature: key,
          plan1Value: String(value),
          plan2Value: String(plan2Value),
        });
      }
    });

    return { plan1, plan2, differences };
  }

  /**
   * Calculate storage usage for an organization
   */
  private async calculateStorageUsage(organizationId: string): Promise<number> {
    // Placeholder - would calculate actual file sizes in production
    const docCount = await this.prisma.document.count({
      where: { organizationId },
    });
    // Estimate 0.5 MB per document on average
    return Math.round((docCount * 0.5) / 1024 * 100) / 100; // In GB, 2 decimal places
  }

  /**
   * Get start of current month
   */
  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Get current period string (YYYY-MM)
   */
  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get next billing date
   */
  private getNextBillingDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Guard decorator helper - throws if limit exceeded
   */
  async enforceLimit(organizationId: string, limitType: keyof PlanLimits, currentCount?: number): Promise<void> {
    const check = await this.checkLimit(organizationId, limitType, currentCount);
    if (!check.allowed) {
      throw new ForbiddenException(check.message);
    }
  }

  /**
   * Guard decorator helper - throws if feature not available
   */
  async enforceFeature(organizationId: string, featureKey: string): Promise<void> {
    const hasAccess = await this.hasFeature(organizationId, featureKey);
    if (!hasAccess) {
      const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
      throw new ForbiddenException(
        `Feature "${featureKey}" is not available on your ${org?.tier || 'current'} plan. Please upgrade to access this feature.`
      );
    }
  }

  // =================== PREMIUM AI SUBSCRIPTION METHODS ===================

  /**
   * Get all AI add-on packages
   */
  getAiAddOnPackages(): AiAddOnPackage[] {
    return Array.from(this.aiAddOnPackages.values());
  }

  /**
   * Get a specific AI add-on package
   */
  getAiAddOnPackage(packageId: string): AiAddOnPackage {
    const pkg = this.aiAddOnPackages.get(packageId);
    if (!pkg) {
      throw new BadRequestException(`Invalid AI package: ${packageId}`);
    }
    return pkg;
  }

  /**
   * Subscribe organization to AI add-on package
   */
  async subscribeToAiAddOn(
    organizationId: string,
    packageId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
  ): Promise<{ success: boolean; message: string; package: AiAddOnPackage; totalPrice: number }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const aiPackage = this.getAiAddOnPackage(packageId);
    const basePlan = this.getPlan(org.tier);

    // Calculate total price
    const basePrice = billingCycle === 'yearly' ? basePlan.priceYearly : basePlan.priceMonthly;
    const addOnPrice = billingCycle === 'yearly' ? aiPackage.priceYearly : aiPackage.priceMonthly;
    const totalPrice = basePrice + addOnPrice;

    // Store AI subscription in organization metadata (would use separate table in production)
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...(org.settings as object || {}),
          aiAddOnPackage: packageId,
          aiAddOnBillingCycle: billingCycle,
          aiAddOnStartDate: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Organization ${organizationId} subscribed to AI add-on: ${packageId}`);

    return {
      success: true,
      message: `Successfully subscribed to ${aiPackage.name} add-on`,
      package: aiPackage,
      totalPrice,
    };
  }

  /**
   * Cancel AI add-on subscription
   */
  async cancelAiAddOn(organizationId: string): Promise<{ success: boolean; message: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const settings = org.settings as any || {};
    if (!settings.aiAddOnPackage) {
      throw new BadRequestException('No active AI add-on subscription');
    }

    // Remove AI subscription from settings
    delete settings.aiAddOnPackage;
    delete settings.aiAddOnBillingCycle;
    settings.aiAddOnCancelledAt = new Date().toISOString();

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings },
    });

    this.logger.log(`Organization ${organizationId} cancelled AI add-on subscription`);

    return {
      success: true,
      message: 'AI add-on subscription cancelled. Changes take effect at next billing cycle.',
    };
  }

  /**
   * Get organization's current AI add-on subscription
   */
  async getAiAddOnSubscription(organizationId: string): Promise<{
    hasAiAddOn: boolean;
    package?: AiAddOnPackage;
    billingCycle?: 'monthly' | 'yearly';
    startDate?: Date;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const settings = org.settings as any || {};

    if (!settings.aiAddOnPackage) {
      return { hasAiAddOn: false };
    }

    const aiPackage = this.aiAddOnPackages.get(settings.aiAddOnPackage);

    return {
      hasAiAddOn: true,
      package: aiPackage,
      billingCycle: settings.aiAddOnBillingCycle,
      startDate: settings.aiAddOnStartDate ? new Date(settings.aiAddOnStartDate) : undefined,
    };
  }

  /**
   * Get AI usage statistics for an organization
   */
  async getAiUsageStats(organizationId: string): Promise<AiUsageStats> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const settings = org.settings as any || {};
    const basePlan = this.getPlan(org.tier);
    const hasAiAddOn = !!settings.aiAddOnPackage;

    // Get AI package limits (combine base plan + add-on)
    let aiLimits: AiLimits = {
      contractAnalyses: basePlan.limits.maxAiContractAnalyses,
      forecasts: basePlan.limits.maxAiForecasts,
      anomalyScans: basePlan.limits.maxAiAnomalyScans,
      grokQueries: basePlan.limits.maxAiQueries,
      documentSummaries: basePlan.limits.aiDocumentSummary ? 50 : 0,
      smartCategorizations: basePlan.limits.aiSmartCategorization ? 100 : 0,
    };

    // Add AI add-on limits if subscribed
    if (hasAiAddOn) {
      const aiPackage = this.aiAddOnPackages.get(settings.aiAddOnPackage);
      if (aiPackage) {
        aiLimits = {
          contractAnalyses: aiLimits.contractAnalyses + aiPackage.limits.contractAnalyses,
          forecasts: aiLimits.forecasts + aiPackage.limits.forecasts,
          anomalyScans: aiLimits.anomalyScans + aiPackage.limits.anomalyScans,
          grokQueries: aiLimits.grokQueries + aiPackage.limits.grokQueries,
          documentSummaries: aiLimits.documentSummaries + aiPackage.limits.documentSummaries,
          smartCategorizations: aiLimits.smartCategorizations + aiPackage.limits.smartCategorizations,
        };
      }
    }

    // Get current usage from cache
    const contractAnalysesUsed = this.getUsageValue(organizationId, 'ai_contract_analyses');
    const forecastsUsed = this.getUsageValue(organizationId, 'ai_forecasts');
    const anomalyScansUsed = this.getUsageValue(organizationId, 'ai_anomaly_scans');
    const grokQueriesUsed = this.getUsageValue(organizationId, 'ai_grok_queries');
    const documentSummariesUsed = this.getUsageValue(organizationId, 'ai_document_summaries');
    const smartCategorizationsUsed = this.getUsageValue(organizationId, 'ai_smart_categorizations');

    const usage = {
      contractAnalyses: {
        used: contractAnalysesUsed,
        limit: aiLimits.contractAnalyses,
        percentage: aiLimits.contractAnalyses > 0 ? Math.round((contractAnalysesUsed / aiLimits.contractAnalyses) * 100) : 0,
      },
      forecasts: {
        used: forecastsUsed,
        limit: aiLimits.forecasts,
        percentage: aiLimits.forecasts > 0 ? Math.round((forecastsUsed / aiLimits.forecasts) * 100) : 0,
      },
      anomalyScans: {
        used: anomalyScansUsed,
        limit: aiLimits.anomalyScans,
        percentage: aiLimits.anomalyScans > 0 ? Math.round((anomalyScansUsed / aiLimits.anomalyScans) * 100) : 0,
      },
      grokQueries: {
        used: grokQueriesUsed,
        limit: aiLimits.grokQueries,
        percentage: aiLimits.grokQueries > 0 ? Math.round((grokQueriesUsed / aiLimits.grokQueries) * 100) : 0,
      },
      documentSummaries: {
        used: documentSummariesUsed,
        limit: aiLimits.documentSummaries,
        percentage: aiLimits.documentSummaries > 0 ? Math.round((documentSummariesUsed / aiLimits.documentSummaries) * 100) : 0,
      },
      smartCategorizations: {
        used: smartCategorizationsUsed,
        limit: aiLimits.smartCategorizations,
        percentage: aiLimits.smartCategorizations > 0 ? Math.round((smartCategorizationsUsed / aiLimits.smartCategorizations) * 100) : 0,
      },
    };

    // Calculate cost breakdown
    const basePrice = basePlan.priceMonthly;
    let addOnPrice = 0;
    if (hasAiAddOn) {
      const aiPackage = this.aiAddOnPackages.get(settings.aiAddOnPackage);
      addOnPrice = aiPackage?.priceMonthly || 0;
    }

    // Calculate overage (placeholder - would integrate with billing system)
    const overage = 0;

    // Generate warnings
    const warnings: string[] = [];
    Object.entries(usage).forEach(([key, value]) => {
      if (value.percentage >= 90) {
        warnings.push(`${key} usage is at ${value.percentage}% - consider upgrading AI package`);
      } else if (value.percentage >= 75) {
        warnings.push(`${key} usage is at ${value.percentage}%`);
      }
    });

    if (!hasAiAddOn && Object.values(usage).some(v => v.percentage >= 50)) {
      warnings.push('Consider subscribing to an AI add-on package for increased limits');
    }

    return {
      organizationId,
      period: this.getCurrentPeriod(),
      hasAiAddOn,
      usage,
      costBreakdown: {
        baseSubscription: basePrice,
        aiAddOn: addOnPrice,
        overage,
        total: basePrice + addOnPrice + overage,
      },
      warnings,
    };
  }

  /**
   * Check if organization has access to a specific AI feature
   */
  async checkAiFeatureAccess(
    organizationId: string,
    featureKey: 'contractAnalysis' | 'forecasting' | 'anomalyDetection' | 'smartCategorization' | 'grokAssistant' | 'documentSummary',
  ): Promise<{ allowed: boolean; limit: number; used: number; message?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return { allowed: false, limit: 0, used: 0, message: 'Organization not found' };
    }

    const basePlan = this.getPlan(org.tier);
    const settings = org.settings as any || {};
    const hasAiAddOn = !!settings.aiAddOnPackage;

    // Map feature key to plan limit key
    const featureMap: Record<string, { boolKey: keyof PlanLimits; limitKey: keyof PlanLimits; usageKey: string }> = {
      contractAnalysis: { boolKey: 'aiContractAnalysis', limitKey: 'maxAiContractAnalyses', usageKey: 'ai_contract_analyses' },
      forecasting: { boolKey: 'aiForecasting', limitKey: 'maxAiForecasts', usageKey: 'ai_forecasts' },
      anomalyDetection: { boolKey: 'aiAnomalyDetection', limitKey: 'maxAiAnomalyScans', usageKey: 'ai_anomaly_scans' },
      smartCategorization: { boolKey: 'aiSmartCategorization', limitKey: 'maxAiContractAnalyses', usageKey: 'ai_smart_categorizations' },
      grokAssistant: { boolKey: 'aiGrokAssistant', limitKey: 'maxAiQueries', usageKey: 'ai_grok_queries' },
      documentSummary: { boolKey: 'aiDocumentSummary', limitKey: 'maxAiQueries', usageKey: 'ai_document_summaries' },
    };

    const mapping = featureMap[featureKey];
    if (!mapping) {
      return { allowed: false, limit: 0, used: 0, message: 'Unknown AI feature' };
    }

    // Check if feature is enabled on base plan
    let featureEnabled = basePlan.limits[mapping.boolKey] as boolean;
    let limit = basePlan.limits[mapping.limitKey] as number;

    // Add AI add-on limits if subscribed
    if (hasAiAddOn) {
      const aiPackage = this.aiAddOnPackages.get(settings.aiAddOnPackage);
      if (aiPackage) {
        // Check if feature is included in add-on
        const addOnFeature = aiPackage.features.find(f => f.key === featureKey || f.key.includes(featureKey));
        if (addOnFeature?.included) {
          featureEnabled = true;
          // Add add-on limits
          const addOnLimits = aiPackage.limits as any;
          const addOnLimitKey = featureKey === 'contractAnalysis' ? 'contractAnalyses' :
            featureKey === 'forecasting' ? 'forecasts' :
            featureKey === 'anomalyDetection' ? 'anomalyScans' :
            featureKey === 'smartCategorization' ? 'smartCategorizations' :
            featureKey === 'grokAssistant' ? 'grokQueries' : 'documentSummaries';
          limit += addOnLimits[addOnLimitKey] || 0;
        }
      }
    }

    if (!featureEnabled) {
      return {
        allowed: false,
        limit: 0,
        used: 0,
        message: `${featureKey} is not available on your ${org.tier} plan. Subscribe to an AI add-on package to access this feature.`,
      };
    }

    const used = this.getUsageValue(organizationId, mapping.usageKey);
    const allowed = used < limit;

    return {
      allowed,
      limit,
      used,
      message: allowed ? undefined : `You've reached your ${featureKey} limit (${limit}). Upgrade your AI package to continue.`,
    };
  }

  /**
   * Increment AI usage counter
   */
  incrementAiUsage(
    organizationId: string,
    featureKey: 'contractAnalysis' | 'forecasting' | 'anomalyDetection' | 'smartCategorization' | 'grokAssistant' | 'documentSummary',
    amount: number = 1,
  ): void {
    const usageKeyMap: Record<string, string> = {
      contractAnalysis: 'ai_contract_analyses',
      forecasting: 'ai_forecasts',
      anomalyDetection: 'ai_anomaly_scans',
      smartCategorization: 'ai_smart_categorizations',
      grokAssistant: 'ai_grok_queries',
      documentSummary: 'ai_document_summaries',
    };

    const usageKey = usageKeyMap[featureKey];
    if (usageKey) {
      this.incrementUsage(organizationId, usageKey, amount);
    }
  }

  /**
   * Enforce AI feature access - throws if not allowed
   */
  async enforceAiFeatureAccess(
    organizationId: string,
    featureKey: 'contractAnalysis' | 'forecasting' | 'anomalyDetection' | 'smartCategorization' | 'grokAssistant' | 'documentSummary',
  ): Promise<void> {
    const check = await this.checkAiFeatureAccess(organizationId, featureKey);
    if (!check.allowed) {
      throw new ForbiddenException(check.message);
    }
  }

  /**
   * Get combined subscription summary (base plan + AI add-on)
   */
  async getFullSubscriptionSummary(organizationId: string): Promise<{
    organization: { id: string; name: string; tier: Tier };
    basePlan: PricingPlan;
    aiAddOn?: AiAddOnPackage;
    totalMonthlyPrice: number;
    totalYearlyPrice: number;
    aiUsage: AiUsageStats;
    recommendations: string[];
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const basePlan = this.getPlan(org.tier);
    const aiSubscription = await this.getAiAddOnSubscription(organizationId);
    const aiUsage = await this.getAiUsageStats(organizationId);

    let totalMonthlyPrice = basePlan.priceMonthly;
    let totalYearlyPrice = basePlan.priceYearly;

    if (aiSubscription.hasAiAddOn && aiSubscription.package) {
      totalMonthlyPrice += aiSubscription.package.priceMonthly;
      totalYearlyPrice += aiSubscription.package.priceYearly;
    }

    // Generate recommendations
    const recommendations: string[] = [];

    // Check if user would benefit from yearly billing
    if (totalMonthlyPrice > 0) {
      const yearlySavings = (totalMonthlyPrice * 12) - totalYearlyPrice;
      if (yearlySavings > 0) {
        recommendations.push(`Save ${yearlySavings} RON/year with annual billing`);
      }
    }

    // Check if user should upgrade AI package
    const highAiUsage = Object.values(aiUsage.usage).some(v => v.percentage >= 80);
    if (highAiUsage && aiSubscription.package?.id !== 'ai-enterprise') {
      if (!aiSubscription.hasAiAddOn) {
        recommendations.push('Consider AI Starter package for enhanced AI capabilities');
      } else if (aiSubscription.package?.id === 'ai-starter') {
        recommendations.push('Upgrade to AI Professional for unlimited contract analysis and anomaly detection');
      } else if (aiSubscription.package?.id === 'ai-professional') {
        recommendations.push('Upgrade to AI Enterprise for unlimited AI capabilities');
      }
    }

    // Check if base plan upgrade would help
    if (org.tier === Tier.FREE && aiUsage.usage.grokQueries.percentage >= 80) {
      recommendations.push('Upgrade to Pro plan for 500 AI queries/month (50x increase)');
    }

    return {
      organization: { id: org.id, name: org.name, tier: org.tier },
      basePlan,
      aiAddOn: aiSubscription.package,
      totalMonthlyPrice,
      totalYearlyPrice,
      aiUsage,
      recommendations,
    };
  }
}
