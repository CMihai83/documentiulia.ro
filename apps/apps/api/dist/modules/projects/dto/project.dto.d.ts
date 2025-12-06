export declare enum ProjectStatus {
    PLANNING = "PLANNING",
    IN_PROGRESS = "IN_PROGRESS",
    ON_HOLD = "ON_HOLD",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class CreateProjectDto {
    name: string;
    description?: string;
    code?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    currency?: string;
    status?: ProjectStatus;
}
export declare class UpdateProjectDto {
    name?: string;
    description?: string;
    code?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    currency?: string;
    status?: ProjectStatus;
}
export declare class ProjectFilterDto {
    status?: ProjectStatus;
    clientId?: string;
    search?: string;
    page?: number;
    limit?: number;
}
//# sourceMappingURL=project.dto.d.ts.map