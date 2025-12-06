import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
export declare class WebhooksController {
    private readonly webhooksService;
    constructor(webhooksService: WebhooksService);
    getAvailableEvents(): {
        key: string;
        value: import("./dto/webhook.dto").WebhookEvent;
        description: string;
        category: string;
    }[];
    create(companyId: string, user: any, dto: CreateWebhookDto): Promise<{
        message: string;
        secret: string;
    }>;
    findAll(companyId: string, user: any): Promise<unknown>;
    findOne(companyId: string, id: string, user: any): Promise<any>;
    update(companyId: string, id: string, user: any, dto: UpdateWebhookDto): Promise<{
        message: string;
    }>;
    remove(companyId: string, id: string, user: any): Promise<{
        message: string;
    }>;
    getLogs(companyId: string, id: string, user: any, limit?: number): Promise<unknown>;
    test(companyId: string, id: string, user: any): Promise<{
        success: boolean;
        message: string;
    }>;
    retry(companyId: string, logId: string, user: any): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=webhooks.controller.d.ts.map