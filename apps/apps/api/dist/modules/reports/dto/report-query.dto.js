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
exports.CashFlowQueryDto = exports.ReportQueryDto = exports.ReportPeriod = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
var ReportPeriod;
(function (ReportPeriod) {
    ReportPeriod["DAILY"] = "daily";
    ReportPeriod["WEEKLY"] = "weekly";
    ReportPeriod["MONTHLY"] = "monthly";
    ReportPeriod["QUARTERLY"] = "quarterly";
    ReportPeriod["YEARLY"] = "yearly";
})(ReportPeriod || (exports.ReportPeriod = ReportPeriod = {}));
class ReportQueryDto {
    startDate;
    endDate;
    year;
    month;
    period;
    static _OPENAPI_METADATA_FACTORY() {
        return { startDate: { required: false, type: () => String }, endDate: { required: false, type: () => String }, year: { required: false, type: () => Number }, month: { required: false, type: () => Number, minimum: 1, maximum: 12 }, period: { required: false, enum: require("./report-query.dto").ReportPeriod } };
    }
}
exports.ReportQueryDto = ReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Start date', example: '2024-01-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'End date', example: '2024-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Year for yearly reports', example: 2024 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ReportQueryDto.prototype, "year", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Month for monthly reports (1-12)', example: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], ReportQueryDto.prototype, "month", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Report period grouping', enum: ReportPeriod }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ReportPeriod),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "period", void 0);
class CashFlowQueryDto extends ReportQueryDto {
    includeProjections;
    static _OPENAPI_METADATA_FACTORY() {
        return { includeProjections: { required: false, type: () => Boolean } };
    }
}
exports.CashFlowQueryDto = CashFlowQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Include projections', default: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CashFlowQueryDto.prototype, "includeProjections", void 0);
//# sourceMappingURL=report-query.dto.js.map