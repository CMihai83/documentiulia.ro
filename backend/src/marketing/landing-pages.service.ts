import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Landing Page Types
export interface LandingPage {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  template?: string;
  content: PageContent;
  settings: PageSettings;
  seo: SEOSettings;
  tracking: TrackingConfig;
  forms: FormConfig[];
  variants: PageVariant[];
  stats: PageStats;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageContent {
  sections: PageSection[];
  styles: PageStyles;
  scripts?: string;
}

export interface PageSection {
  id: string;
  type: 'hero' | 'features' | 'testimonials' | 'pricing' | 'cta' | 'form' | 'gallery' | 'video' | 'faq' | 'footer' | 'custom';
  name: string;
  order: number;
  visible: boolean;
  content: Record<string, any>;
  styles?: Record<string, any>;
}

export interface PageStyles {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  customCSS?: string;
}

export interface PageSettings {
  domain?: string;
  customDomain?: string;
  favicon?: string;
  logo?: string;
  socialImage?: string;
  redirectAfterSubmit?: string;
  showBranding: boolean;
  enableAnalytics: boolean;
  enableHeatmap: boolean;
  password?: string;
  expiresAt?: Date;
}

export interface SEOSettings {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex: boolean;
  noFollow: boolean;
}

export interface TrackingConfig {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  linkedInPartnerId?: string;
  customScripts?: string;
}

export interface FormConfig {
  id: string;
  name: string;
  fields: FormField[];
  submitButton: {
    text: string;
    color: string;
    size: 'small' | 'medium' | 'large';
  };
  successMessage: string;
  redirectUrl?: string;
  integrations: FormIntegration[];
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'hidden';
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  options?: string[];
  defaultValue?: string;
}

export interface FormIntegration {
  type: 'email' | 'webhook' | 'crm' | 'mailchimp' | 'hubspot' | 'salesforce';
  config: Record<string, any>;
  enabled: boolean;
}

export interface PageVariant {
  id: string;
  name: string;
  weight: number;
  content: PageContent;
  stats: {
    views: number;
    conversions: number;
    conversionRate: number;
  };
}

export interface PageStats {
  views: number;
  uniqueVisitors: number;
  submissions: number;
  conversionRate: number;
  avgTimeOnPage: number;
  bounceRate: number;
  topSources: Array<{ source: string; visits: number }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface FormSubmission {
  id: string;
  pageId: string;
  formId: string;
  data: Record<string, any>;
  metadata: {
    ip?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  status: 'new' | 'processed' | 'converted' | 'spam';
  submittedAt: Date;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: 'lead-generation' | 'product-launch' | 'webinar' | 'ebook' | 'saas' | 'consulting' | 'ecommerce' | 'event';
  thumbnail: string;
  content: PageContent;
  isDefault: boolean;
}

@Injectable()
export class LandingPagesService {
  private pages: Map<string, LandingPage> = new Map();
  private submissions: Map<string, FormSubmission> = new Map();
  private templates: PageTemplate[] = [];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    this.templates = [
      {
        id: 'lead-gen-basic',
        name: 'Lead Generation Basic',
        description: 'Simple lead capture page with hero and form',
        category: 'lead-generation',
        thumbnail: '/templates/lead-gen-basic.png',
        isDefault: true,
        content: {
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              name: 'Hero Section',
              order: 0,
              visible: true,
              content: {
                headline: 'Transform Your Business Today',
                subheadline: 'Get started with our proven solution and see results in days, not months.',
                ctaText: 'Get Started Free',
                ctaLink: '#form',
                backgroundImage: '',
                alignment: 'center',
              },
            },
            {
              id: 'form-1',
              type: 'form',
              name: 'Lead Capture Form',
              order: 1,
              visible: true,
              content: {
                formId: 'main-form',
                title: 'Start Your Free Trial',
                description: 'No credit card required. Get access instantly.',
              },
            },
            {
              id: 'features-1',
              type: 'features',
              name: 'Features Section',
              order: 2,
              visible: true,
              content: {
                headline: 'Why Choose Us',
                features: [
                  { icon: 'rocket', title: 'Fast Setup', description: 'Get started in minutes' },
                  { icon: 'shield', title: 'Secure', description: 'Bank-level security' },
                  { icon: 'chart', title: 'Analytics', description: 'Real-time insights' },
                ],
              },
            },
          ],
          styles: {
            primaryColor: '#3b82f6',
            secondaryColor: '#10b981',
            fontFamily: 'Inter, sans-serif',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
          },
        },
      },
      {
        id: 'saas-landing',
        name: 'SaaS Product Launch',
        description: 'Full-featured SaaS landing page with pricing',
        category: 'saas',
        thumbnail: '/templates/saas-landing.png',
        isDefault: true,
        content: {
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              name: 'Hero Section',
              order: 0,
              visible: true,
              content: {
                headline: 'The All-in-One Platform for Your Business',
                subheadline: 'Streamline operations, boost productivity, and grow faster.',
                ctaText: 'Start Free Trial',
                ctaLink: '#pricing',
                showDemo: true,
              },
            },
            {
              id: 'features-1',
              type: 'features',
              name: 'Features Grid',
              order: 1,
              visible: true,
              content: {
                headline: 'Everything You Need',
                columns: 3,
                features: [],
              },
            },
            {
              id: 'testimonials-1',
              type: 'testimonials',
              name: 'Customer Stories',
              order: 2,
              visible: true,
              content: {
                headline: 'Trusted by Thousands',
                testimonials: [],
              },
            },
            {
              id: 'pricing-1',
              type: 'pricing',
              name: 'Pricing Plans',
              order: 3,
              visible: true,
              content: {
                headline: 'Simple, Transparent Pricing',
                plans: [],
              },
            },
            {
              id: 'faq-1',
              type: 'faq',
              name: 'FAQ Section',
              order: 4,
              visible: true,
              content: {
                headline: 'Frequently Asked Questions',
                questions: [],
              },
            },
            {
              id: 'cta-1',
              type: 'cta',
              name: 'Final CTA',
              order: 5,
              visible: true,
              content: {
                headline: 'Ready to Get Started?',
                subheadline: 'Join thousands of businesses already growing with us.',
                ctaText: 'Start Your Free Trial',
                ctaLink: '#signup',
              },
            },
          ],
          styles: {
            primaryColor: '#6366f1',
            secondaryColor: '#8b5cf6',
            fontFamily: 'Inter, sans-serif',
            backgroundColor: '#ffffff',
            textColor: '#111827',
          },
        },
      },
      {
        id: 'webinar-registration',
        name: 'Webinar Registration',
        description: 'Event registration page with countdown timer',
        category: 'webinar',
        thumbnail: '/templates/webinar.png',
        isDefault: true,
        content: {
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              name: 'Webinar Hero',
              order: 0,
              visible: true,
              content: {
                headline: 'Free Live Webinar',
                subheadline: 'Learn the secrets to scaling your business',
                showCountdown: true,
                eventDate: '',
              },
            },
            {
              id: 'form-1',
              type: 'form',
              name: 'Registration Form',
              order: 1,
              visible: true,
              content: {
                formId: 'registration',
                title: 'Reserve Your Spot',
                description: 'Limited seats available!',
              },
            },
            {
              id: 'custom-1',
              type: 'custom',
              name: 'Speakers',
              order: 2,
              visible: true,
              content: {
                headline: 'Meet Your Speakers',
                speakers: [],
              },
            },
          ],
          styles: {
            primaryColor: '#ef4444',
            secondaryColor: '#f97316',
            fontFamily: 'Inter, sans-serif',
            backgroundColor: '#0f172a',
            textColor: '#f8fafc',
          },
        },
      },
      {
        id: 'ebook-download',
        name: 'eBook Download',
        description: 'Lead magnet download page',
        category: 'ebook',
        thumbnail: '/templates/ebook.png',
        isDefault: true,
        content: {
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              name: 'eBook Hero',
              order: 0,
              visible: true,
              content: {
                headline: 'Free eBook Download',
                subheadline: 'The complete guide to...',
                showBookCover: true,
                bookCoverImage: '',
              },
            },
            {
              id: 'form-1',
              type: 'form',
              name: 'Download Form',
              order: 1,
              visible: true,
              content: {
                formId: 'download',
                title: 'Get Your Free Copy',
                description: 'Enter your email to download instantly.',
              },
            },
            {
              id: 'features-1',
              type: 'features',
              name: 'What You\'ll Learn',
              order: 2,
              visible: true,
              content: {
                headline: 'Inside This eBook',
                features: [],
              },
            },
          ],
          styles: {
            primaryColor: '#059669',
            secondaryColor: '#10b981',
            fontFamily: 'Merriweather, serif',
            backgroundColor: '#f0fdf4',
            textColor: '#064e3b',
          },
        },
      },
    ];
  }

  // =================== LANDING PAGES ===================

  async createPage(data: {
    tenantId: string;
    name: string;
    slug?: string;
    templateId?: string;
    content?: PageContent;
    settings?: Partial<PageSettings>;
    seo?: Partial<SEOSettings>;
  }): Promise<LandingPage> {
    const template = data.templateId
      ? this.templates.find(t => t.id === data.templateId)
      : null;

    const page: LandingPage = {
      id: uuidv4(),
      tenantId: data.tenantId,
      name: data.name,
      slug: data.slug || this.generateSlug(data.name),
      status: 'draft',
      template: data.templateId,
      content: data.content || template?.content || {
        sections: [],
        styles: {
          primaryColor: '#3b82f6',
          secondaryColor: '#10b981',
          fontFamily: 'Inter, sans-serif',
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
        },
      },
      settings: {
        showBranding: true,
        enableAnalytics: true,
        enableHeatmap: false,
        ...data.settings,
      },
      seo: {
        title: data.name,
        description: '',
        keywords: [],
        noIndex: false,
        noFollow: false,
        ...data.seo,
      },
      tracking: {},
      forms: [this.createDefaultForm()],
      variants: [],
      stats: {
        views: 0,
        uniqueVisitors: 0,
        submissions: 0,
        conversionRate: 0,
        avgTimeOnPage: 0,
        bounceRate: 0,
        topSources: [],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pages.set(page.id, page);

    this.eventEmitter.emit('landing-page.created', {
      pageId: page.id,
      tenantId: data.tenantId,
      name: page.name,
    });

    return page;
  }

  private createDefaultForm(): FormConfig {
    return {
      id: 'main-form',
      name: 'Contact Form',
      fields: [
        {
          id: 'email',
          type: 'email',
          name: 'email',
          label: 'Email Address',
          placeholder: 'you@example.com',
          required: true,
        },
        {
          id: 'name',
          type: 'text',
          name: 'name',
          label: 'Full Name',
          placeholder: 'John Doe',
          required: true,
        },
      ],
      submitButton: {
        text: 'Submit',
        color: '#3b82f6',
        size: 'medium',
      },
      successMessage: 'Thank you! We\'ll be in touch soon.',
      integrations: [],
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
  }

  async getPages(tenantId: string, status?: string): Promise<LandingPage[]> {
    return Array.from(this.pages.values())
      .filter(p => p.tenantId === tenantId && (!status || p.status === status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getPage(id: string): Promise<LandingPage | null> {
    return this.pages.get(id) || null;
  }

  async getPageBySlug(slug: string): Promise<LandingPage | null> {
    return Array.from(this.pages.values()).find(p => p.slug === slug) || null;
  }

  async updatePage(
    id: string,
    updates: {
      name?: string;
      slug?: string;
      content?: PageContent;
      settings?: Partial<PageSettings>;
      seo?: Partial<SEOSettings>;
      tracking?: Partial<TrackingConfig>;
      forms?: FormConfig[];
    },
  ): Promise<LandingPage | null> {
    const page = this.pages.get(id);
    if (!page) return null;

    if (updates.name) page.name = updates.name;
    if (updates.slug) page.slug = updates.slug;
    if (updates.content) page.content = updates.content;
    if (updates.settings) page.settings = { ...page.settings, ...updates.settings };
    if (updates.seo) page.seo = { ...page.seo, ...updates.seo };
    if (updates.tracking) page.tracking = { ...page.tracking, ...updates.tracking };
    if (updates.forms) page.forms = updates.forms;
    page.updatedAt = new Date();

    return page;
  }

  async deletePage(id: string): Promise<void> {
    this.pages.delete(id);
  }

  async publishPage(id: string): Promise<LandingPage | null> {
    const page = this.pages.get(id);
    if (!page) return null;

    page.status = 'published';
    page.publishedAt = new Date();
    page.updatedAt = new Date();

    this.eventEmitter.emit('landing-page.published', {
      pageId: page.id,
      tenantId: page.tenantId,
      slug: page.slug,
    });

    return page;
  }

  async unpublishPage(id: string): Promise<LandingPage | null> {
    const page = this.pages.get(id);
    if (!page) return null;

    page.status = 'draft';
    page.updatedAt = new Date();

    return page;
  }

  async archivePage(id: string): Promise<LandingPage | null> {
    const page = this.pages.get(id);
    if (!page) return null;

    page.status = 'archived';
    page.updatedAt = new Date();

    return page;
  }

  async duplicatePage(id: string): Promise<LandingPage | null> {
    const page = this.pages.get(id);
    if (!page) return null;

    const duplicate: LandingPage = {
      ...JSON.parse(JSON.stringify(page)),
      id: uuidv4(),
      name: `${page.name} (Copy)`,
      slug: this.generateSlug(`${page.name} copy`),
      status: 'draft',
      publishedAt: undefined,
      stats: {
        views: 0,
        uniqueVisitors: 0,
        submissions: 0,
        conversionRate: 0,
        avgTimeOnPage: 0,
        bounceRate: 0,
        topSources: [],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
      },
      variants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pages.set(duplicate.id, duplicate);
    return duplicate;
  }

  // =================== SECTIONS ===================

  async addSection(
    pageId: string,
    section: Omit<PageSection, 'id' | 'order'>,
  ): Promise<PageSection | null> {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const newSection: PageSection = {
      ...section,
      id: uuidv4(),
      order: page.content.sections.length,
    };

    page.content.sections.push(newSection);
    page.updatedAt = new Date();

    return newSection;
  }

  async updateSection(
    pageId: string,
    sectionId: string,
    updates: Partial<PageSection>,
  ): Promise<PageSection | null> {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const section = page.content.sections.find(s => s.id === sectionId);
    if (!section) return null;

    Object.assign(section, updates);
    page.updatedAt = new Date();

    return section;
  }

  async deleteSection(pageId: string, sectionId: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) return;

    page.content.sections = page.content.sections.filter(s => s.id !== sectionId);
    // Reorder remaining sections
    page.content.sections.forEach((s, i) => s.order = i);
    page.updatedAt = new Date();
  }

  async reorderSections(pageId: string, sectionIds: string[]): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) return;

    const sectionMap = new Map(page.content.sections.map(s => [s.id, s]));
    page.content.sections = sectionIds
      .map((id, order) => {
        const section = sectionMap.get(id);
        if (section) section.order = order;
        return section;
      })
      .filter(Boolean) as PageSection[];
    page.updatedAt = new Date();
  }

  // =================== FORMS ===================

  async submitForm(data: {
    pageId: string;
    formId: string;
    data: Record<string, any>;
    metadata: FormSubmission['metadata'];
  }): Promise<FormSubmission> {
    const submission: FormSubmission = {
      id: uuidv4(),
      pageId: data.pageId,
      formId: data.formId,
      data: data.data,
      metadata: data.metadata,
      status: 'new',
      submittedAt: new Date(),
    };

    this.submissions.set(submission.id, submission);

    // Update page stats
    const page = this.pages.get(data.pageId);
    if (page) {
      page.stats.submissions++;
      page.stats.conversionRate = (page.stats.submissions / page.stats.views) * 100;
    }

    this.eventEmitter.emit('landing-page.form-submitted', {
      pageId: data.pageId,
      formId: data.formId,
      submissionId: submission.id,
    });

    return submission;
  }

  async getSubmissions(
    pageId: string,
    formId?: string,
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<FormSubmission[]> {
    return Array.from(this.submissions.values())
      .filter(s =>
        s.pageId === pageId &&
        (!formId || s.formId === formId) &&
        (!status || s.status === status),
      )
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(offset, offset + limit);
  }

  async getSubmission(id: string): Promise<FormSubmission | null> {
    return this.submissions.get(id) || null;
  }

  async updateSubmissionStatus(
    id: string,
    status: FormSubmission['status'],
  ): Promise<FormSubmission | null> {
    const submission = this.submissions.get(id);
    if (!submission) return null;

    submission.status = status;
    return submission;
  }

  async deleteSubmission(id: string): Promise<void> {
    this.submissions.delete(id);
  }

  // =================== A/B TESTING ===================

  async createVariant(
    pageId: string,
    data: {
      name: string;
      weight: number;
      content: PageContent;
    },
  ): Promise<PageVariant | null> {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const variant: PageVariant = {
      id: uuidv4(),
      name: data.name,
      weight: data.weight,
      content: data.content,
      stats: {
        views: 0,
        conversions: 0,
        conversionRate: 0,
      },
    };

    page.variants.push(variant);
    page.updatedAt = new Date();

    return variant;
  }

  async updateVariant(
    pageId: string,
    variantId: string,
    updates: Partial<Pick<PageVariant, 'name' | 'weight' | 'content'>>,
  ): Promise<PageVariant | null> {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const variant = page.variants.find(v => v.id === variantId);
    if (!variant) return null;

    if (updates.name) variant.name = updates.name;
    if (updates.weight !== undefined) variant.weight = updates.weight;
    if (updates.content) variant.content = updates.content;
    page.updatedAt = new Date();

    return variant;
  }

  async deleteVariant(pageId: string, variantId: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) return;

    page.variants = page.variants.filter(v => v.id !== variantId);
    page.updatedAt = new Date();
  }

  async getWinningVariant(pageId: string): Promise<{
    winner: PageVariant | 'original';
    confidence: number;
    recommendation: string;
  } | null> {
    const page = this.pages.get(pageId);
    if (!page || page.variants.length === 0) return null;

    const originalRate = page.stats.conversionRate;
    let bestVariant: PageVariant | null = null;
    let bestRate = originalRate;

    for (const variant of page.variants) {
      if (variant.stats.conversionRate > bestRate) {
        bestRate = variant.stats.conversionRate;
        bestVariant = variant;
      }
    }

    const totalViews = page.stats.views + page.variants.reduce((sum, v) => sum + v.stats.views, 0);
    const confidence = Math.min(95, Math.floor((totalViews / 1000) * 100));

    return {
      winner: bestVariant || 'original',
      confidence,
      recommendation: confidence >= 95
        ? `Recommend selecting ${bestVariant?.name || 'original'} as the winner`
        : `Need more data to reach statistical significance (${confidence}% confidence)`,
    };
  }

  // =================== ANALYTICS ===================

  async recordPageView(pageId: string, metadata: {
    visitorId: string;
    device: 'desktop' | 'mobile' | 'tablet';
    source?: string;
    variantId?: string;
  }): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) return;

    page.stats.views++;
    page.stats.deviceBreakdown[metadata.device]++;

    if (metadata.source) {
      const existingSource = page.stats.topSources.find(s => s.source === metadata.source);
      if (existingSource) {
        existingSource.visits++;
      } else {
        page.stats.topSources.push({ source: metadata.source, visits: 1 });
      }
      page.stats.topSources.sort((a, b) => b.visits - a.visits);
      page.stats.topSources = page.stats.topSources.slice(0, 10);
    }

    if (metadata.variantId) {
      const variant = page.variants.find(v => v.id === metadata.variantId);
      if (variant) variant.stats.views++;
    }
  }

  async getPageAnalytics(pageId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<{
    overview: PageStats;
    timeline: Array<{ date: string; views: number; submissions: number }>;
    variants: Array<{ id: string; name: string; stats: PageVariant['stats'] }>;
  } | null> {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const timeline = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      timeline.push({
        date: date.toISOString().split('T')[0],
        views: Math.floor(page.stats.views / days) + Math.floor(Math.random() * 10),
        submissions: Math.floor(page.stats.submissions / days) + Math.floor(Math.random() * 2),
      });
    }

    return {
      overview: page.stats,
      timeline,
      variants: page.variants.map(v => ({
        id: v.id,
        name: v.name,
        stats: v.stats,
      })),
    };
  }

  // =================== TEMPLATES ===================

  async getTemplates(category?: string): Promise<PageTemplate[]> {
    return category
      ? this.templates.filter(t => t.category === category)
      : this.templates;
  }

  async getTemplate(id: string): Promise<PageTemplate | null> {
    return this.templates.find(t => t.id === id) || null;
  }

  async createCustomTemplate(tenantId: string, data: {
    name: string;
    description: string;
    category: PageTemplate['category'];
    content: PageContent;
  }): Promise<PageTemplate> {
    const template: PageTemplate = {
      id: `custom-${uuidv4()}`,
      name: data.name,
      description: data.description,
      category: data.category,
      thumbnail: '/templates/custom.png',
      content: data.content,
      isDefault: false,
    };

    this.templates.push(template);
    return template;
  }

  // =================== EXPORT/PREVIEW ===================

  async generateHTML(pageId: string): Promise<string | null> {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const { content, settings, seo, tracking } = page;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo.title}</title>
  <meta name="description" content="${seo.description}">
  ${seo.keywords.length ? `<meta name="keywords" content="${seo.keywords.join(', ')}">` : ''}
  ${seo.noIndex ? '<meta name="robots" content="noindex">' : ''}
  ${seo.noFollow ? '<meta name="robots" content="nofollow">' : ''}
  ${seo.ogTitle ? `<meta property="og:title" content="${seo.ogTitle}">` : ''}
  ${seo.ogDescription ? `<meta property="og:description" content="${seo.ogDescription}">` : ''}
  ${seo.ogImage ? `<meta property="og:image" content="${seo.ogImage}">` : ''}
  ${settings.favicon ? `<link rel="icon" href="${settings.favicon}">` : ''}
  <style>
    :root {
      --primary-color: ${content.styles.primaryColor};
      --secondary-color: ${content.styles.secondaryColor};
      --bg-color: ${content.styles.backgroundColor};
      --text-color: ${content.styles.textColor};
      --font-family: ${content.styles.fontFamily};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-family); background: var(--bg-color); color: var(--text-color); }
    ${content.styles.customCSS || ''}
  </style>
  ${tracking.googleAnalyticsId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${tracking.googleAnalyticsId}"></script>` : ''}
  ${tracking.facebookPixelId ? `<!-- Facebook Pixel -->` : ''}
  ${tracking.customScripts || ''}
</head>
<body>
  <!-- Page sections would be rendered here -->
  ${content.sections.filter(s => s.visible).map(s => `<section id="${s.id}" class="section section-${s.type}">${s.name}</section>`).join('\n  ')}
  ${settings.showBranding ? '<footer class="branding">Powered by DocumentIulia.ro</footer>' : ''}
</body>
</html>`;
  }

  async getPreviewUrl(pageId: string): Promise<string | null> {
    const page = this.pages.get(pageId);
    if (!page) return null;

    return `https://preview.documentiulia.ro/p/${page.slug}?preview=true&t=${Date.now()}`;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalPages: number;
    publishedPages: number;
    draftPages: number;
    totalViews: number;
    totalSubmissions: number;
    avgConversionRate: number;
    topPerforming: Array<{ id: string; name: string; conversionRate: number }>;
  }> {
    const pages = Array.from(this.pages.values()).filter(p => p.tenantId === tenantId);
    const published = pages.filter(p => p.status === 'published');
    const drafts = pages.filter(p => p.status === 'draft');

    const totalViews = pages.reduce((sum, p) => sum + p.stats.views, 0);
    const totalSubmissions = pages.reduce((sum, p) => sum + p.stats.submissions, 0);
    const avgConversionRate = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0;

    const topPerforming = [...pages]
      .filter(p => p.stats.views >= 10)
      .sort((a, b) => b.stats.conversionRate - a.stats.conversionRate)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        conversionRate: p.stats.conversionRate,
      }));

    return {
      totalPages: pages.length,
      publishedPages: published.length,
      draftPages: drafts.length,
      totalViews,
      totalSubmissions,
      avgConversionRate,
      topPerforming,
    };
  }
}
