import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Epic,
  Sprint,
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  EpicStatus,
  SprintStatus,
  ModuleType,
} from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  // ===== EPICS =====

  async findAllEpics(): Promise<Epic[]> {
    return this.prisma.epic.findMany({
      include: {
        sprints: true,
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { priority: 'asc' },
    });
  }

  async findEpicByCode(code: string): Promise<Epic> {
    const epic = await this.prisma.epic.findUnique({
      where: { code },
      include: {
        sprints: {
          include: {
            tasks: true,
          },
        },
        tasks: true,
      },
    });
    if (!epic) throw new NotFoundException(`Epic ${code} not found`);
    return epic;
  }

  async createEpic(data: {
    code: string;
    name: string;
    description?: string;
    module: ModuleType;
    color?: string;
    icon?: string;
    priority?: number;
  }): Promise<Epic> {
    return this.prisma.epic.create({ data });
  }

  async updateEpicProgress(epicId: string): Promise<Epic> {
    const tasks = await this.prisma.task.findMany({
      where: { epicId },
      select: { status: true },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'DONE').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return this.prisma.epic.update({
      where: { id: epicId },
      data: {
        progress,
        status:
          progress === 100
            ? 'COMPLETED'
            : progress > 0
              ? 'IN_PROGRESS'
              : 'PLANNED',
        completedAt: progress === 100 ? new Date() : null,
      },
    });
  }

  // ===== SPRINTS =====

  async findAllSprints(): Promise<Sprint[]> {
    return this.prisma.sprint.findMany({
      include: {
        epic: true,
        tasks: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findActiveSprint(): Promise<Sprint | null> {
    return this.prisma.sprint.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        epic: true,
        tasks: {
          include: { epic: true },
          orderBy: { priority: 'asc' },
        },
      },
    });
  }

  async createSprint(data: {
    name: string;
    goal?: string;
    epicId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Sprint> {
    return this.prisma.sprint.create({ data });
  }

  async startSprint(sprintId: string): Promise<Sprint> {
    // End any active sprints first
    await this.prisma.sprint.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    });

    return this.prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'ACTIVE' },
    });
  }

  async completeSprint(sprintId: string): Promise<Sprint> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { tasks: true },
    });
    if (!sprint) throw new NotFoundException(`Sprint ${sprintId} not found`);

    const completedPoints = sprint.tasks
      .filter((t) => t.status === 'DONE')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: 'COMPLETED',
        completedPoints,
      },
    });
  }

  // ===== TASKS =====

  async findAllTasks(filters?: {
    epicId?: string;
    sprintId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
  }): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: filters,
      include: {
        epic: true,
        sprint: true,
        blockedBy: true,
        blocks: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findBacklog(): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { status: 'BACKLOG', sprintId: null },
      include: { epic: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findTaskByCode(code: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { code },
      include: {
        epic: true,
        sprint: true,
        blockedBy: true,
        blocks: true,
        comments: true,
      },
    });
    if (!task) throw new NotFoundException(`Task ${code} not found`);
    return task;
  }

  async createTask(data: {
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
  }): Promise<Task> {
    // Generate task code
    const epic = await this.prisma.epic.findUnique({
      where: { id: data.epicId },
    });
    if (!epic) throw new NotFoundException(`Epic ${data.epicId} not found`);
    const taskCount = await this.prisma.task.count({
      where: { epicId: data.epicId },
    });
    const code = `${epic.code}-${String(taskCount + 1).padStart(3, '0')}`;

    return this.prisma.task.create({
      data: { ...data, code },
    });
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<Task> {
    const updateData: any = { status };

    if (status === 'IN_PROGRESS' && !updateData.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === 'DONE') {
      updateData.completedAt = new Date();
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: { epic: true },
    });

    // Update epic progress
    await this.updateEpicProgress(task.epicId);

    return task;
  }

  async moveTaskToSprint(taskId: string, sprintId: string): Promise<Task> {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { sprintId, status: 'TODO' },
    });
  }

  async addTaskComment(
    taskId: string,
    content: string,
    authorId?: string,
  ): Promise<Task> {
    await this.prisma.taskComment.create({
      data: { taskId, content, authorId },
    });

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { comments: true },
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);
    return task;
  }

  // ===== ROADMAP / DASHBOARD =====

  async getRoadmapSummary(): Promise<{
    epics: Array<{
      code: string;
      name: string;
      module: ModuleType;
      progress: number;
      status: EpicStatus;
      taskStats: { total: number; done: number; inProgress: number };
    }>;
    activeSprint: Sprint | null;
    backlogCount: number;
    velocity: number;
  }> {
    const epics = await this.prisma.epic.findMany({
      include: {
        tasks: {
          select: { status: true },
        },
      },
      orderBy: { priority: 'asc' },
    });

    const activeSprint = await this.findActiveSprint();
    const backlogCount = await this.prisma.task.count({
      where: { status: 'BACKLOG', sprintId: null },
    });

    // Calculate velocity from last 3 completed sprints
    const completedSprints = await this.prisma.sprint.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      take: 3,
      select: { completedPoints: true },
    });
    const velocity =
      completedSprints.length > 0
        ? Math.round(
            completedSprints.reduce((sum, s) => sum + s.completedPoints, 0) /
              completedSprints.length,
          )
        : 0;

    return {
      epics: epics.map((e) => ({
        code: e.code,
        name: e.name,
        module: e.module,
        progress: e.progress,
        status: e.status,
        taskStats: {
          total: e.tasks.length,
          done: e.tasks.filter((t) => t.status === 'DONE').length,
          inProgress: e.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        },
      })),
      activeSprint,
      backlogCount,
      velocity,
    };
  }

  // ===== SEED DATA =====

  async seedEpics(): Promise<void> {
    const epics = [
      {
        code: 'FINANCE',
        name: 'Finance Module',
        description:
          'VAT 21%/11% Calculator, e-Factura, SAF-T D406, Financial Close/Consolidation, Invoicing/Billing, Compliance Alerts',
        module: 'FINANCE' as ModuleType,
        color: '#10B981',
        icon: 'Calculator',
        priority: 1,
      },
      {
        code: 'OPERATIONS',
        name: 'Operations Module',
        description:
          'Inventory Management, Project Management, Supply Chain/Procurement, RO e-Transport, CRM',
        module: 'OPERATIONS' as ModuleType,
        color: '#3B82F6',
        icon: 'Package',
        priority: 2,
      },
      {
        code: 'HR',
        name: 'HR Module',
        description:
          'ATS Recruitment, Payroll Fusion with SAGA, Contract Management, Performance/Wellness, Self-Service',
        module: 'HR' as ModuleType,
        color: '#8B5CF6',
        icon: 'Users',
        priority: 3,
      },
      {
        code: 'FUNDS',
        name: 'Funds Module',
        description:
          'PNRR/Cohesion Eligibility Scanner, Application Automator, Subsidy Tracking',
        module: 'FUNDS' as ModuleType,
        color: '#F59E0B',
        icon: 'Banknote',
        priority: 4,
      },
      {
        code: 'AI_ML',
        name: 'AI/ML Module',
        description:
          'Logic Engine (Grok/Llama3), OCR with LayoutLMv3, Prophet Forecasts, GenAI Automation',
        module: 'AI_ML' as ModuleType,
        color: '#EC4899',
        icon: 'Brain',
        priority: 5,
      },
      {
        code: 'COMPLIANCE',
        name: 'Compliance Module',
        description:
          'ANAF API (SPV, D406), SAGA v3.2 REST Integration, DUKIntegrator Validation, Alerts/Checks',
        module: 'COMPLIANCE' as ModuleType,
        color: '#EF4444',
        icon: 'Shield',
        priority: 6,
      },
      {
        code: 'OPS_CTRL',
        name: 'Operations Control Module',
        description:
          'Live Dashboard with Recharts, Alerts/Calendar, Timesheets App',
        module: 'OPERATIONS_CONTROL' as ModuleType,
        color: '#14B8A6',
        icon: 'Activity',
        priority: 7,
      },
      {
        code: 'ECOSYSTEM',
        name: 'Ecosystem Module',
        description:
          'Forum with Pinecone semantic search, 24 Adaptive Courses, Blog with 15 articles',
        module: 'ECOSYSTEM' as ModuleType,
        color: '#6366F1',
        icon: 'Globe',
        priority: 8,
      },
      {
        code: 'ONBOARD',
        name: 'Onboarding Module',
        description:
          'Business Type Partitioning (construction, logistics, healthcare, agri, etc.), Min-Input Wizards',
        module: 'ONBOARDING' as ModuleType,
        color: '#84CC16',
        icon: 'Rocket',
        priority: 9,
      },
      {
        code: 'PRICING',
        name: 'Pricing/Support Module',
        description:
          'Freemium Tiers (Gratuit, Pro 49 RON, Business 149 RON), /contact, /help FAQ, /terms/privacy',
        module: 'PRICING_SUPPORT' as ModuleType,
        color: '#F97316',
        icon: 'CreditCard',
        priority: 10,
      },
    ];

    for (const epic of epics) {
      await this.prisma.epic.upsert({
        where: { code: epic.code },
        update: epic,
        create: epic,
      });
    }

    // Add some initial tasks for the Finance module (already partially done)
    const financeEpic = await this.prisma.epic.findUnique({
      where: { code: 'FINANCE' },
    });

    if (!financeEpic) return; // Finance epic should exist after seeding

    const financeTasks = [
      {
        title: 'VAT 21%/11% Calculator Service',
        description: 'Implement VAT calculation with Legea 141/2025 rates',
        type: 'STORY' as TaskType,
        priority: 'HIGH' as TaskPriority,
        status: 'DONE' as TaskStatus,
        storyPoints: 5,
        complianceRef: 'LEGEA-141-2025',
        labels: ['vat', 'compliance'],
      },
      {
        title: 'SAF-T D406 XML Generation',
        description: 'Generate monthly/quarterly D406 XML per Order 1783/2021',
        type: 'STORY' as TaskType,
        priority: 'CRITICAL' as TaskPriority,
        status: 'DONE' as TaskStatus,
        storyPoints: 8,
        complianceRef: 'ANAF-D406',
        labels: ['saft', 'anaf', 'compliance'],
      },
      {
        title: 'e-Factura UBL 2.1 Generation',
        description: 'Generate e-Factura XML in UBL 2.1 format for SPV',
        type: 'STORY' as TaskType,
        priority: 'CRITICAL' as TaskPriority,
        status: 'DONE' as TaskStatus,
        storyPoints: 8,
        complianceRef: 'ANAF-EFACTURA',
        labels: ['efactura', 'anaf', 'compliance'],
      },
      {
        title: 'Invoice CRUD Operations',
        description: 'Full invoice management with SAGA sync',
        type: 'STORY' as TaskType,
        priority: 'HIGH' as TaskPriority,
        status: 'DONE' as TaskStatus,
        storyPoints: 5,
        labels: ['invoices'],
      },
      {
        title: 'Financial Close Dashboard',
        description: 'AI analytics for financial close with anomaly detection',
        type: 'STORY' as TaskType,
        priority: 'MEDIUM' as TaskPriority,
        status: 'BACKLOG' as TaskStatus,
        storyPoints: 13,
        labels: ['analytics', 'ai'],
      },
    ];

    for (let i = 0; i < financeTasks.length; i++) {
      const code = `FINANCE-${String(i + 1).padStart(3, '0')}`;
      await this.prisma.task.upsert({
        where: { code },
        update: { ...financeTasks[i], epicId: financeEpic.id },
        create: { ...financeTasks[i], epicId: financeEpic.id, code },
      });
    }

    // Update epic progress
    await this.updateEpicProgress(financeEpic.id);
  }
}
