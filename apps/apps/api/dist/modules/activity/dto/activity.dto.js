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
exports.ActivityFilterDto = exports.CreateActivityLogDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateActivityLogDto {
    action;
    entityType;
    entityId;
    metadata;
    ipAddress;
    userAgent;
    static _OPENAPI_METADATA_FACTORY() {
        return { action: { required: true, type: () => String }, entityType: { required: true, type: () => String }, entityId: { required: true, type: () => String }, metadata: { required: false, type: () => Object }, ipAddress: { required: false, type: () => String }, userAgent: { required: false, type: () => String } };
    }
}
exports.CreateActivityLogDto = CreateActivityLogDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Action performed (create, update, delete, view)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityLogDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Entity type (invoice, expense, client, etc.)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityLogDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Entity ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityLogDto.prototype, "entityId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional metadata as JSON' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateActivityLogDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'IP address' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityLogDto.prototype, "ipAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User agent' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateActivityLogDto.prototype, "userAgent", void 0);
class ActivityFilterDto {
    userId;
    action;
    entityType;
    entityId;
    startDate;
    endDate;
    page;
    limit;
    static _OPENAPI_METADATA_FACTORY() {
        return { userId: { required: false, type: () => String }, action: { required: false, type: () => String }, entityType: { required: false, type: () => String }, entityId: { required: false, type: () => String }, startDate: { required: false, type: () => String }, endDate: { required: false, type: () => String }, page: { required: false, type: () => Number }, limit: { required: false, type: () => Number } };
    }
}
exports.ActivityFilterDto = ActivityFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivityFilterDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Action type' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivityFilterDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Entity type' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivityFilterDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Entity ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivityFilterDto.prototype, "entityId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Start date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ActivityFilterDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'End date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ActivityFilterDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ActivityFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Items per page', default: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ActivityFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=activity.dto.js.map