import { Controller, Get, Post, Put, Body, Param, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiProduces } from '@nestjs/swagger';
import { EfacturaService } from './efactura.service';
import { UpdateEfacturaConfigDto, UpdateInvoiceEfacturaDto } from './dto/efactura.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('E-Factura')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/efactura')
export class EfacturaController {
  constructor(private readonly efacturaService: EfacturaService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get e-Factura configuration' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Configuration returned' })
  async getConfig(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.getConfig(companyId, user.id);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update e-Factura configuration' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateEfacturaConfigDto,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.updateConfig(companyId, dto, user.id);
  }

  @Get('invoices/:invoiceId/xml')
  @ApiOperation({ summary: 'Generate UBL XML for invoice' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiProduces('application/xml')
  @ApiResponse({ status: 200, description: 'XML returned' })
  async generateXml(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const xml = await this.efacturaService.generateXml(companyId, invoiceId, user.id);
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="efactura-${invoiceId}.xml"`);
    res.send(xml);
  }

  @Get('invoices/:invoiceId/validate')
  @ApiOperation({ summary: 'Validate invoice for e-Factura' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Validation result returned' })
  async validate(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.validateForEfactura(companyId, invoiceId, user.id);
  }

  @Post('invoices/:invoiceId/send')
  @ApiOperation({ summary: 'Send invoice to ANAF' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice sent to ANAF' })
  async sendToAnaf(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.sendToAnaf(companyId, invoiceId, user.id);
  }

  @Get('invoices/:invoiceId/status')
  @ApiOperation({ summary: 'Check ANAF status for invoice' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Status returned' })
  async checkStatus(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.checkAnafStatus(companyId, invoiceId, user.id);
  }

  @Put('invoices/:invoiceId/status')
  @ApiOperation({ summary: 'Update e-Factura status (webhook/polling)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateInvoiceEfacturaDto,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.updateInvoiceEfacturaStatus(companyId, invoiceId, dto, user.id);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get e-Factura status summary' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Status summary returned' })
  async getStatusSummary(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.getStatusSummary(companyId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get e-Factura submission history' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Submission history returned' })
  async getHistory(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.getHistory(companyId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get invoices pending ANAF processing' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Pending invoices returned' })
  async getPending(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.getPendingEfactura(companyId, user.id);
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get invoices rejected by ANAF' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Failed invoices returned' })
  async getFailed(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.efacturaService.getFailedEfactura(companyId, user.id);
  }
}
