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
exports.DocumentsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const documents_service_1 = require("./documents.service");
const document_dto_1 = require("./dto/document.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
let DocumentsController = class DocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    async create(companyId, dto) {
        return this.documentsService.create(companyId, dto);
    }
    async findAll(companyId, filters) {
        return this.documentsService.findAll(companyId, filters);
    }
    async getStats(companyId) {
        return this.documentsService.getStats(companyId);
    }
    async getByInvoice(companyId, invoiceId) {
        return this.documentsService.getByInvoice(companyId, invoiceId);
    }
    async getByExpense(companyId, expenseId) {
        return this.documentsService.getByExpense(companyId, expenseId);
    }
    async findOne(companyId, id) {
        return this.documentsService.findOne(companyId, id);
    }
    async update(companyId, id, dto) {
        return this.documentsService.update(companyId, id, dto);
    }
    async delete(companyId, id) {
        return this.documentsService.delete(companyId, id);
    }
    async linkToInvoice(companyId, id, invoiceId) {
        return this.documentsService.linkToInvoice(companyId, id, invoiceId);
    }
    async linkToExpense(companyId, id, expenseId) {
        return this.documentsService.linkToExpense(companyId, id, expenseId);
    }
    async unlinkFromInvoice(companyId, id) {
        return this.documentsService.unlinkFromInvoice(companyId, id);
    }
    async unlinkFromExpense(companyId, id) {
        return this.documentsService.unlinkFromExpense(companyId, id);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new document record' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Document created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, document_dto_1.CreateDocumentDto]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all documents' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Documents returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, document_dto_1.DocumentFilterDto]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get document statistics' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document stats returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('invoice/:invoiceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get documents by invoice' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invoice documents returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getByInvoice", null);
__decorate([
    (0, common_1.Get)('expense/:expenseId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get documents by expense' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'expenseId', description: 'Expense ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Expense documents returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('expenseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getByExpense", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a document by ID' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a document' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, document_dto_1.UpdateDocumentDto]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a document' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document deleted' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/link-invoice/:invoiceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Link document to invoice' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document linked to invoice' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "linkToInvoice", null);
__decorate([
    (0, common_1.Post)(':id/link-expense/:expenseId'),
    (0, swagger_1.ApiOperation)({ summary: 'Link document to expense' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document ID' }),
    (0, swagger_1.ApiParam)({ name: 'expenseId', description: 'Expense ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document linked to expense' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('expenseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "linkToExpense", null);
__decorate([
    (0, common_1.Delete)(':id/unlink-invoice'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Unlink document from invoice' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document unlinked from invoice' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "unlinkFromInvoice", null);
__decorate([
    (0, common_1.Delete)(':id/unlink-expense'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Unlink document from expense' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document unlinked from expense' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "unlinkFromExpense", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('Documents'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies/:companyId/documents'),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map