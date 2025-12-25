import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TaskStatus, TaskPriority, TaskType, ModuleType } from '@prisma/client';

@Controller('project')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  // ===== ROADMAP =====

  @Get('roadmap')
  async getRoadmap() {
    return this.projectService.getRoadmapSummary();
  }

  // ===== EPICS =====

  @Get('epics')
  async findAllEpics() {
    return this.projectService.findAllEpics();
  }

  @Get('epics/:code')
  async findEpicByCode(@Param('code') code: string) {
    return this.projectService.findEpicByCode(code);
  }

  @Post('epics')
  @Roles('ADMIN')
  async createEpic(
    @Body()
    body: {
      code: string;
      name: string;
      description?: string;
      module: ModuleType;
      color?: string;
      icon?: string;
      priority?: number;
    },
  ) {
    return this.projectService.createEpic(body);
  }

  // ===== SPRINTS =====

  @Get('sprints')
  async findAllSprints() {
    return this.projectService.findAllSprints();
  }

  @Get('sprints/active')
  async findActiveSprint() {
    return this.projectService.findActiveSprint();
  }

  @Post('sprints')
  @Roles('ADMIN')
  async createSprint(
    @Body()
    body: {
      name: string;
      goal?: string;
      epicId: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    return this.projectService.createSprint(body);
  }

  @Put('sprints/:id/start')
  @Roles('ADMIN')
  async startSprint(@Param('id') id: string) {
    return this.projectService.startSprint(id);
  }

  @Put('sprints/:id/complete')
  @Roles('ADMIN')
  async completeSprint(@Param('id') id: string) {
    return this.projectService.completeSprint(id);
  }

  // ===== TASKS =====

  @Get('tasks')
  async findAllTasks(
    @Query('epicId') epicId?: string,
    @Query('sprintId') sprintId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('type') type?: TaskType,
  ) {
    return this.projectService.findAllTasks({
      epicId,
      sprintId,
      status,
      priority,
      type,
    });
  }

  @Get('tasks/backlog')
  async findBacklog() {
    return this.projectService.findBacklog();
  }

  @Get('tasks/:code')
  async findTaskByCode(@Param('code') code: string) {
    return this.projectService.findTaskByCode(code);
  }

  @Post('tasks')
  async createTask(
    @Body()
    body: {
      title: string;
      description?: string;
      epicId: string;
      sprintId?: string;
      type?: TaskType;
      priority?: TaskPriority;
      storyPoints?: number;
      labels?: string[];
      complianceRef?: string;
      dueDate?: Date;
    },
  ) {
    return this.projectService.createTask(body);
  }

  @Put('tasks/:id/status')
  async updateTaskStatus(
    @Param('id') id: string,
    @Body('status') status: TaskStatus,
  ) {
    return this.projectService.updateTaskStatus(id, status);
  }

  @Put('tasks/:id/sprint')
  async moveTaskToSprint(
    @Param('id') id: string,
    @Body('sprintId') sprintId: string,
  ) {
    return this.projectService.moveTaskToSprint(id, sprintId);
  }

  @Post('tasks/:id/comments')
  async addTaskComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @Body('authorId') authorId?: string,
  ) {
    return this.projectService.addTaskComment(id, content, authorId);
  }

  // ===== SEED =====

  @Post('seed')
  @Roles('ADMIN')
  async seedEpics() {
    await this.projectService.seedEpics();
    return { message: 'Epics and tasks seeded successfully' };
  }
}
