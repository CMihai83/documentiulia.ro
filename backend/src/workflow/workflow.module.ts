import { Module } from '@nestjs/common';
import { WorkflowAutomationService } from './workflow-automation.service';
import { WorkflowAutomationController } from './workflow-automation.controller';

@Module({
  controllers: [WorkflowAutomationController],
  providers: [WorkflowAutomationService],
  exports: [WorkflowAutomationService],
})
export class WorkflowModule {}
