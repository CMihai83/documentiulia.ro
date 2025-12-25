import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

/**
 * Payment Links Service
 * Generate shareable payment links for invoices
 *
 * Features:
 * - Public payment link generation
 * - Embeddable payment widget
 * - Multiple payment methods
 * - Link expiration and limits
 * - Payment tracking
 * - Branded checkout pages
 * - QR code generation
 * - Multi-currency support
 */

// =================== INTERFACES ===================

export interface PaymentLink {
  id: string;
  shortCode: string;
  tenantId: string;
  invoiceId?: string;
  type: 'invoice' | 'custom' | 'subscription' | 'donation';

  // Amount
  amount: number;
  currency: string;
  allowCustomAmount: boolean;
  minAmount?: number;
  maxAmount?: number;
  suggestedAmounts?: number[];

  // Metadata
  title: string;
  description?: string;
  reference?: string;
  customerEmail?: string;
  customerName?: string;

  // Settings
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;

  // Payment options
  allowedPaymentMethods: PaymentMethod[];
  redirectUrl?: string;
  webhookUrl?: string;

  // Branding
  branding: PaymentLinkBranding;

  // URLs
  publicUrl: string;
  qrCodeUrl?: string;

  // Tracking
  createdAt: Date;
  createdBy: string;
  lastAccessedAt?: Date;
  totalCollected: number;
}

export type PaymentMethod =
  | 'card'
  | 'bank_transfer'
  | 'paypal'
  | 'stripe'
  | 'cash'
  | 'crypto';

export interface PaymentLinkBranding {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  companyName: string;
  companyAddress?: string;
  companyCui?: string;
  showPoweredBy: boolean;
  customCss?: string;
  customHeader?: string;
  customFooter?: string;
}

export interface PaymentLinkPayment {
  id: string;
  paymentLinkId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;

  // Customer info
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;

  // Transaction
  transactionId?: string;
  gatewayReference?: string;

  // Timestamps
  initiatedAt: Date;
  completedAt?: Date;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface EmbedWidget {
  id: string;
  tenantId: string;
  type: 'button' | 'inline' | 'modal' | 'qr';
  paymentLinkId: string;

  // Customization
  buttonText?: string;
  buttonColor?: string;
  buttonSize?: 'small' | 'medium' | 'large';
  width?: string;
  height?: string;

  // Generated code
  embedCode: string;
  iframeUrl: string;

  createdAt: Date;
}

export interface PaymentLinkStats {
  linkId: string;
  views: number;
  uniqueVisitors: number;
  paymentsInitiated: number;
  paymentsCompleted: number;
  totalCollected: number;
  conversionRate: number;
  averagePayment: number;
  paymentsByMethod: Record<PaymentMethod, number>;
  paymentsByDay: Array<{ date: string; amount: number; count: number }>;
}

// =================== SERVICE ===================

@Injectable()
export class PaymentLinksService {
  private readonly logger = new Logger(PaymentLinksService.name);

  // Storage
  private links: Map<string, PaymentLink> = new Map();
  private payments: Map<string, PaymentLinkPayment> = new Map();
  private widgets: Map<string, EmbedWidget> = new Map();
  private linkViews: Map<string, { views: number; visitors: Set<string> }> = new Map();

  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.baseUrl = this.configService.get('APP_URL') || 'https://documentiulia.ro';
  }

  // =================== LINK MANAGEMENT ===================

  async createPaymentLink(params: {
    tenantId: string;
    type: PaymentLink['type'];
    amount: number;
    currency: string;
    title: string;
    description?: string;
    invoiceId?: string;
    reference?: string;
    customerEmail?: string;
    customerName?: string;
    expiresAt?: Date;
    maxUses?: number;
    allowCustomAmount?: boolean;
    minAmount?: number;
    maxAmount?: number;
    suggestedAmounts?: number[];
    allowedPaymentMethods?: PaymentMethod[];
    redirectUrl?: string;
    webhookUrl?: string;
    branding?: Partial<PaymentLinkBranding>;
    createdBy: string;
  }): Promise<PaymentLink> {
    const shortCode = this.generateShortCode();
    const id = `pl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const link: PaymentLink = {
      id,
      shortCode,
      tenantId: params.tenantId,
      invoiceId: params.invoiceId,
      type: params.type,

      amount: params.amount,
      currency: params.currency,
      allowCustomAmount: params.allowCustomAmount || false,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      suggestedAmounts: params.suggestedAmounts,

      title: params.title,
      description: params.description,
      reference: params.reference,
      customerEmail: params.customerEmail,
      customerName: params.customerName,

      expiresAt: params.expiresAt,
      maxUses: params.maxUses,
      currentUses: 0,
      isActive: true,

      allowedPaymentMethods: params.allowedPaymentMethods || ['card', 'bank_transfer'],
      redirectUrl: params.redirectUrl,
      webhookUrl: params.webhookUrl,

      branding: {
        companyName: params.branding?.companyName || 'DocumentIulia',
        logoUrl: params.branding?.logoUrl,
        primaryColor: params.branding?.primaryColor || '#3B82F6',
        accentColor: params.branding?.accentColor || '#10B981',
        companyAddress: params.branding?.companyAddress,
        companyCui: params.branding?.companyCui,
        showPoweredBy: params.branding?.showPoweredBy ?? true,
        customCss: params.branding?.customCss,
        customHeader: params.branding?.customHeader,
        customFooter: params.branding?.customFooter,
      },

      publicUrl: `${this.baseUrl}/pay/${shortCode}`,
      qrCodeUrl: `${this.baseUrl}/api/v1/payment-links/${id}/qr`,

      createdAt: new Date(),
      createdBy: params.createdBy,
      totalCollected: 0,
    };

    this.links.set(id, link);
    this.links.set(shortCode, link); // Also index by shortCode

    this.logger.log(`Created payment link: ${shortCode} for ${params.amount} ${params.currency}`);

    this.eventEmitter.emit('payment-link.created', {
      linkId: id,
      tenantId: params.tenantId,
      amount: params.amount,
      currency: params.currency,
    });

    return link;
  }

  private generateShortCode(): string {
    // Generate URL-safe short code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async getPaymentLink(idOrShortCode: string): Promise<PaymentLink | null> {
    return this.links.get(idOrShortCode) || null;
  }

  async getPaymentLinkByShortCode(shortCode: string): Promise<PaymentLink | null> {
    for (const link of this.links.values()) {
      if (link.shortCode === shortCode) {
        return link;
      }
    }
    return null;
  }

  async getPaymentLinksByTenant(tenantId: string): Promise<PaymentLink[]> {
    return Array.from(this.links.values())
      .filter(l => l.tenantId === tenantId && l.id.startsWith('pl-'))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePaymentLink(
    id: string,
    updates: Partial<Pick<PaymentLink,
      'title' | 'description' | 'amount' | 'isActive' | 'expiresAt' |
      'maxUses' | 'redirectUrl' | 'webhookUrl' | 'branding'
    >>,
  ): Promise<PaymentLink | null> {
    const link = this.links.get(id);
    if (!link) return null;

    Object.assign(link, updates);
    this.links.set(id, link);

    return link;
  }

  async deactivateLink(id: string): Promise<boolean> {
    const link = this.links.get(id);
    if (!link) return false;

    link.isActive = false;
    this.links.set(id, link);

    return true;
  }

  async deleteLink(id: string): Promise<boolean> {
    const link = this.links.get(id);
    if (!link) return false;

    this.links.delete(id);
    this.links.delete(link.shortCode);

    return true;
  }

  // =================== PUBLIC ACCESS ===================

  async accessPaymentLink(shortCode: string, visitorId?: string): Promise<{
    link: PaymentLink;
    isValid: boolean;
    error?: string;
  }> {
    const link = await this.getPaymentLinkByShortCode(shortCode);

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    // Track view
    let viewData = this.linkViews.get(link.id);
    if (!viewData) {
      viewData = { views: 0, visitors: new Set() };
    }
    viewData.views++;
    if (visitorId) {
      viewData.visitors.add(visitorId);
    }
    this.linkViews.set(link.id, viewData);

    // Update last accessed
    link.lastAccessedAt = new Date();
    this.links.set(link.id, link);

    // Validate
    const validation = this.validateLink(link);

    return {
      link,
      isValid: validation.isValid,
      error: validation.error,
    };
  }

  private validateLink(link: PaymentLink): { isValid: boolean; error?: string } {
    if (!link.isActive) {
      return { isValid: false, error: 'This payment link is no longer active' };
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return { isValid: false, error: 'This payment link has expired' };
    }

    if (link.maxUses && link.currentUses >= link.maxUses) {
      return { isValid: false, error: 'This payment link has reached its usage limit' };
    }

    return { isValid: true };
  }

  // =================== PAYMENTS ===================

  async initiatePayment(params: {
    paymentLinkId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentLinkPayment> {
    const link = this.links.get(params.paymentLinkId);
    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    const validation = this.validateLink(link);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Validate payment method
    if (!link.allowedPaymentMethods.includes(params.paymentMethod)) {
      throw new Error(`Payment method ${params.paymentMethod} is not allowed for this link`);
    }

    // Validate amount
    if (!link.allowCustomAmount && params.amount !== link.amount) {
      throw new Error('Custom amounts are not allowed for this payment link');
    }

    if (link.minAmount && params.amount < link.minAmount) {
      throw new Error(`Minimum payment amount is ${link.minAmount} ${link.currency}`);
    }

    if (link.maxAmount && params.amount > link.maxAmount) {
      throw new Error(`Maximum payment amount is ${link.maxAmount} ${link.currency}`);
    }

    const payment: PaymentLinkPayment = {
      id: `plp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      paymentLinkId: params.paymentLinkId,
      amount: params.amount,
      currency: link.currency,
      status: 'pending',
      paymentMethod: params.paymentMethod,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      initiatedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    };

    this.payments.set(payment.id, payment);

    this.eventEmitter.emit('payment-link.payment.initiated', {
      paymentId: payment.id,
      linkId: link.id,
      amount: params.amount,
      currency: link.currency,
    });

    return payment;
  }

  async completePayment(
    paymentId: string,
    transactionId: string,
    gatewayReference?: string,
  ): Promise<PaymentLinkPayment> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.transactionId = transactionId;
    payment.gatewayReference = gatewayReference;

    this.payments.set(paymentId, payment);

    // Update link stats
    const link = this.links.get(payment.paymentLinkId);
    if (link) {
      link.currentUses++;
      link.totalCollected += payment.amount;
      this.links.set(link.id, link);
    }

    this.eventEmitter.emit('payment-link.payment.completed', {
      paymentId,
      linkId: payment.paymentLinkId,
      amount: payment.amount,
      currency: payment.currency,
      transactionId,
    });

    return payment;
  }

  async failPayment(paymentId: string, reason?: string): Promise<PaymentLinkPayment> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = 'failed';
    payment.metadata = { ...payment.metadata, failureReason: reason };

    this.payments.set(paymentId, payment);

    return payment;
  }

  async getPaymentsByLink(linkId: string): Promise<PaymentLinkPayment[]> {
    return Array.from(this.payments.values())
      .filter(p => p.paymentLinkId === linkId)
      .sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime());
  }

  // =================== EMBED WIDGETS ===================

  async createEmbedWidget(params: {
    tenantId: string;
    paymentLinkId: string;
    type: EmbedWidget['type'];
    buttonText?: string;
    buttonColor?: string;
    buttonSize?: EmbedWidget['buttonSize'];
    width?: string;
    height?: string;
  }): Promise<EmbedWidget> {
    const link = this.links.get(params.paymentLinkId);
    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    const widgetId = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const iframeUrl = `${this.baseUrl}/embed/pay/${link.shortCode}?widget=${widgetId}`;

    let embedCode = '';

    switch (params.type) {
      case 'button':
        embedCode = this.generateButtonEmbedCode(link, params, iframeUrl);
        break;
      case 'inline':
        embedCode = this.generateInlineEmbedCode(link, params, iframeUrl);
        break;
      case 'modal':
        embedCode = this.generateModalEmbedCode(link, params, iframeUrl);
        break;
      case 'qr':
        embedCode = this.generateQREmbedCode(link);
        break;
    }

    const widget: EmbedWidget = {
      id: widgetId,
      tenantId: params.tenantId,
      type: params.type,
      paymentLinkId: params.paymentLinkId,
      buttonText: params.buttonText,
      buttonColor: params.buttonColor,
      buttonSize: params.buttonSize,
      width: params.width,
      height: params.height,
      embedCode,
      iframeUrl,
      createdAt: new Date(),
    };

    this.widgets.set(widgetId, widget);

    return widget;
  }

  private generateButtonEmbedCode(
    link: PaymentLink,
    params: { buttonText?: string; buttonColor?: string; buttonSize?: string },
    iframeUrl: string,
  ): string {
    const buttonText = params.buttonText || `Pay ${link.amount} ${link.currency}`;
    const buttonColor = params.buttonColor || link.branding.primaryColor;
    const fontSize = params.buttonSize === 'small' ? '14px' : params.buttonSize === 'large' ? '18px' : '16px';
    const padding = params.buttonSize === 'small' ? '8px 16px' : params.buttonSize === 'large' ? '16px 32px' : '12px 24px';

    return `<!-- DocumentIulia Payment Button -->
<script src="${this.baseUrl}/js/payment-widget.js"></script>
<button
  onclick="DocumentIuliaPayment.open('${link.shortCode}')"
  style="
    background-color: ${buttonColor};
    color: white;
    border: none;
    border-radius: 8px;
    padding: ${padding};
    font-size: ${fontSize};
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  "
  onmouseover="this.style.opacity='0.9'"
  onmouseout="this.style.opacity='1'"
>
  ${buttonText}
</button>`;
  }

  private generateInlineEmbedCode(
    link: PaymentLink,
    params: { width?: string; height?: string },
    iframeUrl: string,
  ): string {
    const width = params.width || '100%';
    const height = params.height || '500px';

    return `<!-- DocumentIulia Payment Widget -->
<iframe
  src="${iframeUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  scrolling="no"
  style="border: 1px solid #e5e7eb; border-radius: 12px;"
  allow="payment"
></iframe>`;
  }

  private generateModalEmbedCode(
    link: PaymentLink,
    params: { buttonText?: string; buttonColor?: string },
    iframeUrl: string,
  ): string {
    const buttonText = params.buttonText || `Pay ${link.amount} ${link.currency}`;
    const buttonColor = params.buttonColor || link.branding.primaryColor;

    return `<!-- DocumentIulia Payment Modal -->
<script src="${this.baseUrl}/js/payment-widget.js"></script>
<button
  onclick="DocumentIuliaPayment.openModal('${link.shortCode}')"
  style="
    background-color: ${buttonColor};
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
  "
>
  ${buttonText}
</button>`;
  }

  private generateQREmbedCode(link: PaymentLink): string {
    return `<!-- DocumentIulia Payment QR Code -->
<img
  src="${link.qrCodeUrl}"
  alt="Scan to pay ${link.amount} ${link.currency}"
  style="width: 200px; height: 200px;"
/>
<p style="text-align: center; margin-top: 8px; font-size: 14px; color: #6b7280;">
  Scan to pay ${link.amount} ${link.currency}
</p>`;
  }

  async getWidget(widgetId: string): Promise<EmbedWidget | null> {
    return this.widgets.get(widgetId) || null;
  }

  async getWidgetsByTenant(tenantId: string): Promise<EmbedWidget[]> {
    return Array.from(this.widgets.values())
      .filter(w => w.tenantId === tenantId);
  }

  // =================== STATISTICS ===================

  async getLinkStats(linkId: string): Promise<PaymentLinkStats> {
    const link = this.links.get(linkId);
    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    const payments = await this.getPaymentsByLink(linkId);
    const completedPayments = payments.filter(p => p.status === 'completed');
    const viewData = this.linkViews.get(linkId) || { views: 0, visitors: new Set() };

    // Calculate stats by method
    const paymentsByMethod: Record<PaymentMethod, number> = {
      card: 0,
      bank_transfer: 0,
      paypal: 0,
      stripe: 0,
      cash: 0,
      crypto: 0,
    };

    completedPayments.forEach(p => {
      paymentsByMethod[p.paymentMethod] = (paymentsByMethod[p.paymentMethod] || 0) + p.amount;
    });

    // Calculate stats by day (last 30 days)
    const paymentsByDay: Array<{ date: string; amount: number; count: number }> = [];
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(last30Days);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayPayments = completedPayments.filter(p =>
        p.completedAt && p.completedAt.toISOString().split('T')[0] === dateStr
      );

      paymentsByDay.push({
        date: dateStr,
        amount: dayPayments.reduce((sum, p) => sum + p.amount, 0),
        count: dayPayments.length,
      });
    }

    return {
      linkId,
      views: viewData.views,
      uniqueVisitors: viewData.visitors.size,
      paymentsInitiated: payments.length,
      paymentsCompleted: completedPayments.length,
      totalCollected: link.totalCollected,
      conversionRate: viewData.views > 0
        ? Math.round((completedPayments.length / viewData.views) * 10000) / 100
        : 0,
      averagePayment: completedPayments.length > 0
        ? Math.round(link.totalCollected / completedPayments.length * 100) / 100
        : 0,
      paymentsByMethod,
      paymentsByDay,
    };
  }

  // =================== QR CODE ===================

  async generateQRCode(linkId: string): Promise<string> {
    const link = this.links.get(linkId);
    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    // Return a placeholder - in production would use qrcode library
    // This returns a simple SVG placeholder
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-size="12">QR: ${link.shortCode}</text>
      <text x="100" y="120" text-anchor="middle" font-size="10">${link.publicUrl}</text>
    </svg>`;
  }

  // =================== INVOICE LINK GENERATION ===================

  async createInvoicePaymentLink(params: {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    customerEmail?: string;
    customerName?: string;
    dueDate?: Date;
    companyName: string;
    companyCui?: string;
    createdBy: string;
  }): Promise<PaymentLink> {
    return this.createPaymentLink({
      tenantId: params.tenantId,
      type: 'invoice',
      amount: params.amount,
      currency: params.currency,
      title: `Invoice ${params.invoiceNumber}`,
      description: `Payment for invoice ${params.invoiceNumber}`,
      invoiceId: params.invoiceId,
      reference: params.invoiceNumber,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      expiresAt: params.dueDate ? new Date(params.dueDate.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
      allowedPaymentMethods: ['card', 'bank_transfer'],
      branding: {
        companyName: params.companyName,
        companyCui: params.companyCui,
        showPoweredBy: true,
      },
      createdBy: params.createdBy,
    });
  }
}
