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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContractsService, CreateContractDto, UpdateContractDto } from './contracts.service';
import { ContractType, ContractStatus } from '@prisma/client';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract (Creare contract)' })
  async create(@Request() req: any, @Body() dto: CreateContractDto) {
    return this.contractsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contracts with filters (Lista contracte)' })
  @ApiQuery({ name: 'type', required: false, enum: ContractType })
  @ApiQuery({ name: 'status', required: false, enum: ContractStatus })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'startDateFrom', required: false })
  @ApiQuery({ name: 'startDateTo', required: false })
  @ApiQuery({ name: 'endDateFrom', required: false })
  @ApiQuery({ name: 'endDateTo', required: false })
  @ApiQuery({ name: 'minValue', required: false, type: Number })
  @ApiQuery({ name: 'maxValue', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Request() req: any,
    @Query('type') type?: ContractType,
    @Query('status') status?: ContractStatus,
    @Query('partnerId') partnerId?: string,
    @Query('search') search?: string,
    @Query('startDateFrom') startDateFrom?: string,
    @Query('startDateTo') startDateTo?: string,
    @Query('endDateFrom') endDateFrom?: string,
    @Query('endDateTo') endDateTo?: string,
    @Query('minValue') minValue?: string,
    @Query('maxValue') maxValue?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contractsService.findAll(req.user.sub, {
      type,
      status,
      partnerId,
      search,
      startDateFrom: startDateFrom ? new Date(startDateFrom) : undefined,
      startDateTo: startDateTo ? new Date(startDateTo) : undefined,
      endDateFrom: endDateFrom ? new Date(endDateFrom) : undefined,
      endDateTo: endDateTo ? new Date(endDateTo) : undefined,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get contract statistics (Statistici contracte)' })
  async getStats(@Request() req: any) {
    return this.contractsService.getStats(req.user.sub);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get contracts expiring soon (Contracte care expira)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days ahead to check (default: 30)' })
  async getExpiring(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    return this.contractsService.getExpiringContracts(
      req.user.sub,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('for-renewal')
  @ApiOperation({ summary: 'Get contracts eligible for renewal (Contracte pentru reinnoire)' })
  async getForRenewal(@Request() req: any) {
    return this.contractsService.getContractsForRenewal(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID (Detalii contract)' })
  async findById(@Request() req: any, @Param('id') id: string) {
    return this.contractsService.findById(req.user.sub, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contract (Actualizare contract)' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contract (Stergere contract)' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.contractsService.delete(req.user.sub, id);
  }

  // =================== STATUS ACTIONS ===================

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate contract (Activare contract)' })
  async activate(@Request() req: any, @Param('id') id: string) {
    return this.contractsService.activate(req.user.sub, id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Mark contract as signed (Semnare contract)' })
  async sign(@Request() req: any, @Param('id') id: string) {
    return this.contractsService.sign(req.user.sub, id);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend contract (Suspendare contract)' })
  async suspend(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.contractsService.suspend(req.user.sub, id, body.reason);
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate contract (Reziliere contract)' })
  async terminate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.contractsService.terminate(req.user.sub, id, body.reason);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew contract (Reinnoire contract)' })
  async renew(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { newEndDate?: string },
  ) {
    return this.contractsService.renew(req.user.sub, id, body.newEndDate);
  }

  // =================== INVOICE LINKING ===================

  @Get(':id/invoices')
  @ApiOperation({ summary: 'Get linked invoices (Facturi asociate)' })
  async getLinkedInvoices(@Request() req: any, @Param('id') id: string) {
    return this.contractsService.getLinkedInvoices(req.user.sub, id);
  }

  @Post(':id/invoices/:invoiceId')
  @ApiOperation({ summary: 'Link invoice to contract (Asociere factura)' })
  async linkInvoice(
    @Request() req: any,
    @Param('id') id: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.contractsService.linkInvoice(req.user.sub, id, invoiceId);
  }

  @Delete(':id/invoices/:invoiceId')
  @ApiOperation({ summary: 'Unlink invoice from contract (Dezasociere factura)' })
  async unlinkInvoice(
    @Request() req: any,
    @Param('id') id: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.contractsService.unlinkInvoice(req.user.sub, id, invoiceId);
  }
}
