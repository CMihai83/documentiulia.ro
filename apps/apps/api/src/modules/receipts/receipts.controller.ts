import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
  UploadedFile, UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto, UpdateReceiptOcrDto, LinkReceiptToExpenseDto } from './dto/create-receipt.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OcrStatus } from '@prisma/client';

// Multer file interface for file uploads
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a receipt image' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Receipt uploaded' })
  async upload(
    @Param('companyId') companyId: string,
    @UploadedFile() file: MulterFile,
    @CurrentUser() user: any,
  ) {
    // TODO: Upload file to S3 and get actual URL
    const dto: CreateReceiptDto = {
      fileName: file.originalname,
      fileUrl: `/receipts/${companyId}/${Date.now()}-${file.originalname}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    };

    return this.receiptsService.create(companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all receipts' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'status', required: false, enum: OcrStatus })
  @ApiQuery({ name: 'hasExpense', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Receipts returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query('status') status?: OcrStatus,
    @Query('hasExpense') hasExpense?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.receiptsService.findAll(companyId, user.id, {
      status,
      hasExpense: hasExpense !== undefined ? hasExpense === 'true' : undefined,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('unprocessed')
  @ApiOperation({ summary: 'Get receipts pending OCR processing' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Unprocessed receipts returned' })
  async getUnprocessed(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.getUnprocessedReceipts(companyId, user.id);
  }

  @Get('needs-review')
  @ApiOperation({ summary: 'Get processed receipts needing review' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Receipts needing review returned' })
  async getNeedsReview(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.getReceiptsNeedingReview(companyId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get receipt by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 200, description: 'Receipt returned' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.findOne(companyId, id, user.id);
  }

  @Put(':id/ocr')
  @ApiOperation({ summary: 'Update OCR data for receipt' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 200, description: 'OCR data updated' })
  async updateOcr(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReceiptOcrDto,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.updateOcrData(companyId, id, dto, user.id);
  }

  @Post(':id/link-expense')
  @ApiOperation({ summary: 'Link receipt to existing expense' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 200, description: 'Receipt linked to expense' })
  async linkToExpense(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: LinkReceiptToExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.linkToExpense(companyId, id, dto.expenseId, user.id);
  }

  @Delete(':id/link-expense')
  @ApiOperation({ summary: 'Unlink receipt from expense' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 200, description: 'Receipt unlinked' })
  async unlinkFromExpense(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.unlinkFromExpense(companyId, id, user.id);
  }

  @Post(':id/create-expense')
  @ApiOperation({ summary: 'Create expense from OCR data' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 201, description: 'Expense created from receipt' })
  async createExpenseFromReceipt(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.createExpenseFromReceipt(companyId, id, user.id);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Queue receipt for OCR reprocessing' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 200, description: 'Receipt queued for reprocessing' })
  async reprocess(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.markForOcr(companyId, id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete receipt' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 204, description: 'Receipt deleted' })
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptsService.delete(companyId, id, user.id);
  }
}
