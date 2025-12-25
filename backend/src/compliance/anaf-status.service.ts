import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AnafSubmissionStatus {
  id: string;
  type: 'EFACTURA' | 'SAFT' | 'D112' | 'D394' | 'REVISAL' | 'D406';
  referenceId: string;
  status: 'PENDING' | 'SUBMITTED' | 'PROCESSING' | 'ACCEPTED' | 'REJECTED' | 'ERROR';
  submittedAt: Date;
  processedAt?: Date;
  errorMessage?: string;
  indexIncarcare?: string;
  details?: any;
}

export interface ComplianceOverview {
  efactura: {
    pending: number;
    submitted: number;
    accepted: number;
    rejected: number;
  };
  saft: {
    lastSubmission: Date | null;
    status: string;
    nextDeadline: string;
  };
  d112: {
    lastSubmission: Date | null;
    currentPeriod: string;
    submitted: boolean;
  };
  d394: {
    lastSubmission: Date | null;
    currentPeriod: string;
    submitted: boolean;
  };
  revisal: {
    pendingChanges: number;
    lastSubmission: Date | null;
  };
}

@Injectable()
export class AnafStatusService {
  private readonly logger = new Logger(AnafStatusService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive ANAF compliance status
   */
  async getComplianceOverview(userId: string): Promise<ComplianceOverview> {
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Get all audit logs for submissions
    const allLogs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: {
          in: ['EFACTURA_SUBMISSION', 'SAFT_SUBMISSION', 'D112_SUBMISSION', 'D394_SUBMISSION', 'REVISAL_SUBMISSION'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // e-Factura status
    const efacturaLogs = allLogs.filter(l => l.action === 'EFACTURA_SUBMISSION');
    const efacturaStats = {
      pending: 0,
      submitted: 0,
      accepted: 0,
      rejected: 0,
    };
    efacturaLogs.forEach(log => {
      const data = (log.details as any) || {};
      switch (data.status) {
        case 'PENDING': efacturaStats.pending++; break;
        case 'SUBMITTED': efacturaStats.submitted++; break;
        case 'ACCEPTED': efacturaStats.accepted++; break;
        case 'REJECTED': efacturaStats.rejected++; break;
      }
    });

    // SAF-T status
    const saftLogs = allLogs.filter(l => l.action === 'SAFT_SUBMISSION');
    const lastSaft = saftLogs[0];
    const saftData = lastSaft ? (lastSaft.details as any) || {} : {};

    // D112 status
    const d112Logs = allLogs.filter(l => l.action === 'D112_SUBMISSION');
    const lastD112 = d112Logs[0];
    const d112Data = lastD112 ? (lastD112.details as any) || {} : {};
    const d112CurrentSubmitted = d112Logs.some(l => {
      const data = (l.details as any) || {};
      return data.period === currentPeriod;
    });

    // D394 status
    const d394Logs = allLogs.filter(l => l.action === 'D394_SUBMISSION');
    const lastD394 = d394Logs[0];
    const d394Data = lastD394 ? (lastD394.details as any) || {} : {};
    const d394CurrentSubmitted = d394Logs.some(l => {
      const data = (l.details as any) || {};
      return data.period === currentPeriod;
    });

    // REVISAL status
    const revisalLogs = allLogs.filter(l => l.action === 'REVISAL_SUBMISSION');
    const lastRevisal = revisalLogs[0];
    const pendingEmployeeChanges = await this.prisma.employee.count({
      where: {
        userId,
        OR: [
          { status: 'TERMINATED' },
          { hireDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    return {
      efactura: efacturaStats,
      saft: {
        lastSubmission: lastSaft?.createdAt || null,
        status: saftData.status || 'NOT_SUBMITTED',
        nextDeadline: this.getSaftDeadline(),
      },
      d112: {
        lastSubmission: lastD112?.createdAt || null,
        currentPeriod,
        submitted: d112CurrentSubmitted,
      },
      d394: {
        lastSubmission: lastD394?.createdAt || null,
        currentPeriod,
        submitted: d394CurrentSubmitted,
      },
      revisal: {
        pendingChanges: pendingEmployeeChanges,
        lastSubmission: lastRevisal?.createdAt || null,
      },
    };
  }

  /**
   * Get all submission history
   */
  async getAllSubmissions(
    userId: string,
    options?: { type?: string; limit?: number },
  ): Promise<AnafSubmissionStatus[]> {
    const actions = options?.type
      ? [`${options.type}_SUBMISSION`]
      : ['EFACTURA_SUBMISSION', 'SAFT_SUBMISSION', 'D112_SUBMISSION', 'D394_SUBMISSION', 'REVISAL_SUBMISSION', 'D406_SUBMISSION'];

    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: { in: actions },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });

    return logs.map(log => {
      const data = (log.details as any) || {};
      const type = log.action.replace('_SUBMISSION', '') as AnafSubmissionStatus['type'];

      return {
        id: log.entityId || log.id,
        type,
        referenceId: data.referenceId || data.fileName || log.entityId,
        status: data.status || 'SUBMITTED',
        submittedAt: log.createdAt,
        processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
        errorMessage: data.errorMessage,
        indexIncarcare: data.indexIncarcare,
        details: data,
      };
    });
  }

  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(userId: string): Promise<any[]> {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get current submission status
    const overview = await this.getComplianceOverview(userId);

    const deadlines = [];

    // D112 deadline - 25th of next month
    const d112Deadline = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    if (!overview.d112.submitted) {
      deadlines.push({
        type: 'D112',
        name: 'Declaratia D112 - Contributii salariale',
        period: currentPeriod,
        deadline: d112Deadline.toISOString().split('T')[0],
        daysRemaining: Math.ceil((d112Deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        status: 'PENDING',
        priority: d112Deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 ? 'HIGH' : 'MEDIUM',
      });
    }

    // D394 deadline - 25th of next month
    const d394Deadline = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    if (!overview.d394.submitted) {
      deadlines.push({
        type: 'D394',
        name: 'Declaratia D394 - TVA',
        period: currentPeriod,
        deadline: d394Deadline.toISOString().split('T')[0],
        daysRemaining: Math.ceil((d394Deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        status: 'PENDING',
        priority: d394Deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 ? 'HIGH' : 'MEDIUM',
      });
    }

    // REVISAL - immediate if there are pending changes
    if (overview.revisal.pendingChanges > 0) {
      deadlines.push({
        type: 'REVISAL',
        name: 'REVISAL - Registru angajati',
        pendingChanges: overview.revisal.pendingChanges,
        deadline: 'Immediate (24h from change)',
        daysRemaining: 1,
        status: 'URGENT',
        priority: 'HIGH',
      });
    }

    // SAF-T D406 - monthly by 25th
    const saftDeadline = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    deadlines.push({
      type: 'SAFT',
      name: 'SAF-T D406 - Raportare lunara',
      period: currentPeriod,
      deadline: saftDeadline.toISOString().split('T')[0],
      daysRemaining: Math.ceil((saftDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      status: overview.saft.status === 'ACCEPTED' ? 'COMPLETED' : 'PENDING',
      priority: saftDeadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 ? 'HIGH' : 'MEDIUM',
    });

    return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Check submission status with ANAF (mock)
   */
  async checkSubmissionStatus(
    userId: string,
    submissionId: string,
  ): Promise<AnafSubmissionStatus | null> {
    const log = await this.prisma.auditLog.findFirst({
      where: {
        userId,
        entityId: submissionId,
      },
    });

    if (!log) return null;

    const data = (log.details as any) || {};
    const type = log.action.replace('_SUBMISSION', '') as AnafSubmissionStatus['type'];

    // In production, this would call ANAF API to check status
    // For now, return stored status
    return {
      id: log.entityId || log.id,
      type,
      referenceId: data.referenceId || data.fileName,
      status: data.status || 'SUBMITTED',
      submittedAt: log.createdAt,
      processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
      errorMessage: data.errorMessage,
      indexIncarcare: data.indexIncarcare,
      details: data,
    };
  }

  /**
   * Resubmit failed submission
   */
  async resubmit(
    userId: string,
    submissionId: string,
    xmlContent: string,
  ): Promise<any> {
    const original = await this.checkSubmissionStatus(userId, submissionId);

    if (!original) {
      throw new Error('Submission not found');
    }

    // Create new submission record
    const newSubmission = await this.prisma.auditLog.create({
      data: {
        userId,
        action: `${original.type}_SUBMISSION`,
        entity: 'COMPLIANCE',
        entityId: `${original.type}-RESUB-${Date.now()}`,
        details: JSON.parse(JSON.stringify({
          originalSubmissionId: submissionId,
          status: 'PENDING',
          resubmittedAt: new Date().toISOString(),
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Resubmission created for ${submissionId}`);

    return {
      success: true,
      newSubmissionId: newSubmission.entityId,
      originalSubmissionId: submissionId,
      status: 'PENDING',
    };
  }

  private getSaftDeadline(): string {
    const now = new Date();
    const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    return deadline.toISOString().split('T')[0];
  }
}
