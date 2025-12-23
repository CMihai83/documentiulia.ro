import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Res,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  EFacturaB2CService,
  B2CInvoice,
  B2CInvoiceType,
  ConsumerType,
  B2CInvoiceItem,
} from './efactura-b2c.service';

/**
 * Sprint 41 - B2C e-Factura Controller
 * Mandatory from January 2025 for B2C transactions
 *
 * Features:
 * - B2C invoice creation and management
 * - ANAF SPV submission for consumer invoices
 * - Status tracking with 10-year retention
 * - Simplified invoice support for small amounts
 */
@ApiTags('efactura-b2c')
@ApiBearerAuth()
@Controller('efactura-b2c')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class EfacturaB2CController {
  constructor(private readonly b2cService: EFacturaB2CService) {}

  // ===== Invoice Creation =====

  @Post('invoice')
  @ApiOperation({
    summary: 'Create B2C invoice',
    description: 'Create a new B2C invoice for consumer transactions',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoiceNumber', 'seller', 'buyer', 'items', 'currency'],
      properties: {
        invoiceNumber: { type: 'string', description: 'Invoice number' },
        invoiceDate: { type: 'string', format: 'date', description: 'Invoice date (defaults to today)' },
        invoiceType: { type: 'string', enum: ['STANDARD', 'SIMPLIFIED', 'CREDIT_NOTE', 'DEBIT_NOTE'], default: 'STANDARD' },
        seller: {
          type: 'object',
          properties: {
            cui: { type: 'string' },
            name: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            county: { type: 'string' },
            country: { type: 'string', default: 'RO' },
            vatPayer: { type: 'boolean' },
            iban: { type: 'string' },
            bank: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        buyer: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['INDIVIDUAL', 'FOREIGN_INDIVIDUAL', 'NON_VAT_ENTITY'] },
            name: { type: 'string' },
            cnp: { type: 'string', description: 'Romanian personal ID (optional)' },
            address: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string', default: 'RO' },
            email: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unitOfMeasure: { type: 'string', default: 'buc' },
              unitPrice: { type: 'number' },
              vatRate: { type: 'number', default: 19 },
              vatCategory: { type: 'string', default: 'S' },
              productCode: { type: 'string' },
            },
          },
        },
        currency: { type: 'string', default: 'RON' },
        paymentMethod: { type: 'string' },
        paymentTerms: { type: 'string' },
        dueDate: { type: 'string', format: 'date' },
        isPaid: { type: 'boolean', default: false },
        notes: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'B2C invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Validation errors' })
  async createInvoice(
    @Body() body: {
      invoiceNumber: string;
      invoiceDate?: string;
      invoiceType?: B2CInvoiceType;
      seller: {
        cui: string;
        name: string;
        address: string;
        city: string;
        county: string;
        country: string;
        postalCode?: string;
        vatPayer: boolean;
        tradeRegister?: string;
        iban?: string;
        bank?: string;
        email?: string;
        phone?: string;
      };
      buyer: {
        type: ConsumerType;
        name: string;
        cnp?: string;
        address?: string;
        city?: string;
        country: string;
        email?: string;
        phone?: string;
      };
      items: Array<{
        description: string;
        quantity: number;
        unitOfMeasure?: string;
        unitPrice: number;
        vatRate?: number;
        vatCategory?: string;
        productCode?: string;
        ncCode?: string;
        discount?: number;
      }>;
      currency: string;
      paymentMethod?: string;
      paymentTerms?: string;
      dueDate?: string;
      isPaid?: boolean;
      notes?: string;
    },
  ) {
    // Build items with calculated amounts
    const items: B2CInvoiceItem[] = body.items.map((item, index) => {
      const netAmount = item.quantity * item.unitPrice - (item.discount || 0);
      const vatRate = item.vatRate ?? 19;
      const vatAmount = netAmount * (vatRate / 100);
      const grossAmount = netAmount + vatAmount;

      return {
        lineNumber: index + 1,
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure || 'buc',
        unitPrice: item.unitPrice,
        vatRate,
        vatCategory: item.vatCategory || 'S',
        netAmount,
        vatAmount,
        grossAmount,
        productCode: item.productCode,
        ncCode: item.ncCode,
        discount: item.discount,
      };
    });

    // Calculate totals
    const netTotal = items.reduce((sum, item) => sum + item.netAmount, 0);
    const vatTotal = items.reduce((sum, item) => sum + item.vatAmount, 0);
    const grossTotal = items.reduce((sum, item) => sum + item.grossAmount, 0);

    const invoice = await this.b2cService.createInvoice({
      invoiceNumber: body.invoiceNumber,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      invoiceType: body.invoiceType || B2CInvoiceType.STANDARD,
      seller: body.seller,
      buyer: body.buyer,
      items,
      currency: body.currency,
      netTotal,
      vatTotal,
      grossTotal,
      paymentMethod: body.paymentMethod,
      paymentTerms: body.paymentTerms,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      isPaid: body.isPaid ?? false,
      notes: body.notes,
    });

    return {
      success: true,
      invoice,
      message: 'Factura B2C a fost creată cu succes',
    };
  }

  // ===== XML Generation =====

  @Get('xml/:invoiceId')
  @ApiOperation({
    summary: 'Generate B2C e-Factura XML',
    description: 'Generate UBL 2.1 XML for B2C invoice submission',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'XML generated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async generateXML(@Param('invoiceId') invoiceId: string) {
    const invoice = this.b2cService.getInvoice(invoiceId);
    if (!invoice) {
      return {
        success: false,
        error: 'Factura nu a fost găsită',
      };
    }

    const xml = this.b2cService.generateXML(invoice);
    return {
      success: true,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      xml,
    };
  }

  @Get('download/:invoiceId')
  @ApiOperation({
    summary: 'Download B2C e-Factura XML',
    description: 'Download the generated XML as a file',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  async downloadXML(
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    const invoice = this.b2cService.getInvoice(invoiceId);
    if (!invoice) {
      res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        error: 'Factura nu a fost găsită',
      });
      return;
    }

    const xml = this.b2cService.generateXML(invoice);
    const filename = `efactura_b2c_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(xml, 'utf8'));
    res.send(xml);
  }

  // ===== ANAF Submission =====

  @Post('submit/:invoiceId')
  @ApiOperation({
    summary: 'Submit B2C invoice to ANAF',
    description: 'Submit B2C e-Factura to ANAF SPV (10-year retention)',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Submission initiated' })
  @ApiResponse({ status: 400, description: 'Submission failed' })
  async submitToANAF(@Param('invoiceId') invoiceId: string) {
    const result = await this.b2cService.submitToANAF(invoiceId);
    return result;
  }

  @Get('status/:invoiceId')
  @ApiOperation({
    summary: 'Check B2C submission status',
    description: 'Check the status of B2C e-Factura submission',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  async checkStatus(@Param('invoiceId') invoiceId: string) {
    const result = await this.b2cService.checkStatus(invoiceId);
    return result;
  }

  // ===== Invoice Retrieval =====

  @Get('invoice/:invoiceId')
  @ApiOperation({
    summary: 'Get B2C invoice by ID',
    description: 'Retrieve a B2C invoice by its ID',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    const invoice = this.b2cService.getInvoice(invoiceId);
    if (!invoice) {
      return {
        success: false,
        error: 'Factura nu a fost găsită',
      };
    }

    return {
      success: true,
      invoice,
    };
  }

  @Get('invoices')
  @ApiOperation({
    summary: 'Get B2C invoices by seller CUI',
    description: 'List all B2C invoices for a specific seller',
  })
  @ApiQuery({ name: 'cui', required: true, description: 'Seller CUI' })
  async getInvoicesBySeller(@Query('cui') cui: string) {
    const invoices = this.b2cService.getInvoicesBySeller(cui);
    return {
      success: true,
      total: invoices.length,
      invoices,
    };
  }

  @Get('history/:invoiceId')
  @ApiOperation({
    summary: 'Get submission history',
    description: 'Get the submission history for a B2C invoice',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  async getSubmissionHistory(@Param('invoiceId') invoiceId: string) {
    const history = this.b2cService.getSubmissionHistory(invoiceId);
    return {
      success: true,
      invoiceId,
      history,
    };
  }

  // ===== Validation =====

  @Post('validate')
  @ApiOperation({
    summary: 'Validate B2C invoice',
    description: 'Validate B2C invoice data before submission',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoice'],
      properties: {
        invoice: {
          type: 'object',
          description: 'B2C invoice object to validate',
        },
      },
    },
  })
  async validateInvoice(@Body() body: { invoice: B2CInvoice }) {
    const result = this.b2cService.validateInvoice(body.invoice);
    return {
      ...result,
      invoiceNumber: body.invoice.invoiceNumber,
      readyForSubmission: result.valid,
    };
  }

  // ===== Configuration =====

  @Get('config/invoice-types')
  @ApiOperation({
    summary: 'Get B2C invoice types',
    description: 'List available B2C invoice types',
  })
  getInvoiceTypes() {
    return [
      { value: 'STANDARD', label: 'Standard Invoice', labelRo: 'Factură Standard' },
      { value: 'SIMPLIFIED', label: 'Simplified Invoice', labelRo: 'Factură Simplificată' },
      { value: 'CREDIT_NOTE', label: 'Credit Note', labelRo: 'Notă de Credit' },
      { value: 'DEBIT_NOTE', label: 'Debit Note', labelRo: 'Notă de Debit' },
      { value: 'SELF_BILLING', label: 'Self-Billing', labelRo: 'Autofacturare' },
    ];
  }

  @Get('config/consumer-types')
  @ApiOperation({
    summary: 'Get consumer types',
    description: 'List B2C consumer types',
  })
  getConsumerTypes() {
    return [
      { value: 'INDIVIDUAL', label: 'Individual', labelRo: 'Persoană Fizică' },
      { value: 'FOREIGN_INDIVIDUAL', label: 'Foreign Individual', labelRo: 'Persoană Fizică Străină' },
      { value: 'NON_VAT_ENTITY', label: 'Non-VAT Entity', labelRo: 'Entitate fără TVA' },
    ];
  }

  @Get('config/vat-rates')
  @ApiOperation({
    summary: 'Get VAT rates',
    description: 'List applicable VAT rates (Legea 141/2025)',
  })
  getVatRates() {
    return [
      { value: 19, label: '19% Standard', labelRo: '19% Cota Standard', category: 'S', validUntil: '2025-07-31' },
      { value: 21, label: '21% Standard (Aug 2025+)', labelRo: '21% Cota Standard (Aug 2025+)', category: 'S', validFrom: '2025-08-01' },
      { value: 9, label: '9% Reduced', labelRo: '9% Cota Redusă', category: 'AA', validUntil: '2025-07-31' },
      { value: 11, label: '11% Reduced (Aug 2025+)', labelRo: '11% Cota Redusă (Aug 2025+)', category: 'AA', validFrom: '2025-08-01' },
      { value: 5, label: '5% Special', labelRo: '5% Cota Specială', category: 'Z' },
      { value: 0, label: '0% Exempt', labelRo: '0% Scutit', category: 'E' },
    ];
  }

  @Get('config/retention')
  @ApiOperation({
    summary: 'Get retention info',
    description: 'B2C e-Factura retention requirements',
  })
  getRetentionInfo() {
    const now = new Date();
    const expiryDate = this.b2cService.calculateRetentionExpiry(now);

    return {
      retentionYears: 10,
      platform: 'RO e-Factura',
      mandatory: true,
      mandatoryFrom: '2025-01-01',
      currentRetentionExpiry: expiryDate.toISOString().split('T')[0],
      message: 'Facturile B2C sunt reținute 10 ani pe platforma RO e-Factura conform legislației ANAF.',
    };
  }

  @Get('compliance/status')
  @ApiOperation({
    summary: 'Get B2C compliance status',
    description: 'Check B2C e-Factura compliance status and deadlines',
  })
  getComplianceStatus() {
    const now = new Date();
    const mandatoryDate = new Date('2025-01-01');
    const isMandatory = now >= mandatoryDate;

    return {
      phase: isMandatory ? 'MANDATORY' : 'PREPARATION',
      phaseRo: isMandatory ? 'Obligatoriu' : 'Pregătire',
      mandatoryFrom: '2025-01-01',
      isMandatory,
      daysUntilMandatory: isMandatory ? 0 : Math.ceil((mandatoryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      requirements: [
        { requirement: 'UBL 2.1 Format', fulfilled: true },
        { requirement: 'CIUS-RO Compliance', fulfilled: true },
        { requirement: '10-Year Retention', fulfilled: true },
        { requirement: 'RO Platform Integration', fulfilled: true },
      ],
      nextSteps: isMandatory
        ? ['Transmiteți toate facturile B2C prin e-Factura']
        : ['Pregătiți integrarea cu platforma RO', 'Testați generarea XML'],
    };
  }
}
