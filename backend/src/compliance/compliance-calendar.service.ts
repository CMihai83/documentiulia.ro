import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

export interface ComplianceDeadline {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  category: 'tax' | 'financial' | 'hr' | 'regulatory' | 'audit' | 'custom';
  jurisdiction: string;
  authority: string;
  dueDate: Date;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  customPattern?: string; // cron pattern for custom
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string[];
  reminderDays: number[];
  documents?: string[];
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  penalty?: {
    amount: number;
    currency: string;
    description: string;
  };
  linkedDeadlines?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceReminder {
  id: string;
  deadlineId: string;
  tenantId: string;
  daysBefore: number;
  sentAt?: Date;
  recipients: string[];
  channel: 'email' | 'sms' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
}

export interface ComplianceCalendarStats {
  totalDeadlines: number;
  pendingDeadlines: number;
  overdueDeadlines: number;
  completedThisMonth: number;
  upcomingThisWeek: number;
  upcomingThisMonth: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  complianceScore: number;
}

@Injectable()
export class ComplianceCalendarService {
  private readonly logger = new Logger(ComplianceCalendarService.name);

  // In-memory storage
  private deadlines: Map<string, ComplianceDeadline> = new Map();
  private reminders: Map<string, ComplianceReminder[]> = new Map();

  // Romanian compliance calendar template
  private readonly romanianDeadlines: Array<Partial<ComplianceDeadline>> = [
    // Monthly VAT
    {
      title: 'VAT Return (D300)',
      description: 'Monthly VAT declaration submission to ANAF',
      category: 'tax',
      jurisdiction: 'RO',
      authority: 'ANAF',
      frequency: 'monthly',
      priority: 'critical',
      reminderDays: [7, 3, 1],
      penalty: { amount: 1000, currency: 'RON', description: 'Late filing penalty' },
    },
    // Monthly SAF-T D406
    {
      title: 'SAF-T D406 Submission',
      description: 'Monthly SAF-T declaration (D406) - mandatory from Jan 2025',
      category: 'tax',
      jurisdiction: 'RO',
      authority: 'ANAF',
      frequency: 'monthly',
      priority: 'critical',
      reminderDays: [7, 3, 1],
      penalty: { amount: 5000, currency: 'RON', description: 'SAF-T non-compliance' },
    },
    // e-Factura
    {
      title: 'e-Factura B2B Compliance',
      description: 'Ensure all B2B invoices submitted via SPV',
      category: 'tax',
      jurisdiction: 'RO',
      authority: 'ANAF',
      frequency: 'monthly',
      priority: 'high',
      reminderDays: [5, 1],
    },
    // Quarterly reports
    {
      title: 'Quarterly Income Tax (D100)',
      description: 'Quarterly income tax declaration',
      category: 'tax',
      jurisdiction: 'RO',
      authority: 'ANAF',
      frequency: 'quarterly',
      priority: 'high',
      reminderDays: [14, 7, 3],
    },
    // Annual
    {
      title: 'Annual Financial Statements',
      description: 'Submit annual financial statements to Ministry of Finance',
      category: 'financial',
      jurisdiction: 'RO',
      authority: 'Ministry of Finance',
      frequency: 'annual',
      priority: 'critical',
      reminderDays: [30, 14, 7],
    },
    {
      title: 'Corporate Tax Return',
      description: 'Annual corporate tax declaration',
      category: 'tax',
      jurisdiction: 'RO',
      authority: 'ANAF',
      frequency: 'annual',
      priority: 'critical',
      reminderDays: [30, 14, 7],
    },
    // HR
    {
      title: 'Monthly Payroll Declaration (D112)',
      description: 'Monthly payroll contributions declaration',
      category: 'hr',
      jurisdiction: 'RO',
      authority: 'ANAF',
      frequency: 'monthly',
      priority: 'high',
      reminderDays: [5, 2, 1],
    },
    // GDPR
    {
      title: 'GDPR Data Processing Review',
      description: 'Review data processing activities and update records',
      category: 'regulatory',
      jurisdiction: 'EU',
      authority: 'ANSPDCP',
      frequency: 'annual',
      priority: 'medium',
      reminderDays: [30, 14],
    },
  ];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeTemplateDeadlines();
  }

  private initializeTemplateDeadlines(): void {
    const tenantId = 'tenant_demo';
    const now = new Date();

    for (const template of this.romanianDeadlines) {
      const deadline = this.createDeadlineFromTemplate(tenantId, template, now);
      this.deadlines.set(deadline.id, deadline);
    }
  }

  private createDeadlineFromTemplate(
    tenantId: string,
    template: Partial<ComplianceDeadline>,
    referenceDate: Date,
  ): ComplianceDeadline {
    const id = `deadline_${crypto.randomBytes(12).toString('hex')}`;

    // Calculate next due date based on frequency
    let dueDate = new Date(referenceDate);

    switch (template.frequency) {
      case 'monthly':
        dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 25);
        break;
      case 'quarterly':
        const quarter = Math.floor(referenceDate.getMonth() / 3);
        dueDate = new Date(referenceDate.getFullYear(), (quarter + 1) * 3, 25);
        break;
      case 'annual':
        dueDate = new Date(referenceDate.getFullYear() + 1, 2, 31); // March 31 next year
        break;
    }

    return {
      id,
      tenantId,
      title: template.title!,
      description: template.description || '',
      category: template.category || 'custom',
      jurisdiction: template.jurisdiction || 'RO',
      authority: template.authority || 'N/A',
      dueDate,
      frequency: template.frequency || 'one-time',
      status: 'pending',
      priority: template.priority || 'medium',
      reminderDays: template.reminderDays || [7, 1],
      penalty: template.penalty,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async createDeadline(
    tenantId: string,
    params: Omit<ComplianceDeadline, 'id' | 'tenantId' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<ComplianceDeadline> {
    const id = `deadline_${crypto.randomBytes(12).toString('hex')}`;

    const deadline: ComplianceDeadline = {
      id,
      tenantId,
      ...params,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.deadlines.set(id, deadline);

    // Schedule reminders
    this.scheduleReminders(deadline);

    this.eventEmitter.emit('compliance.deadline.created', { tenantId, deadline });

    return deadline;
  }

  async updateDeadline(
    deadlineId: string,
    updates: Partial<Omit<ComplianceDeadline, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<ComplianceDeadline | null> {
    const deadline = this.deadlines.get(deadlineId);
    if (!deadline) return null;

    const updated = {
      ...deadline,
      ...updates,
      updatedAt: new Date(),
    };

    this.deadlines.set(deadlineId, updated);

    return updated;
  }

  async completeDeadline(
    deadlineId: string,
    completedBy: string,
    notes?: string,
    documents?: string[],
  ): Promise<ComplianceDeadline | null> {
    const deadline = this.deadlines.get(deadlineId);
    if (!deadline) return null;

    deadline.status = 'completed';
    deadline.completedAt = new Date();
    deadline.completedBy = completedBy;
    deadline.notes = notes;
    deadline.documents = documents;
    deadline.updatedAt = new Date();

    // If recurring, create next occurrence
    if (deadline.frequency !== 'one-time') {
      const nextDeadline = this.createDeadlineFromTemplate(
        deadline.tenantId,
        deadline,
        deadline.dueDate,
      );
      this.deadlines.set(nextDeadline.id, nextDeadline);
      this.scheduleReminders(nextDeadline);
    }

    this.eventEmitter.emit('compliance.deadline.completed', { deadlineId, completedBy });

    return deadline;
  }

  async waiveDeadline(
    deadlineId: string,
    waivedBy: string,
    reason: string,
  ): Promise<ComplianceDeadline | null> {
    const deadline = this.deadlines.get(deadlineId);
    if (!deadline) return null;

    deadline.status = 'waived';
    deadline.notes = `Waived by ${waivedBy}: ${reason}`;
    deadline.updatedAt = new Date();

    return deadline;
  }

  private scheduleReminders(deadline: ComplianceDeadline): void {
    const reminders: ComplianceReminder[] = [];

    for (const daysBefore of deadline.reminderDays) {
      const reminder: ComplianceReminder = {
        id: `reminder_${crypto.randomBytes(8).toString('hex')}`,
        deadlineId: deadline.id,
        tenantId: deadline.tenantId,
        daysBefore,
        recipients: deadline.assignedTo || [],
        channel: 'email',
        status: 'pending',
      };

      reminders.push(reminder);
    }

    this.reminders.set(deadline.id, reminders);
  }

  async getDeadlines(
    tenantId: string,
    filters?: {
      status?: string;
      category?: string;
      priority?: string;
      from?: Date;
      to?: Date;
    },
  ): Promise<ComplianceDeadline[]> {
    let deadlines = Array.from(this.deadlines.values())
      .filter(d => d.tenantId === tenantId);

    if (filters?.status) {
      deadlines = deadlines.filter(d => d.status === filters.status);
    }
    if (filters?.category) {
      deadlines = deadlines.filter(d => d.category === filters.category);
    }
    if (filters?.priority) {
      deadlines = deadlines.filter(d => d.priority === filters.priority);
    }
    if (filters?.from) {
      deadlines = deadlines.filter(d => d.dueDate >= filters.from!);
    }
    if (filters?.to) {
      deadlines = deadlines.filter(d => d.dueDate <= filters.to!);
    }

    return deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async getUpcomingDeadlines(tenantId: string, days: number = 30): Promise<ComplianceDeadline[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.getDeadlines(tenantId, {
      status: 'pending',
      from: now,
      to: cutoff,
    });
  }

  async getOverdueDeadlines(tenantId: string): Promise<ComplianceDeadline[]> {
    const now = new Date();

    return Array.from(this.deadlines.values())
      .filter(d =>
        d.tenantId === tenantId &&
        d.status === 'pending' &&
        d.dueDate < now
      );
  }

  async getCalendarStats(tenantId: string): Promise<ComplianceCalendarStats> {
    const deadlines = Array.from(this.deadlines.values())
      .filter(d => d.tenantId === tenantId);

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    let pending = 0;
    let overdue = 0;
    let completedThisMonth = 0;
    let upcomingThisWeek = 0;
    let upcomingThisMonth = 0;

    for (const d of deadlines) {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      byPriority[d.priority] = (byPriority[d.priority] || 0) + 1;

      if (d.status === 'pending') {
        pending++;
        if (d.dueDate < now) overdue++;
        else if (d.dueDate <= weekFromNow) upcomingThisWeek++;
        else if (d.dueDate <= monthFromNow) upcomingThisMonth++;
      }

      if (d.status === 'completed' && d.completedAt && d.completedAt >= monthStart) {
        completedThisMonth++;
      }
    }

    // Calculate compliance score (100 - penalty for overdue/late)
    const complianceScore = Math.max(0, 100 - (overdue * 10));

    return {
      totalDeadlines: deadlines.length,
      pendingDeadlines: pending,
      overdueDeadlines: overdue,
      completedThisMonth,
      upcomingThisWeek,
      upcomingThisMonth,
      byCategory,
      byPriority,
      complianceScore,
    };
  }

  async getCalendarView(
    tenantId: string,
    year: number,
    month: number,
  ): Promise<Record<number, ComplianceDeadline[]>> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const deadlines = await this.getDeadlines(tenantId, {
      from: startOfMonth,
      to: endOfMonth,
    });

    const calendarView: Record<number, ComplianceDeadline[]> = {};

    for (const deadline of deadlines) {
      const day = deadline.dueDate.getDate();
      if (!calendarView[day]) {
        calendarView[day] = [];
      }
      calendarView[day].push(deadline);
    }

    return calendarView;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processReminders(): Promise<void> {
    this.logger.log('Processing compliance reminders...');

    const now = new Date();

    for (const [deadlineId, reminders] of this.reminders) {
      const deadline = this.deadlines.get(deadlineId);
      if (!deadline || deadline.status !== 'pending') continue;

      for (const reminder of reminders) {
        if (reminder.status !== 'pending') continue;

        const reminderDate = new Date(
          deadline.dueDate.getTime() - reminder.daysBefore * 24 * 60 * 60 * 1000
        );

        if (reminderDate <= now) {
          try {
            this.eventEmitter.emit('compliance.reminder', {
              deadlineId,
              deadline,
              reminder,
            });

            reminder.status = 'sent';
            reminder.sentAt = new Date();

            this.logger.log(`Sent reminder for deadline ${deadline.title}`);
          } catch (error: any) {
            reminder.status = 'failed';
            this.logger.error(`Failed to send reminder: ${error.message}`);
          }
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkOverdueDeadlines(): Promise<void> {
    this.logger.log('Checking for overdue deadlines...');

    const now = new Date();

    for (const [id, deadline] of this.deadlines) {
      if (deadline.status === 'pending' && deadline.dueDate < now) {
        deadline.status = 'overdue';

        this.eventEmitter.emit('compliance.deadline.overdue', {
          deadlineId: id,
          deadline,
        });

        this.logger.warn(`Deadline overdue: ${deadline.title}`);
      }
    }
  }

  async importTemplates(tenantId: string, jurisdiction: string): Promise<number> {
    // Import standard templates for jurisdiction
    const templates = jurisdiction === 'RO' ? this.romanianDeadlines : [];

    let imported = 0;
    for (const template of templates) {
      const deadline = this.createDeadlineFromTemplate(tenantId, template, new Date());
      this.deadlines.set(deadline.id, deadline);
      this.scheduleReminders(deadline);
      imported++;
    }

    return imported;
  }

  async exportCalendar(
    tenantId: string,
    format: 'ical' | 'json',
  ): Promise<string> {
    const deadlines = await this.getDeadlines(tenantId);

    if (format === 'ical') {
      let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DocumentIulia//Compliance Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

      for (const d of deadlines) {
        const dtstart = d.dueDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        ical += `BEGIN:VEVENT
UID:${d.id}@documentiulia.ro
DTSTART:${dtstart}
SUMMARY:${d.title}
DESCRIPTION:${d.description}
CATEGORIES:${d.category.toUpperCase()}
PRIORITY:${d.priority === 'critical' ? 1 : d.priority === 'high' ? 3 : d.priority === 'medium' ? 5 : 9}
END:VEVENT
`;
      }

      ical += 'END:VCALENDAR';
      return ical;
    }

    return JSON.stringify({ deadlines }, null, 2);
  }
}
