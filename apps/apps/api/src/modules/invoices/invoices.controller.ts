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
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceFilterDto } from './dto';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Creează o factură nouă' })
  @ApiHeader({ name: 'x-company-id', required: true, description: 'ID-ul companiei' })
  @ApiResponse({ status: 201, description: 'Factura a fost creată' })
  @ApiResponse({ status: 400, description: 'Date invalide' })
  create(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listează toate facturile' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiResponse({ status: 200, description: 'Lista facturilor' })
  findAll(
    @Headers('x-company-id') companyId: string,
    @Query() filters: InvoiceFilterDto,
  ) {
    return this.invoicesService.findAll(companyId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistici facturi pentru dashboard' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiResponse({ status: 200, description: 'Statistici facturi' })
  getStats(@Headers('x-company-id') companyId: string) {
    return this.invoicesService.getDashboardStats(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obține detalii factură' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiParam({ name: 'id', description: 'ID-ul facturii' })
  @ApiResponse({ status: 200, description: 'Detalii factură' })
  @ApiResponse({ status: 404, description: 'Factura nu a fost găsită' })
  findOne(
    @Headers('x-company-id') companyId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizează o factură' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiParam({ name: 'id', description: 'ID-ul facturii' })
  @ApiResponse({ status: 200, description: 'Factura a fost actualizată' })
  @ApiResponse({ status: 400, description: 'Date invalide sau factura nu poate fi modificată' })
  @ApiResponse({ status: 404, description: 'Factura nu a fost găsită' })
  update(
    @Headers('x-company-id') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Șterge o factură' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiParam({ name: 'id', description: 'ID-ul facturii' })
  @ApiResponse({ status: 200, description: 'Factura a fost ștearsă' })
  @ApiResponse({ status: 400, description: 'Factura nu poate fi ștearsă' })
  @ApiResponse({ status: 404, description: 'Factura nu a fost găsită' })
  delete(
    @Headers('x-company-id') companyId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.delete(companyId, id);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Marchează factura ca trimisă' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiParam({ name: 'id', description: 'ID-ul facturii' })
  @ApiResponse({ status: 200, description: 'Factura a fost marcată ca trimisă' })
  markAsSent(
    @Headers('x-company-id') companyId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.markAsSent(companyId, id);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Înregistrează plată pentru factură' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiParam({ name: 'id', description: 'ID-ul facturii' })
  @ApiResponse({ status: 200, description: 'Plata a fost înregistrată' })
  markAsPaid(
    @Headers('x-company-id') companyId: string,
    @Param('id') id: string,
    @Body('amount') amount?: number,
  ) {
    return this.invoicesService.markAsPaid(companyId, id, amount);
  }
}
