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
exports.UpdateMemberRoleDto = exports.AddMemberDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class AddMemberDto {
    email;
    role;
    static _OPENAPI_METADATA_FACTORY() {
        return { email: { required: true, type: () => String }, role: { required: true, type: () => Object } };
    }
}
exports.AddMemberDto = AddMemberDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Member email address', example: 'member@company.ro' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], AddMemberDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member role',
        enum: client_1.CompanyRole,
        example: client_1.CompanyRole.ACCOUNTANT
    }),
    (0, class_validator_1.IsEnum)(client_1.CompanyRole),
    __metadata("design:type", String)
], AddMemberDto.prototype, "role", void 0);
class UpdateMemberRoleDto {
    role;
    static _OPENAPI_METADATA_FACTORY() {
        return { role: { required: true, type: () => Object } };
    }
}
exports.UpdateMemberRoleDto = UpdateMemberRoleDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'New role for member',
        enum: client_1.CompanyRole,
        example: client_1.CompanyRole.ADMIN
    }),
    (0, class_validator_1.IsEnum)(client_1.CompanyRole),
    __metadata("design:type", String)
], UpdateMemberRoleDto.prototype, "role", void 0);
//# sourceMappingURL=add-member.dto.js.map