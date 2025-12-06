import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookEvent,
  WebhookPayloadDto,
} from './dto/webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private async checkCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.companyUser.findFirst({
      where: { companyId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('No access to this company');
    }
    return membership;
  }

  /**
   * Create a new webhook subscription
   */
  async create(companyId: string, dto: CreateWebhookDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    // Generate secret if not provided
    const secret = dto.secret || crypto.randomBytes(32).toString('hex');

    const webhook = await this.prisma.$executeRaw`
      INSERT INTO webhooks (
        id, company_id, name, url, events, secret, is_active, created_at, updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${companyId},
        ${dto.name},
        ${dto.url},
        ${JSON.stringify(dto.events)},
        ${secret},
        ${dto.isActive ?? true},
        NOW(),
        NOW()
      )
    `;

    this.logger.log(`Created webhook "${dto.name}" for company ${companyId}`);

    return {
      message: 'Webhook creat cu succes',
      secret: secret, // Return secret once for user to save
    };
  }

  /**
   * List all webhooks for a company
   */
  async findAll(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const webhooks = await this.prisma.$queryRaw`
      SELECT id, name, url, events, is_active, created_at, updated_at,
             (SELECT COUNT(*) FROM webhook_logs WHERE webhook_id = webhooks.id) as delivery_count,
             (SELECT COUNT(*) FROM webhook_logs WHERE webhook_id = webhooks.id AND success = true) as success_count
      FROM webhooks
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
    `;

    return webhooks;
  }

  /**
   * Get webhook by ID
   */
  async findOne(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const webhook = await this.prisma.$queryRaw`
      SELECT * FROM webhooks
      WHERE id = ${id} AND company_id = ${companyId}
      LIMIT 1
    `;

    if (!webhook || (webhook as any[]).length === 0) {
      throw new NotFoundException('Webhook not found');
    }

    return (webhook as any[])[0];
  }

  /**
   * Update webhook
   */
  async update(companyId: string, id: string, dto: UpdateWebhookDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const updates: string[] = [];
    const values: any[] = [];

    if (dto.name !== undefined) {
      updates.push('name = $1');
      values.push(dto.name);
    }
    if (dto.url !== undefined) {
      updates.push(`url = $${values.length + 1}`);
      values.push(dto.url);
    }
    if (dto.events !== undefined) {
      updates.push(`events = $${values.length + 1}`);
      values.push(JSON.stringify(dto.events));
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${values.length + 1}`);
      values.push(dto.isActive);
    }

    updates.push('updated_at = NOW()');

    await this.prisma.$executeRawUnsafe(
      `UPDATE webhooks SET ${updates.join(', ')} WHERE id = $${values.length + 1} AND company_id = $${values.length + 2}`,
      ...values,
      id,
      companyId,
    );

    return { message: 'Webhook actualizat cu succes' };
  }

  /**
   * Delete webhook
   */
  async remove(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    await this.prisma.$executeRaw`
      DELETE FROM webhooks WHERE id = ${id} AND company_id = ${companyId}
    `;

    return { message: 'Webhook șters cu succes' };
  }

  /**
   * Get webhook delivery logs
   */
  async getLogs(companyId: string, webhookId: string, userId: string, limit = 50) {
    await this.checkCompanyAccess(companyId, userId);

    const logs = await this.prisma.$queryRaw`
      SELECT wl.* FROM webhook_logs wl
      JOIN webhooks w ON w.id = wl.webhook_id
      WHERE w.company_id = ${companyId} AND wl.webhook_id = ${webhookId}
      ORDER BY wl.created_at DESC
      LIMIT ${limit}
    `;

    return logs;
  }

  /**
   * Retry failed webhook delivery
   */
  async retry(companyId: string, logId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const log = await this.prisma.$queryRaw`
      SELECT wl.*, w.url, w.secret FROM webhook_logs wl
      JOIN webhooks w ON w.id = wl.webhook_id
      WHERE wl.id = ${logId}
      LIMIT 1
    `;

    if (!log || (log as any[]).length === 0) {
      throw new NotFoundException('Webhook log not found');
    }

    const logEntry = (log as any[])[0];

    // Retry delivery
    await this.deliverWebhook(logEntry.url, logEntry.payload, logEntry.secret, logEntry.webhook_id);

    return { message: 'Webhook retriat cu succes' };
  }

  /**
   * Trigger webhook for an event
   * Called internally by other services
   */
  async trigger(companyId: string, event: WebhookEvent, data: Record<string, any>) {
    this.logger.log(`Triggering webhook event ${event} for company ${companyId}`);

    // Find all active webhooks subscribed to this event
    const webhooks = await this.prisma.$queryRaw`
      SELECT * FROM webhooks
      WHERE company_id = ${companyId}
        AND is_active = true
        AND events::jsonb ? ${event}
    `;

    if (!webhooks || (webhooks as any[]).length === 0) {
      this.logger.debug(`No webhooks subscribed to ${event} for company ${companyId}`);
      return;
    }

    const payload: WebhookPayloadDto = {
      event,
      timestamp: new Date().toISOString(),
      companyId,
      data,
    };

    // Deliver to all subscribed webhooks
    for (const webhook of webhooks as any[]) {
      await this.deliverWebhook(webhook.url, payload, webhook.secret, webhook.id);
    }
  }

  /**
   * Deliver webhook to URL
   */
  private async deliverWebhook(
    url: string,
    payload: WebhookPayloadDto | Record<string, any>,
    secret: string,
    webhookId: string,
  ) {
    const body = JSON.stringify(payload);
    const signature = this.generateSignature(body, secret);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': new Date().toISOString(),
          'User-Agent': 'DocumentIulia-Webhooks/2.0',
        },
        body,
      });

      const responseText = await response.text();

      // Log delivery
      await this.prisma.$executeRaw`
        INSERT INTO webhook_logs (
          id, webhook_id, event, payload, status_code, response, success, created_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${webhookId},
          ${(payload as WebhookPayloadDto).event || 'unknown'},
          ${body}::jsonb,
          ${response.status},
          ${responseText.substring(0, 1000)},
          ${response.ok},
          NOW()
        )
      `;

      if (!response.ok) {
        this.logger.warn(`Webhook delivery failed: ${response.status} - ${responseText}`);
      } else {
        this.logger.debug(`Webhook delivered successfully to ${url}`);
      }

      return response.ok;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook delivery error: ${errorMessage}`);

      // Log failed delivery
      await this.prisma.$executeRaw`
        INSERT INTO webhook_logs (
          id, webhook_id, event, payload, status_code, response, success, created_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${webhookId},
          ${(payload as WebhookPayloadDto).event || 'unknown'},
          ${body}::jsonb,
          0,
          ${errorMessage.substring(0, 1000)},
          false,
          NOW()
        )
      `;

      return false;
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Test webhook endpoint
   */
  async test(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const webhook = await this.findOne(companyId, id, userId);

    const testPayload: WebhookPayloadDto = {
      event: WebhookEvent.INVOICE_CREATED,
      timestamp: new Date().toISOString(),
      companyId,
      data: {
        test: true,
        message: 'Acesta este un test webhook de la DocumentIulia',
        invoiceId: 'test-123',
        invoiceNumber: 'FA-TEST-001',
        total: 1000.00,
        currency: 'RON',
      },
    };

    const success = await this.deliverWebhook(
      webhook.url,
      testPayload,
      webhook.secret,
      webhook.id,
    );

    return {
      success,
      message: success ? 'Test webhook trimis cu succes' : 'Eroare la trimiterea webhook-ului',
    };
  }

  /**
   * Get available webhook events
   */
  getAvailableEvents() {
    return Object.entries(WebhookEvent).map(([key, value]) => ({
      key,
      value,
      description: this.getEventDescription(value),
      category: this.getEventCategory(value),
    }));
  }

  private getEventDescription(event: WebhookEvent): string {
    const descriptions: Record<WebhookEvent, string> = {
      [WebhookEvent.INVOICE_CREATED]: 'Factură nouă creată',
      [WebhookEvent.INVOICE_UPDATED]: 'Factură actualizată',
      [WebhookEvent.INVOICE_SENT]: 'Factură trimisă clientului',
      [WebhookEvent.INVOICE_PAID]: 'Factură încasată',
      [WebhookEvent.INVOICE_OVERDUE]: 'Factură restantă',
      [WebhookEvent.INVOICE_CANCELLED]: 'Factură anulată',
      [WebhookEvent.EFACTURA_SUBMITTED]: 'e-Factura trimisă la ANAF',
      [WebhookEvent.EFACTURA_VALIDATED]: 'e-Factura validată de ANAF',
      [WebhookEvent.EFACTURA_REJECTED]: 'e-Factura respinsă de ANAF',
      [WebhookEvent.EXPENSE_CREATED]: 'Cheltuială nouă înregistrată',
      [WebhookEvent.EXPENSE_APPROVED]: 'Cheltuială aprobată',
      [WebhookEvent.RECEIPT_UPLOADED]: 'Bon fiscal încărcat',
      [WebhookEvent.RECEIPT_PROCESSED]: 'Bon fiscal procesat OCR',
      [WebhookEvent.CLIENT_CREATED]: 'Client nou adăugat',
      [WebhookEvent.CLIENT_UPDATED]: 'Client actualizat',
      [WebhookEvent.PAYMENT_RECEIVED]: 'Plată încasată',
      [WebhookEvent.FISCAL_DEADLINE]: 'Termen fiscal apropiat',
      [WebhookEvent.FISCAL_LAW_CHANGE]: 'Modificare legislație fiscală',
      [WebhookEvent.ANOMALY_DETECTED]: 'Anomalie detectată',
    };
    return descriptions[event] || event;
  }

  private getEventCategory(event: WebhookEvent): string {
    if (event.startsWith('invoice.')) return 'Facturi';
    if (event.startsWith('efactura.')) return 'e-Factura';
    if (event.startsWith('expense.')) return 'Cheltuieli';
    if (event.startsWith('receipt.')) return 'Bonuri';
    if (event.startsWith('client.')) return 'Clienți';
    if (event.startsWith('payment.')) return 'Plăți';
    if (event.startsWith('fiscal.')) return 'Fiscal';
    if (event.startsWith('anomaly.')) return 'Securitate';
    return 'Altele';
  }
}
