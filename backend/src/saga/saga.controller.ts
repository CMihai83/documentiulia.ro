import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { SagaService } from './saga.service';
import { SagaXmlService } from './saga-xml.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  SyncInvoiceDto,
  SagaPayrollDto,
  SagaInventoryDto,
  SagaConnectionStatusDto,
  ValidateSaftDto,
} from './dto/saga.dto';

@ApiTags('saga')
@ApiBearerAuth()
@Controller('saga')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
export class SagaController {
  constructor(
    private readonly sagaService: SagaService,
    private readonly sagaXmlService: SagaXmlService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get SAGA connection status' })
  @ApiResponse({ status: 200, description: 'Connection status', type: SagaConnectionStatusDto })
  async getStatus(): Promise<SagaConnectionStatusDto> {
    return this.sagaService.getConnectionStatus();
  }

  @Post('sync/invoice')
  @ApiOperation({ summary: 'Sync invoice to SAGA v3.2' })
  @ApiResponse({ status: 201, description: 'Invoice synced successfully' })
  async syncInvoice(@Body() invoice: SyncInvoiceDto) {
    return this.sagaService.syncInvoice(invoice);
  }

  @Get('invoice/:sagaId/print')
  @ApiOperation({ summary: 'Print invoice from SAGA' })
  @ApiParam({ name: 'sagaId', description: 'SAGA invoice ID' })
  @ApiResponse({ status: 200, description: 'PDF as base64' })
  async printInvoice(@Param('sagaId') sagaId: string) {
    const pdf = await this.sagaService.printInvoice(sagaId);
    return { pdf: pdf.toString('base64') };
  }

  @Delete('invoice/:sagaId')
  @ApiOperation({ summary: 'Delete invoice from SAGA' })
  @ApiParam({ name: 'sagaId', description: 'SAGA invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  async deleteInvoice(@Param('sagaId') sagaId: string) {
    await this.sagaService.deleteInvoice(sagaId);
    return { success: true };
  }

  @Post('sync/payroll')
  @ApiOperation({ summary: 'Sync payroll data to SAGA' })
  @ApiResponse({ status: 201, description: 'Payroll synced successfully' })
  async syncPayroll(@Body() payrollData: SagaPayrollDto) {
    return this.sagaService.syncPayroll(payrollData);
  }

  @Post('sync/inventory')
  @ApiOperation({ summary: 'Sync inventory to SAGA' })
  @ApiResponse({ status: 201, description: 'Inventory synced successfully' })
  async syncInventory(@Body() inventoryData: SagaInventoryDto) {
    return this.sagaService.syncInventory(inventoryData);
  }

  @Get('saft/generate')
  @ApiOperation({ summary: 'Generate SAF-T XML from SAGA data' })
  @ApiQuery({ name: 'period', description: 'Period in YYYY-MM format', example: '2025-01' })
  @ApiResponse({ status: 200, description: 'SAF-T XML generated' })
  async generateSAFT(@Query('period') period: string) {
    const xml = await this.sagaService.generateSAFTXml(period);
    return { xml };
  }

  @Post('saft/validate')
  @ApiOperation({ summary: 'Validate SAF-T XML with DUKIntegrator' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateSAFT(@Body() body: ValidateSaftDto) {
    return this.sagaService.validateWithDUK(body.xml);
  }

  // ===== SAGA-005: REST XML Integration Endpoints =====

  @Get('xml/dashboard/:userId')
  @ApiOperation({ summary: 'Get SAGA XML sync dashboard' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getXmlDashboard(@Param('userId') userId: string) {
    return this.sagaXmlService.getDashboard(userId);
  }

  @Post('xml/sync/invoice')
  @ApiOperation({ summary: 'Sync single invoice to SAGA via XML' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'invoiceId'],
      properties: {
        userId: { type: 'string' },
        invoiceId: { type: 'string' },
      },
    },
  })
  async syncInvoiceXml(@Body() body: { userId: string; invoiceId: string }) {
    return this.sagaXmlService.syncInvoiceToSaga(body.userId, body.invoiceId);
  }

  @Post('xml/import/invoices')
  @ApiOperation({ summary: 'Import invoices from SAGA via XML' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'period'],
      properties: {
        userId: { type: 'string' },
        period: { type: 'string', example: '2025-01' },
      },
    },
  })
  async importInvoicesXml(@Body() body: { userId: string; period: string }) {
    return this.sagaXmlService.importInvoicesFromSaga(body.userId, body.period);
  }

  @Post('xml/sync/payment')
  @ApiOperation({ summary: 'Sync payment to SAGA via XML' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'paymentId'],
      properties: {
        userId: { type: 'string' },
        paymentId: { type: 'string' },
      },
    },
  })
  async syncPaymentXml(@Body() body: { userId: string; paymentId: string }) {
    return this.sagaXmlService.syncPaymentToSaga(body.userId, body.paymentId);
  }

  @Post('xml/sync/ledger')
  @ApiOperation({ summary: 'Sync ledger entries to SAGA via XML' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'period'],
      properties: {
        userId: { type: 'string' },
        period: { type: 'string', example: '2025-01' },
      },
    },
  })
  async syncLedgerXml(@Body() body: { userId: string; period: string }) {
    return this.sagaXmlService.syncLedgerEntriesToSaga(body.userId, body.period);
  }
}
