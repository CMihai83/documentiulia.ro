import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFilterDto } from './dto/document.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document record' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Document created' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Documents returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query() filters: DocumentFilterDto,
  ) {
    return this.documentsService.findAll(companyId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Document stats returned' })
  async getStats(@Param('companyId') companyId: string) {
    return this.documentsService.getStats(companyId);
  }

  @Get('invoice/:invoiceId')
  @ApiOperation({ summary: 'Get documents by invoice' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice documents returned' })
  async getByInvoice(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.documentsService.getByInvoice(companyId, invoiceId);
  }

  @Get('expense/:expenseId')
  @ApiOperation({ summary: 'Get documents by expense' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'expenseId', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense documents returned' })
  async getByExpense(
    @Param('companyId') companyId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.documentsService.getByExpense(companyId, expenseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document returned' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.findOne(companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a document' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.delete(companyId, id);
  }

  @Post(':id/link-invoice/:invoiceId')
  @ApiOperation({ summary: 'Link document to invoice' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Document linked to invoice' })
  async linkToInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.documentsService.linkToInvoice(companyId, id, invoiceId);
  }

  @Post(':id/link-expense/:expenseId')
  @ApiOperation({ summary: 'Link document to expense' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiParam({ name: 'expenseId', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Document linked to expense' })
  async linkToExpense(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.documentsService.linkToExpense(companyId, id, expenseId);
  }

  @Delete(':id/unlink-invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlink document from invoice' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document unlinked from invoice' })
  async unlinkFromInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.unlinkFromInvoice(companyId, id);
  }

  @Delete(':id/unlink-expense')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlink document from expense' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document unlinked from expense' })
  async unlinkFromExpense(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.unlinkFromExpense(companyId, id);
  }
}
