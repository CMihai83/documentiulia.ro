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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  RecurringInvoiceService,
  CreateRecurringInvoiceDto,
  RecurrenceFrequency,
} from './recurring-invoice.service';

@ApiTags('Recurring Invoices')
@Controller('recurring-invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecurringInvoiceController {
  constructor(private readonly recurringInvoiceService: RecurringInvoiceService) {}

  /**
   * Create a new recurring invoice template
   */
  @Post()
  @ApiOperation({ summary: 'Create recurring invoice template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(@Request() req: any, @Body() dto: CreateRecurringInvoiceDto) {
    return this.recurringInvoiceService.create(req.user.sub, dto);
  }

  /**
   * Get all recurring invoice templates
   */
  @Get()
  @ApiOperation({ summary: 'Get all recurring invoice templates' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @Request() req: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const templates = await this.recurringInvoiceService.findAll(
      req.user.sub,
      includeInactive === 'true',
    );
    return {
      data: templates,
      total: templates.length,
    };
  }

  /**
   * Get upcoming scheduled invoices (next 30 days)
   */
  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled invoices' })
  async getUpcoming(@Request() req: any) {
    const templates = await this.recurringInvoiceService.getUpcoming(req.user.sub);
    return {
      data: templates,
      total: templates.length,
    };
  }

  /**
   * Get frequency options
   */
  @Get('frequencies')
  @ApiOperation({ summary: 'Get available frequency options' })
  getFrequencies() {
    return {
      frequencies: [
        { value: RecurrenceFrequency.DAILY, label: 'Zilnic', description: 'Facturare în fiecare zi' },
        { value: RecurrenceFrequency.WEEKLY, label: 'Săptămânal', description: 'Facturare săptămânală' },
        { value: RecurrenceFrequency.BIWEEKLY, label: 'Bi-săptămânal', description: 'Facturare la 2 săptămâni' },
        { value: RecurrenceFrequency.MONTHLY, label: 'Lunar', description: 'Facturare lunară' },
        { value: RecurrenceFrequency.QUARTERLY, label: 'Trimestrial', description: 'Facturare la 3 luni' },
        { value: RecurrenceFrequency.BIANNUALLY, label: 'Semestrial', description: 'Facturare la 6 luni' },
        { value: RecurrenceFrequency.ANNUALLY, label: 'Anual', description: 'Facturare anuală' },
      ],
    };
  }

  /**
   * Get single recurring invoice template
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get recurring invoice template by ID' })
  async findOne(@Param('id') id: string) {
    const template = await this.recurringInvoiceService.findOne(id);
    if (!template) {
      return { error: 'Șablonul nu a fost găsit' };
    }
    return template;
  }

  /**
   * Get invoices generated from a template
   */
  @Get(':id/invoices')
  @ApiOperation({ summary: 'Get invoices generated from template' })
  async getGeneratedInvoices(@Param('id') id: string) {
    const invoices = await this.recurringInvoiceService.getGeneratedInvoices(id);
    return {
      data: invoices,
      total: invoices.length,
    };
  }

  /**
   * Update recurring invoice template
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update recurring invoice template' })
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: Partial<CreateRecurringInvoiceDto>,
  ) {
    return this.recurringInvoiceService.update(id, req.user.sub, dto);
  }

  /**
   * Toggle active status
   */
  @Put(':id/toggle')
  @ApiOperation({ summary: 'Toggle template active status' })
  async toggleActive(@Param('id') id: string, @Request() req: any) {
    return this.recurringInvoiceService.toggleActive(id, req.user.sub);
  }

  /**
   * Generate invoice immediately from template
   */
  @Post(':id/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate invoice immediately from template' })
  async generateNow(@Param('id') id: string, @Request() req: any) {
    const invoice = await this.recurringInvoiceService.generateInvoiceNow(id, req.user.sub);
    return {
      success: true,
      message: 'Factura a fost generată cu succes',
      invoice,
    };
  }

  /**
   * Delete recurring invoice template
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete recurring invoice template' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.recurringInvoiceService.delete(id, req.user.sub);
  }
}
