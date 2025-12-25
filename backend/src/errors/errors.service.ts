import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateErrorDto } from './dto/create-error.dto';

@Injectable()
export class ErrorsService {
  private readonly logger = new Logger(ErrorsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createErrorDto: CreateErrorDto) {
    try {
      return await this.prisma.errorLog.create({
        data: {
          message: createErrorDto.message,
          stack: createErrorDto.stack || '',
          type: createErrorDto.type,
          componentStack: createErrorDto.componentStack || '',
          url: createErrorDto.url || '',
          userAgent: createErrorDto.userAgent || '',
          userId: createErrorDto.userId || 'anonymous',
          source: createErrorDto.source || 'frontend',
          metadata: createErrorDto.metadata ? JSON.stringify(createErrorDto.metadata) : '{}',
        },
      });
    } catch (error) {
      this.logger.error('Failed to create error log', error);
      throw error;
    }
  }

  async createBatch(errors: CreateErrorDto[]) {
    try {
      const result = await this.prisma.errorLog.createMany({
        data: errors.map(error => ({
          message: error.message,
          stack: error.stack || '',
          type: error.type,
          componentStack: error.componentStack || '',
          url: error.url || '',
          userAgent: error.userAgent || '',
          userId: error.userId || 'anonymous',
          source: error.source || 'frontend',
          metadata: error.metadata ? JSON.stringify(error.metadata) : '{}',
        })),
        skipDuplicates: true,
      });
      return { count: result.count };
    } catch (error) {
      this.logger.error('Failed to create batch error logs', error);
      throw error;
    }
  }

  async findAll(options: {
    page: number;
    limit: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    source?: string;
  }) {
    const { page, limit, type, startDate, endDate, userId, source } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (userId) {
      where.userId = userId;
    }

    if (source) {
      where.source = source;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [errors, total] = await Promise.all([
      this.prisma.errorLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.errorLog.count({ where }),
    ]);

    return {
      errors: errors.map(error => ({
        ...error,
        metadata: error.metadata ? JSON.parse(error.metadata as string) : {},
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const error = await this.prisma.errorLog.findUnique({
      where: { id },
    });

    if (error) {
      return {
        ...error,
        metadata: error.metadata ? JSON.parse(error.metadata as string) : {},
      };
    }

    return null;
  }

  async getStats() {
    const [total, byType, last24h, last7d] = await Promise.all([
      this.prisma.errorLog.count(),
      this.prisma.errorLog.groupBy({
        by: ['type'],
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
      }),
      this.prisma.errorLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.errorLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      last24h,
      last7d,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.type,
      })),
    };
  }

  async delete(id: string) {
    return this.prisma.errorLog.delete({
      where: { id },
    });
  }

  async deleteOld(daysToKeep: number = 30) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const result = await this.prisma.errorLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    this.logger.log(`Deleted ${result.count} old error logs`);
    return result;
  }
}
