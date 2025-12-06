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
exports.NotificationCountDto = exports.NotificationFilterDto = exports.CreateNotificationDto = exports.NotificationType = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var NotificationType;
(function (NotificationType) {
    NotificationType["INVOICE_SENT"] = "invoice_sent";
    NotificationType["INVOICE_PAID"] = "invoice_paid";
    NotificationType["INVOICE_OVERDUE"] = "invoice_overdue";
    NotificationType["PAYMENT_RECEIVED"] = "payment_received";
    NotificationType["EXPENSE_APPROVED"] = "expense_approved";
    NotificationType["RECEIPT_PROCESSED"] = "receipt_processed";
    NotificationType["EFACTURA_STATUS"] = "efactura_status";
    NotificationType["SYSTEM_ALERT"] = "system_alert";
    NotificationType["REMINDER"] = "reminder";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
class CreateNotificationDto {
    type;
    title;
    message;
    link;
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: true, type: () => String }, title: { required: true, type: () => String }, message: { required: true, type: () => String }, link: { required: false, type: () => String } };
    }
}
exports.CreateNotificationDto = CreateNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: NotificationType }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notification title' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notification message' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Link to related resource' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "link", void 0);
class NotificationFilterDto {
    isRead;
    type;
    page;
    limit;
    static _OPENAPI_METADATA_FACTORY() {
        return { isRead: { required: false, type: () => Boolean }, type: { required: false, type: () => String }, page: { required: false, type: () => Number }, limit: { required: false, type: () => Number } };
    }
}
exports.NotificationFilterDto = NotificationFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by read status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationFilterDto.prototype, "isRead", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by type' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationFilterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], NotificationFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Items per page', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], NotificationFilterDto.prototype, "limit", void 0);
class NotificationCountDto {
    unreadCount;
    totalCount;
    static _OPENAPI_METADATA_FACTORY() {
        return { unreadCount: { required: true, type: () => Number }, totalCount: { required: true, type: () => Number } };
    }
}
exports.NotificationCountDto = NotificationCountDto;
//# sourceMappingURL=notification.dto.js.map