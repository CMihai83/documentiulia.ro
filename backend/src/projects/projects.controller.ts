import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequiresTier } from '../auth/tiers.decorator';
import { Tier } from '@prisma/client';
import { ProjectDto, ProjectsService } from './projects.service';

/** REQ-040 — org-scoped project management (the /pm/* module serves epics/kanban, not projects). */
@Controller('projects')
@UseGuards(JwtAuthGuard, TierGuard)
@RequiresTier(Tier.PRO)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  private orgId(req: any): string {
    return req?.headers?.['x-organization-id'] || req?.user?.activeOrganizationId || req?.user?.id;
  }

  @Get()
  list(@Request() req: any) {
    return this.projects.list(this.orgId(req));
  }

  @Post()
  create(@Request() req: any, @Body() dto: ProjectDto) {
    return this.projects.create(this.orgId(req), dto);
  }

  @Get(':id')
  get(@Request() req: any, @Param('id') id: string) {
    return this.projects.get(this.orgId(req), id);
  }

  @Get(':id/stats')
  stats(@Request() req: any, @Param('id') id: string) {
    return this.projects.stats(this.orgId(req), id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<ProjectDto>) {
    return this.projects.update(this.orgId(req), id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.projects.remove(this.orgId(req), id);
  }

  @Post(':id/tasks')
  addTask(@Request() req: any, @Param('id') id: string, @Body() dto: { title: string; status?: string; assignee?: string; dueDate?: string; priority?: string }) {
    return this.projects.addTask(this.orgId(req), id, dto);
  }

  @Patch('tasks/:taskId')
  updateTask(@Request() req: any, @Param('taskId') taskId: string, @Body() dto: { title?: string; status?: string; assignee?: string; priority?: string }) {
    return this.projects.updateTask(this.orgId(req), taskId, dto);
  }

  @Post(':id/milestones')
  addMilestone(@Request() req: any, @Param('id') id: string, @Body() dto: { title: string; dueDate?: string }) {
    return this.projects.addMilestone(this.orgId(req), id, dto);
  }

  @Patch('milestones/:milestoneId')
  setMilestoneDone(@Request() req: any, @Param('milestoneId') milestoneId: string, @Body() dto: { done: boolean }) {
    return this.projects.setMilestoneDone(this.orgId(req), milestoneId, !!dto?.done);
  }
}
