import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { ActivityTimelineService } from './activity-timeline.service';
import { ActivityTimelineController } from './activity-timeline.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [
    ContactsController,
    DealsController,
    ActivityTimelineController,
  ],
  providers: [
    ContactsService,
    DealsService,
    ActivityTimelineService,
  ],
  exports: [
    ContactsService,
    DealsService,
    ActivityTimelineService,
  ],
})
export class CrmModule {}
