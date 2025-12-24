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
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { QuickBooksService, QuickBooksConfig, QuickBooksCustomer, QuickBooksInvoice, QuickBooksItem, QuickBooksPayment } from './quickbooks.service';

@ApiTags('QuickBooks Integration')
@Controller('api/v1/integrations/quickbooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksController {
  constructor(private readonly quickbooksService: QuickBooksService) {}

  // ============ OAUTH ============

  @Get('oauth/authorize')
  @ApiOperation({ summary: 'Get QuickBooks OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Authorization URL generated' })
  getAuthorizationUrl(@Req() req: any) {
    const state = `${req.user.id}_${Date.now()}`;
    const url = this.quickbooksService.getAuthorizationUrl(state);
    return { authorizationUrl: url, state };
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle QuickBooks OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('realmId') realmId: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const tokens = await this.quickbooksService.exchangeCodeForTokens(code);

      // In production, store tokens securely in database
      // For now, redirect with success message
      res.redirect(`/dashboard/settings/integrations?quickbooks=connected&realmId=${realmId}`);
    } catch (error) {
      res.redirect('/dashboard/settings/integrations?quickbooks=error');
    }
  }

  @Post('oauth/refresh')
  @ApiOperation({ summary: 'Refresh QuickBooks access token' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    const tokens = await this.quickbooksService.refreshAccessToken(refreshToken);
    return tokens;
  }

  // ============ CONNECTION ============

  @Post('test-connection')
  @ApiOperation({ summary: 'Test QuickBooks connection' })
  async testConnection(@Body() config: QuickBooksConfig) {
    return this.quickbooksService.testConnection(config);
  }

  @Get('company-info')
  @ApiOperation({ summary: 'Get QuickBooks company info' })
  async getCompanyInfo(@Body() config: QuickBooksConfig) {
    return this.quickbooksService.getCompanyInfo(config);
  }

  // ============ CUSTOMERS ============

  @Get('customers')
  @ApiOperation({ summary: 'Get all QuickBooks customers' })
  async getCustomers(
    @Body() config: QuickBooksConfig,
    @Query('maxResults') maxResults?: number,
  ) {
    return this.quickbooksService.getCustomers(config, maxResults);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get QuickBooks customer by ID' })
  async getCustomer(
    @Body() config: QuickBooksConfig,
    @Param('id') id: string,
  ) {
    return this.quickbooksService.getCustomerById(config, id);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create QuickBooks customer' })
  async createCustomer(
    @Body() body: { config: QuickBooksConfig; customer: QuickBooksCustomer },
  ) {
    return this.quickbooksService.createCustomer(body.config, body.customer);
  }

  @Put('customers/:id')
  @ApiOperation({ summary: 'Update QuickBooks customer' })
  async updateCustomer(
    @Body() body: { config: QuickBooksConfig; customer: QuickBooksCustomer },
    @Param('id') id: string,
  ) {
    body.customer.Id = id;
    return this.quickbooksService.updateCustomer(body.config, body.customer);
  }

  // ============ INVOICES ============

  @Get('invoices')
  @ApiOperation({ summary: 'Get all QuickBooks invoices' })
  async getInvoices(
    @Body() config: QuickBooksConfig,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('maxResults') maxResults?: number,
  ) {
    return this.quickbooksService.getInvoices(config, { startDate, endDate, maxResults });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get QuickBooks invoice by ID' })
  async getInvoice(
    @Body() config: QuickBooksConfig,
    @Param('id') id: string,
  ) {
    return this.quickbooksService.getInvoiceById(config, id);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create QuickBooks invoice' })
  async createInvoice(
    @Body() body: { config: QuickBooksConfig; invoice: QuickBooksInvoice },
  ) {
    return this.quickbooksService.createInvoice(body.config, body.invoice);
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Get QuickBooks invoice PDF' })
  async getInvoicePdf(
    @Body() config: QuickBooksConfig,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.quickbooksService.getInvoicePdf(config, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    res.send(pdf);
  }

  @Post('invoices/:id/send')
  @ApiOperation({ summary: 'Send QuickBooks invoice via email' })
  async sendInvoice(
    @Body() body: { config: QuickBooksConfig; email?: string },
    @Param('id') id: string,
  ) {
    return this.quickbooksService.sendInvoice(body.config, id, body.email);
  }

  @Post('invoices/:id/void')
  @ApiOperation({ summary: 'Void QuickBooks invoice' })
  async voidInvoice(
    @Body() config: QuickBooksConfig,
    @Param('id') id: string,
  ) {
    return this.quickbooksService.voidInvoice(config, id);
  }

  // ============ PAYMENTS ============

  @Get('payments')
  @ApiOperation({ summary: 'Get all QuickBooks payments' })
  async getPayments(
    @Body() config: QuickBooksConfig,
    @Query('maxResults') maxResults?: number,
  ) {
    return this.quickbooksService.getPayments(config, maxResults);
  }

  @Post('payments')
  @ApiOperation({ summary: 'Create QuickBooks payment' })
  async createPayment(
    @Body() body: { config: QuickBooksConfig; payment: QuickBooksPayment },
  ) {
    return this.quickbooksService.createPayment(body.config, body.payment);
  }

  // ============ ITEMS / PRODUCTS ============

  @Get('items')
  @ApiOperation({ summary: 'Get all QuickBooks items/products' })
  async getItems(
    @Body() config: QuickBooksConfig,
    @Query('maxResults') maxResults?: number,
  ) {
    return this.quickbooksService.getItems(config, maxResults);
  }

  @Post('items')
  @ApiOperation({ summary: 'Create QuickBooks item/product' })
  async createItem(
    @Body() body: { config: QuickBooksConfig; item: QuickBooksItem },
  ) {
    return this.quickbooksService.createItem(body.config, body.item);
  }

  // ============ ACCOUNTS ============

  @Get('accounts')
  @ApiOperation({ summary: 'Get QuickBooks chart of accounts' })
  async getAccounts(@Body() config: QuickBooksConfig) {
    return this.quickbooksService.getAccounts(config);
  }

  // ============ REPORTS ============

  @Get('reports/profit-loss')
  @ApiOperation({ summary: 'Get QuickBooks Profit and Loss report' })
  async getProfitAndLossReport(
    @Body() config: QuickBooksConfig,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.quickbooksService.getProfitAndLossReport(config, startDate, endDate);
  }

  @Get('reports/balance-sheet')
  @ApiOperation({ summary: 'Get QuickBooks Balance Sheet report' })
  async getBalanceSheetReport(
    @Body() config: QuickBooksConfig,
    @Query('asOfDate') asOfDate: string,
  ) {
    return this.quickbooksService.getBalanceSheetReport(config, asOfDate);
  }

  // ============ SYNC ============

  @Post('sync/customers')
  @ApiOperation({ summary: 'Sync customers from QuickBooks to DocumentIulia' })
  async syncCustomers(@Body() config: QuickBooksConfig) {
    const customers = await this.quickbooksService.getCustomers(config);
    // In production, save customers to local database
    return {
      success: true,
      count: customers.length,
      message: `${customers.length} clienti sincronizati din QuickBooks`,
    };
  }

  @Post('sync/invoices')
  @ApiOperation({ summary: 'Sync invoices from QuickBooks to DocumentIulia' })
  async syncInvoices(
    @Body() body: { config: QuickBooksConfig; startDate?: string; endDate?: string },
  ) {
    const invoices = await this.quickbooksService.getInvoices(body.config, {
      startDate: body.startDate,
      endDate: body.endDate,
    });
    // In production, save invoices to local database
    return {
      success: true,
      count: invoices.length,
      message: `${invoices.length} facturi sincronizate din QuickBooks`,
    };
  }

  @Post('sync/items')
  @ApiOperation({ summary: 'Sync items/products from QuickBooks to DocumentIulia' })
  async syncItems(@Body() config: QuickBooksConfig) {
    const items = await this.quickbooksService.getItems(config);
    // In production, save items to local database
    return {
      success: true,
      count: items.length,
      message: `${items.length} produse sincronizate din QuickBooks`,
    };
  }

  // ============ EXPORT ============

  @Post('export/invoice')
  @ApiOperation({ summary: 'Export DocumentIulia invoice to QuickBooks' })
  async exportInvoice(
    @Body() body: { config: QuickBooksConfig; invoice: any; customerRef: string },
  ) {
    const qbInvoice = this.quickbooksService.convertToQuickBooksInvoice(
      body.invoice,
      body.customerRef,
    );
    const created = await this.quickbooksService.createInvoice(body.config, qbInvoice);
    return {
      success: true,
      quickbooksId: created.Id,
      docNumber: created.DocNumber,
      message: 'Factura exportata cu succes in QuickBooks',
    };
  }

  @Post('export/customer')
  @ApiOperation({ summary: 'Export DocumentIulia customer to QuickBooks' })
  async exportCustomer(
    @Body() body: { config: QuickBooksConfig; customer: any },
  ) {
    const qbCustomer = this.quickbooksService.convertToQuickBooksCustomer(body.customer);
    const created = await this.quickbooksService.createCustomer(body.config, qbCustomer);
    return {
      success: true,
      quickbooksId: created.Id,
      message: 'Client exportat cu succes in QuickBooks',
    };
  }
}
