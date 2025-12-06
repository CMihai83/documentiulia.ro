import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateActivityLogDto, ActivityFilterDto } from './dto/activity.dto';
import { Prisma } from '@prisma/client';
export declare class ActivityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(userId: string, dto: CreateActivityLogDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }>;
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
            metadata: Prisma.JsonValue | null;
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
        metadata: Prisma.JsonValue | null;
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
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }[]>;
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
            metadata: Prisma.JsonValue | null;
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
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    })[]>;
    getStats(startDate?: Date, endDate?: Date): Promise<{
        total: number;
        byAction: Record<string, number>;
        byEntityType: Record<string, number>;
        topUsers: {
            userId: string;
            count: number;
        }[];
    }>;
    logCreate(userId: string, entityType: string, entityId: string, metadata?: Record<string, any>): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }>;
    logUpdate(userId: string, entityType: string, entityId: string, metadata?: Record<string, any>): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }>;
    logDelete(userId: string, entityType: string, entityId: string, metadata?: Record<string, any>): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }>;
    logView(userId: string, entityType: string, entityId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }>;
    logExport(userId: string, entityType: string, entityId: string, format: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }>;
    logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        description: string | null;
        metadata: Prisma.JsonValue | null;
        action: string;
        entityType: string;
        entityId: string;
        ipAddress: string | null;
    }>;
    cleanup(retentionDays?: number): Promise<{
        deleted: number;
    }>;
}
//# sourceMappingURL=activity.service.d.ts.map