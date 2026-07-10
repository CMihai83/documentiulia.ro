import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { MeetingDto, MeetingsService } from './meetings.service';

/** REQ-040 — org meetings/appointments (the legacy job-scheduler service in this dir is unrelated and stays unregistered). */
@Controller('scheduling')
@UseGuards(JwtAuthGuard, TierGuard)
@RequiresTier(Tier.PRO)
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  private orgId(req: any): string {
    return req?.headers?.['x-organization-id'] || req?.user?.activeOrganizationId || req?.user?.id;
  }

  @Get('meetings')
  list(@Request() req: any) {
    return this.meetings.list(this.orgId(req));
  }

  @Get('upcoming')
  upcoming(@Request() req: any, @Query('days') days?: string) {
    return this.meetings.upcoming(this.orgId(req), days ? parseInt(days, 10) : 7);
  }

  @Post('meetings')
  create(@Request() req: any, @Body() dto: MeetingDto) {
    return this.meetings.create(this.orgId(req), req.user?.id ?? 'unknown', dto);
  }

  @Patch('meetings/:id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<MeetingDto> & { status?: string }) {
    return this.meetings.update(this.orgId(req), id, dto);
  }

  @Delete('meetings/:id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.meetings.remove(this.orgId(req), id);
  }
}
