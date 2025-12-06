import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNotificationDto, NotificationFilterDto, NotificationCountDto } from './dto/notification.dto';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateNotificationDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    createBulk(userIds: string[], dto: CreateNotificationDto): Promise<import(".prisma/client").Prisma.BatchPayload>;
    findAll(userId: string, filters: NotificationFilterDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            userId: string;
            type: string;
            title: string;
            link: string | null;
            message: string;
            isRead: boolean;
            readAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            unread: number;
        };
    }>;
    findOne(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAsRead(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAllAsRead(userId: string): Promise<{
        markedAsRead: number;
    }>;
    delete(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    deleteAll(userId: string): Promise<{
        deleted: number;
    }>;
    deleteRead(userId: string): Promise<{
        deleted: number;
    }>;
    getCount(userId: string): Promise<NotificationCountDto>;
    notifyInvoiceSent(userId: string, invoiceNumber: string, clientName: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    notifyInvoicePaid(userId: string, invoiceNumber: string, amount: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    notifyInvoiceOverdue(userId: string, invoiceNumber: string, daysOverdue: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    notifyReceiptProcessed(userId: string, vendorName: string, total: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    notifyEfacturaStatus(userId: string, invoiceNumber: string, status: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    notifySystemAlert(userId: string, title: string, message: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        link: string | null;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
}
//# sourceMappingURL=notifications.service.d.ts.map