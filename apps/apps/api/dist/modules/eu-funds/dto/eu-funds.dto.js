"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestEUVoucherDto = exports.FundsAnalyticsDto = exports.UpdateMilestoneDto = exports.MilestoneDto = exports.ApplicationResponseDto = exports.UpdateApplicationDto = exports.CreateApplicationDto = exports.EligibilityResultDto = exports.EligibilityCheckDto = exports.FundingProgramDto = exports.CompanyProfileDto = exports.Sector = exports.CompanySize = exports.ApplicationStatus = exports.ProgramStatus = exports.FundSource = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var FundSource;
(function (FundSource) {
    FundSource["PNRR"] = "pnrr";
    FundSource["COHESION"] = "cohesion";
    FundSource["INVESTEU"] = "investeu";
    FundSource["HORIZON"] = "horizon";
    FundSource["DIGITAL"] = "digital";
})(FundSource || (exports.FundSource = FundSource = {}));
var ProgramStatus;
(function (ProgramStatus) {
    ProgramStatus["OPEN"] = "open";
    ProgramStatus["UPCOMING"] = "upcoming";
    ProgramStatus["CLOSED"] = "closed";
})(ProgramStatus || (exports.ProgramStatus = ProgramStatus = {}));
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["DRAFT"] = "draft";
    ApplicationStatus["SUBMITTED"] = "submitted";
    ApplicationStatus["UNDER_REVIEW"] = "under_review";
    ApplicationStatus["APPROVED"] = "approved";
    ApplicationStatus["REJECTED"] = "rejected";
    ApplicationStatus["CONTRACTED"] = "contracted";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
var CompanySize;
(function (CompanySize) {
    CompanySize["MICRO"] = "micro";
    CompanySize["SMALL"] = "small";
    CompanySize["MEDIUM"] = "medium";
    CompanySize["LARGE"] = "large";
})(CompanySize || (exports.CompanySize = CompanySize = {}));
var Sector;
(function (Sector) {
    Sector["RETAIL"] = "retail";
    Sector["SERVICES"] = "services";
    Sector["MANUFACTURING"] = "manufacturing";
    Sector["IT"] = "it";
    Sector["TOURISM"] = "tourism";
    Sector["CONSTRUCTION"] = "construction";
    Sector["TRANSPORT"] = "transport";
    Sector["AGRICULTURE"] = "agriculture";
    Sector["ENERGY"] = "energy";
    Sector["HEALTH"] = "health";
})(Sector || (exports.Sector = Sector = {}));
class CompanyProfileDto {
    name;
    cui;
    sector;
    employees;
    revenue;
    founded;
    location;
    certifications;
    hasAnafCertificate;
    hasTaxDebts;
    profitableLast2Years;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, cui: { required: true, type: () => String }, sector: { required: true, enum: require("./eu-funds.dto").Sector }, employees: { required: true, type: () => Number, minimum: 1 }, revenue: { required: true, type: () => Number, minimum: 0 }, founded: { required: true, type: () => Number, minimum: 1990, maximum: 2025 }, location: { required: true, type: () => String }, certifications: { required: false, type: () => [String] }, hasAnafCertificate: { required: false, type: () => Boolean }, hasTaxDebts: { required: false, type: () => Boolean }, profitableLast2Years: { required: false, type: () => Boolean } };
    }
}
exports.CompanyProfileDto = CompanyProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SC Exemplu SRL' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyProfileDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'RO12345678' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyProfileDto.prototype, "cui", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: Sector }),
    (0, class_validator_1.IsEnum)(Sector),
    __metadata("design:type", String)
], CompanyProfileDto.prototype, "sector", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 15 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CompanyProfileDto.prototype, "employees", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500000, description: 'Annual revenue in EUR' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CompanyProfileDto.prototype, "revenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2018 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1990),
    (0, class_validator_1.Max)(2025),
    __metadata("design:type", Number)
], CompanyProfileDto.prototype, "founded", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bucuresti' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyProfileDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['ISO 9001', 'GDPR Compliant'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CompanyProfileDto.prototype, "certifications", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CompanyProfileDto.prototype, "hasAnafCertificate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CompanyProfileDto.prototype, "hasTaxDebts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CompanyProfileDto.prototype, "profitableLast2Years", void 0);
class FundingProgramDto {
    id;
    name;
    source;
    totalBudget;
    availableBudget;
    deadline;
    minFunding;
    maxFunding;
    cofinancing;
    eligibility;
    sectors;
    description;
    status;
    successRate;
    documentsRequired;
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, name: { required: true, type: () => String }, source: { required: true, enum: require("./eu-funds.dto").FundSource }, totalBudget: { required: true, type: () => Number }, availableBudget: { required: true, type: () => Number }, deadline: { required: true, type: () => String }, minFunding: { required: true, type: () => Number }, maxFunding: { required: true, type: () => Number }, cofinancing: { required: true, type: () => Number }, eligibility: { required: true, type: () => [String] }, sectors: { required: true, type: () => [String] }, description: { required: true, type: () => String }, status: { required: true, enum: require("./eu-funds.dto").ProgramStatus }, successRate: { required: true, type: () => Number }, documentsRequired: { required: true, type: () => [String] } };
    }
}
exports.FundingProgramDto = FundingProgramDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FundingProgramDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PNRR - Digitalizare IMM' }),
    __metadata("design:type", String)
], FundingProgramDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: FundSource }),
    __metadata("design:type", String)
], FundingProgramDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500000000 }),
    __metadata("design:type", Number)
], FundingProgramDto.prototype, "totalBudget", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 320000000 }),
    __metadata("design:type", Number)
], FundingProgramDto.prototype, "availableBudget", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-06-30' }),
    __metadata("design:type", String)
], FundingProgramDto.prototype, "deadline", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 25000 }),
    __metadata("design:type", Number)
], FundingProgramDto.prototype, "minFunding", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100000 }),
    __metadata("design:type", Number)
], FundingProgramDto.prototype, "maxFunding", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: 'Co-financing percentage required' }),
    __metadata("design:type", Number)
], FundingProgramDto.prototype, "cofinancing", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['IMM', 'Minim 2 ani activitate'] }),
    __metadata("design:type", Array)
], FundingProgramDto.prototype, "eligibility", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['Retail', 'Servicii', 'IT'] }),
    __metadata("design:type", Array)
], FundingProgramDto.prototype, "sectors", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FundingProgramDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ProgramStatus }),
    __metadata("design:type", String)
], FundingProgramDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 68 }),
    __metadata("design:type", Number)
], FundingProgramDto.prototype, "successRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['CUI', 'Bilant', 'Plan de afaceri'] }),
    __metadata("design:type", Array)
], FundingProgramDto.prototype, "documentsRequired", void 0);
class EligibilityCheckDto {
    companyProfile;
    fundSource;
    requestedAmount;
    static _OPENAPI_METADATA_FACTORY() {
        return { companyProfile: { required: true, type: () => require("./eu-funds.dto").CompanyProfileDto }, fundSource: { required: false, enum: require("./eu-funds.dto").FundSource }, requestedAmount: { required: false, type: () => Number } };
    }
}
exports.EligibilityCheckDto = EligibilityCheckDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: CompanyProfileDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CompanyProfileDto),
    __metadata("design:type", CompanyProfileDto)
], EligibilityCheckDto.prototype, "companyProfile", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: FundSource }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(FundSource),
    __metadata("design:type", String)
], EligibilityCheckDto.prototype, "fundSource", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 50000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], EligibilityCheckDto.prototype, "requestedAmount", void 0);
class EligibilityResultDto {
    programId;
    programName;
    score;
    matchedCriteria;
    missingCriteria;
    estimatedFunding;
    recommendation;
    documentsRequired;
    daysUntilDeadline;
    static _OPENAPI_METADATA_FACTORY() {
        return { programId: { required: true, type: () => String }, programName: { required: true, type: () => String }, score: { required: true, type: () => Number }, matchedCriteria: { required: true, type: () => [String] }, missingCriteria: { required: true, type: () => [String] }, estimatedFunding: { required: true, type: () => Number }, recommendation: { required: true, type: () => String }, documentsRequired: { required: true, type: () => [String] }, daysUntilDeadline: { required: true, type: () => Number } };
    }
}
exports.EligibilityResultDto = EligibilityResultDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], EligibilityResultDto.prototype, "programId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], EligibilityResultDto.prototype, "programName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'AI-calculated eligibility score (0-100)' }),
    __metadata("design:type", Number)
], EligibilityResultDto.prototype, "score", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Matched eligibility criteria' }),
    __metadata("design:type", Array)
], EligibilityResultDto.prototype, "matchedCriteria", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Missing eligibility criteria' }),
    __metadata("design:type", Array)
], EligibilityResultDto.prototype, "missingCriteria", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Estimated funding amount' }),
    __metadata("design:type", Number)
], EligibilityResultDto.prototype, "estimatedFunding", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'AI-generated recommendation' }),
    __metadata("design:type", String)
], EligibilityResultDto.prototype, "recommendation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Required documents for this program' }),
    __metadata("design:type", Array)
], EligibilityResultDto.prototype, "documentsRequired", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Days until deadline' }),
    __metadata("design:type", Number)
], EligibilityResultDto.prototype, "daysUntilDeadline", void 0);
class CreateApplicationDto {
    programId;
    companyProfile;
    requestedAmount;
    projectDescription;
    projectObjectives;
    newJobsCreated;
    cofinancingAmount;
    static _OPENAPI_METADATA_FACTORY() {
        return { programId: { required: true, type: () => String }, companyProfile: { required: true, type: () => require("./eu-funds.dto").CompanyProfileDto }, requestedAmount: { required: true, type: () => Number, minimum: 1000 }, projectDescription: { required: true, type: () => String }, projectObjectives: { required: false, type: () => [String] }, newJobsCreated: { required: false, type: () => Number }, cofinancingAmount: { required: false, type: () => Number } };
    }
}
exports.CreateApplicationDto = CreateApplicationDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateApplicationDto.prototype, "programId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: CompanyProfileDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CompanyProfileDto),
    __metadata("design:type", CompanyProfileDto)
], CreateApplicationDto.prototype, "companyProfile", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1000),
    __metadata("design:type", Number)
], CreateApplicationDto.prototype, "requestedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Implementare sistem ERP pentru digitalizare procese' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateApplicationDto.prototype, "projectDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['ERP', 'CRM', 'e-Commerce'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateApplicationDto.prototype, "projectObjectives", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateApplicationDto.prototype, "newJobsCreated", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateApplicationDto.prototype, "cofinancingAmount", void 0);
class UpdateApplicationDto {
    status;
    requestedAmount;
    projectDescription;
    projectObjectives;
    newJobsCreated;
    reviewNotes;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: false, enum: require("./eu-funds.dto").ApplicationStatus }, requestedAmount: { required: false, type: () => Number }, projectDescription: { required: false, type: () => String }, projectObjectives: { required: false, type: () => [String] }, newJobsCreated: { required: false, type: () => Number }, reviewNotes: { required: false, type: () => String } };
    }
}
exports.UpdateApplicationDto = UpdateApplicationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ApplicationStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ApplicationStatus),
    __metadata("design:type", String)
], UpdateApplicationDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateApplicationDto.prototype, "requestedAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateApplicationDto.prototype, "projectDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateApplicationDto.prototype, "projectObjectives", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateApplicationDto.prototype, "newJobsCreated", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateApplicationDto.prototype, "reviewNotes", void 0);
class ApplicationResponseDto {
    id;
    programId;
    programName;
    status;
    requestedAmount;
    projectDescription;
    eligibilityScore;
    submittedAt;
    lastUpdated;
    currentMilestone;
    nextAction;
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, programId: { required: true, type: () => String }, programName: { required: true, type: () => String }, status: { required: true, enum: require("./eu-funds.dto").ApplicationStatus }, requestedAmount: { required: true, type: () => Number }, projectDescription: { required: true, type: () => String }, eligibilityScore: { required: true, type: () => Number }, submittedAt: { required: true, type: () => Date }, lastUpdated: { required: true, type: () => Date }, currentMilestone: { required: true, type: () => String }, nextAction: { required: true, type: () => String } };
    }
}
exports.ApplicationResponseDto = ApplicationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApplicationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApplicationResponseDto.prototype, "programId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApplicationResponseDto.prototype, "programName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ApplicationStatus }),
    __metadata("design:type", String)
], ApplicationResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ApplicationResponseDto.prototype, "requestedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApplicationResponseDto.prototype, "projectDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ApplicationResponseDto.prototype, "eligibilityScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ApplicationResponseDto.prototype, "submittedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ApplicationResponseDto.prototype, "lastUpdated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current milestone in the process' }),
    __metadata("design:type", String)
], ApplicationResponseDto.prototype, "currentMilestone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Next action required' }),
    __metadata("design:type", String)
], ApplicationResponseDto.prototype, "nextAction", void 0);
class MilestoneDto {
    id;
    name;
    date;
    status;
    description;
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, name: { required: true, type: () => String }, date: { required: true, type: () => String }, status: { required: true, type: () => Object }, description: { required: false, type: () => String } };
    }
}
exports.MilestoneDto = MilestoneDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MilestoneDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Depunere dosare' }),
    __metadata("design:type", String)
], MilestoneDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-06-30' }),
    __metadata("design:type", String)
], MilestoneDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['completed', 'current', 'upcoming'] }),
    __metadata("design:type", String)
], MilestoneDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], MilestoneDto.prototype, "description", void 0);
class UpdateMilestoneDto {
    status;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: true, type: () => Object }, notes: { required: false, type: () => String } };
    }
}
exports.UpdateMilestoneDto = UpdateMilestoneDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['completed', 'current', 'upcoming'] }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "notes", void 0);
class FundsAnalyticsDto {
    totalAvailableFunding;
    openPrograms;
    applicationsSubmitted;
    totalFundingRequested;
    totalFundingApproved;
    averageSuccessRate;
    applicationsByStatus;
    fundingBySource;
    upcomingDeadlines;
    static _OPENAPI_METADATA_FACTORY() {
        return { totalAvailableFunding: { required: true, type: () => Number }, openPrograms: { required: true, type: () => Number }, applicationsSubmitted: { required: true, type: () => Number }, totalFundingRequested: { required: true, type: () => Number }, totalFundingApproved: { required: true, type: () => Number }, averageSuccessRate: { required: true, type: () => Number }, applicationsByStatus: { required: true, type: () => Object }, fundingBySource: { required: true, type: () => Object }, upcomingDeadlines: { required: true } };
    }
}
exports.FundsAnalyticsDto = FundsAnalyticsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total available funding across all programs' }),
    __metadata("design:type", Number)
], FundsAnalyticsDto.prototype, "totalAvailableFunding", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of open programs' }),
    __metadata("design:type", Number)
], FundsAnalyticsDto.prototype, "openPrograms", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of applications submitted' }),
    __metadata("design:type", Number)
], FundsAnalyticsDto.prototype, "applicationsSubmitted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total funding requested' }),
    __metadata("design:type", Number)
], FundsAnalyticsDto.prototype, "totalFundingRequested", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total funding approved' }),
    __metadata("design:type", Number)
], FundsAnalyticsDto.prototype, "totalFundingApproved", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Average success rate' }),
    __metadata("design:type", Number)
], FundsAnalyticsDto.prototype, "averageSuccessRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Object, description: 'Applications by status' }),
    __metadata("design:type", Object)
], FundsAnalyticsDto.prototype, "applicationsByStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Object, description: 'Funding by source' }),
    __metadata("design:type", Object)
], FundsAnalyticsDto.prototype, "fundingBySource", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Upcoming deadlines' }),
    __metadata("design:type", Array)
], FundsAnalyticsDto.prototype, "upcomingDeadlines", void 0);
class InvestEUVoucherDto {
    type;
    amount;
    purpose;
    supportingDocuments;
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: true, type: () => String }, amount: { required: true, type: () => Number, minimum: 1000, maximum: 50000 }, purpose: { required: true, type: () => String }, supportingDocuments: { required: false, type: () => [String] } };
    }
}
exports.InvestEUVoucherDto = InvestEUVoucherDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Voucher Digitalizare' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InvestEUVoucherDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1000),
    (0, class_validator_1.Max)(50000),
    __metadata("design:type", Number)
], InvestEUVoucherDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Achizitie software ERP' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InvestEUVoucherDto.prototype, "purpose", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['Oferta furnizor', 'Specificatii tehnice'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], InvestEUVoucherDto.prototype, "supportingDocuments", void 0);
//# sourceMappingURL=eu-funds.dto.js.map