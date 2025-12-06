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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EtransportService } from './etransport.service';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('E-Transport')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/etransport')
export class EtransportController {
  constructor(private readonly etransportService: EtransportService) {}

  @Post('declarations')
  @ApiOperation({ summary: 'Create transport declaration and get UIT' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Declaration created' })
  async createDeclaration(
    @Param('companyId') companyId: string,
    @Body() declaration: any,
    @CurrentUser() user: any,
  ) {
    return this.etransportService.createDeclaration(companyId, declaration);
  }

  @Get('declarations')
  @ApiOperation({ summary: 'List all transport declarations' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listDeclarations(
    @Param('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.etransportService.listDeclarations(companyId, {
      status: status as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(String(page)) : 1,
      limit: limit ? parseInt(String(limit)) : 20,
    });
  }

  @Get('declarations/:uit')
  @ApiOperation({ summary: 'Get transport declaration by UIT' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'uit', description: 'Unique Identifier for Transport' })
  async getDeclaration(
    @Param('companyId') companyId: string,
    @Param('uit') uit: string,
  ) {
    return this.etransportService.getDeclaration(companyId, uit);
  }

  @Post('declarations/:uit/start')
  @ApiOperation({ summary: 'Confirm transport start' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'uit', description: 'Unique Identifier for Transport' })
  async confirmStart(
    @Param('companyId') companyId: string,
    @Param('uit') uit: string,
  ) {
    return this.etransportService.confirmStart(companyId, uit);
  }

  @Post('declarations/:uit/delivery')
  @ApiOperation({ summary: 'Confirm transport delivery' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'uit', description: 'Unique Identifier for Transport' })
  async confirmDelivery(
    @Param('companyId') companyId: string,
    @Param('uit') uit: string,
    @Body() deliveryData: { dataLivrare: string; observatii?: string },
  ) {
    return this.etransportService.confirmDelivery(companyId, uit, deliveryData);
  }

  @Delete('declarations/:uit')
  @ApiOperation({ summary: 'Cancel transport declaration' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'uit', description: 'Unique Identifier for Transport' })
  async cancelDeclaration(
    @Param('companyId') companyId: string,
    @Param('uit') uit: string,
    @Body('reason') reason: string,
  ) {
    return this.etransportService.cancelDeclaration(companyId, uit, reason);
  }

  @Get('declarations/:uit/xml')
  @ApiOperation({ summary: 'Download declaration XML' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'uit', description: 'Unique Identifier for Transport' })
  async downloadXml(
    @Param('companyId') companyId: string,
    @Param('uit') uit: string,
    @Res() res: Response,
  ) {
    const declaration = await this.etransportService.getDeclaration(companyId, uit);
    const xml = this.etransportService.generateDeclarationXml(declaration);

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="etransport-${uit}.xml"`);
    res.send(xml);
  }

  @Get('counties')
  @ApiOperation({ summary: 'Get Romanian county codes' })
  async getCountyCodes() {
    return this.etransportService.getCountyCodes();
  }

  @Get('operation-types')
  @ApiOperation({ summary: 'Get operation type codes and descriptions' })
  async getOperationTypes() {
    return [
      { code: 'AIC', description: 'Achiziție intracomunitară' },
      { code: 'AIE', description: 'Aprovizionare internă pentru export' },
      { code: 'LHI', description: 'Livrare high-risk în interiorul țării' },
      { code: 'TDT', description: 'Transport domestic taxabil' },
      { code: 'ACI', description: 'Achiziție comercială internațională' },
    ];
  }
}
