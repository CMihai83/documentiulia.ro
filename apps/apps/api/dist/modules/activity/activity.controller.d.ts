import { ActivityService } from './activity.service';
import { ActivityFilterDto } from './dto/activity.dto';
export declare class ActivityController {
    private readonly activityService;
    constructor(activityService: ActivityService);
    findAll(filters: ActivityFilterDto): Promise<{
        data: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            userAgent: string | null;
            description: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            action: string;
            entityType: string;
            entityId: string;
            ipAddress: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findByCompany(companyId: string, filters: ActivityFilterDto): Promise<{
        data: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            userAgent: string | null;
            description: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            action: string;
            entityType: string;
            entityId: string;
            ipAddress: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getRecentActivity(limit?: number): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    })[]>;
    getStats(startDate?: string, endDate?: string): Promise<{
        total: number;
        byAction: Record<string, number>;
        byEntityType: Record<string, number>;
        topUsers: {
            userId: string;
            count: number;
        }[];
    }>;
    getMyActivity(user: any, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }[]>;
    getByEntity(entityType: string, entityId: string): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    })[]>;
    getByUser(userId: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }[]>;
    cleanup(retentionDays?: number): Promise<{
        deleted: number;
    }>;
}
//# sourceMappingURL=activity.controller.d.ts.map