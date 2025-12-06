/**
 * SAGA ERP Integration Controller v3.2
 * REST endpoints for invoice/print/delete/payroll/inventory sync
 *
 * @author DocumentIulia Team
 * @version 3.2.0
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SagaService } from './saga.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// DTOs
class SyncInvoicesDto {
  invoices: any[];
}

class SyncPayrollDto {
  records: any[];
}

class SyncInventoryDto {
  items: any[];
}

class DeleteInvoiceDto {
  reason: string;
}

@ApiTags('SAGA ERP Integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/saga')
export class SagaController {
  private readonly logger = new Logger(SagaController.name);

  constructor(private readonly sagaService: SagaService) {}

  /**
   * OAuth Authentication
   * POST /api/saga/auth
   */
  @Post('auth')
  @ApiOperation({ summary: 'Authenticate with SAGA ERP via OAuth 2.0' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async authenticate() {
    this.logger.log('SAGA OAuth authentication request');
    return this.sagaService.authenticate();
  }

  /**
   * Sync Invoices
   * POST /api/saga/sync-invoices
   */
  @Post('sync-invoices')
  @ApiOperation({ summary: 'Synchronize invoices with SAGA ERP' })
  @ApiResponse({ status: 200, description: 'Invoices synchronized' })
  async syncInvoices(@Body() dto: SyncInvoicesDto) {
    this.logger.log(`Syncing ${dto.invoices.length} invoices to SAGA`);
    return this.sagaService.syncInvoices(dto.invoices);
  }

  /**
   * Print Invoice as PDF
   * GET /api/saga/print-invoice/:id
   *
   * NEW: Implemented per audit findings
   */
  @Get('print-invoice/:id')
  @ApiOperation({ summary: 'Generate invoice PDF from SAGA' })
  @ApiResponse({ status: 200, description: 'PDF generated', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async printInvoice(@Param('id') id: string, @Res() res: Response) {
    this.logger.log(`Printing invoice ${id}`);
    const pdfBuffer = await this.sagaService.printInvoice(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.status(HttpStatus.OK).send(pdfBuffer);
  }

  /**
   * Delete Invoice (Soft Delete)
   * DELETE /api/saga/delete-invoice/:id
   *
   * NEW: Implemented per audit findings
   */
  @Delete('delete-invoice/:id')
  @ApiOperation({ summary: 'Soft delete invoice in SAGA with audit log' })
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async deleteInvoice(@Param('id') id: string, @Body() dto: DeleteInvoiceDto) {
    this.logger.log(`Deleting invoice ${id}, reason: ${dto.reason}`);
    return this.sagaService.deleteInvoice(id, dto.reason);
  }

  /**
   * Sync Payroll
   * POST /api/saga/sync-payroll
   */
  @Post('sync-payroll')
  @ApiOperation({ summary: 'Synchronize payroll records with SAGA' })
  @ApiResponse({ status: 200, description: 'Payroll synchronized' })
  async syncPayroll(@Body() dto: SyncPayrollDto) {
    this.logger.log(`Syncing ${dto.records.length} payroll records`);
    return this.sagaService.syncPayroll(dto.records);
  }

  /**
   * Sync Inventory
   * POST /api/saga/sync-inventory
   */
  @Post('sync-inventory')
  @ApiOperation({ summary: 'Synchronize inventory with SAGA' })
  @ApiResponse({ status: 200, description: 'Inventory synchronized' })
  async syncInventory(@Body() dto: SyncInventoryDto) {
    this.logger.log(`Syncing ${dto.items.length} inventory items`);
    return this.sagaService.syncInventory(dto.items);
  }

  /**
   * Export SAF-T D406 XML
   * GET /api/saga/saft-export
   *
   * Per OPANAF 1783/2021 (corrected from 2024 per audit)
   */
  @Get('saft-export')
  @ApiOperation({ summary: 'Export SAF-T D406 XML per OPANAF 1783/2021' })
  @ApiResponse({ status: 200, description: 'SAF-T XML generated' })
  async exportSAFT(
    @Query('period') period: string,
    @Query('companyId') companyId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Exporting SAF-T for period ${period}, company ${companyId}`);
    const result = await this.sagaService.exportSAFT(period, companyId);

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="SAF-T_D406_${period}.xml"`,
      'X-Validated': result.validated.toString(),
    });

    res.status(HttpStatus.OK).send(result.xml);
  }

  /**
   * Validate XML with DUKIntegrator
   * POST /api/saga/validate-xml
   */
  @Post('validate-xml')
  @ApiOperation({ summary: 'Validate XML with DUKIntegrator' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateXml(@Body('xml') xml: string) {
    this.logger.log('Validating XML with DUKIntegrator');
    return this.sagaService.validateWithDuk(xml);
  }
}
