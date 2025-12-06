"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WebhooksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const webhook_dto_1 = require("./dto/webhook.dto");
const crypto = __importStar(require("crypto"));
let WebhooksService = WebhooksService_1 = class WebhooksService {
    prisma;
    configService;
    logger = new common_1.Logger(WebhooksService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async checkCompanyAccess(companyId, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: { companyId, userId },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No access to this company');
        }
        return membership;
    }
    async create(companyId, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const secret = dto.secret || crypto.randomBytes(32).toString('hex');
        const webhook = await this.prisma.$executeRaw `
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
            secret: secret,
        };
    }
    async findAll(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const webhooks = await this.prisma.$queryRaw `
      SELECT id, name, url, events, is_active, created_at, updated_at,
             (SELECT COUNT(*) FROM webhook_logs WHERE webhook_id = webhooks.id) as delivery_count,
             (SELECT COUNT(*) FROM webhook_logs WHERE webhook_id = webhooks.id AND success = true) as success_count
      FROM webhooks
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
    `;
        return webhooks;
    }
    async findOne(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const webhook = await this.prisma.$queryRaw `
      SELECT * FROM webhooks
      WHERE id = ${id} AND company_id = ${companyId}
      LIMIT 1
    `;
        if (!webhook || webhook.length === 0) {
            throw new common_1.NotFoundException('Webhook not found');
        }
        return webhook[0];
    }
    async update(companyId, id, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const updates = [];
        const values = [];
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
        await this.prisma.$executeRawUnsafe(`UPDATE webhooks SET ${updates.join(', ')} WHERE id = $${values.length + 1} AND company_id = $${values.length + 2}`, ...values, id, companyId);
        return { message: 'Webhook actualizat cu succes' };
    }
    async remove(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        await this.prisma.$executeRaw `
      DELETE FROM webhooks WHERE id = ${id} AND company_id = ${companyId}
    `;
        return { message: 'Webhook șters cu succes' };
    }
    async getLogs(companyId, webhookId, userId, limit = 50) {
        await this.checkCompanyAccess(companyId, userId);
        const logs = await this.prisma.$queryRaw `
      SELECT wl.* FROM webhook_logs wl
      JOIN webhooks w ON w.id = wl.webhook_id
      WHERE w.company_id = ${companyId} AND wl.webhook_id = ${webhookId}
      ORDER BY wl.created_at DESC
      LIMIT ${limit}
    `;
        return logs;
    }
    async retry(companyId, logId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const log = await this.prisma.$queryRaw `
      SELECT wl.*, w.url, w.secret FROM webhook_logs wl
      JOIN webhooks w ON w.id = wl.webhook_id
      WHERE wl.id = ${logId}
      LIMIT 1
    `;
        if (!log || log.length === 0) {
            throw new common_1.NotFoundException('Webhook log not found');
        }
        const logEntry = log[0];
        await this.deliverWebhook(logEntry.url, logEntry.payload, logEntry.secret, logEntry.webhook_id);
        return { message: 'Webhook retriat cu succes' };
    }
    async trigger(companyId, event, data) {
        this.logger.log(`Triggering webhook event ${event} for company ${companyId}`);
        const webhooks = await this.prisma.$queryRaw `
      SELECT * FROM webhooks
      WHERE company_id = ${companyId}
        AND is_active = true
        AND events::jsonb ? ${event}
    `;
        if (!webhooks || webhooks.length === 0) {
            this.logger.debug(`No webhooks subscribed to ${event} for company ${companyId}`);
            return;
        }
        const payload = {
            event,
            timestamp: new Date().toISOString(),
            companyId,
            data,
        };
        for (const webhook of webhooks) {
            await this.deliverWebhook(webhook.url, payload, webhook.secret, webhook.id);
        }
    }
    async deliverWebhook(url, payload, secret, webhookId) {
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
            await this.prisma.$executeRaw `
        INSERT INTO webhook_logs (
          id, webhook_id, event, payload, status_code, response, success, created_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${webhookId},
          ${payload.event || 'unknown'},
          ${body}::jsonb,
          ${response.status},
          ${responseText.substring(0, 1000)},
          ${response.ok},
          NOW()
        )
      `;
            if (!response.ok) {
                this.logger.warn(`Webhook delivery failed: ${response.status} - ${responseText}`);
            }
            else {
                this.logger.debug(`Webhook delivered successfully to ${url}`);
            }
            return response.ok;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Webhook delivery error: ${errorMessage}`);
            await this.prisma.$executeRaw `
        INSERT INTO webhook_logs (
          id, webhook_id, event, payload, status_code, response, success, created_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${webhookId},
          ${payload.event || 'unknown'},
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
    generateSignature(payload, secret) {
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }
    async test(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const webhook = await this.findOne(companyId, id, userId);
        const testPayload = {
            event: webhook_dto_1.WebhookEvent.INVOICE_CREATED,
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
        const success = await this.deliverWebhook(webhook.url, testPayload, webhook.secret, webhook.id);
        return {
            success,
            message: success ? 'Test webhook trimis cu succes' : 'Eroare la trimiterea webhook-ului',
        };
    }
    getAvailableEvents() {
        return Object.entries(webhook_dto_1.WebhookEvent).map(([key, value]) => ({
            key,
            value,
            description: this.getEventDescription(value),
            category: this.getEventCategory(value),
        }));
    }
    getEventDescription(event) {
        const descriptions = {
            [webhook_dto_1.WebhookEvent.INVOICE_CREATED]: 'Factură nouă creată',
            [webhook_dto_1.WebhookEvent.INVOICE_UPDATED]: 'Factură actualizată',
            [webhook_dto_1.WebhookEvent.INVOICE_SENT]: 'Factură trimisă clientului',
            [webhook_dto_1.WebhookEvent.INVOICE_PAID]: 'Factură încasată',
            [webhook_dto_1.WebhookEvent.INVOICE_OVERDUE]: 'Factură restantă',
            [webhook_dto_1.WebhookEvent.INVOICE_CANCELLED]: 'Factură anulată',
            [webhook_dto_1.WebhookEvent.EFACTURA_SUBMITTED]: 'e-Factura trimisă la ANAF',
            [webhook_dto_1.WebhookEvent.EFACTURA_VALIDATED]: 'e-Factura validată de ANAF',
            [webhook_dto_1.WebhookEvent.EFACTURA_REJECTED]: 'e-Factura respinsă de ANAF',
            [webhook_dto_1.WebhookEvent.EXPENSE_CREATED]: 'Cheltuială nouă înregistrată',
            [webhook_dto_1.WebhookEvent.EXPENSE_APPROVED]: 'Cheltuială aprobată',
            [webhook_dto_1.WebhookEvent.RECEIPT_UPLOADED]: 'Bon fiscal încărcat',
            [webhook_dto_1.WebhookEvent.RECEIPT_PROCESSED]: 'Bon fiscal procesat OCR',
            [webhook_dto_1.WebhookEvent.CLIENT_CREATED]: 'Client nou adăugat',
            [webhook_dto_1.WebhookEvent.CLIENT_UPDATED]: 'Client actualizat',
            [webhook_dto_1.WebhookEvent.PAYMENT_RECEIVED]: 'Plată încasată',
            [webhook_dto_1.WebhookEvent.FISCAL_DEADLINE]: 'Termen fiscal apropiat',
            [webhook_dto_1.WebhookEvent.FISCAL_LAW_CHANGE]: 'Modificare legislație fiscală',
            [webhook_dto_1.WebhookEvent.ANOMALY_DETECTED]: 'Anomalie detectată',
        };
        return descriptions[event] || event;
    }
    getEventCategory(event) {
        if (event.startsWith('invoice.'))
            return 'Facturi';
        if (event.startsWith('efactura.'))
            return 'e-Factura';
        if (event.startsWith('expense.'))
            return 'Cheltuieli';
        if (event.startsWith('receipt.'))
            return 'Bonuri';
        if (event.startsWith('client.'))
            return 'Clienți';
        if (event.startsWith('payment.'))
            return 'Plăți';
        if (event.startsWith('fiscal.'))
            return 'Fiscal';
        if (event.startsWith('anomaly.'))
            return 'Securitate';
        return 'Altele';
    }
};
exports.WebhooksService = WebhooksService;
exports.WebhooksService = WebhooksService = WebhooksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], WebhooksService);
//# sourceMappingURL=webhooks.service.js.map