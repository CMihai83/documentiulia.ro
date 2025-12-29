import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { KanbanService } from './kanban.service';
import { KanbanController } from './kanban.controller';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingController } from './time-tracking.controller';
import { EpicsService } from './epics.service';
import { EpicsController } from './epics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [
    TasksController,
    KanbanController,
    TimeTrackingController,
    EpicsController,
  ],
  providers: [
    TasksService,
    KanbanService,
    TimeTrackingService,
    EpicsService,
  ],
  exports: [
    TasksService,
    KanbanService,
    TimeTrackingService,
    EpicsService,
  ],
})
export class ProjectManagementModule {}
