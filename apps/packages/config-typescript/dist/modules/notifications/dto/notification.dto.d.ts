export declare enum NotificationType {
    INVOICE_SENT = "invoice_sent",
    INVOICE_PAID = "invoice_paid",
    INVOICE_OVERDUE = "invoice_overdue",
    PAYMENT_RECEIVED = "payment_received",
    EXPENSE_APPROVED = "expense_approved",
    RECEIPT_PROCESSED = "receipt_processed",
    EFACTURA_STATUS = "efactura_status",
    SYSTEM_ALERT = "system_alert",
    REMINDER = "reminder"
}
export declare class CreateNotificationDto {
    type: string;
    title: string;
    message: string;
    link?: string;
}
export declare class NotificationFilterDto {
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
}
export declare class NotificationCountDto {
    unreadCount: number;
    totalCount: number;
}
//# sourceMappingURL=notification.dto.d.ts.map