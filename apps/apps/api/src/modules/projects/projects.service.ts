import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, ProjectFilterDto } from './dto/project.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        code: dto.code,
        clientId: dto.clientId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget,
        currency: dto.currency || 'RON',
        status: dto.status || 'PLANNING',
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findAll(companyId: string, filters: ProjectFilterDto) {
    const { status, clientId, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = { companyId };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId },
      include: {
        client: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Proiectul nu a fost găsit');
    }

    return project;
  }

  async update(companyId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(companyId, id);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(companyId: string, id: string) {
    await this.findOne(companyId, id);

    await this.prisma.project.delete({ where: { id } });
    return { message: 'Proiectul a fost șters' };
  }

  async updateStatus(companyId: string, id: string, status: string) {
    await this.findOne(companyId, id);

    return this.prisma.project.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getStats(companyId: string) {
    const [
      total,
      planning,
      inProgress,
      onHold,
      completed,
      cancelled,
      totalBudget,
    ] = await Promise.all([
      this.prisma.project.count({ where: { companyId } }),
      this.prisma.project.count({ where: { companyId, status: 'PLANNING' } }),
      this.prisma.project.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      this.prisma.project.count({ where: { companyId, status: 'ON_HOLD' } }),
      this.prisma.project.count({ where: { companyId, status: 'COMPLETED' } }),
      this.prisma.project.count({ where: { companyId, status: 'CANCELLED' } }),
      this.prisma.project.aggregate({
        where: { companyId, budget: { not: null } },
        _sum: { budget: true },
      }),
    ]);

    return {
      total,
      byStatus: {
        planning,
        inProgress,
        onHold,
        completed,
        cancelled,
      },
      totalBudget: totalBudget._sum.budget?.toNumber() || 0,
    };
  }

  async getByClient(companyId: string, clientId: string) {
    return this.prisma.project.findMany({
      where: { companyId, clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveProjects(companyId: string) {
    return this.prisma.project.findMany({
      where: {
        companyId,
        status: { in: ['PLANNING', 'IN_PROGRESS'] },
      },
      orderBy: { startDate: 'asc' },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  }
}
