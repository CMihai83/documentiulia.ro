import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SagaService } from './saga.service';

@ApiTags('saga')
@ApiBearerAuth()
@Controller('saga')
export class SagaController {
  constructor(private readonly sagaService: SagaService) {}

  @Post('sync/invoice')
  @ApiOperation({ summary: 'Sync invoice to SAGA v3.2' })
  async syncInvoice(@Body() invoice: any) {
    return this.sagaService.syncInvoice(invoice);
  }

  @Get('invoice/:sagaId/print')
  @ApiOperation({ summary: 'Print invoice from SAGA' })
  async printInvoice(@Param('sagaId') sagaId: string) {
    const pdf = await this.sagaService.printInvoice(sagaId);
    return { pdf: pdf.toString('base64') };
  }

  @Delete('invoice/:sagaId')
  @ApiOperation({ summary: 'Delete invoice from SAGA' })
  async deleteInvoice(@Param('sagaId') sagaId: string) {
    await this.sagaService.deleteInvoice(sagaId);
    return { success: true };
  }

  @Post('sync/payroll')
  @ApiOperation({ summary: 'Sync payroll data to SAGA' })
  async syncPayroll(@Body() payrollData: any) {
    return this.sagaService.syncPayroll(payrollData);
  }

  @Post('sync/inventory')
  @ApiOperation({ summary: 'Sync inventory to SAGA' })
  async syncInventory(@Body() inventoryData: any) {
    return this.sagaService.syncInventory(inventoryData);
  }

  @Get('saft/generate')
  @ApiOperation({ summary: 'Generate SAF-T XML from SAGA data' })
  async generateSAFT(@Query('period') period: string) {
    const xml = await this.sagaService.generateSAFTXml(period);
    return { xml };
  }

  @Post('saft/validate')
  @ApiOperation({ summary: 'Validate SAF-T XML with DUKIntegrator' })
  async validateSAFT(@Body() body: { xml: string }) {
    return this.sagaService.validateWithDUK(body.xml);
  }
}
