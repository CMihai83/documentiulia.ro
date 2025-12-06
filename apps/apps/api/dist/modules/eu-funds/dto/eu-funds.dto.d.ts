export declare enum FundSource {
    PNRR = "pnrr",
    COHESION = "cohesion",
    INVESTEU = "investeu",
    HORIZON = "horizon",
    DIGITAL = "digital"
}
export declare enum ProgramStatus {
    OPEN = "open",
    UPCOMING = "upcoming",
    CLOSED = "closed"
}
export declare enum ApplicationStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    CONTRACTED = "contracted"
}
export declare enum CompanySize {
    MICRO = "micro",
    SMALL = "small",
    MEDIUM = "medium",
    LARGE = "large"
}
export declare enum Sector {
    RETAIL = "retail",
    SERVICES = "services",
    MANUFACTURING = "manufacturing",
    IT = "it",
    TOURISM = "tourism",
    CONSTRUCTION = "construction",
    TRANSPORT = "transport",
    AGRICULTURE = "agriculture",
    ENERGY = "energy",
    HEALTH = "health"
}
export declare class CompanyProfileDto {
    name: string;
    cui: string;
    sector: Sector;
    employees: number;
    revenue: number;
    founded: number;
    location: string;
    certifications?: string[];
    hasAnafCertificate?: boolean;
    hasTaxDebts?: boolean;
    profitableLast2Years?: boolean;
}
export declare class FundingProgramDto {
    id: string;
    name: string;
    source: FundSource;
    totalBudget: number;
    availableBudget: number;
    deadline: string;
    minFunding: number;
    maxFunding: number;
    cofinancing: number;
    eligibility: string[];
    sectors: string[];
    description: string;
    status: ProgramStatus;
    successRate: number;
    documentsRequired: string[];
}
export declare class EligibilityCheckDto {
    companyProfile: CompanyProfileDto;
    fundSource?: FundSource;
    requestedAmount?: number;
}
export declare class EligibilityResultDto {
    programId: string;
    programName: string;
    score: number;
    matchedCriteria: string[];
    missingCriteria: string[];
    estimatedFunding: number;
    recommendation: string;
    documentsRequired: string[];
    daysUntilDeadline: number;
}
export declare class CreateApplicationDto {
    programId: string;
    companyProfile: CompanyProfileDto;
    requestedAmount: number;
    projectDescription: string;
    projectObjectives?: string[];
    newJobsCreated?: number;
    cofinancingAmount?: number;
}
export declare class UpdateApplicationDto {
    status?: ApplicationStatus;
    requestedAmount?: number;
    projectDescription?: string;
    projectObjectives?: string[];
    newJobsCreated?: number;
    reviewNotes?: string;
}
export declare class ApplicationResponseDto {
    id: string;
    programId: string;
    programName: string;
    status: ApplicationStatus;
    requestedAmount: number;
    projectDescription: string;
    eligibilityScore: number;
    submittedAt: Date;
    lastUpdated: Date;
    currentMilestone: string;
    nextAction: string;
}
export declare class MilestoneDto {
    id: string;
    name: string;
    date: string;
    status: 'completed' | 'current' | 'upcoming';
    description?: string;
}
export declare class UpdateMilestoneDto {
    status: 'completed' | 'current' | 'upcoming';
    notes?: string;
}
export declare class FundsAnalyticsDto {
    totalAvailableFunding: number;
    openPrograms: number;
    applicationsSubmitted: number;
    totalFundingRequested: number;
    totalFundingApproved: number;
    averageSuccessRate: number;
    applicationsByStatus: Record<ApplicationStatus, number>;
    fundingBySource: Record<FundSource, number>;
    upcomingDeadlines: {
        programName: string;
        deadline: string;
        daysLeft: number;
    }[];
}
export declare class InvestEUVoucherDto {
    type: string;
    amount: number;
    purpose: string;
    supportingDocuments?: string[];
}
//# sourceMappingURL=eu-funds.dto.d.ts.map