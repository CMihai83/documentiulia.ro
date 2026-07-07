import { Body, Controller, Get, Header, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SimV2Service } from './simv2.service';
import { SimDecision, TickType } from './simv2.types';

class CreateRunDto {
  scenarioKey?: string;
  mode?: 'practice' | 'scored';
  seed?: number;
  businessId?: string;
}

class AdvanceDto {
  tickType?: TickType;
  ticks?: number;
  decisions?: SimDecision[];
}

/**
 * Simulator v2 (S-48) — three-tier tick engine with Focus budget,
 * deferred consequences and macro cycles. Base path: /api/v1/simulation/v2
 */
@Controller('simulation/v2')
@UseGuards(JwtAuthGuard)
export class SimV2Controller {
  constructor(private readonly sim: SimV2Service) {}

  private userId(req: any): string {
    return req?.user?.sub || req?.user?.id || 'demo-user';
  }

  /** Scenario presets, decision catalog and tick granularities. */
  @Get('catalog')
  catalog() {
    return this.sim.getCatalog();
  }

  @Post('runs')
  createRun(@Request() req: any, @Body() dto: CreateRunDto) {
    return this.sim.createRun(this.userId(req), dto ?? {});
  }

  @Get('runs')
  listRuns(@Request() req: any) {
    return this.sim.listRuns(this.userId(req));
  }

  @Get('runs/:id')
  getRun(@Request() req: any, @Param('id') id: string) {
    return this.sim.getRun(this.userId(req), id);
  }

  /** Advance time: {tickType: day|week|month, ticks, decisions[]}. */
  @Post('runs/:id/advance')
  advance(@Request() req: any, @Param('id') id: string, @Body() dto: AdvanceDto) {
    return this.sim.advance(this.userId(req), id, dto ?? {});
  }

  /** KPI time series for the evolution dashboard. */
  @Get('runs/:id/history')
  history(@Request() req: any, @Param('id') id: string, @Query('fromTick') fromTick?: string) {
    return this.sim.history(this.userId(req), id, fromTick ? parseInt(fromTick, 10) : 0);
  }

  /** KPI time series as CSV for after-action review (SIM-7). */
  @Get('runs/:id/history.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="sim-history.csv"')
  historyCsv(@Request() req: any, @Param('id') id: string) {
    return this.sim.historyCsv(this.userId(req), id);
  }

  /** Pending-consequences ledger + open issues + events awaiting a choice (SIM-5). */
  @Get('runs/:id/pending')
  pending(@Request() req: any, @Param('id') id: string) {
    return this.sim.pendingEffects(this.userId(req), id);
  }

  /** Respond to a fired event's choice (SIM-5). */
  @Post('runs/:id/events/:eventId/respond')
  respondToEvent(@Request() req: any, @Param('id') id: string, @Param('eventId') eventId: string, @Body() dto: { choiceIndex: number }) {
    return this.sim.respondToEvent(this.userId(req), id, eventId, dto?.choiceIndex ?? 0);
  }

  @Post('runs/:id/pause')
  pause(@Request() req: any, @Param('id') id: string) {
    return this.sim.setStatus(this.userId(req), id, 'paused');
  }

  @Post('runs/:id/resume')
  resume(@Request() req: any, @Param('id') id: string) {
    return this.sim.setStatus(this.userId(req), id, 'active');
  }

  @Post('runs/:id/end')
  end(@Request() req: any, @Param('id') id: string) {
    return this.sim.setStatus(this.userId(req), id, 'ended');
  }
}
