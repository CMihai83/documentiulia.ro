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
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SmartBillService, SmartBillConfig, SmartBillInvoice } from './smartbill.service';
import { PrismaService } from '../../prisma/prisma.service';

interface SmartBillCredentialsDto {
  apiKey: string;
  email: string;
  companyVat: string;
}

interface CreateSmartBillInvoiceDto {
  invoiceId: string;
  seriesName: string;
}

interface RegisterPaymentDto {
  series: string;
  number: string;
  value: number;
  type: 'Card' | 'Numerar' | 'Ordin de plata' | 'Alta incasare';
  paymentDate: string;
}

@ApiTags('SmartBill Integration')
@Controller('integrations/smartbill')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SmartBillController {
  constructor(
    private readonly smartBillService: SmartBillService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Test SmartBill connection
   */
  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test SmartBill API connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(@Body() credentials: SmartBillCredentialsDto) {
    return this.smartBillService.testConnection(credentials);
  }

  /**
   * Save SmartBill credentials for user's organization
   */
  @Post('credentials')
  @ApiOperation({ summary: 'Save SmartBill credentials' })
  @ApiResponse({ status: 201, description: 'Credentials saved successfully' })
  async saveCredentials(
    @Request() req: any,
    @Body() credentials: SmartBillCredentialsDto,
  ) {
    const userId = req.user.sub;

    // Get user's organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return { success: false, message: 'Nu aparții unei organizații' };
    }

    // Test connection first
    const testResult = await this.smartBillService.testConnection(credentials);
    if (!testResult.success) {
      return testResult;
    }

    // Store credentials (encrypted in production)
    await this.prisma.organizationIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId: user.activeOrganizationId,
          provider: 'SMARTBILL',
        },
      },
      create: {
        organizationId: user.activeOrganizationId,
        provider: 'SMARTBILL',
        credentials: JSON.stringify(credentials),
        isActive: true,
      },
      update: {
        credentials: JSON.stringify(credentials),
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: 'Credențialele SmartBill au fost salvate!' };
  }

  /**
   * Get SmartBill integration status
   */
  @Get('status')
  @ApiOperation({ summary: 'Get SmartBill integration status' })
  async getStatus(@Request() req: any) {
    const userId = req.user.sub;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return { connected: false, message: 'Nu aparții unei organizații' };
    }

    const integration = await this.prisma.organizationIntegration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: user.activeOrganizationId,
          provider: 'SMARTBILL',
        },
      },
    });

    return {
      connected: integration?.isActive ?? false,
      lastSync: integration?.lastSyncAt || null,
    };
  }

  /**
   * Get available invoice series
   */
  @Get('series')
  @ApiOperation({ summary: 'Get available SmartBill invoice series' })
  async getSeries(@Request() req: any) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return { series: [], error: 'SmartBill nu este configurat' };
    }

    const series = await this.smartBillService.getInvoiceSeries(config);
    return { series };
  }

  /**
   * Get available tax rates
   */
  @Get('tax-rates')
  @ApiOperation({ summary: 'Get available SmartBill tax rates' })
  async getTaxRates(@Request() req: any) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return { taxRates: [], error: 'SmartBill nu este configurat' };
    }

    const taxRates = await this.smartBillService.getTaxRates(config);
    return { taxRates };
  }

  /**
   * Create invoice in SmartBill from local invoice
   */
  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice in SmartBill' })
  @ApiResponse({ status: 201, description: 'Invoice created in SmartBill' })
  async createInvoice(
    @Request() req: any,
    @Body() dto: CreateSmartBillInvoiceDto,
  ) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return { success: false, error: 'SmartBill nu este configurat' };
    }

    // Get local invoice
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: {
        items: true,
        partner: true,
      },
    });

    if (!invoice) {
      return { success: false, error: 'Factura nu a fost găsită' };
    }

    // Convert to SmartBill format
    const smartBillInvoice = this.smartBillService.convertToSmartBillInvoice(
      invoice,
      dto.seriesName,
      config.companyVat,
    );

    // Create in SmartBill
    const result = await this.smartBillService.createInvoice(config, smartBillInvoice);

    // Update local invoice with SmartBill reference
    await this.prisma.invoice.update({
      where: { id: dto.invoiceId },
      data: {
        externalRef: `SmartBill:${result.series}${result.number}`,
        metadata: {
          ...(invoice.metadata as object || {}),
          smartBill: {
            series: result.series,
            number: result.number,
            url: result.url,
            syncedAt: new Date().toISOString(),
          },
        },
      },
    });

    return {
      success: true,
      series: result.series,
      number: result.number,
      url: result.url,
    };
  }

  /**
   * Get invoice PDF from SmartBill
   */
  @Get('invoices/:series/:number/pdf')
  @ApiOperation({ summary: 'Download SmartBill invoice PDF' })
  async getInvoicePdf(
    @Request() req: any,
    @Param('series') series: string,
    @Param('number') number: string,
    @Res() res: Response,
  ) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return res.status(400).json({ error: 'SmartBill nu este configurat' });
    }

    const pdfBuffer = await this.smartBillService.getInvoicePdf(config, series, number);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${series}${number}.pdf`);
    res.send(pdfBuffer);
  }

  /**
   * Cancel invoice in SmartBill
   */
  @Delete('invoices/:series/:number')
  @ApiOperation({ summary: 'Cancel invoice in SmartBill' })
  async cancelInvoice(
    @Request() req: any,
    @Param('series') series: string,
    @Param('number') number: string,
  ) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return { success: false, error: 'SmartBill nu este configurat' };
    }

    const result = await this.smartBillService.cancelInvoice(config, series, number);
    return { success: true, ...result };
  }

  /**
   * Register payment in SmartBill
   */
  @Put('invoices/payment')
  @ApiOperation({ summary: 'Register payment in SmartBill' })
  async registerPayment(
    @Request() req: any,
    @Body() dto: RegisterPaymentDto,
  ) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return { success: false, error: 'SmartBill nu este configurat' };
    }

    const result = await this.smartBillService.registerPayment(config, dto.series, dto.number, {
      value: dto.value,
      type: dto.type,
      paymentDate: dto.paymentDate,
    });

    return { success: true, ...result };
  }

  /**
   * Import invoices from SmartBill
   */
  @Get('invoices/import')
  @ApiOperation({ summary: 'Import invoices from SmartBill' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async importInvoices(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return { success: false, error: 'SmartBill nu este configurat' };
    }

    const invoices = await this.smartBillService.getInvoices(config, startDate, endDate);
    return {
      success: true,
      count: invoices.length,
      invoices,
    };
  }

  /**
   * Get stock from SmartBill
   */
  @Get('stock')
  @ApiOperation({ summary: 'Get stock from SmartBill' })
  @ApiQuery({ name: 'warehouse', required: false })
  async getStock(
    @Request() req: any,
    @Query('warehouse') warehouse?: string,
  ) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return { success: false, error: 'SmartBill nu este configurat' };
    }

    const stock = await this.smartBillService.getStock(config, warehouse);
    return { success: true, stock };
  }

  /**
   * Lookup client by VAT code
   */
  @Get('clients/:vatCode')
  @ApiOperation({ summary: 'Lookup client by VAT code' })
  async getClient(
    @Request() req: any,
    @Param('vatCode') vatCode: string,
  ) {
    const config = await this.getUserSmartBillConfig(req.user.sub);
    if (!config) {
      return { success: false, error: 'SmartBill nu este configurat' };
    }

    const client = await this.smartBillService.getClientByVat(config, vatCode);
    return { success: true, client };
  }

  /**
   * Disconnect SmartBill integration
   */
  @Delete('disconnect')
  @ApiOperation({ summary: 'Disconnect SmartBill integration' })
  async disconnect(@Request() req: any) {
    const userId = req.user.sub;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return { success: false, message: 'Nu aparții unei organizații' };
    }

    await this.prisma.organizationIntegration.updateMany({
      where: {
        organizationId: user.activeOrganizationId,
        provider: 'SMARTBILL',
      },
      data: {
        isActive: false,
        credentials: null,
      },
    });

    return { success: true, message: 'SmartBill a fost deconectat' };
  }

  /**
   * Helper: Get user's SmartBill configuration
   */
  private async getUserSmartBillConfig(userId: string): Promise<SmartBillConfig | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return null;
    }

    const integration = await this.prisma.organizationIntegration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: user.activeOrganizationId,
          provider: 'SMARTBILL',
        },
      },
    });

    if (!integration?.isActive || !integration.credentials) {
      return null;
    }

    try {
      return JSON.parse(integration.credentials as string) as SmartBillConfig;
    } catch {
      return null;
    }
  }
}
