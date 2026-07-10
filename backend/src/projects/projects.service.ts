import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProjectDto {
  name: string;
  description?: string;
  clientName?: string;
  status?: string;
  startDate?: string;
  dueDate?: string;
  budgetRon?: number;
  spentRon?: number;
  managerName?: string;
  teamNames?: string[];
  progressPct?: number;
}

const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
const TASK_STATUSES = ['todo', 'in_progress', 'completed'];

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.project.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { tasks: true, milestones: true } } },
    });
  }

  async get(orgId: string, id: string) {
    const p = await this.prisma.project.findFirst({
      where: { id, orgId },
      include: {
        tasks: { orderBy: { createdAt: 'asc' } },
        milestones: { orderBy: { dueDate: 'asc' } },
      },
    });
    if (!p) throw new NotFoundException('Proiectul nu există.');
    return p;
  }

  create(orgId: string, dto: ProjectDto) {
    return this.prisma.project.create({
      data: {
        orgId,
        name: dto.name,
        description: dto.description,
        clientName: dto.clientName,
        status: STATUSES.includes(dto.status ?? '') ? dto.status : 'planning',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        budgetRon: dto.budgetRon,
        spentRon: dto.spentRon,
        managerName: dto.managerName,
        teamNames: dto.teamNames ?? [],
        progressPct: Math.min(100, Math.max(0, dto.progressPct ?? 0)),
      },
    });
  }

  async update(orgId: string, id: string, dto: Partial<ProjectDto>) {
    await this.get(orgId, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.clientName !== undefined && { clientName: dto.clientName }),
        ...(dto.status !== undefined && STATUSES.includes(dto.status) && { status: dto.status }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.budgetRon !== undefined && { budgetRon: dto.budgetRon }),
        ...(dto.spentRon !== undefined && { spentRon: dto.spentRon }),
        ...(dto.managerName !== undefined && { managerName: dto.managerName }),
        ...(dto.teamNames !== undefined && { teamNames: dto.teamNames }),
        ...(dto.progressPct !== undefined && { progressPct: Math.min(100, Math.max(0, dto.progressPct)) }),
      },
    });
  }

  async remove(orgId: string, id: string) {
    await this.get(orgId, id);
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  /** Pure stats math — unit-tested. */
  static computeStats(p: {
    budgetRon?: unknown;
    spentRon?: unknown;
    dueDate?: Date | null;
    tasks: { status: string }[];
    milestones: { done: boolean }[];
  }, now: Date = new Date()) {
    const budget = p.budgetRon != null ? Number(p.budgetRon) : null;
    const spent = p.spentRon != null ? Number(p.spentRon) : null;
    const tasksByStatus = { todo: 0, in_progress: 0, completed: 0 } as Record<string, number>;
    for (const t of p.tasks) if (tasksByStatus[t.status] !== undefined) tasksByStatus[t.status]++;
    const milestonesDone = p.milestones.filter((m) => m.done).length;
    const daysRemaining = p.dueDate
      ? Math.ceil((p.dueDate.getTime() - now.getTime()) / 86_400_000)
      : null;
    return {
      tasks: { total: p.tasks.length, todo: tasksByStatus.todo, in_progress: tasksByStatus.in_progress, completed: tasksByStatus.completed },
      milestones: { total: p.milestones.length, done: milestonesDone },
      budget: {
        budgetRon: budget,
        spentRon: spent,
        remainingRon: budget != null && spent != null ? Math.round((budget - spent) * 100) / 100 : null,
        utilizationPct: budget ? Math.round(((spent ?? 0) / budget) * 100) : null,
      },
      daysRemaining,
      overdue: daysRemaining != null && daysRemaining < 0,
    };
  }

  async stats(orgId: string, id: string) {
    const p = await this.get(orgId, id);
    return ProjectsService.computeStats(p as any);
  }

  async addTask(orgId: string, projectId: string, dto: { title: string; status?: string; assignee?: string; dueDate?: string; priority?: string }) {
    await this.get(orgId, projectId);
    return this.prisma.projectTask.create({
      data: {
        projectId,
        title: dto.title,
        status: TASK_STATUSES.includes(dto.status ?? '') ? dto.status : 'todo',
        assignee: dto.assignee,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: ['low', 'medium', 'high'].includes(dto.priority ?? '') ? dto.priority : 'medium',
      },
    });
  }

  async updateTask(orgId: string, taskId: string, dto: { title?: string; status?: string; assignee?: string; priority?: string }) {
    const task = await this.prisma.projectTask.findFirst({ where: { id: taskId }, include: { project: true } });
    if (!task || task.project.orgId !== orgId) throw new NotFoundException('Sarcina nu există.');
    return this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.status !== undefined && TASK_STATUSES.includes(dto.status) && { status: dto.status }),
        ...(dto.assignee !== undefined && { assignee: dto.assignee }),
        ...(dto.priority !== undefined && ['low', 'medium', 'high'].includes(dto.priority) && { priority: dto.priority }),
      },
    });
  }

  async addMilestone(orgId: string, projectId: string, dto: { title: string; dueDate?: string }) {
    await this.get(orgId, projectId);
    return this.prisma.projectMilestone.create({
      data: { projectId, title: dto.title, dueDate: dto.dueDate ? new Date(dto.dueDate) : null },
    });
  }

  async setMilestoneDone(orgId: string, milestoneId: string, done: boolean) {
    const m = await this.prisma.projectMilestone.findFirst({ where: { id: milestoneId }, include: { project: true } });
    if (!m || m.project.orgId !== orgId) throw new NotFoundException('Jalonul nu există.');
    return this.prisma.projectMilestone.update({ where: { id: milestoneId }, data: { done } });
  }
}
