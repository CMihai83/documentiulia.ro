import { NotificationsService } from './notifications.service';
import { NotificationFilterDto, NotificationCountDto } from './dto/notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(user: any, filters: NotificationFilterDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            userId: string;
            message: string;
            type: string;
            title: string;
            link: string | null;
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
    getCount(user: any): Promise<NotificationCountDto>;
    getUnread(user: any): Promise<{
        data: {
            id: string;
            createdAt: Date;
            userId: string;
            message: string;
            type: string;
            title: string;
            link: string | null;
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
    findOne(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        type: string;
        title: string;
        link: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAsRead(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        type: string;
        title: string;
        link: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAllAsRead(user: any): Promise<{
        markedAsRead: number;
    }>;
    delete(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        type: string;
        title: string;
        link: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    deleteAll(user: any): Promise<{
        deleted: number;
    }>;
    deleteRead(user: any): Promise<{
        deleted: number;
    }>;
}
//# sourceMappingURL=notifications.controller.d.ts.map