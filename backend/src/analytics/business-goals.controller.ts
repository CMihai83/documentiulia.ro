import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { BusinessGoalsService, GoalDto } from './business-goals.service';

/** REQ-040 — business goals + progress from real invoice/partner data. */
@Controller('analytics/goals')
@UseGuards(JwtAuthGuard, TierGuard)
@RequiresTier(Tier.PRO)
export class BusinessGoalsController {
  constructor(private readonly goals: BusinessGoalsService) {}

  private orgId(req: any): string {
    return req?.headers?.['x-organization-id'] || req?.user?.activeOrganizationId || req?.user?.id;
  }

  @Get()
  list(@Request() req: any) {
    return this.goals.list(this.orgId(req));
  }

  @Get('progress')
  progress(@Request() req: any) {
    return this.goals.progress(this.orgId(req), req.user?.id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: GoalDto) {
    return this.goals.create(this.orgId(req), dto);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<GoalDto>) {
    return this.goals.update(this.orgId(req), id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.goals.remove(this.orgId(req), id);
  }
}
