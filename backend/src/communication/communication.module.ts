import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { CommunicationHubService } from './communication-hub.service';
import { EmailService } from './email.service';
import { SMSWhatsAppService } from './sms-whatsapp.service';
import { InAppNotificationService } from './in-app-notification.service';
import { PushNotificationService } from './push-notification.service';
import { CommunicationAnalyticsService } from './communication-analytics.service';

// Controllers
import { CommunicationHubController } from './communication-hub.controller';
import { EmailController } from './email.controller';
import { SMSWhatsAppController } from './sms-whatsapp.controller';
import { InAppNotificationController } from './in-app-notification.controller';
import { PushNotificationController } from './push-notification.controller';
import { CommunicationAnalyticsController } from './communication-analytics.controller';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    CommunicationHubController,
    EmailController,
    SMSWhatsAppController,
    InAppNotificationController,
    PushNotificationController,
    CommunicationAnalyticsController,
  ],
  providers: [
    CommunicationHubService,
    EmailService,
    SMSWhatsAppService,
    InAppNotificationService,
    PushNotificationService,
    CommunicationAnalyticsService,
  ],
  exports: [
    CommunicationHubService,
    EmailService,
    SMSWhatsAppService,
    InAppNotificationService,
    PushNotificationService,
    CommunicationAnalyticsService,
  ],
})
export class CommunicationModule {}
