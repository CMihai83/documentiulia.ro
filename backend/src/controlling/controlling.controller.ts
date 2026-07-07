import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ControllingService,
  CostCenter,
  ProfitCenter,
  InternalOrder,
  AllocationCycle,
  VarianceLine,
  CostElementBreakdown,
  ProfitCenterResult,
  ContributionMarginResult,
  KpiCockpit,
  CostCenterCategory,
} from './controlling.service';

class CreateInternalOrderDto {
  code?: string;
  name: string;
  type?: string;
  responsibleCostCenterId: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}
class CreateCostCenterDto {
  code: string;
  name: string;
  nameRo?: string;
  category: CostCenterCategory;
  managerName?: string;
}
class UpsertCostLineDto {
  costCenterId: string;
  costElementId: string;
  period?: string;
  planned: number;
  actual: number;
}
class UpdateInternalOrderDto {
  name?: string;
  budget?: number;
  actual?: number;
  endDate?: string;
  status?: 'open' | 'released' | 'technically_closed' | 'closed';
}
class SegmentDto {
  name?: string;
  profitCenterId?: string;
  revenue?: number;
  cogs?: number;
  directCosts?: number;
  allocatedFixedCosts?: number;
}

/**
 * Controlling (Management Accounting) — SAP CO analog.
 * Base path: /api/v1/controlling. Reads resolve the org from the
 * `x-organization-id` header or the JWT; a demo org is used as a fallback so
 * the showcase works unauthenticated. Writes require a valid JWT.
 */
@Controller('controlling')
export class ControllingController {
  constructor(private readonly controlling: ControllingService) {}

  private orgId(req: any): string {
    return req?.headers?.['x-organization-id'] || req?.user?.organizationId || 'demo-org';
  }
  private userId(req: any): string | undefined {
    return req?.user?.sub || req?.user?.id;
  }

  // ---- Cost Center Accounting (CO-CCA) ----

  @Get('cost-centers')
  getCostCenters(@Request() req: any): Promise<CostCenter[]> {
    return this.controlling.getCostCenters(this.orgId(req));
  }

  @Get('cost-centers/variance')
  getCostCenterVariance(@Request() req: any, @Query('period') period?: string): Promise<VarianceLine[]> {
    return this.controlling.getCostCenterVariance(this.orgId(req), period);
  }

  @Get('cost-centers/:id')
  getCostCenter(@Request() req: any, @Param('id') id: string): Promise<CostCenter> {
    return this.controlling.getCostCenter(this.orgId(req), id);
  }

  @Post('cost-centers')
  @UseGuards(JwtAuthGuard)
  createCostCenter(@Request() req: any, @Body() dto: CreateCostCenterDto): Promise<CostCenter> {
    return this.controlling.createCostCenter(this.orgId(req), dto, this.userId(req));
  }

  @Put('cost-lines')
  @UseGuards(JwtAuthGuard)
  upsertCostLine(@Request() req: any, @Body() dto: UpsertCostLineDto) {
    return this.controlling.upsertCostLine(this.orgId(req), dto, this.userId(req));
  }

  @Get('cost-elements/breakdown')
  getCostElementBreakdown(@Request() req: any, @Query('period') period?: string): Promise<CostElementBreakdown[]> {
    return this.controlling.getCostElementBreakdown(this.orgId(req), period);
  }

  // ---- Profit Center Accounting (EC-PCA) ----

  @Get('profit-centers')
  getProfitCenters(@Request() req: any): Promise<ProfitCenter[]> {
    return this.controlling.getProfitCenters(this.orgId(req));
  }

  @Get('profit-centers/results')
  getProfitCenterResults(@Request() req: any): Promise<ProfitCenterResult[]> {
    return this.controlling.getProfitCenterResults(this.orgId(req));
  }

  // ---- Internal Orders (CO-OM-OPA) ----

  @Get('internal-orders')
  getInternalOrders(@Request() req: any): Promise<InternalOrder[]> {
    return this.controlling.getInternalOrders(this.orgId(req));
  }

  @Get('internal-orders/variance')
  getInternalOrderVariance(@Request() req: any) {
    return this.controlling.getInternalOrderVariance(this.orgId(req));
  }

  @Post('internal-orders')
  @UseGuards(JwtAuthGuard)
  createInternalOrder(@Request() req: any, @Body() dto: CreateInternalOrderDto): Promise<InternalOrder> {
    return this.controlling.createInternalOrder(this.orgId(req), dto, this.userId(req));
  }

  // ---- Allocation / Assessment cycles ----

  @Get('allocation-cycles')
  getAllocationCycles(@Request() req: any): Promise<AllocationCycle[]> {
    return this.controlling.getAllocationCycles(this.orgId(req));
  }

  @Post('allocation-cycles/:id/run')
  @UseGuards(JwtAuthGuard)
  runAllocationCycle(
    @Request() req: any,
    @Param('id') id: string,
    @Query('period') period?: string,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.controlling.runAllocationCycle(this.orgId(req), id, period, {
      dryRun: dryRun === 'true',
      userId: this.userId(req),
    });
  }

  @Get('allocation-cycles/:id/postings')
  getAllocationPostings(@Request() req: any, @Param('id') id: string, @Query('period') period?: string) {
    return this.controlling.getAllocationPostings(this.orgId(req), id, period);
  }

  @Put('internal-orders/:id')
  @UseGuards(JwtAuthGuard)
  updateInternalOrder(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateInternalOrderDto): Promise<InternalOrder> {
    return this.controlling.updateInternalOrder(this.orgId(req), id, dto, this.userId(req));
  }

  @Post('internal-orders/:id/close')
  @UseGuards(JwtAuthGuard)
  closeInternalOrder(@Request() req: any, @Param('id') id: string): Promise<InternalOrder> {
    return this.controlling.closeInternalOrder(this.orgId(req), id, this.userId(req));
  }

  @Post('profitability/segments')
  @UseGuards(JwtAuthGuard)
  createSegment(@Request() req: any, @Body() dto: SegmentDto) {
    return this.controlling.createSegment(this.orgId(req), dto as any, this.userId(req));
  }

  @Put('profitability/segments/:id')
  @UseGuards(JwtAuthGuard)
  updateSegment(@Request() req: any, @Param('id') id: string, @Body() dto: SegmentDto) {
    return this.controlling.updateSegment(this.orgId(req), id, dto, this.userId(req));
  }

  // ---- Profitability Analysis (CO-PA) ----

  @Get('profitability/contribution-margins')
  getContributionMargins(@Request() req: any): Promise<ContributionMarginResult[]> {
    return this.controlling.getContributionMargins(this.orgId(req));
  }

  // ---- KPI cockpit & executive summary ----

  @Get('kpi')
  getKpiCockpit(@Request() req: any, @Query('period') period?: string): Promise<KpiCockpit> {
    return this.controlling.getKpiCockpit(this.orgId(req), period);
  }

  @Get('executive-summary')
  getExecutiveSummary(@Request() req: any, @Query('period') period?: string) {
    return this.controlling.getExecutiveSummary(this.orgId(req), period);
  }
}
