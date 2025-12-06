export declare enum CandidateStatus {
    NEW = "new",
    SCREENING = "screening",
    INTERVIEW = "interview",
    OFFER = "offer",
    HIRED = "hired",
    REJECTED = "rejected"
}
export declare enum JobStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    PAUSED = "paused",
    CLOSED = "closed"
}
export declare enum JobType {
    FULL_TIME = "full-time",
    PART_TIME = "part-time",
    CONTRACT = "contract",
    INTERNSHIP = "internship"
}
export declare enum PerformanceRating {
    EXCEPTIONAL = 5,
    EXCEEDS = 4,
    MEETS = 3,
    NEEDS_IMPROVEMENT = 2,
    UNSATISFACTORY = 1
}
export declare class CreateCandidateDto {
    name: string;
    email: string;
    phone?: string;
    position: string;
    skills?: string[];
    experienceYears?: number;
    education?: string;
    linkedinUrl?: string;
    cvUrl?: string;
    notes?: string;
    jobId: string;
}
export declare class UpdateCandidateDto {
    name?: string;
    email?: string;
    phone?: string;
    status?: CandidateStatus;
    skills?: string[];
    matchScore?: number;
    notes?: string;
    interviewFeedback?: string;
}
export declare class CandidateResponseDto {
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    skills: string[];
    experienceYears: number;
    education: string;
    status: CandidateStatus;
    matchScore: number;
    appliedAt: Date;
    linkedinUrl: string;
    cvUrl: string;
    notes: string;
}
export declare class SalaryRangeDto {
    min: number;
    max: number;
    currency?: string;
}
export declare class CreateJobDto {
    title: string;
    department: string;
    location: string;
    type: JobType;
    salary: SalaryRangeDto;
    description: string;
    requirements?: string[];
    benefits?: string[];
    status?: JobStatus;
}
export declare class UpdateJobDto {
    title?: string;
    department?: string;
    location?: string;
    type?: JobType;
    salary?: SalaryRangeDto;
    description?: string;
    requirements?: string[];
    benefits?: string[];
    status?: JobStatus;
}
export declare class CreateEmployeeDto {
    name: string;
    email: string;
    department: string;
    position: string;
    hireDate: string;
    salary?: number;
    managerId?: string;
}
export declare class UpdateEmployeeDto {
    name?: string;
    department?: string;
    position?: string;
    salary?: number;
    managerId?: string;
    wellnessScore?: number;
}
export declare class GoalDto {
    title: string;
    description?: string;
    progress: number;
    dueDate?: string;
}
export declare class CreatePerformanceReviewDto {
    employeeId: string;
    reviewerId: string;
    rating: PerformanceRating;
    feedback?: string;
    goals?: GoalDto[];
    period: string;
}
export declare class WellnessSurveyDto {
    workLifeBalance: number;
    jobSatisfaction: number;
    stressLevel: number;
    teamCollaboration: number;
    feedback?: string;
}
export declare class WellnessResponseDto {
    employeeId: string;
    overallScore: number;
    workLifeBalance: number;
    jobSatisfaction: number;
    stressLevel: number;
    teamCollaboration: number;
    lastSurveyDate: Date;
    trend: 'improving' | 'stable' | 'declining';
}
export declare class ATSMatchRequestDto {
    jobId: string;
    minScore?: number;
    biasFree?: boolean;
}
export declare class ATSMatchResultDto {
    candidateId: string;
    candidateName: string;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    recommendation: string;
    biasAuditPassed: boolean;
}
export declare class HRAnalyticsDto {
    totalEmployees: number;
    openPositions: number;
    totalCandidates: number;
    averageTimeToHire: number;
    averageMatchScore: number;
    averageWellnessScore: number;
    averagePerformanceScore: number;
    turnoverRate: number;
    candidatesByStatus: Record<CandidateStatus, number>;
    employeesByDepartment: Record<string, number>;
}
//# sourceMappingURL=hr.dto.d.ts.map