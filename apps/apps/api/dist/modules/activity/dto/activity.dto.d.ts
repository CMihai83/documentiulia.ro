export declare class CreateActivityLogDto {
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
export declare class ActivityFilterDto {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
//# sourceMappingURL=activity.dto.d.ts.map