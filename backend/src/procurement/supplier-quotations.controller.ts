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
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  SupplierQuotationsService,
  RequestForQuotation,
  SupplierQuotation,
  CreateRFQDto,
  CreateQuotationDto,
  UpdateQuotationDto,
  ScoreQuotationDto,
  QuotationComparison,
  RFQStatus,
} from './supplier-quotations.service';

// RFQ Controller
@ApiTags('Request for Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement/rfq')
export class RFQController {
  constructor(private readonly quotationsService: SupplierQuotationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Request for Quotation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'RFQ created successfully',
  })
  async createRFQ(
    @Request() req: any,
    @Body() dto: CreateRFQDto,
  ): Promise<RequestForQuotation> {
    return this.quotationsService.createRFQ(req.user.tenantId, {
      ...dto,
      createdBy: req.user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all RFQs' })
  @ApiQuery({ name: 'status', enum: RFQStatus, required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of RFQs',
  })
  async listRFQs(
    @Request() req: any,
    @Query('status') status?: RFQStatus,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<RequestForQuotation[]> {
    return this.quotationsService.listRFQs(req.user.tenantId, {
      status,
      supplierId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get RFQ details' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'RFQ not found',
  })
  async getRFQ(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<RequestForQuotation> {
    return this.quotationsService.getRFQ(req.user.tenantId, id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish RFQ to invited suppliers' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ published successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot publish RFQ',
  })
  async publishRFQ(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<RequestForQuotation> {
    return this.quotationsService.publishRFQ(req.user.tenantId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close RFQ for quotation submissions' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ closed successfully',
  })
  async closeRFQ(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<RequestForQuotation> {
    return this.quotationsService.closeRFQ(req.user.tenantId, id);
  }

  @Post(':id/award')
  @ApiOperation({ summary: 'Award RFQ to a supplier' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ awarded successfully',
  })
  async awardRFQ(
    @Request() req: any,
    @Param('id') id: string,
    @Body('supplierId') supplierId: string,
  ): Promise<RequestForQuotation> {
    return this.quotationsService.awardRFQ(req.user.tenantId, id, supplierId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an RFQ' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ cancelled successfully',
  })
  async cancelRFQ(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<RequestForQuotation> {
    return this.quotationsService.cancelRFQ(req.user.tenantId, id, reason);
  }

  @Get(':id/quotations')
  @ApiOperation({ summary: 'Get all quotations for an RFQ' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of quotations',
  })
  async getRFQQuotations(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SupplierQuotation[]> {
    return this.quotationsService.getQuotationsByRFQ(req.user.tenantId, id);
  }

  @Get(':id/compare')
  @ApiOperation({ summary: 'Compare quotations for an RFQ' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation comparison',
  })
  async compareQuotations(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QuotationComparison> {
    return this.quotationsService.compareQuotations(req.user.tenantId, id);
  }
}

// Quotations Controller
@ApiTags('Supplier Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement/quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: SupplierQuotationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quotation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quotation created successfully',
  })
  async createQuotation(
    @Request() req: any,
    @Body() dto: CreateQuotationDto,
  ): Promise<SupplierQuotation> {
    return this.quotationsService.createQuotation(req.user.tenantId, dto);
  }

  @Get('by-supplier/:supplierId')
  @ApiOperation({ summary: 'Get quotations by supplier' })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of supplier quotations',
  })
  async getQuotationsBySupplier(
    @Request() req: any,
    @Param('supplierId') supplierId: string,
  ): Promise<SupplierQuotation[]> {
    return this.quotationsService.getQuotationsBySupplier(
      req.user.tenantId,
      supplierId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation details' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quotation not found',
  })
  async getQuotation(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SupplierQuotation> {
    return this.quotationsService.getQuotation(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation updated successfully',
  })
  async updateQuotation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ): Promise<SupplierQuotation> {
    return this.quotationsService.updateQuotation(req.user.tenantId, id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit quotation for review' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation submitted successfully',
  })
  async submitQuotation(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SupplierQuotation> {
    return this.quotationsService.submitQuotation(req.user.tenantId, id);
  }

  @Post(':id/score')
  @ApiOperation({ summary: 'Score a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation scored successfully',
  })
  async scoreQuotation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ScoreQuotationDto,
  ): Promise<SupplierQuotation> {
    return this.quotationsService.scoreQuotation(
      req.user.tenantId,
      id,
      dto,
      req.user.id,
    );
  }

  @Post(':id/shortlist')
  @ApiOperation({ summary: 'Shortlist a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation shortlisted successfully',
  })
  async shortlistQuotation(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SupplierQuotation> {
    return this.quotationsService.shortlistQuotation(req.user.tenantId, id);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation withdrawn successfully',
  })
  async withdrawQuotation(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<SupplierQuotation> {
    return this.quotationsService.withdrawQuotation(req.user.tenantId, id, reason);
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get quotation analytics' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation analytics',
  })
  async getQuotationAnalytics(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<{
    totalRFQs: number;
    totalQuotations: number;
    averageQuotationsPerRFQ: number;
    averageResponseRate: number;
    totalValue: number;
    averageLeadTime: number;
  }> {
    return this.quotationsService.getQuotationAnalytics(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}
