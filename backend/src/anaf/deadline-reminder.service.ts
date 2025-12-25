import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ANAF Compliance Deadline Reminder Service
// Per Order 1783/2021, Legea 141/2025

export interface DeadlineReminder {
  id: string;
  type: DeadlineType;
  description: string;
  descriptionRo: string;
  dueDate: Date;
  reminderDays: number[];
  status: 'PENDING' | 'REMINDED' | 'COMPLETED' | 'OVERDUE';
  userId?: string;
  organizationId?: string;
  law: string;
  penalty?: string;
  metadata?: Record<string, any>;
}

export type DeadlineType =
  | 'SAFT_D406_MONTHLY'
  | 'EFACTURA_SUBMISSION'
  | 'VAT_DECLARATION'
  | 'REVISAL_UPDATE'
  | 'D112_DECLARATION'
  | 'D100_DECLARATION'
  | 'ANNUAL_REPORT'
  | 'INTRASTAT'
  | 'CUSTOM';

export interface DeadlineConfig {
  type: DeadlineType;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  law: string;
  penalty: string;
  dayOfMonth: number;
  reminderDays: number[];
  enabled: boolean;
}

@Injectable()
export class DeadlineReminderService implements OnModuleInit {
  private readonly logger = new Logger(DeadlineReminderService.name);
  private reminders: Map<string, DeadlineReminder> = new Map();

  // ANAF deadline configurations per Romanian tax law
  private readonly DEADLINE_CONFIGS: DeadlineConfig[] = [
    {
      type: 'SAFT_D406_MONTHLY',
      name: 'SAF-T D406 Monthly Submission',
      nameRo: 'Depunere SAF-T D406 Lunar',
      description: 'Monthly SAF-T D406 XML submission to ANAF',
      descriptionRo: 'Depunerea lunară a fișierului SAF-T D406 la ANAF',
      law: 'Ordin 1783/2021',
      penalty: '1,000 - 5,000 RON per day late',
      dayOfMonth: 25, // Due by 25th of following month
      reminderDays: [7, 3, 1], // Remind 7, 3, 1 days before
      enabled: true,
    },
    {
      type: 'EFACTURA_SUBMISSION',
      name: 'e-Factura Submission',
      nameRo: 'Transmitere e-Factura',
      description: 'e-Factura must be uploaded within 5 working days',
      descriptionRo: 'e-Factura trebuie încărcată în 5 zile lucrătoare',
      law: 'Legea 296/2023 Art. 10',
      penalty: '1,000 - 10,000 RON per invoice',
      dayOfMonth: 0, // Rolling deadline (5 days from invoice)
      reminderDays: [3, 1],
      enabled: true,
    },
    {
      type: 'VAT_DECLARATION',
      name: 'VAT Declaration (D300)',
      nameRo: 'Declarație TVA (D300)',
      description: 'Monthly/Quarterly VAT declaration',
      descriptionRo: 'Declarația lunară/trimestrială de TVA',
      law: 'Codul Fiscal Art. 323',
      penalty: '1,000 - 5,000 RON + interest',
      dayOfMonth: 25,
      reminderDays: [7, 3, 1],
      enabled: true,
    },
    {
      type: 'REVISAL_UPDATE',
      name: 'REVISAL Employment Updates',
      nameRo: 'Actualizări REVISAL',
      description: 'Employment changes must be reported within 1 day',
      descriptionRo: 'Modificările de angajare trebuie raportate în 1 zi',
      law: 'HG 905/2017',
      penalty: '2,000 - 5,000 RON per employee',
      dayOfMonth: 0, // Rolling deadline
      reminderDays: [0], // Same day
      enabled: true,
    },
    {
      type: 'D112_DECLARATION',
      name: 'D112 Payroll Declaration',
      nameRo: 'Declarație D112 Salarii',
      description: 'Monthly payroll contributions declaration',
      descriptionRo: 'Declarația lunară contribuții salariale',
      law: 'Codul Fiscal Art. 147',
      penalty: '500 - 1,000 RON + interest',
      dayOfMonth: 25,
      reminderDays: [7, 3, 1],
      enabled: true,
    },
    {
      type: 'D100_DECLARATION',
      name: 'D100 Tax Declaration',
      nameRo: 'Declarație D100',
      description: 'Monthly tax obligations declaration',
      descriptionRo: 'Declarația lunară obligații fiscale',
      law: 'Codul Fiscal Art. 104',
      penalty: '1,000 - 5,000 RON',
      dayOfMonth: 25,
      reminderDays: [7, 3, 1],
      enabled: true,
    },
    {
      type: 'INTRASTAT',
      name: 'Intrastat Declaration',
      nameRo: 'Declarație Intrastat',
      description: 'EU trade statistics declaration',
      descriptionRo: 'Declarația statistică comerț UE',
      law: 'Regulament UE 2019/2152',
      penalty: '500 - 2,500 RON',
      dayOfMonth: 15,
      reminderDays: [5, 2, 1],
      enabled: true,
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Deadline Reminder Service');
    await this.initializeMonthlyDeadlines();
    this.logger.log(`Initialized ${this.reminders.size} deadline reminders`);
  }

  // Check deadlines every day at 8 AM Europe/Bucharest
  @Cron('0 8 * * *', { timeZone: 'Europe/Bucharest' })
  async checkDeadlines() {
    this.logger.log('Running daily deadline check');
    const now = new Date();

    for (const [id, reminder] of this.reminders) {
      if (reminder.status === 'COMPLETED') continue;

      const daysUntilDue = this.getDaysUntil(reminder.dueDate);

      // Check if overdue
      if (daysUntilDue < 0) {
        reminder.status = 'OVERDUE';
        await this.sendOverdueAlert(reminder);
        continue;
      }

      // Check if we should send a reminder
      if (reminder.reminderDays.includes(daysUntilDue)) {
        await this.sendReminder(reminder, daysUntilDue);
        reminder.status = 'REMINDED';
      }
    }
  }

  // Initialize deadlines for current and next month
  private async initializeMonthlyDeadlines() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const config of this.DEADLINE_CONFIGS) {
      if (!config.enabled || config.dayOfMonth === 0) continue;

      // Current month deadline
      const currentDeadline = new Date(currentYear, currentMonth, config.dayOfMonth);
      if (currentDeadline > now) {
        this.createReminder(config, currentDeadline);
      }

      // Next month deadline
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const nextDeadline = new Date(nextYear, nextMonth, config.dayOfMonth);
      this.createReminder(config, nextDeadline);
    }
  }

  private createReminder(config: DeadlineConfig, dueDate: Date): DeadlineReminder {
    const id = `${config.type}-${dueDate.toISOString().slice(0, 7)}`;

    const reminder: DeadlineReminder = {
      id,
      type: config.type,
      description: config.description,
      descriptionRo: config.descriptionRo,
      dueDate,
      reminderDays: config.reminderDays,
      status: 'PENDING',
      law: config.law,
      penalty: config.penalty,
      metadata: {
        name: config.name,
        nameRo: config.nameRo,
      },
    };

    this.reminders.set(id, reminder);
    this.logger.debug(`Created reminder: ${id} due ${dueDate.toISOString()}`);

    return reminder;
  }

  private async sendReminder(reminder: DeadlineReminder, daysUntil: number) {
    this.logger.log(`Sending reminder for ${reminder.type}: ${daysUntil} days until deadline`);

    // Emit event for notification service to handle
    this.eventEmitter.emit('deadline.reminder', {
      reminderId: reminder.id,
      type: reminder.type,
      dueDate: reminder.dueDate,
      daysUntil,
      description: reminder.descriptionRo,
      law: reminder.law,
      penalty: reminder.penalty,
    });

    // Log to audit (skip if userId not available)
    if (reminder.userId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: reminder.userId,
            action: 'DEADLINE_REMINDER_SENT',
            entity: 'DeadlineReminder',
            entityId: reminder.id,
            details: {
              type: reminder.type,
              dueDate: reminder.dueDate,
              daysUntil,
            },
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to log reminder: ${error.message}`);
      }
    }
  }

  private async sendOverdueAlert(reminder: DeadlineReminder) {
    this.logger.warn(`OVERDUE: ${reminder.type} was due ${reminder.dueDate.toISOString()}`);

    this.eventEmitter.emit('deadline.overdue', {
      reminderId: reminder.id,
      type: reminder.type,
      dueDate: reminder.dueDate,
      daysOverdue: Math.abs(this.getDaysUntil(reminder.dueDate)),
      description: reminder.descriptionRo,
      law: reminder.law,
      penalty: reminder.penalty,
    });
  }

  private getDaysUntil(date: Date): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // API Methods

  getDeadlineConfigs(): DeadlineConfig[] {
    return this.DEADLINE_CONFIGS;
  }

  getUpcomingDeadlines(days: number = 30): DeadlineReminder[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return Array.from(this.reminders.values())
      .filter(r => r.dueDate >= now && r.dueDate <= cutoff)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  getOverdueDeadlines(): DeadlineReminder[] {
    return Array.from(this.reminders.values())
      .filter(r => r.status === 'OVERDUE')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  markCompleted(reminderId: string): boolean {
    const reminder = this.reminders.get(reminderId);
    if (!reminder) return false;

    reminder.status = 'COMPLETED';
    this.logger.log(`Deadline marked completed: ${reminderId}`);

    this.eventEmitter.emit('deadline.completed', {
      reminderId,
      type: reminder.type,
      dueDate: reminder.dueDate,
    });

    return true;
  }

  // Create custom reminder for specific user/organization
  async createCustomReminder(
    userId: string,
    type: DeadlineType,
    description: string,
    dueDate: Date,
    reminderDays: number[] = [7, 3, 1],
  ): Promise<DeadlineReminder> {
    const id = `custom-${userId}-${Date.now()}`;

    const reminder: DeadlineReminder = {
      id,
      type,
      description,
      descriptionRo: description,
      dueDate,
      reminderDays,
      status: 'PENDING',
      userId,
      law: 'Custom',
    };

    this.reminders.set(id, reminder);

    this.eventEmitter.emit('deadline.created', {
      reminderId: id,
      type,
      dueDate,
      userId,
    });

    return reminder;
  }

  // Get deadline summary for dashboard
  getDeadlineSummary(): {
    upcoming: number;
    overdue: number;
    completedThisMonth: number;
    nextDeadline: DeadlineReminder | null;
  } {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOf30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const reminders = Array.from(this.reminders.values());
    const upcoming = reminders.filter(r => r.dueDate >= now && r.dueDate <= endOf30Days && r.status !== 'COMPLETED');
    const overdue = reminders.filter(r => r.status === 'OVERDUE');
    const completedThisMonth = reminders.filter(r => r.status === 'COMPLETED' && r.dueDate >= startOfMonth);

    const nextDeadline = upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0] || null;

    return {
      upcoming: upcoming.length,
      overdue: overdue.length,
      completedThisMonth: completedThisMonth.length,
      nextDeadline,
    };
  }
}
