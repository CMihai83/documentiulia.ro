import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { ActivityTimelineService } from './activity-timeline.service';
import { ActivityTimelineController } from './activity-timeline.controller';
import { CrmFinanceIntegrationService } from './crm-finance-integration.service';
import { CrmFinanceIntegrationController } from './crm-finance-integration.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot(), AuthModule],
  controllers: [
    ContactsController,
    DealsController,
    ActivityTimelineController,
    CrmFinanceIntegrationController,
  ],
  providers: [
    ContactsService,
    DealsService,
    ActivityTimelineService,
    CrmFinanceIntegrationService,
  ],
  exports: [
    ContactsService,
    DealsService,
    ActivityTimelineService,
    CrmFinanceIntegrationService,
  ],
})
export class CrmModule {}
