import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { WorkspacesService } from './workspaces.service';

/**
 * Delivery workspaces (W-1). PRO-gated; every route is membership-checked in the
 * service (creator or the engagement's client/expert). GPU pods are unavailable
 * until RUNPOD_API_KEY is configured — create() returns a clear message.
 */
@Controller('delivery-workspaces')
@UseGuards(JwtAuthGuard, TierGuard)
@RequiresTier(Tier.PRO)
export class WorkspacesController {
  constructor(private readonly svc: WorkspacesService) {}

  private uid(req: any): string {
    return req.user?.userId ?? req.user?.id ?? req.user?.sub;
  }
  private org(req: any): string | undefined {
    return req.user?.activeOrganizationId ?? req.headers?.['x-organization-id'];
  }

  @Get()
  list(@Request() req: any) {
    return this.svc.list(this.uid(req));
  }

  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.svc.create(this.uid(req), this.org(req), body);
  }

  @Get(':id')
  get(@Request() req: any, @Param('id') id: string) {
    return this.svc.get(this.uid(req), id);
  }

  @Post(':id/provision')
  provision(@Request() req: any, @Param('id') id: string) {
    return this.svc.provision(this.uid(req), id);
  }

  @Post(':id/stop')
  stop(@Request() req: any, @Param('id') id: string) {
    return this.svc.stop(this.uid(req), id);
  }

  @Post(':id/touch')
  touch(@Request() req: any, @Param('id') id: string) {
    return this.svc.touch(this.uid(req), id);
  }

  @Delete(':id')
  destroy(@Request() req: any, @Param('id') id: string) {
    return this.svc.destroy(this.uid(req), id);
  }

  // ---- milestones ----
  @Post(':id/milestones')
  addMilestone(@Request() req: any, @Param('id') id: string, @Body() body: { title: string; amountEur: number }) {
    return this.svc.addMilestone(this.uid(req), id, body.title, body.amountEur);
  }

  @Post('milestones/:mid/submit')
  submit(@Request() req: any, @Param('mid') mid: string, @Body() body: { note?: string }) {
    return this.svc.submitMilestone(this.uid(req), mid, body?.note);
  }

  @Post('milestones/:mid/approve')
  approve(@Request() req: any, @Param('mid') mid: string) {
    return this.svc.approveMilestone(this.uid(req), mid);
  }
}
