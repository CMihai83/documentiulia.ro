import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Client created' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateClientDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.create(companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['COMPANY', 'INDIVIDUAL'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Clients returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.clientsService.findAll(companyId, user.id, { search, type, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Client returned' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.findOne(companyId, id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Client updated' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.update(companyId, id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete client' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 204, description: 'Client deleted' })
  @ApiResponse({ status: 403, description: 'Cannot delete client with invoices' })
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.delete(companyId, id, user.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get client statistics' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Stats returned' })
  async getStats(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.getStats(companyId, id, user.id);
  }
}
