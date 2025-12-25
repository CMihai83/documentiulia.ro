import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { WorkflowEngineService } from './workflow-engine.service';
import { RuleEngineService } from './rule-engine.service';
import { TriggerManagerService } from './trigger-manager.service';
import { ActionExecutorService } from './action-executor.service';
import { AutomationTemplatesService } from './automation-templates.service';
import { AutomationMonitoringService } from './automation-monitoring.service';

// Controllers
import { WorkflowEngineController } from './workflow-engine.controller';
import { RuleEngineController } from './rule-engine.controller';
import { TriggerManagerController } from './trigger-manager.controller';
import { ActionExecutorController } from './action-executor.controller';
import { AutomationTemplatesController } from './automation-templates.controller';
import { AutomationMonitoringController } from './automation-monitoring.controller';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    WorkflowEngineController,
    RuleEngineController,
    TriggerManagerController,
    ActionExecutorController,
    AutomationTemplatesController,
    AutomationMonitoringController,
  ],
  providers: [
    WorkflowEngineService,
    RuleEngineService,
    TriggerManagerService,
    ActionExecutorService,
    AutomationTemplatesService,
    AutomationMonitoringService,
  ],
  exports: [
    WorkflowEngineService,
    RuleEngineService,
    TriggerManagerService,
    ActionExecutorService,
    AutomationTemplatesService,
    AutomationMonitoringService,
  ],
})
export class AutomationModule {}
