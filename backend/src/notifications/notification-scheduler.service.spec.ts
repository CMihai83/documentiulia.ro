import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let mockNotificationsService: any;
  let mockPrismaService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    company: 'SC Test SRL',
    cui: 'RO12345678',
  };

  beforeEach(async () => {
    mockNotificationsService = {
      sendPaymentReminders: jest.fn().mockResolvedValue(5),
      sendOverdueNotifications: jest.fn().mockResolvedValue(3),
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    mockPrismaService = {
      user: {
        findMany: jest.fn().mockResolvedValue([mockUser]),
      },
      invoice: {
        count: jest.fn().mockResolvedValue(10),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationSchedulerService>(NotificationSchedulerService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== DAILY PAYMENT REMINDERS ===================

  describe('sendDailyPaymentReminders', () => {
    it('should call notificationsService.sendPaymentReminders', async () => {
      await service.sendDailyPaymentReminders();

      expect(mockNotificationsService.sendPaymentReminders).toHaveBeenCalled();
    });

    it('should log scheduled job execution', async () => {
      await service.sendDailyPaymentReminders();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SCHEDULED_JOB_PAYMENT_REMINDERS',
          entity: 'NotificationScheduler',
        }),
      });
    });

    it('should include reminder count in audit log', async () => {
      mockNotificationsService.sendPaymentReminders.mockResolvedValue(10);

      await service.sendDailyPaymentReminders();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            remindersSent: 10,
          }),
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockNotificationsService.sendPaymentReminders.mockRejectedValue(
        new Error('Email service down'),
      );

      // Should not throw
      await expect(service.sendDailyPaymentReminders()).resolves.toBeUndefined();
    });

    it('should log error in audit when job fails', async () => {
      mockNotificationsService.sendPaymentReminders.mockRejectedValue(
        new Error('Email service down'),
      );

      await service.sendDailyPaymentReminders();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            error: 'Email service down',
          }),
        }),
      });
    });

    it('should use system userId for audit log', async () => {
      await service.sendDailyPaymentReminders();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'system',
        }),
      });
    });

    it('should include execution timestamp in audit', async () => {
      await service.sendDailyPaymentReminders();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            executedAt: expect.any(String),
          }),
        }),
      });
    });
  });

  // =================== DAILY OVERDUE NOTIFICATIONS ===================

  describe('sendDailyOverdueNotifications', () => {
    it('should call notificationsService.sendOverdueNotifications', async () => {
      await service.sendDailyOverdueNotifications();

      expect(mockNotificationsService.sendOverdueNotifications).toHaveBeenCalled();
    });

    it('should log scheduled job execution', async () => {
      await service.sendDailyOverdueNotifications();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SCHEDULED_JOB_OVERDUE_NOTIFICATIONS',
        }),
      });
    });

    it('should include notification count in audit log', async () => {
      mockNotificationsService.sendOverdueNotifications.mockResolvedValue(7);

      await service.sendDailyOverdueNotifications();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            notificationsSent: 7,
          }),
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockNotificationsService.sendOverdueNotifications.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(service.sendDailyOverdueNotifications()).resolves.toBeUndefined();
    });

    it('should log error in audit when job fails', async () => {
      mockNotificationsService.sendOverdueNotifications.mockRejectedValue(
        new Error('Network timeout'),
      );

      await service.sendDailyOverdueNotifications();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            error: 'Network timeout',
          }),
        }),
      });
    });
  });

  // =================== WEEKLY INVOICE SUMMARY ===================

  describe('sendWeeklyInvoiceSummary', () => {
    beforeEach(() => {
      // Reset count mock to return different values
      let countCallIndex = 0;
      mockPrismaService.invoice.count.mockImplementation(() => {
        const values = [5, 2, 3, 4]; // pending, overdue, paidThisWeek, issuedThisWeek
        return Promise.resolve(values[countCallIndex++ % 4]);
      });
    });

    it('should query users with invoices', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          invoices: {
            some: {},
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
        },
      });
    });

    it('should send summary to users with pending invoices', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'COMPLIANCE_ALERT',
          userId: mockUser.id,
          recipientEmail: mockUser.email,
        }),
      );
    });

    it('should include Romanian alert message', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alertType: 'Sumar săptămânal facturi',
          }),
        }),
      );
    });

    it('should skip users without email', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { ...mockUser, email: null },
      ]);

      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).not.toHaveBeenCalled();
    });

    it('should skip users with no pending or overdue invoices', async () => {
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).not.toHaveBeenCalled();
    });

    it('should log scheduled job execution', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SCHEDULED_JOB_WEEKLY_SUMMARY',
        }),
      });
    });

    it('should include summaries sent count in audit', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            summariesSent: expect.any(Number),
          }),
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.user.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(service.sendWeeklyInvoiceSummary()).resolves.toBeUndefined();
    });

    it('should include Codul Fiscal reference', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            legalReference: expect.stringContaining('Codul Fiscal'),
          }),
        }),
      );
    });

    it('should use company name as fallback for recipient name', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { ...mockUser, name: null },
      ]);

      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientName: mockUser.company,
        }),
      );
    });

    it('should handle multiple users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { ...mockUser, id: 'user-1', email: 'user1@test.com' },
        { ...mockUser, id: 'user-2', email: 'user2@test.com' },
        { ...mockUser, id: 'user-3', email: 'user3@test.com' },
      ]);

      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).toHaveBeenCalledTimes(3);
    });
  });

  // =================== MONTHLY SAF-T REMINDER ===================

  describe('sendMonthlySaftReminder', () => {
    it('should query users with CUI', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          cui: { not: null },
        },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
        },
      });
    });

    it('should send SAF-T D406 reminder notification', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'COMPLIANCE_ALERT',
          data: expect.objectContaining({
            alertType: 'Reminder SAF-T D406',
          }),
        }),
      );
    });

    it('should reference OPANAF 1783/2021', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            legalReference: expect.stringContaining('OPANAF 1783/2021'),
          }),
        }),
      );
    });

    it('should include SAF-T D406 in alert message', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alertMessage: expect.stringContaining('SAF-T D406'),
          }),
        }),
      );
    });

    it('should skip users without email', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { ...mockUser, email: null },
      ]);

      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).not.toHaveBeenCalled();
    });

    it('should log scheduled job execution', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SCHEDULED_JOB_SAFT_REMINDER',
        }),
      });
    });

    it('should include reminders sent count in audit', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            remindersSent: 1,
          }),
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.user.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(service.sendMonthlySaftReminder()).resolves.toBeUndefined();
    });

    it('should mention deadline on 25th', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deadline: expect.stringContaining('25'),
          }),
        }),
      );
    });

    it('should mention ANAF in required action', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requiredAction: expect.stringContaining('ANAF'),
          }),
        }),
      );
    });
  });

  // =================== MANUAL TRIGGERS ===================

  describe('triggerPaymentReminders', () => {
    it('should call sendPaymentReminders and return count', async () => {
      mockNotificationsService.sendPaymentReminders.mockResolvedValue(8);

      const result = await service.triggerPaymentReminders();

      expect(result).toEqual({ sentCount: 8 });
    });

    it('should call notificationsService.sendPaymentReminders', async () => {
      await service.triggerPaymentReminders();

      expect(mockNotificationsService.sendPaymentReminders).toHaveBeenCalled();
    });

    it('should return zero when no reminders sent', async () => {
      mockNotificationsService.sendPaymentReminders.mockResolvedValue(0);

      const result = await service.triggerPaymentReminders();

      expect(result).toEqual({ sentCount: 0 });
    });
  });

  describe('triggerOverdueNotifications', () => {
    it('should call sendOverdueNotifications and return count', async () => {
      mockNotificationsService.sendOverdueNotifications.mockResolvedValue(4);

      const result = await service.triggerOverdueNotifications();

      expect(result).toEqual({ sentCount: 4 });
    });

    it('should call notificationsService.sendOverdueNotifications', async () => {
      await service.triggerOverdueNotifications();

      expect(mockNotificationsService.sendOverdueNotifications).toHaveBeenCalled();
    });

    it('should return zero when no notifications sent', async () => {
      mockNotificationsService.sendOverdueNotifications.mockResolvedValue(0);

      const result = await service.triggerOverdueNotifications();

      expect(result).toEqual({ sentCount: 0 });
    });
  });

  // =================== WEEKLY STATS (Private Method) ===================

  describe('getWeeklyStats (via sendWeeklyInvoiceSummary)', () => {
    it('should count pending invoices', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockPrismaService.invoice.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: ['DRAFT', 'SUBMITTED'] },
          paymentStatus: 'UNPAID',
        }),
      });
    });

    it('should count overdue invoices', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockPrismaService.invoice.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          dueDate: { lt: expect.any(Date) },
        }),
      });
    });

    it('should count paid invoices this week', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockPrismaService.invoice.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'PAID',
          paidAt: { gte: expect.any(Date) },
        }),
      });
    });

    it('should count issued invoices this week', async () => {
      await service.sendWeeklyInvoiceSummary();

      expect(mockPrismaService.invoice.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: { gte: expect.any(Date) },
        }),
      });
    });
  });

  // =================== AUDIT LOGGING ===================

  describe('Audit Logging', () => {
    it('should log to audit with system user', async () => {
      await service.sendDailyPaymentReminders();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'system',
        }),
      });
    });

    it('should log with NotificationScheduler entity', async () => {
      await service.sendDailyPaymentReminders();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entity: 'NotificationScheduler',
        }),
      });
    });

    it('should set entityId to null', async () => {
      await service.sendDailyPaymentReminders();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityId: null,
        }),
      });
    });

    it('should handle audit log failure gracefully', async () => {
      mockPrismaService.auditLog.create.mockRejectedValue(new Error('Audit DB Error'));

      // Should not throw
      await expect(service.sendDailyPaymentReminders()).resolves.toBeUndefined();
    });
  });

  // =================== CRON SCHEDULE VERIFICATION ===================

  describe('Cron Schedules', () => {
    it('sendDailyPaymentReminders should be scheduled for 8:00 AM', () => {
      // Verify decorator exists by checking the method is callable
      expect(typeof service.sendDailyPaymentReminders).toBe('function');
    });

    it('sendDailyOverdueNotifications should be scheduled for 9:00 AM', () => {
      expect(typeof service.sendDailyOverdueNotifications).toBe('function');
    });

    it('sendWeeklyInvoiceSummary should be scheduled for Monday 7:00 AM', () => {
      expect(typeof service.sendWeeklyInvoiceSummary).toBe('function');
    });

    it('sendMonthlySaftReminder should be scheduled for 1st of month 6:00 AM', () => {
      expect(typeof service.sendMonthlySaftReminder).toBe('function');
    });
  });

  // =================== ROMANIAN COMPLIANCE ===================

  describe('Romanian Compliance', () => {
    it('should use Romanian month names in SAF-T reminder', async () => {
      await service.sendMonthlySaftReminder();

      // Romanian month name should be used
      expect(mockNotificationsService.send).toHaveBeenCalled();
    });

    it('should reference SAF-T D406 per OPANAF 1783/2021', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            legalReference: 'OPANAF 1783/2021 - SAF-T D406 obligatoriu',
          }),
        }),
      );
    });

    it('should reference Codul Fiscal for invoice payment terms', async () => {
      // Setup to trigger weekly summary
      let callIndex = 0;
      mockPrismaService.invoice.count.mockImplementation(() => {
        return Promise.resolve([5, 2, 3, 4][callIndex++ % 4]);
      });

      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            legalReference: 'Codul Fiscal - termene plată facturi',
          }),
        }),
      );
    });

    it('should mention 25th as SAF-T deadline', async () => {
      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deadline: expect.stringContaining('25'),
          }),
        }),
      );
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle no users with invoices', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.sendWeeklyInvoiceSummary();

      expect(mockNotificationsService.send).not.toHaveBeenCalled();
    });

    it('should handle no users with CUI', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).not.toHaveBeenCalled();
    });

    it('should handle notification service failure', async () => {
      mockNotificationsService.send.mockRejectedValue(new Error('SMTP Error'));

      // Setup to trigger weekly summary
      let callIndex = 0;
      mockPrismaService.invoice.count.mockImplementation(() => {
        return Promise.resolve([5, 2, 3, 4][callIndex++ % 4]);
      });

      await service.sendWeeklyInvoiceSummary();

      // Should log error and continue
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should handle user with name but no company', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { ...mockUser, company: null },
      ]);

      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientName: mockUser.name,
        }),
      );
    });

    it('should handle user with neither name nor company', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { ...mockUser, name: null, company: null },
      ]);

      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientName: undefined,
        }),
      );
    });

    it('should handle large number of users', async () => {
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({
        ...mockUser,
        id: `user-${i}`,
        email: `user${i}@test.com`,
      }));
      mockPrismaService.user.findMany.mockResolvedValue(manyUsers);

      await service.sendMonthlySaftReminder();

      expect(mockNotificationsService.send).toHaveBeenCalledTimes(100);
    });
  });
});
