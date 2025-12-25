import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { KanbanService } from './kanban.service';
import { KanbanController } from './kanban.controller';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingController } from './time-tracking.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [
    TasksController,
    KanbanController,
    TimeTrackingController,
  ],
  providers: [
    TasksService,
    KanbanService,
    TimeTrackingService,
  ],
  exports: [
    TasksService,
    KanbanService,
    TimeTrackingService,
  ],
})
export class ProjectManagementModule {}
