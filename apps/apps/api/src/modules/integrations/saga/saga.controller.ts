import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
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
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SagaIntegrationService, SagaInvoice } from './saga.service';
import { ClerkAuthGuard } from '../../auth/guards/clerk.guard';
import { IsString, IsOptional, IsDateString, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// DTOs
class SagaInvoiceItemDto {
  @IsString()
  denumire!: string;

  @IsNumber()
  cantitate!: number;

  @IsNumber()
  pret_unitar!: number;

  @IsNumber()
  valoare!: number;

  @IsNumber()
  cota_tva!: number;

  @IsString()
  unitate_masura!: string;

  @IsOptional()
  @IsString()
  cod_produs?: string;
}

class CreateSagaInvoiceDto {
  @IsString()
  numar_factura!: string;

  @IsDateString()
  data_factura!: string;

  @IsString()
  denumire_client!: string;

  @IsString()
  cui_client!: string;

  @IsOptional()
  @IsString()
  adresa_client?: string;

  @IsNumber()
  valoare_fara_tva!: number;

  @IsNumber()
  valoare_tva!: number;

  @IsNumber()
  valoare_totala!: number;

  @IsNumber()
  cota_tva!: number;

  @IsString()
  moneda!: string;

  @IsString()
  serie_factura!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SagaInvoiceItemDto)
  items!: SagaInvoiceItemDto[];
}

class OAuthCallbackDto {
  @IsString()
  code!: string;

  @IsString()
  state!: string;
}

@ApiTags('SAGA Integration')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/integrations/saga')
export class SagaController {
  constructor(private readonly sagaService: SagaIntegrationService) {}

  // ==================== OAUTH ====================

  @Get('auth/url')
  @ApiOperation({ summary: 'Get SAGA OAuth authorization URL' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'redirectUri', description: 'OAuth redirect URI' })
  @ApiResponse({ status: 200, description: 'Authorization URL returned' })
  getAuthUrl(
    @Param('companyId') companyId: string,
    @Query('redirectUri') redirectUri: string,
  ) {
    const url = this.sagaService.getAuthorizationUrl(companyId, redirectUri);
    return { authorizationUrl: url };
  }

  @Post('auth/callback')
  @ApiOperation({ summary: 'Handle SAGA OAuth callback' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Tokens exchanged and stored' })
  async handleCallback(
    @Param('companyId') companyId: string,
    @Body() dto: OAuthCallbackDto,
    @Query('redirectUri') redirectUri: string,
  ) {
    const tokens = await this.sagaService.exchangeCodeForTokens(dto.code, redirectUri);
    await this.sagaService.saveCredentials(companyId, tokens);
    return { success: true, message: 'Integrarea SAGA a fost configurată cu succes' };
  }

  // ==================== STATUS ====================

  @Get('status')
  @ApiOperation({ summary: 'Get SAGA integration status' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Integration status returned' })
  async getStatus(@Param('companyId') companyId: string) {
    return this.sagaService.getIntegrationStatus(companyId);
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect SAGA integration' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Integration disconnected' })
  async disconnect(@Param('companyId') companyId: string) {
    await this.sagaService.disconnect(companyId);
    return { success: true, message: 'Integrarea SAGA a fost dezactivată' };
  }

  // ==================== COMPANY INFO ====================

  @Get('company-info')
  @ApiOperation({ summary: 'Get company info from SAGA' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company info returned' })
  async getCompanyInfo(@Param('companyId') companyId: string) {
    return this.sagaService.getCompanyInfo(companyId);
  }

  // ==================== INVOICES ====================

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices from SAGA' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Invoices returned' })
  async listInvoices(
    @Param('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sagaService.listInvoices(companyId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice from SAGA' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'SAGA Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice returned' })
  async getInvoice(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.sagaService.getInvoice(companyId, invoiceId);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice in SAGA' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async createInvoice(
    @Param('companyId') companyId: string,
    @Body() dto: CreateSagaInvoiceDto,
  ) {
    return this.sagaService.createInvoice(companyId, dto as SagaInvoice);
  }

  @Get('invoices/:invoiceId/print')
  @ApiOperation({ summary: 'Print/download invoice PDF from SAGA' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'SAGA Invoice ID' })
  @ApiResponse({ status: 200, description: 'PDF returned' })
  async printInvoice(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.sagaService.printInvoice(companyId, invoiceId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${invoiceId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Delete('invoices/:invoiceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete invoice from SAGA' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'SAGA Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  async deleteInvoice(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    await this.sagaService.deleteInvoice(companyId, invoiceId);
    return { success: true, message: 'Factura a fost ștearsă din SAGA' };
  }

  // ==================== PARTNERS ====================

  @Get('partners')
  @ApiOperation({ summary: 'List partners from SAGA' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Partners returned' })
  async listPartners(@Param('companyId') companyId: string) {
    return this.sagaService.listPartners(companyId);
  }

  // ==================== SYNC ====================

  @Post('sync')
  @ApiOperation({ summary: 'Sync data from SAGA' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'lastSyncDate', required: false, description: 'Last sync date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  async sync(
    @Param('companyId') companyId: string,
    @Query('lastSyncDate') lastSyncDate?: string,
  ) {
    return this.sagaService.syncInvoices(
      companyId,
      lastSyncDate ? new Date(lastSyncDate) : undefined,
    );
  }
}
