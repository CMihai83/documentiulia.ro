import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWebhookDto, UpdateWebhookDto, WebhookEvent } from './dto/webhook.dto';
export declare class WebhooksService {
    private prisma;
    private configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    private checkCompanyAccess;
    create(companyId: string, dto: CreateWebhookDto, userId: string): Promise<{
        message: string;
        secret: string;
    }>;
    findAll(companyId: string, userId: string): Promise<unknown>;
    findOne(companyId: string, id: string, userId: string): Promise<any>;
    update(companyId: string, id: string, dto: UpdateWebhookDto, userId: string): Promise<{
        message: string;
    }>;
    remove(companyId: string, id: string, userId: string): Promise<{
        message: string;
    }>;
    getLogs(companyId: string, webhookId: string, userId: string, limit?: number): Promise<unknown>;
    retry(companyId: string, logId: string, userId: string): Promise<{
        message: string;
    }>;
    trigger(companyId: string, event: WebhookEvent, data: Record<string, any>): Promise<void>;
    private deliverWebhook;
    private generateSignature;
    test(companyId: string, id: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getAvailableEvents(): {
        key: string;
        value: WebhookEvent;
        description: string;
        category: string;
    }[];
    private getEventDescription;
    private getEventCategory;
}
//# sourceMappingURL=webhooks.service.d.ts.map