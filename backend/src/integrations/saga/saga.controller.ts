import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SagaService } from './saga.service';
import { IsString, IsOptional, IsDateString } from 'class-validator';

class SagaOAuthCallbackDto {
  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  redirectUri: string;
}

class SyncInvoicesDto {
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  toDate?: string;
}

class PushInvoiceDto {
  @IsString()
  invoiceId: string;
}

class SyncPayrollDto {
  @IsString()
  period: string; // YYYY-MM
}

class ExportSafTDto {
  @IsString()
  period: string; // YYYY-MM
}

class SubmitEFacturaDto {
  @IsString()
  invoiceId: string;
}

class CheckEFacturaStatusDto {
  @IsString()
  indexIncarcare: string;
}

@Controller('integrations/saga')
@UseGuards(JwtAuthGuard)
export class SagaController {
  constructor(private readonly sagaService: SagaService) {}

  /**
   * Get OAuth authorization URL
   */
  @Get('oauth/authorize')
  getAuthorizationUrl(
    @Req() req: any,
    @Query('redirectUri') redirectUri: string,
  ) {
    const organizationId = req.user.organizationId;
    const url = this.sagaService.getAuthorizationUrl(organizationId, redirectUri);
    return { authorizationUrl: url };
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  @Post('oauth/callback')
  async handleOAuthCallback(
    @Req() req: any,
    @Body() dto: SagaOAuthCallbackDto,
  ) {
    const organizationId = req.user.organizationId;
    const token = await this.sagaService.exchangeCodeForToken(
      dto.code,
      dto.redirectUri,
      organizationId,
    );
    return {
      success: true,
      message: 'Conectat cu succes la SAGA',
      expiresAt: token.expiresAt,
      scope: token.scope,
    };
  }

  /**
   * Check if organization is connected to SAGA
   */
  @Get('status')
  async getConnectionStatus(@Req() req: any) {
    const organizationId = req.user.organizationId;
    const connected = await this.sagaService.isConnected(organizationId);
    return {
      connected,
      message: connected
        ? 'Organizatia este conectata la SAGA'
        : 'Organizatia nu este conectata la SAGA',
    };
  }

  /**
   * Disconnect from SAGA
   */
  @Post('disconnect')
  async disconnect(@Req() req: any) {
    const organizationId = req.user.organizationId;
    await this.sagaService.disconnect(organizationId);
    return {
      success: true,
      message: 'Deconectat de la SAGA',
    };
  }

  // ==================== INVOICE ENDPOINTS ====================

  /**
   * Sync invoices from SAGA to local database
   */
  @Post('invoices/sync')
  async syncInvoices(@Req() req: any, @Body() dto: SyncInvoicesDto) {
    const organizationId = req.user.organizationId;
    const fromDate = dto.fromDate ? new Date(dto.fromDate) : undefined;
    const toDate = dto.toDate ? new Date(dto.toDate) : undefined;

    const result = await this.sagaService.syncInvoicesFromSaga(
      organizationId,
      fromDate,
      toDate,
    );

    return {
      success: result.success,
      message: `Sincronizate ${result.syncedCount} facturi din SAGA`,
      syncedCount: result.syncedCount,
      errors: result.errors,
      timestamp: result.timestamp,
    };
  }

  /**
   * Push invoice to SAGA
   */
  @Post('invoices/push')
  async pushInvoice(@Req() req: any, @Body() dto: PushInvoiceDto) {
    const organizationId = req.user.organizationId;
    const result = await this.sagaService.pushInvoiceToSaga(
      organizationId,
      dto.invoiceId,
    );

    return {
      success: result.success,
      message: result.success
        ? `Factura trimisa cu succes la SAGA (ID: ${result.sagaId})`
        : `Eroare: ${result.error}`,
      sagaId: result.sagaId,
      error: result.error,
    };
  }

  // ==================== PAYROLL ENDPOINTS ====================

  /**
   * Sync payroll from SAGA
   */
  @Post('payroll/sync')
  async syncPayroll(@Req() req: any, @Body() dto: SyncPayrollDto) {
    const organizationId = req.user.organizationId;
    const result = await this.sagaService.syncPayrollFromSaga(
      organizationId,
      dto.period,
    );

    return {
      success: result.success,
      message: `Sincronizate ${result.syncedCount} inregistrari salarizare din SAGA`,
      syncedCount: result.syncedCount,
      errors: result.errors,
      timestamp: result.timestamp,
    };
  }

  /**
   * Export payroll declarations to SAGA
   */
  @Post('payroll/export')
  async exportPayroll(@Req() req: any, @Body() dto: SyncPayrollDto) {
    const organizationId = req.user.organizationId;
    const result = await this.sagaService.exportPayrollToSaga(
      organizationId,
      dto.period,
    );

    return {
      success: result.success,
      message: result.success
        ? `Declaratia exportata cu succes (ID: ${result.declarationId})`
        : `Eroare: ${result.error}`,
      declarationId: result.declarationId,
      error: result.error,
    };
  }

  // ==================== INVENTORY ENDPOINTS ====================

  /**
   * Sync inventory from SAGA
   */
  @Post('inventory/sync')
  async syncInventory(
    @Req() req: any,
    @Query('warehouse') warehouseCode?: string,
  ) {
    const organizationId = req.user.organizationId;
    const result = await this.sagaService.syncInventoryFromSaga(
      organizationId,
      warehouseCode,
    );

    return {
      success: result.success,
      message: `Sincronizate ${result.syncedCount} articole inventar din SAGA`,
      syncedCount: result.syncedCount,
      errors: result.errors,
      timestamp: result.timestamp,
    };
  }

  // ==================== SAF-T D406 ENDPOINTS ====================

  /**
   * Export SAF-T D406 XML via SAGA
   */
  @Post('saft/d406')
  async exportSafTD406(@Req() req: any, @Body() dto: ExportSafTDto) {
    const organizationId = req.user.organizationId;
    const result = await this.sagaService.exportSafTD406(
      organizationId,
      dto.period,
    );

    return {
      success: result.success,
      message: result.success
        ? 'Export SAF-T D406 generat cu succes'
        : `Eroare: ${result.error}`,
      xmlUrl: result.xmlUrl,
      error: result.error,
    };
  }

  // ==================== e-FACTURA SPV ENDPOINTS ====================

  /**
   * Submit e-Factura to ANAF SPV via SAGA
   */
  @Post('efactura/submit')
  async submitEFactura(@Req() req: any, @Body() dto: SubmitEFacturaDto) {
    const organizationId = req.user.organizationId;
    const result = await this.sagaService.submitEFacturaToSPV(
      organizationId,
      dto.invoiceId,
    );

    return {
      success: result.success,
      message: result.success
        ? `Factura trimisa la SPV (Index: ${result.indexIncarcare})`
        : `Eroare: ${result.error}`,
      indexIncarcare: result.indexIncarcare,
      error: result.error,
    };
  }

  /**
   * Check e-Factura status from SPV
   */
  @Get('efactura/status/:indexIncarcare')
  async checkEFacturaStatus(
    @Req() req: any,
    @Param('indexIncarcare') indexIncarcare: string,
  ) {
    const organizationId = req.user.organizationId;
    const result = await this.sagaService.checkEFacturaStatus(
      organizationId,
      indexIncarcare,
    );

    return {
      indexIncarcare,
      status: result.status,
      stare: result.stare,
      message: result.message,
    };
  }
}
