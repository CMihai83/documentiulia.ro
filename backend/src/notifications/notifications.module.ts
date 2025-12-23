import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationSchedulerController } from './notification-scheduler.controller';
import { FleetAlertsService } from './fleet-alerts.service';
import { CustomerDeliveryNotificationsService } from './customer-delivery-notifications.service';
import { WhatsAppSmsService } from './whatsapp-sms.service';
import { EmailNotificationService } from './email-notification.service';
import { EmailNotificationController } from './email-notification.controller';
import { PushNotificationService } from './push-notification.service';
import { PushNotificationController } from './push-notification.controller';
import { NotificationCenterService } from './notification-center.service';
import { NotificationCenterController } from './notification-center.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, EventEmitterModule.forRoot(), ScheduleModule.forRoot()],
  controllers: [NotificationsController, EmailNotificationController, PushNotificationController, NotificationSchedulerController, NotificationCenterController],
  providers: [
    NotificationsService,
    NotificationSchedulerService,
    FleetAlertsService,
    CustomerDeliveryNotificationsService,
    WhatsAppSmsService,
    EmailNotificationService,
    PushNotificationService,
    NotificationCenterService,
  ],
  exports: [
    NotificationsService,
    NotificationSchedulerService,
    FleetAlertsService,
    CustomerDeliveryNotificationsService,
    WhatsAppSmsService,
    EmailNotificationService,
    PushNotificationService,
    NotificationCenterService,
  ],
})
export class NotificationsModule {}
