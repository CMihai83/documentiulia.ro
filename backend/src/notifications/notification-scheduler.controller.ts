import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { NotificationSchedulerService } from './notification-scheduler.service';

@ApiTags('Notification Scheduler')
@Controller('notifications/scheduler')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationSchedulerController {
  constructor(private readonly schedulerService: NotificationSchedulerService) {}

  // =================== MANUAL TRIGGERS ===================

  @Post('trigger/payment-reminders')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Trigger payment reminders',
    description: 'Manually trigger payment reminder notifications / Declanșează manual notificările de reminder plată',
  })
  @ApiResponse({ status: 200, description: 'Payment reminders sent successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN or ACCOUNTANT role' })
  async triggerPaymentReminders(@Request() req: any) {
    const result = await this.schedulerService.triggerPaymentReminders();
    return {
      success: true,
      message: `Payment reminders sent / Remindere plată trimise`,
      data: result,
      triggeredBy: req.user.sub,
      triggeredAt: new Date().toISOString(),
    };
  }

  @Post('trigger/overdue-notifications')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Trigger overdue notifications',
    description: 'Manually trigger overdue invoice notifications / Declanșează manual notificările pentru facturi restante',
  })
  @ApiResponse({ status: 200, description: 'Overdue notifications sent successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN or ACCOUNTANT role' })
  async triggerOverdueNotifications(@Request() req: any) {
    const result = await this.schedulerService.triggerOverdueNotifications();
    return {
      success: true,
      message: `Overdue notifications sent / Notificări restante trimise`,
      data: result,
      triggeredBy: req.user.sub,
      triggeredAt: new Date().toISOString(),
    };
  }

  // =================== SCHEDULER INFO ===================

  @Get('jobs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get scheduled jobs info',
    description: 'Get information about all scheduled notification jobs / Informații despre job-urile programate',
  })
  @ApiResponse({ status: 200, description: 'Scheduled jobs information' })
  getScheduledJobs() {
    return {
      success: true,
      data: {
        jobs: [
          {
            name: 'paymentReminders',
            description: 'Send payment reminders for invoices due in 3 days',
            descriptionRo: 'Trimite remindere pentru facturile scadente în 3 zile',
            schedule: '0 8 * * *',
            scheduleDescription: 'Daily at 8:00 AM',
            manualTrigger: '/api/v1/notifications/scheduler/trigger/payment-reminders',
          },
          {
            name: 'overdueNotifications',
            description: 'Send overdue notifications for past-due invoices',
            descriptionRo: 'Trimite notificări pentru facturile restante',
            schedule: '0 9 * * *',
            scheduleDescription: 'Daily at 9:00 AM',
            manualTrigger: '/api/v1/notifications/scheduler/trigger/overdue-notifications',
          },
          {
            name: 'weeklySummary',
            description: 'Send weekly invoice summary to users',
            descriptionRo: 'Trimite sumar săptămânal al facturilor',
            schedule: '0 7 * * 1',
            scheduleDescription: 'Every Monday at 7:00 AM',
            manualTrigger: null,
          },
          {
            name: 'saftReminder',
            description: 'Send monthly SAF-T D406 submission reminders',
            descriptionRo: 'Trimite remindere lunare pentru SAF-T D406',
            schedule: '0 6 1 * *',
            scheduleDescription: 'First day of each month at 6:00 AM',
            manualTrigger: null,
          },
        ],
      },
    };
  }

  @Get('config/job-types')
  @ApiOperation({
    summary: 'Get available job types',
    description: 'Get list of scheduled job types / Lista tipurilor de job-uri programate',
  })
  @ApiResponse({ status: 200, description: 'Job types list' })
  getJobTypes() {
    return {
      success: true,
      data: [
        { value: 'payment-reminders', label: 'Payment Reminders', labelRo: 'Remindere Plată' },
        { value: 'overdue-notifications', label: 'Overdue Notifications', labelRo: 'Notificări Restante' },
        { value: 'weekly-summary', label: 'Weekly Summary', labelRo: 'Sumar Săptămânal' },
        { value: 'saft-reminder', label: 'SAF-T D406 Reminder', labelRo: 'Reminder SAF-T D406' },
      ],
    };
  }
}
