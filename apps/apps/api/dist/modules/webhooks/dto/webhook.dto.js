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
exports.UpdateWebhookDto = exports.CreateWebhookDto = exports.WebhookEvent = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var WebhookEvent;
(function (WebhookEvent) {
    WebhookEvent["INVOICE_CREATED"] = "invoice.created";
    WebhookEvent["INVOICE_UPDATED"] = "invoice.updated";
    WebhookEvent["INVOICE_SENT"] = "invoice.sent";
    WebhookEvent["INVOICE_PAID"] = "invoice.paid";
    WebhookEvent["INVOICE_OVERDUE"] = "invoice.overdue";
    WebhookEvent["INVOICE_CANCELLED"] = "invoice.cancelled";
    WebhookEvent["EFACTURA_SUBMITTED"] = "efactura.submitted";
    WebhookEvent["EFACTURA_VALIDATED"] = "efactura.validated";
    WebhookEvent["EFACTURA_REJECTED"] = "efactura.rejected";
    WebhookEvent["EXPENSE_CREATED"] = "expense.created";
    WebhookEvent["EXPENSE_APPROVED"] = "expense.approved";
    WebhookEvent["RECEIPT_UPLOADED"] = "receipt.uploaded";
    WebhookEvent["RECEIPT_PROCESSED"] = "receipt.processed";
    WebhookEvent["CLIENT_CREATED"] = "client.created";
    WebhookEvent["CLIENT_UPDATED"] = "client.updated";
    WebhookEvent["PAYMENT_RECEIVED"] = "payment.received";
    WebhookEvent["FISCAL_DEADLINE"] = "fiscal.deadline";
    WebhookEvent["FISCAL_LAW_CHANGE"] = "fiscal.law_change";
    WebhookEvent["ANOMALY_DETECTED"] = "anomaly.detected";
})(WebhookEvent || (exports.WebhookEvent = WebhookEvent = {}));
class CreateWebhookDto {
    name;
    url;
    events;
    secret;
    isActive;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, url: { required: true, type: () => String }, events: { required: true, enum: require("./webhook.dto").WebhookEvent, isArray: true }, secret: { required: false, type: () => String }, isActive: { required: false, type: () => Boolean } };
    }
}
exports.CreateWebhookDto = CreateWebhookDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Webhook name', example: 'Invoice Notifications' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWebhookDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Webhook URL (Zapier, Make, custom)', example: 'https://hooks.zapier.com/...' }),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateWebhookDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Events to subscribe to', enum: WebhookEvent, isArray: true }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(WebhookEvent, { each: true }),
    __metadata("design:type", Array)
], CreateWebhookDto.prototype, "events", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Secret for signature verification' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWebhookDto.prototype, "secret", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Enable webhook', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateWebhookDto.prototype, "isActive", void 0);
class UpdateWebhookDto {
    name;
    url;
    events;
    isActive;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, url: { required: false, type: () => String }, events: { required: false, enum: require("./webhook.dto").WebhookEvent, isArray: true }, isActive: { required: false, type: () => Boolean } };
    }
}
exports.UpdateWebhookDto = UpdateWebhookDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Webhook name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateWebhookDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Webhook URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], UpdateWebhookDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Events to subscribe to', enum: WebhookEvent, isArray: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(WebhookEvent, { each: true }),
    __metadata("design:type", Array)
], UpdateWebhookDto.prototype, "events", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Enable/disable webhook' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateWebhookDto.prototype, "isActive", void 0);
//# sourceMappingURL=webhook.dto.js.map