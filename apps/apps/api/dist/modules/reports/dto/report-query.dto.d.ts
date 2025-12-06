export declare enum ReportPeriod {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly"
}
export declare class ReportQueryDto {
    startDate?: string;
    endDate?: string;
    year?: number;
    month?: number;
    period?: ReportPeriod;
}
export declare class CashFlowQueryDto extends ReportQueryDto {
    includeProjections?: boolean;
}
//# sourceMappingURL=report-query.dto.d.ts.map