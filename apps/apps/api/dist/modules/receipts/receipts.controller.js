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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const receipts_service_1 = require("./receipts.service");
const create_receipt_dto_1 = require("./dto/create-receipt.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let ReceiptsController = class ReceiptsController {
    receiptsService;
    constructor(receiptsService) {
        this.receiptsService = receiptsService;
    }
    async upload(companyId, file, user) {
        const dto = {
            fileName: file.originalname,
            fileUrl: `/receipts/${companyId}/${Date.now()}-${file.originalname}`,
            fileSize: file.size,
            mimeType: file.mimetype,
        };
        return this.receiptsService.create(companyId, dto, user.id);
    }
    async findAll(companyId, user, status, hasExpense, startDate, endDate, page, limit) {
        return this.receiptsService.findAll(companyId, user.id, {
            status,
            hasExpense: hasExpense !== undefined ? hasExpense === 'true' : undefined,
            startDate,
            endDate,
            page,
            limit,
        });
    }
    async getUnprocessed(companyId, user) {
        return this.receiptsService.getUnprocessedReceipts(companyId, user.id);
    }
    async getNeedsReview(companyId, user) {
        return this.receiptsService.getReceiptsNeedingReview(companyId, user.id);
    }
    async findOne(companyId, id, user) {
        return this.receiptsService.findOne(companyId, id, user.id);
    }
    async updateOcr(companyId, id, dto, user) {
        return this.receiptsService.updateOcrData(companyId, id, dto, user.id);
    }
    async linkToExpense(companyId, id, dto, user) {
        return this.receiptsService.linkToExpense(companyId, id, dto.expenseId, user.id);
    }
    async unlinkFromExpense(companyId, id, user) {
        return this.receiptsService.unlinkFromExpense(companyId, id, user.id);
    }
    async createExpenseFromReceipt(companyId, id, user) {
        return this.receiptsService.createExpenseFromReceipt(companyId, id, user.id);
    }
    async reprocess(companyId, id, user) {
        return this.receiptsService.markForOcr(companyId, id, user.id);
    }
    async delete(companyId, id, user) {
        return this.receiptsService.delete(companyId, id, user.id);
    }
};
exports.ReceiptsController = ReceiptsController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a receipt image' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Receipt uploaded' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all receipts' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.OcrStatus }),
    (0, swagger_1.ApiQuery)({ name: 'hasExpense', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipts returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('hasExpense')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('unprocessed'),
    (0, swagger_1.ApiOperation)({ summary: 'Get receipts pending OCR processing' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Unprocessed receipts returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "getUnprocessed", null);
__decorate([
    (0, common_1.Get)('needs-review'),
    (0, swagger_1.ApiOperation)({ summary: 'Get processed receipts needing review' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipts needing review returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "getNeedsReview", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get receipt by ID' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Receipt ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipt returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Receipt not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/ocr'),
    (0, swagger_1.ApiOperation)({ summary: 'Update OCR data for receipt' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Receipt ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OCR data updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_receipt_dto_1.UpdateReceiptOcrDto, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "updateOcr", null);
__decorate([
    (0, common_1.Post)(':id/link-expense'),
    (0, swagger_1.ApiOperation)({ summary: 'Link receipt to existing expense' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Receipt ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipt linked to expense' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_receipt_dto_1.LinkReceiptToExpenseDto, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "linkToExpense", null);
__decorate([
    (0, common_1.Delete)(':id/link-expense'),
    (0, swagger_1.ApiOperation)({ summary: 'Unlink receipt from expense' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Receipt ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipt unlinked' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "unlinkFromExpense", null);
__decorate([
    (0, common_1.Post)(':id/create-expense'),
    (0, swagger_1.ApiOperation)({ summary: 'Create expense from OCR data' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Receipt ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Expense created from receipt' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "createExpenseFromReceipt", null);
__decorate([
    (0, common_1.Post)(':id/reprocess'),
    (0, swagger_1.ApiOperation)({ summary: 'Queue receipt for OCR reprocessing' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Receipt ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipt queued for reprocessing' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "reprocess", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete receipt' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Receipt ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Receipt deleted' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "delete", null);
exports.ReceiptsController = ReceiptsController = __decorate([
    (0, swagger_1.ApiTags)('Receipts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies/:companyId/receipts'),
    __metadata("design:paramtypes", [receipts_service_1.ReceiptsService])
], ReceiptsController);
//# sourceMappingURL=receipts.controller.js.map