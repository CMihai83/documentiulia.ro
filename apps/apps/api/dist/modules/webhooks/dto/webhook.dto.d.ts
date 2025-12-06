export declare enum WebhookEvent {
    INVOICE_CREATED = "invoice.created",
    INVOICE_UPDATED = "invoice.updated",
    INVOICE_SENT = "invoice.sent",
    INVOICE_PAID = "invoice.paid",
    INVOICE_OVERDUE = "invoice.overdue",
    INVOICE_CANCELLED = "invoice.cancelled",
    EFACTURA_SUBMITTED = "efactura.submitted",
    EFACTURA_VALIDATED = "efactura.validated",
    EFACTURA_REJECTED = "efactura.rejected",
    EXPENSE_CREATED = "expense.created",
    EXPENSE_APPROVED = "expense.approved",
    RECEIPT_UPLOADED = "receipt.uploaded",
    RECEIPT_PROCESSED = "receipt.processed",
    CLIENT_CREATED = "client.created",
    CLIENT_UPDATED = "client.updated",
    PAYMENT_RECEIVED = "payment.received",
    FISCAL_DEADLINE = "fiscal.deadline",
    FISCAL_LAW_CHANGE = "fiscal.law_change",
    ANOMALY_DETECTED = "anomaly.detected"
}
export declare class CreateWebhookDto {
    name: string;
    url: string;
    events: WebhookEvent[];
    secret?: string;
    isActive?: boolean;
}
export declare class UpdateWebhookDto {
    name?: string;
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
}
export interface WebhookPayloadDto {
    event: WebhookEvent;
    timestamp: string;
    companyId: string;
    data: Record<string, unknown>;
}
export interface WebhookLogDto {
    id: string;
    webhookId: string;
    event: WebhookEvent;
    payload: Record<string, unknown>;
    statusCode: number;
    response: string;
    success: boolean;
    createdAt: Date;
}
//# sourceMappingURL=webhook.dto.d.ts.map