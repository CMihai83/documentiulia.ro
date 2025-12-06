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
exports.HRAnalyticsDto = exports.ATSMatchResultDto = exports.ATSMatchRequestDto = exports.WellnessResponseDto = exports.WellnessSurveyDto = exports.CreatePerformanceReviewDto = exports.GoalDto = exports.UpdateEmployeeDto = exports.CreateEmployeeDto = exports.UpdateJobDto = exports.CreateJobDto = exports.SalaryRangeDto = exports.CandidateResponseDto = exports.UpdateCandidateDto = exports.CreateCandidateDto = exports.PerformanceRating = exports.JobType = exports.JobStatus = exports.CandidateStatus = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var CandidateStatus;
(function (CandidateStatus) {
    CandidateStatus["NEW"] = "new";
    CandidateStatus["SCREENING"] = "screening";
    CandidateStatus["INTERVIEW"] = "interview";
    CandidateStatus["OFFER"] = "offer";
    CandidateStatus["HIRED"] = "hired";
    CandidateStatus["REJECTED"] = "rejected";
})(CandidateStatus || (exports.CandidateStatus = CandidateStatus = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["DRAFT"] = "draft";
    JobStatus["ACTIVE"] = "active";
    JobStatus["PAUSED"] = "paused";
    JobStatus["CLOSED"] = "closed";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var JobType;
(function (JobType) {
    JobType["FULL_TIME"] = "full-time";
    JobType["PART_TIME"] = "part-time";
    JobType["CONTRACT"] = "contract";
    JobType["INTERNSHIP"] = "internship";
})(JobType || (exports.JobType = JobType = {}));
var PerformanceRating;
(function (PerformanceRating) {
    PerformanceRating[PerformanceRating["EXCEPTIONAL"] = 5] = "EXCEPTIONAL";
    PerformanceRating[PerformanceRating["EXCEEDS"] = 4] = "EXCEEDS";
    PerformanceRating[PerformanceRating["MEETS"] = 3] = "MEETS";
    PerformanceRating[PerformanceRating["NEEDS_IMPROVEMENT"] = 2] = "NEEDS_IMPROVEMENT";
    PerformanceRating[PerformanceRating["UNSATISFACTORY"] = 1] = "UNSATISFACTORY";
})(PerformanceRating || (exports.PerformanceRating = PerformanceRating = {}));
class CreateCandidateDto {
    name;
    email;
    phone;
    position;
    skills;
    experienceYears;
    education;
    linkedinUrl;
    cvUrl;
    notes;
    jobId;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, email: { required: true, type: () => String }, phone: { required: false, type: () => String }, position: { required: true, type: () => String }, skills: { required: false, type: () => [String] }, experienceYears: { required: false, type: () => Number, minimum: 0 }, education: { required: false, type: () => String }, linkedinUrl: { required: false, type: () => String }, cvUrl: { required: false, type: () => String }, notes: { required: false, type: () => String }, jobId: { required: true, type: () => String } };
    }
}
exports.CreateCandidateDto = CreateCandidateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Maria Popescu' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'maria.popescu@email.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+40 722 123 456' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Senior Accountant' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "position", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['SAF-T', 'e-Factura', 'Excel'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateCandidateDto.prototype, "skills", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCandidateDto.prototype, "experienceYears", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Master Contabilitate, ASE Bucuresti' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "education", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://linkedin.com/in/maria-popescu' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "linkedinUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "cvUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'job-uuid-123' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCandidateDto.prototype, "jobId", void 0);
class UpdateCandidateDto {
    name;
    email;
    phone;
    status;
    skills;
    matchScore;
    notes;
    interviewFeedback;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, email: { required: false, type: () => String }, phone: { required: false, type: () => String }, status: { required: false, enum: require("./hr.dto").CandidateStatus }, skills: { required: false, type: () => [String] }, matchScore: { required: false, type: () => Number }, notes: { required: false, type: () => String }, interviewFeedback: { required: false, type: () => String } };
    }
}
exports.UpdateCandidateDto = UpdateCandidateDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCandidateDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateCandidateDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCandidateDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: CandidateStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CandidateStatus),
    __metadata("design:type", String)
], UpdateCandidateDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateCandidateDto.prototype, "skills", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateCandidateDto.prototype, "matchScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCandidateDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCandidateDto.prototype, "interviewFeedback", void 0);
class CandidateResponseDto {
    id;
    name;
    email;
    phone;
    position;
    skills;
    experienceYears;
    education;
    status;
    matchScore;
    appliedAt;
    linkedinUrl;
    cvUrl;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, name: { required: true, type: () => String }, email: { required: true, type: () => String }, phone: { required: true, type: () => String }, position: { required: true, type: () => String }, skills: { required: true, type: () => [String] }, experienceYears: { required: true, type: () => Number }, education: { required: true, type: () => String }, status: { required: true, enum: require("./hr.dto").CandidateStatus }, matchScore: { required: true, type: () => Number }, appliedAt: { required: true, type: () => Date }, linkedinUrl: { required: true, type: () => String }, cvUrl: { required: true, type: () => String }, notes: { required: true, type: () => String } };
    }
}
exports.CandidateResponseDto = CandidateResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "position", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], CandidateResponseDto.prototype, "skills", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CandidateResponseDto.prototype, "experienceYears", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "education", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: CandidateStatus }),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'AI-calculated match score (0-100)' }),
    __metadata("design:type", Number)
], CandidateResponseDto.prototype, "matchScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], CandidateResponseDto.prototype, "appliedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "linkedinUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "cvUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CandidateResponseDto.prototype, "notes", void 0);
class SalaryRangeDto {
    min;
    max;
    currency;
    static _OPENAPI_METADATA_FACTORY() {
        return { min: { required: true, type: () => Number, minimum: 0 }, max: { required: true, type: () => Number, minimum: 0 }, currency: { required: false, type: () => String } };
    }
}
exports.SalaryRangeDto = SalaryRangeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SalaryRangeDto.prototype, "min", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SalaryRangeDto.prototype, "max", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'RON', default: 'RON' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SalaryRangeDto.prototype, "currency", void 0);
class CreateJobDto {
    title;
    department;
    location;
    type;
    salary;
    description;
    requirements;
    benefits;
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: true, type: () => String }, department: { required: true, type: () => String }, location: { required: true, type: () => String }, type: { required: true, enum: require("./hr.dto").JobType }, salary: { required: true, type: () => require("./hr.dto").SalaryRangeDto }, description: { required: true, type: () => String }, requirements: { required: false, type: () => [String] }, benefits: { required: false, type: () => [String] }, status: { required: false, enum: require("./hr.dto").JobStatus } };
    }
}
exports.CreateJobDto = CreateJobDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Senior Accountant - SAF-T Specialist' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateJobDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Contabilitate' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateJobDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bucuresti / Remote' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateJobDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: JobType }),
    (0, class_validator_1.IsEnum)(JobType),
    __metadata("design:type", String)
], CreateJobDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: SalaryRangeDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SalaryRangeDto),
    __metadata("design:type", SalaryRangeDto)
], CreateJobDto.prototype, "salary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Cautam un contabil senior cu experienta in SAF-T D406...' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateJobDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['5+ ani experienta', 'Certificare CECCAR'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateJobDto.prototype, "requirements", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['Remote hybrid', 'Training platit'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateJobDto.prototype, "benefits", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: JobStatus, default: JobStatus.DRAFT }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(JobStatus),
    __metadata("design:type", String)
], CreateJobDto.prototype, "status", void 0);
class UpdateJobDto {
    title;
    department;
    location;
    type;
    salary;
    description;
    requirements;
    benefits;
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: false, type: () => String }, department: { required: false, type: () => String }, location: { required: false, type: () => String }, type: { required: false, enum: require("./hr.dto").JobType }, salary: { required: false, type: () => require("./hr.dto").SalaryRangeDto }, description: { required: false, type: () => String }, requirements: { required: false, type: () => [String] }, benefits: { required: false, type: () => [String] }, status: { required: false, enum: require("./hr.dto").JobStatus } };
    }
}
exports.UpdateJobDto = UpdateJobDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: JobType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(JobType),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: SalaryRangeDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SalaryRangeDto),
    __metadata("design:type", SalaryRangeDto)
], UpdateJobDto.prototype, "salary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateJobDto.prototype, "requirements", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateJobDto.prototype, "benefits", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: JobStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(JobStatus),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "status", void 0);
class CreateEmployeeDto {
    name;
    email;
    department;
    position;
    hireDate;
    salary;
    managerId;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, email: { required: true, type: () => String }, department: { required: true, type: () => String }, position: { required: true, type: () => String }, hireDate: { required: true, type: () => String }, salary: { required: false, type: () => Number }, managerId: { required: false, type: () => String } };
    }
}
exports.CreateEmployeeDto = CreateEmployeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ana Georgescu' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ana.georgescu@company.ro' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Contabilitate' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Senior Accountant' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "position", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2022-03-15' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "hireDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 8000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEmployeeDto.prototype, "salary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "managerId", void 0);
class UpdateEmployeeDto {
    name;
    department;
    position;
    salary;
    managerId;
    wellnessScore;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, department: { required: false, type: () => String }, position: { required: false, type: () => String }, salary: { required: false, type: () => Number }, managerId: { required: false, type: () => String }, wellnessScore: { required: false, type: () => Number, minimum: 0, maximum: 100 } };
    }
}
exports.UpdateEmployeeDto = UpdateEmployeeDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEmployeeDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEmployeeDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEmployeeDto.prototype, "position", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateEmployeeDto.prototype, "salary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEmployeeDto.prototype, "managerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateEmployeeDto.prototype, "wellnessScore", void 0);
class GoalDto {
    title;
    description;
    progress;
    dueDate;
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: true, type: () => String }, description: { required: false, type: () => String }, progress: { required: true, type: () => Number, minimum: 0, maximum: 100 }, dueDate: { required: false, type: () => String } };
    }
}
exports.GoalDto = GoalDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SAF-T D406 Certification' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoalDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoalDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 75 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GoalDto.prototype, "progress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GoalDto.prototype, "dueDate", void 0);
class CreatePerformanceReviewDto {
    employeeId;
    reviewerId;
    rating;
    feedback;
    goals;
    period;
    static _OPENAPI_METADATA_FACTORY() {
        return { employeeId: { required: true, type: () => String }, reviewerId: { required: true, type: () => String }, rating: { required: true, enum: require("./hr.dto").PerformanceRating }, feedback: { required: false, type: () => String }, goals: { required: false, type: () => [require("./hr.dto").GoalDto] }, period: { required: true, type: () => String } };
    }
}
exports.CreatePerformanceReviewDto = CreatePerformanceReviewDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "reviewerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PerformanceRating }),
    (0, class_validator_1.IsEnum)(PerformanceRating),
    __metadata("design:type", Number)
], CreatePerformanceReviewDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "feedback", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [GoalDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GoalDto),
    __metadata("design:type", Array)
], CreatePerformanceReviewDto.prototype, "goals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Q4 2025' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "period", void 0);
class WellnessSurveyDto {
    workLifeBalance;
    jobSatisfaction;
    stressLevel;
    teamCollaboration;
    feedback;
    static _OPENAPI_METADATA_FACTORY() {
        return { workLifeBalance: { required: true, type: () => Number, minimum: 1, maximum: 5 }, jobSatisfaction: { required: true, type: () => Number, minimum: 1, maximum: 5 }, stressLevel: { required: true, type: () => Number, minimum: 1, maximum: 5 }, teamCollaboration: { required: true, type: () => Number, minimum: 1, maximum: 5 }, feedback: { required: false, type: () => String } };
    }
}
exports.WellnessSurveyDto = WellnessSurveyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], WellnessSurveyDto.prototype, "workLifeBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], WellnessSurveyDto.prototype, "jobSatisfaction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], WellnessSurveyDto.prototype, "stressLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], WellnessSurveyDto.prototype, "teamCollaboration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WellnessSurveyDto.prototype, "feedback", void 0);
class WellnessResponseDto {
    employeeId;
    overallScore;
    workLifeBalance;
    jobSatisfaction;
    stressLevel;
    teamCollaboration;
    lastSurveyDate;
    trend;
    static _OPENAPI_METADATA_FACTORY() {
        return { employeeId: { required: true, type: () => String }, overallScore: { required: true, type: () => Number }, workLifeBalance: { required: true, type: () => Number }, jobSatisfaction: { required: true, type: () => Number }, stressLevel: { required: true, type: () => Number }, teamCollaboration: { required: true, type: () => Number }, lastSurveyDate: { required: true, type: () => Date }, trend: { required: true, type: () => Object } };
    }
}
exports.WellnessResponseDto = WellnessResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WellnessResponseDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WellnessResponseDto.prototype, "overallScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WellnessResponseDto.prototype, "workLifeBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WellnessResponseDto.prototype, "jobSatisfaction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WellnessResponseDto.prototype, "stressLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WellnessResponseDto.prototype, "teamCollaboration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], WellnessResponseDto.prototype, "lastSurveyDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WellnessResponseDto.prototype, "trend", void 0);
class ATSMatchRequestDto {
    jobId;
    minScore;
    biasFree;
    static _OPENAPI_METADATA_FACTORY() {
        return { jobId: { required: true, type: () => String }, minScore: { required: false, type: () => Number, minimum: 0, maximum: 100 }, biasFree: { required: false, type: () => Boolean } };
    }
}
exports.ATSMatchRequestDto = ATSMatchRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ATSMatchRequestDto.prototype, "jobId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 80, description: 'Minimum match score threshold' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ATSMatchRequestDto.prototype, "minScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Enable bias-free matching' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ATSMatchRequestDto.prototype, "biasFree", void 0);
class ATSMatchResultDto {
    candidateId;
    candidateName;
    matchScore;
    matchedSkills;
    missingSkills;
    recommendation;
    biasAuditPassed;
    static _OPENAPI_METADATA_FACTORY() {
        return { candidateId: { required: true, type: () => String }, candidateName: { required: true, type: () => String }, matchScore: { required: true, type: () => Number }, matchedSkills: { required: true, type: () => [String] }, missingSkills: { required: true, type: () => [String] }, recommendation: { required: true, type: () => String }, biasAuditPassed: { required: true, type: () => Boolean } };
    }
}
exports.ATSMatchResultDto = ATSMatchResultDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ATSMatchResultDto.prototype, "candidateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ATSMatchResultDto.prototype, "candidateName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'AI-calculated match score (0-100)' }),
    __metadata("design:type", Number)
], ATSMatchResultDto.prototype, "matchScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Matched skills from job requirements' }),
    __metadata("design:type", Array)
], ATSMatchResultDto.prototype, "matchedSkills", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Missing skills from job requirements' }),
    __metadata("design:type", Array)
], ATSMatchResultDto.prototype, "missingSkills", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'AI-generated recommendation' }),
    __metadata("design:type", String)
], ATSMatchResultDto.prototype, "recommendation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Bias audit passed' }),
    __metadata("design:type", Boolean)
], ATSMatchResultDto.prototype, "biasAuditPassed", void 0);
class HRAnalyticsDto {
    totalEmployees;
    openPositions;
    totalCandidates;
    averageTimeToHire;
    averageMatchScore;
    averageWellnessScore;
    averagePerformanceScore;
    turnoverRate;
    candidatesByStatus;
    employeesByDepartment;
    static _OPENAPI_METADATA_FACTORY() {
        return { totalEmployees: { required: true, type: () => Number }, openPositions: { required: true, type: () => Number }, totalCandidates: { required: true, type: () => Number }, averageTimeToHire: { required: true, type: () => Number }, averageMatchScore: { required: true, type: () => Number }, averageWellnessScore: { required: true, type: () => Number }, averagePerformanceScore: { required: true, type: () => Number }, turnoverRate: { required: true, type: () => Number }, candidatesByStatus: { required: true, type: () => Object }, employeesByDepartment: { required: true, type: () => Object } };
    }
}
exports.HRAnalyticsDto = HRAnalyticsDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HRAnalyticsDto.prototype, "totalEmployees", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HRAnalyticsDto.prototype, "openPositions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HRAnalyticsDto.prototype, "totalCandidates", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HRAnalyticsDto.prototype, "averageTimeToHire", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HRAnalyticsDto.prototype, "averageMatchScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HRAnalyticsDto.prototype, "averageWellnessScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HRAnalyticsDto.prototype, "averagePerformanceScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HRAnalyticsDto.prototype, "turnoverRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Object, description: 'Candidates per status' }),
    __metadata("design:type", Object)
], HRAnalyticsDto.prototype, "candidatesByStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Object, description: 'Employees per department' }),
    __metadata("design:type", Object)
], HRAnalyticsDto.prototype, "employeesByDepartment", void 0);
//# sourceMappingURL=hr.dto.js.map